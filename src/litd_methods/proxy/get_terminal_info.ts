import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const method = 'getInfo';
const notReadyError = 'waiting for the RPC server to start';
const type = 'default';

export type GetTerminalInfoArgs = AuthenticatedLitdArgs;

export type GetTerminalInfoResult = {
  /** Build Commit Hash */
  commit_hash: string;
  /** litd Version */
  version: string;
};

type Tasks = {
  getInfo: GetTerminalInfoResult;
  validate: undefined;
};

/** Get the version of litd

  Requires `proxy:read` permission

  {
    litd: <Authenticated litd API Object>
  }

  @returns via cbk or Promise
  {
    commit_hash: <Build Commit Hash String>
    version: <litd Version String>
  }
*/
const getTerminalInfo: LitdMethod<
  GetTerminalInfoArgs,
  GetTerminalInfoResult
> = (args: GetTerminalInfoArgs, cbk?: LitdCallback<GetTerminalInfoResult>) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToGetTerminalInfo']);
          }

          return cbk();
        },

        // Get the info
        getInfo: [
          'validate',
          ({}, cbk) => {
            return args.litd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToGetTerminalInfo']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetTerminalInfo']);
              }

              if (!!err && String(err.details).includes(notReadyError)) {
                return cbk([503, 'LitdIsNotReadyToGetTerminalInfo']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingTerminalInfo', {err}]);
              }

              if (!res || !res.version) {
                return cbk([503, 'ExpectedVersionInTerminalInfoResponse']);
              }

              return cbk(null, {
                commit_hash: res.commit_hash,
                version: res.version,
              });
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getInfo'}, cbk),
    );
  });
};

export default getTerminalInfo;
