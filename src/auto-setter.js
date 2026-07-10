import { searchTags, extractCategoriesWithTranslation, isFallbackMode } from './tag-index.js';

// AI反映時に除外するカテゴリ（ジャンルは意図的にランダム要素として残す）
const EXCLUDED_CATEGORIES = ['genre'];

function buildSearchQuery(inputText, categoryScores) {
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

export async function autoSetWeights(inputText, weightSliders, updateWeightLabels) {
  const categoryScores = await extractCategoriesWithTranslation(inputText);
  const threshold = isFallbackMode() ? 0.05 : 0.3;
  const topK = isFallbackMode() ? 50 : 100;
  const searchQuery = buildSearchQuery(inputText, categoryScores);

  const results = searchTags(searchQuery, topK);
  for (const result of results) {
    if (result.score > threshold) {
      if (!categoryScores[result.category]) {
        categoryScores[result.category] = 0;
      }
      categoryScores[result.category] += result.score;
    }
  }

  for (const catId of EXCLUDED_CATEGORIES) {
    delete categoryScores[catId];
  }

  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);

  for (const id of Object.keys(weightSliders)) {
    weightSliders[id].value = 0;
  }

  if (totalScore > 0) {
    for (const [catId, score] of Object.entries(categoryScores)) {
      if (weightSliders[catId]) {
        const percent = Math.round((score / totalScore) * 100);
        weightSliders[catId].value = Math.min(100, percent);
      }
    }
  }

  updateWeightLabels();
}
