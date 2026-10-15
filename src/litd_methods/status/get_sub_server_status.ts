import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import type {AuthenticatedLitd} from '../../litd_grpc/index.js';
import type {UnauthenticatedLitd} from '../../litd_grpc/index.js';
import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const {entries} = Object;
const method = 'subServerStatus';
const type = 'status';

export type GetSubServerStatusArgs = {
  /** Authenticated or Unauthenticated litd API Object */
  litd: AuthenticatedLitd | UnauthenticatedLitd;
};

export type GetSubServerStatusResult = {
  sub_servers: {
    /** Start Error */
    error?: string;
    /** Sub-Server Is Disabled */
    is_disabled: boolean;
    /** Sub-Server Is Running */
    is_running: boolean;
    /** Sub-Server Name */
    name: string;
    /** Custom Status */
    status?: string;
  }[];
};

type Tasks = {
  getStatus: GetSubServerStatusResult;
  validate: undefined;
};

/** Get the status of each litd sub-server

  This method does not need a macaroon

  {
    litd: <Authenticated or Unauthenticated litd API Object>
  }

  @returns via cbk or Promise
  {
    sub_servers: [{
      [error]: <Start Error String>
      is_disabled: <Sub-Server Is Disabled Bool>
      is_running: <Sub-Server Is Running Bool>
      name: <Sub-Server Name String>
      [status]: <Custom Status String>
    }]
  }
*/
const getSubServerStatus: LitdMethod<
  GetSubServerStatusArgs,
  GetSubServerStatusResult
> = (
  args: GetSubServerStatusArgs,
  cbk?: LitdCallback<GetSubServerStatusResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedLitdToGetSubServerStatus']);
          }

          return cbk();
        },

        // Get the status
        getStatus: [
          'validate',
          ({}, cbk) => {
            return args.litd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToGetSubServerStatus']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorGettingSubServerStatus',
                  {err},
                ]);
              }

              if (!res || !res.sub_servers) {
                return cbk([503, 'ExpectedSubServersInSubServerStatus']);
              }

              const subServers = entries(res.sub_servers as object)
                .map(([name, status]) => ({
                  error: status?.error || undefined,
                  is_disabled: !!status?.disabled,
                  is_running: !!status?.running,
                  name,
                  status: status?.custom_status || undefined,
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

              return cbk(null, {sub_servers: subServers});
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getStatus'}, cbk),
    );
  });
};

export default getSubServerStatus;
