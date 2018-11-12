'use strict';

const JSONStream = require('JSONStream');

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Bad, no waits, object mode + error, done()');

  process.env.SAFE_STREAM_DEBUG = 'yes';

  const rStream = require('../../index');
  const logger = gT.logUtils.winstonMock('[GT] ');

  function done(err, stream) {
    a.value(err, null, 'first parameter for done()');
    gT.logUtils.rStreamToLog(stream.pipe(JSONStream.parse('*')));
  }

  const outStream = rStream.createSafeReadableStream({ logger, done });

  outStream.push({ a: 'a', b: 18 }); // Whoops, forgot await.
  await outStream.push('A');
  await outStream.push(null);
};
