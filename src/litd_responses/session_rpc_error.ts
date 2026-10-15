import type {LitdError} from '../typescript/index.js';

const knownErrors: {details: string; error: LitdError}[] = [
  {details: 'session not found', error: [404, 'SessionNotFound']},
  {details: 'unknown group', error: [404, 'SessionGroupNotFound']},
  {details: 'account not found', error: [404, 'AccountNotFound']},
  {
    details: 'expiry must be in the future',
    error: [400, 'ExpectedFutureExpiryForSession'],
  },
  {
    details: 'is unknown to LiT',
    error: [400, 'ExpectedKnownUriInSessionPermissions'],
  },
  {
    details: 'is not a features provided by the Autopilot server',
    error: [400, 'ExpectedKnownAutopilotFeature'],
  },
  {details: 'is not a known rule', error: [400, 'ExpectedKnownAutopilotRule']},
  {
    details: 'can not link to session',
    error: [400, 'ExpectedFirstSessionInGroupToLinkSession'],
  },
  {
    details: 'error registering session with autopilot server',
    error: [503, 'FailedToRegisterSessionWithAutopilotServer'],
  },
];

/** Known error from a sessions or autopilot RPC error

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
