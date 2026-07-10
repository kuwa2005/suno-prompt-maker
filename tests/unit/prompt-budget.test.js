const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ai-prompt-generator.js と同じ予算・長さ計算（タグ選択の前提）
function calcTagBudget(maxChars, translatedMain) {
  const separator = translatedMain ? ', ' : '';
  return maxChars - translatedMain.length - separator.length;
}

function afterAddLength(tags, newTag) {
  if (tags.length === 0) return newTag.length;
  return tags.join(', ').length + 2 + newTag.length;
}

function filterResults(results, threshold, skip = new Set(['exclude'])) {
  return results.filter((r) => !skip.has(r.category) && r.score >= threshold);
}

describe('ai-prompt-generator 予算・フィルタ', () => {
  it('翻訳済みメインがあるときタグ予算から区切りを引く', () => {
    assert.equal(calcTagBudget(100, 'hello'), 100 - 5 - 2);
  });

  it('空メインでは区切りを引かない', () => {
    assert.equal(calcTagBudget(100, ''), 100);
  });

  it('タグ追加後の文字数を正しく見積もる', () => {
    assert.equal(afterAddLength([], 'pop'), 3);
    assert.equal(afterAddLength(['pop'], 'rock'), 'pop, rock'.length);
  });

  it('exclude と閾値未満を除外する', () => {
    const filtered = filterResults(
      [
        { category: 'genre', tag: 'pop', score: 0.5 },
        { category: 'exclude', tag: 'no', score: 0.9 },
        { category: 'mood', tag: 'calm', score: 0.1 },
      ],
      0.3,
    );
    assert.deepEqual(
      filtered.map((r) => r.tag),
      ['pop'],
    );
  });
});
