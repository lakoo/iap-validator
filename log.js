/**
 * Print the log with date-time.
 *
 * @param string string                 The string to log.
 * @param params any                    The arguments to apply on the string to log.
 */
const log = function log(...args) {
  const formattedArgs = args;
  formattedArgs[0] = `${new Date()}: ${args[0]}`;
  console.log.apply(null, formattedArgs);
};

const err = function err(...args) {
  const formattedArgs = args;
  formattedArgs[0] = `${new Date()}: ${args[0]}`;
  console.error.apply(null, formattedArgs);
};

module.exports = { log, errLog: err };
