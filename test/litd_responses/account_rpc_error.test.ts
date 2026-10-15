import {deepStrictEqual} from 'node:assert/strict';
import test from 'node:test';

import accountRpcError from '../../src/litd_responses/account_rpc_error.js';

const tests = [
  {args: {}, description: 'No error is no known error', expected: undefined},
  {
    args: {err: {details: 'something else'}},
    description: 'An unknown error is not a known error',
    expected: undefined,
  },
  {
    args: {err: {details: 'error retrieving account: account not found'}},
    description: 'A missing account id is not found',
    expected: [404, 'AccountNotFound'],
  },
  {
    args: {err: {details: "unable to find account with label 'bob'"}},
    description: 'A missing account label is not found',
    expected: [404, 'AccountNotFound'],
  },
  {
    args: {
      err: {
        details:
          "an account with the label 'a' already exists: account label " +
          'uniqueness constraint violation',
      },
    },
    description: 'A used label is a conflict',
    expected: [409, 'AccountWithLabelAlreadyExists'],
  },
  {
    args: {
      err: {
        details:
          'unable to debit account: cannot debit 5 from the account ' +
          'balance, as the resulting balance would be below 0',
      },
    },
    description: 'A debit below zero is an insufficient balance',
    expected: [400, 'InsufficientAccountBalanceForDebit'],
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    deepStrictEqual(accountRpcError(args), expected, 'Got known error');

    return;
  });
});
