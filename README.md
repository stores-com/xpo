# xpo

[![Test](https://github.com/stores-com/xpo/actions/workflows/test.yml/badge.svg)](https://github.com/stores-com/xpo/actions/workflows/test.yml)
[![Coverage Status](https://coveralls.io/repos/github/stores-com/xpo/badge.svg)](https://coveralls.io/github/stores-com/xpo)
[![npm version](https://img.shields.io/npm/v/@stores.com/xpo)](https://www.npmjs.com/package/@stores.com/xpo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

XPO LTL Shipment Tracking API client for retrieving shipment status, reference numbers, and tracking events using PRO numbers.

## Installation

```
$ npm install @stores.com/xpo
```

## Usage

```javascript
const XPO = require('@stores.com/xpo');

const xpo = new XPO({
    api_key: 'your_api_key',
    password: 'your_password',
    username: 'your_username'
});
```

## Documentation

- https://www.xpo.com/help-center/integration-with-customer-systems/api/

## Methods

### getAccessToken()

XPO LTL APIs use the OAuth 2.0 protocol for authentication and authorization using the password grant type.

See: https://www.xpo.com/help-center/integration-with-customer-systems/api/

```javascript
const accessToken = await xpo.getAccessToken();

console.log(accessToken);
// {
//     access_token: '...',
//     expires_in: '3600',
//     token_type: 'Bearer'
// }
```

### getShipmentStatus(referenceNumbers, options)

Retrieves status and basic details about a shipment that match the search criteria based on PRO number(s) and/or customer reference number(s).

See: https://www.xpo.com/cdn/files/s1/XPO_API_Shipment_Tracking_Guide.pdf

```javascript
const status = await xpo.getShipmentStatus('235825413');

console.log(status);
// {
//     data: [{
//         proNbr: '235825413',
//         statusCd: 'DLVD',
//         ...
//     }]
// }
```

You can also pass an array of reference numbers:

```javascript
const status = await xpo.getShipmentStatus(['235825413', '235825414']);
```
