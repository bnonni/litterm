# Asset Channels

These methods get Taproot Assets channel data from lnd. They use lnd from `litd.lnd`. Refer to [Authentication](../authentication.md#lnd-for-asset-channel-methods).

- [getAssetChannelBalance](#getassetchannelbalance): Get the Taproot Assets balances of the open and pending channels
- [getAssetChannels](#getassetchannels): Get the open channels that hold Taproot Assets

## getAssetChannelBalance

Get the Taproot Assets balances of the open and pending channels

Requires `offchain:read` permission

This method uses lnd from `litd.lnd`. lnd must run in litd integrated mode
with tapd, so that lnd returns the asset balances as JSON.

A balance of a group key is the sum of all assets of the group

    {
      litd: <Authenticated litd API Object With lnd Object>
    }

    @returns via cbk or Promise
    {
      assets: [{
        asset_id: <Asset Id Hex String>
        local_balance: <Local Balance Asset Units Numeric String>
        [name]: <Asset Name String>
        remote_balance: <Remote Balance Asset Units Numeric String>
      }]
      groups: [{
        group_key: <Asset Group Key Hex String>
        local_balance: <Local Balance Asset Units Numeric String>
        remote_balance: <Remote Balance Asset Units Numeric String>
      }]
      pending_assets: [{
        asset_id: <Asset Id Hex String>
        local_balance: <Local Balance Asset Units Numeric String>
        [name]: <Asset Name String>
        remote_balance: <Remote Balance Asset Units Numeric String>
      }]
      pending_groups: [{
        group_key: <Asset Group Key Hex String>
        local_balance: <Local Balance Asset Units Numeric String>
        remote_balance: <Remote Balance Asset Units Numeric String>
      }]
    }

Example:

```js
import {getAssetChannelBalance} from 'litterm';

const {assets} = await getAssetChannelBalance({litd});
```

## getAssetChannels

Get the open channels that hold Taproot Assets

Requires `offchain:read` permission

This method uses lnd from `litd.lnd`. lnd must run in litd integrated mode
with tapd, so that lnd returns the asset data of a channel as JSON.

The channel fields are the same as in lightning getChannels

    {
      [is_active]: <Limit Results To Only Active Channels Bool> // false
      [is_offline]: <Limit Results To Only Offline Channels Bool> // false
      [is_private]: <Limit Results To Only Private Channels Bool> // false
      [is_public]: <Limit Results To Only Public Channels Bool> // false
      litd: <Authenticated litd API Object With lnd Object>
      [partner_public_key]: <Only Channels With Public Key Hex String>
    }

    @returns via cbk or Promise
    {
      channels: [{
        asset: {
          capacity: <Channel Capacity Asset Units Numeric String>
          funding: [{
            amount: <Funded Asset Units Numeric String>
            asset_id: <Asset Id Hex String>
            decimal_display: <Decimal Places To Show Number>
            genesis_transaction_id: <Genesis Point Transaction Id Hex String>
            genesis_transaction_vout: <Genesis Point Transaction Vout Number>
            meta_hash: <Metadata Hash Hex String>
            name: <Asset Name String>
            script_key: <Funding Script Key Hex String>
            version: <Asset Version Number>
          }]
          [group_key]: <Asset Group Key Hex String>
          has_spender_leaves: <Local Commitment Commits To Spender Leaves Bool>
          incoming_htlc_balance: <Incoming HTLCs Asset Units Numeric String>
          incoming_htlcs: [{
            amount: <Asset Units Numeric String>
            asset_id: <Asset Id Hex String>
          }]
          local_assets: [{
            amount: <Asset Units Numeric String>
            asset_id: <Asset Id Hex String>
          }]
          local_balance: <Local Balance Asset Units Numeric String>
          outgoing_htlc_balance: <Outgoing HTLCs Asset Units Numeric String>
          outgoing_htlcs: [{
            amount: <Asset Units Numeric String>
            asset_id: <Asset Id Hex String>
          }]
          remote_assets: [{
            amount: <Asset Units Numeric String>
            asset_id: <Asset Id Hex String>
          }]
          remote_balance: <Remote Balance Asset Units Numeric String>
        }
        capacity: <Channel Token Capacity Number>
        id: <Standard Format Channel Id String>
        is_active: <Channel Active Bool>
        local_balance: <Local Balance Tokens Number>
        partner_public_key: <Channel Partner Public Key String>
        remote_balance: <Remote Balance Tokens Number>
        transaction_id: <Blockchain Transaction Id String>
        transaction_vout: <Blockchain Transaction Vout Number>
        [type]: <Channel Commitment Transaction Type String>
        ...<lightning Channel Object>
      }]
    }

Example:

```js
import {getAssetChannels} from 'litterm';

const {channels} = await getAssetChannels({litd});
```
