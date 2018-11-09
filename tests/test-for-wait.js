'use strict';

process.env.RSTREAM_DEBUG = 'yes';

const rStream = require('../index');

const outStream = rStream.createOutputStream();

async function test1() {
  await outStream.push('str');
  await outStream.push('str');
  await outStream.push('str');
  await outStream.finish();
}

test1();

outStream.getStream().pipe(process.stdout);
