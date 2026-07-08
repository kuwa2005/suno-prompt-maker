import { searchTags, extractCategoriesWithTranslation, isFallbackMode } from './tag-index.js';

export async function autoSetWeights(inputText, weightSliders, updateWeightLabels) {
  let categoryScores = {};

  if (isFallbackMode()) {
    // フォールバックモード: 翻訳機能付きのカテゴリ抽出
    categoryScores = await extractCategoriesWithTranslation(inputText);

    // 英語トークンで追加検索
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
    // ternlight モード: 従来の検索
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

  console.log('categoryScores:', categoryScores);

  // スコアを正規化して%に変換
  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);

  // 全スライダーを0%にリセット
  for (const id of Object.keys(weightSliders)) {
    weightSliders[id].value = 0;
  }

  // スコアがあるカテゴリに%を設定
  for (const [catId, score] of Object.entries(categoryScores)) {
    if (weightSliders[catId]) {
      const percent = Math.round((score / totalScore) * 100);
      weightSliders[catId].value = Math.min(100, percent);
    }
  }

  updateWeightLabels();
}