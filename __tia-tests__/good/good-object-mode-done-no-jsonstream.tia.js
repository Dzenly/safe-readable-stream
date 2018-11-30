'use strict';

const JSONStream = require('JSONStream');

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Good waits, object mode, done, no JSONStream');

  const rStream = require('../../index');
  const logger = gT.logUtils.winstonMock('[GT] ');

  function done(err, stream) {
    a.value(err, null, 'first parameter for done()');
    gT.logUtils.rStreamToLog(stream);
  }

  const outStream = rStream.createSafeReadableStream({ logger, done, useJSONStream: false });

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
