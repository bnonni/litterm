import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {customChannelDataAsJson} from '../../src/litd_responses/index.js';

const tests = [
  {args: undefined, description: 'No data is undefined', expected: undefined},
  {
    args: Buffer.alloc(0),
    description: 'Empty data is undefined',
    expected: undefined,
  },
  {
    args: Buffer.from('{"amount":18446744073709551615}'),
    description: 'A big number keeps its precision as a string',
    expected: {amount: '18446744073709551615'},
  },
  {
    args: Buffer.from('{"name":"coin 7 \\"x\\" 9","n":[1,-2,3.5e2]}'),
    description: 'Numbers in strings are not changed',
    expected: {n: ['1', '-2', '3.5e2'], name: 'coin 7 "x" 9'},
  },
  {
    args: Buffer.from('{"is_on":true,"key":null}'),
    description: 'Booleans and nulls are not changed',
    expected: {is_on: true, key: null},
  },
  {
    args: Buffer.from([0x00, 0x01]),
    description: 'Binary data is not JSON',
    error: 'ExpectedJsonCustomChannelData',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => customChannelDataAsJson(args), new Error(error));
    } else {
      deepStrictEqual(customChannelDataAsJson(args), expected, 'Got JSON');
    }

    return;
  });
});
