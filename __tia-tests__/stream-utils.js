'use strict';

exports.streamToLog = function streamToLog(stream) {
  stream.on('data', (chunk) => {
    l.println(JSON.stringify(chunk, null, 2));
  });
  stream.on('error', err => gIn.logger.errorln(err.toString()));
  stream.on('end', () => l.println('End Event.'));
};
