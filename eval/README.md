# eval/ — 检索评估基线（Phase 0）

目的：**先量出现状，再改字段和算法**。所有后续改动（置信度、时间、冲突、衰减）都必须能在这套指标上复跑对比。

## 目录

```text
eval/
  README.md              口径与指标定义
  build-dataset.mjs      从 injections.jsonl 抽弱标注数据集 + 待人工标注清单
  run.mjs                离线跑 recall，输出指标与标注清单
  from-labels.mjs        把标好的 sheet 转成 dataset-human.jsonl
  sample-dataset.jsonl   入库的合成示例（3 条，用来验证脚本能跑）
  dataset.jsonl          真实弱标注集（本地，gitignore）
  candidates.jsonl       待人工标注 query（本地，gitignore）
  label-sheet.md         人工标注清单（本地，gitignore）
  baseline-*.json        聚合指标（入库，不含 query 原文）
```

## 指标

| 指标 | 定义 |
|---|---|
指标分四组，分子分母不再混用：

| 组 | 指标 | 定义 |
|---|---|---|
| `query` | recall/precision/MRR/nDCG/hit/quiet | 只看查询命中项（不含 resident） |
| `resident` | avgItems / negativeWithResident | Active Window 常驻注入量 |
| `finalInjected` | avgItems / expectedCoverage | 查询 + resident 的最终注入 |
| `quality` | evidenceRate / staleRate / expectedSurvival / evaporated | 证据、时效与标注存活 |
| `reproducibility` | datasetSha256 / storeSha256 | 固定数据与 store 快照哈希 |

> 指标只统计**查询命中项**；active-window（resident）项单独计数，不混进 Recall。

## 数据集格式

`dataset.jsonl` 每行：

```json
{"id":"w-0001","query":"...","cwd":"D:\\\\Deepseek-harness","expected":["l2_xxx"],"distractors":[],"k":5,"annotator":"injection-weak","note":"weak: what 0.7.0 injected"}
```

- `annotator`：`injection-weak`（系统当时注入的 id，只能测稳定性）、`human`（人工标注，才是真正的相关性）。
- `distractors`：明确不应命中的 id，Phase 0.3 再补。

## 运行

```powershell
# 1) 从注入日志抽数据（本地，不入库）
node eval/build-dataset.mjs --injections "$env:USERPROFILE\..\Deepseek-harness\.dsh\holo-memory\injections.jsonl" --out eval\dataset.jsonl --candidates 120

# 2a) 纯 lexical + ngram（离线、可复现，做算法对照）
node eval/run.mjs --data ".dsh/holo-memory" --dataset eval\dataset.jsonl `
  --live-config ".dsh/profiles/desktop/cordis.patch.yml" `
  --out eval\baseline-0.7.0-lexical.json

# 2b) 生产等价（vector + neuron + active window；需要 SiliconFlow key 与网络）
node eval/run.mjs --data ".dsh/holo-memory" --dataset eval\dataset.jsonl `
  --live-config ".dsh/profiles/desktop/cordis.patch.yml" `
  --vector --neuron --active `
  --out eval\baseline-0.7.0.json

# 3) 生成人工标注清单（query + Top-5，供逐条打勾）
node eval/run.mjs --data "D:\Deepseek-harness\.dsh\holo-memory" --label eval\label-sheet.md
```

## 人工标注流程

1. 打开 `eval/label-sheet-50.md`（或 `label-sheet.md` 全量 138 条）；
2. 每个 query 一张表，在「命中」列打 `✓` 表示该条记忆本该被召回；**都不命中就留空**（表示无相关）；
3. 存盘后运行：

```powershell
node eval/from-labels.mjs --sheet eval/label-sheet-50.md --out eval/dataset-human.jsonl
node eval/run.mjs --data ".dsh/holo-memory" --dataset eval/dataset-human.jsonl `
  --live-config ".dsh/profiles/desktop/cordis.patch.yml" --vector --neuron --active `
  --out eval/baseline-human.json
```

`label-sheet-50.md` 与 `dataset-human.jsonl` 都含真实 query，已被 gitignore。

## 通道开关

| 开关 | 作用 |
|---|---|
| `--live-config <yml>` | 从 DSH profile 读真实的 inject 配额/阈值/embedding 配置（桌面端：`.dsh/profiles/desktop/cordis.patch.yml`） |
| `--vector` | 打开向量通道（读 `embedding.json` + `keyFile`，走真实 API） |
| `--neuron` | 打开神经元联想通道（读 `.dsh/neuron-memory/graph.json`） |
| `--active` | 把 active-window（resident）条目也算进返回结果（生产注入包含它们） |

四路通道可以任意组合做消融：`lexical / +vector / +neuron / +active`。

## 可复现策略

- `eval/regression-manifest.json` 记录私有 human 数据集的 SHA-256、条数、正负例数与 store 快照哈希；
- 真实 query 不入库（含隐私），任何人拿到同一份私有 `dataset-human.jsonl` 都可用 `node eval/check-regression.mjs --store ...` 校验哈希后再跑；
- committed baseline（`eval/baseline-1.0.2.json`）记录同一组 dataset/store 哈希；哈希对不上时先停下，不要拿数字做比较；
- `node eval/regression.mjs` 会校验哈希 → 实跑 evaluator → 与基线比较（默认允许 5% 回落），指标下降超阈值即非零退出；`npm run eval:regression` 等价。

## 隐私

`dataset.jsonl`、`candidates.jsonl`、`label-sheet.md` 含真实对话 query，**一律 gitignore，不进仓库**。  
`baseline-*.json` 只保留聚合指标与记录 id，不含 query 原文，可以入库。

## 口径提醒

- 弱标注集上的数字只回答「现在的召回和 0.7.0 当时一致吗」，不回答「召回到的东西对不对」；
- 真正的 Recall@K 要等 `label-sheet.md` 人工标完之后，用 `annotator: human` 的子集单独跑一份；
- 跑完基线后，任何算法/阈值改动都必须先跑同一命令，指标下降不许合入。
