// auto-setter 単体テスト

const fs = require('fs');

// CATEGORIES をグローバルに定義
const CATEGORIES = {
  genre: { name: 'ジャンル', label: 'ジャンル', desc: '', dataKey: 'genres', defaultWeight: 0 },
  style: { name: 'スタイル', label: 'スタイル', desc: '曲の雰囲気・表現スタイル', dataKey: 'styles', defaultWeight: 0 },
  mood: { name: 'ムード', label: 'ムード', desc: '曲の感情・気分', dataKey: 'moods', defaultWeight: 0 },
  tempo: { name: 'テンポ', label: 'テンポ', desc: 'BPM・テンポ感', dataKey: 'tempos', defaultWeight: 0 },
  era: { name: '時代・質感', label: '時代・質感', desc: '年代感・録音感', dataKey: 'era', defaultWeight: 0 },
  '年代80': { name: '80年代特化', label: '80年代特化', desc: '80年代に関するあれこれ', dataKey: '年代80', defaultWeight: 0 },
  instrument: { name: '楽器', label: '楽器', desc: '使用楽器を指定', dataKey: 'instruments', defaultWeight: 0 },
};

// 日本語→カテゴリのマッピング（ternlight-engine.js からコピー）
const jpCategoryMap = {
  '80年代': ['era', '年代80'],
  'ポップ': ['genre', 'style'],
  'ポップス': ['genre', 'style'],
  'カフェ': ['style', 'mood'],
  'チル': ['style', 'mood'],
  'おしゃれ': ['style', 'mood'],
  'オシャレ': ['style', 'mood'],
  'アコースティック': ['instrument', 'genre'],
  'ロック': ['genre', 'instrument'],
  'ジャズ': ['genre', 'style'],
  'メタル': ['genre', 'style'],
  'トランス': ['genre'],
};

// 英語→カテゴリのマッピング（ternlight-engine.js からコピー）
const categoryKeywords = {
  'genre': {
    keywords: ['pop', 'rock', 'jazz', 'electronic', 'dance', 'hip hop', 'r&b', 'country', 'folk', 'blues', 'classical', 'ambient', 'reggae', 'metal', 'punk', 'soul', 'funk', 'disco', 'house', 'techno', 'trance', 'dubstep', 'drum and bass', 'synthwave', 'city pop', 'lo-fi', 'bossa nova', 'samba', 'tango', 'acoustic', 'indie', 'alternative', 'experimental', 'world', 'latin', 'lounge', 'cafe', 'music', 'song', 'beat', 'bass', 'drum', 'guitar', 'piano', 'synth', 'vocal', 'rap', 'choir', 'orchestra', 'symphony', 'band'],
    weight: 1.0
  },
  'style': {
    keywords: ['smooth', 'energetic', 'calm', 'relaxed', 'upbeat', 'mellow', 'raw', 'polished', 'elegant', 'stylish', 'chill', 'groovy', 'funky', 'dreamy', 'ethereal', 'cinematic', 'minimal', 'organic', 'modern', 'retro', 'vintage'],
    weight: 1.2
  },
  'mood': {
    keywords: ['happy', 'sad', 'dark', 'bright', 'melancholic', 'euphoric', 'peaceful', 'romantic', 'nostalgic', 'dreamy', 'mysterious', 'hopeful', 'calm', 'energetic', 'relaxed', 'intense', 'gentle', 'sweet', 'warm'],
    weight: 1.1
  },
};

// 日本語テキストからカテゴリを抽出
function extractCategoriesFromFallback(text) {
  const found = {};
  for (const [jp, catIds] of Object.entries(jpCategoryMap)) {
    if (text.includes(jp)) {
      for (const catId of catIds) {
        if (!found[catId]) found[catId] = 0;
        found[catId] += jp.length;
      }
    }
  }
  return found;
}

// 英語テキストからカテゴリを抽出
function extractCategoriesFromEnText(enText) {
  const lower = enText.toLowerCase();
  const found = {};
  for (const [catId, config] of Object.entries(categoryKeywords)) {
    let matchCount = 0;
    for (const kw of config.keywords) {
      if (lower.includes(kw)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      found[catId] = matchCount * config.weight;
    }
  }
  return found;
}

// テストケース
const testCases = [
  // 日本語テスト
  { input: '80年代ポップス', expectedCategories: ['era', '年代80', 'genre', 'style'], type: 'jp' },
  { input: 'お洒落なカフェで流れるチルい曲', expectedCategories: ['style', 'mood'], type: 'jp' },
  
  // 英語テスト
  { input: 'Cafe lounge music, chill vibes', expectedCategories: ['genre', 'style', 'mood'], type: 'en' },
  { input: 'Upbeat dance pop, catchy hooks', expectedCategories: ['genre', 'style'], type: 'en' },
  { input: 'Heavy metal, distorted guitars', expectedCategories: ['genre', 'style'], type: 'en' },
  { input: 'Uplifting Trance', expectedCategories: ['genre'], type: 'en' },
];

console.log('=== auto-setter 単体テスト ===\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  let found = {};
  
  if (tc.type === 'jp') {
    found = extractCategoriesFromFallback(tc.input);
  } else {
    found = extractCategoriesFromEnText(tc.input);
  }

  const foundCategories = Object.keys(found);
  const hasExpected = tc.expectedCategories.some(cat => foundCategories.includes(cat));

  if (hasExpected) {
    console.log(`✓ PASS: "${tc.input}" -> ${JSON.stringify(foundCategories)}`);
    passed++;
  } else {
    console.log(`✗ FAIL: "${tc.input}" -> ${JSON.stringify(foundCategories)} (期待: ${tc.expectedCategories.join(', ')})`);
    failed++;
  }
}

console.log(`\n=== 結果: ${passed}件通過, ${failed}件失敗 ===`);
process.exit(failed > 0 ? 1 : 0);
