import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {ruleValueAsRpcRuleValue} from '../../src/litd_requests/index.js';

const tests = [
  {
    args: {},
    description: 'A rule value type is expected',
    error: 'ExpectedOneRuleValueTypeInRuleValue',
  },
  {
    args: {send_to_self: {}, rate_limit: {}},
    description: 'Only one rule value type is expected',
    error: 'ExpectedOneRuleValueTypeInRuleValue',
  },
  {
    args: {on_chain_budget: {max_tokens: -1}},
    description: 'Counts are non-negative integers',
    error: 'ExpectedNonNegativeIntegerInRuleValue',
  },
  {
    args: {off_chain_budget: {max_mtokens: '1.5'}},
    description: 'Millitokens are numeric strings',
    error: 'ExpectedNumericMillitokensStringInRuleValue',
  },
  {
    args: {channel_restrict: {channels: ['123']}},
    description: 'Channels are standard format channel ids',
    error: 'ExpectedStandardFormatChannelIdsInChannelRestrict',
  },
  {
    args: {history_limit: {start_at: 'date'}},
    description: 'A history start is a valid date',
    error: 'ExpectedValidStartDateInHistoryLimitRule',
  },
  {
    args: {peer_restrict: {public_keys: ['key']}},
    description: 'Peers are public keys',
    error: 'ExpectedPeerPublicKeysInPeerRestrictRule',
  },
  {
    args: {rate_limit: {read_limit: {iterations: 5}}},
    description: 'Missing values are zero',
    expected: {
      rate_limit: {
        read_limit: {iterations: 5, num_hours: 0},
        write_limit: {iterations: 0, num_hours: 0},
      },
    },
  },
  {
    args: {channel_restrict: {channels: ['800000x1500x1']}},
    description: 'Channels are numeric channel ids',
    expected: {channel_restrict: {channel_ids: ['879609302319104001']}},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => ruleValueAsRpcRuleValue(args), new Error(error), 'Got err');
    } else {
      deepStrictEqual(ruleValueAsRpcRuleValue(args), expected, 'Got value');
    }

    return;
  });
});
