const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ai-init.js: sunoGetRawWeightSum() === 0 のときタグをクリアしてメインのみ表示
function shouldClearTagsForWeightedAi(rawWeightSum) {
  return rawWeightSum === 0;
}

function assemblePromptLine(translatedMain, tagList) {
  const parts = [];
  if (translatedMain) parts.push(translatedMain);
  if (tagList.length) parts.push(tagList.join(', '));
  return parts.join(', ');
}

describe('AI 重み付き 0% エッジ', () => {
  it('合計 0% ならタグ反映前にクリアすべき', () => {
    assert.equal(shouldClearTagsForWeightedAi(0), true);
    assert.equal(shouldClearTagsForWeightedAi(1), false);
  });

  it('タグなしならメイン（翻訳済み）のみ', () => {
    const line = assemblePromptLine('stylish cafe chill track', []);
    assert.equal(line, 'stylish cafe chill track');
    assert.ok(!line.includes('wagaku'));
  });
});
