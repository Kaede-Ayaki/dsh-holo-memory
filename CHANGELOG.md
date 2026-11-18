# Changelog

All notable changes to `dsh-holo-memory` are documented here.
Format follows Keep a Changelog; versions follow the package version.

## [0.5.1] - 2026-11-19

**主题：修复工作步骤里的召回可视化。**

### Fixed

- **context slot 覆盖注册失败**：
  - 原生 `conversation.chat.node` 的 `context` 已占用 `priority: 0`；
  - 替换 renderer 现在使用 `priority: -1`，按 slot 的“低优先级先渲染”规则 shadow；
  - 注册成功后才设置 `installed = true`，失败时保留原生 renderer 并允许订阅重试；
  - 不再出现 `keyed slot "conversation.chat.node" already has an entry for key "context"`。
- **DSH 0.2.x 轨迹面板兼容**：
  - 当前版本的 context 消息渲染在「轨迹」工作步骤中，该面板没有 per-record 扩展 slot；
  - 增加只读 DOM 装饰器：识别 `[长期记忆自动召回 | holo-memory]` 原生行，替换为可折叠的
    「长期记忆自动召回 | holo-memory · N 字符」details 行；
  - 不修改消息数据、不影响模型上下文、不删除原始文本。
- **验证**：
  - 真实测试 profile「轨迹」页出现可折叠召回行；
  - `details`、`summary`、body 均存在；
  - 页面不再产生 slot 冲突错误。

### Changed

- 包版本 `0.5.0` → `0.5.1`。
- 需要通过完整重启/刷新加载新的 client bundle。

## [0.5.0] - 2026-11-19

**主题：神经元联想索引、P1 联动、控制台子页面与并发写修复。**

### Added

- **P1 神经元联动**：
  - holo 暴露只读 `holoMemory` 服务；
  - `agent/pre-step` 调 `neuronMemory.expand()`，把候选 holo id 作为
    **第四 RRF 通道**；
  - neuron 只提供 id/activation，不复制正文、不自己注入；
  - holo 仍是唯一权威源。
- **neuron 候选保护**：
  - 每个 layer 保留一个 neuron 候选名额；
  - neuron 候选在字符预算中优先于 Active Window；
  - 修复了“候选已命中但在 quota/预算处被裁掉”的触发丢失。
- **引用反馈**：
  - 被引用记录 `citedCount++`；
  - neuron 被引用边加强、未引用边轻微衰减；
  - neuron sync 15 秒节流。
- **控制台「神经元记忆」子页面**：
  - 记忆总览 / 神经元记忆两个视图；
  - 节点/边/平均度数/最大度数、L1/L2/L3 分布、Top 实体、sample memory；
  - 新增 `GET /holo-memory/neuron`；未安装 neuron 时显示“未检测到”。
- **同仓库伴侣插件 `neuron-memory/`（dsh-neuron-memory 0.1.0）**：
  - `memory ↔ entity` 双部图；
  - 扩散激活 `depth 2` / `damping 0.62` / `minSignal 0.025` / `topK 8`；
  - 增量 sync、度数剪枝、级联删除、引用反馈；
  - `neuron_ingest` / `neuron_expand` / `neuron_stats`；
  - `neuronMemory` 服务。

### Fixed

- **neuron graph 并发写导致 host 崩溃**：
  - 崩溃栈：`ENOENT: rename 'graph.json.tmp' -> 'graph.json'`；
  - 根因：固定 `.tmp` 文件名 + 并发 sync；
  - 修复：唯一临时文件名、串行 `writeChain`、mutation 锁、失败清理；
  - holo 侧对可选 `sync/feedback` promise 加 catch，neuron 异常不再拖垮 host。
- **neuron 触发率**：从 80% 提升到 9/10（真实 GUI 复测；剩余 1 次为模型 180s 超时）。
- **旧 L1/L2 长文本挤占预算**：neuron 候选优先保留，避免被 Active Window 挤掉。

### Changed

- 包版本 `0.4.1` → `0.5.0`。
- README：四通道召回、神经元子页面、伴侣插件、测试 34 + 7。
- 推荐生产配置 `injectMaxChars: 5000`；实际注入上限以 profile 配置为准。
- neuron 图默认上限：`maxNodes 5000`、`maxEdges 30000`、`maxDegree 12`。

### Tests

```text
dsh-holo-memory: 34/34 PASS
dsh-neuron-memory: 7/7 PASS
```

### Upgrade notes

- **必须重启 DSH**，新 holo 代码与可选 neuron 插件只在启动时加载。
- 安装 neuron 伴侣插件后，执行一次 `neuron_ingest(rebuild=true)`（或让 holo 自动 sync）建图。
- 未安装 neuron 时，holo 四通道自动退化为三通道，功能不受影响。
- 生产 profile 的 neuron 图可预建；删除记录会级联清理节点/边。
- 回滚：移除 profile 中 `dsh-neuron-memory` dependency/bundle 并重启；holo 原有三通道仍可工作。

## [0.4.1] - 2026-11-06

**主题：每日维护与 L1 归档。**

### Added

- **每日维护定时器**：宿主启动后按本地时间 **04:30** 运行；若 `maintenance.json`
  显示上次运行超过 20 小时或从未运行，启动约 30 秒后补跑一次。
- **L1 归档**：L1 超过 `l1ArchiveAfterDays`（默认 14 天）且重要度低于
  `l1ArchiveKeepImportance`（默认 8）时归档；超过 `l1ArchiveMaxDays`
  （默认 60 天）则无论重要度一律归档。
- **归档前先落盘**：记录先追加到 `archive/l1-YYYY-MM.jsonl`，再从活跃
  `l1.json` 移除；归档文件只追加，不自动删除。
- **`memory_maintenance(olderThanDays?, dryRun?)`**：手动预览/立即执行归档。
- **`maintenance.json`**：记录上次维护时间、归档条数与归档文件路径。
- **doctor 新增 `maintenance:recent`**：最近 48 小时没有维护时给 warn。
- **配置项**：`maintenanceEnabled`、`maintenanceHour`、`maintenanceMinute`、
  `l1ArchiveAfterDays`、`l1ArchiveKeepImportance`、`l1ArchiveMaxDays`。
- **测试**：从 31 项增至 **32 项**，新增归档选择、dry-run、归档文件内容、
  维护状态与下次调度时间断言。

### Changed

- 包版本 `0.4.0` → `0.4.1`。
- README 新增「每日维护与 L1 归档」、数据布局中的 `archive/` 与维护配置。

### Upgrade notes

- 需要重启 DSH 加载新宿主代码；重启后定时器会在约 30 秒后补跑一次。
- 默认只归档过期/低重要度 L1，不删除 L2/L3；如需更激进或更保守，改
  `l1Archive*` 配置。
- 归档文件保留在 `$DSH_HOME/holo-memory/archive/`，可按 `record.id` 搜索。

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
- GitHub 用户名改为 `Kaede-Ayaki`；README / CHANGELOG / PPT 的仓库链接与本地 remote 已同步，旧用户名 URL 仍 301 重定向。
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

[0.4.0]: https://github.com/Kaede-Ayaki/dsh-holo-memory/compare/ad70f4f...675e4db
