let isInitialized = false;
let embedFn = null;
let cosineSimFn = null;
let fallbackMode = false;

// CATEGORIES から日本語→カテゴリIDのマッピングを動的に構築
function buildJpToCategoryMap() {
  const map = {};
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    // カテゴリ名をキーワードとして追加
    if (cat.name) map[cat.name] = catId;
    if (cat.label && cat.label !== cat.name) map[cat.label] = catId;
    // 説明文からキーワードを抽出
    if (cat.desc) {
      const words = cat.desc.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fafa-zA-Z]+/g);
      if (words) {
        for (const word of words) {
          if (word.length >= 2 && !map[word]) {
            map[word] = catId;
          }
        }
      }
    }
  }
  return map;
}

// 日本語テキストからカテゴリIDを抽出
function extractCategoriesFromJp(text) {
  const map = buildJpToCategoryMap();
  const found = {};

  // 長いキーワードから順にマッチング（最長一致）
  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);
  const matched = new Set();

  for (const key of sortedKeys) {
    if (text.includes(key) && !matched.has(key)) {
      const catId = map[key];
      if (!found[catId]) found[catId] = 0;
      found[catId] += key.length; // マッチした文字数をスコアに
      matched.add(key);
    }
  }

  return found;
}

// 日本語テキストを英語トークンに変換（フォールバック用）
function jpToEnTokens(text) {
  const tokens = [];

  // CATEGORIESの日本語名から英語キーワードを生成
  const catMap = {
    'ジャンル': ['genre', 'pop', 'rock', 'jazz', 'electronic'],
    'スタイル': ['style', 'smooth', 'energetic', 'calm'],
    'ムード': ['mood', 'happy', 'sad', 'dark', 'bright'],
    'テンポ': ['tempo', 'fast', 'slow', 'bpm'],
    '高速テンポ': ['fast', 'speed', 'energetic', 'upbeat'],
    'スローテンポ': ['slow', 'relaxed', 'calm', 'gentle'],
    '時代・質感': ['era', 'vintage', 'retro', 'modern'],
    '80年代特化': ['80s', 'retro', 'synthwave', 'synth'],
    'メジャーコード': ['major', 'happy', 'bright', 'uplifting'],
    'マイナーコード': ['minor', 'sad', 'dark', 'melancholic'],
    'キラキラ': ['sparkle', 'bright', 'shimmer', 'bell'],
    'ダーク': ['dark', 'heavy', 'ominous', 'shadow'],
    '演奏記法': ['technique', 'picking', 'strumming', 'articulation'],
    '楽器': ['instrument', 'guitar', 'piano', 'drums'],
    'ピアノ': ['piano', 'keys', 'keyboard'],
    '和楽器': ['traditional', 'japanese', 'koto', 'shamisen'],
    'ギター挙動': ['guitar', 'riff', 'strum', 'picking'],
    'ベース挙動': ['bass', 'groove', 'low-end'],
    'ドラム・打楽器': ['drums', 'percussion', 'beat', 'rhythm'],
    'リズム・グルーヴ': ['rhythm', 'groove', 'beat', 'feel'],
    'シンセ音色': ['synth', 'synthesizer', 'electronic'],
    'LFO': ['lfo', 'modulation', 'wobble'],
    '音の動き': ['motion', 'movement', 'dynamic'],
    '音像・空間': ['space', 'reverb', 'delay', 'stereo'],
    'エフェクト・ミックス': ['fx', 'effects', 'mix', 'master'],
    'ディストーション': ['distortion', 'overdrive', 'fuzz'],
    'ノイズ': ['noise', 'static', 'texture'],
    '展開・構成': ['structure', 'arrangement', 'section'],
    'アレンジ密度': ['density', 'arrangement', 'layer'],
    'ボーカル表現': ['vocal', 'singing', 'voice'],
    'コーラス・ハーモニー': ['chorus', 'harmony', 'backing'],
    '禁止・抑制': ['avoid', 'no', 'without'],
  };

  for (const [jp, en] of Object.entries(catMap)) {
    if (text.includes(jp)) {
      tokens.push(...en);
    }
  }

  return tokens;
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

// 日本語入力からカテゴリを直接抽出（auto-setter.jsで使用）
export function extractCategoriesDirectly(text) {
  return extractCategoriesFromJp(text);
}
