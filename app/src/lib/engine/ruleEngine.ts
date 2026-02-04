import type { RuleItem, StandardItem } from './loader';

// 输入配置接口
export interface RuleEngineInput {
  industries: string[];
  projectTypes: string[];
  modules?: string[];
}

// 匹配结果接口
export interface MatchResult {
  standard_id: string;
  source: 'rule' | 'ai' | 'manual';
  rule_id?: string;
  reason?: string;
}

// 规则引擎类
export class RuleEngine {
  private rules: RuleItem[];
  private standards: StandardItem[];

  constructor(rules: RuleItem[], standards: StandardItem[]) {
    this.rules = rules;
    this.standards = standards;
  }

  // 匹配规则
  public matchRules(input: RuleEngineInput): MatchResult[] {
    const matched: MatchResult[] = [];
    const matchedStandardIds = new Set<string>();

    // 遍历所有规则
    this.rules.forEach(rule => {
      if (this.doesRuleMatch(rule, input)) {
        // 规则匹配，添加所有关联的标准
        rule.include_standard_ids.forEach(standardId => {
          if (!matchedStandardIds.has(standardId)) {
            matchedStandardIds.add(standardId);
            matched.push({
              standard_id: standardId,
              source: 'rule',
              rule_id: rule.rule_id,
              reason: `匹配规则 ${rule.rule_id}`
            });
          }
        });
      }
    });

    return matched;
  }

  // 检查规则是否匹配输入
  private doesRuleMatch(rule: RuleItem, input: RuleEngineInput): boolean {
    // 检查行业匹配
    const industryMatch = rule.industry.length === 0 || 
      rule.industry.some(ruleIndustry => 
        input.industries.some(inputIndustry => 
          this.normalizeString(ruleIndustry) === this.normalizeString(inputIndustry)
        )
      );

    // 检查项目类型匹配
    const projectTypeMatch = rule.project_type.length === 0 || 
      rule.project_type.some(ruleType => 
        input.projectTypes.some(inputType => 
          this.normalizeString(ruleType) === this.normalizeString(inputType)
        )
      );

    return industryMatch && projectTypeMatch;
  }

  // 字符串标准化，用于匹配
  private normalizeString(str: string): string {
    return str.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\s\-\_]+/g, ' ');
  }

  // 获取匹配的标准详情
  public getMatchedStandards(results: MatchResult[]): (StandardItem & { match: MatchResult })[] {
    return results.map(result => {
      const standard = this.standards.find(s => s.standard_id === result.standard_id);
      if (standard) {
        return {
          ...standard,
          match: result
        };
      }
      return null;
    }).filter((item): item is (StandardItem & { match: MatchResult }) => item !== null);
  }

  // 基于标准类型分组
  public groupByType(items: (StandardItem & { match: MatchResult })[]): Record<string, (StandardItem & { match: MatchResult })[]> {
    const groups: Record<string, (StandardItem & { match: MatchResult })[]> = {};

    items.forEach(item => {
      const type = item.standard_type || '其他';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
    });

    return groups;
  }
}

// 导出工厂函数
export const createRuleEngine = (rules: RuleItem[], standards: StandardItem[]) => {
  return new RuleEngine(rules, standards);
};
