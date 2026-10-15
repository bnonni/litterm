import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import rpcActionAsAction from '../../src/litd_responses/rpc_action_as_action.js';

const makeAction = (overrides?: object): any => ({
  actor_name: 'autopilot',
  error_reason: '',
  feature_name: 'auto-fees',
  intent: 'update fees',
  macaroon_identifier: Buffer.from('0a0b0c0d', 'hex'),
  rpc_method: '/lnrpc.Lightning/UpdateChannelPolicy',
  rpc_params_json: '{"base_fee_msat":"1"}',
  session_id: Buffer.from('01020304', 'hex'),
  state: 'STATE_DONE',
  structured_json_data: '',
  timestamp: '1700000000',
  trigger: 'low liquidity',
  ...overrides,
});

const tests = [
  {
    args: undefined,
    description: 'Action details are expected',
    error: 'ExpectedRpcActionDetails',
  },
  {
    args: makeAction({macaroon_identifier: undefined}),
    description: 'A macaroon identifier is expected',
    error: 'ExpectedMacaroonIdentifierInRpcActionDetails',
  },
  {
    args: makeAction({rpc_method: ''}),
    description: 'An RPC method is expected',
    error: 'ExpectedRpcMethodInRpcActionDetails',
  },
  {
    args: makeAction({session_id: null}),
    description: 'A session id is expected',
    error: 'ExpectedSessionIdInRpcActionDetails',
  },
  {
    args: makeAction({state: 'STATE_NEW'}),
    description: 'A known state is expected',
    error: 'ExpectedKnownStateInRpcActionDetails',
  },
  {
    args: makeAction({timestamp: undefined}),
    description: 'A timestamp is expected',
    error: 'ExpectedTimestampInRpcActionDetails',
  },
  {
    args: makeAction(),
    description: 'An action is mapped',
    expected: {
      actor: 'autopilot',
      attempted_at: '2023-11-14T22:13:20.000Z',
      error: undefined,
      feature: 'auto-fees',
      intent: 'update fees',
      macaroon_id: '0a0b0c0d',
      method: '/lnrpc.Lightning/UpdateChannelPolicy',
      params: '{"base_fee_msat":"1"}',
      session_id: '01020304',
      state: 'done',
      structured_data: undefined,
      trigger: 'low liquidity',
    },
  },
  {
    args: makeAction({
      actor_name: '',
      error_reason: 'denied',
      feature_name: '',
      intent: '',
      macaroon_identifier: Buffer.alloc(4),
      rpc_params_json: '',
      session_id: Buffer.alloc(4),
      state: 'STATE_ERROR',
      structured_json_data: '{"a":1}',
      trigger: '',
    }),
    description: 'Empty values and zero ids are mapped as undefined',
    expected: {
      actor: undefined,
      attempted_at: '2023-11-14T22:13:20.000Z',
      error: 'denied',
      feature: undefined,
      intent: undefined,
      macaroon_id: undefined,
      method: '/lnrpc.Lightning/UpdateChannelPolicy',
      params: undefined,
      session_id: undefined,
      state: 'error',
      structured_data: '{"a":1}',
      trigger: undefined,
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcActionAsAction(args), new Error(error), 'Got error');
    } else {
      deepStrictEqual(rpcActionAsAction(args), expected, 'Got action');
    }

    return;
  });
});
