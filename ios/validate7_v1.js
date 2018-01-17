const validate = require('./validate7.js');
const { errLog } = require('../log.js');
const express = require('express');

const router = express.Router();

router.get('/:bundle/:receipt/:product_id', (req, res) => {
  const opt = {};
  if (undefined !== req.query.get_latest_receipt && req.query.get_latest_receipt !== 'false') {
    opt.get_latest_receipt = true;
  }

  /* This info is logged in nginx anway */
  // log(`ios7_v1: ${req.params.bundle} ${req.params.product_id}`);

  // Set up response.
  res.writeHead(200, { 'Content-Type': 'application/json' });

  // Validate.
  validate(req.params.bundle, req.params.receipt, req.params.product_id, (result) => {
    // Write response.
    if (result.code !== 0 && result.code !== 202) {
      errLog(JSON.stringify({
        type: 'ios7_v1',
        error: result.error,
        payload: result,
        request: req.body.receipt,
      }));
    }
    res.end(JSON.stringify(result));
  }, opt);
});

module.exports = router;
