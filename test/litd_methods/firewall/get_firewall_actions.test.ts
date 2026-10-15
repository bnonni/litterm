import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getFirewallActions} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const rpcAction = {
  actor_name: '',
  error_reason: '',
  feature_name: '',
  intent: '',
  macaroon_identifier: Buffer.from('0a0b0c0d', 'hex'),
  rpc_method: '/lnrpc.Lightning/GetInfo',
  rpc_params_json: '',
  session_id: Buffer.alloc(4),
  state: 'STATE_DONE',
  structured_json_data: '',
  timestamp: '1700000000',
  trigger: '',
};

const action = {
  actor: undefined,
  attempted_at: '2023-11-14T22:13:20.000Z',
  error: undefined,
  feature: undefined,
  intent: undefined,
  macaroon_id: '0a0b0c0d',
  method: '/lnrpc.Lightning/GetInfo',
  params: undefined,
  session_id: undefined,
  state: 'done',
  structured_data: undefined,
  trigger: undefined,
};

const litdWith = (listActions: (req: any, cbk: Function) => void) => {
  return {firewall: {listActions}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, {actions: [rpcAction]}));

const tests = [
  {
    args: {created_after: 'date', litd},
    description: 'A valid created after date is expected',
    error: [400, 'ExpectedValidCreatedAfterDateToGetActions'],
  },
  {
    args: {created_before: 'date', litd},
    description: 'A valid created before date is expected',
    error: [400, 'ExpectedValidCreatedBeforeDateToGetActions'],
  },
  {
    args: {group_id: '01020304', litd, session_id: '01020304'},
    description: 'A session id and a group id are not expected together',
    error: [400, 'ExpectedSessionIdOrGroupIdNotBothToGetActions'],
  },
  {
    args: {group_id: '0102', litd},
    description: 'A 4 byte group id is expected',
    error: [400, 'ExpectedFourByteHexGroupIdToGetActions'],
  },
  {
    args: {limit: 1.5, litd},
    description: 'An integer limit is expected',
    error: [400, 'ExpectedIntegerLimitToGetActions'],
  },
  {
    args: {limit: 0, litd},
    description: 'A positive limit is expected',
    error: [400, 'ExpectedPositiveLimitToGetActions'],
  },
  {
    args: {limit: 1, litd, token: '{}'},
    description: 'A limit is not expected with a token',
    error: [400, 'UnexpectedLimitWhenPagingActionsWithToken'],
  },
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetActions'],
  },
  {
    args: {litd, session_id: 'session'},
    description: 'A 4 byte session id is expected',
    error: [400, 'ExpectedFourByteHexSessionIdToGetActions'],
  },
  {
    args: {litd, state: 'new' as any},
    description: 'A known state is expected',
    error: [400, 'ExpectedKnownActionStateToGetActions'],
  },
  {
    args: {litd, token: 'token'},
    description: 'A JSON paging token is expected',
    error: [400, 'ExpectedValidPagingTokenToGetActions'],
  },
  {
    args: {litd, token: '{"limit":0,"offset":0}'},
    description: 'A paging token with a limit is expected',
    error: [400, 'ExpectedValidPagingTokenToGetActions'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetActions'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingActions', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of actions is expected',
    error: [503, 'ExpectedArrayOfActionsInActionsResponse'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {actions: [{}]}))},
    description: 'Valid actions are expected',
    error: [503, 'ExpectedMacaroonIdentifierInRpcActionDetails'],
  },
  {
    args: {litd},
    description: 'Actions are returned',
    expected: {actions: [action], next: undefined},
  },
  {
    args: {limit: 1, litd},
    description: 'A full page has a next token',
    expected: {actions: [action], next: '{"limit":1,"offset":1}'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getFirewallActions(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getFirewallActions(args), expected, 'Got actions');
    }

    return;
  });
});

test('The request has the filters and the page', async () => {
  const requests: any[] = [];

  const litd = litdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {actions: []});
  });

  await getFirewallActions({litd});

  await getFirewallActions({
    actor: 'autopilot',
    created_after: '2023-11-14T22:13:20.000Z',
    created_before: '2027-01-15T08:00:00.000Z',
    feature: 'auto-fees',
    group_id: '01020304',
    litd,
    method: '/lnrpc.Lightning/GetInfo',
    state: 'error',
    token: '{"limit":10,"offset":20}',
  });

  deepStrictEqual(requests, [
    {
      actor_name: '',
      count_total: false,
      end_timestamp: 0,
      feature_name: '',
      group_id: undefined,
      index_offset: 0,
      max_num_actions: 100,
      method_name: '',
      reversed: true,
      session_id: undefined,
      start_timestamp: 0,
      state: 'STATE_UNKNOWN',
    },
    {
      actor_name: 'autopilot',
      count_total: false,
      end_timestamp: 1800000000,
      feature_name: 'auto-fees',
      group_id: Buffer.from('01020304', 'hex'),
      index_offset: 20,
      max_num_actions: 10,
      method_name: '/lnrpc.Lightning/GetInfo',
      reversed: true,
      session_id: undefined,
      start_timestamp: 1700000000,
      state: 'STATE_ERROR',
    },
  ]);
});
