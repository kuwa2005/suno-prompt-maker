import { embedText, cosineSimilarity } from './ternlight-engine.js';

let tagIndex = null;
const CACHE_KEY = 'suno_tag_vectors';

export async function buildTagIndex() {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    tagIndex = JSON.parse(cached);
    return tagIndex;
  }

  const index = [];
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    const items = PROMPT_DATA[cat.dataKey] || [];
    for (const item of items) {
      const vector = embedText(item);
      index.push({
        category: catId,
        tag: item,
        vector: Array.from(vector)
      });
    }
  }

  tagIndex = index;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(index));
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
