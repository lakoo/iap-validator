'use strict';

const config = require('../config.js');

let google = require('google-oauth-jwt');
let util = require('util');

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

	// Compute the API.
	let type = '';
	let api = 'https://www.googleapis.com/androidpublisher/v2/applications/%%s/purchases/%s/%%s/tokens/%s';
	if (purchaseData.hasOwnProperty('autoRenewing')) {
		type = 'subscription';
		api = util.format(api, 'subscriptions');
	} else {
		type = 'iap';
		api = util.format(api, 'products');
	}
	api = util.format(
			api,
			encodeURIComponent(purchaseData.packageName),
			encodeURIComponent(purchaseData.productId),
			encodeURIComponent(purchaseData.purchaseToken));

	// Verify the receipt.
	google.requestWithJWT()({
		url: api,
		jwt: {
			email: configData['EMAIL'],
			key: configData['KEY'],
			keyFile: undefined,
			scopes: ['https://www.googleapis.com/auth/androidpublisher']
		}},
		function(err, reply, body) {
			if (err) {
				log('Google verification failed: ' + err.toString());
				res.end(JSON.stringify({
					code: 101,
					receipt: body,
					error: 'Verification failed: ' + err.toString(),
				}));
			}

			try {
				let bodyObj = JSON.parse(body);
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
						plaatform: 'Google',
						type: 'iap',
						app_id: purchaseData.packageName,
						product_id: purchaseData.productId,
						status: 0,
						transaction_id: '',
						original_transaction_id: '',
						developer_payload: bodyObj.developerPayload,
						purchase_state: purchaseState,
						consumption_state: consumptionState,
						auto_renewing: false,
						price_currency_code: '',
						price_amount_micros: 0,
						country_code: '',
						payment_state: -1,
						cancel_reason: -1,
						original_purchase_date: parseInt(bodyObj.purchaseTimeMillis),
						expires_date: 0,
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
						plaatform: 'Google',
						type: 'subscription',
						app_id: purchaseData.packageName,
						product_id: purchaseData.productId,
						status: 0,
						transaction_id: '',
						original_transaction_id: '',
						developer_payload: bodyObj.developerPayload,
						purchase_state: -1,
						consumption_state: -1,
						auto_renewing: !!JSON.parse(bodyObj.autoRenewing),
						price_currency_code: bodyObj.priceCurrencyCode,
						price_amount_micros: parseInt(bodyObj.priceAmountMicros),
						country_code: bodyObj.countryCode,
						payment_state: paymentState,
						cancel_reason: cancelReason,
						original_purchase_date: parseInt(bodyObj.startTimeMillis),
						expires_date: parseInt(bodyObj.expiryTimeMillis),
					}));
				}
			} catch (parseErr) {
				log('Google parsing receipt failed: ' + body);
				res.end(JSON.stringify({
					code: 103,
					receipt: body,
					error: 'Parsing receipt failed.',
				}));
			}
		}
	);
});
