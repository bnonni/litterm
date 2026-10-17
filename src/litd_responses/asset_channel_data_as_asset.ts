const hexOf = (n: unknown) => (typeof n === 'string' && !!n ? n : undefined);
const {isArray} = Array;
const isHex = (n: unknown) => typeof n === 'string' && /^[0-9a-f]*$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isOutpoint = (n: unknown) =>
  typeof n === 'string' && /^[0-9a-f]{64}:\d+$/i.test(n);

type JsonTranche = {amount: string; asset_id: string};

type JsonFunding = {
  amount: string;
  asset_genesis: {
    asset_id: string;
    genesis_point: string;
    meta_hash: string;
    name: string;
  };
  decimal_display: string;
  script_key: string;
  version: string;
};

export type JsonAssetChannel = {
  capacity: string;
  funding_assets: JsonFunding[];
  group_key?: string;
  incoming_htlc_balance: string;
  incoming_htlcs: JsonTranche[] | null;
  local_assets: JsonTranche[] | null;
  local_balance: string;
  outgoing_htlc_balance: string;
  outgoing_htlcs: JsonTranche[] | null;
  remote_assets: JsonTranche[] | null;
  remote_balance: string;
  spender_leaves?: boolean;
};

export type AssetTranche = {
  /** Asset Units Numeric String */
  amount: string;
  /** Asset Id Hex String */
  asset_id: string;
};

export type ChannelAsset = {
  /** Channel Capacity Asset Units Numeric String */
  capacity: string;
  funding: {
    /** Funded Asset Units Numeric String */
    amount: string;
    /** Asset Id Hex String */
    asset_id: string;
    /** Decimal Places To Show Number */
    decimal_display: number;
    /** Genesis Point Transaction Id Hex String */
    genesis_transaction_id: string;
    /** Genesis Point Transaction Output Index Number */
    genesis_transaction_vout: number;
    /** Metadata Hash Hex String */
    meta_hash: string;
    /** Asset Name String */
    name: string;
    /** Funding Script Key Hex String */
    script_key: string;
    /** Asset Version Number */
    version: number;
  }[];
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Local Commitment Commits To Spender Leaves Bool */
  has_spender_leaves: boolean;
  /** Incoming HTLCs Asset Units Numeric String */
  incoming_htlc_balance: string;
  incoming_htlcs: AssetTranche[];
  local_assets: AssetTranche[];
  /** Local Balance Asset Units Numeric String */
  local_balance: string;
  /** Outgoing HTLCs Asset Units Numeric String */
  outgoing_htlc_balance: string;
  outgoing_htlcs: AssetTranche[];
  remote_assets: AssetTranche[];
  /** Remote Balance Asset Units Numeric String */
  remote_balance: string;
};

/** Tranches from JSON asset tranches

  [{
    amount: <Asset Units Numeric String>
    asset_id: <Asset Id Hex String>
  }]

  @throws
  <Error>

  @returns
  [{
    amount: <Asset Units Numeric String>
    asset_id: <Asset Id Hex String>
  }]
*/
const tranchesFrom = (tranches: JsonTranche[] | null): AssetTranche[] => {
  // Exit early when there are no tranches
  if (tranches === null) {
    return [];
  }

  if (!isArray(tranches)) {
    throw new Error('ExpectedArrayOfAssetTranchesInAssetChannelData');
  }

  return tranches.map(tranche => {
    if (!isNumeric(tranche?.amount)) {
      throw new Error('ExpectedTrancheAmountInAssetChannelData');
    }

    if (!isHex(tranche.asset_id)) {
      throw new Error('ExpectedTrancheAssetIdInAssetChannelData');
    }

    return {amount: tranche.amount, asset_id: tranche.asset_id};
  });
};

/** Channel asset details from the JSON custom channel data of a channel

  Numbers are numeric strings, see customChannelDataAsJson

  {
    capacity: <Channel Capacity Asset Units Numeric String>
    funding_assets: [{
      amount: <Funded Asset Units Numeric String>
      asset_genesis: {
        asset_id: <Asset Id Hex String>
        genesis_point: <Genesis Outpoint String>
        meta_hash: <Metadata Hash Hex String>
        name: <Asset Name String>
      }
      decimal_display: <Decimal Places To Show Numeric String>
      script_key: <Funding Script Key Hex String>
      version: <Asset Version Numeric String>
    }]
    [group_key]: <Asset Group Key Hex String>
    incoming_htlc_balance: <Incoming HTLCs Asset Units Numeric String>
    incoming_htlcs: [<JSON Asset Tranche Object>]
    local_assets: [<JSON Asset Tranche Object>]
    local_balance: <Local Balance Asset Units Numeric String>
    outgoing_htlc_balance: <Outgoing HTLCs Asset Units Numeric String>
    outgoing_htlcs: [<JSON Asset Tranche Object>]
    remote_assets: [<JSON Asset Tranche Object>]
    remote_balance: <Remote Balance Asset Units Numeric String>
    [spender_leaves]: <Local Commitment Commits To Spender Leaves Bool>
  }

  @throws
  <Error>

  @returns
  {
    capacity: <Channel Capacity Asset Units Numeric String>
    funding: [{
      amount: <Funded Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      decimal_display: <Decimal Places To Show Number>
      genesis_transaction_id: <Genesis Point Transaction Id Hex String>
      genesis_transaction_vout: <Genesis Point Transaction Output Index Number>
      meta_hash: <Metadata Hash Hex String>
      name: <Asset Name String>
      script_key: <Funding Script Key Hex String>
      version: <Asset Version Number>
    }]
    [group_key]: <Asset Group Key Hex String>
    has_spender_leaves: <Local Commitment Commits To Spender Leaves Bool>
    incoming_htlc_balance: <Incoming HTLCs Asset Units Numeric String>
    incoming_htlcs: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
    }]
    local_assets: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
    }]
    local_balance: <Local Balance Asset Units Numeric String>
    outgoing_htlc_balance: <Outgoing HTLCs Asset Units Numeric String>
    outgoing_htlcs: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
    }]
    remote_assets: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
    }]
    remote_balance: <Remote Balance Asset Units Numeric String>
  }
*/
export default (data?: JsonAssetChannel | null): ChannelAsset => {
  if (!data) {
    throw new Error('ExpectedAssetChannelData');
  }

  const balances = [
    data.capacity,
    data.incoming_htlc_balance,
    data.local_balance,
    data.outgoing_htlc_balance,
    data.remote_balance,
  ];

  if (!balances.every(isNumeric)) {
    throw new Error('ExpectedAssetBalancesInAssetChannelData');
  }

  if (!isArray(data.funding_assets)) {
    throw new Error('ExpectedFundingAssetsInAssetChannelData');
  }

  if (data.group_key !== undefined && !isHex(data.group_key)) {
    throw new Error('ExpectedHexGroupKeyInAssetChannelData');
  }

  const funding = data.funding_assets.map(asset => {
    const genesis = asset?.asset_genesis;

    if (!isNumeric(asset?.amount)) {
      throw new Error('ExpectedFundingAmountInAssetChannelData');
    }

    if (!genesis || !isHex(genesis.asset_id) || !isHex(genesis.meta_hash)) {
      throw new Error('ExpectedFundingGenesisInAssetChannelData');
    }

    if (typeof genesis.name !== 'string') {
      throw new Error('ExpectedFundingAssetNameInAssetChannelData');
    }

    if (!isOutpoint(genesis.genesis_point)) {
      throw new Error('ExpectedFundingGenesisPointInAssetChannelData');
    }

    if (!isNumeric(asset.decimal_display) || !isNumeric(asset.version)) {
      throw new Error('ExpectedFundingAssetDetailsInAssetChannelData');
    }

    if (!isHex(asset.script_key)) {
      throw new Error('ExpectedFundingScriptKeyInAssetChannelData');
    }

    const [transactionId = '', vout] = genesis.genesis_point.split(':');

    return {
      amount: asset.amount,
      asset_id: genesis.asset_id,
      decimal_display: Number(asset.decimal_display),
      genesis_transaction_id: transactionId,
      genesis_transaction_vout: Number(vout),
      meta_hash: genesis.meta_hash,
      name: genesis.name,
      script_key: asset.script_key,
      version: Number(asset.version),
    };
  });

  return {
    capacity: data.capacity,
    funding,
    group_key: hexOf(data.group_key),
    has_spender_leaves: data.spender_leaves === true,
    incoming_htlc_balance: data.incoming_htlc_balance,
    incoming_htlcs: tranchesFrom(data.incoming_htlcs),
    local_assets: tranchesFrom(data.local_assets),
    local_balance: data.local_balance,
    outgoing_htlc_balance: data.outgoing_htlc_balance,
    outgoing_htlcs: tranchesFrom(data.outgoing_htlcs),
    remote_assets: tranchesFrom(data.remote_assets),
    remote_balance: data.remote_balance,
  };
};
