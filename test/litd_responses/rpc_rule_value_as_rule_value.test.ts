import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcRuleValueAsRuleValue} from '../../src/litd_responses/index.js';

const tests = [
  {args: null, description: 'No rule value is undefined', expected: undefined},
  {
    args: {value: undefined},
    description: 'A rule value with no type is undefined',
    expected: undefined,
  },
  {
    args: {value: 'rate_limit'},
    description: 'Rule value details are expected',
    error: 'ExpectedRuleValueDetailsInRpcRuleValue',
  },
  {
    args: {value: 'new_rule', new_rule: {}},
    description: 'A known rule value type is expected',
    error: 'ExpectedKnownRuleValueTypeInRpcRuleValue',
  },
  {
    args: {value: 'channel_restrict', channel_restrict: {}},
    description: 'Channel ids are expected',
    error: 'ExpectedChannelIdsInRpcChannelRestrictRule',
  },
  {
    args: {value: 'peer_restrict', peer_restrict: {}},
    description: 'Peer ids are expected',
    error: 'ExpectedPeerIdsInRpcPeerRestrictRule',
  },
  {
    args: {
      value: 'channel_restrict',
      channel_restrict: {channel_ids: ['879609302319104001']},
    },
    description: 'Channel ids are standard format',
    expected: {channel_restrict: {channels: ['800000x1500x1']}},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcRuleValueAsRuleValue(args), new Error(error), 'Got err');
    } else {
      deepStrictEqual(rpcRuleValueAsRuleValue(args), expected, 'Got value');
    }

    return;
  });
});
