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
const {isSafeInteger} = Number;
const method = 'creditAccount';
const type = 'accounts';

export type CreditAccountArgs = AuthenticatedLitdArgs<{
  /** Account Id Hex String */
  id?: string;
  /** Account Label String */
  label?: string;
  /** Credit Tokens */
  tokens: number;
}>;

export type CreditAccountResult = Account;

type Tasks = {
  credit: CreditAccountResult;
  validate: undefined;
};

/** Increase the balance of an account

  Requires `account:write` permission

  An `id` or a `label` is required, not both

  {
    [id]: <Account Id Hex String>
    [label]: <Account Label String>
    litd: <Authenticated litd API Object>
    tokens: <Credit Tokens Number>
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
const creditAccount: LitdMethod<CreditAccountArgs, CreditAccountResult> = (
  args: CreditAccountArgs,
  cbk?: LitdCallback<CreditAccountResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.id && !args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelToCreditAccount']);
          }

          if (!!args.id && !!args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelNotBothToCreditAccount']);
          }

          if (!!args.id && !isHex(args.id)) {
            return cbk([400, 'ExpectedHexAccountIdToCreditAccount']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToCreditAccount']);
          }

          if (!isSafeInteger(args.tokens) || args.tokens <= 0) {
            return cbk([400, 'ExpectedTokensToCreditAccount']);
          }

          return cbk();
        },

        // Credit the account
        credit: [
          'validate',
          ({}, cbk) => {
            const account = !!args.id ? {id: args.id} : {label: args.label};

            const request = {account, amount: args.tokens};

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToCreditAccount']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCreditAccount']);
              }

              const knownError = accountRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorCreditingAccount', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToCreditAccountRequest']);
              }

              try {
                return cbk(null, rpcAccountAsAccount(res.account));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'credit'}, cbk),
    );
  });
};

export default creditAccount;
