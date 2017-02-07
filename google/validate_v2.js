const validate = require('./validate.js');
const express = require('express');

const router = express.Router();

router.post('/', (req, res) => {
  // Set up response.
  res.writeHead(200, { 'Content-Type': 'application/json' });

  // Validate.
  validate(req.body.receipt, (result) => {
    // Write response.
    res.end(result);
  });
});

module.exports = router;
