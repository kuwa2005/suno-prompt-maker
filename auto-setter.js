import { searchTags, extractCategoriesWithTranslation, isFallbackMode } from './tag-index.js';

// AI反映時に除外するカテゴリ（ジャンルは意図的にランダム要素として残す）
const EXCLUDED_CATEGORIES = ['genre'];

export async function autoSetWeights(inputText, weightSliders, updateWeightLabels) {
  console.log('autoSetWeights input:', inputText);
  let categoryScores = {};

  if (isFallbackMode()) {
    console.log('Using fallback mode');
    categoryScores = await extractCategoriesWithTranslation(inputText);
    console.log('extractCategoriesWithTranslation result:', categoryScores);

    const enTokens = [];
    for (const [catId, score] of Object.entries(categoryScores)) {
      const cat = CATEGORIES[catId];
      if (cat) {
        enTokens.push(...cat.name.toLowerCase().split(/\s+/));
        if (cat.desc) enTokens.push(...cat.desc.toLowerCase().split(/\s+/));
      }
    }

    console.log('enTokens:', enTokens);

    if (enTokens.length > 0) {
      const enQuery = enTokens.join(' ');
      const results = searchTags(enQuery, 50);
      console.log('searchTags results:', results.length);
      for (const result of results) {
        if (result.score > 0.05) {
          if (!categoryScores[result.category]) {
            categoryScores[result.category] = 0;
          }
          categoryScores[result.category] += result.score;
        }
      }
    }
  } else {
    console.log('Using ternlight mode');
    const results = searchTags(inputText, 100);
    console.log('searchTags results:', results.length);
    for (const result of results) {
      if (result.score > 0.3) {
        if (!categoryScores[result.category]) {
          categoryScores[result.category] = 0;
        }
        categoryScores[result.category] += result.score;
      }
    }
  }

  console.log('categoryScores before exclusion:', categoryScores);

  // 除外カテゴリを削除
  for (const catId of EXCLUDED_CATEGORIES) {
    delete categoryScores[catId];
  }

  console.log('categoryScores after exclusion:', categoryScores);

  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
  console.log('totalScore:', totalScore);

  for (const id of Object.keys(weightSliders)) {
    weightSliders[id].value = 0;
  }

  for (const [catId, score] of Object.entries(categoryScores)) {
    if (weightSliders[catId]) {
      const percent = Math.round((score / totalScore) * 100);
      weightSliders[catId].value = Math.min(100, percent);
    }
  }

  updateWeightLabels();
}