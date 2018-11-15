'use strict';

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Good waits, buffer mode, done(), release');

  const rStream = require('../../index');
  const logger = gT.logUtils.winstonMock('[GT] ');

  function done(err, stream) {
    a.value(err, null, 'first parameter for done()');
    gT.logUtils.rStreamToLog(stream);
  }

  const outStream = rStream.createSafeReadableStream({
    logger,
    done,
    objectMode: false
  });

  await outStream.push('A\n');
  await outStream.push('B');
  await outStream.push('C');
  await outStream.pushArray([
    'D',
    'E',
    '',
    '',
    'F',
  ]);
  await outStream.push('');
  await outStream.finish();
};
