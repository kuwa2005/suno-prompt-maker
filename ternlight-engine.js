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
      }
    } catch (e) {
      // Translator API が利用できない場合はスキップ
    }
  }
}

// 日本語テキストを英語に翻訳
async function translateJpToEn(text) {
  if (translatorReady && translator) {
    try {
      return await translator.translate(text);
    } catch (e) {
      // 翻訳失敗時は null を返す
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

  // ternlight はバンドラーが必要なため、フォールバックモードで動作
  fallbackMode = true;

  embedFn = (text) => {
    // 英語テキストの場合は単語を直接返す
    if (/[a-zA-Z]/.test(text) && !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)) {
      return text.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2);
    }
    // 日本語テキストの場合はマッピングを使用
    return jpToEnTokens(text);
  };

  cosineSimFn = (a, b) => {
    if (!a.length || !b.length) return 0;
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = [...setA].filter(x => setB.has(x));
    return intersection.length / Math.max(setA.size, setB.size, 1);
  };

  isInitialized = true;
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

// 日本語テキストを英語に翻訳（メインプロンプト用）
export async function translateMainPrompt(text) {
  if (!text) return text;

  // 日本語が含まれているか確認
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
  if (!hasJapanese) return text;

  // Chrome Translator API が利用可能なら翻訳
  if (translatorReady && translator) {
    try {
      const translated = await translator.translate(text);
      console.log('Main prompt translated:', translated);
      return translated;
    } catch (e) {
      console.warn('Translation failed:', e);
    }
  }

  // 翻訳不可の場合は元のテキストを返す
  return text;
}

// Chrome Translator API を使用した翻訳付きのカテゴリ抽出
export async function extractCategoriesWithTranslation(text) {
  // 日本語テキストの場合はフォールバックマッピングを試行
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  let result = {};

  // 日本語が含まれる場合
  if (hasJapanese) {
    result = extractCategoriesFromFallback(text);
  }

  // 英語が含まれる場合、英語テキストからカテゴリを抽出
  if (hasEnglish) {
    const enResult = extractCategoriesFromEnText(text);
    // 結果をマージ（大きい方を優先）
    for (const [catId, score] of Object.entries(enResult)) {
      if (!result[catId] || result[catId] < score) {
        result[catId] = score;
      }
    }
  }

  // Chrome Translator API が利用可能なら翻訳を試行（日本語のみ）
  if (hasJapanese && translatorReady) {
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

  return result;
}

// フォールバックマッピングからカテゴリを抽出
function extractCategoriesFromFallback(text) {
  const found = {};

  // 日本語→カテゴリの直接マッピング
  const jpCategoryMap = {
    'カフェ': ['style', 'mood'],
    'チル': ['style', 'mood'],
    'アコースティック': ['instrument', 'genre'],
    'ロック': ['genre', 'instrument'],
    'ポップ': ['genre', 'style'],
    'ジャズ': ['genre', 'style'],
    'エレクトロ': ['genre', 'instrument'],
    'アンビエント': ['genre', 'style'],
    'フォーク': ['genre', 'instrument'],
    'シティポップ': ['genre'],
    'シンセウェーブ': ['genre'],
    'ヒップホップ': ['genre'],
    'レゲエ': ['genre'],
    'メタル': ['genre', 'style'],
    'パンク': ['genre', 'style'],
    'おしゃれ': ['style', 'mood'],
    'オシャレ': ['style', 'mood'],
    'リラックス': ['style', 'mood'],
    '元気': ['style', 'mood'],
    '静か': ['style', 'mood'],
    '激しい': ['style', 'mood'],
    '甘い': ['mood'],
    '切ない': ['mood'],
    '明るい': ['mood'],
    '暗い': ['mood'],
    '夜': ['mood'],
    '朝': ['mood'],
    '夏': ['mood'],
    '冬': ['mood'],
    '雨': ['mood'],
    '海': ['mood'],
    '流れる': ['style'],
    '踊る': ['style'],
    '曲': ['structure'],
    'リズム': ['tempo', 'structure'],
    'メロディー': ['vocal', 'structure'],
    'ハーモニー': ['vocal'],
    'ピアノ': ['instrument'],
    '和楽器': ['instrument'],
    'ジャンル': ['genre'],
    'スタイル': ['style'],
    'ムード': ['mood'],
    'テンポ': ['tempo'],
    '高速テンポ': ['tempo'],
    'スローテンポ': ['tempo'],
    'メジャーコード': ['technique'],
    'マイナーコード': ['technique'],
    'キラキラ': ['style', 'mood'],
    'ダーク': ['style', 'mood'],
    '演奏記法': ['technique'],
    '楽器': ['instrument'],
    'ギター': ['instrument'],
    'ベース': ['instrument'],
    'ドラム': ['instrument'],
    'シンセ': ['instrument'],
    'ボーカル': ['vocal'],
    'コーラス': ['vocal'],
    '空間': ['space'],
    'エフェクト': ['fx'],
    'ノイズ': ['fx'],
    '構成': ['structure'],
    '密度': ['density'],
  };

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

  // カテゴリ固有のキーワードマッピング
  const categoryMap = {
    'genre': {
      keywords: ['pop', 'rock', 'jazz', 'electronic', 'dance', 'hip hop', 'r&b', 'country', 'folk', 'blues', 'classical', 'ambient', 'reggae', 'metal', 'punk', 'soul', 'funk', 'disco', 'house', 'techno', 'trance', 'dubstep', 'drum and bass', 'synthwave', 'city pop', 'lo-fi', 'bossa nova', 'samba', 'tango', 'acoustic', 'indie', 'alternative', 'experimental', 'world', 'latin'],
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
    'tempo': {
      keywords: ['fast', 'slow', 'mid-tempo', 'upbeat', 'downtempo', 'energetic', 'relaxed', 'driving', 'laid-back', 'bpm', 'tempo'],
      weight: 0.8
    },
    'instrument': {
      keywords: ['guitar', 'piano', 'drums', 'bass', 'synthesizer', 'saxophone', 'trumpet', 'violin', 'cello', 'flute', 'organ', 'harp', 'keys', 'keyboard', 'strings', 'brass', 'percussion'],
      weight: 1.0
    },
    'vocal': {
      keywords: ['vocal', 'singing', 'voice', 'chorus', 'harmony', 'rap', 'whisper', 'falsetto', 'melody', 'lyrics'],
      weight: 0.9
    },
    'space': {
      keywords: ['reverb', 'delay', 'echo', 'spacious', 'intimate', 'dry', 'wet', 'wide', 'stereo', 'room', 'hall'],
      weight: 0.7
    },
    'structure': {
      keywords: ['verse', 'chorus', 'bridge', 'intro', 'outro', 'build', 'drop', 'breakdown', 'hook', 'riff', 'solo'],
      weight: 0.6
    },
    'density': {
      keywords: ['sparse', 'dense', 'minimal', 'layered', 'thick', 'thin', 'full', 'open', 'complex', 'simple'],
      weight: 0.5
    },
    'technique': {
      keywords: ['fingerpicking', 'strumming', 'plucking', 'arpeggio', 'scale', 'chord', 'progression'],
      weight: 0.8
    },
    'fx': {
      keywords: ['distortion', 'overdrive', 'fuzz', 'chorus', 'flanger', 'phaser', 'compressor', 'satur', 'warm', 'clean', 'crunch'],
      weight: 0.7
    },
  };

  // 各カテゴリのキーワードと一致数をカウント（重み付き）
  for (const [catId, config] of Object.entries(categoryMap)) {
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

  // カテゴリ名そのものが含まれている場合
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    if (lower.includes(cat.name.toLowerCase())) {
      if (!found[catId]) found[catId] = 0;
      found[catId] += 5; // カテゴリ名一致は高スコア
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
