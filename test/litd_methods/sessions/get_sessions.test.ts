import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getSessions} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';
import {makeRpcSession} from '../../fixtures/rpc_session.js';
import {session} from '../../fixtures/rpc_session.js';

const litdWith = (listSessions: (req: any, cbk: Function) => void) => {
  return {sessions: {listSessions}} as unknown as AuthenticatedLitd;
};

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetSessions'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetSessions'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetSessions'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingSessions', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of sessions is expected',
    error: [503, 'ExpectedArrayOfSessionsInSessionsResponse'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {sessions: [{}]}))},
    description: 'Valid sessions are expected',
    error: [503, 'ExpectedCreatedAtInRpcSessionDetails'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk(null, {sessions: [makeRpcSession()]})),
    },
    description: 'Sessions are returned',
    expected: {sessions: [session]},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getSessions(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getSessions(args), expected, 'Got sessions');
    }

    return;
  });
});
