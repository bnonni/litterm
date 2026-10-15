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

const isAccountId = (n: string) => /^[0-9A-F]{16}$/i.test(n);
const isDate = (n: string) => Date.parse(n) > 0;
const isHex = (n: string) => !(n.length % 2) && /^[0-9A-F]+$/i.test(n);
const method = 'updateAccount';
const msPerSecond = 1e3;
const noChange = -1;
const noExpiry = 0;
const type = 'accounts';
const unixSeconds = (n: string) => Math.floor(Date.parse(n) / msPerSecond);

export type UpdateAccountArgs = AuthenticatedLitdArgs<{
  /** Account Expires At ISO 8601 Date String */
  expires_at?: string;
  /** Account Id Hex String */
  id?: string;
  /** Remove the Account Expiry */
  is_expiry_removed?: boolean;
  /** Account Label String */
  label?: string;
  /** New Account Label String */
  new_label?: string;
}>;

export type UpdateAccountResult = Account;

type Tasks = {
  update: UpdateAccountResult;
  validate: undefined;
};

/** Update the expiry or the label of an account

  Use `creditAccount` or `debitAccount` to change the balance

  Requires `account:write` permission

  An `id` or a `label` is required, not both

  {
    [expires_at]: <Account Expires At ISO 8601 Date String>
    [id]: <Account Id Hex String>
    [is_expiry_removed]: <Remove the Account Expiry Bool>
    [label]: <Account Label String>
    litd: <Authenticated litd API Object>
    [new_label]: <New Account Label String>
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
const updateAccount: LitdMethod<UpdateAccountArgs, UpdateAccountResult> = (
  args: UpdateAccountArgs,
  cbk?: LitdCallback<UpdateAccountResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.id && !args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelToUpdateAccount']);
          }

          if (!!args.id && !!args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelNotBothToUpdateAccount']);
          }

          if (!!args.id && !isHex(args.id)) {
            return cbk([400, 'ExpectedHexAccountIdToUpdateAccount']);
          }

          if (!!args.expires_at && !!args.is_expiry_removed) {
            return cbk([400, 'ExpectedExpiresAtOrExpiryRemovalNotBoth']);
          }

          if (args.expires_at !== undefined && !isDate(args.expires_at)) {
            return cbk([400, 'ExpectedValidExpiresAtDateToUpdateAccount']);
          }

          if (!args.expires_at && !args.is_expiry_removed && !args.new_label) {
            return cbk([400, 'ExpectedAccountChangeToUpdateAccount']);
          }

          if (!!args.new_label && isAccountId(args.new_label)) {
            return cbk([400, 'ExpectedLabelNotFormattedAsAccountId']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToUpdateAccount']);
          }

          return cbk();
        },

        // Update the account
        update: [
          'validate',
          ({}, cbk) => {
            const expiry = args.expires_at;

            // litd changes each value that is not -1, and 0 is a value
            const request = {
              account_balance: noChange,
              expiration_date: !!expiry
                ? unixSeconds(expiry)
                : !!args.is_expiry_removed
                  ? noExpiry
                  : noChange,
              id: args.id || '',
              label: args.label || '',
              new_label: args.new_label || '',
            };

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToUpdateAccount']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToUpdateAccount']);
              }

              const knownError = accountRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorUpdatingAccount', {err}]);
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
      returnResult({reject, resolve, of: 'update'}, cbk),
    );
  });
};

export default updateAccount;
