import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { StandardItem } from './loader';
import type { MatchResult } from './ruleEngine';

// 导出配置接口
export interface ExportConfig {
  format: 'excel' | 'json' | 'csv';
  includeHeaders?: boolean;
  includeMetadata?: boolean;
  includeSources?: boolean;
  filename?: string;
  sheetName?: string;
}

// 导出项接口
export interface ExportItem {
  standard: StandardItem;
  match: MatchResult;
}

// 导出器类
export class Exporter {
  // 导出单个格式
  public export(items: ExportItem[], config: ExportConfig): void {
    switch (config.format) {
      case 'excel':
        this.exportToExcel(items, config);
        break;
      case 'json':
        this.exportToJSON(items, config);
        break;
      case 'csv':
        this.exportToCSV(items, config);
        break;
      default:
        throw new Error('不支持的导出格式');
    }
  }

  // 批量导出
  public async exportBatch(itemsByModule: Record<string, ExportItem[]>, config: ExportConfig): Promise<void> {
    const zip = new JSZip();

    // 为每个模块导出
    for (const [moduleName, moduleItems] of Object.entries(itemsByModule)) {
      switch (config.format) {
        case 'excel':
          const excelBuffer = this.generateExcelBuffer(moduleItems, config);
          zip.file(`${moduleName}.xlsx`, excelBuffer);
          break;
        case 'json':
          const jsonContent = this.generateJSONContent(moduleItems, config);
          zip.file(`${moduleName}.json`, JSON.stringify(jsonContent, null, 2));
          break;
        case 'csv':
          const csvContent = this.generateCSVContent(moduleItems, config);
          zip.file(`${moduleName}.csv`, csvContent);
          break;
      }
    }

    // 生成ZIP文件
    const content = await zip.generateAsync({ type: 'blob' });
    const filename = config.filename || `体系文件包-${new Date().toISOString().split('T')[0]}.zip`;
    saveAs(content, filename);
  }

  // 导出为Excel
  private exportToExcel(items: ExportItem[], config: ExportConfig): void {
    const buffer = this.generateExcelBuffer(items, config);
    const filename = config.filename || `体系文件-${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), filename);
  }

  // 生成Excel缓冲区
  private generateExcelBuffer(items: ExportItem[], config: ExportConfig): ArrayBuffer {
    const data = this.prepareExportData(items, config);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.sheetName || 'Sheet1');
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  }

  // 导出为JSON
  private exportToJSON(items: ExportItem[], config: ExportConfig): void {
    const data = this.prepareExportData(items, config);
    const content = JSON.stringify(data, null, 2);
    const filename = config.filename || `体系文件-${new Date().toISOString().split('T')[0]}.json`;
    saveAs(new Blob([content], { type: 'application/json' }), filename);
  }

  // 生成JSON内容
  private generateJSONContent(items: ExportItem[], config: ExportConfig): any[] {
    return this.prepareExportData(items, config);
  }

  // 导出为CSV
  private exportToCSV(items: ExportItem[], config: ExportConfig): void {
    const data = this.prepareExportData(items, config);
    const content = this.generateCSVContent(items, config);
    const filename = config.filename || `体系文件-${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(new Blob([content], { type: 'text/csv;charset=utf-8;' }), filename);
  }

  // 生成CSV内容
  private generateCSVContent(items: ExportItem[], config: ExportConfig): string {
    const data = this.prepareExportData(items, config);
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        const strValue = typeof value === 'string' ? value : JSON.stringify(value);
        return strValue.includes(',') || strValue.includes('"') || strValue.includes('\n') 
          ? `"${strValue.replace(/"/g, '""')}"` 
          : strValue;
      }).join(','))
    ].join('\n');

    return csvContent;
  }

  // 准备导出数据
  private prepareExportData(items: ExportItem[], config: ExportConfig): any[] {
    return items.map(item => {
      const exportData: any = {
        standard_id: item.standard.standard_id,
        standard_name: item.standard.standard_name,
        standard_type: item.standard.standard_type,
        industry: item.standard.industry.join(','),
        project_type: item.standard.project_type.join(','),
        priority: item.standard.priority,
        description: item.standard.description,
        source: item.standard.source
      };

      // 包含来源信息
      if (config.includeSources) {
        exportData.match_source = item.match.source;
        exportData.match_rule_id = item.match.rule_id;
        exportData.match_reason = item.match.reason;
      }

      // 包含元数据
      if (config.includeMetadata) {
        exportData.export_date = new Date().toISOString();
        exportData.export_format = config.format;
      }

      return exportData;
    });
  }

  // 导出为Markdown
  public exportToMarkdown(items: ExportItem[], config: ExportConfig): void {
    const content = this.generateMarkdownContent(items, config);
    const filename = config.filename || `体系文件-${new Date().toISOString().split('T')[0]}.md`;
    saveAs(new Blob([content], { type: 'text/markdown;charset=utf-8;' }), filename);
  }

  // 生成Markdown内容
  private generateMarkdownContent(items: ExportItem[], config: ExportConfig): string {
    let content = `# 体系文件导出\n\n`;
    content += `导出日期: ${new Date().toISOString()}\n`;
    content += `导出格式: ${config.format}\n`;
    content += `导出数量: ${items.length}\n\n`;

    // 按标准类型分组
    const grouped = items.reduce((acc, item) => {
      const type = item.standard.standard_type || '其他';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {} as Record<string, ExportItem[]>);

    // 生成每个类型的内容
    Object.entries(grouped).forEach(([type, typeItems]) => {
      content += `## ${type}\n\n`;
      content += `| 标准ID | 标准名称 | 优先级 | 来源 |\n`;
      content += `|-------|---------|-------|-----|\n`;
      
      typeItems.forEach(item => {
        content += `| ${item.standard.standard_id} | ${item.standard.standard_name} | ${item.standard.priority} | ${item.match.source} |\n`;
      });
      
      content += `\n`;
    });

    return content;
  }
}

// 导出工厂函数
export const createExporter = () => {
  return new Exporter();
};
