import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getPrivacyMapValue} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const litdWith = (privacyMapConversion: (req: any, cbk: Function) => void) => {
  return {firewall: {privacyMapConversion}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, {output: 'real'}));

const tests = [
  {
    args: {group_id: '0102', input: 'pseudo', litd},
    description: 'A 4 byte group id is expected',
    error: [400, 'ExpectedFourByteHexGroupIdToGetPrivacyMapValue'],
  },
  {
    args: {group_id: '01020304', input: '', litd},
    description: 'An input is expected',
    error: [400, 'ExpectedInputToGetPrivacyMapValue'],
  },
  {
    args: {
      group_id: '01020304',
      input: 'pseudo',
      litd: {} as AuthenticatedLitd,
    },
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetPrivacyMapValue'],
  },
  {
    args: {
      group_id: '01020304',
      input: 'pseudo',
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetPrivacyMapValue'],
  },
  {
    args: {
      group_id: '01020304',
      input: 'pseudo',
      litd: litdWith((_, cbk) => cbk({details: 'unknown group'})),
    },
    description: 'An unknown group is returned as not found',
    error: [404, 'SessionGroupNotFound'],
  },
  {
    args: {
      group_id: '01020304',
      input: 'pseudo',
      litd: litdWith((_, cbk) => cbk({details: 'no such key found'})),
    },
    description: 'An unknown value is returned as not found',
    error: [404, 'PrivacyMapValueNotFound'],
  },
  {
    args: {
      group_id: '01020304',
      input: 'pseudo',
      litd: litdWith((_, cbk) => cbk('err')),
    },
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingPrivacyMapValue', {err: 'err'}],
  },
  {
    args: {
      group_id: '01020304',
      input: 'pseudo',
      litd: litdWith((_, cbk) => cbk(null, {})),
    },
    description: 'An output is expected',
    error: [503, 'ExpectedOutputInPrivacyMapResponse'],
  },
  {
    args: {group_id: '01020304', input: 'pseudo', litd},
    description: 'The value is returned',
    expected: {output: 'real'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getPrivacyMapValue(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getPrivacyMapValue(args), expected, 'Got value');
    }

    return;
  });
});

test('The request has the group, the input, and the direction', async () => {
  let request: any;

  await getPrivacyMapValue({
    group_id: '01020304',
    input: 'real',
    is_real_to_pseudo: true,
    litd: litdWith((req, cbk) => {
      request = req;

      return cbk(null, {output: 'pseudo'});
    }),
  });

  deepStrictEqual(request, {
    group_id: Buffer.from('01020304', 'hex'),
    input: 'real',
    real_to_pseudo: true,
  });
});
