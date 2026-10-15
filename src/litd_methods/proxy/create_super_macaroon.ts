import {randomBytes} from 'node:crypto';

import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const hexAsBase64 = (n: string) => Buffer.from(n, 'hex').toString('base64');
const isHex = (n: string) => !(n.length % 2) && /^[0-9A-F]+$/i.test(n);
const isSuffix = (n: string) => /^[0-9A-F]{8}$/i.test(n);
const method = 'bakeSuperMacaroon';
const notReadyError = 'waiting for the RPC server to start';
const suffixByteLength = 4;
const type = 'default';

export type CreateSuperMacaroonArgs = AuthenticatedLitdArgs<{
  /** Macaroon Only Has Read Permissions */
  is_read_only?: boolean;
  /** Root Key Id Suffix 4 Byte Hex String */
  root_key_id_suffix?: string;
}>;

export type CreateSuperMacaroonResult = {
  /** Super Macaroon Base64 */
  macaroon: string;
};

type Tasks = {
  create: CreateSuperMacaroonResult;
  validate: undefined;
};

/** Create a super macaroon

  A super macaroon has the permissions of each daemon that litd runs

  Requires `supermacaroon:write` permission

  A random root key id suffix is used when there is no `root_key_id_suffix`

  {
    [is_read_only]: <Macaroon Only Has Read Permissions Bool>
    litd: <Authenticated litd API Object>
    [root_key_id_suffix]: <Root Key Id Suffix 4 Byte Hex String>
  }

  @returns via cbk or Promise
  {
    macaroon: <Super Macaroon Base64 String>
  }
*/
const createSuperMacaroon: LitdMethod<
  CreateSuperMacaroonArgs,
  CreateSuperMacaroonResult
> = (
  args: CreateSuperMacaroonArgs,
  cbk?: LitdCallback<CreateSuperMacaroonResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([400, 'ExpectedAuthenticatedLitdToCreateSuperMacaroon']);
          }

          const suffix = args.root_key_id_suffix;

          if (suffix !== undefined && !isSuffix(suffix)) {
            return cbk([400, 'ExpectedFourByteHexRootKeyIdSuffix']);
          }

          return cbk();
        },

        // Create the super macaroon
        create: [
          'validate',
          ({}, cbk) => {
            const suffix = !!args.root_key_id_suffix
              ? Buffer.from(args.root_key_id_suffix, 'hex')
              : randomBytes(suffixByteLength);

            const request = {
              read_only: !!args.is_read_only,
              root_key_id_suffix: suffix.readUInt32BE(),
            };

            return args.litd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToLitdToCreateSuperMacaroon']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCreateSuperMacaroon']);
              }

              if (!!err && String(err.details).includes(notReadyError)) {
                return cbk([503, 'LitdIsNotReadyToCreateSuperMacaroon']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorCreatingSuperMacaroon',
                  {err},
                ]);
              }

              if (!res || !res.macaroon || !isHex(res.macaroon)) {
                return cbk([503, 'ExpectedHexMacaroonInSuperMacaroonResponse']);
              }

              return cbk(null, {macaroon: hexAsBase64(res.macaroon)});
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'create'}, cbk),
    );
  });
};

export default createSuperMacaroon;
