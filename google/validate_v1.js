const validate = require('./validate.js');
const express = require('express');

const router = express.Router();

router.get('/:purchase_data', (req, res) => {
  // Set up response.
  res.writeHead(200, { 'Content-Type': 'application/json' });

  // Validate.
  validate(req.params.purchase_data, (result) => {
    // Write response.
    res.end(result);
  });
});

module.exports = router;
