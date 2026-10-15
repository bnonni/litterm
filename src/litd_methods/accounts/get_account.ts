import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {accountRpcError} from '../../litd_responses/index.js';
import {rpcAccountAsAccount} from '../../litd_responses/index.js';
import type {Account} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const isHex = (n: string) => !(n.length % 2) && /^[0-9A-F]+$/i.test(n);
const method = 'accountInfo';
const type = 'accounts';

export type GetAccountArgs = AuthenticatedLitdArgs<{
  /** Account Id Hex String */
  id?: string;
  /** Account Label String */
  label?: string;
}>;

export type GetAccountResult = Account;

type Tasks = {
  getAccount: GetAccountResult;
  validate: undefined;
};

/** Get an account

  Requires `account:read` permission

  An `id` or a `label` is required, not both

  {
    [id]: <Account Id Hex String>
    [label]: <Account Label String>
    litd: <Authenticated litd API Object>
  }

  @returns via cbk or Promise
  {
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
  }
*/
const getAccount: LitdMethod<GetAccountArgs, GetAccountResult> = (
  args: GetAccountArgs,
  cbk?: LitdCallback<GetAccountResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.id && !args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelToGetAccount']);
          }

          if (!!args.id && !!args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelNotBothToGetAccount']);
          }

          if (!!args.id && !isHex(args.id)) {
            return cbk([400, 'ExpectedHexAccountIdToGetAccount']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToGetAccount']);
          }

          return cbk();
        },

        // Get the account
        getAccount: [
          'validate',
          ({}, cbk) => {
            const request = {id: args.id || '', label: args.label || ''};

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToGetAccount']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAccount']);
              }

              const knownError = accountRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAccount', {err}]);
              }

              try {
                return cbk(null, rpcAccountAsAccount(res));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getAccount'}, cbk),
    );
  });
};

export default getAccount;
