import grpc from '@grpc/grpc-js';
import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {rpcSessionAsSession} from '../../litd_responses/index.js';
import {sessionRpcError} from '../../litd_responses/index.js';
import type {Session} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const {isArray} = Array;
const method = 'listAutopilotSessions';
const type = 'autopilot';
const unimplementedCode = grpc.status.UNIMPLEMENTED;

export type GetAutopilotSessionsArgs = AuthenticatedLitdArgs;

export type GetAutopilotSessionsResult = {
  sessions: Session[];
};

type Tasks = {
  getAutopilotSessions: GetAutopilotSessionsResult;
  validate: undefined;
};

/** Get all Autopilot sessions

  Requires `autopilot:read` permission

  {
    litd: <Authenticated litd API Object>
  }

  @returns via cbk or Promise
  {
    sessions: [{
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
    }]
  }
*/
const getAutopilotSessions: LitdMethod<
  GetAutopilotSessionsArgs,
  GetAutopilotSessionsResult
> = (
  args: GetAutopilotSessionsArgs,
  cbk?: LitdCallback<GetAutopilotSessionsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([
              400,
              'ExpectedAuthenticatedLitdToGetAutopilotSessions',
            ]);
          }

          return cbk();
        },

        // Get the sessions
        getAutopilotSessions: [
          'validate',
          ({}, cbk) => {
            return args.litd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([
                  503,
                  'FailedToConnectToLitdToGetAutopilotSessions',
                ]);
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
                  'UnexpectedErrorGettingAutopilotSessions',
                  {err},
                ]);
              }

              if (!res || !isArray(res.sessions)) {
                return cbk([503, 'ExpectedArrayOfSessionsInAutopilotSessions']);
              }

              try {
                return cbk(null, {
                  sessions: res.sessions.map(rpcSessionAsSession),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getAutopilotSessions'}, cbk),
    );
  });
};

export default getAutopilotSessions;
