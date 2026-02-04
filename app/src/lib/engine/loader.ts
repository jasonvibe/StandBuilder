import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// 标准主表结构
export interface StandardItem {
  standard_id: string;
  standard_name: string;
  standard_type: string;
  industry: string[];
  project_type: string[];
  priority: 'mandatory' | 'recommended';
  description: string;
  source: string;
}

// 规则映射表结构
export interface RuleItem {
  rule_id: string;
  industry: string[];
  project_type: string[];
  include_standard_ids: string[];
}

// 语义描述结构
export interface SemanticDescription {
  standard_id: string;
  content: string;
  applicable_scenarios: string[];
  not_recommended_scenarios: string[];
}

// 解析standards_master.xlsx
export const parseStandardsMaster = (filePath: string): StandardItem[] => {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  return jsonData.map((row: any) => ({
    standard_id: row.standard_id || row.标准ID || row.id || '',
    standard_name: row.standard_name || row.标准名称 || '',
    standard_type: row.standard_type || row.标准类型 || '',
    industry: Array.isArray(row.industry) ? row.industry : 
      (typeof row.industry === 'string' ? row.industry.split(',').map((s: string) => s.trim()) : []),
    project_type: Array.isArray(row.project_type) ? row.project_type : 
      (typeof row.project_type === 'string' ? row.project_type.split(',').map((s: string) => s.trim()) : []),
    priority: (row.priority || row.优先级 || 'recommended') as 'mandatory' | 'recommended',
    description: row.description || row.说明 || '',
    source: row.source || row.来源 || ''
  }));
};

// 解析rules_mapping.xlsx
export const parseRulesMapping = (filePath: string): RuleItem[] => {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  return jsonData.map((row: any) => ({
    rule_id: row.rule_id || row.规则ID || row.id || '',
    industry: Array.isArray(row.industry) ? row.industry : 
      (typeof row.industry === 'string' ? row.industry.split(',').map((s: string) => s.trim()) : []),
    project_type: Array.isArray(row.project_type) ? row.project_type : 
      (typeof row.project_type === 'string' ? row.project_type.split(',').map((s: string) => s.trim()) : []),
    include_standard_ids: Array.isArray(row.include_standard_ids) ? row.include_standard_ids : 
      (typeof row.include_standard_ids === 'string' ? row.include_standard_ids.split(',').map((s: string) => s.trim()) : [])
  }));
};

// 解析semantic_descriptions.md
export const parseSemanticDescriptions = (filePath: string): SemanticDescription[] => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const descriptions: SemanticDescription[] = [];

  let currentDescription: SemanticDescription | null = null;
  let currentSection: 'applicable' | 'not_recommended' | null = null;

  lines.forEach(line => {
    line = line.trim();
    
    // 匹配标准ID标题
    const idMatch = line.match(/^##\s+([A-Z0-9\-]+)\s+(.+)$/);
    if (idMatch) {
      if (currentDescription) {
        descriptions.push(currentDescription);
      }
      currentDescription = {
        standard_id: idMatch[1],
        content: idMatch[2],
        applicable_scenarios: [],
        not_recommended_scenarios: []
      };
      currentSection = null;
    }
    
    // 匹配适用场景
    else if (line === '适用场景：') {
      currentSection = 'applicable';
    }
    
    // 匹配不建议使用场景
    else if (line === '不建议使用场景：') {
      currentSection = 'not_recommended';
    }
    
    // 匹配场景项
    else if (currentDescription && currentSection && line.startsWith('- ')) {
      const scenario = line.substring(2).trim();
      if (currentSection === 'applicable') {
        currentDescription.applicable_scenarios.push(scenario);
      } else if (currentSection === 'not_recommended') {
        currentDescription.not_recommended_scenarios.push(scenario);
      }
    }
  });

  // 添加最后一个描述
  if (currentDescription) {
    descriptions.push(currentDescription);
  }

  return descriptions;
};

// 从目录加载整个知识库
export const loadKnowledgeBase = (kbPath: string) => {
  const standardsPath = path.join(kbPath, 'standards_master.xlsx');
  const rulesPath = path.join(kbPath, 'rules_mapping.xlsx');
  const semanticPath = path.join(kbPath, 'semantic_descriptions.md');
  const versionPath = path.join(kbPath, 'meta', 'version.json');

  const standards = fs.existsSync(standardsPath) ? parseStandardsMaster(standardsPath) : [];
  const rules = fs.existsSync(rulesPath) ? parseRulesMapping(rulesPath) : [];
  const semantics = fs.existsSync(semanticPath) ? parseSemanticDescriptions(semanticPath) : [];
  const version = fs.existsSync(versionPath) ? JSON.parse(fs.readFileSync(versionPath, 'utf8')) : null;

  return {
    standards,
    rules,
    semantics,
    version
  };
};

// 导出类型
export type KnowledgeBase = ReturnType<typeof loadKnowledgeBase>;
