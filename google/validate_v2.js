const express = require('express');
const validate = require('./validate.js');
const { errLog, log } = require('../log.js');

const router = express.Router();

router.post('/', (req, res) => {
  // Set up response.
  log(`google_v2: ${req.body.receipt}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });

  // Validate.
  validate(req.body.receipt, (result) => {
    // Write response.
    if (result.code !== 0) {
      errLog(JSON.stringify({
        type: 'google_v2',
        error: result.error,
        payload: result,
        request: req.body.receipt,
      }));
    }
    res.end(JSON.stringify(result));
  });
});

module.exports = router;
