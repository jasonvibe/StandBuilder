import type { StandardItem, SemanticDescription } from './loader';
import type { MatchResult } from './ruleEngine';

// AI配置接口
export interface AIConfig {
  enabled: boolean;
  model: 'openai' | 'local' | 'custom';
  apiKey?: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
}

// AI顾问输入接口
export interface AIAdvisorInput {
  industries: string[];
  projectTypes: string[];
  existingStandards: MatchResult[];
  modules?: string[];
}

// AI顾问类
export class AIAdvisor {
  private config: AIConfig;
  private standards: StandardItem[];
  private semantics: SemanticDescription[];

  constructor(config: AIConfig, standards: StandardItem[], semantics: SemanticDescription[]) {
    this.config = config;
    this.standards = standards;
    this.semantics = semantics;
  }

  // 获取AI推荐
  public async getRecommendations(input: AIAdvisorInput): Promise<MatchResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    try {
      // 生成提示词
      const prompt = this.generatePrompt(input);
      
      // 调用AI模型
      const response = await this.callAI(prompt);
      
      // 解析AI响应
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('AI顾问错误:', error);
      return [];
    }
  }

  // 生成提示词
  private generatePrompt(input: AIAdvisorInput): string {



    // 构建行业和项目类型描述
    const industryDesc = input.industries.length > 0 ? `行业: ${input.industries.join(', ')}` : '行业: 不限';
    const projectTypeDesc = input.projectTypes.length > 0 ? `项目类型: ${input.projectTypes.join(', ')}` : '项目类型: 不限';

    // 构建现有标准描述
    const existingDesc = input.existingStandards.length > 0 ? 
      `已选择标准: ${input.existingStandards.map(s => s.standard_id).join(', ')}` : 
      '已选择标准: 无';

    // 构建语义描述
    const semanticDesc = this.semantics.map(s => {
      return `## ${s.standard_id} ${s.content}\n适用场景: ${s.applicable_scenarios.join(', ')}\n不建议使用场景: ${s.not_recommended_scenarios.join(', ')}`;
    }).join('\n\n');

    return `
你是一个专业的工程标准顾问，根据以下项目信息和可用标准，推荐适合的标准项。

项目信息:
${industryDesc}
${projectTypeDesc}
${existingDesc}

可用标准语义描述:
${semanticDesc}

请根据项目信息和语义描述，推荐5-10个适合的标准项，并说明推荐理由。

输出格式:
标准ID1: 推荐理由1
标准ID2: 推荐理由2
...
`;
  }

  // 调用AI模型
  private async callAI(prompt: string): Promise<string> {
    // 根据配置调用不同的AI模型
    switch (this.config.model) {
      case 'openai':
        return this.callOpenAI(prompt);
      case 'local':
        return this.callLocalLLM(prompt);
      case 'custom':
        return this.callCustomAPI(prompt);
      default:
        throw new Error('不支持的AI模型');
    }
  }

  // 调用OpenAI API
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.config.apiKey || !this.config.endpoint) {
      throw new Error('缺少OpenAI API配置');
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '你是一个专业的工程标准顾问' },
          { role: 'user', content: prompt }
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 调用本地LLM
  private async callLocalLLM(prompt: string): Promise<string> {
    // 基于规则的本地LLM模拟逻辑
    // 分析prompt中的行业和项目类型
    const industries = this.extractIndustriesFromPrompt(prompt);
    const projectTypes = this.extractProjectTypesFromPrompt(prompt);
    
    // 基于行业和项目类型生成推荐
    const recommendations = this.generateLocalRecommendations(industries, projectTypes);
    
    // 格式化为预期的输出格式
    return recommendations.map(rec => `${rec.standard_id}: ${rec.reason}`).join('\n');
  }
  
  // 从prompt中提取行业信息
  private extractIndustriesFromPrompt(prompt: string): string[] {
    const industryKeywords = ['地产', '建筑', '施工', '工程', '地铁', '铁路', '公路', '桥梁', '隧道', '水利'];
    const industries: string[] = [];
    
    industryKeywords.forEach(keyword => {
      if (prompt.includes(keyword)) {
        industries.push(keyword);
      }
    });
    
    return industries;
  }
  
  // 从prompt中提取项目类型信息
  private extractProjectTypesFromPrompt(prompt: string): string[] {
    const projectTypeKeywords = ['新建', '改扩建', '改造', '装修', '维护', '修缮'];
    const projectTypes: string[] = [];
    
    projectTypeKeywords.forEach(keyword => {
      if (prompt.includes(keyword)) {
        projectTypes.push(keyword);
      }
    });
    
    return projectTypes;
  }
  
  // 生成本地推荐
  private generateLocalRecommendations(industries: string[], projectTypes: string[]): { standard_id: string; reason: string }[] {
    const recommendations: { standard_id: string; reason: string }[] = [];
    const recommendedStandardIds = new Set<string>();
    
    // 基于行业的推荐规则
    if (industries.includes('地产')) {
      // 为地产行业推荐一些标准
      const realEstateStandards = [
        { id: 'QC-001', reason: '地产项目必备的工程质量管理制度' },
        { id: 'SAFE-001', reason: '地产项目的安全管理标准' },
        { id: 'MAT-001', reason: '地产项目的材料验收标准' }
      ];
      
      realEstateStandards.forEach(rec => {
        if (!recommendedStandardIds.has(rec.id)) {
          recommendedStandardIds.add(rec.id);
          recommendations.push({ standard_id: rec.id, reason: rec.reason });
        }
      });
    }
    
    if (industries.includes('地铁')) {
      // 为地铁行业推荐一些标准
      const subwayStandards = [
        { id: 'QC-002', reason: '地铁工程质量控制标准' },
        { id: 'SAFE-002', reason: '地铁工程安全管理标准' }
      ];
      
      subwayStandards.forEach(rec => {
        if (!recommendedStandardIds.has(rec.id)) {
          recommendedStandardIds.add(rec.id);
          recommendations.push({ standard_id: rec.id, reason: rec.reason });
        }
      });
    }
    
    // 基于项目类型的推荐规则
    if (projectTypes.includes('新建')) {
      // 为新建项目推荐一些标准
      const newProjectStandards = [
        { id: 'DESIGN-001', reason: '新建项目的设计规范标准' },
        { id: 'PLAN-001', reason: '新建项目的计划管理标准' }
      ];
      
      newProjectStandards.forEach(rec => {
        if (!recommendedStandardIds.has(rec.id)) {
          recommendedStandardIds.add(rec.id);
          recommendations.push({ standard_id: rec.id, reason: rec.reason });
        }
      });
    }
    
    if (projectTypes.includes('改扩建')) {
      // 为改扩建项目推荐一些标准
      const renovationStandards = [
        { id: 'DESIGN-002', reason: '改扩建项目的设计规范标准' },
        { id: 'SAFE-003', reason: '改扩建项目的安全管理标准' }
      ];
      
      renovationStandards.forEach(rec => {
        if (!recommendedStandardIds.has(rec.id)) {
          recommendedStandardIds.add(rec.id);
          recommendations.push({ standard_id: rec.id, reason: rec.reason });
        }
      });
    }
    
    // 如果没有足够的推荐，添加一些通用标准
    if (recommendations.length < 5) {
      const generalStandards = [
        { id: 'QC-003', reason: '通用工程质量控制标准' },
        { id: 'SAFE-004', reason: '通用工程安全管理标准' },
        { id: 'MANAGE-001', reason: '通用项目管理标准' },
        { id: 'ENV-001', reason: '通用环境管理标准' },
        { id: 'RISK-001', reason: '通用风险管理标准' }
      ];
      
      generalStandards.forEach(rec => {
        if (!recommendedStandardIds.has(rec.id) && recommendations.length < 10) {
          recommendedStandardIds.add(rec.id);
          recommendations.push({ standard_id: rec.id, reason: rec.reason });
        }
      });
    }
    
    return recommendations;
  }

  // 调用自定义API
  private async callCustomAPI(prompt: string): Promise<string> {
    if (!this.config.endpoint) {
      throw new Error('缺少自定义API配置');
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000
      })
    });

    const data = await response.json();
    return data.response || '';
  }

  // 解析AI响应
  private parseAIResponse(response: string): MatchResult[] {
    const results: MatchResult[] = [];
    const lines = response.split('\n');

    lines.forEach(line => {
      line = line.trim();
      if (line) {
        const match = line.match(/^([A-Z0-9\-]+)\s*:\s*(.+)$/);
        if (match) {
          const standardId = match[1];
          const reason = match[2];
          
          // 检查标准是否存在
          const standardExists = this.standards.some(s => s.standard_id === standardId);
          if (standardExists) {
            results.push({
              standard_id: standardId,
              source: 'ai',
              reason
            });
          }
        }
      }
    });

    return results;
  }

  // 检查是否需要AI推荐
  public shouldUseAI(input: AIAdvisorInput): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // 当现有标准数量少于阈值时触发AI推荐
    const threshold = 5;
    return input.existingStandards.length < threshold;
  }
}

// 导出工厂函数
export const createAIAdvisor = (config: AIConfig, standards: StandardItem[], semantics: SemanticDescription[]) => {
  return new AIAdvisor(config, standards, semantics);
};
