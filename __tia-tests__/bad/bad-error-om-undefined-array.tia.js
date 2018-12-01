'use strict';

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Bad, object mode, send undefined, array');

  const rStream = require('../../index');
  const logger = gT.logUtils.winstonMock('[GT] ');

  const outStream = rStream.createSafeReadableStream({
    logger,
    useJSONStream: false,
    objectMode: true,
  });
  gT.logUtils.rStreamToLog(outStream.getStream());

  await outStream.pushArray(['A', undefined]);
  await outStream.finish();
};
