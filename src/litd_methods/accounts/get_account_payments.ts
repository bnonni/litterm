import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';
import type {GetPaymentsResult} from 'lightning';
import {rpcPaymentAsPayment} from 'lightning/lnd_responses/index.js';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isMethodUnsupported} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {accountRpcError} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const defaultLimit = 20;
const {isArray} = Array;
const isHex = (n: string) => !(n.length % 2) && /^[0-9A-F]+$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const {isSafeInteger} = Number;
const maxLimit = 50;
const method = 'accountPayments';
const missingStatus = 'UNKNOWN';
const {parse} = JSON;
const {stringify} = JSON;
const type = 'accounts';

type RpcPayment = {payment_hash: string; status: string};

export type GetAccountPaymentsArgs = AuthenticatedLitdArgs<{
  /** Account Id Hex String */
  id?: string;
  /** Account Label String */
  label?: string;
  /** Page Result Limit Number */
  limit?: number;
  /** Opaque Paging Token String */
  token?: string;
}>;

export type GetAccountPaymentsResult = {
  missing_payments: {
    /** Payment Hash Hex String */
    id: string;
  }[];
  /** Next Opaque Paging Token */
  next?: string;
  payments: GetPaymentsResult['payments'];
};

type Tasks = {
  getPayments: {payments: RpcPayment[]; token?: string};
  payments: GetAccountPaymentsResult;
  validate: undefined;
};

/** Get the payments of an account, in payment hash order

  Requires `account:read` permission

  An `id` or a `label` is required, not both

  The maximum `limit` is 50. The default `limit` is 20.

  Use the `next` token to get the next page. A `limit` and a `token` are not
  supported together.

  This method needs litd v0.17.1 or later

  If lnd does not know an account payment, its hash is in `missing_payments`

  The payment fields are the same as in lightning getPayments

  {
    [id]: <Account Id Hex String>
    [label]: <Account Label String>
    [limit]: <Page Result Limit Number>
    litd: <Authenticated litd API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    missing_payments: [{
      id: <Payment Hash Hex String>
    }]
    [next]: <Next Opaque Paging Token String>
    payments: [{
      attempts: [<lightning Payment Attempt Object>]
      [confirmed_at]: <Payment Confirmed At ISO 8601 Date String>
      created_at: <Payment at ISO-8601 Date String>
      [destination]: <Destination Node Public Key Hex String>
      [fee]: <Paid Routing Fee Rounded Down Tokens Number>
      [fee_mtokens]: <Paid Routing Fee in Millitokens String>
      hops: [<First Route Hop Public Key Hex String>]
      id: <Payment Preimage Hash String>
      [index]: <Payment Add Index Number>
      is_confirmed: <Payment is Confirmed Bool>
      is_outgoing: <Transaction Is Outgoing Bool>
      mtokens: <Millitokens Sent to Destination String>
      [request]: <BOLT 11 Payment Request String>
      [safe_fee]: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      [secret]: <Payment Preimage Hex String>
      tokens: <Rounded Down Tokens Sent to Destination Number>
    }]
  }
*/
const getAccountPayments: LitdMethod<
  GetAccountPaymentsArgs,
  GetAccountPaymentsResult
> = (
  args: GetAccountPaymentsArgs,
  cbk?: LitdCallback<GetAccountPaymentsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.id && !args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelToGetAccountPayments']);
          }

          if (!!args.id && !!args.label) {
            return cbk([400, 'ExpectedIdOrLabelNotBothToGetAccountPayments']);
          }

          if (!!args.id && !isHex(args.id)) {
            return cbk([400, 'ExpectedHexAccountIdToGetAccountPayments']);
          }

          const limit = args.limit;

          if (limit !== undefined && (!isSafeInteger(limit) || limit < 1)) {
            return cbk([400, 'ExpectedPositiveLimitToGetAccountPayments']);
          }

          if (limit !== undefined && limit > maxLimit) {
            return cbk([400, 'ExpectedLimitOfAtMost50ToGetAccountPayments']);
          }

          if (!!args.limit && !!args.token) {
            return cbk([400, 'UnexpectedLimitWhenPagingAccountPayments']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToGetAccountPayments']);
          }

          return cbk();
        },

        // Get the page of payments
        getPayments: [
          'validate',
          ({}, cbk) => {
            let limit = args.limit || defaultLimit;
            let offset = 0;

            // When there is a token, the token has the page details
            if (!!args.token) {
              try {
                const pagingToken = parse(args.token);

                limit = pagingToken.limit;
                offset = pagingToken.offset;
              } catch (err) {
                return cbk([
                  400,
                  'ExpectedValidPagingTokenForAccountPayments',
                  {err},
                ]);
              }

              const isValidLimit = isSafeInteger(limit) && limit > 0;

              if (!isValidLimit || limit > maxLimit || !isSafeInteger(offset)) {
                return cbk([400, 'ExpectedValidPagingTokenForAccountPayments']);
              }
            }

            const request = {
              account: !!args.id ? {id: args.id} : {label: args.label},
              count_total_payments: true,
              index_offset: offset,
              max_payments: limit,
            };

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToGetAccountPayments']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAccountPayments']);
              }

              if (isMethodUnsupported({err})) {
                return cbk([501, 'ExpectedNewerLitdToGetAccountPayments']);
              }

              const knownError = accountRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorGettingAccountPayments',
                  {err},
                ]);
              }

              if (!res || !isArray(res.payments)) {
                return cbk([503, 'ExpectedPaymentsInAccountPaymentsResponse']);
              }

              if (!isNumeric(res.last_index_offset)) {
                return cbk([503, 'ExpectedLastIndexOffsetInAccountPayments']);
              }

              if (!isNumeric(res.total_num_payments)) {
                return cbk([503, 'ExpectedTotalPaymentsInAccountPayments']);
              }

              const nextOffset = Number(res.last_index_offset);

              const hasMore =
                !!res.payments.length &&
                nextOffset < Number(res.total_num_payments);

              return cbk(null, {
                payments: res.payments,
                token: hasMore
                  ? stringify({limit, offset: nextOffset})
                  : undefined,
              });
            });
          },
        ],

        // Map the payments
        payments: [
          'getPayments',
          ({getPayments}, cbk) => {
            const {payments} = getPayments;

            // lnd does not know a payment that litd returns with no status
            const isMissing = (n: RpcPayment) => n.status === missingStatus;

            try {
              return cbk(null, {
                missing_payments: payments
                  .filter(n => isMissing(n))
                  .map(n => ({id: n.payment_hash})),
                next: getPayments.token,
                payments: payments
                  .filter(n => !isMissing(n))
                  .map(n => rpcPaymentAsPayment(n)),
              });
            } catch (err: any) {
              return cbk([503, err.message]);
            }
          },
        ],
      },
      returnResult({reject, resolve, of: 'payments'}, cbk),
    );
  });
};

export default getAccountPayments;
