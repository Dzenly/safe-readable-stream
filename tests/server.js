'use strict';

const rStream = require('../index');
const logger = require('../__tia-tests__/logger')('Server: ');

const outStream = rStream.createSafeReadableStream({ logger });

async function test1() {

}

outStream.push({ myData: 'myData' });


const requestHandler = async (request, response) => {
  outStream.pipe(response);

  setInterval(() => {
    console.log('someData');
    outS.push({ someData: 'someData' });
  }, 500);
  setTimeout(() => {
    // r.push({defCollectorError: 'My error'}); // { error: 'error' }

    // r.push(null);
    const res = r.emit('error', new Error('My Error'));
    console.log(`Error emitting: ${res}`);

    throw new Error('My error');
  }, 2000);
};

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log(err);
  }

  console.log(`server is listening on ${port}`);
});
