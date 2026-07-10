const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ternlight-engine.js のフォールバック map（サービス実利用に近い抜粋）
const jpCategoryMap = {
  カフェ: ['style', 'mood'],
  チル: ['style', 'mood'],
  流れる: ['style'],
  切ない: ['mood'],
  ボーカル: ['vocal'],
  '80年代': ['era', '年代80'],
};

const categoryKeywords = {
  genre: {
    keywords: ['pop', 'city pop', 'synth', 'dance', 'metal', 'trance'],
    weight: 1.0,
  },
  style: {
    keywords: ['chill', 'nostalgic', 'stylish', 'retro'],
    weight: 1.2,
  },
  mood: {
    keywords: ['nostalgic', 'calm', 'melancholic'],
    weight: 1.1,
  },
  era: {
    keywords: ['80s', 'retro', 'vintage'],
    weight: 1.0,
  },
};

function extractCategoriesFromFallback(text) {
  const found = {};
  for (const [jp, catIds] of Object.entries(jpCategoryMap)) {
    if (text.includes(jp)) {
      for (const catId of catIds) {
        found[catId] = (found[catId] || 0) + jp.length;
      }
    }
  }
  return found;
}

function extractCategoriesFromEnText(enText) {
  const lower = enText.toLowerCase();
  const found = {};
  for (const [catId, config] of Object.entries(categoryKeywords)) {
    let matchCount = 0;
    for (const kw of config.keywords) {
      if (lower.includes(kw)) matchCount++;
    }
    if (matchCount > 0) found[catId] = matchCount * config.weight;
  }
  return found;
}

function hasAnyCategory(found, expected) {
  return expected.some((cat) => Object.prototype.hasOwnProperty.call(found, cat));
}

describe('実利用プロンプト回帰（フォールバック推定）', () => {
  it('お洒落なカフェで流れるチルい曲 → style/mood が空でない', () => {
    const found = extractCategoriesFromFallback('お洒落なカフェで流れるチルい曲');
    assert.ok(hasAnyCategory(found, ['style', 'mood']));
    assert.ok(!hasOnlyWagaku(found));
  });

  it('80s city pop nostalgic synth → genre/style 系', () => {
    const found = extractCategoriesFromEnText('80s city pop nostalgic synth');
    assert.ok(hasAnyCategory(found, ['genre', 'style', 'mood', 'era']));
  });

  it('切ない演歌 女性ボーカル → mood + vocal（演歌はセマンティック依存）', () => {
    const found = extractCategoriesFromFallback('切ない演歌 女性ボーカル');
    assert.ok(found.mood > 0);
    assert.ok(found.vocal > 0);
  });

  it('空文字 → カテゴリなし', () => {
    assert.deepEqual(extractCategoriesFromFallback(''), {});
    assert.deepEqual(extractCategoriesFromEnText(''), {});
  });
});

function hasOnlyWagaku(found) {
  const keys = Object.keys(found);
  return keys.length === 1 && keys[0] === 'wagaku';
}
