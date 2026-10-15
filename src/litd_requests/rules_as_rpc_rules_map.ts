import ruleValueAsRpcRuleValue from './rule_value_as_rpc_rule_value.js';
import type {RuleValueArgs} from './rule_value_as_rpc_rule_value.js';

const {fromEntries} = Object;
const {isArray} = Array;

export type RuleArgs = RuleValueArgs & {
  /** Rule Name */
  name: string;
};

/** RPC rules map from rules

  [{
    name: <Rule Name String>
    ...<Rule Value Object>
  }]

  @throws
  <Error>

  @returns
  {
    rules: {
      <Rule Name String>: <RPC Rule Value Object>
    }
  }
*/
export default (rules?: RuleArgs[]) => {
  // Exit early when there are no rules
  if (rules === undefined) {
    return {rules: {}};
  }

  if (!isArray(rules)) {
    throw new Error('ExpectedArrayOfRules');
  }

  if (rules.some(rule => !rule?.name)) {
    throw new Error('ExpectedNameForRule');
  }

  if (new Set(rules.map(rule => rule.name)).size !== rules.length) {
    throw new Error('ExpectedUniqueRuleNames');
  }

  return {
    rules: fromEntries(
      rules.map(({name, ...value}) => [name, ruleValueAsRpcRuleValue(value)]),
    ),
  };
};
