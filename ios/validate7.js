'use strict';

const config = require('../config.js');

let iap = require('in-app-purchase');

app.get('/validate/ios/7/:bundle/:receipt/:product_id', function(req, res) {
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
					// Purchase.
					if (!reply.hasOwnProperty('receipt')
					||  !reply.receipt.hasOwnProperty('bundle_id')
					||  !reply.receipt.hasOwnProperty('in_app'))
					{
						throw new Error('Fail to parsing Apple receipt.');
					}

					let finalReceipt = null;
					let expiryTime = 0;
					reply.receipt.in_app.forEach(function(receipt) {
						if (!receipt.hasOwnProperty('product_id')
						||  !receipt.hasOwnProperty('transaction_id')
						||  !receipt.hasOwnProperty('original_transaction_id')
						||  !receipt.hasOwnProperty('original_purchase_date_ms'))
						{
							throw new Error('Fail to parsing Apple receipt.');
						}

						if (receipt.product_id != req.params.product_id) {
							return true;
						}

						// Subsription
						if (receipt.hasOwnProperty('expires_date_ms')) {
							let time = parseInt(receipt.expires_date_ms);
							if (time > expiryTime) {
								finalReceipt = receipt;
								expiryTime = time;
							}
							return true;
						}
						// IAP
						else {
							finalReceipt = receipt;
							expiryTime = 0;
							return false;
						}
					});

					res.end(JSON.stringify({
						code: 0,
						platform: 'iOS',
						type: ((expiryTime > 0) ? 'subscription' : 'iap'),
						app_id: reply.receipt.bundle_id,
						product_id: finalReceipt.product_id,
						status: reply.status,
						transaction_id: finalReceipt.transaction_id,
						original_transaction_id: finalReceipt.original_transaction_id,
						purchase_state: 0,
						consumption_state: 0,
						auto_renewing: false,
						price_currency_code: '',
						price_amount_micros: 0,
						country_code: '',
						payment_state: 0,
						cancel_reason: 0,
						original_purchase_date: parseInt(finalReceipt.original_purchase_date_ms),
						expires_date: expiryTime,
					}));
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
