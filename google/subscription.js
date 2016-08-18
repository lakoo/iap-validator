'use strict';

const config = require('../config.js');

let Verifier = require('google-play-purchase-validator');

app.get('/google/subscription/:token', function(req, res) {
	let verifier = new Verifier({
		email: config['GOOGLE_API_EMAIL'],
		key: config['GOOGLE_API_KEY']
	});
	let receipt = {
		packageName: config['GOOGLE_PACKAGE_NAME'],
		productId: config['GOOGLE_SUBSCRIPTION_ID'],
		purchaseToken: req.params.token
	};

	verifier.verify(receipt, function(err, response) {
		if (err) {
			res.writeHead(200, {'Content-Type': 'application/json'});
			log(err);
			res.end(JSON.stringify({
				code: 101,
				error: err.toString(),
			}));
			return;
		}

		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({
			developerPayload: response.developerPayload,
			expiryTimeMillis: response.expiryTimeMillis,
		}));
	});
});
