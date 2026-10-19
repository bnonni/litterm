# Roadmap

This file shows the planned work for litterm. The order can change.

## Done

- Release 0.1.0 (2026-10-15): the gRPC client for litd v0.17.6, and the litd methods for accounts, sessions, autopilot, proxy, status, and firewall.
- Release 0.2.0 (2026-10-17): `getAccountPayments`, `getAssetChannels`, and `getAssetChannelBalance`. `lightning` is a peer dependency.
- CI (2026-10-19): GitHub Actions runs lint, test, and build on each push to `main` and on each pull request.

## Next

1. Add a live test script to the repo. The script gets the node credentials from polarln (`getNodeCredentials`). It runs against a Polar network. It does not run in CI, because it needs the Polar desktop app.

## Backlog

Do these items only on demand:

- litd v0.17.7: decide if litterm moves to its protos. litterm uses the litd v0.17.6 protos now.
- Send a PR to `lightning` that maps `custom_channel_data`. Now litterm parses this field itself.
