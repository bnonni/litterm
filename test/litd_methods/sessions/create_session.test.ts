import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {createSession} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';
import {makeRpcSession} from '../../fixtures/rpc_session.js';
import {session} from '../../fixtures/rpc_session.js';

const expiresAt = '2099-01-01T00:00:00.000Z';

const litdWith = (addSession: (req: any, cbk: Function) => void) => {
  return {sessions: {addSession}} as unknown as AuthenticatedLitd;
};

const litd = litdWith((_, cbk) => cbk(null, {session: makeRpcSession()}));

const tests = [
  {
    args: {expires_at: expiresAt, litd, type: 'ui_password' as any},
    description: 'A known session type is expected',
    error: [400, 'ExpectedKnownSessionTypeToCreateSession'],
  },
  {
    args: {expires_at: expiresAt, litd, type: 'account' as const},
    description: 'An account session needs an account id',
    error: [400, 'ExpectedAccountIdToCreateAccountSession'],
  },
  {
    args: {account_id: '0102030405060708', expires_at: expiresAt, litd},
    description: 'An account id is only for an account session',
    error: [400, 'UnexpectedAccountIdForNonAccountSession'],
  },
  {
    args: {
      account_id: 'account',
      expires_at: expiresAt,
      litd,
      type: 'account' as const,
    },
    description: 'A hex account id is expected',
    error: [400, 'ExpectedHexAccountIdToCreateSession'],
  },
  {
    args: {expires_at: '2020-01-01T00:00:00.000Z', litd},
    description: 'A future expiry is expected',
    error: [400, 'ExpectedFutureExpiresAtDateToCreateSession'],
  },
  {
    args: {expires_at: expiresAt, litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToCreateSession'],
  },
  {
    args: {expires_at: expiresAt, litd, type: 'custom' as const},
    description: 'A custom session needs permissions',
    error: [400, 'ExpectedPermissionsToCreateCustomSession'],
  },
  {
    args: {
      expires_at: expiresAt,
      litd,
      permissions: [{action: 'read', entity: 'info'}],
    },
    description: 'Permissions are only for a custom session',
    error: [400, 'UnexpectedPermissionsForNonCustomSession'],
  },
  {
    args: {
      expires_at: expiresAt,
      litd,
      permissions: [{action: 'read'} as any],
      type: 'custom' as const,
    },
    description: 'Permissions need an action and an entity',
    error: [400, 'ExpectedActionAndEntityForSessionPermission'],
  },
  {
    args: {
      expires_at: expiresAt,
      litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToCreateSession'],
  },
  {
    args: {
      expires_at: expiresAt,
      litd: litdWith((_, cbk) => cbk({details: 'URI /x is unknown to LiT'})),
      permissions: [{action: '/x', entity: 'uri'}],
      type: 'custom' as const,
    },
    description: 'A known error is returned',
    error: [400, 'ExpectedKnownUriInSessionPermissions'],
  },
  {
    args: {expires_at: expiresAt, litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCreatingSession', {err: 'err'}],
  },
  {
    args: {expires_at: expiresAt, litd: litdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToCreateSessionRequest'],
  },
  {
    args: {expires_at: expiresAt, litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'A session is expected',
    error: [503, 'ExpectedRpcSessionDetails'],
  },
  {
    args: {expires_at: expiresAt, litd},
    description: 'A session is created',
    expected: session,
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(createSession(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await createSession(args), expected, 'Got session');
    }

    return;
  });
});

test('The request has the session details', async () => {
  const requests: any[] = [];

  const litd = litdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {session: makeRpcSession()});
  });

  await createSession({expires_at: expiresAt, litd});

  await createSession({
    account_id: '0102030405060708',
    expires_at: expiresAt,
    is_dev_server: true,
    label: 'alice',
    litd,
    mailbox_server: 'localhost:11110',
    type: 'account',
  });

  await createSession({
    expires_at: expiresAt,
    litd,
    permissions: [{action: '***readonly***', entity: 'uri'}],
    type: 'custom',
  });

  deepStrictEqual(requests, [
    {
      account_id: '',
      dev_server: false,
      expiry_timestamp_seconds: '4070908800',
      label: '',
      macaroon_custom_permissions: [],
      mailbox_server_addr: 'mailbox.terminal.lightning.today:443',
      session_type: 'TYPE_MACAROON_READONLY',
    },
    {
      account_id: '0102030405060708',
      dev_server: true,
      expiry_timestamp_seconds: '4070908800',
      label: 'alice',
      macaroon_custom_permissions: [],
      mailbox_server_addr: 'localhost:11110',
      session_type: 'TYPE_MACAROON_ACCOUNT',
    },
    {
      account_id: '',
      dev_server: false,
      expiry_timestamp_seconds: '4070908800',
      label: '',
      macaroon_custom_permissions: [{action: '***readonly***', entity: 'uri'}],
      mailbox_server_addr: 'mailbox.terminal.lightning.today:443',
      session_type: 'TYPE_MACAROON_CUSTOM',
    },
  ]);
});
