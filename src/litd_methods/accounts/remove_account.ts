import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {accountRpcError} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const isHex = (n: string) => !(n.length % 2) && /^[0-9A-F]+$/i.test(n);
const method = 'removeAccount';
const type = 'accounts';

export type RemoveAccountArgs = AuthenticatedLitdArgs<{
  /** Account Id Hex String */
  id?: string;
  /** Account Label String */
  label?: string;
}>;

type Tasks = {
  remove: undefined;
  validate: undefined;
};

/** Remove an account

  Requires `account:write` permission

  An `id` or a `label` is required, not both

  {
    [id]: <Account Id Hex String>
    [label]: <Account Label String>
    litd: <Authenticated litd API Object>
  }

  @returns via cbk or Promise
*/
const removeAccount: LitdMethod<RemoveAccountArgs, void> = (
  args: RemoveAccountArgs,
  cbk?: LitdCallback<void>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.id && !args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelToRemoveAccount']);
          }

          if (!!args.id && !!args.label) {
            return cbk([400, 'ExpectedAccountIdOrLabelNotBothToRemoveAccount']);
          }

          if (!!args.id && !isHex(args.id)) {
            return cbk([400, 'ExpectedHexAccountIdToRemoveAccount']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToRemoveAccount']);
          }

          return cbk();
        },

        // Remove the account
        remove: [
          'validate',
          ({}, cbk) => {
            const request = {id: args.id || '', label: args.label || ''};

            return args.litd[type][method](request, (err: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToRemoveAccount']);
              }

              const knownError = accountRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorRemovingAccount', {err}]);
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

export default removeAccount;
