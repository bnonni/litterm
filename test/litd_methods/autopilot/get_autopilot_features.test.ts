import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAutopilotFeatures} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';

const rpcFeature = (name: string) => ({
  default_config: '',
  description: 'description',
  name,
  permissions_list: [],
  privacy_flags: '0',
  requires_upgrade: true,
  rules: {},
});

const feature = (name: string) => ({
  default_config: undefined,
  description: 'description',
  is_upgrade_required: true,
  name,
  permissions: [],
  privacy_flags: [],
  rules: [],
});

const litdWith = (listAutopilotFeatures: (req: any, cbk: Function) => void) => {
  return {autopilot: {listAutopilotFeatures}} as unknown as AuthenticatedLitd;
};

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'An authenticated litd is expected',
    error: [400, 'ExpectedAuthenticatedLitdToGetAutopilotFeatures'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetAutopilotFeatures'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAutopilotFeatures'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 12, details: 'unknown service'})),
    },
    description: 'A litd without autopilot is returned as not enabled',
    error: [501, 'AutopilotIsNotEnabledInLitd'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAutopilotFeatures', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'Features are expected',
    error: [503, 'ExpectedFeaturesInAutopilotFeatures'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {features: {a: {}}}))},
    description: 'Valid features are expected',
    error: [503, 'ExpectedNameInRpcAutopilotFeatureDetails'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk(null, {
          features: {
            'auto-open': rpcFeature('auto-open'),
            'auto-fees': rpcFeature('auto-fees'),
          },
        });
      }),
    },
    description: 'Features are returned, sorted by name',
    expected: {features: [feature('auto-fees'), feature('auto-open')]},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAutopilotFeatures(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAutopilotFeatures(args), expected, 'Got list');
    }

    return;
  });
});
