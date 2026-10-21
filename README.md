# litterm

[![npm](https://img.shields.io/npm/v/litterm)](https://www.npmjs.com/package/litterm)
[![CI](https://github.com/bnonni/litterm/actions/workflows/ci.yml/badge.svg)](https://github.com/bnonni/litterm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Methods for the Lightning Terminal daemon (litd), in the style of
[lightning](https://github.com/alexbosworth/lightning).

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Background

[Lightning Terminal](https://github.com/lightninglabs/lightning-terminal)
(litd) bundles lnd, tapd, and other Lightning Labs daemons. litd adds
accounts, Lightning Node Connect sessions, Autopilot, and a firewall.

litterm is a client for the litd gRPC API. Each method takes an object of
arguments and returns an object with snake_case keys, as in lightning. litterm
uses the protos of litd v0.17.6.

Related packages:

- [lightning](https://github.com/alexbosworth/lightning): methods for lnd.
- [tapass](https://github.com/bnonni/tapass): methods for tapd (Taproot
  Assets).

## Install

```sh
npm install litterm lightning
```

litterm needs Node.js 22.12 or later. The package is ESM only.

lightning is a peer dependency. litterm uses the lightning mappers for lnd
payments and channels, so these results have the same shape as in lightning.

## Usage

```js
import {authenticatedLitdGrpc} from 'litterm';
import {createAccount} from 'litterm';
import {getAccounts} from 'litterm';

const {litd} = authenticatedLitdGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded lit.macaroon',
  socket: '127.0.0.1:8443',
});

const {id, macaroon} = await createAccount({
  litd,
  label: 'alice',
  tokens: 100000,
});

const {accounts} = await getAccounts({litd});
```

Refer to these pages for more:

- [Authentication](docs/authentication.md): get the cert and the macaroon, add
  lnd, and connect without a macaroon.
- [Usage](docs/usage.md): promises, callbacks, values, and TypeScript types.
- [Errors](docs/errors.md): the error codes and how to read them.

## API

The [API reference](docs/api/README.md) shows the arguments, the result, and
an example for each method.

- [Accounts](docs/api/accounts.md): accounts that limit off-chain spend.
- [Autopilot](docs/api/autopilot.md): Autopilot sessions and features.
- [Asset Channels](docs/api/asset-channels.md): Taproot Assets channels and
  balances.
- [Firewall](docs/api/firewall.md): firewall actions and privacy maps.
- [Proxy](docs/api/proxy.md): litd information, super macaroons, and stop.
- [Sessions](docs/api/sessions.md): Lightning Node Connect sessions.
- [Status](docs/api/status.md): the status of the litd subservers.

## Contributing

Open an issue or a pull request on
[GitHub](https://github.com/bnonni/litterm). To build and test litterm, refer
to [Contributing](docs/CONTRIBUTING.md). The [roadmap](ROADMAP.md) shows the
planned work.

## License

[MIT](LICENSE) © 2025 bnonni
