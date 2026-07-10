const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const jpCategoryMap = {
  '80年代': ['era', '年代80'],
  ポップ: ['genre', 'style'],
  ポップス: ['genre', 'style'],
  カフェ: ['style', 'mood'],
  チル: ['style', 'mood'],
  おしゃれ: ['style', 'mood'],
  オシャレ: ['style', 'mood'],
  アコースティック: ['instrument', 'genre'],
  ロック: ['genre', 'instrument'],
  ジャズ: ['genre', 'style'],
  メタル: ['genre', 'style'],
  トランス: ['genre'],
};

const categoryKeywords = {
  genre: {
    keywords: ['pop', 'rock', 'jazz', 'dance', 'metal', 'trance', 'cafe', 'lounge'],
    weight: 1.0,
  },
  style: {
    keywords: ['chill', 'upbeat', 'stylish', 'energetic'],
    weight: 1.2,
  },
  mood: {
    keywords: ['happy', 'calm', 'relaxed', 'bright'],
    weight: 1.1,
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
  const keys = Object.keys(found);
  return expected.some((cat) => keys.includes(cat));
}

describe('auto-setter カテゴリ推定ロジック', () => {
  const jpCases = [
    { input: '80年代ポップス', expected: ['era', '年代80', 'genre', 'style'] },
    { input: 'お洒落なカフェで流れるチルい曲', expected: ['style', 'mood'] },
  ];

  for (const { input, expected } of jpCases) {
    it(`日本語: ${input}`, () => {
      const found = extractCategoriesFromFallback(input);
      assert.ok(hasAnyCategory(found, expected), `got ${JSON.stringify(found)}`);
    });
  }

  const enCases = [
    { input: 'Cafe lounge music, chill vibes', expected: ['genre', 'style', 'mood'] },
    { input: 'Upbeat dance pop, catchy hooks', expected: ['genre', 'style'] },
    { input: 'Heavy metal, distorted guitars', expected: ['genre', 'style'] },
    { input: 'Uplifting Trance', expected: ['genre'] },
  ];

  for (const { input, expected } of enCases) {
    it(`英語: ${input}`, () => {
      const found = extractCategoriesFromEnText(input);
      assert.ok(hasAnyCategory(found, expected), `got ${JSON.stringify(found)}`);
    });
  }
});
