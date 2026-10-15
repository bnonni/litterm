import {equal} from 'node:assert/strict';
import test from 'node:test';

import {isLitd} from '../../src/litd_requests/index.js';

const tests = [
  {
    args: {method: 'accountInfo', type: 'accounts'},
    description: 'No litd is not a litd',
    expected: false,
  },
  {
    args: {method: 'accountInfo', litd: {}, type: 'accounts'},
    description: 'A litd without the service is not a litd',
    expected: false,
  },
  {
    args: {method: 'accountInfo', litd: {accounts: {}}, type: 'accounts'},
    description: 'A litd without the method is not a litd',
    expected: false,
  },
  {
    args: {
      method: 'accountInfo',
      litd: {accounts: {accountInfo: () => {}}},
      type: 'accounts',
    },
    description: 'A litd with the method is a litd',
    expected: true,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    equal(isLitd(args), expected, 'Got expected result');

    return;
  });
});
