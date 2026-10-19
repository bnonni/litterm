# Roadmap

This file shows the planned work for litterm. The order can change.

## Done

- Release 0.1.0 (2026-10-15): the gRPC client for litd v0.17.6, and the litd methods for accounts, sessions, autopilot, proxy, status, and firewall.
- Release 0.2.0 (2026-10-17): `getAccountPayments`, `getAssetChannels`, and `getAssetChannelBalance`. `lightning` is a peer dependency.
- CI (2026-10-19): GitHub Actions runs lint, test, and build on each push to `main` and on each pull request.
- Live test (2026-10-19): `pnpm test:live` runs each method against a Polar network. The script gets the node credentials from polarln (`getNodeCredentials`). It does not run in CI, because it needs the Polar desktop app.

## Status

Feature complete (2026-10-19). Only maintenance is planned: bug fixes and dependency updates. Work on the backlog starts only on demand. Release 1.0.0 comes after real use confirms the API.

## Backlog

Do these items only on demand:

- litd v0.17.7: decide if litterm moves to its protos. litterm uses the litd v0.17.6 protos now.
- Send a PR to `lightning` that maps `custom_channel_data`. Now litterm parses this field itself.
