'use strict';

const stream = require('stream');

const obj = {};

let valPrefix = '';
for (let i = 0; i < 100; i++) {
  valPrefix += 'aaaaaaaaaaaaaaaaaaaa';
}

for (let i = 0; i < 123000; i++) {
  obj['keyaaaaaaa' + String(i).padStart(10)] = valPrefix + String(i).padStart(10);
}

let srcStr = JSON.stringify(obj) + '\n';

const srcData = [
  srcStr,
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
