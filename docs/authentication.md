# Authentication

litterm connects to the gRPC port of litd. The default port is 8443.

## Get the Cert and the Macaroon

To connect to litd, you need the TLS certificate and a macaroon. Encode each
file as base64 (hex also works):

    base64 -w0 ~/.lit/tls.cert
    base64 -w0 ~/.lit/mainnet/lit.macaroon

For a different network, replace `mainnet` with the network name, for example
`testnet` or `regtest`.

## Connect

```js
import {authenticatedLitdGrpc} from 'litterm';

const {litd} = authenticatedLitdGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded lit.macaroon',
  socket: '127.0.0.1:8443',
});
```

All arguments of `authenticatedLitdGrpc` are optional:

- `cert`: the litd TLS certificate, base64 or hex. Give it if litd uses a
  self-signed cert.
- `lnd`: an authenticated lnd object. Refer to
  [lnd for Asset Channel Methods](#lnd-for-asset-channel-methods).
- `macaroon`: the macaroon, base64 or hex.
- `path`: a protos directory with `litrpc` and `proto` directories. The
  default is the `protos/` directory of the package.
- `socket`: the `host:port` of litd. The default is `localhost:8443`.
- `tapd`: an authenticated tapd object. litterm keeps it in `litd.tapd`. No
  method uses it now.

`authenticatedLitdGrpc` throws an Error if the macaroon is not base64 or hex.

Each method in the [API reference](api/README.md) shows the permission that it
needs. To limit access, use a macaroon that has only these permissions.

## lnd for Asset Channel Methods

`getAssetChannels` and `getAssetChannelBalance` get data from lnd. These
methods use lnd from `litd.lnd`. lnd must run in litd integrated mode with
tapd.

To add lnd, give an authenticated lnd object from
[lightning](https://github.com/alexbosworth/lightning) to
`authenticatedLitdGrpc`:

```js
import {authenticatedLndGrpc} from 'lightning';
import {authenticatedLitdGrpc} from 'litterm';

const {lnd} = authenticatedLndGrpc({cert, macaroon, socket: '127.0.0.1:10009'});

const {litd} = authenticatedLitdGrpc({
  lnd,
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded lit.macaroon',
  socket: '127.0.0.1:8443',
});
```

If `litd.lnd` is missing, these methods return a 400 error, for example
`ExpectedLndInLitdToGetAssetChannels`.

To pay with Taproot Assets, use `payAssetInvoice` and `sendAssetKeysend` from
[tapass](https://github.com/bnonni/tapass).

## Connect Without a Macaroon

litd lets its status service run without a macaroon. To get the status of the
litd subservers without a macaroon, use `unauthenticatedLitdGrpc`:

```js
import {getSubServerStatus} from 'litterm';
import {unauthenticatedLitdGrpc} from 'litterm';

const {litd} = unauthenticatedLitdGrpc({cert, socket: '127.0.0.1:8443'});

const {sub_servers} = await getSubServerStatus({litd});
```

`unauthenticatedLitdGrpc` takes the `cert`, `path`, and `socket` arguments of
`authenticatedLitdGrpc`. Give the `cert` if litd uses a self-signed cert.
