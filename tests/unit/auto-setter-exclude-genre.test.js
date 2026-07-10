const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const EXCLUDED_CATEGORIES = ['genre'];

function stripExcludedCategories(categoryScores) {
  const scores = { ...categoryScores };
  for (const catId of EXCLUDED_CATEGORIES) {
    delete scores[catId];
  }
  return scores;
}

function activeWeightIds(normalizedWeights, weightIds) {
  return weightIds.filter((id) => normalizedWeights[id] > 0);
}

describe('auto-setter / スライダー境界', () => {
  it('AI反映時に genre スコアを除外する', () => {
    const stripped = stripExcludedCategories({ genre: 10, mood: 5, style: 3 });
    assert.ok(!('genre' in stripped));
    assert.equal(stripped.mood, 5);
  });

  it('全スライダー 0% のときアクティブカテゴリは空', () => {
    const ids = ['genre', 'mood', 'style'];
    const weights = { genre: 0, mood: 0, style: 0 };
    assert.deepEqual(activeWeightIds(weights, ids), []);
  });
});
