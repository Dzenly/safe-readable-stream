'use strict';

const stream = require('stream');

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Good, buffer mode, no done, wrapped, stringify');

  const rStream = require('../../index');
  const logger = gT.logUtils.winstonMock('[GT] ');

  const outStream = rStream.createSafeReadableStream({
    logger,
    objectMode: false,
    stringify: true,
  });

  const wrappedStream = stream.Readable().wrap(outStream.getStream());

  gT.logUtils.rStreamToLog(wrappedStream);

  await outStream.push({ a: 'a', b: 18 });
  await outStream.finish();
};
