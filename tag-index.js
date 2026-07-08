import { embedText, cosineSimilarity } from './ternlight-engine.js';

let tagIndex = null;
const CACHE_KEY = 'suno_tag_vectors';

export async function buildTagIndex() {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    tagIndex = JSON.parse(cached);
    console.log('tagIndex loaded from cache:', tagIndex.length, 'items');
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
  console.log('tagIndex built:', tagIndex.length, 'items');
  return index;
}

export function getTagIndex() {
  return tagIndex;
}

export function searchTags(query, topK = 10) {
  console.log('searchTags called with:', query, 'tagIndex:', tagIndex ? tagIndex.length + ' items' : 'null');

  if (!tagIndex) {
    console.log('tagIndex is null, returning empty array');
    return [];
  }

  const queryVector = embedText(query);
  const results = tagIndex.map(item => ({
    ...item,
    score: cosineSimilarity(queryVector, item.vector)
  }));

  results.sort((a, b) => b.score - a.score);
  console.log('searchTags returning:', results.slice(0, 5));
  return results.slice(0, topK);
}
