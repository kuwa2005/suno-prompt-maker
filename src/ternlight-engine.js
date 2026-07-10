let isInitialized = false;
let embedFn = null;
let cosineSimFn = null;
let fallbackMode = false;
let translatorReady = false;
let translatorInitializing = false;

// Chrome Translator API の初期化
let translator = null;

async function initTranslator() {
  if (translatorReady || translatorInitializing) return;
  translatorInitializing = true;

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
  translatorInitializing = false;
}

// 日本語テキストを英語に翻訳
async function translateJpToEn(text) {
  if (!translatorReady && !translatorInitializing) {
    await initTranslator();
  }

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

function jpToEnTokens(text) {
  const tokens = [];
  for (const [jp, en] of Object.entries(JP_FALLBACK_MAP)) {
    if (text.includes(jp)) {
      tokens.push(...en.split(' '));
    }
  }
  return tokens;
}

function setupFallbackEmbed() {
  fallbackMode = true;
  embedFn = (text) => {
    if (/[a-zA-Z]/.test(text) && !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)) {
      return text.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2);
    }
    return jpToEnTokens(text);
  };
  cosineSimFn = (a, b) => {
    if (!a.length || !b.length) return 0;
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = [...setA].filter(x => setB.has(x));
    return intersection.length / Math.max(setA.size, setB.size, 1);
  };
}

function setupWasmEmbed(embed, cosineSim) {
  fallbackMode = false;
  embedFn = (text) => embed(text);
  cosineSimFn = (a, b) => cosineSim(a, b);
}

export async function initTernlight() {
  if (isInitialized) return;

  initTranslator();

  try {
    const { embed, cosineSim, engineInfo } = await import('@ternlight/base');
    embed('warmup');
    console.log('ternlight WASM ready:', engineInfo());
    setupWasmEmbed(embed, cosineSim);
  } catch (error) {
    console.warn('ternlight WASM unavailable, using fallback mode:', error);
    setupFallbackEmbed();
  }

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

export async function translateMainPrompt(text) {
  if (!text) return text;

  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
  if (!hasJapanese) return text;

  const translated = await translateJpToEn(text);
  if (translated) {
    return translated;
  }

  return text;
}

export async function extractCategoriesWithTranslation(text) {
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  let result = {};

  if (hasJapanese) {
    result = extractCategoriesFromFallback(text);
  }

  if (hasEnglish) {
    const enResult = extractCategoriesFromEnText(text);
    for (const [catId, score] of Object.entries(enResult)) {
      if (!result[catId] || result[catId] < score) {
        result[catId] = score;
      }
    }
  }

  if (hasJapanese && translatorReady) {
    const enText = await translateJpToEn(text);
    if (enText) {
      const translatedResult = extractCategoriesFromEnText(enText);
      if (Object.keys(translatedResult).length > 0) {
        return translatedResult;
      }
    }
  }

  return result;
}

function extractCategoriesFromFallback(text) {
  const found = {};

  const jpCategoryMap = {
    'カフェ': ['style', 'mood'],
    'チル': ['style', 'mood'],
    'アコースティック': ['instrument', 'genre'],
    'ロック': ['genre', 'instrument'],
    'ポップ': ['genre', 'style'],
    'ポップス': ['genre', 'style'],
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
    'トランス': ['genre'],
    'ハウス': ['genre'],
    'テクノ': ['genre'],
    'トラップ': ['genre'],
    'R&B': ['genre'],
    'ソウル': ['genre'],
    'ファンク': ['genre'],
    'ディスコ': ['genre'],
    '80年代': ['era', '年代80'],
    '80s': ['era', '年代80'],
    '70年代': ['era'],
    '90年代': ['era'],
    'レトロ': ['era'],
    'ヴィンテージ': ['era'],
    'ノスタルジック': ['era', 'mood'],
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
    'ダーク': ['style', 'mood'],
    'キラキラ': ['style', 'mood'],
    'ピアノ': ['instrument'],
    'ギター': ['instrument'],
    'ベース': ['instrument'],
    'ドラム': ['instrument'],
    'シンセ': ['instrument'],
    'ボーカル': ['vocal'],
    'コーラス': ['vocal'],
    '和楽器': ['instrument'],
    '流れる': ['style'],
    '踊る': ['style'],
    '曲': ['structure'],
    'リズム': ['tempo', 'structure'],
    'メロディー': ['vocal', 'structure'],
    'ハーモニー': ['vocal'],
    '空間': ['space'],
    'エフェクト': ['fx'],
    'ノイズ': ['fx'],
    '構成': ['structure'],
    '密度': ['density'],
    'ジャンル': ['genre'],
    'スタイル': ['style'],
    'ムード': ['mood'],
    'テンポ': ['tempo'],
    '高速テンポ': ['tempo'],
    'スローテンポ': ['tempo'],
    'メジャーコード': ['technique'],
    'マイナーコード': ['technique'],
    '演奏記法': ['technique'],
    '楽器': ['instrument'],
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

function extractCategoriesFromEnText(enText) {
  const lower = enText.toLowerCase();
  const found = {};

  const categoryMap = {
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

  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    if (lower.includes(cat.name.toLowerCase())) {
      if (!found[catId]) found[catId] = 0;
      found[catId] += 5;
    }
  }

  return found;
}
