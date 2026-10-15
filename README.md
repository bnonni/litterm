# litterm

Methods for the Lightning Terminal daemon (litd), in the style of
[lightning](https://github.com/alexbosworth/lightning).

## Install

    npm install litterm

litterm needs Node.js 22.12 or later.

## litd Authentication

To connect to litd, you need the TLS certificate and a macaroon. Encode each
file as base64:

    base64 -w0 ~/.lit/tls.cert
    base64 -w0 ~/.lit/mainnet/lit.macaroon

Then make an authenticated litd object:

```js
import {authenticatedLitdGrpc} from 'litterm';

const {litd} = authenticatedLitdGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded lit.macaroon',
  socket: '127.0.0.1:8443',
});
```

Methods that use more than one daemon get lnd and tapd from the litd object.
To use these methods, give the authenticated lnd and tapd objects to
`authenticatedLitdGrpc`:

```js
import {authenticatedLndGrpc} from 'lightning';
import {authenticatedLitdGrpc} from 'litterm';
import {authenticatedTapdGrpc} from 'tapass';

const {lnd} = authenticatedLndGrpc({cert, macaroon, socket: '127.0.0.1:10009'});
const {tapd} = authenticatedTapdGrpc({
  cert,
  macaroon,
  socket: '127.0.0.1:10029',
});

const {litd} = authenticatedLitdGrpc({
  lnd,
  tapd,
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded lit.macaroon',
  socket: '127.0.0.1:8443',
});
```

To get the status of the litd subservers without a macaroon, use
`unauthenticatedLitdGrpc`:

```js
import {unauthenticatedLitdGrpc} from 'litterm';

const {litd} = unauthenticatedLitdGrpc({cert, socket: '127.0.0.1:8443'});
```

## Methods

- [getAccount](#getaccount): Get an account

### getAccount

Get an account

Requires `account:read` permission

An `id` or a `label` is required

    {
      [id]: <Account Id Hex String>
      [label]: <Account Label String>
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      balance: <Current Balance Tokens Number>
      [expires_at]: <Account Expires At ISO 8601 Date String>
      id: <Account Id Hex String>
      initial_balance: <Initial Balance Tokens Number>
      invoices: [{
        id: <Invoice Payment Hash Hex String>
      }]
      [label]: <Account Label String>
      payments: [{
        id: <Payment Hash Hex String>
        is_confirmed: <Payment Is Confirmed Bool>
        is_failed: <Payment Failed Bool>
        is_pending: <Payment Is Pending Bool>
        tokens: <Reserved Tokens Including the Fee Limit Number>
      }]
      updated_at: <Account Updated At ISO 8601 Date String>
    }

Example:

```js
import {getAccount} from 'litterm';

const {balance} = await getAccount({litd, label: 'alice'});
```

## Errors

Methods return errors as arrays: `[code, 'ErrorMessage', {err}]`.

- `400`: An argument is not correct.
- `404`: litd does not have the item.
- `503`: litd returned an error, or litd is not available.

## Development

    pnpm install
    pnpm test
    pnpm lint
    pnpm build

To copy the protos of a different litd release into `protos/`:

    pnpm sync-protos v0.17.6
