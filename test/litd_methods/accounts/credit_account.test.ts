import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {creditAccount} from '../../../src/index.js';
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

const litdWith = (creditAccount: (req: any, cbk: Function) => void) => {
  return {accounts: {creditAccount}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, {account: rpcAccount}));

const tests = [
  {
    args: {litd, tokens: 100},
    description: 'An account id or a label is expected',
    error: [400, 'ExpectedAccountIdOrLabelToCreditAccount'],
  },
  {
    args: {id: '0102030405060708', label: 'alice', litd, tokens: 100},
    description: 'An account id and a label are not expected together',
    error: [400, 'ExpectedAccountIdOrLabelNotBothToCreditAccount'],
  },
  {
    args: {id: 'account', litd, tokens: 100},
    description: 'A hex account id is expected',
    error: [400, 'ExpectedHexAccountIdToCreditAccount'],
  },
  {
    args: {label: 'alice', litd: {} as AuthenticatedLitd, tokens: 100},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToCreditAccount'],
  },
  {
    args: {label: 'alice', litd, tokens: 0},
    description: 'Tokens are expected',
    error: [400, 'ExpectedTokensToCreditAccount'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
      tokens: 100,
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToCreditAccount'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({details: 'account not found'})),
      tokens: 100,
    },
    description: 'A missing account is returned as not found',
    error: [404, 'AccountNotFound'],
  },
  {
    args: {label: 'alice', litd: litdWith((_, cbk) => cbk('err')), tokens: 100},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCreditingAccount', {err: 'err'}],
  },
  {
    args: {label: 'alice', litd: litdWith((_, cbk) => cbk()), tokens: 100},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToCreditAccountRequest'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk(null, {})),
      tokens: 1,
    },
    description: 'An account is expected',
    error: [503, 'ExpectedRpcAccountDetails'],
  },
  {
    args: {label: 'alice', litd, tokens: 100},
    description: 'The account is returned',
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
      await rejects(creditAccount(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await creditAccount(args), expected, 'Got account');
    }

    return;
  });
});

test('The request has the account identifier and the amount', async () => {
  const requests: any[] = [];

  const litd = litdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {account: rpcAccount});
  });

  await creditAccount({id: '0102030405060708', litd, tokens: 100});
  await creditAccount({label: 'alice', litd, tokens: 200});

  deepStrictEqual(requests, [
    {account: {id: '0102030405060708'}, amount: 100},
    {account: {label: 'alice'}, amount: 200},
  ]);
});
