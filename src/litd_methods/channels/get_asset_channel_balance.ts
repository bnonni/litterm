import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLndInLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {assetBalanceDataAsBalances} from '../../litd_responses/index.js';
import {customChannelDataAsJson} from '../../litd_responses/index.js';
import type {AssetChannelBalances} from '../../litd_responses/index.js';
import type {JsonAssetChannelBalances} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const method = 'channelBalance';
const type = 'default';

export type GetAssetChannelBalanceArgs = AuthenticatedLitdArgs;

export type GetAssetChannelBalanceResult = AssetChannelBalances;

type Tasks = {
  getBalance: GetAssetChannelBalanceResult;
  validate: undefined;
};

/** Get the Taproot Assets balances of the open and pending channels

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
*/
const getAssetChannelBalance: LitdMethod<
  GetAssetChannelBalanceArgs,
  GetAssetChannelBalanceResult
> = (
  args: GetAssetChannelBalanceArgs,
  cbk?: LitdCallback<GetAssetChannelBalanceResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLndInLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedLndInLitdToGetAssetChannelBalance']);
          }

          return cbk();
        },

        // Get the channel balance
        getBalance: [
          'validate',
          ({}, cbk) => {
            const lnd = args.litd.lnd!;

            return lnd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([
                  503,
                  'FailedToConnectToLndToGetAssetChannelBalance',
                ]);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetChannelBalance']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorGettingAssetChannelBalance',
                  {err},
                ]);
              }

              if (!res) {
                return cbk([503, 'ExpectedChannelBalanceResponse']);
              }

              try {
                const data = customChannelDataAsJson(res.custom_channel_data);

                return cbk(
                  null,
                  assetBalanceDataAsBalances(data as JsonAssetChannelBalances),
                );
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getBalance'}, cbk),
    );
  });
};

export default getAssetChannelBalance;
