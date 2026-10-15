import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {rpcSessionAsSession} from '../../litd_responses/index.js';
import {sessionRpcError} from '../../litd_responses/index.js';
import type {Session} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const defaultMailboxServer = 'mailbox.terminal.lightning.today:443';
const defaultType = 'readonly';
const isAccountId = (n: string) => /^[0-9A-F]{16}$/i.test(n);
const {isArray} = Array;
const isFuture = (n: string) => Date.parse(n) > Date.now();
const isPermission = (n: any) => !!n?.action && !!n?.entity;
const method = 'addSession';
const msPerSecond = 1e3;
const type = 'sessions';
const types = {
  account: 'TYPE_MACAROON_ACCOUNT',
  admin: 'TYPE_MACAROON_ADMIN',
  custom: 'TYPE_MACAROON_CUSTOM',
  readonly: 'TYPE_MACAROON_READONLY',
};

export type CreateSessionArgs = AuthenticatedLitdArgs<{
  /** Account Id Hex String */
  account_id?: string;
  /** Session Expires At ISO 8601 Date String */
  expires_at: string;
  /** Mailbox Connection Skips TLS */
  is_dev_server?: boolean;
  /** Session Label String */
  label?: string;
  /** Mailbox Server Host:Port String */
  mailbox_server?: string;
  permissions?: {
    /** Permission Action String */
    action: string;
    /** Permission Entity String */
    entity: string;
  }[];
  /** Session Type */
  type?: 'account' | 'admin' | 'custom' | 'readonly';
}>;

export type CreateSessionResult = Session;

type Tasks = {
  create: CreateSessionResult;
  validate: undefined;
};

/** Create a Lightning Node Connect session

  Requires `sessions:write` permission

  An `account` session needs an `account_id`

  A `custom` session needs `permissions`. Use the entity `uri` and a URI, a
  URI regular expression, or `***readonly***` as the action, to give access to
  RPC methods.

  The default type is `readonly`

  {
    [account_id]: <Account Id Hex String>
    expires_at: <Session Expires At ISO 8601 Date String>
    [is_dev_server]: <Mailbox Connection Skips TLS Bool>
    [label]: <Session Label String>
    litd: <Authenticated litd API Object>
    [mailbox_server]: <Mailbox Server Host:Port String>
    [permissions]: [{
      action: <Permission Action String>
      entity: <Permission Entity String>
    }]
    [type]: <Session Type String> // account, admin, custom, readonly
  }

  @returns via cbk or Promise
  {
    [account_id]: <Account Id Hex String>
    autopilot_features: []
    created_at: <Created At ISO 8601 Date String>
    expires_at: <Expires At ISO 8601 Date String>
    group_id: <Session Group Id Hex String>
    id: <Session Id Hex String>
    is_dev_server: <Mailbox Connection Skips TLS Bool>
    [label]: <Session Label String>
    macaroon_caveats: [<Macaroon Caveat String>]
    macaroon_permissions: [{
      action: <Permission Action String>
      entity: <Permission Entity String>
    }]
    mailbox_server: <Mailbox Server Host:Port String>
    pairing_secret: <Pairing Secret Hex String>
    pairing_secret_mnemonic: <Pairing Secret Mnemonic Words String>
    privacy_flags: [<Privacy Flag Type String>]
    public_key: <Local Static Public Key Hex String>
    [remote_public_key]: <Remote Static Public Key Hex String>
    [revoked_at]: <Revoked At ISO 8601 Date String>
    state: <Session State String>
    type: <Session Type String>
  }
*/
const createSession: LitdMethod<CreateSessionArgs, CreateSessionResult> = (
  args: CreateSessionArgs,
  cbk?: LitdCallback<CreateSessionResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          const sessionType = args.type || defaultType;

          if (!types[sessionType]) {
            return cbk([400, 'ExpectedKnownSessionTypeToCreateSession']);
          }

          if (sessionType === 'account' && !args.account_id) {
            return cbk([400, 'ExpectedAccountIdToCreateAccountSession']);
          }

          if (sessionType !== 'account' && !!args.account_id) {
            return cbk([400, 'UnexpectedAccountIdForNonAccountSession']);
          }

          if (!!args.account_id && !isAccountId(args.account_id)) {
            return cbk([400, 'ExpectedHexAccountIdToCreateSession']);
          }

          if (!args.expires_at || !isFuture(args.expires_at)) {
            return cbk([400, 'ExpectedFutureExpiresAtDateToCreateSession']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToCreateSession']);
          }

          if (sessionType === 'custom' && !args.permissions?.length) {
            return cbk([400, 'ExpectedPermissionsToCreateCustomSession']);
          }

          if (sessionType !== 'custom' && !!args.permissions) {
            return cbk([400, 'UnexpectedPermissionsForNonCustomSession']);
          }

          if (!!args.permissions && !isArray(args.permissions)) {
            return cbk([400, 'ExpectedArrayOfPermissionsToCreateSession']);
          }

          if (!!args.permissions && !args.permissions.every(isPermission)) {
            return cbk([400, 'ExpectedActionAndEntityForSessionPermission']);
          }

          return cbk();
        },

        // Create the session
        create: [
          'validate',
          ({}, cbk) => {
            const expiry = Date.parse(args.expires_at) / msPerSecond;

            const request = {
              account_id: args.account_id || '',
              dev_server: !!args.is_dev_server,
              expiry_timestamp_seconds: String(Math.floor(expiry)),
              label: args.label || '',
              macaroon_custom_permissions: (args.permissions || []).map(n => ({
                action: n.action,
                entity: n.entity,
              })),
              mailbox_server_addr: args.mailbox_server || defaultMailboxServer,
              session_type: types[args.type || defaultType],
            };

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToCreateSession']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCreateSession']);
              }

              const knownError = sessionRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorCreatingSession', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToCreateSessionRequest']);
              }

              try {
                return cbk(null, rpcSessionAsSession(res.session));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'create'}, cbk),
    );
  });
};

export default createSession;
