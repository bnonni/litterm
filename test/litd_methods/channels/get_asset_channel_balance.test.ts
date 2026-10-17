import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetChannelBalance} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';
import {assetBalanceJson} from '../../fixtures/lnd_responses.js';
import {overTheWireLnd} from '../../fixtures/lnd_responses.js';

const assetId = '01'.repeat(32);

const litdWith = (channelBalance: (req: any, cbk: Function) => void) => {
  return {lnd: {default: {channelBalance}}} as unknown as AuthenticatedLitd;
};

const response = (data: Buffer) => {
  return overTheWireLnd('ChannelBalance', {
    balance: '50000',
    custom_channel_data: data,
    pending_open_balance: '0',
  });
};

const litd = litdWith((_, cbk) => {
  return cbk(null, response(Buffer.from(assetBalanceJson)));
});

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'A litd with lnd is expected',
    error: [400, 'ExpectedLndInLitdToGetAssetChannelBalance'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLndToGetAssetChannelBalance'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetChannelBalance'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetChannelBalance', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedChannelBalanceResponse'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk(null, response(Buffer.from([1, 2])))),
    },
    description: 'Balance data that is not JSON is returned as an error',
    error: [503, 'ExpectedJsonCustomChannelData'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk(
          null,
          response(Buffer.from('{"open_channels":{"aa":{"local_balance":1}}}')),
        );
      }),
    },
    description: 'A balance without a remote balance is an error',
    error: [503, 'ExpectedRemoteAssetBalanceInChannelBalanceData'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, response(Buffer.alloc(0))))},
    description: 'No asset balances are returned without asset channels',
    expected: {assets: [], groups: [], pending_assets: [], pending_groups: []},
  },
  {
    args: {litd},
    description: 'Asset balances are returned',
    expected: {
      assets: [
        {
          asset_id: assetId,
          local_balance: '18446744073709551000',
          name: 'coin',
          remote_balance: '615',
        },
        {
          asset_id: '0b'.repeat(32),
          local_balance: '2',
          name: 'b',
          remote_balance: '3',
        },
      ],
      groups: [
        {
          group_key: `02${'05'.repeat(32)}`,
          local_balance: '18446744073709551000',
          remote_balance: '615',
        },
      ],
      pending_assets: [
        {
          asset_id: assetId,
          local_balance: '100',
          name: 'coin',
          remote_balance: '0',
        },
      ],
      pending_groups: [],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAssetChannelBalance(args), error, 'Got expected error');
    } else {
      deepStrictEqual(
        await getAssetChannelBalance(args),
        expected,
        'Got balance',
      );
    }

    return;
  });
});
