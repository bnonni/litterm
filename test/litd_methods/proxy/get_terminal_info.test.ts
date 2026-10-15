import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getTerminalInfo} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const litdWith = (getInfo: (req: any, cbk: Function) => void) => {
  return {default: {getInfo}} as unknown as AuthenticatedLitd;
};

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetTerminalInfo'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetTerminalInfo'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk({details: 'waiting for the RPC server to start'});
      }),
    },
    description: 'A litd that is starting is not ready',
    error: [503, 'LitdIsNotReadyToGetTerminalInfo'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingTerminalInfo', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'A version is expected',
    error: [503, 'ExpectedVersionInTerminalInfoResponse'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk(null, {commit_hash: 'abc', version: '0.17.6-alpha'});
      }),
    },
    description: 'The info is returned',
    expected: {commit_hash: 'abc', version: '0.17.6-alpha'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getTerminalInfo(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getTerminalInfo(args), expected, 'Got info');
    }

    return;
  });
});
