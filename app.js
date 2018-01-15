const gaeDebug = require('@google-cloud/debug-agent');

const { log } = require('./log.js');
const config = require('./config.js');

const compression = require('compression');
const express = require('express');
const bodyParser = require('body-parser');
const googleRouterV1 = require('./google/validate_v1.js');
const googleRouterV2 = require('./google/validate_v2.js');
const ios6RouterV1 = require('./ios/validate6_v1.js');
const ios6RouterV2 = require('./ios/validate6_v2.js');
const ios7RouterV1 = require('./ios/validate7_v1.js');
const ios7RouterV2 = require('./ios/validate7_v2.js');

if (process.env.GAE_VERSION) gaeDebug.start();

const app = express();

// Set cross-origin HTTP request (CORS) for swagger testing.
if (config.DEBUG) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://editor.swagger.io');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
} else {
  app.disable('x-powered-by');
}

// Support gzip
app.use(compression());

// Parse body as url encoded form data
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/validate/google', googleRouterV1);
app.use('/v2/validate/google', googleRouterV2);
app.use('/validate/ios/6', ios6RouterV1);
app.use('/v2/validate/ios/6', ios6RouterV2);
app.use('/validate/ios/7', ios7RouterV1);
app.use('/v2/validate/ios/7', ios7RouterV2);

app.get('/', (req, res) => {
  res.sendStatus(200);
});

const server = app.listen(process.env.PORT || config.PORT, () => {
  log('Purchase Validator is running on port: %s', server.address().port);
});
