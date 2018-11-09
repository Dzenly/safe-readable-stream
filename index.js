'use strict';

const stream = require('stream');
const JSONStream = require('JSONStreamnpm ');

/* eslint-disable no-underscore-dangle */

const maxErrorMessageLength = 600; // Just for fast
const errorFieldName = 'streamUtilsError';
const quotedErrorFieldName = `"${errorFieldName}"`;

/**
 * Wraps the stream.Readable to allow safe pushing data into it.
 * @param {Function ?} done - callback from HAPI.
 * @param {Object} logger - winston-like logger.
 * @return {Object} - Wrapper for stream.Readable.
 */
exports.createOutputStream = function createOutputStream({ done, logger }) {
  let _dataArr; // Array of data to be pushed to the stream.
  let _dataIndex; // Index of current array item to be pushed to the stream.

  let _resolve; // Promise resolver. Also indicator that there is pending data and other pushes are forbidden.
  let _reject; // Promise 'rejecter'.

  function allowPush() {
    _reject = null;
    _dataArr = null;
    _dataIndex = 0;
    const _tmpResolve = _resolve; // A bit of paranoid checking.
    _resolve = null;
    _tmpResolve();
  }

  allowPush();

  function read() { // We deliberately don't use the 'size' argument.
    if (!_resolve) {
      return; // No pending data, so nothing to read.
    }
    if (_dataIndex === _dataArr.length) { // No more data.
      allowPush();
      return;
    }

    // Will lead to call read() again.
    this.push(_dataArr[_dataIndex++]); // eslint-disable-line no-plusplus
  }

  const _outStream = new stream.Readable({
    objectMode: true,
    read,
  });

  if (done) {
    done(null, _outStream.pipe(JSONStream.stringify()));
  }
  const outStream = {
    /**
     * Returns node.js stream.Readable(). So you can subscribe on some events.
     * But please don't use outStream.getStream.push() directly,
     * because node.js docs forbide it, and you will need to track its result.
     * @return {stream.Readable}
     */
    getStream() {
      return _outStream;
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
      if (data === null) {
        this.finish();
        return Promise.resolve();
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
      if (!dataArr.length) {
        return Promise.reject(new Error('You can not push empty array.'));
      }

      return new Promise(((resolve, reject) => {
        _dataArr = dataArr;
        _dataIndex = 0;
        _resolve = resolve;
        _reject = reject;
        read();
      }));
    },

    finish() {
      // TODO: should we add emit('end') ?
      _outStream.push(null);
    },

    /**
     * Sends the user error to the stream. Call stack is printed to logger, but is not send to the stream.
     * @param err
     */
    error(err = '') {
      _outStream.push({[errorFieldName]: err.toString()});
      this.finish();
      if (_reject) {
        _reject(err);
      }
      logger.error(`Error: ${err}. Stream is stopped.`);

      if (err.stack) {
        logger.error(err.stack);
      }
    },
  };

  // Such an error can be at wrong outStream usage.
  // E.g. getStream().push() without checking return value.
  // And maybe some inner strea.Readable errors.
  _outStream.on('error', (err) => {
    logger.error(`on error: ${err}`);
    outStream.error(err); // Событие 'error' обычно не отражается на работоспособности Readable.
  });

  return outStream;
};



/**
 * Looks up for user sent error in streamData.
 * @param {Buffer} streamData - Argument of handler of stream 'data' event.
 * @return {String | null} - Error message or null.
 */
exports.checkErrorString = function checkErrorString(streamData) {
  if (streamData.byteLength > maxErrorMessageLength) {
    // Objects can be very big, so.

    // Если объект слишком большой, то это заведомо не сообщение об ошибке.
    // Ибо нет смысла слать мегабайтовые ошибки из коллектора,
    // ведь их можно прямо в коллекторе в лог распечатать.
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
}
