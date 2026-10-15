/** gRPC methods of one daemon service */
export type GrpcService = {[method: string]: (...args: any[]) => any};

/** Authenticated gRPC API Object of a daemon, for example lnd or tapd */
export type GrpcApi = {[service: string]: GrpcService};

/** Authenticated litd gRPC API Object */
export type AuthenticatedLitd = {
  /** Accounts Methods */
  accounts: GrpcService;
  /** Autopilot Methods */
  autopilot: GrpcService;
  /** Proxy Methods */
  default: GrpcService;
  /** Firewall Methods */
  firewall: GrpcService;
  /** Authenticated lnd API Object */
  lnd?: GrpcApi;
  /** Sessions Methods */
  sessions: GrpcService;
  /** Status Methods */
  status: GrpcService;
  /** Authenticated tapd API Object */
  tapd?: GrpcApi;
};

/** Unauthenticated litd gRPC API Object */
export type UnauthenticatedLitd = {
  /** Status Methods */
  status: GrpcService;
};

export type LitdServiceType = Exclude<keyof AuthenticatedLitd, 'lnd' | 'tapd'>;

export type LitdConnection = {
  /** Base64 or Hex Serialized litd TLS Cert String */
  cert?: string;
  /** Path to Protos Directory With litrpc and proto Directories String */
  path?: string;
  /** Host:Port Network Address String */
  socket?: string;
};

export type LitdAuthentication = LitdConnection & {
  /** Authenticated lnd API Object */
  lnd?: GrpcApi;
  /** Base64 or Hex Serialized Macaroon String */
  macaroon?: string;
  /** Authenticated tapd API Object */
  tapd?: GrpcApi;
};
