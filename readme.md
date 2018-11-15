Wrapper on Node.js `stream.Readable()`.

## Promise based work with `stream.Readable()` for safe pushing data into the stream.
E.g. you can use:

```js

const rStream = require('safe-readable-stream');

const outStream = rStream.createSafeReadableStream({
  logger,
  objectMode: false,
});

// Good, await will wait until stream will be ready to read next chunks.
await outStream.pushArray(['A', 'B', 'C']);

// Pushing next chunk.
// But without wait. Not good.
// Next push can return rejected promise
// if underlying push will require next event loop tick.
outStream.push('B');

// Promise can be rejected.
// Because it is not safe to push data outside _read call.
await outStream.finish();
```

## Catching an error sent by outStream.error(msg):

It is useful when you are reading some data from some source by chunks
and at some soment you got error from the source.
So you should pass the error to the receiving part.

So for receiving part you can use such code:
```js

const rStream = require('safe-readable-stream');

response.on('data', (data) => {
  const errStr = rStream.checkErrorString(data);
  if (errStr) {
    // Error was sent.
    l.println(`Checked error string: ${errStr}`);
  }
});

```

* [API Reference](https://github.com/Dzenly/safe-readable-stream/tree/master/index.js).

* [Examples](https://github.com/Dzenly/safe-readable-stream/tree/master/__tia-tests__).
