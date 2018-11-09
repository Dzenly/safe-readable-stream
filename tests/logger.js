'use strict';

const winston = require('winston');
const dzLogPrefix = require('dz-log-prefix');

const logger = winston.createLogger({
  level: 'verbose',
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

module.exports = function (prefix) {
  return dzLogPrefix.addPrefixToCommonLogFuncs(logger, prefix);
};

