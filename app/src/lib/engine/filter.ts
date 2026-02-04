// 内容过滤接口
export interface ContentFilterInput {
  industries: string[];
  projectTypes: string[];
  modules?: string[];
}

// 过滤选项接口
export interface FilterOptions {
  caseSensitive?: boolean;
  exactMatch?: boolean;
  fuzzyMatchThreshold?: number;
}

// 内容过滤类
export class ContentFilter {
  private options: FilterOptions;

  constructor(options: FilterOptions = {}) {
    this.options = {
      caseSensitive: false,
      exactMatch: false,
      fuzzyMatchThreshold: 0.7,
      ...options
    };
  }

  // 过滤内容行
  public filterContent<T extends Record<string, any>>(content: T[], keys: string[], input: ContentFilterInput): T[] {
    // 如果没有过滤器，返回所有内容
    if (input.industries.length === 0 && input.projectTypes.length === 0) {
      return content;
    }

    // 尝试找到相关列（模糊匹配）
    const industryKey = this.findRelevantColumn(keys, ['业态', '产业', '行业', '项目类型', '适用范围']);
    const projectTypeKey = this.findRelevantColumn(keys, ['项目类型', '工程类型', '类型', '新建', '改扩建']);

    if (!industryKey && !projectTypeKey) {
      // 如果没有找到相关列，返回所有内容（安全起见）
      return content;
    }

    const filters = [...input.industries, ...input.projectTypes];

    return content.filter(row => {
      // 检查行业匹配
      if (industryKey) {
        const industryVal = String(row[industryKey] || "");
        if (industryVal && !this.doesValueMatch(industryVal, filters)) {
          return false;
        }
      }

      // 检查项目类型匹配
      if (projectTypeKey) {
        const projectTypeVal = String(row[projectTypeKey] || "");
        if (projectTypeVal && !this.doesValueMatch(projectTypeVal, filters)) {
          return false;
        }
      }

      return true;
    });
  }

  // 查找相关列
  private findRelevantColumn(keys: string[], keywords: string[]): string | undefined {
    return keys.find(key => {
      const normalizedKey = this.normalizeString(key);
      return keywords.some(keyword => {
        const normalizedKeyword = this.normalizeString(keyword);
        return normalizedKey.includes(normalizedKeyword);
      });
    });
  }

  // 检查值是否匹配过滤器
  private doesValueMatch(value: string, filters: string[]): boolean {
    const normalizedValue = this.normalizeString(value);
    
    return filters.some(filter => {
      const normalizedFilter = this.normalizeString(filter);
      
      if (this.options.exactMatch) {
        return normalizedValue === normalizedFilter;
      } else {
        // 模糊匹配
        return normalizedValue.includes(normalizedFilter) || 
               this.calculateSimilarity(normalizedValue, normalizedFilter) >= this.options.fuzzyMatchThreshold!;
      }
    });
  }

  // 字符串标准化
  private normalizeString(str: string): string {
    let normalized = str;
    if (!this.options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    normalized = normalized.trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/[\s\-\_]+/g, ' ');
    return normalized;
  }

  // 计算字符串相似度（Levenshtein距离）
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = [];
    
    // 初始化矩阵
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // 填充矩阵
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j] + 1      // 删除
          );
        }
      }
    }
    
    // 计算相似度
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  // 按模块过滤
  public filterByModules<T extends { module?: string; systemName?: string }>(items: T[], modules: string[]): T[] {
    if (!modules || modules.length === 0) {
      return items;
    }

    return items.filter(item => {
      const itemModule = item.module || item.systemName || '';
      const normalizedItemModule = this.normalizeString(itemModule);
      
      return modules.some(module => {
        const normalizedModule = this.normalizeString(module);
        return normalizedItemModule.includes(normalizedModule);
      });
    });
  }
}

// 导出工厂函数
export const createContentFilter = (options?: FilterOptions) => {
  return new ContentFilter(options);
};
