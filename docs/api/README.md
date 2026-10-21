# API

Each method takes a `litd` object. Refer to [Authentication](../authentication.md). Each method returns a Promise, or calls a callback if you give one. Refer to [Usage](../usage.md).

## [Accounts](accounts.md)

An account limits the tokens that its macaroon can spend off-chain.

- [createAccount](accounts.md#createaccount): Create an account
- [creditAccount](accounts.md#creditaccount): Increase the balance of an account
- [debitAccount](accounts.md#debitaccount): Decrease the balance of an account
- [getAccount](accounts.md#getaccount): Get an account
- [getAccountPayments](accounts.md#getaccountpayments): Get the payments of an account, in payment hash order
- [getAccounts](accounts.md#getaccounts): Get all accounts
- [removeAccount](accounts.md#removeaccount): Remove an account
- [updateAccount](accounts.md#updateaccount): Update the expiry or the label of an account

## [Autopilot](autopilot.md)

Autopilot sessions let the Lightning Terminal Autopilot server manage the node, with firewall rules that limit what it can do.

- [createAutopilotSession](autopilot.md#createautopilotsession): Create an Autopilot session and register it with the Autopilot server
- [getAutopilotFeatures](autopilot.md#getautopilotfeatures): Get the features that the Autopilot server offers
- [getAutopilotSessions](autopilot.md#getautopilotsessions): Get all Autopilot sessions
- [revokeAutopilotSession](autopilot.md#revokeautopilotsession): Revoke an Autopilot session

## [Asset Channels](asset-channels.md)

These methods get Taproot Assets channel data from lnd. They use lnd from `litd.lnd`. Refer to [Authentication](../authentication.md#lnd-for-asset-channel-methods).

- [getAssetChannelBalance](asset-channels.md#getassetchannelbalance): Get the Taproot Assets balances of the open and pending channels
- [getAssetChannels](asset-channels.md#getassetchannels): Get the open channels that hold Taproot Assets

## [Firewall](firewall.md)

The litd firewall records the actions of sessions, and keeps the privacy maps of sessions.

- [getFirewallActions](firewall.md#getfirewallactions): Get the actions that the firewall recorded, newest first
- [getPrivacyMapValue](firewall.md#getprivacymapvalue): Get the real value of a pseudo value in a privacy map, or the reverse

## [Proxy](proxy.md)

These methods get information about litd, make super macaroons, and stop litd.

- [createSuperMacaroon](proxy.md#createsupermacaroon): Create a super macaroon
- [getTerminalInfo](proxy.md#getterminalinfo): Get the version of litd
- [stopTerminal](proxy.md#stopterminal): Stop litd

## [Sessions](sessions.md)

Lightning Node Connect sessions let a remote app connect to the node.

- [createSession](sessions.md#createsession): Create a Lightning Node Connect session
- [getSessions](sessions.md#getsessions): Get all Lightning Node Connect sessions
- [revokeSession](sessions.md#revokesession): Revoke a Lightning Node Connect session

## [Status](status.md)

The status of the litd subservers. You can use this method without a macaroon. Refer to [Authentication](../authentication.md#connect-without-a-macaroon).

- [getSubServerStatus](status.md#getsubserverstatus): Get the status of each litd sub-server
