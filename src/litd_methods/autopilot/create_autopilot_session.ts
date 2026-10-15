import grpc from '@grpc/grpc-js';
import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {privacyFlagsAsBitmask} from '../../litd_requests/index.js';
import {rulesAsRpcRulesMap} from '../../litd_requests/index.js';
import type {RuleArgs} from '../../litd_requests/index.js';
import {rpcSessionAsSession} from '../../litd_responses/index.js';
import {sessionRpcError} from '../../litd_responses/index.js';
import type {Session} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const defaultConfig = '{}';
const defaultMailboxServer = 'mailbox.terminal.lightning.today:443';
const {fromEntries} = Object;
const {isArray} = Array;
const isFuture = (n: string) => Date.parse(n) > Date.now();
const isId = (n: string) => /^[0-9A-F]{8}$/i.test(n);
const method = 'addAutopilotSession';
const msPerSecond = 1e3;
const type = 'autopilot';
const unimplementedCode = grpc.status.UNIMPLEMENTED;
const zero = '0';

export type CreateAutopilotSessionArgs = AuthenticatedLitdArgs<{
  /** Session Expires At ISO 8601 Date String */
  expires_at: string;
  features: {
    /** Feature Configuration JSON Object String */
    config?: string;
    /** Feature Name String */
    name: string;
    rules?: RuleArgs[];
  }[];
  /** Mailbox Connection Skips TLS */
  is_dev_server?: boolean;
  /** Do Not Use the Privacy Mapper */
  is_privacy_disabled?: boolean;
  /** Session Label String */
  label?: string;
  /** Link to the Session Group Id Hex String */
  linked_group_id?: string;
  /** Mailbox Server Host:Port String */
  mailbox_server?: string;
  /** Privacy Flag Types */
  privacy_flags?: string[];
  rules?: RuleArgs[];
}>;

export type CreateAutopilotSessionResult = Session;

type Tasks = {
  create: CreateAutopilotSessionResult;
  request: object;
  validate: undefined;
};

/** Create an Autopilot session and register it with the Autopilot server

  Requires `autopilot:write` permission

  Feature `rules` override the rule values that the Autopilot server
  recommends. Session `rules` apply to the whole session.

  A rule has a `name` and one rule value, for example:
  `{name: 'rate-limit', rate_limit: {read_limit: {hours, iterations}}}`

  Rule values that are not present are zero

  The default privacy flags are the flags of the features

  {
    expires_at: <Session Expires At ISO 8601 Date String>
    features: [{
      [config]: <Feature Configuration JSON Object String>
      name: <Feature Name String>
      [rules]: [<Rule Object>]
    }]
    [is_dev_server]: <Mailbox Connection Skips TLS Bool>
    [is_privacy_disabled]: <Do Not Use the Privacy Mapper Bool>
    [label]: <Session Label String>
    [linked_group_id]: <Link to the Session Group Id Hex String>
    litd: <Authenticated litd API Object>
    [mailbox_server]: <Mailbox Server Host:Port String>
    [privacy_flags]: [<Privacy Flag Type String>]
    [rules]: [<Rule Object>]
  }

  @returns via cbk or Promise
  {
    [account_id]: <Account Id Hex String>
    autopilot_features: [{
      [config]: <Feature Configuration JSON String>
      name: <Feature Name String>
      rules: [<Rule Object>]
    }]
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
const createAutopilotSession: LitdMethod<
  CreateAutopilotSessionArgs,
  CreateAutopilotSessionResult
> = (
  args: CreateAutopilotSessionArgs,
  cbk?: LitdCallback<CreateAutopilotSessionResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.expires_at || !isFuture(args.expires_at)) {
            return cbk([
              400,
              'ExpectedFutureExpiresAtToCreateAutopilotSession',
            ]);
          }

          if (!isArray(args.features) || !args.features.length) {
            return cbk([400, 'ExpectedFeaturesToCreateAutopilotSession']);
          }

          if (args.features.some(feature => !feature?.name)) {
            return cbk([400, 'ExpectedNameForAutopilotSessionFeature']);
          }

          const names = args.features.map(feature => feature.name);

          if (new Set(names).size !== names.length) {
            return cbk([400, 'ExpectedUniqueAutopilotSessionFeatures']);
          }

          if (!!args.is_privacy_disabled && !!args.privacy_flags) {
            return cbk([400, 'UnexpectedPrivacyFlagsWithPrivacyDisabled']);
          }

          if (!!args.linked_group_id && !isId(args.linked_group_id)) {
            return cbk([400, 'ExpectedFourByteHexLinkedGroupId']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([
              400,
              'ExpectedAuthenticatedLitdToCreateAutopilotSession',
            ]);
          }

          return cbk();
        },

        // Make the request
        request: [
          'validate',
          ({}, cbk) => {
            const expiry = Date.parse(args.expires_at) / msPerSecond;
            const flags = args.privacy_flags;

            try {
              const features = args.features.map(feature => {
                const config = feature.config ?? defaultConfig;

                const parsed = JSON.parse(config);

                if (!parsed || typeof parsed !== 'object' || isArray(parsed)) {
                  throw new Error('ExpectedJsonObjectConfigForFeature');
                }

                // An empty configuration selects the default configuration
                const isDefault = config.trim() === defaultConfig;

                return [
                  feature.name,
                  {
                    config: Buffer.from(isDefault ? '' : config),
                    rules: rulesAsRpcRulesMap(feature.rules),
                  },
                ];
              });

              return cbk(null, {
                dev_server: !!args.is_dev_server,
                expiry_timestamp_seconds: String(Math.floor(expiry)),
                features: fromEntries(features),
                label: args.label || '',
                linked_group_id: !!args.linked_group_id
                  ? Buffer.from(args.linked_group_id, 'hex')
                  : undefined,
                mailbox_server_addr:
                  args.mailbox_server || defaultMailboxServer,
                no_privacy_mapper: !!args.is_privacy_disabled,
                privacy_flags: !!flags ? privacyFlagsAsBitmask(flags) : zero,
                privacy_flags_set: !!flags,
                session_rules: rulesAsRpcRulesMap(args.rules),
              });
            } catch (err: any) {
              // JSON parse errors are a syntax error
              const isSyntaxError = err instanceof SyntaxError;

              return cbk([
                400,
                isSyntaxError
                  ? 'ExpectedJsonObjectConfigForFeature'
                  : err.message,
              ]);
            }
          },
        ],

        // Create the session
        create: [
          'request',
          ({request}, cbk) => {
            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([
                  503,
                  'FailedToConnectToLitdToCreateAutopilotSession',
                ]);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCreateAutopilotSession']);
              }

              if (err?.code === unimplementedCode) {
                return cbk([501, 'AutopilotIsNotEnabledInLitd']);
              }

              const knownError = sessionRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorCreatingAutopilotSession',
                  {err},
                ]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToCreateAutopilotSession']);
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

export default createAutopilotSession;
