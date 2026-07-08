let isInitialized = false;
let embedFn = null;
let cosineSimFn = null;
let fallbackMode = false;

// 日本語→英語キーワードマッピング
const JP_EN_MAP = {
  'カフェ': 'cafe lounge coffee',
  'チル': 'chill relaxed mellow laid-back',
  'チルい': 'chill relaxed mellow',
  'アコースティック': 'acoustic guitar folk gentle',
  'おしゃれ': 'stylish elegant sophisticated',
  'オシャレ': 'stylish elegant sophisticated',
  '流れる': 'flowing smooth gentle',
  '曲': 'music song melody',
  '静か': 'quiet calm peaceful soft',
  '激しい': 'heavy aggressive intense powerful',
  'メタル': 'metal heavy distorted aggressive',
  'ロック': 'rock guitar riff drums',
  'ポップ': 'pop catchy upbeat bright',
  'ジャズ': 'jazz smooth saxophone piano',
  'エレクトロ': 'electronic synth dance beat',
  'アンビエント': 'ambient atmospheric pad space',
  'フォーク': 'folk acoustic guitar gentle',
  'シティ': 'city pop urban night',
  '夏': 'summer beach tropical sunny',
  '冬': 'winter snow cold christmas',
  '夜': 'night nocturnal dark moody',
  '朝': 'morning dawn sunrise bright',
  '雨': 'rain rainy wet',
  '海': 'ocean sea beach waves',
  '山': 'mountain nature forest',
  '街': 'city urban downtown',
  '恋人': 'love romantic sweet',
  '悲しい': 'sad melancholic sorrow',
  '嬉しい': 'happy joyful bright',
  '元気': 'energetic upbeat lively',
  'リラックス': 'relax calm peaceful',
  'ダンス': 'dance beat groovy',
  'ビート': 'beat rhythm drum',
  'メロディー': 'melody tune song',
  'ハーモニー': 'harmony chord',
};

// 日本語テキストを英語キーワードに変換
function jpToEnKeywords(text) {
  const keywords = [];
  for (const [jp, en] of Object.entries(JP_EN_MAP)) {
    if (text.includes(jp)) {
      keywords.push(...en.split(' '));
    }
  }
  return keywords;
}

export async function initTernlight() {
  if (isInitialized) return;

  try {
    const module = await import('https://cdn.jsdelivr.net/npm/@ternlight/base@latest/dist/index.mjs');
    embedFn = module.embed;
    cosineSimFn = module.cosineSim;
    isInitialized = true;
  } catch (error) {
    console.warn('ternlight unavailable, using fallback mode');
    fallbackMode = true;

    // フォールバック: 日本語→英語変換 + キーワード一致
    embedFn = (text) => {
      const enKeywords = jpToEnKeywords(text);
      return enKeywords;
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
