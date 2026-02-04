import type { MatchResult } from './ruleEngine';
import type { StandardItem } from './loader';

// 合并器输入接口
export interface MergerInput {
  ruleResults: MatchResult[];
  aiResults: MatchResult[];
  manualResults?: MatchResult[];
}

// 合并选项接口
export interface MergerOptions {
  prioritizeRules?: boolean;
  deduplicate?: boolean;
  includeSources?: boolean;
}

// 合并器类
export class Merger {
  private options: MergerOptions;
  private standards: StandardItem[];

  constructor(options: MergerOptions = {}, standards: StandardItem[]) {
    this.options = {
      prioritizeRules: true,
      deduplicate: true,
      includeSources: true,
      ...options
    };
    this.standards = standards;
  }

  // 合并结果
  public mergeResults(input: MergerInput): (MatchResult & { standard?: StandardItem })[] {
    let allResults: MatchResult[] = [];

    // 添加规则结果
    if (input.ruleResults) {
      allResults = [...allResults, ...input.ruleResults];
    }

    // 添加AI结果
    if (input.aiResults) {
      allResults = [...allResults, ...input.aiResults];
    }

    // 添加手动结果
    if (input.manualResults) {
      allResults = [...allResults, ...input.manualResults];
    }

    // 去重
    if (this.options.deduplicate) {
      allResults = this.deduplicateResults(allResults);
    }

    // 排序（规则结果优先）
    if (this.options.prioritizeRules) {
      allResults = this.sortResults(allResults);
    }

    // 添加标准详情
    return allResults.map(result => {
      const standard = this.standards.find(s => s.standard_id === result.standard_id);
      return {
        ...result,
        standard
      };
    });
  }

  // 去重结果
  private deduplicateResults(results: MatchResult[]): MatchResult[] {
    const uniqueResults: MatchResult[] = [];
    const seenStandardIds = new Set<string>();

    results.forEach(result => {
      if (!seenStandardIds.has(result.standard_id)) {
        seenStandardIds.add(result.standard_id);
        uniqueResults.push(result);
      } else if (this.options.prioritizeRules) {
        // 如果已经存在该标准，检查是否需要替换
        const existingIndex = uniqueResults.findIndex(r => r.standard_id === result.standard_id);
        if (existingIndex !== -1) {
          const existingResult = uniqueResults[existingIndex];
          // 规则结果优先级高于AI结果，AI结果优先级高于手动结果
          const priority = {
            'rule': 3,
            'ai': 2,
            'manual': 1
          };

          if (priority[result.source] > priority[existingResult.source]) {
            uniqueResults[existingIndex] = result;
          }
        }
      }
    });

    return uniqueResults;
  }

  // 排序结果
  private sortResults(results: MatchResult[]): MatchResult[] {
    // 规则结果优先级高于AI结果，AI结果优先级高于手动结果
    const priority = {
      'rule': 3,
      'ai': 2,
      'manual': 1
    };

    return results.sort((a, b) => {
      // 首先按来源优先级排序
      const priorityDiff = priority[b.source] - priority[a.source];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // 然后按标准ID排序
      return a.standard_id.localeCompare(b.standard_id);
    });
  }

  // 计算结果统计
  public getResultStats(results: (MatchResult & { standard?: StandardItem })[]): {
    total: number;
    bySource: {
      rule: number;
      ai: number;
      manual: number;
    };
    byType: Record<string, number>;
  } {
    const stats = {
      total: results.length,
      bySource: {
        rule: 0,
        ai: 0,
        manual: 0
      },
      byType: {} as Record<string, number>
    };

    results.forEach(result => {
      // 按来源统计
      stats.bySource[result.source]++;

      // 按类型统计
      if (result.standard) {
        const type = result.standard.standard_type || '其他';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    });

    return stats;
  }
}

// 导出工厂函数
export const createMerger = (options?: MergerOptions, standards?: StandardItem[]) => {
  return new Merger(options || {}, standards || []);
};
