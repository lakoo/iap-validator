'use strict';

const config = require('../config.js');

let os = require("os");
let util = require('util');
let google = require('googleapis');
let Slack = require('node-slack');

app.get('/validate/google/:purchase_data', function(req, res) {
	// Set up response.
	res.writeHead(200, {'Content-Type': 'application/json'});

	let purchaseData = '';
	try {
		purchaseData = JSON.parse(req.params.purchase_data);
		if (!purchaseData.hasOwnProperty('packageName')
		||  !purchaseData.hasOwnProperty('productId')
		||  !purchaseData.hasOwnProperty('purchaseToken')) {
			throw new Error('Invalid purchase data');
		}
		if (!purchaseData.hasOwnProperty('orderId')) purchaseData.orderId = "";
	} catch (err) {
		log('Google invalid purchase data: ' + req.params.purchase_data);
		res.end(JSON.stringify({
			code: 102,
			error: 'Invalid purchase data: ' + req.params.purchase_data,
		}));
		return;
	}

	// Config validator.
	if (typeof config['GOOGLE'][purchaseData.packageName] === 'undefined') {
		// Invalid configuration.
		log('Google configuration error.');
		res.end(JSON.stringify({
			code: 102,
			error: 'Configuration error.',
		}));
		return;
	}
	let configData = config['GOOGLE'][purchaseData.packageName];

	let timeoutTimer = setTimeout(function(){
		log('Google request timeout ' + req.params.purchase_data);

		if (configData['SLACK_URL']) {
			var slack = new Slack(configData['SLACK_URL']);
			slack.send({
				username: os.hostname(),
				text: "iap-validator ERROR",
				attachments: [{"title": "REQUEST TIMEOUT", "color": "danger", "text": "platform: Google, payload: " + req.params.purchase_data}]
			});
		}

		res.end(JSON.stringify({
			code: 110,
			error: 'Request timeout: ' + req.params.purchase_data,
		}));
		return;
	}, config['TIMEOUT']);

	const jwtClient = new google.auth.JWT(configData['EMAIL'], null, configData['KEY'], ['https://www.googleapis.com/auth/androidpublisher'], null);
	jwtClient.authorize(function(err, tokens) {
		if (err) {
			log('Google verification failed: ' + err.toString());
			res.end(JSON.stringify({
				code: 101,
				receipt: req.params.purchase_data,
				error: 'Verification failed: ' + err.toString(),
			}));
			return;
		}

		let requestGoogleAPI = null;
		let type = ''
		if (purchaseData.hasOwnProperty('autoRenewing')) {
			requestGoogleAPI = google.androidpublisher('v2').purchases.subscriptions.get;
			type = 'subscription';
		} else {
			requestGoogleAPI = google.androidpublisher('v2').purchases.products.get;
			type = 'iap';
		}

		const params = {
							auth: jwtClient,
							packageName: purchaseData.packageName,
							productId: purchaseData.productId,
							subscriptionId: purchaseData.productId,
							token: purchaseData.purchaseToken,
					   }

		requestGoogleAPI( params, function (err, bodyObj) {
			clearTimeout(timeoutTimer);
			if (err) {
				log('Google verification failed: ' + err.toString());
				res.end(JSON.stringify({
					code: 101,
					receipt: req.params.purchase_data,
					error: 'Verification failed: ' + err.toString(),
				}));
				return;
			}
			if (!bodyObj.hasOwnProperty('kind')
			||  !bodyObj.hasOwnProperty('developerPayload'))
			{
				throw new Error('Fail to parsing Google receipt.');
			}

			if (((type == 'iap') && (bodyObj.kind == 'androidpublisher#subscriptionPurchase'))
			||  ((type == 'subscription') && (bodyObj.kind == 'androidpublisher#productPurchase')))
			{
				throw new Error('Fail to parsing Google receipt.');
			}

			// IAP
			if (type == 'iap') {
				if (!bodyObj.hasOwnProperty('purchaseTimeMillis'))
				{
					throw new Error('Fail to parsing Google receipt.');
				}

				let purchaseState = -1;
				if (bodyObj.hasOwnProperty('purchaseState')) {
					purchaseState = parseInt(bodyObj.purchaseState);
				}
				let consumptionState = -1;
				if (bodyObj.hasOwnProperty('consumptionState')) {
					consumptionState = parseInt(bodyObj.consumptionState);
				}

				res.end(JSON.stringify({
					code: 0,
					platform: 'Google',
					type: 'iap',
					app_id: purchaseData.packageName,
					product_id: purchaseData.productId,
					status: 0,
					transaction_id: purchaseData.orderId,
					original_transaction_id: purchaseData.orderId,
					developer_payload: bodyObj.developerPayload,
					purchase_state: purchaseState,
					consumption_state: consumptionState,
					auto_renewing: false,
					price_currency_code: '',
					price_amount_micros: 0,
					country_code: '',
					payment_state: -1,
					cancel_reason: -1,
					is_trial_period: false,
					original_purchase_date: parseInt(bodyObj.purchaseTimeMillis),
					expires_date: 0,
					product_original_purchase_date_ms: 0,
					download_id: '',
				}));
			}
			// Subscription
			else if (type == 'subscription') {
				if (!bodyObj.hasOwnProperty('startTimeMillis')
				||  !bodyObj.hasOwnProperty('expiryTimeMillis')
				||  !bodyObj.hasOwnProperty('autoRenewing')
				||  !bodyObj.hasOwnProperty('priceCurrencyCode')
				||  !bodyObj.hasOwnProperty('priceAmountMicros')
				||  !bodyObj.hasOwnProperty('countryCode'))
				{
					throw new Error('Fail to parsing Google receipt.');
				}

				let paymentState = -1;
				if (bodyObj.hasOwnProperty('paymentState')) {
					paymentState = parseInt(bodyObj.paymentState);
				}
				let cancelReason = -1;
				if (bodyObj.hasOwnProperty('cancelReason')) {
					cancelReason = parseInt(bodyObj.cancelReason);
				}

				res.end(JSON.stringify({
					code: 0,
					platform: 'Google',
					type: 'subscription',
					app_id: purchaseData.packageName,
					product_id: purchaseData.productId,
					status: 0,
					transaction_id: purchaseData.orderId,
					original_transaction_id: purchaseData.orderId,
					developer_payload: bodyObj.developerPayload,
					purchase_state: -1,
					consumption_state: -1,
					auto_renewing: !!JSON.parse(bodyObj.autoRenewing),
					price_currency_code: bodyObj.priceCurrencyCode,
					price_amount_micros: parseInt(bodyObj.priceAmountMicros),
					country_code: bodyObj.countryCode,
					payment_state: paymentState,
					cancel_reason: cancelReason,
					is_trial_period: false,
					original_purchase_date: parseInt(bodyObj.startTimeMillis),
					expires_date: parseInt(bodyObj.expiryTimeMillis),
					product_original_purchase_date_ms: 0,
					download_id: '',
				}));
			}

		});
	});
});
