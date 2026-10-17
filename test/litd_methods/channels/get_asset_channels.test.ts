import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetChannels} from '../../../src/index.js';
import type {AuthenticatedLitd} from '../../../src/index.js';
import {makeLndChannel} from '../../fixtures/lnd_responses.js';
import {overTheWireLnd} from '../../fixtures/lnd_responses.js';

const assetId = '01'.repeat(32);
const partner = `03${'07'.repeat(32)}`;

const litdWith = (listChannels: (req: any, cbk: Function) => void) => {
  return {lnd: {default: {listChannels}}} as unknown as AuthenticatedLitd;
};

const response = overTheWireLnd('ListChannels', {
  channels: [
    makeLndChannel(),
    makeLndChannel({
      chan_id: '879609302319104002',
      commitment_type: 'ANCHORS',
      custom_channel_data: Buffer.alloc(0),
    }),
  ],
});

const litd = litdWith((_, cbk) => cbk(null, response));

const asset = {
  capacity: '18446744073709551615',
  funding: [
    {
      amount: '18446744073709551615',
      asset_id: assetId,
      decimal_display: 2,
      genesis_transaction_id: '02'.repeat(32),
      genesis_transaction_vout: 1,
      meta_hash: '04'.repeat(32),
      name: 'coin',
      script_key: `02${'03'.repeat(32)}`,
      version: 1,
    },
  ],
  group_key: `02${'05'.repeat(32)}`,
  has_spender_leaves: true,
  incoming_htlc_balance: '0',
  incoming_htlcs: [],
  local_assets: [{amount: '18446744073709551000', asset_id: assetId}],
  local_balance: '18446744073709551000',
  outgoing_htlc_balance: '0',
  outgoing_htlcs: [],
  remote_assets: [{amount: '615', asset_id: assetId}],
  remote_balance: '615',
};

const tests = [
  {
    args: {litd: {} as AuthenticatedLitd},
    description: 'A litd with lnd is expected',
    error: [400, 'ExpectedLndInLitdToGetAssetChannels'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToLndToGetAssetChannels'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetChannels'],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetChannels', {err: 'err'}],
  },
  {
    args: {litd: litdWith((_, cbk) => cbk(null, {}))},
    description: 'A channels array is expected',
    error: [503, 'ExpectedChannelsInListChannelsResponse'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk(null, {
          channels: [{...response.channels[0], channel_point: undefined}],
        });
      }),
    },
    description: 'A channel that does not map is returned as an error',
    error: [503, 'ExpectedChannelPointInChannelMessage'],
  },
  {
    args: {
      litd: litdWith((_, cbk) => {
        return cbk(null, {
          channels: [
            {...response.channels[0], custom_channel_data: Buffer.from([1])},
          ],
        });
      }),
    },
    description: 'Asset channel data that is not JSON is returned as an error',
    error: [503, 'ExpectedJsonCustomChannelData'],
  },
  {
    args: {litd, partner_public_key: `02${'08'.repeat(32)}`},
    description: 'Channels with other partners are not returned',
    expected: {channels: []},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAssetChannels(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAssetChannels(args), expected, 'Got channels');
    }

    return;
  });
});

test('Only the channels with asset data are returned', async () => {
  const {channels} = await getAssetChannels({litd});

  equal(channels.length, 1, 'Got one asset channel');

  const [channel] = channels;

  deepStrictEqual(channel?.asset, asset, 'Got channel asset');
  equal(channel?.capacity, 100000, 'Got channel capacity');
  equal(channel?.id, '800000x1500x1', 'Got channel id');
  equal(channel?.partner_public_key, partner, 'Got channel partner');
  equal(channel?.transaction_id, '06'.repeat(32), 'Got channel transaction');
  equal(channel?.type, 'simplified_taproot_overlay', 'Got overlay type');

  return;
});

test('The request has the channel filters', async () => {
  let request: any;

  await getAssetChannels({
    is_active: true,
    is_private: true,
    litd: litdWith((req, cbk) => {
      request = req;

      return cbk(null, response);
    }),
    partner_public_key: partner,
  });

  deepStrictEqual(request, {
    active_only: true,
    inactive_only: undefined,
    peer: Buffer.from(partner, 'hex'),
    private_only: true,
    public_only: undefined,
  });

  return;
});
