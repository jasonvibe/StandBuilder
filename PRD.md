# 本地初始化知识库 + SPA + AI 技术结构方案（Vibe Coding 版）

> 定位：**离线优先、规则为主、AI 兜底** 的单页初始化生成工具

---

## 一、整体技术目标

- 将现有 **Excel 标准资产** 转化为：
  - 规则可计算
  - AI 可理解
  - 系统可导入
- 支撑「新客户项目初始化 → 生成标准清单」这一核心链路
- 本地部署、可断网运行

---

## 二、总体架构（逻辑视图）

```
┌────────────────────────┐
│        前端 SPA         │
│  项目特征填写 / 清单UI │
└───────────▲────────────┘
            │ REST / Local API
┌───────────┴────────────┐
│     本地业务引擎层      │
│  规则匹配 + 清单生成    │
│  AI 兜底（可选）        │
└───────────▲────────────┘
            │ File / Memory
┌───────────┴────────────┐
│   本地初始化知识库     │
│ Excel / JSON / MD      │
└────────────────────────┘
```

---

## 三、本地初始化知识库结构（核心）

### 3.1 目录级结构（推荐）

```
knowledge_base/
├─ standards_master.xlsx     # 标准主表（权威）
├─ rules_mapping.xlsx        # 规则映射表
├─ semantic_descriptions.md  # 语义补充（给 AI）
└─ meta/
   └─ version.json           # 版本与更新时间
```

---

### 3.2 standards_master.xlsx（最重要）

**一行 = 一个“可被选中”的标准单元**

| 字段名 | 说明 |
|---|---|
| standard_id | 唯一ID |
| standard_name | 标准名称 |
| standard_type | 制度 / 检查表 / 指标 / 问题 / 材料 |
| industry | 适用行业（多选） |
| project_type | 新建 / 改扩建 |
| priority | mandatory / recommended |
| description | 人类可读说明 |
| source | 来源文件 |

👉 **规则引擎只信这一张表**

---

### 3.3 rules_mapping.xlsx（规则显式化）

| rule_id | industry | project_type | include_standard_ids |
|---|---|---|---|
| R001 | 地产 | 新建 | QC-001, SAFE-002 |

- 规则优先级高于 AI
- 命中即选

---

### 3.4 semantic_descriptions.md（AI 兜底专用）

```md
## QC-001 工程质量管理制度
适用场景：
- 多专业并行施工
- 对交付质量要求高的项目

不建议使用场景：
- 小规模改造工程
```

👉 **AI 只能用这层补充，不得推翻规则结果**

---

## 四、本地业务引擎设计（关键逻辑）

### 4.1 核心模块拆分

```
engine/
├─ loader.ts        # 读取 Excel / JSON
├─ ruleEngine.ts    # 规则匹配
├─ aiAdvisor.ts     # AI 兜底（可开关）
├─ merger.ts        # 合并 / 去重 / 标记来源
└─ exporter.ts      # Excel / JSON 导出
```

---

### 4.2 规则匹配伪逻辑

```
input: 项目特征
for rule in rules:
  if rule.match(input):
    include standards
mark source = "rule"
```

- 规则结果 = 强确定性
- 不可被 AI 覆盖

---

### 4.3 AI 兜底逻辑（可选启用）

触发条件：
- 命中标准数量 < 阈值
- 或人工点击「AI 补充建议」

```
prompt = 项目特征 + 已选标准 + semantic_descriptions
AI 输出：候选 standard_id + 原因
```

所有 AI 输出必须：
- 显式标记 source = "AI"
- 等待人工确认

---

## 五、SPA 前端结构（极简但专业）

### 5.1 页面流

1️⃣ 项目特征填写页
- 行业（下拉）
- 新建 / 改扩建（单选）

2️⃣ 初始化清单页（核心）
- 按标准类型分组
- 勾选 / 取消
- 标签：规则命中 / AI 建议

3️⃣ 导出页
- 导出 Excel（主）
- 导出 JSON（次）

---

## 六、技术选型建议（不锁死）

- 前端：React / Vue + 本地状态管理
- 后端（可选）：Node / Python（FastAPI）
- Excel 解析：SheetJS / pandas
- AI：本地 LLM 或 API（配置开关）

---

## 七、为什么这套结构「非常稳」

- Excel 是单一事实源（不会黑箱）
- 规则逻辑可回溯、可解释
- AI 永远是辅助，不是裁判
- 离线可跑，Demo 与生产一致

---

## 八、下一步最关键的落地动作

> **不是写代码，而是“喂数据”**

1. 用现有 Excel 套 standards_master 模板
2. 拉实施顾问一起补 rules_mapping
3. 先跑一个行业 + 新建场景

---

## 九、产品级结论

你做的不是一个工具，而是：

> **把人的经验，固化成一套“可重复初始化能力”**

这会成为你系统交付能力里，**最值钱的一层资产**。

