const config = require('../config.js');
const log = require('../log.js');

const iap = require('in-app-purchase');
const express = require('express');

const router = express.Router();

router.get('/:bundle/:receipt', (req, res) => {
  // Config IAP.
  if (config.IOS[req.params.bundle] === 'undefined') {
    // Invalid configuration.
    log('iOS configuration error.');
    res.end(JSON.stringify({
      code: 102,
      error: 'Configuration error.',
    }));
    return;
  }
  iap.config(config.IOS[req.params.bundle]);

  // Set up response.
  res.writeHead(200, { 'Content-Type': 'application/json' });

  // Set up IAP.
  iap.setup((error) => {
    if (error) {
      // Fail to set up IAP.
      log(`iOS initialization error: ${error}`);
      res.end(JSON.stringify({
        code: 102,
        error: `Initialization error: ${error.toString()}`,
      }));
      return;
    }

    // Validate the IAP.
    iap.validate(iap.APPLE, req.params.receipt, (appleErr, reply) => {
      if (appleErr) {
        // Error from Apple.
        try {
          if (appleErr.message === 'failed to validate for empty purchased list') {
            res.end(JSON.stringify({
              code: 201,
              status: reply.status,
              message: 'the receipt is valid, but purchased nothing',
              product_original_purchase_date_ms: 0,
              download_id: '',
            }));
          } else {
            log(`iOS verification failed: ${appleErr.toString()}`);
            res.end(JSON.stringify({
              code: 101,
              status: reply.status,
              receipt: JSON.stringify(reply),
              error: `Verification failed: ${appleErr.toString()}`,
            }));
          }
        } catch (exception) {
          log(`iOS parsing receipt failed: ${JSON.stringify(reply)}`);
          res.end(JSON.stringify({
            code: 103,
            error: `Verification and parsing receipt failed: ${appleErr.toString()} ${JSON.stringify(reply)}`,
          }));
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

            res.end(JSON.stringify({
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
            }));
          } else {  // IAP.
            if (!Object.prototype.hasOwnProperty.call(reply.receipt, 'bid')
             || !Object.prototype.hasOwnProperty.call(reply.receipt, 'product_id')
             || !Object.prototype.hasOwnProperty.call(reply.receipt, 'transaction_id')
             || !Object.prototype.hasOwnProperty.call(reply.receipt, 'original_transaction_id')
             || !Object.prototype.hasOwnProperty.call(reply.receipt, 'original_purchase_date_ms')) {
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
            }));
          }
        } catch (err) {
          log(`iOS parsing receipt failed: ${JSON.stringify(reply)}`);
          res.end(JSON.stringify({
            code: 103,
            receipt: JSON.stringify(reply),
            error: 'Parsing receipt failed.',
          }));
        }
      } else {
        // Validation failed.
        log(`Validation failed: ${JSON.stringify(reply)}`);
        res.end(JSON.stringify({
          code: 104,
          status: reply.status,
          receipt: JSON.stringify(reply),
          error: 'Validation failed.',
        }));
      }
    });
  });
});

module.exports = router;
