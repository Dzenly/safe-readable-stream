'use strict';

const JSONStream = require('JSONStream');

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Good waits, object mode, done, debug ()');

  process.env.SAFE_STREAM_DEBUG = 'yes';

  const rStream = require('../../index');
  const logger = gT.logUtils.winstonMock('[GT] ');

  function done(err, stream) {
    a.value(err, null, 'first parameter for done()');
    gT.logUtils.rStreamToLog(stream.pipe(JSONStream.parse('*')));
  }

  const outStream = rStream.createSafeReadableStream({ logger, done });

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
