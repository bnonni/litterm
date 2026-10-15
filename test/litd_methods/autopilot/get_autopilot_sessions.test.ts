import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAutopilotSessions} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';
import {makeRpcSession} from '../../fixtures/rpc_session.js';
import {session} from '../../fixtures/rpc_session.js';

const litdWith = (listAutopilotSessions: (req: any, cbk: Function) => void) => {
  return {autopilot: {listAutopilotSessions}} as unknown as AuthenticatedLitd;
};

const rpcSession = makeRpcSession({session_type: 'TYPE_AUTOPILOT'});

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetAutopilotSessions'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetAutopilotSessions'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 12, details: 'unknown service'})),
    },
    description: 'A litd without autopilot is returned as not enabled',
    error: [501, 'AutopilotIsNotEnabledInLitd'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAutopilotSessions', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of sessions is expected',
    error: [503, 'ExpectedArrayOfSessionsInAutopilotSessions'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {sessions: [rpcSession]}))},
    description: 'Autopilot sessions are returned',
    expected: {sessions: [{...session, type: 'autopilot'}]},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAutopilotSessions(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAutopilotSessions(args), expected, 'Got list');
    }

    return;
  });
});
