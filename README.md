# litterm

Methods for working with the Lightning Terminal Daemon (litd). An extension of [@alexbosworth/lightning](https://github.com/alexbosworth/lightning.git).

## LITD Authentication

To connect to LITD, authentication details are required.

To export your credentials, run `base64` on the tls.cert and admin.macaroon files to get the encoded
authentication data to create the LITD connection. You can find these files in
the LITD directory. (~/.lit or ~/Library/Application Support/Litd)

    base64 -w0 ~/.lit/tls.cert
    base64 -w0 ~/.lit/mainnet/lit.macaroon

You can then use these to interact with your LITD directly.

```ts
import { authenticatedLitdGrpc } from 'litterm';
// cjs: const { authenticatedLitdGrpc } = require('litterm');

const { litd } = authenticatedLitdGrpc({
    cert: 'base64 encoded tls.cert from ~/.lit dir',
    macaroon: 'base64 encoded lit.macaroon from ~/.lit dir',
    socket: '127.0.0.1:8443',
});
```

## Methods

TODO
