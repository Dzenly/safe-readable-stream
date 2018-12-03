'use strict';

const stream = require('stream');

const obj = {};

for (let i = 0; i < 100; i++) {
  obj['key' + String(i).padStart(3)] = 'val' + String(i).padStart(3);
}

let srcStr = '';
for (let i = 0; i < 10; i++) {
  srcStr += JSON.stringify(obj) + '\n';
}

const srcData = [
  srcStr,
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

  let receivedChunkIndex = 0;

  tStream.on('data', (data) => {
    l.println(`Received chunk index: ${receivedChunkIndex}`);
  });

  tStream.on('end', () => {
    l.println('END');
  });

  await gT.u.promise.delayed(100);

};
