'use strict';

require('./log.js');

const config = require('./config.js');

let bodyParser = require('body-parser');
let express = require('express');
global.app = express();

app.use(bodyParser.urlencoded({
	extended: true
}));

// Set cross-origin HTTP request (CORS) for swagger testing.
if (config['DEBUG']) {
	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "http://editor.swagger.io");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});
}

require('./google/validate.js');
require('./ios/validate6.js');
require('./ios/validate7.js');

let server = app.listen(config['PORT'], function() {
	log('Purchase Validator is running on port: %s', server.address().port);
});
