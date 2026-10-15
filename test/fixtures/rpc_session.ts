const publicKey = Buffer.from(`02${'11'.repeat(32)}`, 'hex');

/** RPC session the way litd sends it */
export const makeRpcSession = (overrides?: object): any => ({
  account_id: '',
  autopilot_feature_info: {},
  created_at: '1700000000',
  dev_server: false,
  expiry_timestamp_seconds: '1800000000',
  feature_configs: {},
  group_id: Buffer.from('01020304', 'hex'),
  id: Buffer.from('01020304', 'hex'),
  label: 'alice',
  local_public_key: publicKey,
  macaroon_recipe: {caveats: [], permissions: []},
  mailbox_server_addr: 'mailbox.terminal.lightning.today:443',
  pairing_secret: Buffer.alloc(10, 1),
  pairing_secret_mnemonic: 'abandon ability able about above absent',
  privacy_flags: '0',
  remote_public_key: Buffer.alloc(0),
  revoked_at: '0',
  session_state: 'STATE_CREATED',
  session_type: 'TYPE_MACAROON_READONLY',
  ...overrides,
});

/** Session from the RPC session */
export const session = {
  account_id: undefined,
  autopilot_features: [],
  created_at: '2023-11-14T22:13:20.000Z',
  expires_at: '2027-01-15T08:00:00.000Z',
  group_id: '01020304',
  id: '01020304',
  is_dev_server: false,
  label: 'alice',
  macaroon_caveats: [],
  macaroon_permissions: [],
  mailbox_server: 'mailbox.terminal.lightning.today:443',
  pairing_secret: Buffer.alloc(10, 1).toString('hex'),
  pairing_secret_mnemonic: 'abandon ability able about above absent',
  privacy_flags: [],
  public_key: publicKey.toString('hex'),
  remote_public_key: undefined,
  revoked_at: undefined,
  state: 'created',
  type: 'readonly',
};
