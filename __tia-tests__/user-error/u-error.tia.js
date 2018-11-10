'use strict';

const JSONStream = require('JSONStream');
const streamUtils = require('../stream-utils');
const logger = require('../logger')('[GT] ', gIn.logger.logFile);

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Good waits, object mode, no done()');

  const rStream = require('../../index');

  function done(err, stream) {
    a.value(err, null, 'first parameter for done()');
    streamUtils.streamToLog(stream.pipe(JSONStream.parse('*')));
  }

  const outStream = rStream.createSafeReadableStream({ logger, done });

  await outStream.push('A');
  await outStream.push({ a: 'a', b: 18 });
  await outStream.error(new Error('My error'));
};
