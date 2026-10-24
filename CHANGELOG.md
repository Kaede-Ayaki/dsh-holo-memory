# Changelog

All notable changes to `dsh-holo-memory` are documented here.
Format follows Keep a Changelog; versions follow the package version.

## [0.4.0] - 2026-10-24

**主题：从“能召回”到“可核对”。**

### Added

- **来源指针（P0）**：L1/L2/L3 记录新增 `source`，包含
  `sessionId`、`turn`、`seqStart`、`seqEnd`、逐字 `excerpt` 和
  `excerptHash`。新回合写入时自动捕获；旧记录读取时按
  `sessionId/turn` 推导为“仅指针”，不伪造原文。
- **`memory_open(id, maxChars?, history?)`（P0）**：回取一条记忆的逐字
  原文片段、session/turn/seq 指针、哈希校验和修订历史；没有来源时明确
  返回 `source: unavailable`，绝不猜位置。
- **证据等级（P0）**：注入行与 `memory_recall`/`memory_list` 输出带标记：
  `·源`（逐字原文）、`·指针`（仅指针）、`·手写`（手动写入），无标记为
  仅摘要。
- **唯一权威源声明（P0）**：`dsh-holo-memory` 是自动 L1/L2/L3 的权威源；
  ALTM、内置记忆、笔记等只作只读参考，避免双重记账。
- **修订历史（P1）**：记录新增 `revision` 与 `history`（最多 20 个旧快照）；
  L1/L2/L3 内容更新不再静默覆盖旧版本，`memory_open(history=true)` 可查看。
- **记忆体检（P1）**：新增 `memory_doctor(deep?)` 工具、
  `GET /holo-memory/doctor?deep=1` API 和控制台「记忆体检」面板。
  快检覆盖存储、来源覆盖、原文哈希、向量覆盖/漂移、重复内容、引用回写、
  召回审计、阈值合法性；深检会真的打开一条来源并跑一次词法召回探针；
  最后有体检器自检。
- **阈值来历（P1）**：README 新增 10 条阈值与“它防的是哪次具体失败”的
  对照表；`memory_stats`、控制台和 doctor 都会显示当前阈值。
- **误伤观测（P1）**：统计 `injected` / `cited`，把“注入但从未被引用”的
  记录量作为误伤的代理指标，放进 doctor 与控制台。
- **来源覆盖展示**：控制台显示“证据链覆盖率”、每条记录的 revision/历史
  和证据等级；`memory_stats` 增加来源覆盖统计。
- **配置项**：新增 `sourceExcerptMaxChars`（默认 1600）。
- **测试**：从 24 项增至 **31 项**，覆盖来源指针、旧数据迁移、修订历史、
  体检器、控制台 API 和阈值来历。

### Changed

- 新回合的 L1/L2/L3 写入统一经过 `sourceFromTurn`，摘要不再是没有出处的
  孤立断言。
- `memory_stats` 输出明确标注权威源、证据等级、来源覆盖和阈值。
- README 增补“权威源与证据等级”“记忆体检”“阈值来历”章节。
- 包版本 `0.3.0` → `0.4.0`。

### Security / Privacy

- 原文片段写入前统一 `redactSecrets`；`memory_note` 继续拒绝疑似凭据内容。
- 来源片段只保存受控长度（默认 1600 字符），不保存完整会话。

### Upgrade notes

- 需要**完全退出并重启 DSH**，宿主与客户端模块都在启动时加载。
- 旧记录无需迁移：读取时自动回退为“仅指针”，不会破坏现有
  `l1.json` / `l2.json` / `l3.json`。
- 0.4.0 之后新产生的回合才带 `·源`；此前记录显示 `·指针` 是正常状态。
- 首次重启后可运行 `memory_doctor(deep=true)` 或打开控制台「记忆体检」验收。

## [0.3.0] - 2026-10-20

### Added

- **RRF 多通道召回**：BM25 + 中文 bigram、字符 2/3-gram、可选的
  Qwen3-Embedding-8B 向量通道，用 `1/(60+rank)` 融合，按
  `content_hash` 处理并列。
- **Active Window**：高重要度 L2/L3 主动补位，独立字符预算；query 无命中
  时也能携带 resident 背景。
- **引用回写**：注入行带 `(id:xxxxxxxx)`；`turn/end` 扫描 assistant 输出，
  回写 `accessCount` / `citedCount` / `lastAccessedAt`。
- **Band 预算**：`IMMEDIATE / WORKING / BACKGROUND` 三档，active 行优先。
- **工作步骤可视化**：聊天里的召回以 `[长期记忆自动召回 | holo-memory]`
  折叠行展示。
- 配置新增：`activeWindowEnabled`、`activeWindowMaxItems`、
  `activeWindowMaxChars`、`activeWindowMinImportance`、`rrfRankConstant`。

## [0.2.0] - 2026-10-20

### Added

- 可配置的 OpenAI 兼容 embedding 供应商，控制台支持检测/保存 API Key。
- 独立侧边栏「全息记忆」控制台：统计、搜索、按层筛选、删除、召回审计。
- 召回工作步骤行与更清晰的注入元数据。
- SiliconFlow `Qwen/Qwen3-Embedding-8B` 4096D 向量检索接入。

## [0.1.0] - 2026-10-20

### Added

- 初始版本：L1 对话摘要、L2 原子事实、L3 全息胶囊三层记忆。
- 回合结束异步蒸馏、严格 JSON 输出、无 LLM 时的确定性 L1 兜底。
- 本地 JSON 原子写、按 `user` / `project` scope 隔离。
- 词法 + 可选向量混合召回、按字符预算注入、`memory_*` 工具集。

[0.4.0]: https://github.com/Kaede0757-sudo/dsh-holo-memory/compare/ad70f4f...675e4db
