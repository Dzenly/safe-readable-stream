'use strict';

const streamUtils = require('../stream-utils');
const logger = require('../logger')('[GT] ', gIn.logger.logFile);

module.exports = async function test() {
  t.setTitle('Good waits');

  process.env.RSTREAM_DEBUG = 'yes';

  const rStream = require('../../index');

  const outStream = rStream.createOutputStream({ logger });

  streamUtils.streamToLog(outStream.getStream());

  await outStream.push('A\n');
  await outStream.push('B');
  await outStream.push({ a: 'a', b: 18 });
  await outStream.push('C');
  await outStream.push(null);
};
