'use strict';

/**
 * Print the log with date-time.
 *
 * @param string string					The string to log.
 * @param params any					The arguments to apply on the string to log.
 */
global.log = function(string, params) {
	let args = Array.prototype.slice.call(arguments, 0);
	args[0] = new Date() + ': ' + args[0];
	console.log.apply(null, args);
}
