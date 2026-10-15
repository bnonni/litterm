import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const isId = (n: string) => /^[0-9A-F]{8}$/i.test(n);
const method = 'privacyMapConversion';
const notFoundError = 'no such key found';
const type = 'firewall';
const unknownGroupError = 'unknown group';

export type GetPrivacyMapValueArgs = AuthenticatedLitdArgs<{
  /** Session Group Id Hex String */
  group_id: string;
  /** Real or Pseudo Value String */
  input: string;
  /** Input Is a Real Value */
  is_real_to_pseudo?: boolean;
}>;

export type GetPrivacyMapValueResult = {
  /** Pseudo or Real Value */
  output: string;
};

type Tasks = {
  getValue: GetPrivacyMapValueResult;
  validate: undefined;
};

/** Get the real value of a pseudo value in a privacy map, or the reverse

  By default the input is a pseudo value and the output is the real value

  Requires `privacymap:read` permission

  {
    group_id: <Session Group Id Hex String>
    input: <Real or Pseudo Value String>
    [is_real_to_pseudo]: <Input Is a Real Value Bool>
    litd: <Authenticated litd API Object>
  }

  @returns via cbk or Promise
  {
    output: <Pseudo or Real Value String>
  }
*/
const getPrivacyMapValue: LitdMethod<
  GetPrivacyMapValueArgs,
  GetPrivacyMapValueResult
> = (
  args: GetPrivacyMapValueArgs,
  cbk?: LitdCallback<GetPrivacyMapValueResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.group_id || !isId(args.group_id)) {
            return cbk([400, 'ExpectedFourByteHexGroupIdToGetPrivacyMapValue']);
          }

          if (!args.input) {
            return cbk([400, 'ExpectedInputToGetPrivacyMapValue']);
          }

          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToGetPrivacyMapValue']);
          }

          return cbk();
        },

        // Get the value
        getValue: [
          'validate',
          ({}, cbk) => {
            const request = {
              group_id: Buffer.from(args.group_id, 'hex'),
              input: args.input,
              real_to_pseudo: !!args.is_real_to_pseudo,
            };

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToGetPrivacyMapValue']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetPrivacyMapValue']);
              }

              if (!!err && String(err.details).includes(unknownGroupError)) {
                return cbk([404, 'SessionGroupNotFound']);
              }

              if (!!err && String(err.details).includes(notFoundError)) {
                return cbk([404, 'PrivacyMapValueNotFound']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorGettingPrivacyMapValue',
                  {err},
                ]);
              }

              if (!res || !res.output) {
                return cbk([503, 'ExpectedOutputInPrivacyMapResponse']);
              }

              return cbk(null, {output: res.output});
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getValue'}, cbk),
    );
  });
};

export default getPrivacyMapValue;
