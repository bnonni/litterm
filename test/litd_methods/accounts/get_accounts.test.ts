import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAccounts} from '../../../src/index.js';
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

const litdWith = (listAccounts: (req: any, cbk: Function) => void) => {
  return {accounts: {listAccounts}} as unknown as AuthenticatedLitd;
};

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetAccounts'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetAccounts'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAccounts', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of accounts is expected',
    error: [503, 'ExpectedArrayOfAccountsInAccountsResponse'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {accounts: [{}]}))},
    description: 'Valid accounts are expected',
    error: [503, 'ExpectedAccountIdInRpcAccountDetails'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {accounts: [rpcAccount]}))},
    description: 'Accounts are returned',
    expected: {
      accounts: [
        {
          balance: 900,
          expires_at: undefined,
          id: '0102030405060708',
          initial_balance: 1000,
          invoices: [],
          label: 'alice',
          payments: [],
          updated_at: '2023-11-14T22:13:20.000Z',
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAccounts(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAccounts(args), expected, 'Got accounts');
    }

    return;
  });
});
