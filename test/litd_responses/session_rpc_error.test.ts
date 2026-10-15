import {deepStrictEqual} from 'node:assert/strict';
import test from 'node:test';

import {sessionRpcError} from '../../src/litd_responses/index.js';

const tests = [
  {args: {}, description: 'No error is no known error', expected: undefined},
  {
    args: {err: {details: 'error fetching session: session not found: x'}},
    description: 'A missing session is not found',
    expected: [404, 'SessionNotFound'],
  },
  {
    args: {err: {details: 'expiry must be in the future'}},
    description: 'A past expiry is not valid',
    expected: [400, 'ExpectedFutureExpiryForSession'],
  },
  {
    args: {err: {details: 'URI /lnrpc.X/Y is unknown to LiT'}},
    description: 'An unknown URI is not valid',
    expected: [400, 'ExpectedKnownUriInSessionPermissions'],
  },
  {
    args: {err: {details: 'other'}},
    description: 'An unknown error is not a known error',
    expected: undefined,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    deepStrictEqual(sessionRpcError(args), expected, 'Got known error');

    return;
  });
});
