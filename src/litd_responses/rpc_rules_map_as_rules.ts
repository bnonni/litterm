import rpcRuleValueAsRuleValue from './rpc_rule_value_as_rule_value.js';
import type {RuleValue} from './rpc_rule_value_as_rule_value.js';

const {entries} = Object;

export type RpcRulesMap = {rules: Record<string, unknown>} | null;

export type Rule = RuleValue & {
  /** Rule Name */
  name: string;
};

/** Rules from an RPC rules map, sorted by name

  {
    rules: {
      <Rule Name String>: <RPC Rule Value Object>
    }
  }

  @throws
  <Error>

  @returns
  [{
    name: <Rule Name String>
    ...<Rule Value Object>
  }]
*/
export default (map?: RpcRulesMap): Rule[] => {
  return entries(map?.rules || {})
    .map(([name, value]) => ({name, ...rpcRuleValueAsRuleValue(value)}))
    .sort((a, b) => a.name.localeCompare(b.name));
};
