import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {revokeSession} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const publicKey = `02${'11'.repeat(32)}`;

const litdWith = (revokeSession: (req: any, cbk: Function) => void) => {
  return {sessions: {revokeSession}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, {}));

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd, public_key: publicKey},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToRevokeSession'],
  },
  {
    args: {litd, public_key: '02'},
    description: 'A session public key is expected',
    error: [400, 'ExpectedSessionPublicKeyToRevokeSession'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
      public_key: publicKey,
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToRevokeSession'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk({details: 'error fetching session: session not found'});
      }),
      public_key: publicKey,
    },
    description: 'A missing session is returned as not found',
    error: [404, 'SessionNotFound'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err')), public_key: publicKey},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorRevokingSession', {err: 'err'}],
  },
  {
    args: {litd, public_key: publicKey},
    description: 'A session is revoked',
    expected: undefined,
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(revokeSession(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await revokeSession(args), expected, 'Revoked');
    }

    return;
  });
});

test('The request has the public key', async () => {
  let request: any;

  await revokeSession({
    litd: litdWith((req, cbk) => {
      request = req;

      return cbk(null, {});
    }),
    public_key: publicKey,
  });

  deepStrictEqual(request, {local_public_key: Buffer.from(publicKey, 'hex')});
});
