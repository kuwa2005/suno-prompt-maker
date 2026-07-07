import { embedText, cosineSimilarity } from './ternlight-engine.js';

let tagIndex = null;

export async function buildTagIndex() {
  const index = [];

  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    const items = PROMPT_DATA[cat.dataKey] || [];
    for (const item of items) {
      const vector = embedText(item);
      index.push({
        category: catId,
        tag: item,
        vector: vector
      });
    }
  }

  tagIndex = index;
  return index;
}

export function getTagIndex() {
  return tagIndex;
}

export function searchTags(query, topK = 10) {
  if (!tagIndex) return [];

  const queryVector = embedText(query);
  const results = tagIndex.map(item => ({
    ...item,
    score: cosineSimilarity(queryVector, item.vector)
  }));

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
