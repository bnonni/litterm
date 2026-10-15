import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {defaultSocket} from '../grpc/index.js';
import {grpcSslCipherSuites} from '../grpc/index.js';
import {includeDirs} from '../grpc/index.js';
import {keepaliveTimeMs} from '../grpc/index.js';
import {keepaliveTimeoutMs} from '../grpc/index.js';
import {packageTypes} from '../grpc/index.js';
import {protoFiles} from '../grpc/index.js';
import {protosDir} from '../grpc/index.js';
import {serviceTypes} from '../grpc/index.js';
import apiForProto from './api_for_proto.js';
import grpcCredentials from './grpc_credentials.js';
import type {AuthenticatedLitd} from './types.js';
import type {LitdAuthentication} from './types.js';
import type {LitdServiceType} from './types.js';

const defaultProtosPath = fileURLToPath(new URL(protosDir, import.meta.url));
const {GRPC_SSL_CIPHER_SUITES} = process.env;
const {keys} = Object;

/** Initiate a gRPC API Methods Object for authenticated methods

  Both the cert and macaroon expect the entire serialized litd generated file

  Methods that use lnd or tapd get them from `litd.lnd` and `litd.tapd`

  {
    [cert]: <Base64 or Hex Serialized litd TLS Cert String>
    [lnd]: <Authenticated lnd API Object>
    [macaroon]: <Base64 or Hex Serialized Macaroon String>
    [path]: <Path to Protos Directory With litrpc and proto Directories String>
    [socket]: <Host:Port Network Address String>
    [tapd]: <Authenticated tapd API Object>
  }

  @throws
  <Error>

  @returns
  {
    litd: {
      accounts: <Accounts API Methods Object>
      autopilot: <Autopilot API Methods Object>
      default: <Proxy API Methods Object>
      firewall: <Firewall API Methods Object>
      [lnd]: <Authenticated lnd API Object>
      sessions: <Sessions API Methods Object>
      status: <Status API Methods Object>
      [tapd]: <Authenticated tapd API Object>
    }
  }
*/
export default (args: LitdAuthentication): {litd: AuthenticatedLitd} => {
  const {credentials} = grpcCredentials(args);
  const protosPath = args.path || defaultProtosPath;

  if (!!args.cert && GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    process.env.GRPC_SSL_CIPHER_SUITES = grpcSslCipherSuites;
  }

  const includes = includeDirs.map(dir => join(protosPath, dir));

  const params = {
    'grpc.keepalive_time_ms': keepaliveTimeMs,
    'grpc.keepalive_timeout_ms': keepaliveTimeoutMs,
    'grpc.max_receive_message_length': -1,
    'grpc.max_send_message_length': -1,
  };

  const types = keys(serviceTypes) as LitdServiceType[];

  // Assemble different services from their proto files
  const litd = types.reduce((services, type) => {
    const service = serviceTypes[type];

    services[type] = apiForProto({
      credentials,
      includes,
      params,
      service,
      path: join(protosPath, protoFiles[service]),
      socket: args.socket || defaultSocket,
      type: packageTypes[service],
    });

    return services;
  }, {} as AuthenticatedLitd);

  // Add the daemons that methods with more than one daemon use
  if (!!args.lnd) {
    litd.lnd = args.lnd;
  }

  if (!!args.tapd) {
    litd.tapd = args.tapd;
  }

  return {litd};
};
