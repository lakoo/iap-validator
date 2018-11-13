const iap = require('in-app-purchase');

const config = require('../config.js');

function validate(bundle, receipt, callback, inOpts) {
  const opts = inOpts || {};

  // Config IAP.
  if (config.IOS[bundle] === 'undefined') {
    // Invalid configuration.
    callback({
      code: 102,
      error: 'Configuration error.',
    });
    return;
  }
  iap.config(config.IOS[bundle]);

  // Set up IAP.
  iap.setup((error) => {
    if (error) {
      // Fail to set up IAP.
      callback({
        code: 102,
        error: `Initialization error: ${error.toString()}`,
      });
      return;
    }

    // Validate the IAP.
    iap.validate(iap.APPLE, receipt, (appleErr, reply) => {
      if (appleErr) {
        // Error from Apple.
        try {
          if (appleErr.message === 'failed to validate for empty purchased list') {
            callback({
              code: 201,
              status: reply.status,
              message: 'the receipt is valid, but purchased nothing',
              product_original_purchase_date_ms: 0,
              download_id: '',
            });
          } else {
            callback({
              code: 101,
              status: reply.status,
              receipt: reply,
              error: `Verification failed: ${appleErr.toString()}`,
            });
          }
        } catch (exception) {
          callback({
            code: 103,
            error: `IOS Verification and parsing receipt failed: ${appleErr.toString()} ${JSON.stringify(reply)}`,
          });
        }
        return;
      }

      if (iap.isValidated(reply)) {
        try {
          // Subscription.
          if (Object.prototype.hasOwnProperty.call(reply, 'latest_receipt_info')) {
            if (!Object.prototype.hasOwnProperty.call(reply.latest_receipt_info, 'bid')
             || !Object.prototype.hasOwnProperty.call(reply.latest_receipt_info, 'product_id')
             || !Object.prototype.hasOwnProperty.call(reply.latest_receipt_info, 'transaction_id')
             || !Object.prototype.hasOwnProperty.call(reply.latest_receipt_info, 'original_transaction_id')
             || !Object.prototype.hasOwnProperty.call(reply.latest_receipt_info, 'original_purchase_date_ms')
             || !Object.prototype.hasOwnProperty.call(reply.latest_receipt_info, 'expires_date')) {
              throw new Error('Fail to parsing Apple receipt.');
            }

            let lastestReceipt = '';
            if (opts.get_latest_receipt) lastestReceipt = reply.latest_receipt || '';

            callback({
              code: 0,
              platform: 'iOS',
              type: 'subscription',
              app_id: reply.latest_receipt_info.bid,
              product_id: reply.latest_receipt_info.product_id,
              status: reply.status,
              transaction_id: reply.latest_receipt_info.transaction_id,
              original_transaction_id: reply.latest_receipt_info.original_transaction_id,
              developer_payload: '',
              purchase_state: 0,
              consumption_state: 0,
              auto_renewing: false,
              price_currency_code: '',
              price_amount_micros: 0,
              country_code: '',
              payment_state: 0,
              cancel_reason: 0,
              is_trial_period: false,
              original_purchase_date:
                  parseInt(reply.latest_receipt_info.original_purchase_date_ms, 10),
              expires_date: parseInt(reply.latest_receipt_info.expires_date, 10),
              product_original_purchase_date_ms: 0,
              download_id: '',
              latest_receipt: lastestReceipt,
            });
          } else { // IAP.
            if (!Object.prototype.hasOwnProperty.call(reply.receipt, 'bid')
             || !Object.prototype.hasOwnProperty.call(reply.receipt, 'product_id')
             || !Object.prototype.hasOwnProperty.call(reply.receipt, 'transaction_id')
             || !Object.prototype.hasOwnProperty.call(reply.receipt, 'original_transaction_id')
             || !Object.prototype.hasOwnProperty.call(reply.receipt, 'original_purchase_date_ms')) {
              throw new Error('Fail to parsing Apple receipt.');
            }

            callback({
              code: 0,
              platform: 'iOS',
              type: 'iap',
              app_id: reply.receipt.bid,
              product_id: reply.receipt.product_id,
              status: reply.status,
              transaction_id: reply.receipt.transaction_id,
              original_transaction_id: reply.receipt.original_transaction_id,
              developer_payload: '',
              purchase_state: 0,
              consumption_state: 0,
              auto_renewing: false,
              price_currency_code: '',
              price_amount_micros: 0,
              country_code: '',
              payment_state: 0,
              cancel_reason: 0,
              is_trial_period: false,
              original_purchase_date: parseInt(reply.receipt.original_purchase_date_ms, 10),
              expires_date: 0,
              product_original_purchase_date_ms: 0,
              download_id: '',
              latest_receipt: '',
            });
          }
        } catch (err) {
          callback({
            code: 103,
            receipt: reply,
            error: `Parsing receipt failed. ${err.toString()} `,
          });
        }
      } else {
        // Validation failed.
        callback({
          code: 104,
          status: reply.status,
          receipt: reply,
          error: 'Validation failed.',
        });
      }
    });
  });
}

module.exports = validate;
