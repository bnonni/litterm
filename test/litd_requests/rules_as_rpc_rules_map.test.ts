import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rulesAsRpcRulesMap} from '../../src/litd_requests/index.js';

const tests = [
  {
    args: undefined,
    description: 'No rules is an empty map',
    expected: {rules: {}},
  },
  {
    args: 'rules' as any,
    description: 'An array of rules is expected',
    error: 'ExpectedArrayOfRules',
  },
  {
    args: [{send_to_self: {}} as any],
    description: 'A rule name is expected',
    error: 'ExpectedNameForRule',
  },
  {
    args: [
      {name: 'send-to-self', send_to_self: {}},
      {name: 'send-to-self', send_to_self: {}},
    ],
    description: 'Rule names are unique',
    error: 'ExpectedUniqueRuleNames',
  },
  {
    args: [{name: 'on-chain-budget', on_chain_budget: {max_tokens: 1000}}],
    description: 'Rules are mapped by name',
    expected: {
      rules: {
        'on-chain-budget': {
          on_chain_budget: {absolute_amt_sats: 1000, max_sat_per_v_byte: 0},
        },
      },
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rulesAsRpcRulesMap(args), new Error(error), 'Got error');
    } else {
      deepStrictEqual(rulesAsRpcRulesMap(args), expected, 'Got rules map');
    }

    return;
  });
});
