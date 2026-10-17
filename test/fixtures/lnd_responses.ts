import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import grpcOptions from '../../src/litd_grpc/grpc_options.js';

const lightningProtos = fileURLToPath(
  new URL('../../node_modules/lightning/grpc/protos/', import.meta.url),
);
const litdProtos = fileURLToPath(new URL('../../protos/', import.meta.url));

const accountsDefinition = loadSync(
  join(litdProtos, 'litrpc/lit-accounts.proto'),
  {...grpcOptions, includeDirs: [join(litdProtos, 'litrpc'), litdProtos]},
);

const lndDefinition = loadSync(join(lightningProtos, 'lightning.proto'), {
  ...grpcOptions,
  includeDirs: [lightningProtos],
});

const accounts = (grpc.loadPackageDefinition(accountsDefinition) as any).litrpc
  .Accounts.service;

const lightning = (grpc.loadPackageDefinition(lndDefinition) as any).lnrpc
  .Lightning.service;

type Rpc = {
  responseDeserialize: (n: Buffer) => any;
  responseSerialize: (n: object) => Buffer;
};

const trip = (rpc: Rpc, response: object) => {
  return rpc.responseDeserialize(rpc.responseSerialize(response));
};

/** Response the way the client reads it, after a trip through the protos

  <Accounts RPC Name String>
  <Response Object>
*/
export const overTheWireAccounts = (rpc: string, response: object) => {
  return trip(accounts[rpc], response);
};

/** Response the way lightning reads it, after a trip through the protos

  <Lightning RPC Name String>
  <Response Object>
*/
export const overTheWireLnd = (rpc: string, response: object) => {
  return trip(lightning[rpc], response);
};

const destination = `03${'cc'.repeat(32)}`;
const preimage = Buffer.alloc(32, 8);

/** lnd payment in a state, before the trip through the protos

  {
    hash: <Payment Hash Hex String>
    status: <Payment Status String> // SUCCEEDED, FAILED, IN_FLIGHT
  }
*/
export const makeLndPayment = (args: {hash: string; status: string}) => {
  const {status} = args;

  return {
    creation_date: '1700000000',
    creation_time_ns: '1700000000000000000',
    failure_reason:
      status === 'FAILED' ? 'FAILURE_REASON_NO_ROUTE' : 'FAILURE_REASON_NONE',
    fee_msat: '1000',
    fee_sat: '1',
    htlcs: [
      {
        attempt_id: '1',
        attempt_time_ns: '1700000000100000000',
        preimage: status === 'SUCCEEDED' ? preimage : Buffer.alloc(0),
        resolve_time_ns: status === 'IN_FLIGHT' ? '0' : '1700000000200000000',
        route: {
          hops: [
            {
              amt_to_forward_msat: '5000000',
              chan_capacity: '100000',
              chan_id: '879609302319104001',
              custom_records: {},
              expiry: 500,
              fee_msat: '0',
              mpp_record: {
                payment_addr: Buffer.alloc(32, 9),
                total_amt_msat: '5000000',
              },
              pub_key: destination,
              tlv_payload: true,
            },
          ],
          total_amt: '5001',
          total_amt_msat: '5001000',
          total_fees: '1',
          total_fees_msat: '1000',
          total_time_lock: 500,
        },
        status,
      },
    ],
    payment_hash: args.hash,
    payment_index: '3',
    payment_preimage:
      status === 'SUCCEEDED'
        ? preimage.toString('hex')
        : Buffer.alloc(32).toString('hex'),
    payment_request: '',
    status,
    value_msat: '5000000',
    value_sat: '5000',
  };
};

/** Placeholder payment that litd returns when lnd does not know the payment

  {
    hash: <Payment Hash Hex String>
  }
*/
export const makeMissingPayment = ({hash}: {hash: string}) => {
  return {
    failure_reason: 'FAILURE_REASON_NONE',
    payment_hash: hash,
    status: 'UNKNOWN',
  };
};

const assetId = '01'.repeat(32);
const genesisPoint = `${'02'.repeat(32)}:1`;
const scriptKey = `02${'03'.repeat(32)}`;

/** tapd JSON custom channel data of a channel, the way lnd returns it

  The keys have the order of the tapd JsonAssetChannel struct
*/
export const assetChannelJson = [
  '{"funding_assets":[{"version":1,"asset_genesis":{',
  `"genesis_point":"${genesisPoint}","name":"coin",`,
  `"meta_hash":"${'04'.repeat(32)}","asset_id":"${assetId}"},`,
  `"amount":18446744073709551615,"script_key":"${scriptKey}",`,
  '"decimal_display":2}],',
  `"local_assets":[{"asset_id":"${assetId}","amount":18446744073709551000}],`,
  `"remote_assets":[{"asset_id":"${assetId}","amount":615}],`,
  '"outgoing_htlcs":[],"incoming_htlcs":[],',
  '"capacity":18446744073709551615,',
  `"group_key":"02${'05'.repeat(32)}",`,
  '"local_balance":18446744073709551000,"remote_balance":615,',
  '"outgoing_htlc_balance":0,"incoming_htlc_balance":0,',
  '"spender_leaves":true}',
].join('');

/** tapd JSON custom channel data of a channel balance, the way lnd returns it

  The keys have the order of the tapd JsonAssetChannelBalances struct
*/
export const assetBalanceJson = [
  '{"open_channels":{',
  `"${'0b'.repeat(32)}":{"asset_id":"${'0b'.repeat(32)}","name":"b",`,
  '"local_balance":2,"remote_balance":3},',
  `"${assetId}":{"asset_id":"${assetId}","name":"coin",`,
  '"local_balance":18446744073709551000,"remote_balance":615}},',
  `"open_channels_by_group":{"02${'05'.repeat(32)}":{`,
  '"local_balance":18446744073709551000,"remote_balance":615}},',
  `"pending_channels":{"${assetId}":{"asset_id":"${assetId}","name":"coin",`,
  '"local_balance":100,"remote_balance":0}},',
  '"pending_channels_by_group":{}}',
].join('');

const constraints = {
  chan_reserve_sat: '1000',
  csv_delay: 144,
  dust_limit_sat: '354',
  max_accepted_htlcs: 483,
  max_pending_amt_msat: '99000000',
  min_htlc_msat: '1',
};

/** lnd channel, before the trip through the protos

  {
    [custom_channel_data]: <Custom Channel Data Buffer Object>
    [remote_pubkey]: <Peer Public Key Hex String>
  }
*/
export const makeLndChannel = (overrides?: object) => {
  return {
    active: true,
    capacity: '100000',
    chan_id: '879609302319104001',
    channel_point: `${'06'.repeat(32)}:0`,
    commit_fee: '2000',
    commit_weight: '1100',
    commitment_type: 'SIMPLE_TAPROOT_OVERLAY',
    custom_channel_data: Buffer.from(assetChannelJson),
    fee_per_kw: '2500',
    local_balance: '50000',
    local_chan_reserve_sat: '1000',
    local_constraints: constraints,
    num_updates: '2',
    remote_balance: '48000',
    remote_chan_reserve_sat: '1000',
    remote_constraints: constraints,
    remote_pubkey: `03${'07'.repeat(32)}`,
    total_satoshis_received: '0',
    total_satoshis_sent: '0',
    ...overrides,
  };
};
