const isHex = (n: unknown) => typeof n === 'string' && /^[0-9a-f]+$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isObject = (n: unknown) => !!n && typeof n === 'object';
const {keys} = Object;

type JsonBalance = {
  asset_id?: string;
  local_balance: string;
  name?: string;
  remote_balance: string;
};

type JsonBalances = Record<string, JsonBalance> | null;

export type JsonAssetChannelBalances = {
  open_channels: JsonBalances;
  open_channels_by_group?: JsonBalances;
  pending_channels: JsonBalances;
  pending_channels_by_group?: JsonBalances;
};

export type AssetChannelBalance = {
  /** Asset Id Hex String */
  asset_id: string;
  /** Local Balance Asset Units Numeric String */
  local_balance: string;
  /** Asset Name String */
  name?: string;
  /** Remote Balance Asset Units Numeric String */
  remote_balance: string;
};

export type AssetGroupChannelBalance = {
  /** Asset Group Key Hex String */
  group_key: string;
  /** Local Balance Asset Units Numeric String */
  local_balance: string;
  /** Remote Balance Asset Units Numeric String */
  remote_balance: string;
};

export type AssetChannelBalances = {
  assets: AssetChannelBalance[];
  groups: AssetGroupChannelBalance[];
  pending_assets: AssetChannelBalance[];
  pending_groups: AssetGroupChannelBalance[];
};

/** Balance entries from a JSON map of balances, in key order

  {
    <Asset Id or Group Key Hex String>: {
      local_balance: <Local Balance Asset Units Numeric String>
      remote_balance: <Remote Balance Asset Units Numeric String>
    }
  }

  @throws
  <Error>

  @returns
  [{
    key: <Asset Id or Group Key Hex String>
    local_balance: <Local Balance Asset Units Numeric String>
    [name]: <Asset Name String>
    remote_balance: <Remote Balance Asset Units Numeric String>
  }]
*/
const entriesFrom = (balances?: JsonBalances) => {
  // Exit early when there are no balances
  if (balances === null || balances === undefined) {
    return [];
  }

  if (!isObject(balances)) {
    throw new Error('ExpectedMapOfAssetBalancesInChannelBalanceData');
  }

  return keys(balances)
    .sort()
    .map(key => {
      const balance = balances[key];

      if (!isHex(key)) {
        throw new Error('ExpectedHexKeyForAssetBalanceInChannelBalanceData');
      }

      if (!isNumeric(balance?.local_balance)) {
        throw new Error('ExpectedLocalAssetBalanceInChannelBalanceData');
      }

      if (!isNumeric(balance.remote_balance)) {
        throw new Error('ExpectedRemoteAssetBalanceInChannelBalanceData');
      }

      return {
        key,
        local_balance: balance.local_balance,
        name: !balance.name ? undefined : balance.name,
        remote_balance: balance.remote_balance,
      };
    });
};

/** Asset balances from the JSON custom channel data of a channel balance

  Numbers are numeric strings, see customChannelDataAsJson

  {
    open_channels: {
      <Asset Id Hex String>: {
        asset_id: <Asset Id Hex String>
        local_balance: <Local Balance Asset Units Numeric String>
        [name]: <Asset Name String>
        remote_balance: <Remote Balance Asset Units Numeric String>
      }
    }
    [open_channels_by_group]: {
      <Asset Group Key Hex String>: {
        local_balance: <Local Balance Asset Units Numeric String>
        remote_balance: <Remote Balance Asset Units Numeric String>
      }
    }
    pending_channels: <Asset Balances By Asset Id Object>
    [pending_channels_by_group]: <Asset Balances By Group Key Object>
  }

  @throws
  <Error>

  @returns
  {
    assets: [{
      asset_id: <Asset Id Hex String>
      local_balance: <Local Balance Asset Units Numeric String>
      [name]: <Asset Name String>
      remote_balance: <Remote Balance Asset Units Numeric String>
    }]
    groups: [{
      group_key: <Asset Group Key Hex String>
      local_balance: <Local Balance Asset Units Numeric String>
      remote_balance: <Remote Balance Asset Units Numeric String>
    }]
    pending_assets: [<Asset Balance Object>]
    pending_groups: [<Asset Group Balance Object>]
  }
*/
export default (data?: JsonAssetChannelBalances): AssetChannelBalances => {
  // Exit early when there are no asset channels
  if (data === undefined) {
    return {assets: [], groups: [], pending_assets: [], pending_groups: []};
  }

  if (!isObject(data)) {
    throw new Error('ExpectedAssetChannelBalanceData');
  }

  const assetsFrom = (balances?: JsonBalances) => {
    return entriesFrom(balances).map(n => ({
      asset_id: n.key,
      local_balance: n.local_balance,
      name: n.name,
      remote_balance: n.remote_balance,
    }));
  };

  const groupsFrom = (balances?: JsonBalances) => {
    return entriesFrom(balances).map(n => ({
      group_key: n.key,
      local_balance: n.local_balance,
      remote_balance: n.remote_balance,
    }));
  };

  return {
    assets: assetsFrom(data.open_channels),
    groups: groupsFrom(data.open_channels_by_group),
    pending_assets: assetsFrom(data.pending_channels),
    pending_groups: groupsFrom(data.pending_channels_by_group),
  };
};
