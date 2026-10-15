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
const method = 'revokeSession';
const type = 'sessions';

export type RevokeSessionArgs = AuthenticatedLitdArgs<{
  /** Session Local Static Public Key Hex String */
  public_key: string;
}>;

type Tasks = {
  revoke: undefined;
  validate: undefined;
};

/** Revoke a Lightning Node Connect session

  litd also stops the session if it is active

  Requires `sessions:write` permission

  {
    litd: <Authenticated litd API Object>
    public_key: <Session Local Static Public Key Hex String>
  }

  @returns via cbk or Promise
*/
const revokeSession: LitdMethod<RevokeSessionArgs, void> = (
  args: RevokeSessionArgs,
  cbk?: LitdCallback<void>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToRevokeSession']);
          }

          if (!args.public_key || !isPublicKey(args.public_key)) {
            return cbk([400, 'ExpectedSessionPublicKeyToRevokeSession']);
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
                return cbk([503, 'FailedToConnectToLitdToRevokeSession']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToRevokeSession']);
              }

              const knownError = sessionRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorRevokingSession', {err}]);
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

export default revokeSession;
