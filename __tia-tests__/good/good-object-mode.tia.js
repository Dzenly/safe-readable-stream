'use strict';

const streamUtils = require('../stream-utils');
const logger = require('../logger')('[GT] ', gIn.logger.logFile);

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Good waits, object mode, no done()');

  const rStream = require('../../index');

  const outStream = rStream.createOutputStream({ logger });

  streamUtils.streamToLog(outStream.getStream());

  await outStream.push('A\n');
  await outStream.push('B');
  await outStream.push({ a: 'a', b: 18 });
  await outStream.push('C');
  await outStream.pushArray([
    'D',
    'E',
    { a: 'a', b: 18 },
    { c: 'a', d: 18 },
    { e: 'a', f: 18 },
    'F',
  ]);
  await outStream.push('');
  await outStream.push(null);
};
