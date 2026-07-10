import { searchTags, isFallbackMode, extractCategoriesWithTranslation } from './tag-index.js';
import { translateMainPrompt } from './ternlight-engine.js';

const SKIP_CATEGORIES = new Set(['exclude']);

function getThreshold() {
  return isFallbackMode() ? 0.05 : 0.3;
}

function calcTagBudget(maxChars, translatedMain) {
  const separator = translatedMain ? ', ' : '';
  return maxChars - translatedMain.length - separator.length;
}

function tagsJoinLength(tags) {
  return tags.length > 0 ? tags.join(', ').length : 0;
}

function afterAddLength(tags, newTag) {
  if (tags.length === 0) return newTag.length;
  return tags.join(', ').length + 2 + newTag.length;
}

async function buildSearchQuery(inputText) {
  const categoryScores = await extractCategoriesWithTranslation(inputText);
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(inputText);
  if (!hasJapanese || Object.keys(categoryScores).length === 0) {
    return inputText;
  }

  const enTokens = [];
  for (const catId of Object.keys(categoryScores)) {
    const cat = CATEGORIES[catId];
    if (cat) {
      enTokens.push(...cat.name.toLowerCase().split(/\s+/));
      if (cat.desc) enTokens.push(...cat.desc.toLowerCase().split(/\s+/));
    }
  }

  return enTokens.length > 0 ? enTokens.join(' ') : inputText;
}

function filterResults(results, allowedCategories = null) {
  const threshold = getThreshold();
  return results.filter((r) => {
    if (SKIP_CATEGORIES.has(r.category)) return false;
    if (allowedCategories && !allowedCategories.has(r.category)) return false;
    return r.score >= threshold;
  });
}

function groupByCategory(results) {
  const byCat = {};
  for (const r of results) {
    if (!byCat[r.category]) byCat[r.category] = [];
    byCat[r.category].push(r);
  }
  return byCat;
}

function selectTagsDirect(filtered, tagBudget) {
  const tagsByCategory = {};
  const selectedFlat = [];
  const usedTags = new Set();
  const seenCats = new Set();

  const canAdd = (tag) => afterAddLength(selectedFlat, tag) <= tagBudget;

  for (const r of filtered) {
    if (seenCats.has(r.category) || usedTags.has(r.tag)) continue;
    if (canAdd(r.tag)) {
      if (!tagsByCategory[r.category]) tagsByCategory[r.category] = [];
      tagsByCategory[r.category].push(r.tag);
      selectedFlat.push(r.tag);
      usedTags.add(r.tag);
      seenCats.add(r.category);
    }
  }

  for (const r of filtered) {
    if (usedTags.has(r.tag)) continue;
    if (canAdd(r.tag)) {
      if (!tagsByCategory[r.category]) tagsByCategory[r.category] = [];
      tagsByCategory[r.category].push(r.tag);
      selectedFlat.push(r.tag);
      usedTags.add(r.tag);
    }
  }

  return tagsByCategory;
}

function selectTagsWeighted(filtered, activeIds, normalizedWeights, tagBudget) {
  const byCat = groupByCategory(filtered);
  const tagsByCategory = {};
  const selectedFlat = [];
  const usedTags = new Set();

  const canAdd = (tag) => afterAddLength(selectedFlat, tag) <= tagBudget;

  for (const catId of activeIds) {
    tagsByCategory[catId] = [];
    for (const r of byCat[catId] || []) {
      if (!usedTags.has(r.tag) && canAdd(r.tag)) {
        tagsByCategory[catId].push(r.tag);
        selectedFlat.push(r.tag);
        usedTags.add(r.tag);
        break;
      }
    }
  }

  const totalWeight = activeIds.reduce((sum, id) => sum + normalizedWeights[id], 0);
  let safety = 0;

  while (safety < 500) {
    safety++;
    if (tagsJoinLength(selectedFlat) >= tagBudget) break;

    let roll = Math.random() * totalWeight;
    let pickedId = activeIds[0];
    for (const id of activeIds) {
      roll -= normalizedWeights[id];
      if (roll <= 0) {
        pickedId = id;
        break;
      }
    }

    let added = false;
    for (const r of byCat[pickedId] || []) {
      if (!usedTags.has(r.tag) && canAdd(r.tag)) {
        tagsByCategory[pickedId].push(r.tag);
        selectedFlat.push(r.tag);
        usedTags.add(r.tag);
        added = true;
        break;
      }
    }

    if (!added) {
      let anyAdded = false;
      for (const id of activeIds) {
        for (const r of byCat[id] || []) {
          if (!usedTags.has(r.tag) && canAdd(r.tag)) {
            tagsByCategory[id].push(r.tag);
            selectedFlat.push(r.tag);
            usedTags.add(r.tag);
            anyAdded = true;
            break;
          }
        }
        if (anyAdded) break;
      }
      if (!anyAdded) break;
    }
  }

  return tagsByCategory;
}

export async function generateDirectPrompt(mainText, maxChars) {
  const translatedMain = mainText ? await translateMainPrompt(mainText) : '';
  if (!translatedMain.trim()) {
    return { tagsByCategory: {}, translatedMain: '' };
  }

  const tagBudget = calcTagBudget(maxChars, translatedMain);
  if (tagBudget <= 0) {
    return { tagsByCategory: {}, translatedMain };
  }

  const query = await buildSearchQuery(mainText);
  const results = searchTags(query, 150);
  const filtered = filterResults(results);
  const tagsByCategory = selectTagsDirect(filtered, tagBudget);

  return { tagsByCategory, translatedMain };
}

export async function generateWeightedPrompt(mainText, normalizedWeights, weightIds, maxChars) {
  const translatedMain = mainText ? await translateMainPrompt(mainText) : '';
  const activeIds = weightIds.filter((id) => normalizedWeights[id] > 0);

  if (activeIds.length === 0) {
    return { tagsByCategory: {}, translatedMain };
  }

  const tagBudget = calcTagBudget(maxChars, translatedMain);
  if (tagBudget <= 0) {
    return { tagsByCategory: {}, translatedMain };
  }

  const query = mainText.trim() ? await buildSearchQuery(mainText) : '';
  const searchInput = query || activeIds.map((id) => CATEGORIES[id]?.name || id).join(' ');
  const results = searchTags(searchInput, 150);
  const allowed = new Set(activeIds);
  const filtered = filterResults(results, allowed);
  const tagsByCategory = selectTagsWeighted(filtered, activeIds, normalizedWeights, tagBudget);

  return { tagsByCategory, translatedMain };
}
