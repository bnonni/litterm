const blockShift = BigInt(40);
const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const indexMask = BigInt(0xffffff);
const {isArray} = Array;
const outputMask = BigInt(0xffff);
const txShift = BigInt(16);
const zero = '0';

type Rate = {
  /** Number of Hours in the Period */
  hours: number;
  /** Allowed Calls in the Period */
  iterations: number;
};

export type RuleValue = {
  channel_constraint?: {
    /** Private Channels Are Allowed */
    is_private_allowed: boolean;
    /** Public Channels Are Allowed */
    is_public_allowed: boolean;
    /** Maximum Channel Capacity Tokens */
    max_capacity: number;
    /** Maximum Pushed Tokens */
    max_give_tokens: number;
    /** Minimum Channel Capacity Tokens */
    min_capacity: number;
  };
  channel_policy_bounds?: {
    /** Maximum Base Fee Millitokens */
    max_base_fee_mtokens: string;
    /** Maximum CLTV Delta */
    max_cltv_delta: number;
    /** Maximum Fee Rate Parts Per Million */
    max_fee_rate: number;
    /** Maximum HTLC Millitokens */
    max_htlc_mtokens: string;
    /** Minimum Base Fee Millitokens */
    min_base_fee_mtokens: string;
    /** Minimum CLTV Delta */
    min_cltv_delta: number;
    /** Minimum Fee Rate Parts Per Million */
    min_fee_rate: number;
    /** Minimum HTLC Millitokens */
    min_htlc_mtokens: string;
  };
  channel_restrict?: {
    /** Standard Format Channel Ids */
    channels: string[];
  };
  history_limit?: {
    /** Maximum Query Duration Seconds */
    duration?: number;
    /** No History Before ISO 8601 Date */
    start_at?: string;
  };
  off_chain_budget?: {
    /** Maximum Fees Millitokens */
    max_fee_mtokens: string;
    /** Maximum Spend Millitokens, Excluding Fees */
    max_mtokens: string;
  };
  on_chain_budget?: {
    /** Maximum Spend Tokens, Including Fees */
    max_tokens: number;
    /** Maximum Fee Tokens Per Virtual Byte */
    max_tokens_per_vbyte: number;
  };
  peer_restrict?: {
    /** Peer Public Keys Hex */
    public_keys: string[];
  };
  rate_limit?: {
    read_limit: Rate;
    write_limit: Rate;
  };
  send_to_self?: {};
};

/** Standard format channel id from a numeric channel id

  <Numeric Channel Id String>

  @returns
  <Standard Format Channel Id String>
*/
const channelFromId = (id: string) => {
  const number = BigInt(id);

  const block = number >> blockShift;
  const index = (number >> txShift) & indexMask;
  const output = number & outputMask;

  return `${block}x${index}x${output}`;
};

const rate = (n: any): Rate => ({
  hours: Number(n?.num_hours || 0),
  iterations: Number(n?.iterations || 0),
});

/** Rule value from an RPC rule value

  {
    [channel_constraint]: {
      max_capacity_sat: <Maximum Capacity Satoshis Numeric String>
      max_push_sat: <Maximum Push Satoshis Numeric String>
      min_capacity_sat: <Minimum Capacity Satoshis Numeric String>
      private_allowed: <Private Channels Are Allowed Bool>
      public_allowed: <Public Channels Are Allowed Bool>
    }
    [chan_policy_bounds]: {
      max_base_msat: <Maximum Base Fee Millisatoshis Numeric String>
      max_cltv_delta: <Maximum CLTV Delta Number>
      max_htlc_msat: <Maximum HTLC Millisatoshis Numeric String>
      max_rate_ppm: <Maximum Fee Rate Number>
      min_base_msat: <Minimum Base Fee Millisatoshis Numeric String>
      min_cltv_delta: <Minimum CLTV Delta Number>
      min_htlc_msat: <Minimum HTLC Millisatoshis Numeric String>
      min_rate_ppm: <Minimum Fee Rate Number>
    }
    [channel_restrict]: {
      channel_ids: [<Numeric Channel Id String>]
    }
    [history_limit]: {
      duration: <Duration Seconds Numeric String>
      start_time: <Start Unix Seconds Numeric String>
    }
    [off_chain_budget]: {
      max_amt_msat: <Maximum Spend Millisatoshis Numeric String>
      max_fees_msat: <Maximum Fees Millisatoshis Numeric String>
    }
    [on_chain_budget]: {
      absolute_amt_sats: <Maximum Spend Satoshis Numeric String>
      max_sat_per_v_byte: <Maximum Fee Rate Numeric String>
    }
    [peer_restrict]: {
      peer_ids: [<Public Key Hex String>]
    }
    [rate_limit]: {
      read_limit: {
        iterations: <Iterations Number>
        num_hours: <Hours Number>
      }
      write_limit: {
        iterations: <Iterations Number>
        num_hours: <Hours Number>
      }
    }
    [send_to_self]: {}
    [value]: <Set Rule Value Name String>
  }

  @throws
  <Error>

  @returns
  <Rule Value Object> or <Undefined> // when no value is set
*/
export default (value?: any): RuleValue | undefined => {
  // Exit early when there is no rule value
  if (!value || !value.value) {
    return undefined;
  }

  const n = value[value.value];

  if (!n) {
    throw new Error('ExpectedRuleValueDetailsInRpcRuleValue');
  }

  switch (value.value) {
    case 'channel_constraint':
      return {
        channel_constraint: {
          is_private_allowed: !!n.private_allowed,
          is_public_allowed: !!n.public_allowed,
          max_capacity: Number(n.max_capacity_sat),
          max_give_tokens: Number(n.max_push_sat),
          min_capacity: Number(n.min_capacity_sat),
        },
      };

    case 'chan_policy_bounds':
      return {
        channel_policy_bounds: {
          max_base_fee_mtokens: String(n.max_base_msat),
          max_cltv_delta: Number(n.max_cltv_delta),
          max_fee_rate: Number(n.max_rate_ppm),
          max_htlc_mtokens: String(n.max_htlc_msat),
          min_base_fee_mtokens: String(n.min_base_msat),
          min_cltv_delta: Number(n.min_cltv_delta),
          min_fee_rate: Number(n.min_rate_ppm),
          min_htlc_mtokens: String(n.min_htlc_msat),
        },
      };

    case 'channel_restrict':
      if (!isArray(n.channel_ids)) {
        throw new Error('ExpectedChannelIdsInRpcChannelRestrictRule');
      }

      return {channel_restrict: {channels: n.channel_ids.map(channelFromId)}};

    case 'history_limit':
      return {
        history_limit: {
          duration: n.duration !== zero ? Number(n.duration) : undefined,
          start_at: n.start_time !== zero ? dateFrom(n.start_time) : undefined,
        },
      };

    case 'off_chain_budget':
      return {
        off_chain_budget: {
          max_fee_mtokens: String(n.max_fees_msat),
          max_mtokens: String(n.max_amt_msat),
        },
      };

    case 'on_chain_budget':
      return {
        on_chain_budget: {
          max_tokens: Number(n.absolute_amt_sats),
          max_tokens_per_vbyte: Number(n.max_sat_per_v_byte),
        },
      };

    case 'peer_restrict':
      if (!isArray(n.peer_ids)) {
        throw new Error('ExpectedPeerIdsInRpcPeerRestrictRule');
      }

      return {peer_restrict: {public_keys: n.peer_ids}};

    case 'rate_limit':
      return {
        rate_limit: {
          read_limit: rate(n.read_limit),
          write_limit: rate(n.write_limit),
        },
      };

    case 'send_to_self':
      return {send_to_self: {}};

    default:
      throw new Error('ExpectedKnownRuleValueTypeInRpcRuleValue');
  }
};
