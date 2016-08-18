# IAP Validator

- [Installation](#installation)
- [Configuation](#configuation)
- [Run IAP Validator](#run-iap-validator)
- [Google](#google)
- [Testing](#testing)

## Installation

Install all necessary node.js dependencies.

```bash
npm install
```

## Configuration

Create a `config.js` file for the configuration of IAP validator, see [config.js.sample](./config.js.sample)

## Run IAP Validator

```bash
node app.js
```

## Google

To see more technical details on Google subscription, please see [Purchase.subscriptions](https://developers.google.com/android-publisher/api-ref/purchases/subscriptions) from [Goolge Play Developer API](https://developers.google.com/android-publisher/).

## Testing

Use [swagger editor](http://editor.swagger.io/) to test the RESTful APIs.  To use it, import [swagger.yaml](./swagger.yaml) to the swagger editor.

**When testing the RESTful APIs, please set the port of the server to 8080.**
