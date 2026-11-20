# Changelog

All notable changes to `dsh-neuron-memory`.

## [0.1.3] - 2026-11-20

**主题：清除残留的 `---` 表格分隔线。**

### Fixed

- `stripMarkdown` 增加 `-{3,}` / `—{3,}` 清理，覆盖表格分隔线和水平线；
- 重新执行 `neuron_ingest(rebuild=true)`。

### Verification

```text
neuron: 13/13 PASS
重建后：457 memory / 1558 entity / 2328 edges
--- audit: memory=0 entity=0 tags=0
Markdown audit: badMemory=0 badEntity=0 badTags=0
```

## [0.1.2] - 2026-11-20

**主题：清洗神经元突触中的 Markdown / HTML / JSON 标签污染。**

### Fixed

- **memory label 清洗**：不再把 L1 summary / L2 text / L3 hologram 里的
  Markdown 标题、引用、列表、表格、粗体、围栏代码块、链接语法直接存进图。
- **JSON 尾部清理**：summary 后附的 `json { ... }` 提示词 payload 不再占据 label。
- **HTML / 标签清洗**：移除 `<thinking>`、未闭合尖括号、未配对方括号、
  Markdown 表格分隔行和剩余强调符号。
- **entity 清洗**：entity 名统一走 NFKC + Markdown 清洗；过滤纯 hash、
  `t_...` 分片、`m_...` / `e_...` 分片等垃圾实体；保留下划线技术名。
- **旧图重建**：备份后执行 `neuron_ingest(rebuild=true)`。

### Verification

```text
neuron: 13/13 PASS
重建后：455 memory / 1534 entity / 2297 edges
Markdown audit: badMemory=0, badEntity=0, badTags=0
```

备份：`graph.json.bak-pre-markdown-20261120`

## [0.1.1] - 2026-11-19

**主题：按 holo-memory 的召回翻车点审计神经元模块。**

### Fixed

- **project scope**：memory 节点保存 `projectKey`；`expand({projectKey})` 只返回
  当前 project 与 user-scoped 记录；holo 自动扩展已传 project。
- **query overlap 闸门**：query 自动扩展的命中必须与候选 label/tags 共享 salient
  query term；显式 seedIds 不受限制。
- **URL 污染**：query 先剥离 URL 再取词，避免 `https/com/id/api` 点亮无关实体。
- **泛实体种子**：过滤 `---/1girl/2d/thinking/提示词/主人令/当前` 等全局桥词；
  自动种子上限 `maxSeedEntities=8`。
- **config 校验**：boolean 字段生效；depth/damping/topK/max* 全部 clamp。
- **maxNodes 清理**：裁掉 memory 节点后重算 entity degree、删孤儿实体。
- **feedback 清理**：移除无效的 `edge.to` memory 判断。
- 新增 `requireQueryOverlap` 配置（默认 true）。

### Tests

```text
neuron: 10/10 PASS
```

## [0.1.0] - 2026-11-19

**首个随 `dsh-holo-memory` 0.5.0 发布的伴侣版本。**

### Added

- 双部图联想索引：`memory` 节点 ↔ `entity` 节点，记录之间不直接连边。
- 只读摄入 `dsh-holo-memory` 的 L1/L2/L3；图只保存 `holoId`、layer、label、
  tags、importance，不复制 canonical 正文。
- 扩散激活：`depth 2`、`damping 0.62`、`minSignal 0.025`、`topK 8`，
  按实体度数做 hub damping。
- P2 增量 sync：只处理新增/修改/删除，删除记录级联清理节点、边和孤儿实体。
- 度数剪枝：`maxDegree 12`，超出时保留最强边。
- 引用反馈：被引用边加强，未被引用边轻微衰减。
- `neuron_ingest` / `neuron_expand` / `neuron_stats` 工具。
- `neuronMemory` 服务：`ingest` / `sync` / `expand` / `feedback` / `stats` / `summary`。
- 并发写修复：唯一临时文件 + 串行写链 + mutation 锁；并发 sync 不再争抢
  `graph.json.tmp`。
- 7/7 单元测试，覆盖只读建图、多跳激活、反馈、增量同步、剪枝、并发写。

### Notes

- 本插件不自己注入上下文；它只把候选 holo id 交给 holo-memory。
- holo-memory 是唯一权威源；neuron 只做联想索引。
- P0/P1/P2 沙箱验证完成，生产 profile 仍需重启后加载。
