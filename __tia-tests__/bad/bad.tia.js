'use strict';

const streamUtils = require('../stream-utils');

module.exports = async function test() {
  t.setTitle('Bad waits');

  process.env.RSTREAM_DEBUG = 'yes';

  const rStream = require('../../index');

  const outStream = rStream.createOutputStream();

  const funcsArr = [
    async () => {
      outStream.push('A');
      await outStream.push('B');
    },
    async () => {
      outStream.pushArray(['A']);
      await outStream.push('B');
    },
    async () => {
      outStream.push('A');
      await outStream.push(null);
    },
    async () => {
      outStream.push('A');
      await outStream.finish();
    },
  ];

  l.println('Expected errors:');
  funcsArr.forEach(async (func) => {
    await func()
      .catch(e => l.println(e.toString()));
  });
  l.println('==============');

  const str = await streamUtils.streamToLog(outStream.getStream());
  l.println('Resulting stream data:');
  l.println(str);
  l.println('==============');
};

