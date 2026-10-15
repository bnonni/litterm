import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {removeAccount} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const litdWith = (removeAccount: (req: any, cbk: Function) => void) => {
  return {accounts: {removeAccount}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, {}));

const tests = [
  {
    args: {litd},
    description: 'An account id or a label is expected',
    error: [400, 'ExpectedAccountIdOrLabelToRemoveAccount'],
  },
  {
    args: {id: '0102030405060708', label: 'alice', litd},
    description: 'An account id and a label are not expected together',
    error: [400, 'ExpectedAccountIdOrLabelNotBothToRemoveAccount'],
  },
  {
    args: {id: 'account', litd},
    description: 'A hex account id is expected',
    error: [400, 'ExpectedHexAccountIdToRemoveAccount'],
  },
  {
    args: {label: 'alice', litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToRemoveAccount'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToRemoveAccount'],
  },
  {
    args: {
      label: 'bob',
      litd: litdWith((_, cbk) =>
        cbk({details: "unable to find account with label 'bob'"}),
      ),
    },
    description: 'A missing account is returned as not found',
    error: [404, 'AccountNotFound'],
  },
  {
    args: {label: 'alice', litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorRemovingAccount', {err: 'err'}],
  },
  {
    args: {label: 'alice', litd},
    description: 'An account is removed',
    expected: undefined,
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(removeAccount(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await removeAccount(args), expected, 'Removed account');
    }

    return;
  });
});

test('The request has the id and the label', async () => {
  let request: any;

  await removeAccount({
    id: '0102030405060708',
    litd: litdWith((req, cbk) => {
      request = req;

      return cbk(null, {});
    }),
  });

  deepStrictEqual(request, {id: '0102030405060708', label: ''});
});
