import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcFeatureAsFeature} from '../../src/litd_responses/index.js';

const makeFeature = (overrides?: object): any => ({
  default_config: '{"target":0.5}',
  description: 'Manage channel fees',
  name: 'auto-fees',
  permissions_list: [
    {
      method: '/lnrpc.Lightning/UpdateChannelPolicy',
      operations: [{action: 'write', entity: 'offchain'}],
    },
  ],
  privacy_flags: '4',
  requires_upgrade: false,
  rules: {
    'rate-limit': {
      defaults: {
        value: 'rate_limit',
        rate_limit: {
          read_limit: {iterations: 10, num_hours: 1},
          write_limit: {iterations: 1, num_hours: 1},
        },
      },
      known: true,
      max_value: null,
      min_value: null,
    },
    'new-rule': {
      defaults: null,
      known: false,
      max_value: null,
      min_value: null,
    },
  },
  ...overrides,
});

const tests = [
  {
    args: undefined,
    description: 'Feature details are expected',
    error: 'ExpectedRpcAutopilotFeatureDetails',
  },
  {
    args: makeFeature({name: ''}),
    description: 'A feature name is expected',
    error: 'ExpectedNameInRpcAutopilotFeatureDetails',
  },
  {
    args: makeFeature({permissions_list: null}),
    description: 'Permissions are expected',
    error: 'ExpectedPermissionsInRpcAutopilotFeatureDetails',
  },
  {
    args: makeFeature(),
    description: 'A feature is mapped',
    expected: {
      default_config: '{"target":0.5}',
      description: 'Manage channel fees',
      is_upgrade_required: false,
      name: 'auto-fees',
      permissions: [
        {
          method: '/lnrpc.Lightning/UpdateChannelPolicy',
          operations: [{action: 'write', entity: 'offchain'}],
        },
      ],
      privacy_flags: ['clear_channel_ids'],
      rules: [
        {
          defaults: undefined,
          is_known: false,
          max_value: undefined,
          min_value: undefined,
          name: 'new-rule',
        },
        {
          defaults: {
            rate_limit: {
              read_limit: {hours: 1, iterations: 10},
              write_limit: {hours: 1, iterations: 1},
            },
          },
          is_known: true,
          max_value: undefined,
          min_value: undefined,
          name: 'rate-limit',
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcFeatureAsFeature(args), new Error(error), 'Got error');
    } else {
      deepStrictEqual(rpcFeatureAsFeature(args), expected, 'Got feature');
    }

    return;
  });
});
