import {equal} from 'node:assert/strict';
import test from 'node:test';

import {isLndInLitd} from '../../src/litd_requests/index.js';

const listChannels = () => {};

const tests = [
  {
    args: {method: 'listChannels', type: 'default'},
    description: 'No litd has no lnd',
    expected: false,
  },
  {
    args: {litd: {}, method: 'listChannels', type: 'default'},
    description: 'A litd without lnd has no lnd',
    expected: false,
  },
  {
    args: {litd: {lnd: {}}, method: 'listChannels', type: 'default'},
    description: 'An lnd without the service has no lnd',
    expected: false,
  },
  {
    args: {
      litd: {lnd: {default: {listChannels: 'method'}}},
      method: 'listChannels',
      type: 'default',
    },
    description: 'An lnd method must be a function',
    expected: false,
  },
  {
    args: {
      litd: {lnd: {default: {listChannels}}},
      method: 'listChannels',
      type: 'default',
    },
    description: 'An lnd with the method is an lnd',
    expected: true,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    equal(isLndInLitd(args), expected, 'Got lnd in litd');

    return;
  });
});
