import privacyFlagsFromBitmask from './privacy_flags_from_bitmask.js';
import rpcRuleValueAsRuleValue from './rpc_rule_value_as_rule_value.js';
import type {RuleValue} from './rpc_rule_value_as_rule_value.js';

const {entries} = Object;
const {isArray} = Array;
const zero = '0';

export type RpcFeature = {
  default_config: string;
  description: string;
  name: string;
  permissions_list: {
    method: string;
    operations: {action: string; entity: string}[];
  }[];
  privacy_flags: string;
  requires_upgrade: boolean;
  rules: Record<
    string,
    {
      defaults: unknown;
      known: boolean;
      max_value: unknown;
      min_value: unknown;
    }
  >;
};

export type Feature = {
  /** Default Configuration JSON */
  default_config?: string;
  /** Feature Description */
  description: string;
  /** litd Must Upgrade to Use the Feature */
  is_upgrade_required: boolean;
  /** Feature Name */
  name: string;
  permissions: {
    /** RPC Method URI */
    method: string;
    operations: {
      /** Permission Action */
      action: string;
      /** Permission Entity */
      entity: string;
    }[];
  }[];
  /** Privacy Flag Types */
  privacy_flags: string[];
  rules: {
    /** Recommended Rule Value */
    defaults?: RuleValue;
    /** litd Knows the Rule */
    is_known: boolean;
    /** Maximum Rule Value */
    max_value?: RuleValue;
    /** Minimum Rule Value */
    min_value?: RuleValue;
    /** Rule Name */
    name: string;
  }[];
};

/** Feature from an RPC autopilot feature

  {
    default_config: <Default Configuration JSON String>
    description: <Feature Description String>
    name: <Feature Name String>
    permissions_list: [{
      method: <RPC Method URI String>
      operations: [{
        action: <Permission Action String>
        entity: <Permission Entity String>
      }]
    }]
    privacy_flags: <Privacy Flags Bitmask Numeric String>
    requires_upgrade: <litd Must Upgrade to Use the Feature Bool>
    rules: {
      <Rule Name String>: {
        defaults: <RPC Rule Value Object>
        known: <litd Knows the Rule Bool>
        max_value: <RPC Rule Value Object>
        min_value: <RPC Rule Value Object>
      }
    }
  }

  @throws
  <Error>

  @returns
  {
    [default_config]: <Default Configuration JSON String>
    description: <Feature Description String>
    is_upgrade_required: <litd Must Upgrade to Use the Feature Bool>
    name: <Feature Name String>
    permissions: [{
      method: <RPC Method URI String>
      operations: [{
        action: <Permission Action String>
        entity: <Permission Entity String>
      }]
    }]
    privacy_flags: [<Privacy Flag Type String>]
    rules: [{
      [defaults]: <Recommended Rule Value Object>
      is_known: <litd Knows the Rule Bool>
      [max_value]: <Maximum Rule Value Object>
      [min_value]: <Minimum Rule Value Object>
      name: <Rule Name String>
    }]
  }
*/
export default (feature?: RpcFeature | null): Feature => {
  if (!feature) {
    throw new Error('ExpectedRpcAutopilotFeatureDetails');
  }

  if (!feature.name) {
    throw new Error('ExpectedNameInRpcAutopilotFeatureDetails');
  }

  if (!isArray(feature.permissions_list)) {
    throw new Error('ExpectedPermissionsInRpcAutopilotFeatureDetails');
  }

  const rules = entries(feature.rules || {}).map(([name, values]) => ({
    defaults: rpcRuleValueAsRuleValue(values.defaults),
    is_known: values.known,
    max_value: rpcRuleValueAsRuleValue(values.max_value),
    min_value: rpcRuleValueAsRuleValue(values.min_value),
    name,
  }));

  return {
    default_config: feature.default_config || undefined,
    description: feature.description,
    is_upgrade_required: feature.requires_upgrade,
    name: feature.name,
    permissions: feature.permissions_list.map(permission => ({
      method: permission.method,
      operations: (permission.operations || []).map(operation => ({
        action: operation.action,
        entity: operation.entity,
      })),
    })),
    privacy_flags: privacyFlagsFromBitmask(feature.privacy_flags || zero),
    rules: rules.sort((a, b) => a.name.localeCompare(b.name)),
  };
};
