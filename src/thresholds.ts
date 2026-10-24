/**
 * Every tunable threshold names the concrete failure it prevents. A number
 * without a failure story is a future misfire nobody can explain.
 */
import type { HoloConfig } from './config.js';

export interface ThresholdNote {
  key: string;
  value: number;
  prevents: string;
}

export function thresholdAudit(config: HoloConfig): ThresholdNote[] {
  return [
    { key: 'injectMinScore', value: config.injectMinScore, prevents: '无关问题因轻微词面重合被注入，制造噪声' },
    { key: 'injectMaxChars', value: config.injectMaxChars, prevents: '长记忆挤占对话上下文、拉高首 token 延迟' },
    { key: 'activeWindowMaxChars', value: config.activeWindowMaxChars, prevents: '主动补位变成常驻大段背景，压过本轮问题' },
    { key: 'activeWindowMinImportance', value: config.activeWindowMinImportance, prevents: '低价值记忆每轮都被主动携带' },
    { key: 'extractMinTurnChars', value: config.extractMinTurnChars, prevents: '寒暄、单字回合生成无意义 L1' },
    { key: 'extractMaxTranscriptChars', value: config.extractMaxTranscriptChars, prevents: '超长回合把蒸馏 prompt 撑爆、超时' },
    { key: 'sourceExcerptMaxChars', value: config.sourceExcerptMaxChars, prevents: '原文片段把记忆文件撑大、挤占注入预算' },
    { key: 'rrfRankConstant', value: config.rrfRankConstant, prevents: '单一通道靠前几名垄断融合排名' },
    { key: 'embeddingBaseline', value: config.embeddingBaseline, prevents: '无关文本的余弦相似度伪装成相关' },
    { key: 'queryEmbeddingTimeoutMs', value: config.queryEmbeddingTimeoutMs, prevents: 'embedding 抖动拖慢 pre-step、阻塞对话' },
  ];
}
