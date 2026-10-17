declare module 'lightning/lnd_responses/index.js' {
  import type {GetChannelsResult} from 'lightning';
  import type {GetPaymentsResult} from 'lightning';

  /** Channel details from an lnrpc.Channel */
  export function rpcChannelAsChannel(
    channel: unknown,
  ): GetChannelsResult['channels'][number];

  /** Payment details from an lnrpc.Payment

    Throws when the payment has no preimage, for example a placeholder payment
  */
  export function rpcPaymentAsPayment(
    payment: unknown,
  ): GetPaymentsResult['payments'][number];
}
