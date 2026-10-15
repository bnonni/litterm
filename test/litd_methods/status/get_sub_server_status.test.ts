import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getSubServerStatus} from '../../../src/index.js';
import type {UnauthenticatedLitd} from '../../../src/index.js';

const litdWith = (subServerStatus: (req: any, cbk: Function) => void) => {
  return {status: {subServerStatus}} as unknown as UnauthenticatedLitd;
};

const subServers = {
  taproot_assets: {
    custom_status: '',
    disabled: false,
    error: 'failed to start',
    running: false,
  },
  lnd: {custom_status: 'synced', disabled: false, error: '', running: true},
  loop: {custom_status: '', disabled: true, error: '', running: false},
};

const tests = [
  {
    args: {litd: {} as UnauthenticatedLitd},
    description: 'A litd is expected',
    error: [400, 'ExpectedLitdToGetSubServerStatus'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLitdToGetSubServerStatus'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetSubServerStatus'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingSubServerStatus', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'Sub-servers are expected',
    error: [503, 'ExpectedSubServersInSubServerStatus'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk(null, {sub_servers: subServers})),
    },
    description: 'Sub-server status is returned, sorted by name',
    expected: {
      sub_servers: [
        {
          error: undefined,
          is_disabled: false,
          is_running: true,
          name: 'lnd',
          status: 'synced',
        },
        {
          error: undefined,
          is_disabled: true,
          is_running: false,
          name: 'loop',
          status: undefined,
        },
        {
          error: 'failed to start',
          is_disabled: false,
          is_running: false,
          name: 'taproot_assets',
          status: undefined,
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getSubServerStatus(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getSubServerStatus(args), expected, 'Got status');
    }

    return;
  });
});
