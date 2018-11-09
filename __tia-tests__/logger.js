'use strict';

const winston = require('winston');
const dzLogPrefix = require('dz-log-prefix');

module.exports = function (prefix, filename) {
  const logger = winston.createLogger({
    level: 'verbose',
    transports: [
      new winston.transports.File({
        filename,
        level: 'silly',
        format: winston.format.simple(),
      }),
    ],
  });

  return dzLogPrefix.addPrefixToCommonLogFuncs(logger, prefix);
};

