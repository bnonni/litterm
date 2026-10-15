/** gRPC settings for litd

  `includeDirs` and `protoFiles` paths are relative to `protosDir`.
  `protosDir` is relative to the `litd_grpc` directory.
*/
export default {
  defaultSocket: 'localhost:8443',
  grpcSslCipherSuites:
    'HIGH+ECDSA:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-ECDSA-AES256-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384',
  includeDirs: ['litrpc', '.'],
  keepaliveTimeMs: 60000,
  keepaliveTimeoutMs: 120000,
  maxReceiveMessageLength: 924288000,
  packageTypes: {
    Accounts: 'litrpc',
    Autopilot: 'litrpc',
    Firewall: 'litrpc',
    Proxy: 'litrpc',
    Sessions: 'litrpc',
    Status: 'litrpc',
  },
  protoFiles: {
    Accounts: 'litrpc/lit-accounts.proto',
    Autopilot: 'litrpc/lit-autopilot.proto',
    Firewall: 'litrpc/firewall.proto',
    Proxy: 'litrpc/proxy.proto',
    Sessions: 'litrpc/lit-sessions.proto',
    Status: 'litrpc/lit-status.proto',
  },
  protosDir: '../../protos/',
  serviceTypes: {
    accounts: 'Accounts',
    autopilot: 'Autopilot',
    default: 'Proxy',
    firewall: 'Firewall',
    sessions: 'Sessions',
    status: 'Status',
  },
  unauthenticatedServiceTypes: {
    status: 'Status',
  },
} as const;
