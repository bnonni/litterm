# Autopilot

Autopilot sessions let the Lightning Terminal Autopilot server manage the node, with firewall rules that limit what it can do.

- [createAutopilotSession](#createautopilotsession): Create an Autopilot session and register it with the Autopilot server
- [getAutopilotFeatures](#getautopilotfeatures): Get the features that the Autopilot server offers
- [getAutopilotSessions](#getautopilotsessions): Get all Autopilot sessions
- [revokeAutopilotSession](#revokeautopilotsession): Revoke an Autopilot session

## createAutopilotSession

Create an Autopilot session and register it with the Autopilot server

Requires `autopilot:write` permission

Feature `rules` override the rule values that the Autopilot server
recommends. A feature rule value must be between the `min_value` and the
`max_value` of the rule in getAutopilotFeatures.

litd v0.17.6 ignores session `rules`

A rule has a `name` and one rule value, for example:
`{name: 'rate-limit', rate_limit: {read_limit: {hours, iterations}}}`

Rule values that are not present are zero

The default privacy flags are the flags of the features

The `expires_at` date must be in the future

Each feature `name` must be unique

A feature `config` must be a JSON object. `{}` sends no configuration.

Do not use `privacy_flags` with `is_privacy_disabled`

A `linked_group_id` must be the 4 byte id of the first session in its
group. Each session in that group must be revoked or expired.

The default `mailbox_server` is `mailbox.terminal.lightning.today:443`

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

## getAutopilotFeatures

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

## getAutopilotSessions

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

## revokeAutopilotSession

Revoke an Autopilot session

litd also stops the session if it is active

The session must be an Autopilot session. Use revokeSession for other
sessions.

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
