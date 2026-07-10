import { embedText, cosineSimilarity, isFallbackMode, extractCategoriesWithTranslation } from './ternlight-engine.js';
import {
  buildCacheKey,
  clearTagIndexDb,
  getDataFingerprint,
  loadTagIndexFromDb,
  saveTagIndexToDb,
} from './tag-index-db.js';

let tagIndex = null;

function getCacheKind() {
  return isFallbackMode() ? 'fallback' : 'wasm';
}

function getCacheKey() {
  return buildCacheKey(getCacheKind(), getDataFingerprint());
}

function serializeVector(vector) {
  return Array.from(vector);
}

async function loadFromCache() {
  const cacheKey = getCacheKey();
  const kind = getCacheKind();

  try {
    const cached = await loadTagIndexFromDb(cacheKey, kind);
    if (cached) {
      console.log(`Tag index loaded from IndexedDB (${kind}, ${cached.length} tags)`);
      return cached;
    }
  } catch (e) {
    console.warn('IndexedDB cache read failed:', e);
  }

  return null;
}

async function saveToCache(index) {
  const cacheKey = getCacheKey();
  const kind = getCacheKind();

  try {
    await saveTagIndexToDb(cacheKey, index, kind);
    console.log(`Tag index saved to IndexedDB (${kind}, ${index.length} tags)`);
  } catch (e) {
    console.warn('IndexedDB cache write failed:', e);
  }
}

export async function buildTagIndex(onProgress, { onCacheMiss } = {}) {
  const cached = await loadFromCache();
  if (cached) {
    tagIndex = cached;
    return { fromCache: true, index: tagIndex };
  }

  onCacheMiss?.();

  const index = [];
  const entries = [];

  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    const items = PROMPT_DATA[cat.dataKey] || [];
    for (const item of items) {
      entries.push({ category: catId, tag: item });
    }
  }

  const total = entries.length;
  for (let i = 0; i < total; i++) {
    const { category, tag } = entries[i];
    const vector = embedText(tag);
    index.push({
      category,
      tag,
      vector: getCacheKind() === 'wasm' ? vector : serializeVector(vector),
    });

    if (onProgress && (i % 50 === 0 || i === total - 1)) {
      onProgress(i + 1, total);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  tagIndex = index;
  await saveToCache(index);
  return { fromCache: false, index };
}

export function getTagIndex() {
  return tagIndex;
}

export async function clearTagIndexCache() {
  await clearTagIndexDb();
  tagIndex = null;
}

export function searchTags(query, topK = 10) {
  if (!tagIndex) return [];

  const queryVector = embedText(query);
  const results = tagIndex.map(item => ({
    ...item,
    score: cosineSimilarity(queryVector, item.vector),
  }));

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

export { isFallbackMode, extractCategoriesWithTranslation };
