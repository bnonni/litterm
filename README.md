# litterm

Methods for the Lightning Terminal daemon (litd), in the style of
[lightning](https://github.com/alexbosworth/lightning).

## Install

    npm install litterm

litterm needs Node.js 22.12 or later.

## litd Authentication

To connect to litd, you need the TLS certificate and a macaroon. Encode each
file as base64:

    base64 -w0 ~/.lit/tls.cert
    base64 -w0 ~/.lit/mainnet/lit.macaroon

Then make an authenticated litd object:

```js
import {authenticatedLitdGrpc} from 'litterm';

const {litd} = authenticatedLitdGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded lit.macaroon',
  socket: '127.0.0.1:8443',
});
```

Methods that use more than one daemon get lnd and tapd from the litd object.
To use these methods, give the authenticated lnd and tapd objects to
`authenticatedLitdGrpc`:

```js
import {authenticatedLndGrpc} from 'lightning';
import {authenticatedLitdGrpc} from 'litterm';
import {authenticatedTapdGrpc} from 'tapass';

const {lnd} = authenticatedLndGrpc({cert, macaroon, socket: '127.0.0.1:10009'});
const {tapd} = authenticatedTapdGrpc({
  cert,
  macaroon,
  socket: '127.0.0.1:10029',
});

const {litd} = authenticatedLitdGrpc({
  lnd,
  tapd,
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded lit.macaroon',
  socket: '127.0.0.1:8443',
});
```

To get the status of the litd subservers without a macaroon, use
`unauthenticatedLitdGrpc`:

```js
import {unauthenticatedLitdGrpc} from 'litterm';

const {litd} = unauthenticatedLitdGrpc({cert, socket: '127.0.0.1:8443'});
```

## Methods

- [createAccount](#createaccount): Create an account
- [createAutopilotSession](#createautopilotsession): Create an Autopilot session and register it with the Autopilot server
- [createSession](#createsession): Create a Lightning Node Connect session
- [createSuperMacaroon](#createsupermacaroon): Create a super macaroon
- [creditAccount](#creditaccount): Increase the balance of an account
- [debitAccount](#debitaccount): Decrease the balance of an account
- [getAccount](#getaccount): Get an account
- [getAccounts](#getaccounts): Get all accounts
- [getAutopilotFeatures](#getautopilotfeatures): Get the features that the Autopilot server offers
- [getAutopilotSessions](#getautopilotsessions): Get all Autopilot sessions
- [getFirewallActions](#getfirewallactions): Get the actions that the firewall recorded, newest first
- [getPrivacyMapValue](#getprivacymapvalue): Get the real value of a pseudo value in a privacy map, or the reverse
- [getSessions](#getsessions): Get all Lightning Node Connect sessions
- [getSubServerStatus](#getsubserverstatus): Get the status of each litd sub-server
- [getTerminalInfo](#getterminalinfo): Get the version of litd
- [removeAccount](#removeaccount): Remove an account
- [revokeAutopilotSession](#revokeautopilotsession): Revoke an Autopilot session
- [revokeSession](#revokesession): Revoke a Lightning Node Connect session
- [stopTerminal](#stopterminal): Stop litd
- [updateAccount](#updateaccount): Update the expiry or the label of an account

### createAccount

Create an account

An account limits the tokens that its macaroon can spend off-chain

Requires `account:write` permission

A `label` must be unique and must not look like an account id

    {
      [expires_at]: <Account Expires At ISO 8601 Date String>
      [label]: <Account Label String>
      litd: <Authenticated litd API Object>
      tokens: <Account Balance Tokens Number>
    }

    @returns via cbk or Promise
    {
      balance: <Current Balance Tokens Number>
      [expires_at]: <Account Expires At ISO 8601 Date String>
      id: <Account Id Hex String>
      initial_balance: <Initial Balance Tokens Number>
      invoices: [{
        id: <Invoice Payment Hash Hex String>
      }]
      [label]: <Account Label String>
      macaroon: <Account Macaroon Base64 String>
      payments: [{
        id: <Payment Hash Hex String>
        is_confirmed: <Payment Is Confirmed Bool>
        is_failed: <Payment Failed Bool>
        is_pending: <Payment Is Pending Bool>
        tokens: <Reserved Tokens Including the Fee Limit Number>
      }]
      updated_at: <Account Updated At ISO 8601 Date String>
    }

Example:

```js
import {createAccount} from 'litterm';

const {id, macaroon} = await createAccount({
  litd,
  label: 'alice',
  tokens: 100000,
});
```

### createAutopilotSession

Create an Autopilot session and register it with the Autopilot server

Requires `autopilot:write` permission

Feature `rules` override the rule values that the Autopilot server
recommends. Session `rules` apply to the whole session.

A rule has a `name` and one rule value, for example:
`{name: 'rate-limit', rate_limit: {read_limit: {hours, iterations}}}`

Rule values that are not present are zero

The default privacy flags are the flags of the features

    {
      expires_at: <Session Expires At ISO 8601 Date String>
      features: [{
        [config]: <Feature Configuration JSON Object String>
        name: <Feature Name String>
        [rules]: [<Rule Object>]
      }]
      [is_dev_server]: <Mailbox Connection Skips TLS Bool>
      [is_privacy_disabled]: <Do Not Use the Privacy Mapper Bool>
      [label]: <Session Label String>
      [linked_group_id]: <Link to the Session Group Id Hex String>
      litd: <Authenticated litd API Object>
      [mailbox_server]: <Mailbox Server Host:Port String>
      [privacy_flags]: [<Privacy Flag Type String>]
      [rules]: [<Rule Object>]
    }

    @returns via cbk or Promise
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

Example:

```js
import {createAutopilotSession} from 'litterm';

const session = await createAutopilotSession({
  litd,
  expires_at: new Date(Date.now() + 864e5 * 30).toISOString(),
  features: [{name: 'auto-fees'}],
  label: 'autofees',
});
```

### createSession

Create a Lightning Node Connect session

Requires `sessions:write` permission

An `account` session needs an `account_id`

A `custom` session needs `permissions`. Use the entity `uri` and a URI, a
URI regular expression, or `***readonly***` as the action, to give access to
RPC methods.

litd reads an unknown URI as a regular expression. If the expression matches
no URI, the session gets no permission for it, and litd returns no error.
Check `macaroon_permissions` in the result.

The default type is `readonly`

    {
      [account_id]: <Account Id Hex String>
      expires_at: <Session Expires At ISO 8601 Date String>
      [is_dev_server]: <Mailbox Connection Skips TLS Bool>
      [label]: <Session Label String>
      litd: <Authenticated litd API Object>
      [mailbox_server]: <Mailbox Server Host:Port String>
      [permissions]: [{
        action: <Permission Action String>
        entity: <Permission Entity String>
      }]
      [type]: <Session Type String> // account, admin, custom, readonly
    }

    @returns via cbk or Promise
    {
      [account_id]: <Account Id Hex String>
      autopilot_features: []
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

Example:

```js
import {createSession} from 'litterm';

const {pairing_secret_mnemonic} = await createSession({
  litd,
  expires_at: new Date(Date.now() + 864e5 * 90).toISOString(),
  label: 'phone',
});
```

### createSuperMacaroon

Create a super macaroon

A super macaroon has the permissions of each daemon that litd runs

Requires `supermacaroon:write` permission

A random root key id suffix is used when there is no `root_key_id_suffix`

    {
      [is_read_only]: <Macaroon Only Has Read Permissions Bool>
      litd: <Authenticated litd API Object>
      [root_key_id_suffix]: <Root Key Id Suffix 4 Byte Hex String>
    }

    @returns via cbk or Promise
    {
      macaroon: <Super Macaroon Base64 String>
    }

Example:

```js
import {createSuperMacaroon} from 'litterm';

const {macaroon} = await createSuperMacaroon({litd, is_read_only: true});
```

### creditAccount

Increase the balance of an account

Requires `account:write` permission

An `id` or a `label` is required, not both

    {
      [id]: <Account Id Hex String>
      [label]: <Account Label String>
      litd: <Authenticated litd API Object>
      tokens: <Credit Tokens Number>
    }

    @returns via cbk or Promise
    {
      balance: <Current Balance Tokens Number>
      [expires_at]: <Account Expires At ISO 8601 Date String>
      id: <Account Id Hex String>
      initial_balance: <Initial Balance Tokens Number>
      invoices: [{
        id: <Invoice Payment Hash Hex String>
      }]
      [label]: <Account Label String>
      payments: [{
        id: <Payment Hash Hex String>
        is_confirmed: <Payment Is Confirmed Bool>
        is_failed: <Payment Failed Bool>
        is_pending: <Payment Is Pending Bool>
        tokens: <Reserved Tokens Including the Fee Limit Number>
      }]
      updated_at: <Account Updated At ISO 8601 Date String>
    }

Example:

```js
import {creditAccount} from 'litterm';

const {balance} = await creditAccount({litd, label: 'alice', tokens: 5000});
```

### debitAccount

Decrease the balance of an account

The balance must not go below zero

Requires `account:write` permission

An `id` or a `label` is required, not both

    {
      [id]: <Account Id Hex String>
      [label]: <Account Label String>
      litd: <Authenticated litd API Object>
      tokens: <Debit Tokens Number>
    }

    @returns via cbk or Promise
    {
      balance: <Current Balance Tokens Number>
      [expires_at]: <Account Expires At ISO 8601 Date String>
      id: <Account Id Hex String>
      initial_balance: <Initial Balance Tokens Number>
      invoices: [{
        id: <Invoice Payment Hash Hex String>
      }]
      [label]: <Account Label String>
      payments: [{
        id: <Payment Hash Hex String>
        is_confirmed: <Payment Is Confirmed Bool>
        is_failed: <Payment Failed Bool>
        is_pending: <Payment Is Pending Bool>
        tokens: <Reserved Tokens Including the Fee Limit Number>
      }]
      updated_at: <Account Updated At ISO 8601 Date String>
    }

Example:

```js
import {debitAccount} from 'litterm';

const {balance} = await debitAccount({litd, label: 'alice', tokens: 5000});
```

### getAccount

Get an account

Requires `account:read` permission

An `id` or a `label` is required, not both

    {
      [id]: <Account Id Hex String>
      [label]: <Account Label String>
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      balance: <Current Balance Tokens Number>
      [expires_at]: <Account Expires At ISO 8601 Date String>
      id: <Account Id Hex String>
      initial_balance: <Initial Balance Tokens Number>
      invoices: [{
        id: <Invoice Payment Hash Hex String>
      }]
      [label]: <Account Label String>
      payments: [{
        id: <Payment Hash Hex String>
        is_confirmed: <Payment Is Confirmed Bool>
        is_failed: <Payment Failed Bool>
        is_pending: <Payment Is Pending Bool>
        tokens: <Reserved Tokens Including the Fee Limit Number>
      }]
      updated_at: <Account Updated At ISO 8601 Date String>
    }

Example:

```js
import {getAccount} from 'litterm';

const {balance} = await getAccount({litd, label: 'alice'});
```

### getAccounts

Get all accounts

Requires `account:read` permission

    {
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      accounts: [{
        balance: <Current Balance Tokens Number>
        [expires_at]: <Account Expires At ISO 8601 Date String>
        id: <Account Id Hex String>
        initial_balance: <Initial Balance Tokens Number>
        invoices: [{
          id: <Invoice Payment Hash Hex String>
        }]
        [label]: <Account Label String>
        payments: [{
          id: <Payment Hash Hex String>
          is_confirmed: <Payment Is Confirmed Bool>
          is_failed: <Payment Failed Bool>
          is_pending: <Payment Is Pending Bool>
          tokens: <Reserved Tokens Including the Fee Limit Number>
        }]
        updated_at: <Account Updated At ISO 8601 Date String>
      }]
    }

Example:

```js
import {getAccounts} from 'litterm';

const {accounts} = await getAccounts({litd});
```

### getAutopilotFeatures

Get the features that the Autopilot server offers

Requires `autopilot:read` permission

    {
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      features: [{
        [default_config]: <Default Configuration JSON String>
        description: <Feature Description String>
        is_upgrade_required: <litd Must Upgrade to Use the Feature Bool>
        name: <Feature Name String>
        permissions: [{
          method: <RPC Method URI String>
          operations: [{
            action: <Permission Action String>
            entity: <Permission Entity String>
          }]
        }]
        privacy_flags: [<Privacy Flag Type String>]
        rules: [{
          [defaults]: <Recommended Rule Value Object>
          is_known: <litd Knows the Rule Bool>
          [max_value]: <Maximum Rule Value Object>
          [min_value]: <Minimum Rule Value Object>
          name: <Rule Name String>
        }]
      }]
    }

Example:

```js
import {getAutopilotFeatures} from 'litterm';

const {features} = await getAutopilotFeatures({litd});
```

### getAutopilotSessions

Get all Autopilot sessions

Requires `autopilot:read` permission

    {
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      sessions: [{
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
      }]
    }

Example:

```js
import {getAutopilotSessions} from 'litterm';

const {sessions} = await getAutopilotSessions({litd});
```

### getFirewallActions

Get the actions that the firewall recorded, newest first

litd records actions depending on `firewall.request-logger.level`

Requires `actions:read` permission

Use the `next` token with the same filters to get the next page

    {
      [actor]: <Actor Name String>
      [created_after]: <Attempted After ISO 8601 Date String>
      [created_before]: <Attempted Before ISO 8601 Date String>
      [feature]: <Feature Name String>
      [group_id]: <Session Group Id Hex String>
      [limit]: <Page Result Limit Number>
      litd: <Authenticated litd API Object>
      [method]: <RPC Method URI String>
      [session_id]: <Session Id Hex String>
      [state]: <Action State String> // done, error, pending
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      actions: [{
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
      }]
      [next]: <Next Opaque Paging Token String>
    }

Example:

```js
import {getFirewallActions} from 'litterm';

const {actions, next} = await getFirewallActions({litd, limit: 10});

// Get the next page with the same filters
const page2 = await getFirewallActions({litd, token: next});
```

### getPrivacyMapValue

Get the real value of a pseudo value in a privacy map, or the reverse

By default the input is a pseudo value and the output is the real value

Requires `privacymap:read` permission

    {
      group_id: <Session Group Id Hex String>
      input: <Real or Pseudo Value String>
      [is_real_to_pseudo]: <Input Is a Real Value Bool>
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      output: <Pseudo or Real Value String>
    }

Example:

```js
import {getPrivacyMapValue} from 'litterm';

const {output} = await getPrivacyMapValue({litd, group_id, input: pseudoValue});
```

### getSessions

Get all Lightning Node Connect sessions

Requires `sessions:read` permission

    {
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      sessions: [{
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
      }]
    }

Example:

```js
import {getSessions} from 'litterm';

const {sessions} = await getSessions({litd});
```

### getSubServerStatus

Get the status of each litd sub-server

This method does not need a macaroon

    {
      litd: <Authenticated or Unauthenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      sub_servers: [{
        [error]: <Start Error String>
        is_disabled: <Sub-Server Is Disabled Bool>
        is_running: <Sub-Server Is Running Bool>
        name: <Sub-Server Name String>
        [status]: <Custom Status String>
      }]
    }

Example:

```js
import {getSubServerStatus} from 'litterm';

const {sub_servers} = await getSubServerStatus({litd});

const isLndRunning = sub_servers.find(n => n.name === 'lnd')?.is_running;
```

### getTerminalInfo

Get the version of litd

Requires `proxy:read` permission

    {
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise
    {
      commit_hash: <Build Commit Hash String>
      version: <litd Version String>
    }

Example:

```js
import {getTerminalInfo} from 'litterm';

const {version} = await getTerminalInfo({litd});
```

### removeAccount

Remove an account

Requires `account:write` permission

An `id` or a `label` is required, not both

    {
      [id]: <Account Id Hex String>
      [label]: <Account Label String>
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise

Example:

```js
import {removeAccount} from 'litterm';

await removeAccount({litd, label: 'alice'});
```

### revokeAutopilotSession

Revoke an Autopilot session

litd also stops the session if it is active

Requires `autopilot:write` permission

    {
      litd: <Authenticated litd API Object>
      public_key: <Session Local Static Public Key Hex String>
    }

    @returns via cbk or Promise

Example:

```js
import {revokeAutopilotSession} from 'litterm';

await revokeAutopilotSession({litd, public_key: session.public_key});
```

### revokeSession

Revoke a Lightning Node Connect session

litd also stops the session if it is active

Requires `sessions:write` permission

    {
      litd: <Authenticated litd API Object>
      public_key: <Session Local Static Public Key Hex String>
    }

    @returns via cbk or Promise

Example:

```js
import {revokeSession} from 'litterm';

await revokeSession({litd, public_key: session.public_key});
```

### stopTerminal

Stop litd

litd stops the daemons that it runs in integrated mode

Requires `proxy:write` permission

    {
      litd: <Authenticated litd API Object>
    }

    @returns via cbk or Promise

Example:

```js
import {stopTerminal} from 'litterm';

await stopTerminal({litd});
```

### updateAccount

Update the expiry or the label of an account

Use `creditAccount` or `debitAccount` to change the balance

Requires `account:write` permission

An `id` or a `label` is required, not both

`new_label` needs litd v0.17.0 or later. Older litd versions ignore it.

    {
      [expires_at]: <Account Expires At ISO 8601 Date String>
      [id]: <Account Id Hex String>
      [is_expiry_removed]: <Remove the Account Expiry Bool>
      [label]: <Account Label String>
      litd: <Authenticated litd API Object>
      [new_label]: <New Account Label String>
    }

    @returns via cbk or Promise
    {
      balance: <Current Balance Tokens Number>
      [expires_at]: <Account Expires At ISO 8601 Date String>
      id: <Account Id Hex String>
      initial_balance: <Initial Balance Tokens Number>
      invoices: [{
        id: <Invoice Payment Hash Hex String>
      }]
      [label]: <Account Label String>
      payments: [{
        id: <Payment Hash Hex String>
        is_confirmed: <Payment Is Confirmed Bool>
        is_failed: <Payment Failed Bool>
        is_pending: <Payment Is Pending Bool>
        tokens: <Reserved Tokens Including the Fee Limit Number>
      }]
      updated_at: <Account Updated At ISO 8601 Date String>
    }

Example:

```js
import {updateAccount} from 'litterm';

const account = await updateAccount({litd, label: 'alice', new_label: 'bob'});
```

## Errors

Methods return errors as arrays: `[code, 'ErrorMessage', {err}]`.

- `400`: An argument is not correct.
- `403`: The macaroon does not have the permission for the method.
- `404`: litd does not have the item.
- `409`: The item already exists, for example an account label.
- `501`: litd does not have the feature, for example autopilot is off.
- `503`: litd returned an error, or litd is not available.

## Development

    pnpm install
    pnpm test
    pnpm lint
    pnpm build

To copy the protos of a different litd release into `protos/`:

    pnpm sync-protos v0.17.6
