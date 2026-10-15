import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {createSuperMacaroon} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const litdWith = (bakeSuperMacaroon: (req: any, cbk: Function) => void) => {
  return {default: {bakeSuperMacaroon}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, {macaroon: '0201'}));

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToCreateSuperMacaroon'],
  },
  {
    args: {litd, root_key_id_suffix: '0102'},
    description: 'A 4 byte root key id suffix is expected',
    error: [400, 'ExpectedFourByteHexRootKeyIdSuffix'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToCreateSuperMacaroon'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk({details: 'waiting for the RPC server to start'});
      }),
    },
    description: 'A litd that is starting is not ready',
    error: [503, 'LitdIsNotReadyToCreateSuperMacaroon'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCreatingSuperMacaroon', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {macaroon: 'macaroon'}))},
    description: 'A hex macaroon is expected',
    error: [503, 'ExpectedHexMacaroonInSuperMacaroonResponse'],
  },
  {
    args: {litd},
    description: 'A super macaroon is created',
    expected: {macaroon: Buffer.from('0201', 'hex').toString('base64')},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(createSuperMacaroon(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await createSuperMacaroon(args), expected, 'Got mac');
    }

    return;
  });
});

test('The request has the read only flag and the suffix', async () => {
  const requests: any[] = [];

  const litd = litdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {macaroon: '0201'});
  });

  await createSuperMacaroon({
    is_read_only: true,
    litd,
    root_key_id_suffix: '00000102',
  });
  await createSuperMacaroon({litd});

  deepStrictEqual(requests[0], {read_only: true, root_key_id_suffix: 258});
  equal(requests[1].read_only, false, 'Read only is false by default');
  equal(typeof requests[1].root_key_id_suffix, 'number', 'Got random suffix');
});
