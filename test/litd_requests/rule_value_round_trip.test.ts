import {deepStrictEqual} from 'node:assert/strict';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import grpcOptions from '../../src/litd_grpc/grpc_options.js';
import {ruleValueAsRpcRuleValue} from '../../src/litd_requests/index.js';
import {rpcRuleValueAsRuleValue} from '../../src/litd_responses/index.js';

const protos = fileURLToPath(new URL('../../protos/', import.meta.url));

const definition = loadSync(join(protos, 'litrpc/lit-autopilot.proto'), {
  ...grpcOptions,
  includeDirs: [join(protos, 'litrpc'), protos],
});

const {service} = (grpc.loadPackageDefinition(definition) as any).litrpc
  .Autopilot;

const {requestDeserialize, requestSerialize} = service.AddAutopilotSession;

// Encode a rule value to protobuf bytes and decode it the way litd sends it
const overTheWire = (value: object) => {
  const request = {session_rules: {rules: {rule: value}}};

  return requestDeserialize(requestSerialize(request)).session_rules.rules.rule;
};

const tests = [
  {
    channel_constraint: {
      is_private_allowed: true,
      is_public_allowed: false,
      max_capacity: 16000000,
      max_give_tokens: 1000,
      min_capacity: 100000,
    },
  },
  {
    channel_policy_bounds: {
      max_base_fee_mtokens: '18446744073709551615',
      max_cltv_delta: 144,
      max_fee_rate: 5000,
      max_htlc_mtokens: '990000000',
      min_base_fee_mtokens: '0',
      min_cltv_delta: 18,
      min_fee_rate: 1,
      min_htlc_mtokens: '1000',
    },
  },
  {channel_restrict: {channels: ['800000x1500x1', '1x0x0']}},
  {history_limit: {duration: 86400, start_at: undefined}},
  {history_limit: {duration: undefined, start_at: '2023-11-14T22:13:20.000Z'}},
  {
    off_chain_budget: {
      max_fee_mtokens: '5000',
      max_mtokens: '18446744073709551615',
    },
  },
  {on_chain_budget: {max_tokens: 50000, max_tokens_per_vbyte: 25}},
  {
    peer_restrict: {
      public_keys: [`02${'11'.repeat(32)}`, `03${'22'.repeat(32)}`],
    },
  },
  {
    rate_limit: {
      read_limit: {hours: 1, iterations: 100},
      write_limit: {hours: 24, iterations: 10},
    },
  },
  {send_to_self: {}},
];

tests.forEach(value => {
  return test(`A ${Object.keys(value)[0]} rule survives a round trip`, () => {
    const rpcValue = overTheWire(ruleValueAsRpcRuleValue(value));

    deepStrictEqual(rpcRuleValueAsRuleValue(rpcValue), value, 'Got rule');

    return;
  });
});
