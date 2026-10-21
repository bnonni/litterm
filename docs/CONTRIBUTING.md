# Contributing

Open an [issue](https://github.com/bnonni/litterm/issues) to report a bug or
to ask for a feature. Open a pull request to fix a bug or to add a feature.
The [roadmap](../ROADMAP.md) shows the planned work.

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
messages, for example `fix: map the account not found error`.

## Requirements

- Node.js 22.12 or later
- pnpm 11
- Bun 1.3: the test script runs `bun test`

## Development

```sh
pnpm install
pnpm test
pnpm lint
pnpm build
```

- `pnpm test` type-checks the tests, then runs them with Bun.
- `pnpm lint` runs oxlint and checks the format with oxfmt.
- `pnpm format` formats the code with oxfmt.
- `pnpm build` compiles the package to `dist/`.

CI runs lint, test, and build on each push to `main` and on each pull request.

## Docs

Each method has a JSDoc block in `src/litd_methods/`. The block shows the
arguments and the result of the method. The [API reference](api/README.md)
copies this block, and adds an example.

If you change the arguments or the result of a method, update its JSDoc block
and its API page.

## Protos

litterm uses the protos of litd v0.17.6 in `protos/`. To copy the protos of a
different litd release into `protos/`:

    pnpm sync-protos v0.17.6

## Live Test

The live test runs each method against a Polar network. It does not run in
CI, because it needs the [Polar](https://lightningpolar.com) desktop app.

The network must have two started litd nodes, v0.17.1 or later, in integrated
mode with tapd. If the first node has no channels to the second node, the
test opens a sats channel and an asset channel. It also mints the asset and
funds the node if necessary.

    NETWORK_ID=1 NODES=alice,bob pnpm test:live

- `NETWORK_ID`: the Polar network id. This value is necessary.
- `NODES`: the names of the two litd nodes. The default is `alice,bob`.
- `OLD_NODE`: a litd node that is older than v0.17.1. If you set it, the test
  also checks the 501 of `getAccountPayments`.

Polar has no Autopilot server, so the test expects 501 from the Autopilot
methods. `stopTerminal` uses a read-only macaroon and expects 403, so litd
keeps running.
