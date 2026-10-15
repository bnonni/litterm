#!/bin/sh
# Copy the litd protos for a release tag into protos/, with the upstream layout.
# Also copy proto/lnd.proto, because lit-accounts.proto imports it.
#
# Usage: sh scripts/sync-protos.sh v0.17.6
set -eu

tag="${1:?Usage: sh scripts/sync-protos.sh <lightning-terminal tag>}"
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL "https://codeload.github.com/lightninglabs/lightning-terminal/tar.gz/refs/tags/$tag" |
  tar -xz -C "$tmp" --strip-components=1

rm -rf "$root/protos"
mkdir -p "$root/protos/litrpc" "$root/protos/proto"

cp "$tmp"/litrpc/*.proto "$root/protos/litrpc/"
cp "$tmp/proto/lnd.proto" "$root/protos/proto/lnd.proto"

printf 'lightning-terminal %s\n' "$tag" > "$root/protos/VERSIONS"
