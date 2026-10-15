import type {LitdError} from '../typescript/index.js';

const knownErrors: {details: string; error: LitdError}[] = [
  {details: 'account not found', error: [404, 'AccountNotFound']},
  {
    details: 'unable to find account with label',
    error: [404, 'AccountNotFound'],
  },
  {
    details: 'account label uniqueness constraint violation',
    error: [409, 'AccountWithLabelAlreadyExists'],
  },
  {
    details: 'can be mistaken for an account ID',
    error: [400, 'ExpectedLabelNotFormattedAsAccountId'],
  },
  {
    details: 'resulting balance would be below 0',
    error: [400, 'InsufficientAccountBalanceForDebit'],
  },
  {
    details: "would exceed the node's available local channel balance",
    error: [503, 'AccountBalancesExceedLocalChannelBalance'],
  },
  {
    details: 'the account service has been stopped',
    error: [503, 'AccountServiceIsStopped'],
  },
];

/** Known error from an accounts RPC error

  {
    [err]: {
      [details]: <gRPC Status Details String>
    }
  }

  @returns
  <Known Error Array> or <Undefined>
*/
export default ({err}: {err?: {details?: unknown} | null}) => {
  // Exit early when there is no error
  if (!err) {
    return undefined;
  }

  const details = String(err.details);

  return knownErrors.find(known => details.includes(known.details))?.error;
};
