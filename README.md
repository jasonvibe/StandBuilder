# StandBuilder

一套全面的体系管理与生成工具，支持浏览与导入现有体系资产，快速生成定制化体系文件，并提供在线查看、模块下载和整体打包功能。

## ✨ 功能特点

- **体系数据库浏览**  
  无需行业或项目类型前置条件，随时查看现有体系标准。

- **Excel资产导入**  
  上传Excel文件，快速构建自定义体系资产库。

- **模块化体系生成**  
  根据行业、项目类型、模块选择，自动生成定制化的体系文件。

- **AI智能补充**  
  接入多种AI模型（Kimi、Gemini、DeepSeek、Xiaomi等），提供智能化体系建议。

- **文件下载与导出**  
  支持按模块下载、全套体系打包下载，并保持清晰的文件结构。

- **现代UI风格**  
  采用Figma现代化设计，简洁直观，用户体验友好。

## 📦 系统要求

- **前端**：现代浏览器（推荐 Chrome、Firefox 等）
- **后端**：Node.js / Python（FastAPI）
- **支持平台**：Windows、macOS、Linux
- **离线模式**：支持本地部署并离线运行

## 🚀 安装与配置

### 1. 克隆项目
```bash
git clone https://github.com/yourusername/StandBuilder.git
cd StandBuilder
```

### 2. 安装依赖
```bash
# 前端（Node.js）
npm install

# 或后端（Python）
pip install -r requirements.txt
```

### 3. 配置环境
- 上传Excel文件以构建资产库
- 在系统管理后台配置AI模块的API Key

### 4. 启动应用
```bash
# 前端启动
npm start

# 或后端启动
python app.py
```

访问 [http://localhost:3000](http://localhost:3000) 即可开始使用。

## 🧭 功能演示

### 体系数据库浏览
用户无需填写任何项目类型或行业信息，即可直接浏览现有体系内容。

### 生成体系文件
点击【生成体系文件】按钮，选择行业、项目类型、模块等条件，系统自动生成对应的体系文件。

### 下载体系文件
支持按模块下载，也支持整体打包下载，便于导入系统或后续使用。

## 📖 使用示例

### AI 模块设置
在"AI 配置"页面，可选择接入多个AI模型，并填入对应 API Key，例如：
- Kimi AI
- Gemini AI
- DeepSeek AI
- Xiaomi AI

### 测试数据
初始部署时，系统提供一套测试数据，方便演示与功能测试，避免"空库"状态。

## 🤝 贡献与开发

### 如何贡献
1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature-branch`
3. 提交代码：`git commit -am 'Add new feature'`
4. 推送到分支：`git push origin feature-branch`
5. 创建 Pull Request

### 开发与构建
```bash
npm run build   # 构建项目
npm run lint    # 代码检查
npm test        # 运行测试
```

## 📄 授权协议

本项目基于 **MIT 协议** 开源。  
您可以自由使用、修改和分发此项目。

## 📬 联系与支持

- **GitHub Issues**: [https://github.com/yourusername/StandBuilder/issues](https://github.com/yourusername/StandBuilder/issues)
- **邮箱**: support@standbuilder.com
