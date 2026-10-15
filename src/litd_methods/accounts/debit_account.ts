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

const isHex = (n: string) => !(n.length % 2) && /^[0-9A-F]+$/i.test(n);
const {isSafeInteger} = Number;
const method = 'debitAccount';
const type = 'accounts';

export type DebitAccountArgs = AuthenticatedLitdArgs<{
  /** Account Id Hex String */
  id?: string;
  /** Account Label String */
  label?: string;
  /** Debit Tokens */
  tokens: number;
}>;

export type DebitAccountResult = Account;

type Tasks = {
  debit: DebitAccountResult;
  validate: undefined;
};

/** Decrease the balance of an account

  The balance must not go below zero

  Requires `account:write` permission

  An `id` or a `label` is required, not both

  {
    [id]: <Account Id Hex String>
    [label]: <Account Label String>
    litd: <Authenticated litd API Object>
    tokens: <Debit Tokens Number>
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
const debitAccount: LitdMethod<DebitAccountArgs, DebitAccountResult> = (
  args: DebitAccountArgs,
  cbk?: LitdCallback<DebitAccountResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.id && !args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelToDebitAccount']);
          }

          if (!!args.id && !!args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelNotBothToDebitAccount']);
          }

          if (!!args.id && !isHex(args.id)) {
            return cbk([400, 'ExpectedHexAccountIdToDebitAccount']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToDebitAccount']);
          }

          if (!isSafeInteger(args.tokens) || args.tokens <= 0) {
            return cbk([400, 'ExpectedTokensToDebitAccount']);
          }

          return cbk();
        },

        // Debit the account
        debit: [
          'validate',
          ({}, cbk) => {
            const account = !!args.id ? {id: args.id} : {label: args.label};

            const request = {account, amount: args.tokens};

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToDebitAccount']);
              }

              const knownError = accountRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorDebitingAccount', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToDebitAccountRequest']);
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
      returnResult({reject, resolve, of: 'debit'}, cbk),
    );
  });
};

export default debitAccount;
