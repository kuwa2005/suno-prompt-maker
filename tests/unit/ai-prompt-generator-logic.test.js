const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const SKIP_CATEGORIES = new Set(['exclude']);

function calcTagBudget(maxChars, translatedMain) {
  const separator = translatedMain ? ', ' : '';
  return maxChars - translatedMain.length - separator.length;
}

function afterAddLength(tags, newTag) {
  if (tags.length === 0) return newTag.length;
  return tags.join(', ').length + 2 + newTag.length;
}

function getThreshold(fallback) {
  return fallback ? 0.05 : 0.3;
}

function filterResults(results, allowedCategories = null, fallback = false) {
  const threshold = getThreshold(fallback);
  return results.filter((r) => {
    if (SKIP_CATEGORIES.has(r.category)) return false;
    if (allowedCategories && !allowedCategories.has(r.category)) return false;
    return r.score >= threshold;
  });
}

function buildSearchQuery(inputText, categoryScores, categories) {
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(inputText);
  if (!hasJapanese || Object.keys(categoryScores).length === 0) {
    return inputText;
  }
  const enTokens = [];
  for (const catId of Object.keys(categoryScores)) {
    const cat = categories[catId];
    if (cat) {
      enTokens.push(...cat.name.toLowerCase().split(/\s+/));
      if (cat.desc) enTokens.push(...cat.desc.toLowerCase().split(/\s+/));
    }
  }
  return enTokens.length > 0 ? enTokens.join(' ') : inputText;
}

const stubCategories = {
  style: { name: 'スタイル', desc: '曲の雰囲気' },
  mood: { name: 'ムード', desc: '感情' },
};

describe('ai-prompt-generator ロジック', () => {
  it('日本語入力はカテゴリスコアがあるとき検索クエリを英語トークンへ拡張', () => {
    const q = buildSearchQuery(
      'お洒落なカフェで流れるチルい曲',
      { style: 1, mood: 0.5 },
      stubCategories,
    );
    assert.match(q, /スタイル|ムード|style|mood/i);
    assert.notEqual(q, 'お洒落なカフェで流れるチルい曲');
  });

  it('英語入力はそのまま検索クエリ', () => {
    const q = buildSearchQuery('80s city pop nostalgic synth', {}, stubCategories);
    assert.equal(q, '80s city pop nostalgic synth');
  });

  it('exclude カテゴリと閾値未満を除外', () => {
    const filtered = filterResults(
      [
        { category: 'genre', tag: 'pop', score: 0.5 },
        { category: 'exclude', tag: 'no', score: 0.9 },
        { category: 'mood', tag: 'calm', score: 0.1 },
      ],
      null,
      false,
    );
    assert.deepEqual(
      filtered.map((r) => r.tag),
      ['pop'],
    );
  });

  it('許可カテゴリ以外を除外（スライダー重み付き）', () => {
    const filtered = filterResults(
      [
        { category: 'genre', tag: 'pop', score: 0.9 },
        { category: 'mood', tag: 'calm', score: 0.9 },
      ],
      new Set(['mood']),
      false,
    );
    assert.deepEqual(filtered.map((r) => r.category), ['mood']);
  });

  it('文字数予算を超えないようタグ追加長を見積もる', () => {
    const maxChars = 30;
    const translatedMain = 'chill cafe track';
    const budget = calcTagBudget(maxChars, translatedMain);
    const tags = [];
    for (const tag of ['pop', 'rock', 'metal']) {
      if (afterAddLength(tags, tag) <= budget) tags.push(tag);
    }
    assert.ok(tags.join(', ').length + translatedMain.length + 2 <= maxChars);
  });
});
