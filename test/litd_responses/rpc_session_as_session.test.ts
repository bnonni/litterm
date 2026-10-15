import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcSessionAsSession} from '../../src/litd_responses/index.js';
import {makeRpcSession} from '../fixtures/rpc_session.js';
import {session} from '../fixtures/rpc_session.js';

const remoteKey = Buffer.from(`03${'22'.repeat(32)}`, 'hex');

const tests = [
  {
    args: undefined,
    description: 'Session details are expected',
    error: 'ExpectedRpcSessionDetails',
  },
  {
    args: makeRpcSession({created_at: undefined}),
    description: 'A created at date is expected',
    error: 'ExpectedCreatedAtInRpcSessionDetails',
  },
  {
    args: makeRpcSession({expiry_timestamp_seconds: ''}),
    description: 'An expiry is expected',
    error: 'ExpectedExpiryInRpcSessionDetails',
  },
  {
    args: makeRpcSession({group_id: Buffer.alloc(0)}),
    description: 'A group id is expected',
    error: 'ExpectedGroupIdInRpcSessionDetails',
  },
  {
    args: makeRpcSession({id: null}),
    description: 'A session id is expected',
    error: 'ExpectedSessionIdInRpcSessionDetails',
  },
  {
    args: makeRpcSession({local_public_key: 'key'}),
    description: 'A local public key is expected',
    error: 'ExpectedLocalPublicKeyInRpcSessionDetails',
  },
  {
    args: makeRpcSession({pairing_secret: undefined}),
    description: 'A pairing secret is expected',
    error: 'ExpectedPairingSecretInRpcSessionDetails',
  },
  {
    args: makeRpcSession({session_state: 'STATE_NEW'}),
    description: 'A known state is expected',
    error: 'ExpectedKnownSessionStateInRpcSessionDetails',
  },
  {
    args: makeRpcSession({session_type: 'TYPE_NEW'}),
    description: 'A known type is expected',
    error: 'ExpectedKnownSessionTypeInRpcSessionDetails',
  },
  {
    args: makeRpcSession(),
    description: 'A session is mapped',
    expected: session,
  },
  {
    args: makeRpcSession({
      account_id: '0102030405060708',
      autopilot_feature_info: {
        'auto-fees': {
          rules: {
            'rate-limit': {
              value: 'rate_limit',
              rate_limit: {
                read_limit: {iterations: 10, num_hours: 1},
                write_limit: {iterations: 1, num_hours: 24},
              },
            },
          },
        },
      },
      dev_server: true,
      feature_configs: {'auto-fees': '{"a":1}', 'auto-open': '{}'},
      label: '',
      macaroon_recipe: {
        caveats: ['lnd-custom account 0102030405060708'],
        permissions: [{action: 'read', entity: 'info'}],
      },
      privacy_flags: '3',
      remote_public_key: remoteKey,
      revoked_at: '1750000000',
      session_state: 'STATE_REVOKED',
      session_type: 'TYPE_AUTOPILOT',
    }),
    description: 'All session details are mapped',
    expected: {
      ...session,
      account_id: '0102030405060708',
      autopilot_features: [
        {
          config: '{"a":1}',
          name: 'auto-fees',
          rules: [
            {
              name: 'rate-limit',
              rate_limit: {
                read_limit: {hours: 1, iterations: 10},
                write_limit: {hours: 24, iterations: 1},
              },
            },
          ],
        },
        {config: '{}', name: 'auto-open', rules: []},
      ],
      is_dev_server: true,
      label: undefined,
      macaroon_caveats: ['lnd-custom account 0102030405060708'],
      macaroon_permissions: [{action: 'read', entity: 'info'}],
      privacy_flags: ['clear_pubkeys', 'clear_amounts'],
      remote_public_key: remoteKey.toString('hex'),
      revoked_at: '2025-06-15T15:06:40.000Z',
      state: 'revoked',
      type: 'autopilot',
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcSessionAsSession(args), new Error(error), 'Got error');
    } else {
      deepStrictEqual(rpcSessionAsSession(args), expected, 'Got session');
    }

    return;
  });
});
