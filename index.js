'use strict';

const stream = require('stream');
const JSONStream = require('JSONStream');

/* eslint-disable no-underscore-dangle */

const maxErrorMessageLength = 600; // Just for processing speed up.
const logPrefix = 'safe-readable-stream:';

exports.errorFieldName = 'safeReadableStreamError';

/**
 * Wraps the stream.Readable to allow safe data pushing into it.
 * @param {Object} logger - winston-like logger.
 * @param {Function ?} done - callback from HAPI.
 * @param {Boolean} [objectMode = true]. objectMode for stream.
 * @param {Boolean} [useJSONStream = false] - use JSONStream module.
 * This option is work when 'done' is present and 'objectMode' is true.
 * Note: I think that JSONStream is buggy module, so be careful.
 * @param {Number} [traceInterval = 100] - how often
 * to do logger.verbose for pushed objects count.
 * Say, if 10, then each 10-th push will be logged.
 * @param {Boolean} [stringify = true] - if 'objectMode' is false and
 * pushed data is object (and not null) - use JSON.stringify() to push it.
 * @return {Object} - Wrapper for stream.Readable.
 */
exports.createSafeReadableStream = function createSafeReadableStream({
  logger,
  objectMode = true,
  done,
  useJSONStream = false,
  traceInterval = 100,
  stringify = true,
} = {}) {
  let _ended = false;
  let _closed = false;

  let _dataArr = null; // Array of data to be pushed to the stream.
  let _dataIndex = 0; // Index of current array item to be pushed to the stream.

  let _totalPushCnt = 0; // Count of the pushes to underlying stream.

  // Promise resolver. Also indicator that there is pending data and other pushes are forbidden.
  let _resolve = null;

  let _reject; // Promise 'rejecter'.

  function prodAllowPush() {
    _reject = null;
    _dataArr = null;
    _dataIndex = 0;
    const _tmpResolve = _resolve; // A bit of paranoid checking.
    _resolve = null;
    if (_tmpResolve) _tmpResolve(); // Someone could use getStream().push().
  }

  function debugAllowPush() {
    _dataArr = null;
    setTimeout(prodAllowPush, 50);
  }

  const allowPush = process.env.SAFE_STREAM_DEBUG ? debugAllowPush : prodAllowPush;

  function read() { // We deliberately don't use the 'size' argument.
    if (!_dataArr) {
      return; // No pending data, so nothing to read.
    }

    while (true) {
      if (_dataIndex === _dataArr.length) { // No more data.
        return allowPush();
      }

      const data = _dataArr[_dataIndex++]; // eslint-disable-line no-plusplus
      if (logger && data === '') {
        logger.verbose(`${logPrefix} data is empty string.`);
      }

      _totalPushCnt++;

      if (logger && ((_totalPushCnt % traceInterval) === 0)) {
        logger.verbose(`_totalPushCnt: ${_totalPushCnt}`);
      }

      // Will lead to call read() again if not null.
      if (!this.push(data)) {
        if (logger && data !== null) {
          const msg = `${logPrefix} push returned false, data is not null, _totalPushCnt: ${_totalPushCnt}`;
          logger.verbose(msg);
        }
        return;
      }
    }
  }

  const _rStream = new stream.Readable({
    objectMode,
    read,
  });

  _rStream.on('end', () => {
    if (logger) {
      logger.verbose(`${logPrefix} on end, _totalPushCnt: ${_totalPushCnt} (including last null)`);
    }
    _ended = true;
    allowPush(); // If there was 'end' event, the read callback will not be called.
  });

  _rStream.on('close', () => {
    if (logger) {
      logger.verbose(`${logPrefix} on close`);
    }
    _closed = true;
    allowPush(); // If there was 'close' event, the read callback will not be called.
  });

  if (done) {
    if (objectMode && useJSONStream) {
      done(null, _rStream.pipe(JSONStream.stringify()));
    } else {
      done(null, _rStream);
    }
  }

  const safeStream = {
    /**
     * Returns node.js stream.Readable().
     * So you can subscribe on some events or pipe it somewhere.
     * But please don't use safeStream.getStream.push() directly,
     * because node.js docs forbide it, and you will need to track its result.
     * @return {stream.Readable}
     */
    getStream() {
      return _rStream;
    },

    /**
     * Sends the 'data' to the underlying stream. null will lead to finish() call.
     * @param {*} data - The data. For objectMode must be JSON.stringify - compatible.
     * @return {Promise<undefined>>}
     */
    push(data) {
      if (typeof data === 'undefined') {
        return Promise.reject(new Error('Don`t push undefined.'));
      }
      return this.pushArray([data]);
    },

    /**
     * Sends the array of data to the underlying stream.
     * Note: if some array item is null - the finish() will be called at that time,
     * and all remaining data will not be send to the underlying stream.
     * @param {Array<*>} dataArr - Array of data.
     * For objectMode, array items must be JSON.stringify - compatible.
     * @return {Promise<undefined>}
     */
    pushArray(dataArr) {
      if (_resolve) {
        return Promise.reject(new Error('You must wait for promise returned from push* functions.'));
      }
      if (_ended) {
        return Promise.reject(new Error('Stream ended.'));
      }
      if (_closed) {
        return Promise.reject(new Error('Stream closed.'));
      }
      if (!dataArr.length) {
        return Promise.reject(new Error('You can not push empty array.'));
      }
      if (dataArr.includes(undefined)) {
        return Promise.reject(new Error('Don`t push undefined.'));
      }

      if (!objectMode && stringify) {
        // eslint-disable-next-line no-param-reassign
        dataArr = dataArr.map((item) => {
          if (typeof item === 'object' && item !== null) {
            return `${JSON.stringify(item)}\n`; // Newline delimited objects.
          }
          return item;
        });
      }

      return new Promise(((resolve, reject) => {
        _dataArr = dataArr;
        _dataIndex = 0;
        _resolve = resolve;
        _reject = reject;
        _rStream._read();
      }));
    },

    /**
     * Schedules to send null to the underlying stream.
     * @return {Promise<undefined>}
     */
    finish() {
      return this.pushArray([null]);
    },

    /**
     * Sends the user error to the stream.
     * Call stack is printed to logger, but is not sent to the stream.
     * @param {String} err
     * * @return {Promise<undefined>}
     */
    async error(err) {
      if (err.length > maxErrorMessageLength) {
        throw new Error('Too big error length.');
      }

      const errorObject = {
        [exports.errorFieldName]: err.toString(),
      };
      const error = objectMode ? errorObject : (JSON.stringify(errorObject) + '\n');

      await this.pushArray([error, null]);
      if (logger) logger.error(`${logPrefix} Error: ${err}. Stream is stopped.`);
      if (err.stack) {
        if (logger) logger.error(logPrefix, 'Err stack: ', err.stack);
      }
    },
  };

  // Such an error can be at wrong safeStream usage.
  // E.g. getStream().push() without checking return value.
  // Or push data after the 'end' event.
  // And maybe some inner strea.Readable errors.
  _rStream.on('error', async (err) => {
    if (logger) logger.error(`${logPrefix} on error: ${err}`);
    if (_reject) {
      _reject(err);
    }
    _rStream.push({ [exports.errorFieldName]: err.toString() });
    _rStream.push(null);
  });

  return safeStream;
};

/**
 * Looks up for user sent error (by `error(msg)`) in streamData.
 * @param {Buffer} streamData - Argument of handler of stream 'data' event.
 * @param {String} errFieldName - If you wish to override default errorFieldName in user errors.
 *
 * @return {String | null} - Error message or null.
 */
exports.checkErrorString = function checkErrorString(streamData, errFieldName = exports.errorFieldName) {
  if (streamData.byteLength > maxErrorMessageLength) {
    // Skip check for a priori big objects.
    // Because errors passed to another end should not be big.
    return null;
  }

  if (!streamData) {
    return null;
  }

  let str;

  if (Buffer.isBuffer(streamData)) {
    str = streamData.toString('utf8');
  } else if (typeof streamData === 'string') {
    str = streamData;
  } else if (typeof streamData === 'object') {
    return streamData[errFieldName];
  } else {
    return null;
  }

  const quotedErrorFieldName = `"${errFieldName}"`;

  let begin = str.indexOf(quotedErrorFieldName);
  if (begin === -1) {
    return null;
  }

  let end = begin + quotedErrorFieldName.length;
  begin = str.indexOf('"', end + 1);
  end = str.lastIndexOf('"');
  return str.slice(begin + 1, end);
};


/**
 * Transforms newline separated json stream into object stream.
 * @param {Object} [logger] - Winston - like logger.
 * @returns {stream.Transform} - object stream.
 */
exports.bufToObjStream = function bufToObjStream(logger) {
  let remainder = '';
  let receivedChunkCount = 0;
  let sentObjCount = 0;
  return new stream.Transform({
    readableObjectMode: true,
    writableObjectMode: false,

    transform(chunk, encoding, callback) {
      chunk = chunk.toString('utf8'); // eslint-disable-line no-param-reassign
      if (logger) {
        logger.verbose(`Received chunk #${receivedChunkCount} str len: ${chunk.length}`);
      }
      ++receivedChunkCount;

      const str = remainder + chunk;
      const arr = str.split('\n');
      try {
        for (let i = 0; i < arr.length - 1; i++) {
          const res = this.push(JSON.parse(arr[i]));
          if (!res && logger) {
            logger.info('push returned false !!!');
          }

          if (logger) {
            logger.verbose(`Sent object #${sentObjCount}`);
          }
          ++sentObjCount;
        }
      } catch (err) {
        if (logger) {
          logger.error(err);
        }
        return callback(err);
      }
      remainder = arr.pop();
      return callback();
    },
  });
};
