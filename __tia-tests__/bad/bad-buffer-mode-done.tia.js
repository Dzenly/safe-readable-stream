'use strict';

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Bad, no waits, buffer mode, done()');

  process.env.SAFE_STREAM_DEBUG = 'yes';

  const rStream = require('../../index');
  const logger = gT.logUtils.winstonMock('[GT] ');

  function done(err, stream) {
    a.value(err, null, 'first parameter for done()');
    gT.logUtils.rStreamToLog(stream);
  }

  const outStream = rStream.createSafeReadableStream({
    logger,
    objectMode: false,
    done,
  });

  outStream.push('My string'); // Whoops, forgot await.
  await outStream.push('A');
  await outStream.push(null);
};
