const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 配置
const EXCEL_DIR = path.join(__dirname, '../../体系数据库');
const OUTPUT_DIR = path.join(__dirname, '../public/systems');
const OUTPUT_DB = path.join(__dirname, '../public/db.json');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 读取Excel文件
function readExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(worksheet);
}

// 解析Excel文件名，提取客户和体系信息
function parseFileName(fileName) {
  // 格式示例："中海地产-PROD(中海地产PROD)工序验收体系-20260130.xls"
  const match = fileName.match(/^(.+)-PROD\((.+)\)(.+)\-(\d{8})\.xls[x]?$/);
  if (match) {
    return {
      client: match[1].trim(),
      context: match[2].trim(),
      systemName: match[3].trim(),
      date: match[4].trim()
    };
  }
  return {
    client: '未知',
    context: '未知',
    systemName: fileName.replace(/\.xls[x]?$/, ''),
    date: new Date().toISOString().split('T')[0].replace(/-/g, '')
  };
}

// 生成系统ID
function generateSystemId(client, systemName) {
  return `SYS_${client.substring(0, 2).toUpperCase()}_${systemName.substring(0, 4).toUpperCase().replace(/\s+/g, '_')}_${Date.now().toString(36).substring(0, 4)}`;
}

// 处理单个Excel文件
function processExcelFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const parsedInfo = parseFileName(fileName);
    const content = readExcelFile(filePath);
    
    // 提取表头
    const originalHeader = content.length > 0 ? Object.keys(content[0]) : [];
    
    // 生成标准化的键名
    const keys = originalHeader.map(header => {
      // 简单的键名标准化
      return header.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .replace(/^_+|_+$/g, '') || `col_${originalHeader.indexOf(header)}`;
    });
    
    // 构建系统详情
    const systemDetail = {
      id: generateSystemId(parsedInfo.client, parsedInfo.systemName),
      client: parsedInfo.client,
      context: parsedInfo.context,
      systemName: parsedInfo.systemName,
      date: parsedInfo.date,
      filename: fileName,
      itemCount: content.length,
      tags: [parsedInfo.client, parsedInfo.systemName],
      originalHeader,
      keys,
      content: content.map(row => {
        const newRow = {};
        originalHeader.forEach((header, index) => {
          newRow[keys[index]] = row[header];
        });
        return newRow;
      })
    };
    
    // 写入JSON文件
    const outputFile = path.join(OUTPUT_DIR, `${systemDetail.id}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(systemDetail, null, 2), 'utf8');
    
    console.log(`✓ 处理完成: ${fileName} -> ${systemDetail.id}.json`);
    
    return {
      id: systemDetail.id,
      client: systemDetail.client,
      context: systemDetail.context,
      systemName: systemDetail.systemName,
      date: systemDetail.date,
      filename: systemDetail.filename,
      itemCount: systemDetail.itemCount,
      tags: systemDetail.tags
    };
  } catch (error) {
    console.error(`✗ 处理失败: ${path.basename(filePath)}`);
    console.error(error);
    return null;
  }
}

// 主函数
function main() {
  console.log('开始转换Excel文件为JSON格式...');
  
  // 获取所有Excel文件
  const excelFiles = fs.readdirSync(EXCEL_DIR)
    .filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'))
    .map(file => path.join(EXCEL_DIR, file));
  
  console.log(`找到 ${excelFiles.length} 个Excel文件`);
  
  // 处理所有文件
  const systemMetadata = [];
  excelFiles.forEach(filePath => {
    const metadata = processExcelFile(filePath);
    if (metadata) {
      systemMetadata.push(metadata);
    }
  });
  
  // 写入db.json
  fs.writeFileSync(OUTPUT_DB, JSON.stringify(systemMetadata, null, 2), 'utf8');
  
  console.log(`\n✓ 转换完成！`);
  console.log(`✓ 生成了 ${systemMetadata.length} 个系统JSON文件`);
  console.log(`✓ 更新了 db.json 文件`);
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { processExcelFile, main };
