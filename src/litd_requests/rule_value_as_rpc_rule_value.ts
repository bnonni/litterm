import type {RuleValue} from '../litd_responses/index.js';

const blockShift = BigInt(40);
const {isArray} = Array;
const isChannel = (n: unknown) => /^\d+x\d+x\d+$/.test(String(n));
const isDate = (n: string) => Date.parse(n) > 0;
const isMtokens = (n: unknown): n is string =>
  typeof n === 'string' && /^\d+$/.test(n);
const isPublicKey = (n: unknown) => /^0[23][0-9A-F]{64}$/i.test(String(n));
const {isSafeInteger} = Number;
const {keys} = Object;
const msPerSecond = 1e3;
const txShift = BigInt(16);
const valueTypes = [
  'channel_constraint',
  'channel_policy_bounds',
  'channel_restrict',
  'history_limit',
  'off_chain_budget',
  'on_chain_budget',
  'peer_restrict',
  'rate_limit',
  'send_to_self',
];

type DeepPartial<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends unknown[]
    ? T[K]
    : NonNullable<T[K]> extends object
      ? DeepPartial<NonNullable<T[K]>>
      : T[K];
};

export type RuleValueArgs = DeepPartial<RuleValue>;

/** Numeric channel id from a standard format channel id

  <Standard Format Channel Id String>

  @returns
  <Numeric Channel Id String>
*/
const idFromChannel = (channel: string) => {
  const [block, index, output] = channel.split('x').map(BigInt);

  return ((block << blockShift) | (index << txShift) | output).toString();
};

const count = (n: unknown) => {
  if (n !== undefined && (!isSafeInteger(n) || (n as number) < 0)) {
    throw new Error('ExpectedNonNegativeIntegerInRuleValue');
  }

  return (n as number | undefined) || 0;
};

const mtokens = (n: unknown) => {
  // Exit early when there is no value
  if (n === undefined) {
    return '0';
  }

  if (!isMtokens(n)) {
    throw new Error('ExpectedNumericMillitokensStringInRuleValue');
  }

  return n;
};

const rate = (n?: {hours?: number; iterations?: number}) => ({
  iterations: count(n?.iterations),
  num_hours: count(n?.hours),
});

/** RPC rule value from a rule value

  Values that are not present are zero

  {
    [channel_constraint]: {
      [is_private_allowed]: <Private Channels Are Allowed Bool>
      [is_public_allowed]: <Public Channels Are Allowed Bool>
      [max_capacity]: <Maximum Channel Capacity Tokens Number>
      [max_give_tokens]: <Maximum Pushed Tokens Number>
      [min_capacity]: <Minimum Channel Capacity Tokens Number>
    }
    [channel_policy_bounds]: {
      [max_base_fee_mtokens]: <Maximum Base Fee Millitokens String>
      [max_cltv_delta]: <Maximum CLTV Delta Number>
      [max_fee_rate]: <Maximum Fee Rate Parts Per Million Number>
      [max_htlc_mtokens]: <Maximum HTLC Millitokens String>
      [min_base_fee_mtokens]: <Minimum Base Fee Millitokens String>
      [min_cltv_delta]: <Minimum CLTV Delta Number>
      [min_fee_rate]: <Minimum Fee Rate Parts Per Million Number>
      [min_htlc_mtokens]: <Minimum HTLC Millitokens String>
    }
    [channel_restrict]: {
      channels: [<Standard Format Channel Id String>]
    }
    [history_limit]: {
      [duration]: <Maximum Query Duration Seconds Number>
      [start_at]: <No History Before ISO 8601 Date String>
    }
    [off_chain_budget]: {
      [max_fee_mtokens]: <Maximum Fees Millitokens String>
      [max_mtokens]: <Maximum Spend Millitokens, Excluding Fees String>
    }
    [on_chain_budget]: {
      [max_tokens]: <Maximum Spend Tokens, Including Fees Number>
      [max_tokens_per_vbyte]: <Maximum Fee Tokens Per Virtual Byte Number>
    }
    [peer_restrict]: {
      public_keys: [<Peer Public Key Hex String>]
    }
    [rate_limit]: {
      [read_limit]: {
        [hours]: <Number of Hours in the Period Number>
        [iterations]: <Allowed Calls in the Period Number>
      }
      [write_limit]: {
        [hours]: <Number of Hours in the Period Number>
        [iterations]: <Allowed Calls in the Period Number>
      }
    }
    [send_to_self]: {}
  }

  @throws
  <Error>

  @returns
  <RPC Rule Value Object>
*/
export default (value: RuleValueArgs) => {
  const types = keys(value || {}).filter(n => valueTypes.includes(n));

  if (types.length !== 1) {
    throw new Error('ExpectedOneRuleValueTypeInRuleValue');
  }

  const [type] = types as (keyof RuleValueArgs)[];

  switch (type) {
    case 'channel_constraint': {
      const n = value.channel_constraint!;

      return {
        channel_constraint: {
          max_capacity_sat: count(n.max_capacity),
          max_push_sat: count(n.max_give_tokens),
          min_capacity_sat: count(n.min_capacity),
          private_allowed: !!n.is_private_allowed,
          public_allowed: !!n.is_public_allowed,
        },
      };
    }

    case 'channel_policy_bounds': {
      const n = value.channel_policy_bounds!;

      return {
        chan_policy_bounds: {
          max_base_msat: mtokens(n.max_base_fee_mtokens),
          max_cltv_delta: count(n.max_cltv_delta),
          max_htlc_msat: mtokens(n.max_htlc_mtokens),
          max_rate_ppm: count(n.max_fee_rate),
          min_base_msat: mtokens(n.min_base_fee_mtokens),
          min_cltv_delta: count(n.min_cltv_delta),
          min_htlc_msat: mtokens(n.min_htlc_mtokens),
          min_rate_ppm: count(n.min_fee_rate),
        },
      };
    }

    case 'channel_restrict': {
      const {channels} = value.channel_restrict!;

      if (!isArray(channels) || !channels.every(isChannel)) {
        throw new Error('ExpectedStandardFormatChannelIdsInChannelRestrict');
      }

      return {channel_restrict: {channel_ids: channels.map(idFromChannel)}};
    }

    case 'history_limit': {
      const n = value.history_limit!;

      if (n.start_at !== undefined && !isDate(n.start_at)) {
        throw new Error('ExpectedValidStartDateInHistoryLimitRule');
      }

      const start = !!n.start_at ? Date.parse(n.start_at) / msPerSecond : 0;

      return {
        history_limit: {
          duration: count(n.duration),
          start_time: Math.floor(start),
        },
      };
    }

    case 'off_chain_budget': {
      const n = value.off_chain_budget!;

      return {
        off_chain_budget: {
          max_amt_msat: mtokens(n.max_mtokens),
          max_fees_msat: mtokens(n.max_fee_mtokens),
        },
      };
    }

    case 'on_chain_budget': {
      const n = value.on_chain_budget!;

      return {
        on_chain_budget: {
          absolute_amt_sats: count(n.max_tokens),
          max_sat_per_v_byte: count(n.max_tokens_per_vbyte),
        },
      };
    }

    case 'peer_restrict': {
      const publicKeys = value.peer_restrict!.public_keys;

      if (!isArray(publicKeys) || !publicKeys.every(isPublicKey)) {
        throw new Error('ExpectedPeerPublicKeysInPeerRestrictRule');
      }

      return {peer_restrict: {peer_ids: publicKeys}};
    }

    case 'rate_limit': {
      const n = value.rate_limit!;

      return {
        rate_limit: {
          read_limit: rate(n.read_limit),
          write_limit: rate(n.write_limit),
        },
      };
    }

    case 'send_to_self':
      return {send_to_self: {}};
  }

  throw new Error('ExpectedKnownRuleValueTypeInRuleValue');
};
