import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {rpcPaymentAsPayment} from 'lightning/lnd_responses/index.js';

import {getAccountPayments} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';
import {makeLndPayment} from '../../fixtures/lnd_responses.js';
import {makeMissingPayment} from '../../fixtures/lnd_responses.js';
import {overTheWireAccounts} from '../../fixtures/lnd_responses.js';

const confirmedHash = '07'.repeat(32);
const failedHash = '08'.repeat(32);
const missingHash = '09'.repeat(32);

const litdWith = (accountPayments: (req: any, cbk: Function) => void) => {
  return {accounts: {accountPayments}} as unknown as AuthenticatedLitd;
};

const response = (overrides?: object) => {
  return overTheWireAccounts('AccountPayments', {
    first_index_offset: '0',
    last_index_offset: '3',
    payments: [
      makeLndPayment({hash: confirmedHash, status: 'SUCCEEDED'}),
      makeLndPayment({hash: failedHash, status: 'FAILED'}),
      makeMissingPayment({hash: missingHash}),
    ],
    total_num_payments: '3',
    ...overrides,
  });
};

const litd = litdWith((_, cbk) => cbk(null, response()));

const tests = [
  {
    args: {litd},
    description: 'An account id or a label is expected',
    error: [400, 'ExpectedAccountIdOrLabelToGetAccountPayments'],
  },
  {
    args: {id: '0102030405060708', label: 'alice', litd},
    description: 'An account id and a label are not expected together',
    error: [400, 'ExpectedIdOrLabelNotBothToGetAccountPayments'],
  },
  {
    args: {id: 'account', litd},
    description: 'A hex account id is expected',
    error: [400, 'ExpectedHexAccountIdToGetAccountPayments'],
  },
  {
    args: {label: 'alice', limit: 0.5, litd},
    description: 'A whole number limit is expected',
    error: [400, 'ExpectedPositiveLimitToGetAccountPayments'],
  },
  {
    args: {label: 'alice', limit: 51, litd},
    description: 'A limit of at most 50 is expected',
    error: [400, 'ExpectedLimitOfAtMost50ToGetAccountPayments'],
  },
  {
    args: {label: 'alice', limit: 5, litd, token: '{}'},
    description: 'A limit is not expected with a paging token',
    error: [400, 'UnexpectedLimitWhenPagingAccountPayments'],
  },
  {
    args: {label: 'alice', litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetAccountPayments'],
  },
  {
    args: {label: 'alice', litd, token: 'token'},
    description: 'A JSON paging token is expected',
    error: [400, 'ExpectedValidPagingTokenForAccountPayments'],
  },
  {
    args: {label: 'alice', litd, token: '{"limit":60,"offset":0}'},
    description: 'A paging token limit of at most 50 is expected',
    error: [400, 'ExpectedValidPagingTokenForAccountPayments'],
  },
  {
    args: {label: 'alice', litd, token: '{"limit":5}'},
    description: 'A paging token offset is expected',
    error: [400, 'ExpectedValidPagingTokenForAccountPayments'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetAccountPayments'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAccountPayments'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk({code: 12, details: 'unknown method'})),
    },
    description: 'An older litd without the RPC is returned as unsupported',
    error: [501, 'ExpectedNewerLitdToGetAccountPayments'],
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
    args: {label: 'alice', litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAccountPayments', {err: 'err'}],
  },
  {
    args: {label: 'alice', litd: litdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedPaymentsInAccountPaymentsResponse'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => cbk(null, {payments: []})),
    },
    description: 'A last index offset is expected',
    error: [503, 'ExpectedLastIndexOffsetInAccountPayments'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => {
        return cbk(null, {last_index_offset: '0', payments: []});
      }),
    },
    description: 'A total number of payments is expected',
    error: [503, 'ExpectedTotalPaymentsInAccountPayments'],
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => {
        return cbk(null, {
          last_index_offset: '1',
          payments: [{payment_hash: confirmedHash, status: 'SUCCEEDED'}],
          total_num_payments: '1',
        });
      }),
    },
    description: 'A payment that does not map is returned as an error',
    error: [503, 'ExpectedCreationDateInRpcPaymentDetails'],
  },
  {
    args: {label: 'alice', litd},
    description: 'Payments are returned',
    expected: {
      missing_payments: [{id: missingHash}],
      next: undefined,
      payments: [
        rpcPaymentAsPayment(response().payments[0]),
        rpcPaymentAsPayment(response().payments[1]),
      ],
    },
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) =>
        cbk(null, response({total_num_payments: '7'})),
      ),
    },
    description: 'A next paging token is returned when there are more',
    expected: {
      missing_payments: [{id: missingHash}],
      next: '{"limit":20,"offset":3}',
      payments: [
        rpcPaymentAsPayment(response().payments[0]),
        rpcPaymentAsPayment(response().payments[1]),
      ],
    },
  },
  {
    args: {
      label: 'alice',
      litd: litdWith((_, cbk) => {
        return cbk(null, response({last_index_offset: '0', payments: []}));
      }),
    },
    description: 'No next paging token is returned after the last payment',
    expected: {missing_payments: [], next: undefined, payments: []},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAccountPayments(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAccountPayments(args), expected, 'Got payments');
    }

    return;
  });
});

test('A payment maps with the lightning payment mapper', async () => {
  const {payments} = await getAccountPayments({label: 'alice', litd});

  const [confirmed, failed] = payments;

  equal(confirmed?.id, confirmedHash, 'Got confirmed payment hash');
  equal(confirmed?.is_confirmed, true, 'Got confirmed payment');
  equal(confirmed?.tokens, 5000, 'Got confirmed payment tokens');
  equal(failed?.id, failedHash, 'Got failed payment hash');
  equal(failed?.is_confirmed, false, 'Got failed payment');

  return;
});

test('The request has the account and the page details', async () => {
  const requests: any[] = [];

  const pagingLitd = litdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, response({total_num_payments: '7'}));
  });

  const {next} = await getAccountPayments({
    id: '0102030405060708',
    limit: 3,
    litd: pagingLitd,
  });

  await getAccountPayments({label: 'alice', litd: pagingLitd, token: next});

  deepStrictEqual(requests, [
    {
      account: {id: '0102030405060708'},
      count_total_payments: true,
      index_offset: 0,
      max_payments: 3,
    },
    {
      account: {label: 'alice'},
      count_total_payments: true,
      index_offset: 3,
      max_payments: 3,
    },
  ]);

  return;
});
