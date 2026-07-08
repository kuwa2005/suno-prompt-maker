import { embedText, cosineSimilarity } from './ternlight-engine.js';

let historyVectors = null;

export function buildHistoryIndex(history) {
  historyVectors = history.map((entry, i) => ({
    index: i,
    entry: entry,
    vector: embedText(entry.promptLine + ' ' + (entry.comment || ''))
  }));
}

export function searchHistory(query, history) {
  if (!historyVectors) {
    buildHistoryIndex(history);
  }

  const queryVector = embedText(query);

  const results = historyVectors.map(item => ({
    ...item,
    score: cosineSimilarity(queryVector, item.vector)
  }));

  results.sort((a, b) => b.score - a.score);
  return results.filter(r => r.score > 0.3);
}

export function clearHistoryIndex() {
  historyVectors = null;
}
