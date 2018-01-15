const validate = require('./validate7.js');
const { errLog, log } = require('../log.js');
const express = require('express');

const router = express.Router();

router.post('/:bundle/:product_id', (req, res) => {
  const opt = {};
  if (undefined !== req.query.get_latest_receipt && req.query.get_latest_receipt !== 'false') {
    opt.get_latest_receipt = true;
  }
  // Set up response.
  log(`ios7_v2: ${req.params.bundle} ${req.params.product_id}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });

  // Validate.
  validate(req.params.bundle, req.body.receipt, req.params.product_id, (result) => {
    // Write response.
    if (result.code !== 0) {
      errLog(JSON.stringify({
        type: 'ios7_v2',
        error: result.error,
        payload: result,
        request: req.body.receipt,
      }));
    }
    res.end(JSON.stringify(result));
  }, opt);
});

module.exports = router;
