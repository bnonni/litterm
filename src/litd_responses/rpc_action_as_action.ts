const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isInteger = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isZero = (n: Buffer) => !n.some(byte => !!byte);
const states: Record<string, Action['state']> = {
  STATE_DONE: 'done',
  STATE_ERROR: 'error',
  STATE_PENDING: 'pending',
  STATE_UNKNOWN: 'unknown',
};

export type RpcAction = {
  actor_name: string;
  error_reason: string;
  feature_name: string;
  intent: string;
  macaroon_identifier: Buffer;
  rpc_method: string;
  rpc_params_json: string;
  session_id: Buffer;
  state: string;
  structured_json_data: string;
  timestamp: string;
  trigger: string;
};

export type Action = {
  /** Actor Name */
  actor?: string;
  /** Attempted At ISO 8601 Date */
  attempted_at: string;
  /** Error Reason */
  error?: string;
  /** Feature Name */
  feature?: string;
  /** Intended Outcome */
  intent?: string;
  /** Macaroon Id Hex */
  macaroon_id?: string;
  /** RPC Method URI */
  method: string;
  /** RPC Request Parameters JSON */
  params?: string;
  /** Session Id Hex */
  session_id?: string;
  /** Action State */
  state: 'done' | 'error' | 'pending' | 'unknown';
  /** Structured Data JSON */
  structured_data?: string;
  /** Trigger Reason */
  trigger?: string;
};

/** Action from an RPC action

  {
    actor_name: <Actor Name String>
    error_reason: <Error Reason String>
    feature_name: <Feature Name String>
    intent: <Intended Outcome String>
    macaroon_identifier: <Macaroon Id Buffer Object>
    rpc_method: <RPC Method URI String>
    rpc_params_json: <RPC Request Parameters JSON String>
    session_id: <Session Id Buffer Object>
    state: <Action State String>
    structured_json_data: <Structured Data JSON String>
    timestamp: <Attempted At Unix Seconds Numeric String>
    trigger: <Trigger Reason String>
  }

  @throws
  <Error>

  @returns
  {
    [actor]: <Actor Name String>
    attempted_at: <Attempted At ISO 8601 Date String>
    [error]: <Error Reason String>
    [feature]: <Feature Name String>
    [intent]: <Intended Outcome String>
    [macaroon_id]: <Macaroon Id Hex String>
    method: <RPC Method URI String>
    [params]: <RPC Request Parameters JSON String>
    [session_id]: <Session Id Hex String>
    state: <Action State String> // done, error, pending, unknown
    [structured_data]: <Structured Data JSON String>
    [trigger]: <Trigger Reason String>
  }
*/
export default (action?: RpcAction | null): Action => {
  if (!action) {
    throw new Error('ExpectedRpcActionDetails');
  }

  if (!isBuffer(action.macaroon_identifier)) {
    throw new Error('ExpectedMacaroonIdentifierInRpcActionDetails');
  }

  if (!action.rpc_method) {
    throw new Error('ExpectedRpcMethodInRpcActionDetails');
  }

  if (!isBuffer(action.session_id)) {
    throw new Error('ExpectedSessionIdInRpcActionDetails');
  }

  if (!states[action.state]) {
    throw new Error('ExpectedKnownStateInRpcActionDetails');
  }

  if (!isInteger(action.timestamp)) {
    throw new Error('ExpectedTimestampInRpcActionDetails');
  }

  const macaroonId = action.macaroon_identifier;
  const sessionId = action.session_id;

  return {
    actor: action.actor_name || undefined,
    attempted_at: dateFrom(action.timestamp),
    error: action.error_reason || undefined,
    feature: action.feature_name || undefined,
    intent: action.intent || undefined,
    macaroon_id: isZero(macaroonId) ? undefined : macaroonId.toString('hex'),
    method: action.rpc_method,
    params: action.rpc_params_json || undefined,
    session_id: isZero(sessionId) ? undefined : sessionId.toString('hex'),
    state: states[action.state],
    structured_data: action.structured_json_data || undefined,
    trigger: action.trigger || undefined,
  };
};
