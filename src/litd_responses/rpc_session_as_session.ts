import privacyFlagsFromBitmask from './privacy_flags_from_bitmask.js';
import rpcRulesMapAsRules from './rpc_rules_map_as_rules.js';
import type {Rule} from './rpc_rules_map_as_rules.js';
import type {RpcRulesMap} from './rpc_rules_map_as_rules.js';

const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const hexFrom = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isInteger = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const {keys} = Object;
const states: Record<string, Session['state']> = {
  STATE_CREATED: 'created',
  STATE_EXPIRED: 'expired',
  STATE_IN_USE: 'in_use',
  STATE_RESERVED: 'reserved',
  STATE_REVOKED: 'revoked',
};
const types: Record<string, Session['type']> = {
  TYPE_AUTOPILOT: 'autopilot',
  TYPE_MACAROON_ACCOUNT: 'account',
  TYPE_MACAROON_ADMIN: 'admin',
  TYPE_MACAROON_CUSTOM: 'custom',
  TYPE_MACAROON_READONLY: 'readonly',
  TYPE_UI_PASSWORD: 'ui_password',
};
const zero = '0';

export type RpcSession = {
  account_id: string;
  autopilot_feature_info: Record<string, RpcRulesMap>;
  created_at: string;
  dev_server: boolean;
  expiry_timestamp_seconds: string;
  feature_configs: Record<string, string>;
  group_id: Buffer;
  id: Buffer;
  label: string;
  local_public_key: Buffer;
  macaroon_recipe: {
    caveats: string[];
    permissions: {action: string; entity: string}[];
  } | null;
  mailbox_server_addr: string;
  pairing_secret: Buffer;
  pairing_secret_mnemonic: string;
  privacy_flags: string;
  remote_public_key: Buffer;
  revoked_at: string;
  session_state: string;
  session_type: string;
};

export type Session = {
  /** Account Id Hex */
  account_id?: string;
  autopilot_features: {
    /** Feature Configuration JSON */
    config?: string;
    /** Feature Name */
    name: string;
    rules: Rule[];
  }[];
  /** Created At ISO 8601 Date */
  created_at: string;
  /** Expires At ISO 8601 Date */
  expires_at: string;
  /** Session Group Id Hex */
  group_id: string;
  /** Session Id Hex */
  id: string;
  /** Mailbox Connection Skips TLS */
  is_dev_server: boolean;
  /** Session Label */
  label?: string;
  /** Macaroon Caveats */
  macaroon_caveats: string[];
  macaroon_permissions: {
    /** Permission Action */
    action: string;
    /** Permission Entity */
    entity: string;
  }[];
  /** Mailbox Server Host:Port */
  mailbox_server: string;
  /** Pairing Secret Hex */
  pairing_secret: string;
  /** Pairing Secret Mnemonic Words */
  pairing_secret_mnemonic: string;
  /** Privacy Flag Types */
  privacy_flags: string[];
  /** Local Static Public Key Hex */
  public_key: string;
  /** Remote Static Public Key Hex */
  remote_public_key?: string;
  /** Revoked At ISO 8601 Date */
  revoked_at?: string;
  /** Session State */
  state: 'created' | 'expired' | 'in_use' | 'reserved' | 'revoked';
  /** Session Type */
  type:
    | 'account'
    | 'admin'
    | 'autopilot'
    | 'custom'
    | 'readonly'
    | 'ui_password';
};

/** Session from an RPC session

  {
    account_id: <Account Id Hex String>
    autopilot_feature_info: {
      <Feature Name String>: {
        rules: {
          <Rule Name String>: <RPC Rule Value Object>
        }
      }
    }
    created_at: <Created At Unix Seconds Numeric String>
    dev_server: <Mailbox Connection Skips TLS Bool>
    expiry_timestamp_seconds: <Expires At Unix Seconds Numeric String>
    feature_configs: {
      <Feature Name String>: <Feature Configuration JSON String>
    }
    group_id: <Session Group Id Buffer Object>
    id: <Session Id Buffer Object>
    label: <Session Label String>
    local_public_key: <Local Static Public Key Buffer Object>
    macaroon_recipe: {
      caveats: [<Macaroon Caveat String>]
      permissions: [{
        action: <Permission Action String>
        entity: <Permission Entity String>
      }]
    }
    mailbox_server_addr: <Mailbox Server Host:Port String>
    pairing_secret: <Pairing Secret Buffer Object>
    pairing_secret_mnemonic: <Pairing Secret Mnemonic Words String>
    privacy_flags: <Privacy Flags Bitmask Numeric String>
    remote_public_key: <Remote Static Public Key Buffer Object>
    revoked_at: <Revoked At Unix Seconds Numeric String>
    session_state: <Session State String>
    session_type: <Session Type String>
  }

  @throws
  <Error>

  @returns
  {
    [account_id]: <Account Id Hex String>
    autopilot_features: [{
      [config]: <Feature Configuration JSON String>
      name: <Feature Name String>
      rules: [<Rule Object>]
    }]
    created_at: <Created At ISO 8601 Date String>
    expires_at: <Expires At ISO 8601 Date String>
    group_id: <Session Group Id Hex String>
    id: <Session Id Hex String>
    is_dev_server: <Mailbox Connection Skips TLS Bool>
    [label]: <Session Label String>
    macaroon_caveats: [<Macaroon Caveat String>]
    macaroon_permissions: [{
      action: <Permission Action String>
      entity: <Permission Entity String>
    }]
    mailbox_server: <Mailbox Server Host:Port String>
    pairing_secret: <Pairing Secret Hex String>
    pairing_secret_mnemonic: <Pairing Secret Mnemonic Words String>
    privacy_flags: [<Privacy Flag Type String>]
    public_key: <Local Static Public Key Hex String>
    [remote_public_key]: <Remote Static Public Key Hex String>
    [revoked_at]: <Revoked At ISO 8601 Date String>
    state: <Session State String>
    type: <Session Type String>
  }
*/
export default (session?: RpcSession | null): Session => {
  if (!session) {
    throw new Error('ExpectedRpcSessionDetails');
  }

  if (!isInteger(session.created_at)) {
    throw new Error('ExpectedCreatedAtInRpcSessionDetails');
  }

  if (!isInteger(session.expiry_timestamp_seconds)) {
    throw new Error('ExpectedExpiryInRpcSessionDetails');
  }

  if (!isBuffer(session.group_id) || !session.group_id.length) {
    throw new Error('ExpectedGroupIdInRpcSessionDetails');
  }

  if (!isBuffer(session.id) || !session.id.length) {
    throw new Error('ExpectedSessionIdInRpcSessionDetails');
  }

  if (!isBuffer(session.local_public_key)) {
    throw new Error('ExpectedLocalPublicKeyInRpcSessionDetails');
  }

  if (!isBuffer(session.pairing_secret)) {
    throw new Error('ExpectedPairingSecretInRpcSessionDetails');
  }

  if (!states[session.session_state]) {
    throw new Error('ExpectedKnownSessionStateInRpcSessionDetails');
  }

  if (!types[session.session_type]) {
    throw new Error('ExpectedKnownSessionTypeInRpcSessionDetails');
  }

  const caveats = session.macaroon_recipe?.caveats || [];
  const configs = session.feature_configs || {};
  const featureInfo = session.autopilot_feature_info || {};
  const permissions = session.macaroon_recipe?.permissions || [];

  if (!isArray(caveats) || !isArray(permissions)) {
    throw new Error('ExpectedMacaroonRecipeInRpcSessionDetails');
  }

  // Features can have a configuration, rules, or both
  const featureNames = [...new Set([...keys(featureInfo), ...keys(configs)])];

  const revokedAt = session.revoked_at;

  return {
    account_id: session.account_id || undefined,
    autopilot_features: featureNames.sort().map(name => ({
      config: configs[name] || undefined,
      name,
      rules: rpcRulesMapAsRules(featureInfo[name]),
    })),
    created_at: dateFrom(session.created_at),
    expires_at: dateFrom(session.expiry_timestamp_seconds),
    group_id: session.group_id.toString('hex'),
    id: session.id.toString('hex'),
    is_dev_server: session.dev_server,
    label: session.label || undefined,
    macaroon_caveats: caveats,
    macaroon_permissions: permissions.map(n => ({
      action: n.action,
      entity: n.entity,
    })),
    mailbox_server: session.mailbox_server_addr,
    pairing_secret: session.pairing_secret.toString('hex'),
    pairing_secret_mnemonic: session.pairing_secret_mnemonic,
    privacy_flags: privacyFlagsFromBitmask(session.privacy_flags || zero),
    public_key: session.local_public_key.toString('hex'),
    remote_public_key: hexFrom(session.remote_public_key),
    revoked_at:
      !!revokedAt && revokedAt !== zero ? dateFrom(revokedAt) : undefined,
    state: states[session.session_state],
    type: types[session.session_type],
  };
};
