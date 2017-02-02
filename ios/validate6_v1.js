const validate = require('./validate6.js');
const express = require('express');

const router = express.Router();

router.get('/:bundle/:receipt', (req, res) => {
  // Set up response.
  res.writeHead(200, { 'Content-Type': 'application/json' });

  // Validate.
  validate(req.params.bundle, req.params.receipt, (result) => {
    // Write response.
    res.end(result);
  });
});

module.exports = router;
