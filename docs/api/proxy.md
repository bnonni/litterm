# Proxy

These methods get information about litd, make super macaroons, and stop litd.

- [createSuperMacaroon](#createsupermacaroon): Create a super macaroon
- [getTerminalInfo](#getterminalinfo): Get the version of litd
- [stopTerminal](#stopterminal): Stop litd

## createSuperMacaroon

Create a super macaroon

A super macaroon has the permissions of each active daemon that litd runs
or connects to

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

## getTerminalInfo

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

## stopTerminal

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
