# Changelog

All notable changes to `dsh-neuron-memory`.

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
