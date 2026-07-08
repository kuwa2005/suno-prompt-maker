let isInitialized = false;
let embedFn = null;
let cosineSimFn = null;
let fallbackMode = false;

// 日本語テキストをトークン化する関数
function tokenize(text) {
  const lower = text.toLowerCase();
  const tokens = [];

  // 英語单词を抽出
  const englishWords = lower.match(/[a-z0-9]+/g);
  if (englishWords) tokens.push(...englishWords);

  // 日本語のひらがな・カタカナ・漢字を1文字ずつ抽出
  const japaneseChars = lower.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g);
  if (japaneseChars) {
    for (const str of japaneseChars) {
      // 2-gramで抽出（意味のある単位を捉える）
      for (let i = 0; i < str.length; i++) {
        tokens.push(str[i]);
        if (i < str.length - 1) {
          tokens.push(str[i] + str[i + 1]);
        }
      }
    }
  }

  return tokens;
}

// 日本語のキーワードマッピング
const JP_KEYWORD_MAP = {
  'カフェ': ['cafe', 'lounge', 'coffee', 'relax'],
  'チル': ['chill', 'relax', 'mellow', 'laid-back'],
  'アコースティック': ['acoustic', 'guitar', 'folk', 'gentle'],
  'おしゃれ': ['stylish', 'elegant', 'sophisticated'],
  'カフェ': ['cafe', 'lounge', 'coffee'],
  '静か': ['quiet', 'calm', 'peaceful', 'soft'],
  '激しい': ['heavy', 'aggressive', 'intense', 'powerful'],
  'メタル': ['metal', 'heavy', 'distorted', 'aggressive'],
  'ロック': ['rock', 'guitar', 'riff', 'drums'],
  'ポップ': ['pop', 'catchy', 'upbeat', 'bright'],
  'ジャズ': ['jazz', 'smooth', 'saxophone', 'piano'],
  'エレクトロ': ['electronic', 'synth', 'dance', 'beat'],
  'アンビエント': ['ambient', 'atmospheric', 'pad', 'space'],
  'フォーク': ['folk', 'acoustic', 'guitar', 'gentle'],
  'シティ': ['city', 'pop', 'urban', 'night'],
  '夏': ['summer', 'beach', 'tropical', 'sunny'],
  '冬': ['winter', 'snow', 'cold', 'christmas'],
  '夜': ['night', 'nocturnal', 'dark', 'moody'],
  '朝': ['morning', 'dawn', 'sunrise', 'bright'],
};

export async function initTernlight() {
  if (isInitialized) return;

  try {
    const module = await import('https://cdn.jsdelivr.net/npm/@ternlight/base@latest/dist/index.mjs');
    embedFn = module.embed;
    cosineSimFn = module.cosineSim;
    isInitialized = true;
    console.log('ternlight initialized');
  } catch (error) {
    console.warn('ternlight unavailable, using fallback mode:', error);
    fallbackMode = true;

    embedFn = (text) => {
      const tokens = tokenize(text);

      // 日本語キーワードを英語トークンに変換
      for (const [jp, enTokens] of Object.entries(JP_KEYWORD_MAP)) {
        if (text.includes(jp)) {
          tokens.push(...enTokens);
        }
      }

      return tokens;
    };

    cosineSimFn = (a, b) => {
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
