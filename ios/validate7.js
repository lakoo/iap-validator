const config = require('../config.js');

const iap = require('in-app-purchase');

function findLatestReceipt(productID, receipts) {
  let finalReceipt = null;
  let latestTime = 0;
  let type = '';

  receipts.forEach((receipt) => {
    if (!Object.prototype.hasOwnProperty.call(receipt, 'product_id')
     || !Object.prototype.hasOwnProperty.call(receipt, 'transaction_id')
     || !Object.prototype.hasOwnProperty.call(receipt, 'original_transaction_id')
     || !Object.prototype.hasOwnProperty.call(receipt, 'original_purchase_date_ms')) {
      throw new Error('Fail to parsing Apple receipt.');
    }

    if (receipt.product_id !== productID) {
      return true;
    }

    // Subsription
    if (Object.prototype.hasOwnProperty.call(receipt, 'expires_date_ms')) {
      const time = parseInt(receipt.expires_date_ms, 10);
      if (time > latestTime) {
        finalReceipt = receipt;
        latestTime = time;
      }
      type = 'subscription';
    } else if (Object.prototype.hasOwnProperty.call(receipt, 'purchase_date_ms')) { // IAP
      const time = parseInt(receipt.purchase_date_ms, 10);
      if (time > latestTime) {
        finalReceipt = receipt;
        latestTime = time;
      }
      type = 'iap';
    }

    return true;
  });

  return { receipt: finalReceipt, latest_ms: latestTime, type };
}

function findProductInRenewalInfo(productID, infos) {
  let autoRenewing = 0;
  let cancelReason = 0;

  const info = infos.find(i => i.product_id === productID);
  if (info) {
    if (Object.prototype.hasOwnProperty.call(info, 'expiration_intent')) {
      cancelReason = info.expiration_intent;
    }
    autoRenewing = (info.auto_renew_status === '1');
  }

  return { autoRenewing, cancelReason };
}

function validate(bundle, receipt, productID, callback, inOpts) {
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
              product_original_purchase_date_ms:
                  reply.receipt ? reply.receipt.original_purchase_date_ms : 0,
              download_id: reply.receipt ? reply.receipt.download_id.toString() : '',
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
            error: `Verification and parsing receipt failed: ${exception.toString()} ${appleErr.toString()} ${JSON.stringify(reply)}`,
          });
        }
        return;
      }

      if (iap.isValidated(reply)) {
        try {
          // Purchase.
          if (!Object.prototype.hasOwnProperty.call(reply, 'receipt')
           || !Object.prototype.hasOwnProperty.call(reply.receipt, 'bundle_id')
           || !Object.prototype.hasOwnProperty.call(reply.receipt, 'in_app')) {
            throw new Error('Fail to parsing Apple receipt.');
          }

          let finalReceipt = null;
          let latestTime = 0;
          let type = '';

          // Handle 'latest_receipt_info', deprecated field
          if (Object.prototype.hasOwnProperty.call(reply, 'latest_receipt_info')) {
            const output = findLatestReceipt(productID, reply.latest_receipt_info);
            ({
              receipt: finalReceipt,
              latest_ms: latestTime,
              type,
            } = output);
          }

          // Handle 'in_app'
          const output = findLatestReceipt(productID, reply.receipt.in_app);
          if (output.latest_ms > latestTime) {
            ({
              receipt: finalReceipt,
              latest_ms: latestTime,
              type,
            } = output);
          }

          if (!finalReceipt) {
            callback({
              code: 202,
              status: reply.status,
              receipt: reply,
              message: `the receipt is valid, but target product_id not found: ${productID}`,
              product_original_purchase_date_ms:
                  reply.receipt ? reply.receipt.original_purchase_date_ms : 0,
              download_id: reply.receipt ? reply.receipt.download_id.toString() : '',
            });
            return;
          }

          let autoRenewing = false;
          let cancelReason = 0;
          if (Object.prototype.hasOwnProperty.call(reply, 'pending_renewal_info')) {
            const info = findProductInRenewalInfo(productID, reply.pending_renewal_info);
            ({ autoRenewing, cancelReason } = info);
          }

          let isTrialPeriod = false;
          if (Object.prototype.hasOwnProperty.call(finalReceipt, 'is_trial_period')) {
            isTrialPeriod = !!JSON.parse(finalReceipt.is_trial_period);
          }

          let lastestReceipt = '';
          if (opts.get_latest_receipt) lastestReceipt = reply.latest_receipt || '';

          callback({
            code: 0,
            platform: 'iOS',
            type,
            app_id: reply.receipt.bundle_id,
            product_id: finalReceipt.product_id,
            status: reply.status,
            transaction_id: finalReceipt.transaction_id,
            original_transaction_id: finalReceipt.original_transaction_id,
            developer_payload: '',
            purchase_state: 0,
            consumption_state: 0,
            auto_renewing: autoRenewing,
            price_currency_code: '',
            price_amount_micros: 0,
            country_code: '',
            payment_state: 0,
            cancel_reason: cancelReason,
            is_trial_period: isTrialPeriod,
            original_purchase_date: parseInt(finalReceipt.original_purchase_date_ms, 10),
            expires_date: ((type === 'subscription') ? latestTime : 0),
            product_original_purchase_date_ms: reply.receipt.original_purchase_date_ms,
            download_id: (reply.receipt.download_id || 0).toString(),
            latest_receipt: lastestReceipt,
          });
        } catch (err) {
          callback({
            code: 103,
            receipt: reply,
            error: `Parsing receipt failed (${err.toString()}).`,
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
