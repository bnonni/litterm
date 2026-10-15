import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {revokeAutopilotSession} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const publicKey = `02${'11'.repeat(32)}`;

const litdWith = (
  revokeAutopilotSession: (req: any, cbk: Function) => void,
) => {
  return {autopilot: {revokeAutopilotSession}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, {}));

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd, public_key: publicKey},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToRevokeAutopilotSession'],
  },
  {
    args: {litd, public_key: 'key'},
    description: 'A session public key is expected',
    error: [400, 'ExpectedSessionPublicKeyToRevokeAutopilotSession'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
      public_key: publicKey,
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToRevokeAutopilotSession'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
      public_key: publicKey,
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToRevokeAutopilotSession'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 12, details: 'unknown service'})),
      public_key: publicKey,
    },
    description: 'A litd without autopilot is returned as not enabled',
    error: [501, 'AutopilotIsNotEnabledInLitd'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'session not found'})),
      public_key: publicKey,
    },
    description: 'A missing autopilot session is returned as not found',
    error: [404, 'SessionNotFound'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err')), public_key: publicKey},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorRevokingAutopilotSession', {err: 'err'}],
  },
  {
    args: {litd, public_key: publicKey},
    description: 'An autopilot session is revoked',
    expected: undefined,
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(revokeAutopilotSession(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await revokeAutopilotSession(args), expected, 'Revoked');
    }

    return;
  });
});
