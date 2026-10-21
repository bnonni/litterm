# Errors

A method that fails gives an error array:

    [code, 'ErrorMessage', {err}]

- `code`: a status code number. The codes are the same as HTTP status codes.
- `'ErrorMessage'`: a PascalCase string, for example `AccountNotFound`.
- `{err}`: an optional object with details, for example the gRPC error from
  litd.

With a Promise, the method rejects with the array. With a callback, the method
gives the array as the first argument of the callback.

```js
import {getAccount} from 'litterm';

try {
  await getAccount({litd, label: 'alice'});
} catch (err) {
  const [code, message] = err;

  if (code === 404) {
    console.log(message); // AccountNotFound
  }
}
```

## Codes

- `400`: An argument is not correct.
- `403`: The macaroon does not have the permission for the method.
- `404`: litd does not have the item.
- `409`: The item already exists, for example an account label.
- `501`: litd does not have the feature or the RPC, for example autopilot is
  off, or litd is older than the method needs.
- `503`: litd or lnd returned an error, or litd or lnd is not available.
