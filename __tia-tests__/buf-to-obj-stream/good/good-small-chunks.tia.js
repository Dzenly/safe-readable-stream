'use strict';

const stream = require('stream');

const srcData = [
  '{',
  '"v',
  'al"',
  ':',
  't',
  'rue',
  '}',
  '\n',
  '{"a',
  '":"aaaa"',
  '}',
  '\n{',
  '"b":{"c"',
  ':"d"}}\n',
  null,
];

module.exports = async function test({ t, l }, inner, a) {
  t.setTitle('Good, buf-to-obj-stream, small chunks.');

  let srcDataIndex = 0;

  const rStream = new stream.Readable({
    read(size) {
      this.push(srcData[srcDataIndex++]);
    },
  });

  const srsModule = require('../../..');
  const logger = gT.logUtils.winstonMock('[GT] ');

  const tStream = srsModule.bufToObjStream(logger);

  rStream.pipe(tStream);

  tStream.on('data', (data) => {
    l.println(gIn.textUtils.valToStr(data));
  });

  tStream.on('end', () => {
    l.println('END');
  });

  await gT.u.promise.delayed(100);

};
