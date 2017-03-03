# Purchase Validator

[![CircleCI](https://circleci.com/gh/lakoo/iap-validator.svg?style=svg&circle-token=ab4fef9d1a86589516f330d6661bf2e54baf602a)](https://circleci.com/gh/lakoo/iap-validator)

[![Greenkeeper badge](https://badges.greenkeeper.io/lakoo/iap-validator.svg)](https://greenkeeper.io/)

- [Installation](#installation)
- [Configuration](#configuration)
- [Run Purchase Validator](#run-purchase-validator)
- [Google](#google)
  - [Google API](#google-api)
- [iOS](#ios)
  - [iOS 6 receipt API](#ios-6-receipt-api)
  - [iOS 7 receipt API](#ios-7-receipt-api)
- [Testing/Documentation](#testing-documentation)

## Installation

Install all necessary node.js dependencies.

```bash
npm install
```

## Configuration

Create a `config.js` file for the configuration of IAP validator, see [config.js.sample](./config.js.sample)

## Run Purchase Validator

```bash
node app.js
```

## Google

To see more technical details on Google purchase, please see [Purchase.Products](https://developers.google.com/android-publisher/api-ref/purchases/products) and [Purchase.subscriptions](https://developers.google.com/android-publisher/api-ref/purchases/subscriptions) from [Goolge Play Developer API](https://developers.google.com/android-publisher/).

### Google API

API:
```
/validate/google/{purchase_data}
```

## iOS

To see more technical details on Apple purchase receipt, please see [Validating Receipts With the App Store](https://developer.apple.com/library/ios/releasenotes/General/ValidateAppStoreReceipt/Chapters/ValidateRemotely.html).

iOS receipt has few versions in the history, and now we only support the iOS 6 and iOS 7 style receipt.

### iOS 6 receipt API

Use [SKPaymentTransaction:transactionReceipt](https://developer.apple.com/library/ios/documentation/StoreKit/Reference/SKPaymentTransaction_Class/index.html#//apple_ref/occ/instp/SKPaymentTransaction/transactionReceipt) to retrieve the iOS 6 style receipt (deprecated in iOS 7).

API:
```
/validate/ios/6/{bundle}/{receipt}
```

### iOS 7 receipt API

Use [NSBundle:appStoreReceiptURL](https://developer.apple.com/library/ios/documentation/Cocoa/Reference/Foundation/Classes/NSBundle_Class/index.html#//apple_ref/occ/instm/NSBundle/appStoreReceiptURL) to retrieve the iOS 7 style receipt.

API:
```
/validate/ios/7/{bundle}/{receipt}/{product_id}
```

## Testing/Documentation

For the testing and the detail documentation of the RESTful APIs, please use [swagger editor](http://editor.swagger.io/).  To use it, import [swagger.yaml](./swagger.yaml) to the swagger editor.

**When testing the RESTful APIs, please set the port of the server to 8080.**
