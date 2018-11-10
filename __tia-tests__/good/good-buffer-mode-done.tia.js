'use strict';

const streamUtils = require('../stream-utils');
const logger = require('../logger')('[GT] ', gIn.logger.logFile);

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Good waits, object mode, done()');

  function done(err, stream) {
    a.value(err, null, 'first parameter for done()');
    streamUtils.streamToLog(stream);
  }

  const rStream = require('../../index');

  const outStream = rStream.createOutputStream({ logger, done, objectMode: false });

  await outStream.push('A\n');
  await outStream.push('B');
  await outStream.push('C');
  await outStream.pushArray([
    'D',
    'E',
  ]);
  await outStream.push('');
  await outStream.push(null);
};
