import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const method = 'stopDaemon';
const type = 'default';

export type StopTerminalArgs = AuthenticatedLitdArgs;

type Tasks = {
  stop: undefined;
  validate: undefined;
};

/** Stop litd

  litd stops the daemons that it runs in integrated mode

  Requires `proxy:write` permission

  {
    litd: <Authenticated litd API Object>
  }

  @returns via cbk or Promise
*/
const stopTerminal: LitdMethod<StopTerminalArgs, void> = (
  args: StopTerminalArgs,
  cbk?: LitdCallback<void>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToStopTerminal']);
          }

          return cbk();
        },

        // Stop litd
        stop: [
          'validate',
          ({}, cbk) => {
            return args.litd[type][method]({}, (err: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToStopTerminal']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorStoppingTerminal', {err}]);
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

export default stopTerminal;
