# dsh-neuron-memory · 0.1.2

> 这是 `dsh-holo-memory` 的可选伴侣插件；不是本机旧 L5 的复制。
> **权威事实仍在 `dsh-holo-memory`，本插件只读它，不注入上下文。**
>
> 当前状态：P1/P2 已完成；holo 测试 43/43，neuron 测试 13/13。生产图可选安装；不安装时 holo 自动退化为三通道召回。

## Markdown 清洗

神经元只存突触标签，不存 canonical 正文。同步时对 memory label、entity label
和 tags 统一清洗：

- 去掉 Markdown 标题、引用、列表、表格、粗体/斜体/删除线、围栏代码块、链接语法；
- 去掉 HTML 标签、未闭合尖括号、未配对方括号；
- 去掉 JSON 提示词尾部（`json { ... }`），避免长 payload 占满 label；
- 过滤纯 hash / `t_...` 分片等垃圾实体；
- 保留下划线技术名（如 `comfyui_powershiftscheduler`）和正常实体名。

旧图需执行一次 `neuron_ingest(rebuild=true)`；重建前备份 `graph.json`。

## P2 内容

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
  holoId / layer / label / tags / importance / projectKey

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
| `neuron_expand(query?, seedIds?, projectKey?, depth?, topK?)` | 扩散激活，返回候选 holo id；projectKey 过滤当前项目 + 全局记录 |
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
    maxSeedEntities: 8
    requireQueryOverlap: true
```

### 作用域与噪声控制

- `projectKey` 存在 memory 节点上；holo 自动扩展时只取当前 project + user-scoped；
- query 自动扩展要求候选 label/tags 与 query 有 salient 词重叠；
- 显式 `seedIds` 绕过 query overlap，适合明确知道种子时使用；
- 自动 seed 过滤 `---/1girl/2d/thinking/提示词` 等泛桥词，并先剥离 URL；
- 旧图没有 `projectKey` 时按 legacy 放行，下一次增量 sync 会写入新字段。

## 边界

- neuron 仍然**不自动注入**；只给 holo 提供候选 ID；
- holo-memory 的正文、source、revision、注入预算仍是唯一权威；
- companion 自身不做 UI；控制台的「神经元记忆」页由 holo 侧提供；
- 不读取本机旧 `neural_memory.sqlite3`；
- 可选安装；未安装时 holo 的三通道召回照常工作。

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

- holo 全量：`35/35 PASS`
- neuron 全量：`10/10 PASS`
- 两插件共享 context 组合：`holoMemory` + `neuronMemory` 服务都在，注入 channels 包含 `neuron`
- holo 原有 9 个工具 + neuron 3 个工具均注册

## 运行

```bash
npm install
npm run build
npm test
node bench/benchmark.mjs
```
