import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {stopTerminal} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const litdWith = (stopDaemon: (req: any, cbk: Function) => void) => {
  return {default: {stopDaemon}} as unknown as AuthenticatedLitd;
};

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToStopTerminal'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToStopTerminal'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToStopTerminal'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorStoppingTerminal', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'litd is stopped',
    expected: undefined,
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(stopTerminal(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await stopTerminal(args), expected, 'Stopped litd');
    }

    return;
  });
});
