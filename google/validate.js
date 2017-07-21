/* eslint no-unused-vars: ["error", { "args": "none" }] */

const config = require('../config.js');
const log = require('../log.js');

const os = require('os');
const google = require('googleapis');
const Slack = require('node-slack');

function validate(reqPurchaseData, callback) {
  let purchaseData = '';
  try {
    purchaseData = JSON.parse(reqPurchaseData);
    if (!Object.prototype.hasOwnProperty.call(purchaseData, 'packageName')
     || !Object.prototype.hasOwnProperty.call(purchaseData, 'productId')
     || !Object.prototype.hasOwnProperty.call(purchaseData, 'purchaseToken')) {
      throw new Error('Invalid purchase data');
    }
    if (!Object.prototype.hasOwnProperty.call(purchaseData, 'orderId')) purchaseData.orderId = '';
  } catch (err) {
    log(`Google invalid purchase data: ${reqPurchaseData}`);
    callback(JSON.stringify({
      code: 102,
      error: `Invalid purchase data: ${reqPurchaseData}`,
    }));
    return;
  }

  // Config validator.
  if (typeof config.GOOGLE[purchaseData.packageName] === 'undefined') {
    // Invalid configuration.
    log('Google configuration error.');
    callback(JSON.stringify({
      code: 102,
      error: 'Configuration error.',
    }));
    return;
  }
  const configData = config.GOOGLE[purchaseData.packageName];

  const timeoutTimer = setTimeout(() => {
    log(`Google request timeout ${reqPurchaseData}`);

    if (configData.SLACK_URL) {
      const slack = new Slack(configData.SLACK_URL);
      slack.send({
        username: os.hostname(),
        text: 'iap-validator ERROR',
        attachments: [{ title: 'REQUEST TIMEOUT', color: 'danger', text: `platform: Google, payload: ${reqPurchaseData}` }],
      });
    }

    callback(JSON.stringify({
      code: 110,
      error: `Request timeout: ${reqPurchaseData}`,
    }));
  }, config.TIMEOUT);

  const jwtClient = new google.auth.JWT(configData.EMAIL, null, configData.KEY, ['https://www.googleapis.com/auth/androidpublisher'], null);
  jwtClient.authorize((err, tokens) => {
    if (err) {
      log(`Google verification failed: ${err.toString()}`);
      callback(JSON.stringify({
        code: 101,
        receipt: reqPurchaseData,
        error: `Verification failed: ${err.toString()}`,
      }));
      return;
    }

    let requestGoogleAPI = null;
    let type = '';
    if (Object.prototype.hasOwnProperty.call(purchaseData, 'autoRenewing')) {
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
    };

    requestGoogleAPI(params, (err2, bodyObj) => {
      clearTimeout(timeoutTimer);
      if (err2) {
        log(`Google verification failed: ${err2.toString()}`);
        callback(JSON.stringify({
          code: 101,
          receipt: reqPurchaseData,
          error: `Verification failed: ${err2.toString()}`,
        }));
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(bodyObj, 'kind')
      || !Object.prototype.hasOwnProperty.call(bodyObj, 'developerPayload')) {
        throw new Error('Fail to parsing Google receipt.');
      }

      if (((type === 'iap') && (bodyObj.kind === 'androidpublisher#subscriptionPurchase'))
      || ((type === 'subscription') && (bodyObj.kind === 'androidpublisher#productPurchase'))) {
        throw new Error('Fail to parsing Google receipt.');
      }

      // IAP
      if (type === 'iap') {
        if (!Object.prototype.hasOwnProperty.call(bodyObj, 'purchaseTimeMillis')) {
          throw new Error('Fail to parsing Google receipt.');
        }

        let purchaseState = -1;
        if (Object.prototype.hasOwnProperty.call(bodyObj, 'purchaseState')) {
          purchaseState = parseInt(bodyObj.purchaseState, 10);
        }
        let consumptionState = -1;
        if (Object.prototype.hasOwnProperty.call(bodyObj, 'consumptionState')) {
          consumptionState = parseInt(bodyObj.consumptionState, 10);
        }

        callback(JSON.stringify({
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
          original_purchase_date: parseInt(bodyObj.purchaseTimeMillis, 10),
          expires_date: 0,
          product_original_purchase_date_ms: 0,
          download_id: '',
          latest_receipt: '',
        }));
      } else if (type === 'subscription') {  // Subscription
        if (!Object.prototype.hasOwnProperty.call(bodyObj, 'startTimeMillis')
         || !Object.prototype.hasOwnProperty.call(bodyObj, 'expiryTimeMillis')
         || !Object.prototype.hasOwnProperty.call(bodyObj, 'autoRenewing')
         || !Object.prototype.hasOwnProperty.call(bodyObj, 'priceCurrencyCode')
         || !Object.prototype.hasOwnProperty.call(bodyObj, 'priceAmountMicros')
         || !Object.prototype.hasOwnProperty.call(bodyObj, 'countryCode')) {
          throw new Error('Fail to parsing Google receipt.');
        }

        let paymentState = -1;
        if (Object.prototype.hasOwnProperty.call(bodyObj, 'paymentState')) {
          paymentState = parseInt(bodyObj.paymentState, 10);
        }
        let cancelReason = -1;
        if (Object.prototype.hasOwnProperty.call(bodyObj, 'cancelReason')) {
          cancelReason = parseInt(bodyObj.cancelReason, 10);
        }

        callback(JSON.stringify({
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
          price_amount_micros: parseInt(bodyObj.priceAmountMicros, 10),
          country_code: bodyObj.countryCode,
          payment_state: paymentState,
          cancel_reason: cancelReason,
          is_trial_period: false,
          original_purchase_date: parseInt(bodyObj.startTimeMillis, 10),
          expires_date: parseInt(bodyObj.expiryTimeMillis, 10),
          product_original_purchase_date_ms: 0,
          download_id: '',
          latest_receipt: '',
        }));
      }
    });
  });
}

module.exports = validate;
