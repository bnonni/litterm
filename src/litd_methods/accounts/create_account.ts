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
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isDate = (n: string) => Date.parse(n) > 0;
const {isSafeInteger} = Number;
const method = 'createAccount';
const msPerSecond = 1e3;
const noExpiry = 0;
const type = 'accounts';
const unixSeconds = (n: string) => Math.floor(Date.parse(n) / msPerSecond);

export type CreateAccountArgs = AuthenticatedLitdArgs<{
  /** Account Expires At ISO 8601 Date String */
  expires_at?: string;
  /** Account Label String */
  label?: string;
  /** Account Balance Tokens */
  tokens: number;
}>;

export type CreateAccountResult = Account & {
  /** Account Macaroon Base64 */
  macaroon: string;
};

type Tasks = {
  create: CreateAccountResult;
  validate: undefined;
};

/** Create an account

  An account limits the tokens that its macaroon can spend off-chain

  Requires `account:write` permission

  A `label` must be unique and must not look like an account id

  {
    [expires_at]: <Account Expires At ISO 8601 Date String>
    [label]: <Account Label String>
    litd: <Authenticated litd API Object>
    tokens: <Account Balance Tokens Number>
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
    macaroon: <Account Macaroon Base64 String>
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
const createAccount: LitdMethod<CreateAccountArgs, CreateAccountResult> = (
  args: CreateAccountArgs,
  cbk?: LitdCallback<CreateAccountResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (args.expires_at !== undefined && !isDate(args.expires_at)) {
            return cbk([400, 'ExpectedValidExpiresAtDateToCreateAccount']);
          }

          if (!!args.label && isAccountId(args.label)) {
            return cbk([400, 'ExpectedLabelNotFormattedAsAccountId']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToCreateAccount']);
          }

          if (!isSafeInteger(args.tokens) || args.tokens < 0) {
            return cbk([400, 'ExpectedAccountBalanceTokensToCreateAccount']);
          }

          return cbk();
        },

        // Create the account
        create: [
          'validate',
          ({}, cbk) => {
            const expiry = args.expires_at;

            const request = {
              account_balance: args.tokens,
              expiration_date: !!expiry ? unixSeconds(expiry) : noExpiry,
              label: args.label || '',
            };

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToCreateAccount']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCreateAccount']);
              }

              const knownError = accountRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorCreatingAccount', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToCreateAccountRequest']);
              }

              if (!isBuffer(res.macaroon) || !res.macaroon.length) {
                return cbk([503, 'ExpectedMacaroonForCreatedAccount']);
              }

              try {
                const account = rpcAccountAsAccount(res.account);

                return cbk(null, {
                  ...account,
                  macaroon: res.macaroon.toString('base64'),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'create'}, cbk),
    );
  });
};

export default createAccount;
