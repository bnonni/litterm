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
