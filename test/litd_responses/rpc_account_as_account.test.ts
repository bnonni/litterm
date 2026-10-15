import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import rpcAccountAsAccount from '../../src/litd_responses/rpc_account_as_account.js';

const hash = (n: number) => Buffer.alloc(32, n);

const makeAccount = (overrides?: object): any => ({
  current_balance: '900',
  expiration_date: '0',
  id: '0102030405060708',
  initial_balance: '1000',
  invoices: [{hash: hash(1)}],
  label: '',
  last_update: '1700000000',
  payments: [
    {full_amount: '50', hash: hash(2), state: 'SUCCEEDED'},
    {full_amount: '60', hash: hash(3), state: 'IN_FLIGHT'},
    {full_amount: '70', hash: hash(4), state: 'FAILED'},
  ],
  ...overrides,
});

const tests = [
  {
    args: undefined,
    description: 'Account details are expected',
    error: 'ExpectedRpcAccountDetails',
  },
  {
    args: makeAccount({id: ''}),
    description: 'An account id is expected',
    error: 'ExpectedAccountIdInRpcAccountDetails',
  },
  {
    args: makeAccount({current_balance: undefined}),
    description: 'A current balance is expected',
    error: 'ExpectedCurrentBalanceInRpcAccountDetails',
  },
  {
    args: makeAccount({invoices: null}),
    description: 'Invoices are expected',
    error: 'ExpectedArrayOfInvoicesInRpcAccountDetails',
  },
  {
    args: makeAccount({invoices: [{}]}),
    description: 'Invoice hashes are expected',
    error: 'ExpectedInvoiceHashesInRpcAccountDetails',
  },
  {
    args: makeAccount({payments: [{hash: hash(1), state: 'SUCCEEDED'}]}),
    description: 'A payment full amount is expected',
    error: 'ExpectedFullAmountInRpcAccountPayment',
  },
  {
    args: makeAccount(),
    description: 'An account is mapped',
    expected: {
      balance: 900,
      expires_at: undefined,
      id: '0102030405060708',
      initial_balance: 1000,
      invoices: [{id: hash(1).toString('hex')}],
      label: undefined,
      payments: [
        {
          id: hash(2).toString('hex'),
          is_confirmed: true,
          is_failed: false,
          is_pending: false,
          tokens: 50,
        },
        {
          id: hash(3).toString('hex'),
          is_confirmed: false,
          is_failed: false,
          is_pending: true,
          tokens: 60,
        },
        {
          id: hash(4).toString('hex'),
          is_confirmed: false,
          is_failed: true,
          is_pending: false,
          tokens: 70,
        },
      ],
      updated_at: '2023-11-14T22:13:20.000Z',
    },
  },
  {
    args: makeAccount({expiration_date: '1800000000', label: 'alice'}),
    description: 'An expiry date and a label are mapped',
    expected: {expires_at: '2027-01-15T08:00:00.000Z', label: 'alice'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcAccountAsAccount(args), new Error(error), 'Got error');

      return;
    }

    const account = rpcAccountAsAccount(args);

    deepStrictEqual(account.expires_at, expected?.expires_at, 'Got expiry');
    deepStrictEqual(account.label, expected?.label, 'Got label');

    if (!!expected?.payments) {
      deepStrictEqual(account, expected, 'Got account');
    }

    return;
  });
});
