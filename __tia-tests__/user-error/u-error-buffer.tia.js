'use strict';

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('User error.');

  const rStream = require('../../index');
  const logger = gT.logUtils.winstonMock('[GT] ');

  function done(err, stream) {
    a.value(err, null, 'first parameter for done()');
    gT.logUtils.rStreamToLog(stream);
  }

  const outStream = rStream.createSafeReadableStream({ logger, done, objectMode: false });

  outStream.getStream().on('data', (data) => {
    const errStr = rStream.checkErrorString(data);
    if (errStr) {
      l.println(`Checked error string: ${errStr}`);
    }
  });

  await outStream.push('A');
  await outStream.push('B');
  await outStream.error(new Error('My error'));
};
