import grpc from '@grpc/grpc-js';
import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {sessionRpcError} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const method = 'revokeAutopilotSession';
const type = 'autopilot';
const unimplementedCode = grpc.status.UNIMPLEMENTED;

export type RevokeAutopilotSessionArgs = AuthenticatedLitdArgs<{
  /** Session Local Static Public Key Hex String */
  public_key: string;
}>;

type Tasks = {
  revoke: undefined;
  validate: undefined;
};

/** Revoke an Autopilot session

  litd also stops the session if it is active

  The session must be an Autopilot session. Use revokeSession for other
  sessions.

  Requires `autopilot:write` permission

  {
    litd: <Authenticated litd API Object>
    public_key: <Session Local Static Public Key Hex String>
  }

  @returns via cbk or Promise
*/
const revokeAutopilotSession: LitdMethod<RevokeAutopilotSessionArgs, void> = (
  args: RevokeAutopilotSessionArgs,
  cbk?: LitdCallback<void>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([
              400,
              'ExpectedAuthenticatedLitdToRevokeAutopilotSession',
            ]);
          }

          if (!args.public_key || !isPublicKey(args.public_key)) {
            return cbk([
              400,
              'ExpectedSessionPublicKeyToRevokeAutopilotSession',
            ]);
          }

          return cbk();
        },

        // Revoke the session
        revoke: [
          'validate',
          ({}, cbk) => {
            const request = {
              local_public_key: Buffer.from(args.public_key, 'hex'),
            };

            return args.litd[type][method](request, (err: any) => {
              if (isConnectionFailure({err})) {
                return cbk([
                  503,
                  'FailedToConnectToLitdToRevokeAutopilotSession',
                ]);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToRevokeAutopilotSession']);
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
                  'UnexpectedErrorRevokingAutopilotSession',
                  {err},
                ]);
              }

              return cbk();
            });
          },
        ],
      },
      returnResult({reject, resolve}, cbk),
    );
  });
};

export default revokeAutopilotSession;
