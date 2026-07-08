import { searchTags } from './tag-index.js';

export function autoSetWeights(inputText, weightSliders, updateWeightLabels) {
  const results = searchTags(inputText, 100);

  // 類似度 > 0.05 のカテゴリを集約（フォールバックモード対応）
  const categoryScores = {};
  for (const result of results) {
    if (result.score > 0.05) {
      if (!categoryScores[result.category]) {
        categoryScores[result.category] = 0;
      }
      categoryScores[result.category] += result.score;
    }
  }

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