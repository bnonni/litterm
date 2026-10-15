import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {updateAccount} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const rpcAccount = {
  current_balance: '900',
  expiration_date: '0',
  id: '0102030405060708',
  initial_balance: '1000',
  invoices: [],
  label: 'bob',
  last_update: '1700000000',
  payments: [],
};

const litdWith = (updateAccount: (req: any, cbk: Function) => void) => {
  return {accounts: {updateAccount}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, rpcAccount));

const tests = [
  {
    args: {litd, new_label: 'bob'},
    description: 'An account id or a label is expected',
    error: [400, 'ExpectedAccountIdOrLabelToUpdateAccount'],
  },
  {
    args: {id: '0102030405060708', label: 'alice', litd, new_label: 'bob'},
    description: 'An account id and a label are not expected together',
    error: [400, 'ExpectedAccountIdOrLabelNotBothToUpdateAccount'],
  },
  {
    args: {id: 'account', litd, new_label: 'bob'},
    description: 'A hex account id is expected',
    error: [400, 'ExpectedHexAccountIdToUpdateAccount'],
  },
  {
    args: {
      expires_at: '2027-01-15T08:00:00.000Z',
      is_expiry_removed: true,
      label: 'alice',
      litd,
    },
    description: 'An expiry and an expiry removal are not expected together',
    error: [400, 'ExpectedExpiresAtOrExpiryRemovalNotBoth'],
  },
  {
    args: {expires_at: 'date', label: 'alice', litd},
    description: 'A valid expiry date is expected',
    error: [400, 'ExpectedValidExpiresAtDateToUpdateAccount'],
  },
  {
    args: {label: 'alice', litd},
    description: 'A change is expected',
    error: [400, 'ExpectedAccountChangeToUpdateAccount'],
  },
  {
    args: {label: 'alice', litd, new_label: '0102030405060708'},
    description: 'A new label that looks like an account id is not allowed',
    error: [400, 'ExpectedLabelNotFormattedAsAccountId'],
  },
  {
    args: {label: 'alice', litd: {} as AuthenticatedLitd, new_label: 'bob'},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToUpdateAccount'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
      new_label: 'bob',
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToUpdateAccount'],
  },
  {
    args: {
      label: 'carol',
      litd: litdWith((_, cbk) => {
        return cbk({details: "unable to find account with label 'carol'"});
      }),
      new_label: 'bob',
    },
    description: 'A missing account is returned as not found',
    error: [404, 'AccountNotFound'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk('err')),
      new_label: 'b',
    },
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorUpdatingAccount', {err: 'err'}],
  },
  {
    args: {label: 'alice', litd, new_label: 'bob'},
    description: 'An account is updated',
    expected: {
      balance: 900,
      expires_at: undefined,
      id: '0102030405060708',
      initial_balance: 1000,
      invoices: [],
      label: 'bob',
      payments: [],
      updated_at: '2023-11-14T22:13:20.000Z',
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(updateAccount(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await updateAccount(args), expected, 'Got account');
    }

    return;
  });
});

test('The request does not change values that are not given', async () => {
  const requests: any[] = [];

  const litd = litdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, rpcAccount);
  });

  await updateAccount({label: 'alice', litd, new_label: 'bob'});
  await updateAccount({id: '0102030405060708', is_expiry_removed: true, litd});
  await updateAccount({
    expires_at: '2027-01-15T08:00:00.000Z',
    label: 'a',
    litd,
  });

  deepStrictEqual(requests, [
    {
      account_balance: -1,
      expiration_date: -1,
      id: '',
      label: 'alice',
      new_label: 'bob',
    },
    {
      account_balance: -1,
      expiration_date: 0,
      id: '0102030405060708',
      label: '',
      new_label: '',
    },
    {
      account_balance: -1,
      expiration_date: 1800000000,
      id: '',
      label: 'a',
      new_label: '',
    },
  ]);
});
