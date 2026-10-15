import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {accountRpcError} from '../../litd_responses/index.js';
import {rpcAccountAsAccount} from '../../litd_responses/index.js';
import type {Account} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const {isArray} = Array;
const method = 'listAccounts';
const type = 'accounts';

export type GetAccountsArgs = AuthenticatedLitdArgs;

export type GetAccountsResult = {
  accounts: Account[];
};

type Tasks = {
  getAccounts: GetAccountsResult;
  validate: undefined;
};

/** Get all accounts

  Requires `account:read` permission

  {
    litd: <Authenticated litd API Object>
  }

  @returns via cbk or Promise
  {
    accounts: [{
      balance: <Current Balance Tokens Number>
      [expires_at]: <Account Expires At ISO 8601 Date String>
      id: <Account Id Hex String>
      initial_balance: <Initial Balance Tokens Number>
      invoices: [{
        id: <Invoice Payment Hash Hex String>
      }]
      [label]: <Account Label String>
      payments: [{
        id: <Payment Hash Hex String>
        is_confirmed: <Payment Is Confirmed Bool>
        is_failed: <Payment Failed Bool>
        is_pending: <Payment Is Pending Bool>
        tokens: <Reserved Tokens Including the Fee Limit Number>
      }]
      updated_at: <Account Updated At ISO 8601 Date String>
    }]
  }
*/
const getAccounts: LitdMethod<GetAccountsArgs, GetAccountsResult> = (
  args: GetAccountsArgs,
  cbk?: LitdCallback<GetAccountsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToGetAccounts']);
          }

          return cbk();
        },

        // Get the accounts
        getAccounts: [
          'validate',
          ({}, cbk) => {
            return args.litd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToGetAccounts']);
              }

              const knownError = accountRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAccounts', {err}]);
              }

              if (!res || !isArray(res.accounts)) {
                return cbk([503, 'ExpectedArrayOfAccountsInAccountsResponse']);
              }

              try {
                return cbk(null, {
                  accounts: res.accounts.map(rpcAccountAsAccount),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getAccounts'}, cbk),
    );
  });
};

export default getAccounts;
