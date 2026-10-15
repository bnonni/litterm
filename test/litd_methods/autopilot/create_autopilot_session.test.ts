import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import {createAutopilotSession} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';
import grpcOptions from '../../../src/litd_grpc/grpc_options.js';
import {makeRpcSession} from '../../fixtures/rpc_session.js';
import {session} from '../../fixtures/rpc_session.js';

const expiresAt = '2099-01-01T00:00:00.000Z';
const features = [{name: 'auto-fees'}];

const litdWith = (addAutopilotSession: (req: any, cbk: Function) => void) => {
  return {autopilot: {addAutopilotSession}} as unknown as AuthenticatedLitd;
};

const rpcSession = makeRpcSession({session_type: 'TYPE_AUTOPILOT'});

const litd = litdWith((_, cbk) => cbk(null, {session: rpcSession}));

const tests = [
  {
    args: {expires_at: '2020-01-01T00:00:00.000Z', features, litd},
    description: 'A future expiry is expected',
    error: [400, 'ExpectedFutureExpiresAtToCreateAutopilotSession'],
  },
  {
    args: {expires_at: expiresAt, features: [], litd},
    description: 'Features are expected',
    error: [400, 'ExpectedFeaturesToCreateAutopilotSession'],
  },
  {
    args: {expires_at: expiresAt, features: [{name: ''}], litd},
    description: 'A feature name is expected',
    error: [400, 'ExpectedNameForAutopilotSessionFeature'],
  },
  {
    args: {expires_at: expiresAt, features: [...features, ...features], litd},
    description: 'Features are unique',
    error: [400, 'ExpectedUniqueAutopilotSessionFeatures'],
  },
  {
    args: {
      expires_at: expiresAt,
      features,
      is_privacy_disabled: true,
      litd,
      privacy_flags: ['clear_pubkeys'],
    },
    description: 'Privacy flags need the privacy mapper',
    error: [400, 'UnexpectedPrivacyFlagsWithPrivacyDisabled'],
  },
  {
    args: {expires_at: expiresAt, features, linked_group_id: '01', litd},
    description: 'A 4 byte linked group id is expected',
    error: [400, 'ExpectedFourByteHexLinkedGroupId'],
  },
  {
    args: {expires_at: expiresAt, features, litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToCreateAutopilotSession'],
  },
  {
    args: {expires_at: expiresAt, features: [{config: '{', name: 'a'}], litd},
    description: 'A JSON config is expected',
    error: [400, 'ExpectedJsonObjectConfigForFeature'],
  },
  {
    args: {expires_at: expiresAt, features: [{config: '[]', name: 'a'}], litd},
    description: 'A JSON object config is expected',
    error: [400, 'ExpectedJsonObjectConfigForFeature'],
  },
  {
    args: {
      expires_at: expiresAt,
      features,
      litd,
      privacy_flags: ['clear_everything'],
    },
    description: 'Known privacy flags are expected',
    error: [400, 'ExpectedKnownPrivacyFlagType'],
  },
  {
    args: {
      expires_at: expiresAt,
      features,
      litd,
      rules: [{name: 'peer-restriction', peer_restrict: {public_keys: ['a']}}],
    },
    description: 'Valid rules are expected',
    error: [400, 'ExpectedPeerPublicKeysInPeerRestrictRule'],
  },
  {
    args: {
      expires_at: expiresAt,
      features,
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToCreateAutopilotSession'],
  },
  {
    args: {
      expires_at: expiresAt,
      features,
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToCreateAutopilotSession'],
  },
  {
    args: {
      expires_at: expiresAt,
      features,
      litd: litdWith((_, cbk) => cbk({code: 12, details: 'unknown service'})),
    },
    description: 'A litd without autopilot is returned as not enabled',
    error: [501, 'AutopilotIsNotEnabledInLitd'],
  },
  {
    args: {
      expires_at: expiresAt,
      features,
      litd: litdWith((_, cbk) => {
        return cbk({
          details: 'auto-x is not a features provided by the Autopilot server',
        });
      }),
    },
    description: 'A known error is returned',
    error: [400, 'ExpectedKnownAutopilotFeature'],
  },
  {
    args: {
      expires_at: expiresAt,
      features,
      litd: litdWith((_, cbk) => cbk('e')),
    },
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCreatingAutopilotSession', {err: 'e'}],
  },
  {
    args: {expires_at: expiresAt, features, litd: litdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToCreateAutopilotSession'],
  },
  {
    args: {expires_at: expiresAt, features, litd},
    description: 'An autopilot session is created',
    expected: {...session, type: 'autopilot'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(createAutopilotSession(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await createAutopilotSession(args), expected, 'Got it');
    }

    return;
  });
});

test('The request encodes with the litd protos', async () => {
  const protos = fileURLToPath(new URL('../../../protos/', import.meta.url));

  const definition = loadSync(join(protos, 'litrpc/lit-autopilot.proto'), {
    ...grpcOptions,
    includeDirs: [join(protos, 'litrpc'), protos],
  });

  const {requestDeserialize, requestSerialize} = (
    grpc.loadPackageDefinition(definition) as any
  ).litrpc.Autopilot.service.AddAutopilotSession;

  const requests: any[] = [];

  const litd = litdWith((req, cbk) => {
    requests.push(requestDeserialize(requestSerialize(req)));

    return cbk(null, {session: rpcSession});
  });

  await createAutopilotSession({expires_at: expiresAt, features, litd});

  await createAutopilotSession({
    expires_at: expiresAt,
    features: [
      {
        config: '{"target":0.5}',
        name: 'auto-fees',
        rules: [{name: 'on-chain-budget', on_chain_budget: {max_tokens: 1000}}],
      },
    ],
    is_dev_server: true,
    label: 'alice',
    linked_group_id: '01020304',
    litd,
    mailbox_server: 'localhost:11110',
    privacy_flags: ['clear_pubkeys', 'clear_amounts'],
    rules: [{name: 'send-to-self', send_to_self: {}}],
  });

  const [defaults, custom] = requests;

  deepStrictEqual(defaults.features['auto-fees'].config, Buffer.alloc(0));
  deepStrictEqual(defaults.features['auto-fees'].rules, {rules: {}});
  deepStrictEqual(defaults.linked_group_id, Buffer.alloc(0));
  deepStrictEqual(
    defaults.mailbox_server_addr,
    'mailbox.terminal.lightning.today:443',
  );
  deepStrictEqual(defaults.privacy_flags, '0');
  deepStrictEqual(defaults.privacy_flags_set, false);

  deepStrictEqual(custom.dev_server, true);
  deepStrictEqual(custom.expiry_timestamp_seconds, '4070908800');
  deepStrictEqual(
    custom.features['auto-fees'].config.toString(),
    '{"target":0.5}',
  );
  deepStrictEqual(
    custom.features['auto-fees'].rules.rules['on-chain-budget'].on_chain_budget,
    {absolute_amt_sats: '1000', max_sat_per_v_byte: '0'},
  );
  deepStrictEqual(custom.label, 'alice');
  deepStrictEqual(custom.linked_group_id, Buffer.from('01020304', 'hex'));
  deepStrictEqual(custom.privacy_flags, '3');
  deepStrictEqual(custom.privacy_flags_set, true);
  deepStrictEqual(
    custom.session_rules.rules['send-to-self'].value,
    'send_to_self',
  );
});
