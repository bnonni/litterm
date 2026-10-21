# Accounts

An account limits the tokens that its macaroon can spend off-chain.

- [createAccount](#createaccount): Create an account
- [creditAccount](#creditaccount): Increase the balance of an account
- [debitAccount](#debitaccount): Decrease the balance of an account
- [getAccount](#getaccount): Get an account
- [getAccountPayments](#getaccountpayments): Get the payments of an account, in payment hash order
- [getAccounts](#getaccounts): Get all accounts
- [removeAccount](#removeaccount): Remove an account
- [updateAccount](#updateaccount): Update the expiry or the label of an account

## createAccount

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

## creditAccount

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

## debitAccount

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

## getAccount

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

## getAccountPayments

Get the payments of an account, in payment hash order

Requires `account:read` permission

An `id` or a `label` is required, not both

The maximum `limit` is 50. The default `limit` is 20.

Use the `next` token to get the next page. A `limit` and a `token` are not
supported together.

This method needs litd v0.17.1 or later

If lnd does not know an account payment, its hash is in `missing_payments`

The payment fields are the same as in lightning getPayments

    {
      [id]: <Account Id Hex String>
      [label]: <Account Label String>
      [limit]: <Page Result Limit Number>
      litd: <Authenticated litd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      missing_payments: [{
        id: <Payment Hash Hex String>
      }]
      [next]: <Next Opaque Paging Token String>
      payments: [{
        attempts: [<lightning Payment Attempt Object>]
        [confirmed_at]: <Payment Confirmed At ISO 8601 Date String>
        created_at: <Payment at ISO-8601 Date String>
        [destination]: <Destination Node Public Key Hex String>
        [fee]: <Paid Routing Fee Rounded Down Tokens Number>
        [fee_mtokens]: <Paid Routing Fee in Millitokens String>
        hops: [<First Route Hop Public Key Hex String>]
        id: <Payment Preimage Hash String>
        [index]: <Payment Add Index Number>
        is_confirmed: <Payment is Confirmed Bool>
        is_outgoing: <Transaction Is Outgoing Bool>
        mtokens: <Millitokens Sent to Destination String>
        [request]: <BOLT 11 Payment Request String>
        [safe_fee]: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        [secret]: <Payment Preimage Hex String>
        tokens: <Rounded Down Tokens Sent to Destination Number>
      }]
    }

Example:

```js
import {getAccountPayments} from 'litterm';

const {payments} = await getAccountPayments({litd, label: 'alice'});
```

## getAccounts

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

## removeAccount

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

## updateAccount

Update the expiry or the label of an account

Use `creditAccount` or `debitAccount` to change the balance

Requires `account:write` permission

An `id` or a `label` is required, not both

An `expires_at`, an `is_expiry_removed`, or a `new_label` is required. Do
not use `expires_at` with `is_expiry_removed`.

A `new_label` must be unique and must not look like an account id

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
