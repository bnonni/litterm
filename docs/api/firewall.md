# Firewall

The litd firewall records the actions of sessions, and keeps the privacy maps of sessions.

- [getFirewallActions](#getfirewallactions): Get the actions that the firewall recorded, newest first
- [getPrivacyMapValue](#getprivacymapvalue): Get the real value of a pseudo value in a privacy map, or the reverse

## getFirewallActions

Get the actions that the firewall recorded, newest first

litd records actions depending on `firewall.request-logger.level`

Requires `actions:read` permission

Use the `next` token with the same filters to get the next page. A `limit`
and a `token` are not supported together. The default `limit` is 100.

A `group_id` or a `session_id` is a filter, but not both. Each id is 4 byte
hex.

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

## getPrivacyMapValue

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
