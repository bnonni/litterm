// Live test of the litterm methods on a Polar network
//
// This script does not run in CI, because it needs the Polar desktop app.
//
// Needs two started litd nodes (v0.17.1 or later) in integrated mode with tapd.
// Node A makes an asset channel to node B if it does not have one. Optionally,
// a litd node older than v0.17.1 checks the 501 of getAccountPayments.
//
// Polar regtest has no Autopilot server, so the Autopilot methods expect 501.
// stopTerminal uses a read-only macaroon and expects 403, so litd keeps running.
//
// Usage: NETWORK_ID=1 pnpm test:live
// Env: NETWORK_ID (required), NODES (alice,bob), OLD_NODE (not set)
import {randomBytes} from 'node:crypto';

import {authenticatedLndGrpc} from 'lightning';
import {createInvoice} from 'lightning';
import {getChannels} from 'lightning';
import {getWalletInfo} from 'lightning';
import {pay} from 'lightning';
import {fundTapChannel} from 'polarln';
import {getNodeCredentials} from 'polarln';
import {listTapAssets} from 'polarln';
import {mineBlocks} from 'polarln';
import {mintTapAsset} from 'polarln';
import {openChannel} from 'polarln';
import {polarBridge} from 'polarln';
import {syncTapUniverse} from 'polarln';

import * as litterm from '../../src/index.js';

const accountLabel = `litterm-live-${Date.now()}`;
const assetName = 'litterm-live-coin';
const dayMs = 864e5;
const networkId = Number(process.env.NETWORK_ID);
const [nameA, nameB] = (process.env.NODES || 'alice,bob').split(',');
const oldName = process.env.OLD_NODE;
const {polar} = polarBridge({});
const results: {name: string; ok: boolean}[] = [];
const start = new Date().toISOString();
const unknownKey = `02${'ab'.repeat(32)}`;

if (!Number.isSafeInteger(networkId) || !nameA || !nameB) {
  console.log('Set NETWORK_ID, and NODES as two node names (alice,bob)');
  process.exit(1);
}

const check = async (name: string, fn: () => Promise<unknown>) => {
  try {
    const detail = await fn();
    results.push({name, ok: true});
    console.log(
      'ok  ',
      name,
      detail === undefined ? '' : JSON.stringify(detail),
    );
  } catch (err) {
    results.push({name, ok: false});
    console.log(
      'FAIL',
      name,
      err instanceof Error ? err.message : JSON.stringify(err),
    );
  }
};

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const rejectsWith = async (
  promise: Promise<unknown>,
  code: number,
  message: string,
) => {
  try {
    await promise;
  } catch (err) {
    const [errCode, errMessage] = err as [number, string];
    expect(
      errCode === code && errMessage === message,
      `got ${JSON.stringify(err)}`,
    );
    return [errCode, errMessage];
  }
  throw new Error(`expected ${code} ${message}`);
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const inDays = (days: number) =>
  new Date(Date.now() + dayMs * days).toISOString();
const mine = () => mineBlocks({blocks: 6, networkId, polar});

// Poll until the function gives a truthy value
const waitFor = async <T>(name: string, fn: () => Promise<T>) => {
  for (let i = 0; i < 60; i++) {
    const value = await fn();
    if (!!value) {
      return value;
    }
    await delay(1000);
  }
  throw new Error(`timed out: ${name}`);
};

const connect = async (nodeName: string) => {
  const creds = await getNodeCredentials({networkId, nodeName, polar});
  expect(!!creds.litd && !!creds.lnd, `expected ${nodeName} to be a litd node`);
  const {lnd} = authenticatedLndGrpc(creds.lnd);
  const {litd} = litterm.authenticatedLitdGrpc({...creds.litd, lnd});
  const {public_key} = await getWalletInfo({lnd});
  return {creds: creds.litd, litd, lnd, name: nodeName, public_key};
};

const a = await connect(nameA);
const b = await connect(nameB);

// Setup: a sats channel and an asset channel from A to B
const assetChannelsToB = async () => {
  const {channels} = await litterm.getAssetChannels({
    litd: a.litd,
    partner_public_key: b.public_key,
  });
  return channels;
};

const satsChannelsToB = async () => {
  const [{channels}, assetChannels] = await Promise.all([
    getChannels({lnd: a.lnd, partner_public_key: b.public_key}),
    assetChannelsToB(),
  ]);
  return channels.filter(n => !assetChannels.find(asset => asset.id === n.id));
};

if (!(await satsChannelsToB()).length) {
  console.log('setup: open a sats channel from A to B');
  await openChannel({
    fromNode: a.name,
    networkId,
    polar,
    sats: 1e6,
    toNode: b.name,
  });
  await mine();
  await waitFor('sats channel', async () => (await satsChannelsToB()).length);
}

if (!(await assetChannelsToB()).length) {
  const findAsset = async () => {
    const {assets} = await listTapAssets({networkId, nodeName: a.name, polar});
    return assets.find(n => n.name === assetName);
  };

  if (!(await findAsset())) {
    console.log('setup: mint the asset on A');
    await mintTapAsset({
      amount: 1e6,
      assetType: 'normal',
      autoFund: true,
      decimals: 2,
      finalize: true,
      name: assetName,
      networkId,
      nodeName: a.name,
      polar,
    });
    await mine();
  }

  const asset = await waitFor('minted asset', findAsset);

  console.log('setup: sync the universe of B and open an asset channel');
  await syncTapUniverse({
    networkId,
    nodeName: b.name,
    polar,
    universeNodeName: a.name,
  });
  await fundTapChannel({
    amount: 1e5,
    assetId: asset.id,
    fromNode: a.name,
    networkId,
    polar,
    toNode: b.name,
  });
  await delay(3000);
  await mine();
  await waitFor('asset channel', async () => (await assetChannelsToB()).length);
}

const [channel] = await assetChannelsToB();
const [funding] = channel?.asset.funding ?? [];
expect(!!channel && !!funding, 'expected an asset channel from A to B');

// Status and proxy
await check('getSubServerStatus: litd, lnd, and tapd run', async () => {
  const {sub_servers} = await litterm.getSubServerStatus({litd: a.litd});
  const running = sub_servers.filter(n => n.is_running).map(n => n.name);
  expect(
    ['lit', 'lnd', 'taproot-assets'].every(n => running.includes(n)),
    'sub-servers',
  );
  return running;
});

await check('getSubServerStatus: no macaroon is necessary', async () => {
  const {litd} = litterm.unauthenticatedLitdGrpc({
    cert: a.creds.cert,
    socket: a.creds.socket,
  });
  const {sub_servers} = await litterm.getSubServerStatus({litd});
  expect(sub_servers.find(n => n.name === 'lit')?.is_running, 'expected lit');
  return sub_servers.length;
});

await check('getTerminalInfo: A has a version and a commit hash', async () => {
  const info = await litterm.getTerminalInfo({litd: a.litd});
  expect(/^\d+\.\d+\.\d+/.test(info.version), `version ${info.version}`);
  expect(/^[0-9a-f]{40}$/.test(info.commit_hash), `commit ${info.commit_hash}`);
  return info;
});

const {macaroon: readOnlyMacaroon} = await litterm.createSuperMacaroon({
  is_read_only: true,
  litd: a.litd,
});

const readOnly = litterm.authenticatedLitdGrpc({
  ...a.creds,
  macaroon: readOnlyMacaroon,
}).litd;

await check('createSuperMacaroon: a read-only macaroon can read', async () => {
  const {accounts} = await litterm.getAccounts({litd: readOnly});
  return accounts.length;
});

await check('createSuperMacaroon: a root key id suffix', async () => {
  const {macaroon} = await litterm.createSuperMacaroon({
    litd: a.litd,
    root_key_id_suffix: randomBytes(4).toString('hex'),
  });
  const {litd} = litterm.authenticatedLitdGrpc({...a.creds, macaroon});
  return (await litterm.getTerminalInfo({litd})).version;
});

await check('createAccount: a read-only macaroon is a 403', async () => {
  return rejectsWith(
    litterm.createAccount({litd: readOnly, tokens: 1}),
    403,
    'PermissionDeniedToCreateAccount',
  );
});

await check('stopTerminal: a read-only macaroon is a 403', async () => {
  return rejectsWith(
    litterm.stopTerminal({litd: readOnly}),
    403,
    'PermissionDeniedToStopTerminal',
  );
});

// Accounts
const expiresAt = inDays(1);

const account = await litterm.createAccount({
  expires_at: expiresAt,
  label: accountLabel,
  litd: a.litd,
  tokens: 50000,
});

await check(
  'createAccount: the account has the balance and label',
  async () => {
    expect(/^[0-9a-f]{16}$/.test(account.id), `id ${account.id}`);
    expect(
      account.balance === 50000 && account.initial_balance === 50000,
      'balance',
    );
    expect(account.label === accountLabel, 'expected the label');
    expect(!!account.macaroon, 'expected a macaroon');
    const expiry = Date.parse(account.expires_at ?? '');
    expect(
      Math.abs(expiry - Date.parse(expiresAt)) < 1000,
      `expiry ${account.expires_at}`,
    );
    return {expires_at: account.expires_at, id: account.id};
  },
);

await check('createAccount: a used label is a 409', async () => {
  return rejectsWith(
    litterm.createAccount({label: accountLabel, litd: a.litd, tokens: 1}),
    409,
    'AccountWithLabelAlreadyExists',
  );
});

await check('getAccount: by id and by label', async () => {
  const byId = await litterm.getAccount({id: account.id, litd: a.litd});
  const byLabel = await litterm.getAccount({label: accountLabel, litd: a.litd});
  expect(
    byId.label === accountLabel && byLabel.id === account.id,
    'expected the account',
  );
});

await check('getAccount: an unknown account is a 404', async () => {
  return rejectsWith(
    litterm.getAccount({id: 'ffffffffffffffff', litd: a.litd}),
    404,
    'AccountNotFound',
  );
});

await check('getAccounts: the list has the account', async () => {
  const {accounts} = await litterm.getAccounts({litd: a.litd});
  expect(!!accounts.find(n => n.id === account.id), 'expected the account');
  return accounts.length;
});

await check('creditAccount: the balance goes up', async () => {
  const {balance} = await litterm.creditAccount({
    id: account.id,
    litd: a.litd,
    tokens: 1000,
  });
  expect(balance === 51000, `balance ${balance}`);
  return balance;
});

await check('debitAccount: the balance goes down', async () => {
  const {balance} = await litterm.debitAccount({
    label: accountLabel,
    litd: a.litd,
    tokens: 1000,
  });
  expect(balance === 50000, `balance ${balance}`);
  return balance;
});

await check('debitAccount: more than the balance is a 400', async () => {
  return rejectsWith(
    litterm.debitAccount({id: account.id, litd: a.litd, tokens: 1e9}),
    400,
    'InsufficientAccountBalanceForDebit',
  );
});

const newLabel = `${accountLabel}-renamed`;

await check('updateAccount: a new label and no expiry', async () => {
  const updated = await litterm.updateAccount({
    id: account.id,
    is_expiry_removed: true,
    litd: a.litd,
    new_label: newLabel,
  });
  expect(updated.label === newLabel, `label ${updated.label}`);
  expect(updated.expires_at === undefined, `expiry ${updated.expires_at}`);
  return {label: updated.label};
});

// Account payments from A to B
const {lnd: accountLnd} = authenticatedLndGrpc({
  cert: a.creds.cert,
  macaroon: account.macaroon,
  socket: a.creds.socket,
});

const paid: string[] = [];

for (const tokens of [1000, 2000]) {
  const invoice = await createInvoice({lnd: b.lnd, tokens});
  await pay({lnd: accountLnd, max_fee: 100, request: invoice.request});
  paid.push(invoice.id);
}

await check('getAccount: the account has the payments', async () => {
  const {balance, payments} = await litterm.getAccount({
    id: account.id,
    litd: a.litd,
  });
  expect(balance <= 47000, `balance ${balance}`);
  expect(
    paid.every(id => payments.find(n => n.id === id && n.is_confirmed)),
    'payments',
  );
  return {balance, payments: payments.length};
});

await check('getAccountPayments: the account has its payments', async () => {
  const res = await litterm.getAccountPayments({id: account.id, litd: a.litd});
  expect(res.payments.length === 2, `got ${res.payments.length} payments`);
  expect(!res.missing_payments.length, 'expected no missing payments');
  expect(res.next === undefined, 'expected no next page');
  expect(
    paid.every(id => res.payments.find(n => n.id === id)),
    'expected the ids',
  );
  expect(
    res.payments.every(n => n.is_confirmed && n.is_outgoing),
    'expected confirmed',
  );
  return res.payments.map(n => ({fee: n.fee, id: n.id, tokens: n.tokens}));
});

await check('getAccountPayments: pages with limit and token', async () => {
  const first = await litterm.getAccountPayments({
    label: newLabel,
    limit: 1,
    litd: a.litd,
  });
  expect(first.payments.length === 1 && !!first.next, 'expected a next page');
  const second = await litterm.getAccountPayments({
    label: newLabel,
    litd: a.litd,
    token: first.next,
  });
  const [firstId, secondId] = [first.payments[0]?.id, second.payments[0]?.id];
  expect(second.payments.length === 1, 'expected one payment');
  expect(second.next === undefined, 'expected no third page');
  expect(!!firstId && !!secondId && firstId < secondId, 'expected hash order');
  return {first: first.next};
});

await check('getAccountPayments: an unknown account is a 404', async () => {
  return rejectsWith(
    litterm.getAccountPayments({id: 'ffffffffffffffff', litd: a.litd}),
    404,
    'AccountNotFound',
  );
});

if (!!oldName) {
  await check(
    `getAccountPayments: older litd (${oldName}) is a 501`,
    async () => {
      const old = await connect(oldName);
      return rejectsWith(
        litterm.getAccountPayments({id: account.id, litd: old.litd}),
        501,
        'ExpectedNewerLitdToGetAccountPayments',
      );
    },
  );
}

// Firewall: litd records the requests of account macaroons
const paymentActions = {
  created_after: start,
  litd: a.litd,
  method: '/routerrpc.Router/SendPaymentV2',
};

await check(
  'getFirewallActions: the account payments are actions',
  async () => {
    const {actions} = await litterm.getFirewallActions(paymentActions);
    expect(actions.length >= 2, `got ${actions.length} actions`);
    const [newest, older] = actions;
    expect(
      !!newest && !!older && newest.attempted_at >= older.attempted_at,
      'newest first',
    );
    expect(
      actions.every(n => n.state === 'done'),
      'expected done actions',
    );
    return actions.map(n => ({attempted_at: n.attempted_at, state: n.state}));
  },
);

await check('getFirewallActions: pages with limit and token', async () => {
  const first = await litterm.getFirewallActions({...paymentActions, limit: 1});
  expect(first.actions.length === 1 && !!first.next, 'expected a next page');
  const second = await litterm.getFirewallActions({
    ...paymentActions,
    token: first.next,
  });
  expect(second.actions.length === 1, `got ${second.actions.length} actions`);
  return {first: first.next, second: second.next};
});

// Sessions
const sessionArgs = {expires_at: inDays(1), litd: a.litd};
const getInfoUri = '/lnrpc.Lightning/GetInfo';

const readOnlySession = await litterm.createSession({
  ...sessionArgs,
  label: accountLabel,
});

const accountSession = await litterm.createSession({
  ...sessionArgs,
  account_id: account.id,
  type: 'account',
});

const customSession = await litterm.createSession({
  ...sessionArgs,
  permissions: [{action: getInfoUri, entity: 'uri'}],
  type: 'custom',
});

const sessions = [readOnlySession, accountSession, customSession];

await check('createSession: a readonly session', async () => {
  const session = readOnlySession;
  expect(
    session.type === 'readonly' && session.state === 'created',
    session.type,
  );
  expect(session.label === accountLabel, 'expected the label');
  expect(/^[0-9a-f]{66}$/.test(session.public_key), 'expected a public key');
  expect(
    session.pairing_secret_mnemonic.split(' ').length > 1,
    'expected words',
  );
  return {group_id: session.group_id, id: session.id};
});

await check('createSession: an account session', async () => {
  expect(accountSession.type === 'account', `type ${accountSession.type}`);
  expect(accountSession.account_id === account.id, 'expected the account id');
  return {account_id: accountSession.account_id};
});

await check('createSession: a custom session has the permissions', async () => {
  const [permission] = customSession.macaroon_permissions;
  expect(customSession.type === 'custom', `type ${customSession.type}`);
  expect(
    permission?.action === getInfoUri && permission.entity === 'uri',
    'permission',
  );
  return customSession.macaroon_permissions;
});

await check('createSession: an unknown URI gives no permission', async () => {
  const session = await litterm.createSession({
    ...sessionArgs,
    permissions: [{action: '/lnrpc.Lightning/UnknownMethod', entity: 'uri'}],
    type: 'custom',
  });
  sessions.push(session);
  expect(!session.macaroon_permissions.length, 'expected no permissions');
});

await check('getSessions: the list has the sessions', async () => {
  const list = await litterm.getSessions({litd: a.litd});
  expect(
    sessions.every(s => list.sessions.find(n => n.id === s.id)),
    'sessions',
  );
  return list.sessions.length;
});

await check('getFirewallActions: a new session has no actions', async () => {
  const {actions} = await litterm.getFirewallActions({
    litd: a.litd,
    session_id: readOnlySession.id,
  });
  expect(!actions.length, `got ${actions.length} actions`);
});

await check('getPrivacyMapValue: an unknown value is a 404', async () => {
  return rejectsWith(
    litterm.getPrivacyMapValue({
      group_id: readOnlySession.group_id,
      input: 'x',
      litd: a.litd,
    }),
    404,
    'PrivacyMapValueNotFound',
  );
});

await check('getPrivacyMapValue: an unknown group is a 404', async () => {
  return rejectsWith(
    litterm.getPrivacyMapValue({
      group_id: 'ffffffff',
      input: 'x',
      litd: a.litd,
    }),
    404,
    'SessionGroupNotFound',
  );
});

await check('revokeSession: the sessions are revoked', async () => {
  for (const {public_key} of sessions) {
    await litterm.revokeSession({litd: a.litd, public_key});
  }
  const list = await litterm.getSessions({litd: a.litd});
  const states = sessions.map(
    s => list.sessions.find(n => n.id === s.id)?.state,
  );
  expect(
    states.every(n => n === 'revoked'),
    `states ${states.join()}`,
  );
});

await check('revokeSession: an unknown session is a 404', async () => {
  return rejectsWith(
    litterm.revokeSession({litd: a.litd, public_key: unknownKey}),
    404,
    'SessionNotFound',
  );
});

// Autopilot
const autopilotOff = (promise: Promise<unknown>) => {
  return rejectsWith(promise, 501, 'AutopilotIsNotEnabledInLitd');
};

await check('getAutopilotFeatures: no Autopilot server is a 501', async () => {
  return autopilotOff(litterm.getAutopilotFeatures({litd: a.litd}));
});

await check('getAutopilotSessions: no Autopilot server is a 501', async () => {
  return autopilotOff(litterm.getAutopilotSessions({litd: a.litd}));
});

await check(
  'createAutopilotSession: no Autopilot server is a 501',
  async () => {
    return autopilotOff(
      litterm.createAutopilotSession({
        expires_at: inDays(1),
        features: [{name: 'auto-fees'}],
        litd: a.litd,
      }),
    );
  },
);

await check(
  'revokeAutopilotSession: no Autopilot server is a 501',
  async () => {
    return autopilotOff(
      litterm.revokeAutopilotSession({litd: a.litd, public_key: unknownKey}),
    );
  },
);

// Remove the account after the sessions, because a session uses it
await check('removeAccount: the account is gone', async () => {
  await litterm.removeAccount({id: account.id, litd: a.litd});
  return rejectsWith(
    litterm.getAccount({id: account.id, litd: a.litd}),
    404,
    'AccountNotFound',
  );
});

// Asset channels
const {assets: assetsOfA} = await listTapAssets({
  networkId,
  nodeName: a.name,
  polar,
});

await check('getAssetChannels: A has the asset channel to B', async () => {
  const known = assetsOfA.find(n => n.id === funding.asset_id);
  expect(!!known, 'expected the asset in the tapd assets of A');
  expect(funding.name === known.name, `name ${funding.name}`);
  expect(
    funding.decimal_display === known.decimals,
    `decimals ${funding.decimal_display}`,
  );
  expect(
    /^\d+$/.test(channel.asset.local_balance),
    'expected a numeric string',
  );
  expect(channel.type === 'simplified_taproot_overlay', `type ${channel.type}`);
  return {asset_id: funding.asset_id, id: channel.id, name: funding.name};
});

await check('getAssetChannels: B has the asset as remote balance', async () => {
  const {channels} = await litterm.getAssetChannels({
    litd: b.litd,
    partner_public_key: a.public_key,
  });
  const match = channels.find(n => n.id === channel.id);
  expect(!!match, 'expected the channel');
  expect(
    match.asset.remote_balance === channel.asset.local_balance,
    'balances',
  );
  return {local: match.asset.local_balance, remote: match.asset.remote_balance};
});

await check(
  'getAssetChannels: the sats channel is not in the list',
  async () => {
    const satsChannels = await satsChannelsToB();
    const {channels} = await litterm.getAssetChannels({litd: a.litd});
    expect(!!satsChannels.length, 'expected a sats channel');
    expect(
      !channels.find(n => satsChannels.find(sats => sats.id === n.id)),
      'sats channel',
    );
    return {asset: channels.length, sats: satsChannels.length};
  },
);

await check(
  'getAssetChannels: a filter for another partner is empty',
  async () => {
    const {channels} = await litterm.getAssetChannels({
      litd: a.litd,
      partner_public_key: a.public_key,
    });
    expect(!channels.length, 'expected no channels');
  },
);

await check('getAssetChannels: no lnd in litd is a 400', async () => {
  const {litd} = litterm.authenticatedLitdGrpc(a.creds);
  return rejectsWith(
    litterm.getAssetChannels({litd}),
    400,
    'ExpectedLndInLitdToGetAssetChannels',
  );
});

await check(
  'getAssetChannelBalance: the balance is the sum of the channels',
  async () => {
    const balance = await litterm.getAssetChannelBalance({litd: a.litd});
    const {channels} = await litterm.getAssetChannels({litd: a.litd});
    const entry = balance.assets.find(n => n.asset_id === funding.asset_id);
    const sum = channels
      .filter(n => n.asset.funding.find(f => f.asset_id === funding.asset_id))
      .reduce((total, n) => total + BigInt(n.asset.local_balance), 0n);
    expect(!!entry, 'expected the asset');
    expect(entry.name === funding.name, `name ${entry.name}`);
    expect(
      BigInt(entry.local_balance) === sum,
      `${entry.local_balance} is not ${sum}`,
    );
    return entry;
  },
);

await check('getAssetChannelBalance: B has the remote balance', async () => {
  const balance = await litterm.getAssetChannelBalance({litd: b.litd});
  const entry = balance.assets.find(n => n.asset_id === funding.asset_id);
  expect(!!entry && entry.remote_balance !== '0', 'expected a remote balance');
  return entry;
});

const passed = results.filter(n => n.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
