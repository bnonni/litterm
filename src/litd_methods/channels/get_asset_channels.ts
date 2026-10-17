import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';
import type {GetChannelsResult} from 'lightning';
import {rpcChannelAsChannel} from 'lightning/lnd_responses/index.js';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLndInLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {assetChannelDataAsAsset} from '../../litd_responses/index.js';
import {customChannelDataAsJson} from '../../litd_responses/index.js';
import type {ChannelAsset} from '../../litd_responses/index.js';
import type {JsonAssetChannel} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const {isArray} = Array;
const method = 'listChannels';
const overlayCommitmentType = 'SIMPLE_TAPROOT_OVERLAY';
const overlayType = 'simplified_taproot_overlay';
const type = 'default';

type RpcChannel = {commitment_type?: string; custom_channel_data?: Buffer};

export type AssetChannel = GetChannelsResult['channels'][number] & {
  asset: ChannelAsset;
};

export type GetAssetChannelsArgs = AuthenticatedLitdArgs<{
  /** Limit Results To Only Active Channels Bool */
  is_active?: boolean;
  /** Limit Results To Only Offline Channels Bool */
  is_offline?: boolean;
  /** Limit Results To Only Private Channels Bool */
  is_private?: boolean;
  /** Limit Results To Only Public Channels Bool */
  is_public?: boolean;
  /** Only Channels With Public Key Hex String */
  partner_public_key?: string;
}>;

export type GetAssetChannelsResult = {
  channels: AssetChannel[];
};

type Tasks = {
  getChannels: RpcChannel[];
  channels: GetAssetChannelsResult;
  validate: undefined;
};

/** Get the open channels that hold Taproot Assets

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
*/
const getAssetChannels: LitdMethod<
  GetAssetChannelsArgs,
  GetAssetChannelsResult
> = (
  args: GetAssetChannelsArgs,
  cbk?: LitdCallback<GetAssetChannelsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLndInLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedLndInLitdToGetAssetChannels']);
          }

          return cbk();
        },

        // Get the channels
        getChannels: [
          'validate',
          ({}, cbk) => {
            const peer = args.partner_public_key;

            const request = {
              active_only: !!args.is_active ? true : undefined,
              inactive_only: !!args.is_offline ? true : undefined,
              peer: !peer ? undefined : Buffer.from(peer, 'hex'),
              private_only: !!args.is_private ? true : undefined,
              public_only: !!args.is_public ? true : undefined,
            };

            const lnd = args.litd.lnd!;

            return lnd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLndToGetAssetChannels']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetChannels']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetChannels', {err}]);
              }

              if (!res || !isArray(res.channels)) {
                return cbk([503, 'ExpectedChannelsInListChannelsResponse']);
              }

              return cbk(null, res.channels);
            });
          },
        ],

        // Map the channels that hold assets
        channels: [
          'getChannels',
          ({getChannels}, cbk) => {
            const isAssetChannel = (n: RpcChannel) => {
              return !!n?.custom_channel_data?.length;
            };

            try {
              const channels = getChannels.filter(isAssetChannel).map(n => {
                const channel = rpcChannelAsChannel(n);

                const data = customChannelDataAsJson(n.custom_channel_data);

                const isOverlay = n.commitment_type === overlayCommitmentType;

                return {
                  ...channel,
                  asset: assetChannelDataAsAsset(data as JsonAssetChannel),
                  type: channel.type || (isOverlay ? overlayType : undefined),
                };
              });

              const partner = args.partner_public_key;

              return cbk(null, {
                channels: channels.filter(channel => {
                  return !partner || channel.partner_public_key === partner;
                }),
              });
            } catch (err: any) {
              return cbk([503, err.message]);
            }
          },
        ],
      },
      returnResult({reject, resolve, of: 'channels'}, cbk),
    );
  });
};

export default getAssetChannels;
