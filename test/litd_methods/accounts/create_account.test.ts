import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {createAccount} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const rpcAccount = {
  current_balance: '1000',
  expiration_date: '1800000000',
  id: '0102030405060708',
  initial_balance: '1000',
  invoices: [],
  label: 'alice',
  last_update: '1700000000',
  payments: [],
};

const litdWith = (createAccount: (req: any, cbk: Function) => void) => {
  return {accounts: {createAccount}} as unknown as AuthenticatedLitd;
};

const macaroon = Buffer.from('macaroon');

const litd = litdWith((_, cbk) => cbk(null, {account: rpcAccount, macaroon}));

const tests = [
  {
    args: {expires_at: 'date', litd, tokens: 1000},
    description: 'A valid expiry date is expected',
    error: [400, 'ExpectedValidExpiresAtDateToCreateAccount'],
  },
  {
    args: {label: '0102030405060708', litd, tokens: 1000},
    description: 'A label that looks like an account id is not allowed',
    error: [400, 'ExpectedLabelNotFormattedAsAccountId'],
  },
  {
    args: {litd: {} as AuthenticatedLitd, tokens: 1000},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToCreateAccount'],
  },
  {
    args: {litd, tokens: -1},
    description: 'A balance is expected',
    error: [400, 'ExpectedAccountBalanceTokensToCreateAccount'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
      tokens: 1000,
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToCreateAccount'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk({details: 'account label uniqueness constraint violation'});
      }),
      tokens: 1000,
    },
    description: 'A used label is returned',
    error: [409, 'AccountWithLabelAlreadyExists'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err')), tokens: 1000},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCreatingAccount', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk()), tokens: 1000},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToCreateAccountRequest'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk(null, {account: rpcAccount})),
      tokens: 1000,
    },
    description: 'A macaroon is expected',
    error: [503, 'ExpectedMacaroonForCreatedAccount'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk(null, {macaroon})),
      tokens: 1000,
    },
    description: 'An account is expected',
    error: [503, 'ExpectedRpcAccountDetails'],
  },
  {
    args: {litd, tokens: 1000},
    description: 'An account is created',
    expected: {
      balance: 1000,
      expires_at: '2027-01-15T08:00:00.000Z',
      id: '0102030405060708',
      initial_balance: 1000,
      invoices: [],
      label: 'alice',
      macaroon: macaroon.toString('base64'),
      payments: [],
      updated_at: '2023-11-14T22:13:20.000Z',
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(createAccount(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await createAccount(args), expected, 'Got account');
    }

    return;
  });
});

test('The request has the balance, the expiry, and the label', async () => {
  const requests: any[] = [];

  const litd = litdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {account: rpcAccount, macaroon});
  });

  await createAccount({litd, tokens: 1000});

  await createAccount({
    litd,
    expires_at: '2027-01-15T08:00:00.000Z',
    label: 'alice',
    tokens: 1000,
  });

  deepStrictEqual(requests, [
    {account_balance: 1000, expiration_date: 0, label: ''},
    {account_balance: 1000, expiration_date: 1800000000, label: 'alice'},
  ]);
});
