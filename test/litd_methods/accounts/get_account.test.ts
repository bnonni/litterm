import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAccount} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const rpcAccount = {
  current_balance: '900',
  expiration_date: '0',
  id: '0102030405060708',
  initial_balance: '1000',
  invoices: [],
  label: 'alice',
  last_update: '1700000000',
  payments: [],
};

const litdWith = (accountInfo: (req: any, cbk: Function) => void) => {
  return {accounts: {accountInfo}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, rpcAccount));

const tests = [
  {
    args: {litd},
    description: 'An account id or a label is expected',
    error: [400, 'ExpectedAccountIdOrLabelToGetAccount'],
  },
  {
    args: {id: '0102030405060708', label: 'alice', litd},
    description: 'An account id and a label are not expected together',
    error: [400, 'ExpectedAccountIdOrLabelNotBothToGetAccount'],
  },
  {
    args: {id: 'account', litd},
    description: 'A hex account id is expected',
    error: [400, 'ExpectedHexAccountIdToGetAccount'],
  },
  {
    args: {id: '0102030405060708', litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetAccount'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetAccount'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAccount'],
  },
  {
    args: {
      label: 'bob',
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'account not found'})),
    },
    description: 'A missing account is returned as not found',
    error: [404, 'AccountNotFound'],
  },
  {
    args: {
      label: 'carol',
      litd: litdWith((_, cbk) => {
        return cbk({
          code: 2,
          details: "unable to find account with label 'carol'",
        });
      }),
    },
    description: 'A missing account label is returned as not found',
    error: [404, 'AccountNotFound'],
  },
  {
    args: {label: 'alice', litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAccount', {err: 'err'}],
  },
  {
    args: {label: 'alice', litd: litdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedRpcAccountDetails'],
  },
  {
    args: {label: 'alice', litd},
    description: 'An account is returned',
    expected: {
      balance: 900,
      expires_at: undefined,
      id: '0102030405060708',
      initial_balance: 1000,
      invoices: [],
      label: 'alice',
      payments: [],
      updated_at: '2023-11-14T22:13:20.000Z',
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAccount(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAccount(args), expected, 'Got account');
    }

    return;
  });
});

test('The request has the id and the label', async () => {
  let request: any;

  await getAccount({
    id: '0102030405060708',
    litd: litdWith((req, cbk) => {
      request = req;

      return cbk(null, rpcAccount);
    }),
  });

  deepStrictEqual(request, {id: '0102030405060708', label: ''});
});
