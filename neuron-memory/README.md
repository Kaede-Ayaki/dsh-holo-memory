# dsh-neuron-memory · 0.1.0

> 这是 `dsh-holo-memory` 0.5.0 的可选伴侣插件；不是本机旧 L5 的复制。
> **权威事实仍在 `dsh-holo-memory`，本插件只读它，不注入上下文。**

## P2 目标

在 P1 联动之后补上可维护性：

1. **增量 sync**：只处理新增/修改/删除记录，不再每次全量重建；
2. **度数剪枝**：单个实体超过 `maxDegree` 时只保留最强边；
3. **级联删除**：holo 记录删除后，对应 memory 节点、边、孤儿实体自动清理；
4. **hub damping**：扩散时按实体度数衰减，避免通用实体点亮全图；
5. 保留 P1 的只读服务、RRF 第四通道、引用反馈。

## P1 联动

- holo-memory 暴露只读 `holoMemory` 服务；
- holo pre-step 调 `neuronMemory.expand()`，候选作为第四通道并入 RRF；
- holo `turn/end` 把 cited IDs 传给 neuron；
- holo 新记录写入后触发 `neuronMemory.sync()`（15 秒节流）；
- holo 不在时自动退化为纯 holo 召回。

## 数据模型

```text
memory 节点  m:<holoId>
  holoId / layer / label / tags / importance

entity 节点  e:<normalized entity>
  label / degree

边  memory --mentions--> entity
  weight / fireCount
```

记忆之间没有直接边：A 与 B 的“联想”必须经过共享实体，天然避免旧 L5 那种
8 节点/106 边的稠密图。

## 工具

| 工具 | 作用 |
|---|---|
| `neuron_ingest(rebuild?)` | 从 holoMemory 服务或只读 JSON 增量同步 |
| `neuron_expand(query?, seedIds?, depth?, topK?)` | 扩散激活，返回候选 holo id |
| `neuron_stats()` | 节点/边/平均度数 |

`neuron_expand` 只返回候选 id 和 activation；正文仍要 `memory_recall` / `memory_open` 去 holo 取。

## 服务

```ts
neuronMemory.expand({ query, topK })
neuronMemory.sync()          // holo 写入后节流增量刷新
neuronMemory.feedback({ injectedIds, citedIds })
neuronMemory.stats()
```

## 配置

```yaml
- id: neuron-memory
  config:
    graphDir: D:/Deepseek-harness/.dsh/neuron-memory
    holoStoreDir: D:/Deepseek-harness/.dsh/holo-memory
    defaultDepth: 2
    damping: 0.62
    minSignal: 0.025
    topK: 8
    maxNodes: 5000
    maxEdges: 30000
    maxDegree: 12
    maxTagsPerRecord: 16
```

## P2 边界

- neuron 仍然**不自动注入**；只给 holo 提供候选 ID；
- holo-memory 的正文、source、revision、注入预算仍是唯一权威；
- 不做 UI、不做可视化；
- 不读取本机旧 `neural_memory.sqlite3`；
- 仍为沙箱，未安装到真实 profile。

## 压力测试（2026-11-19）

真实 holo 库（482 条可读记录）：

```text
build:        78.21 ms
no-change sync p50: 28.38 ms / p95: 55.94 ms
expand p50:   1.49 ms / p95: 2.73 ms / max: 4.00 ms
graph:        482 memory / 1485 entity / 2267 edge
```

合成 5000 条记录：

```text
build:        167.40 ms
expand p50:   3.88 ms / p95: 5.17 ms
graph:        4461 memory / 539 entity / 4929 edge
```

## 合并测试

- holo P1 合并到干净 worktree：`34/34 PASS`
- 两插件共享 context 组合：`holoMemory` + `neuronMemory` 服务都在，注入 channels 包含 `neuron`
- holo 原有 9 个工具 + neuron 3 个工具均注册

## 运行

```bash
npm install
npm run build
npm test
node bench/benchmark.mjs
```
