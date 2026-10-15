import grpc from '@grpc/grpc-js';
import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../litd_requests/index.js';
import {isLitd} from '../../litd_requests/index.js';
import {isPermissionDenied} from '../../litd_requests/index.js';
import {rpcFeatureAsFeature} from '../../litd_responses/index.js';
import type {Feature} from '../../litd_responses/index.js';
import type {AuthenticatedLitdArgs} from '../../typescript/index.js';
import type {LitdCallback} from '../../typescript/index.js';
import type {LitdError} from '../../typescript/index.js';
import type {LitdMethod} from '../../typescript/index.js';

const method = 'listAutopilotFeatures';
const type = 'autopilot';
const {values} = Object;
const unimplementedCode = grpc.status.UNIMPLEMENTED;

export type GetAutopilotFeaturesArgs = AuthenticatedLitdArgs;

export type GetAutopilotFeaturesResult = {
  features: Feature[];
};

type Tasks = {
  getFeatures: GetAutopilotFeaturesResult;
  validate: undefined;
};

/** Get the features that the Autopilot server offers

  Requires `autopilot:read` permission

  {
    litd: <Authenticated litd API Object>
  }

  @returns via cbk or Promise
  {
    features: [{
      [default_config]: <Default Configuration JSON String>
      description: <Feature Description String>
      is_upgrade_required: <litd Must Upgrade to Use the Feature Bool>
      name: <Feature Name String>
      permissions: [{
        method: <RPC Method URI String>
        operations: [{
          action: <Permission Action String>
          entity: <Permission Entity String>
        }]
      }]
      privacy_flags: [<Privacy Flag Type String>]
      rules: [{
        [defaults]: <Recommended Rule Value Object>
        is_known: <litd Knows the Rule Bool>
        [max_value]: <Maximum Rule Value Object>
        [min_value]: <Minimum Rule Value Object>
        name: <Rule Name String>
      }]
    }]
  }
*/
const getAutopilotFeatures: LitdMethod<
  GetAutopilotFeaturesArgs,
  GetAutopilotFeaturesResult
> = (
  args: GetAutopilotFeaturesArgs,
  cbk?: LitdCallback<GetAutopilotFeaturesResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, LitdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLitd({method, type, litd: args.litd})) {
            return cbk([
              400,
              'ExpectedAuthenticatedLitdToGetAutopilotFeatures',
            ]);
          }

          return cbk();
        },

        // Get the features
        getFeatures: [
          'validate',
          ({}, cbk) => {
            return args.litd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([
                  503,
                  'FailedToConnectToLitdToGetAutopilotFeatures',
                ]);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAutopilotFeatures']);
              }

              if (err?.code === unimplementedCode) {
                return cbk([501, 'AutopilotIsNotEnabledInLitd']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorGettingAutopilotFeatures',
                  {err},
                ]);
              }

              if (!res || !res.features) {
                return cbk([503, 'ExpectedFeaturesInAutopilotFeatures']);
              }

              try {
                const features = values(res.features as object)
                  .map(rpcFeatureAsFeature)
                  .sort((a, b) => a.name.localeCompare(b.name));

                return cbk(null, {features});
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getFeatures'}, cbk),
    );
  });
};

export default getAutopilotFeatures;
