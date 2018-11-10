'use strict';

const stream = require('stream');
const JSONStream = require('JSONStream');

/* eslint-disable no-underscore-dangle */

const maxErrorMessageLength = 600; // Just for processing speed up.
const errorFieldName = 'streamUtilsError';
const quotedErrorFieldName = `"${errorFieldName}"`;

const logPrefix = 'r-stream:';

/**
 * Wraps the stream.Readable to allow safe pushing data into it.
 * @param {Function ?} done - callback from HAPI.
 * @param {Object} logger - winston-like logger.
 * @return {Object} - Wrapper for stream.Readable.
 */
exports.createSafeReadableStream = function createSafeReadableStream({
  logger,
  objectMode = true,
  done,
} = {}) {
  let _ended = false;
  let _closed = false;

  let _dataArr = null; // Array of data to be pushed to the stream.
  let _dataIndex = 0; // Index of current array item to be pushed to the stream.

  // Promise resolver. Also indicator that there is pending data and other pushes are forbidden.
  let _resolve = null;

  let _reject; // Promise 'rejecter'.

  function prodAllowPush() {
    _reject = null;
    _dataArr = null;
    _dataIndex = 0;
    const _tmpResolve = _resolve; // A bit of paranoid checking.
    _resolve = null;
    _tmpResolve();
  }

  function debugAllowPush() {
    _dataArr = null;
    setTimeout(prodAllowPush, 100);
  }

  const allowPush = process.env.RSTREAM_DEBUG ? debugAllowPush : prodAllowPush;

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

      // Will lead to call read() again if not null.
      if (!this.push(data)) {
        if (logger) {
          logger.info(`${logPrefix} push returned false, data is null: ${data === null}`);
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
      logger.verbose(`${logPrefix} on end`);
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
    if (objectMode) {
      done(null, _rStream.pipe(JSONStream.stringify()));
    } else {
      done(null, _rStream);
    }
  }

  const rStream = {
    /**
     * Returns node.js stream.Readable().
     * So you can subscribe on some events or pipe it somewhere.
     * But please don't use rStream.getStream.push() directly,
     * because node.js docs forbide it, and you will need to track its result.
     * @return {stream.Readable}
     */
    getStream() {
      return _rStream;
    },

    /**
     * Sends the 'data' to the underlying stream. null will lead to finish() call.
     * @param {*} data - The data. Can be JSON.stringify - compatible.
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
     * @param {Array<*>} dataArr
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
     * @return {*|Promise<undefined>}
     */
    finish() {
      return this.pushArray([null]);
    },

    /**
     * Sends the user error to the stream. Call stack is printed to logger, but is not send to the stream.
     * @param err
     * * @return {*|Promise<undefined>}
     */
    async error(err = '') {
      await this.pushArray([{ [errorFieldName]: err.toString() }, null]);
      if (logger) logger.error(`${logPrefix} Error: ${err}. Stream is stopped.`);
      if (err.stack) {
        if (logger) logger.error(logPrefix, err.stack);
      }
    },
  };

  // Such an error can be at wrong rStream usage.
  // E.g. getStream().push() without checking return value.
  // Or push data after the 'end' event.
  // And maybe some inner strea.Readable errors.
  _rStream.on('error', async (err) => {
    if (logger) logger.error(`${logPrefix} on error: ${err}`);
    if (_reject) {
      _reject(err);
    }
    _rStream.push({ [errorFieldName]: err.toString() });
    _rStream.push(null);
  });

  return rStream;
};

/**
 * Looks up for user sent error in streamData.
 * @param {Buffer} streamData - Argument of handler of stream 'data' event.
 * @return {String | null} - Error message or null.
 */
exports.checkErrorString = function checkErrorString(streamData) {
  if (streamData.byteLength > maxErrorMessageLength) {
    // Skip check for a priori big objects.
    // Because errors passed to another end should not be big.
    return null;
  }

  const str = streamData.toString();
  let begin = str.indexOf(quotedErrorFieldName);
  if (begin === -1) {
    return null;
  }

  let end = begin + quotedErrorFieldName.length;
  begin = str.indexOf('"', end + 1);
  end = str.lastIndexOf('"');
  return str.slice(begin + 1, end);
};
