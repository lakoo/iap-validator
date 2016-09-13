'use strict';

const config = require('../config.js');

let iap = require('in-app-purchase');

app.get('/validate/ios/6/:bundle/:receipt', function(req, res) {
	// Config IAP.
	if (config['IOS'][req.params.bundle] === 'undefined') {
		// Invalid configuration.
		log('iOS configuration error.');
		res.end(JSON.stringify({
			code: 102,
			error: 'Configuration error.',
		}));
		return;
	}
	iap.config(config['IOS'][req.params.bundle]);

	// Set up response.
	res.writeHead(200, {'Content-Type': 'application/json'});

	// Set up IAP.
	iap.setup(function (error) {
		if (error) {
			// Fail to set up IAP.
			log('iOS initialization error: ' + error);
			res.end(JSON.stringify({
				code: 102,
				error: 'Initialization error: ' + error.toString(),
			}));
			return;
		}

		// Validate the IAP.
		iap.validate(iap.APPLE, req.params.receipt, function (appleErr, reply) {
			if (appleErr) {
				// Error from Apple.
				try {
					log('iOS verification failed: ' + appleErr.toString());
					res.end(JSON.stringify({
						code: 101,
						status: reply.status,
						receipt: JSON.stringify(reply),
						error: 'Verification failed: ' + appleErr.toString(),
					}));
				} catch (exception) {
					log('iOS parsing receipt failed: ' + JSON.stringify(reply));
					res.end(JSON.stringify({
						code: 103,
						error: 'Verification and parsing receipt failed: ' + appleErr.toString() + ' ' + JSON.stringify(reply),
					}));
				}
				return;
			}

			if (iap.isValidated(reply)) {
				try {
					// Subscription.
					if (reply.hasOwnProperty('latest_receipt_info')) {
						if (!reply.latest_receipt_info.hasOwnProperty('bid')
						||  !reply.latest_receipt_info.hasOwnProperty('product_id')
						||  !reply.latest_receipt_info.hasOwnProperty('transaction_id')
						||  !reply.latest_receipt_info.hasOwnProperty('original_transaction_id')
						||  !reply.latest_receipt_info.hasOwnProperty('original_purchase_date_ms')
						||  !reply.latest_receipt_info.hasOwnProperty('expires_date'))
						{
							throw new Error('Fail to parsing Apple receipt.');
						}

						res.end(JSON.stringify({
							code: 0,
							platform: 'iOS',
							type: 'subscription',
							app_id: reply.latest_receipt_info.bid,
							product_id: reply.latest_receipt_info.product_id,
							status: reply.status,
							transaction_id: reply.latest_receipt_info.transaction_id,
							original_transaction_id: reply.latest_receipt_info.original_transaction_id,
							purchase_state: 0,
							consumption_state: 0,
							auto_renewing: false,
							price_currency_code: '',
							price_amount_micros: 0,
							country_code: '',
							payment_state: 0,
							cancel_reason: 0,
							original_purchase_date: parseInt(reply.latest_receipt_info.original_purchase_date_ms),
							expires_date: parseInt(reply.latest_receipt_info.expires_date),
						}));
					}
					// IAP.
					else {
						if (!reply.receipt.hasOwnProperty('bid')
						||  !reply.receipt.hasOwnProperty('product_id')
						||  !reply.receipt.hasOwnProperty('transaction_id')
						||  !reply.receipt.hasOwnProperty('original_transaction_id')
						||  !reply.receipt.hasOwnProperty('original_purchase_date_ms'))
						{
							throw new Error('Fail to parsing Apple receipt.');
						}

						res.end(JSON.stringify({
							code: 0,
							platform: 'iOS',
							type: 'iap',
							app_id: reply.receipt.bid,
							product_id: reply.receipt.product_id,
							status: reply.status,
							transaction_id: reply.receipt.transaction_id,
							original_transaction_id: reply.receipt.original_transaction_id,
							purchase_state: 0,
							consumption_state: 0,
							auto_renewing: false,
							price_currency_code: '',
							price_amount_micros: 0,
							country_code: '',
							payment_state: 0,
							cancel_reason: 0,
							original_purchase_date: parseInt(reply.receipt.original_purchase_date_ms),
							expires_date: 0,
						}));
					}
				} catch (err) {
					log('iOS parsing receipt failed: ' + JSON.stringify(reply));
					res.end(JSON.stringify({
						code: 103,
						receipt: JSON.stringify(reply),
						error: 'Parsing receipt failed.',
					}));
				}
				return;
			} else {
				// Validation failed.
				log('Validation failed: ' + JSON.stringify(reply));
				res.end(JSON.stringify({
					code: 104,
					status: reply.status,
					receipt: JSON.stringify(reply),
					error: 'Validation failed.',
				}));
				return;
			}
		});
	});
});
