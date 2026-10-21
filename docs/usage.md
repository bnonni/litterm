# Usage

## Promises and Callbacks

Each method takes one object of arguments and returns a Promise:

```js
import {getAccounts} from 'litterm';

const {accounts} = await getAccounts({litd});
```

If you give a callback as the second argument, the method calls the callback
instead:

```js
getAccounts({litd}, (err, res) => {
  if (!!err) {
    return console.error(err);
  }

  return console.log(res.accounts);
});
```

## Arguments and Results

The [API reference](api/README.md) shows the arguments and the result of each
method. A key in brackets, for example `[label]`, is optional. If the method
has no value for an optional key in a result, the key is `undefined`.

The values use these types:

- Keys are snake_case.
- Tokens (sats) are numbers.
- Asset units are numeric strings, because Taproot Assets uses 64-bit
  amounts.
- Dates are ISO 8601 strings.
- Ids, keys, and hashes are hex strings. Macaroons are base64 strings.

`getAccountPayments` and `getAssetChannels` map lnd data with the mappers of
[lightning](https://github.com/alexbosworth/lightning). These results use the
lightning shapes.

## Errors

A method that fails gives an error array, for example
`[404, 'AccountNotFound']`. Refer to [Errors](errors.md).

## TypeScript

litterm includes TypeScript types. For each method, the package exports the
type of the arguments, for example `CreateAccountArgs`. If the method returns
data, the package also exports the type of the result, for example
`CreateAccountResult`.

```ts
import {createAccount} from 'litterm';
import type {CreateAccountArgs} from 'litterm';

const args: CreateAccountArgs = {litd, label: 'alice', tokens: 100000};

const {id} = await createAccount(args);
```

The package also exports the types of shared objects: `Account`, `Action`,
`AssetChannelBalance`, `AssetGroupChannelBalance`, `AssetTranche`,
`ChannelAsset`, `Feature`, `Rule`, `RuleValue`, and `Session`.
