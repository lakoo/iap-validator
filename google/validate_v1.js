const validate = require('./validate.js');
const { errLog, log } = require('../log.js');
const express = require('express');

const router = express.Router();

router.get('/:purchase_data', (req, res) => {
  // Set up response.
  log(`google_v1: ${req.params.purchase_data}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  // Validate.
  validate(req.params.purchase_data, (result) => {
    // Write response.
    if (result.code !== 0) {
      errLog(JSON.stringify({
        type: 'google_v1',
        error: result.error,
        payload: result,
        request: req.params.purchase_data,
      }));
    }
    res.end(JSON.stringify(result));
  });
});

module.exports = router;
