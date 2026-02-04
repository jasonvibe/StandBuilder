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
        return this.callLocalLLM();
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
  private async callLocalLLM(): Promise<string> {
    // 本地LLM调用实现
    // 这里可以集成llama.cpp或其他本地LLM
    throw new Error('本地LLM调用未实现');
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
