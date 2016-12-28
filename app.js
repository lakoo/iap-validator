
const log = require('./log.js');
const config = require('./config.js');

const express = require('express');
const googleRouter = require('./google/validate.js');
const ios6Router = require('./ios/validate6.js');
const ios7Router = require('./ios/validate7.js');

const app = express();

// Set cross-origin HTTP request (CORS) for swagger testing.
if (config.DEBUG) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin", "http://editor.swagger.io');
    res.header('Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
} else {
  app.disable('x-powered-by');
}

app.use('/validate/google', googleRouter);
app.use('/validate/ios/6', ios6Router);
app.use('/validate/ios/7', ios7Router);

app.get('/', (req, res) => {
  res.sendStatus(200);
});

const server = app.listen(process.env.PORT || config.PORT, () => {
  log('Purchase Validator is running on port: %s', server.address().port);
});
