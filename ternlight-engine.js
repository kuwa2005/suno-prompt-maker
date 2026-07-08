let isInitialized = false;
let embedFn = null;
let cosineSimFn = null;
let fallbackMode = false;
let translatorReady = false;

// Chrome Translator API の初期化
let translator = null;

async function initTranslator() {
  if ('Translator' in self) {
    try {
      const availability = await Translator.availability({
        sourceLanguage: 'ja',
        targetLanguage: 'en',
      });
      if (availability === 'available' || availability === 'downloadable') {
        translator = await Translator.create({
          sourceLanguage: 'ja',
          targetLanguage: 'en',
        });
        translatorReady = true;
        console.log('Translator API ready');
      }
    } catch (e) {
      console.warn('Translator API not available:', e);
    }
  }
}

// 日本語テキストを英語に翻訳
async function translateJpToEn(text) {
  if (translatorReady && translator) {
    try {
      return await translator.translate(text);
    } catch (e) {
      console.warn('Translation failed:', e);
    }
  }
  return null;
}

// 日本語→英語のフォールバックマッピング
const JP_FALLBACK_MAP = {
  'ジャンル': 'genre',
  'スタイル': 'style',
  'ムード': 'mood',
  'テンポ': 'tempo',
  '高速テンポ': 'fast tempo',
  'スローテンポ': 'slow tempo',
  'メジャーコード': 'major chord',
  'マイナーコード': 'minor chord',
  'キラキラ': 'sparkle bright',
  'ダーク': 'dark heavy',
  'ピアノ': 'piano',
  '和楽器': 'traditional japanese',
  'カフェ': 'cafe lounge',
  'チル': 'chill relaxed',
  'アコースティック': 'acoustic guitar',
  'ロック': 'rock guitar',
  'ポップ': 'pop catchy',
  'ジャズ': 'jazz smooth',
  'エレクトロ': 'electronic synth',
  'アンビエント': 'ambient atmospheric',
  'フォーク': 'folk acoustic',
  'シティポップ': 'city pop',
  'シンセウェーブ': 'synthwave retro',
  'ヒップホップ': 'hip hop beat',
  'レゲエ': 'reggae offbeat',
  'メタル': 'metal heavy',
  'パンク': 'punk raw',
  'おしゃれ': 'stylish elegant',
  'オシャレ': 'stylish elegant',
  'リラックス': 'relax calm',
  '元気': 'energetic upbeat',
  '静か': 'quiet calm',
  '激しい': 'heavy aggressive',
  '甘い': 'sweet soft',
  '切ない': 'melancholic sad',
  '明るい': 'bright happy',
  '暗い': 'dark moody',
  '夜': 'night dark',
  '朝': 'morning bright',
  '夏': 'summer beach',
  '冬': 'winter snow',
  '雨': 'rain melancholic',
  '海': 'ocean beach',
  '流れる': 'flowing smooth',
  '踊る': 'dance groove',
  '曲': 'music melody',
  'リズム': 'rhythm beat',
};

// 日本語テキストを英語トークンに変換
function jpToEnTokens(text) {
  const tokens = [];

  // フォールバックマッピングからキーワード抽出
  for (const [jp, en] of Object.entries(JP_FALLBACK_MAP)) {
    if (text.includes(jp)) {
      tokens.push(...en.split(' '));
    }
  }

  return tokens;
}

export async function initTernlight() {
  if (isInitialized) return;

  // Translator API を並行で初期化
  initTranslator();

  try {
    const module = await import('https://cdn.jsdelivr.net/npm/@ternlight/base@latest/dist/index.mjs');
    embedFn = module.embed;
    cosineSimFn = module.cosineSim;
    isInitialized = true;
  } catch (error) {
    console.warn('ternlight unavailable, using fallback mode');
    fallbackMode = true;

    embedFn = (text) => jpToEnTokens(text);

    cosineSimFn = (a, b) => {
      if (!a.length || !b.length) return 0;
      const setA = new Set(a);
      const setB = new Set(b);
      const intersection = [...setA].filter(x => setB.has(x));
      return intersection.length / Math.max(setA.size, setB.size, 1);
    };

    isInitialized = true;
  }
}

export function embedText(text) {
  if (!isInitialized) throw new Error('ternlight not initialized');
  return embedFn(text);
}

export function cosineSimilarity(vecA, vecB) {
  if (!isInitialized) throw new Error('ternlight not initialized');
  return cosineSimFn(vecA, vecB);
}

export function isReady() {
  return isInitialized;
}

export function isFallbackMode() {
  return fallbackMode;
}

// Chrome Translator API を使用した翻訳付きのカテゴリ抽出
export async function extractCategoriesWithTranslation(text) {
  // まずフォールバックマッピングで試行
  const fallbackResult = extractCategoriesFromFallback(text);

  // Chrome Translator API が利用可能なら翻訳を試行
  if (translatorReady) {
    const enText = await translateJpToEn(text);
    if (enText) {
      console.log('Translated:', enText);
      const translatedResult = extractCategoriesFromEnText(enText);
      // 翻訳結果を優先
      if (Object.keys(translatedResult).length > 0) {
        return translatedResult;
      }
    }
  }

  return fallbackResult;
}

// フォールバックマッピングからカテゴリを抽出
function extractCategoriesFromFallback(text) {
  const found = {};
  for (const [jp, en] of Object.entries(JP_FALLBACK_MAP)) {
    if (text.includes(jp)) {
      const catId = findCategoryByKeyword(en);
      if (catId) {
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

  // カテゴリのキーワードリスト（カテゴリ固有のキーワード）
  const categoryKeywords = {
    'genre': ['pop', 'rock', 'jazz', 'electronic', 'dance', 'hip hop', 'r&b', 'country', 'folk', 'blues', 'classical', 'ambient', 'reggae', 'metal', 'punk', 'soul', 'funk', 'disco', 'house', 'techno', 'trance', 'dubstep', 'drum and bass', 'synthwave', 'city pop', 'lo-fi', 'bossa nova', 'samba', 'tango'],
    'style': ['smooth', 'energetic', 'calm', 'aggressive', 'relaxed', 'upbeat', 'mellow', 'raw', 'polished', 'elegant', 'warm', 'cold', 'bright', 'dark', 'soft', 'heavy', 'light', 'minimal', 'maximal', 'organic', 'electronic', 'acoustic', 'electric', 'modern', 'retro', 'vintage', 'futuristic'],
    'mood': ['happy', 'sad', 'dark', 'bright', 'melancholic', 'euphoric', 'peaceful', 'tense', 'romantic', 'nostalgic', 'dreamy', 'aggressive', 'mysterious', 'hopeful', 'anxious', 'calm', 'energetic', 'relaxed', 'intense', 'gentle'],
    'instrument': ['guitar', 'piano', 'drums', 'bass', 'synthesizer', 'saxophone', 'trumpet', 'violin', 'cello', 'flute', 'organ', 'harp'],
    'vocal': ['vocal', 'singing', 'voice', 'chorus', 'harmony', 'rap', 'whisper', 'falsetto', 'growl', 'scream'],
    'tempo': ['fast', 'slow', 'mid-tempo', 'upbeat', 'downtempo', 'energetic', 'relaxed', 'driving', 'laid-back'],
    'space': ['reverb', 'delay', 'echo', 'spacious', 'intimate', 'dry', 'wet', 'wide', 'narrow', 'stereo', 'mono'],
    'structure': ['verse', 'chorus', 'bridge', 'intro', 'outro', 'build', 'drop', 'breakdown', 'drop'],
    'density': ['sparse', 'dense', 'minimal', 'layered', 'thick', 'thin', 'full', 'open'],
  };

  // 各カテゴリのキーワードと一致数をカウント
  for (const [catId, keywords] of Object.entries(categoryKeywords)) {
    let matchCount = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      found[catId] = matchCount;
    }
  }

  // カテゴリ名そのものが含まれている場合
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    if (lower.includes(cat.name.toLowerCase())) {
      if (!found[catId]) found[catId] = 0;
      found[catId] += 3; // カテゴリ名一致は高スコア
    }
  }

  return found;
}

// キーワードからカテゴリIDを検索
function findCategoryByKeyword(keyword) {
  const lower = keyword.toLowerCase();
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    if (cat.name.toLowerCase().includes(lower)) return catId;
    if (cat.label && cat.label.toLowerCase().includes(lower)) return catId;
  }
  // デフォルトで genre を返す
  return 'genre';
}
