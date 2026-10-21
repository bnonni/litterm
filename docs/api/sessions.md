# Sessions

Lightning Node Connect sessions let a remote app connect to the node.

- [createSession](#createsession): Create a Lightning Node Connect session
- [getSessions](#getsessions): Get all Lightning Node Connect sessions
- [revokeSession](#revokesession): Revoke a Lightning Node Connect session

## createSession

Create a Lightning Node Connect session

Requires `sessions:write` permission

An `account` session needs an `account_id`. Other types must not have an
`account_id`.

A `custom` session needs `permissions`. Other types must not have
`permissions`. Use the entity `uri` and a URI, a URI regular expression, or
`***readonly***` as the action, to give access to RPC methods.

litd reads an unknown URI as a regular expression. If the expression matches
no URI, the session gets no permission for it, and litd returns no error.
If the URI is not a valid regular expression, litd returns an error.
Check `macaroon_permissions` in the result.

The `expires_at` date must be in the future

The default type is `readonly`

The default `mailbox_server` is `mailbox.terminal.lightning.today:443`

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

## getSessions

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

## revokeSession

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
