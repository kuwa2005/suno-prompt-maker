import { searchTags, extractCategoriesWithTranslation, isFallbackMode } from './tag-index.js';

export async function autoSetWeights(inputText, weightSliders, updateWeightLabels) {
  let categoryScores = {};

  if (isFallbackMode()) {
    categoryScores = await extractCategoriesWithTranslation(inputText);

    const enTokens = [];
    for (const [catId, score] of Object.entries(categoryScores)) {
      const cat = CATEGORIES[catId];
      if (cat) {
        enTokens.push(...cat.name.toLowerCase().split(/\s+/));
        if (cat.desc) enTokens.push(...cat.desc.toLowerCase().split(/\s+/));
      }
    }

    if (enTokens.length > 0) {
      const enQuery = enTokens.join(' ');
      const results = searchTags(enQuery, 50);
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
    const results = searchTags(inputText, 100);
    for (const result of results) {
      if (result.score > 0.3) {
        if (!categoryScores[result.category]) {
          categoryScores[result.category] = 0;
        }
        categoryScores[result.category] += result.score;
      }
    }
  }

  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);

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