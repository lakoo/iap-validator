const validate = require('./validate7.js');
const express = require('express');

const router = express.Router();

router.get('/:bundle/:receipt/:product_id', (req, res) => {
  // Set up response.
  res.writeHead(200, { 'Content-Type': 'application/json' });

  // Validate.
  validate(req.params.bundle, req.params.receipt, req.params.product_id, (result) => {
    // Write response.
    res.end(result);
  });
});

module.exports = router;
