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
import {unauthenticatedServiceTypes} from '../grpc/index.js';
import apiForProto from './api_for_proto.js';
import grpcSsl from './grpc_ssl.js';
import type {LitdConnection} from './types.js';
import type {UnauthenticatedLitd} from './types.js';

const defaultProtosPath = fileURLToPath(new URL(protosDir, import.meta.url));
const {GRPC_SSL_CIPHER_SUITES} = process.env;
const {keys} = Object;

/** Unauthenticated gRPC interface to the Lightning Terminal daemon (litd)

  litd lets the status service run without a macaroon

  Make sure to provide a cert when litd uses its default self-signed cert

  {
    [cert]: <Base64 or Hex Serialized litd TLS Cert String>
    [path]: <Path to Protos Directory With litrpc and proto Directories String>
    [socket]: <Host:Port Network Address String>
  }

  @throws
  <Error>

  @returns
  {
    litd: {
      status: <Status API Methods Object>
    }
  }
*/
export default (args: LitdConnection): {litd: UnauthenticatedLitd} => {
  const credentials = grpcSsl({cert: args.cert}).ssl;
  const protosPath = args.path || defaultProtosPath;

  if (!!args.cert && GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    process.env.GRPC_SSL_CIPHER_SUITES = grpcSslCipherSuites;
  }

  const includes = includeDirs.map(dir => join(protosPath, dir));

  const params = {
    'grpc.keepalive_time_ms': keepaliveTimeMs,
    'grpc.keepalive_timeout_ms': keepaliveTimeoutMs,
  };

  const types = keys(unauthenticatedServiceTypes) as 'status'[];

  // Assemble different services from their proto files
  return {
    litd: types.reduce((services, type) => {
      const service = unauthenticatedServiceTypes[type];

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
    }, {} as UnauthenticatedLitd),
  };
};
