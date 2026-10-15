import type {AuthenticatedLitd} from '../litd_grpc/types.js';

/** [Status Code Number, Error Message String, Error Details Object] */
export type LitdError<TDetails = {err: unknown}> =
  | [number, string]
  | [number, string, TDetails];

export type LitdCallback<TResult> = (
  err: LitdError | null | undefined,
  res?: TResult,
) => void;

/** A method returns a Promise, or calls back when it gets a callback */
export type LitdMethod<TArgs, TResult> = {
  (args: TArgs): Promise<TResult>;
  (args: TArgs, cbk: LitdCallback<TResult>): void;
};

export type AuthenticatedLitdArgs<TArgs = object> = TArgs & {
  /** Authenticated litd API Object */
  litd: AuthenticatedLitd;
};
