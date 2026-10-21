# Status

The status of the litd subservers. You can use this method without a macaroon. Refer to [Authentication](../authentication.md#connect-without-a-macaroon).

- [getSubServerStatus](#getsubserverstatus): Get the status of each litd sub-server

## getSubServerStatus

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
