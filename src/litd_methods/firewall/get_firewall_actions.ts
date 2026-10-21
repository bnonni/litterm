import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {rpcActionAsAction} from '../../litd_responses/index.js';
import type {Action} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const asSeconds = (n?: string) => (!n ? 0 : Math.floor(Date.parse(n) / 1e3));
const defaultLimit = 100;
const hexAsBuffer = (n?: string) => (!n ? undefined : Buffer.from(n, 'hex'));
const {isArray} = Array;
const isDate = (n: string) => Date.parse(n) > 0;
const isId = (n: string) => /^[0-9A-F]{8}$/i.test(n);
const {isSafeInteger} = Number;
const method = 'listActions';
const {parse} = JSON;
const states = {
  done: 'STATE_DONE',
  error: 'STATE_ERROR',
  pending: 'STATE_PENDING',
};
const {stringify} = JSON;
const type = 'firewall';
const unknownState = 'STATE_UNKNOWN';

export type GetFirewallActionsArgs = AuthenticatedLitdArgs<{
  /** Actor Name String */
  actor?: string;
  /** Attempted After ISO 8601 Date String */
  created_after?: string;
  /** Attempted Before ISO 8601 Date String */
  created_before?: string;
  /** Feature Name String */
  feature?: string;
  /** Session Group Id Hex String */
  group_id?: string;
  /** Page Result Limit Number */
  limit?: number;
  /** RPC Method URI String */
  method?: string;
  /** Session Id Hex String */
  session_id?: string;
  /** Action State */
  state?: 'done' | 'error' | 'pending';
  /** Opaque Paging Token String */
  token?: string;
}>;

export type GetFirewallActionsResult = {
  actions: Action[];
  /** Next Opaque Paging Token */
  next?: string;
};

type Tasks = {
  getActions: GetFirewallActionsResult;
  validate: undefined;
};

/** Get the actions that the firewall recorded, newest first

  litd records actions depending on `firewall.request-logger.level`

  Requires `actions:read` permission

  Use the `next` token with the same filters to get the next page. A `limit`
  and a `token` are not supported together. The default `limit` is 100.

  A `group_id` or a `session_id` is a filter, but not both. Each id is 4 byte
  hex.

  {
    [actor]: <Actor Name String>
    [created_after]: <Attempted After ISO 8601 Date String>
    [created_before]: <Attempted Before ISO 8601 Date String>
    [feature]: <Feature Name String>
    [group_id]: <Session Group Id Hex String>
    [limit]: <Page Result Limit Number>
    litd: <Authenticated litd API Object>
    [method]: <RPC Method URI String>
    [session_id]: <Session Id Hex String>
    [state]: <Action State String> // done, error, pending
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    actions: [{
      [actor]: <Actor Name String>
      attempted_at: <Attempted At ISO 8601 Date String>
      [error]: <Error Reason String>
      [feature]: <Feature Name String>
      [intent]: <Intended Outcome String>
      [macaroon_id]: <Macaroon Id Hex String>
      method: <RPC Method URI String>
      [params]: <RPC Request Parameters JSON String>
      [session_id]: <Session Id Hex String>
      state: <Action State String> // done, error, pending, unknown
      [structured_data]: <Structured Data JSON String>
      [trigger]: <Trigger Reason String>
    }]
    [next]: <Next Opaque Paging Token String>
  }
*/
const getFirewallActions: LitdMethod<
  GetFirewallActionsArgs,
  GetFirewallActionsResult
> = (
  args: GetFirewallActionsArgs,
  cbk?: LitdCallback<GetFirewallActionsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          const after = args.created_after;
          const before = args.created_before;

          if (after !== undefined && !isDate(after)) {
            return cbk([400, 'ExpectedValidCreatedAfterDateToGetActions']);
          }

          if (before !== undefined && !isDate(before)) {
            return cbk([400, 'ExpectedValidCreatedBeforeDateToGetActions']);
          }

          if (!!args.group_id && !!args.session_id) {
            return cbk([400, 'ExpectedSessionIdOrGroupIdNotBothToGetActions']);
          }

          if (args.group_id !== undefined && !isId(args.group_id)) {
            return cbk([400, 'ExpectedFourByteHexGroupIdToGetActions']);
          }

          if (args.limit !== undefined && !isSafeInteger(args.limit)) {
            return cbk([400, 'ExpectedIntegerLimitToGetActions']);
          }

          if (args.limit !== undefined && args.limit < 1) {
            return cbk([400, 'ExpectedPositiveLimitToGetActions']);
          }

          if (!!args.limit && !!args.token) {
            return cbk([400, 'UnexpectedLimitWhenPagingActionsWithToken']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToGetActions']);
          }

          if (args.session_id !== undefined && !isId(args.session_id)) {
            return cbk([400, 'ExpectedFourByteHexSessionIdToGetActions']);
          }

          if (!!args.state && !states[args.state]) {
            return cbk([400, 'ExpectedKnownActionStateToGetActions']);
          }

          return cbk();
        },

        // Get the actions
        getActions: [
          'validate',
          ({}, cbk) => {
            let limit = args.limit || defaultLimit;
            let offset = 0;

            // litd reads the index offset as a row offset in the results
            if (!!args.token) {
              try {
                const pagingToken = parse(args.token);

                limit = pagingToken.limit;
                offset = pagingToken.offset;
              } catch (err) {
                return cbk([
                  400,
                  'ExpectedValidPagingTokenToGetActions',
                  {err},
                ]);
              }

              if (!isSafeInteger(limit) || limit < 1) {
                return cbk([400, 'ExpectedValidPagingTokenToGetActions']);
              }

              if (!isSafeInteger(offset) || offset < 0) {
                return cbk([400, 'ExpectedValidPagingTokenToGetActions']);
              }
            }

            // litd reads an id that is present as a filter, even if it is empty
            const request = {
              actor_name: args.actor || '',
              count_total: false,
              end_timestamp: asSeconds(args.created_before),
              feature_name: args.feature || '',
              group_id: hexAsBuffer(args.group_id),
              index_offset: offset,
              max_num_actions: limit,
              method_name: args.method || '',
              reversed: true,
              session_id: hexAsBuffer(args.session_id),
              start_timestamp: asSeconds(args.created_after),
              state: !!args.state ? states[args.state] : unknownState,
            };

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToGetActions']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetActions']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingActions', {err}]);
              }

              if (!res || !isArray(res.actions)) {
                return cbk([503, 'ExpectedArrayOfActionsInActionsResponse']);
              }

              try {
                const actions = res.actions.map(rpcActionAsAction);

                const isLastPage = actions.length < limit;

                const token = stringify({
                  limit,
                  offset: offset + actions.length,
                });

                return cbk(null, {
                  actions,
                  next: isLastPage ? undefined : token,
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getActions'}, cbk),
    );
  });
};

export default getFirewallActions;
