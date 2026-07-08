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

  // 音楽関連の日本語→英語マッピング
  const jpEnMap = {
    // カテゴリ名
    'ジャンル': ['genre', 'pop', 'rock', 'jazz', 'electronic'],
    'スタイル': ['style', 'smooth', 'energetic', 'calm'],
    'ムード': ['mood', 'happy', 'sad', 'dark', 'bright'],
    'テンポ': ['tempo', 'fast', 'slow', 'bpm'],
    '高速テンポ': ['fast', 'speed', 'energetic', 'upbeat'],
    'スローテンポ': ['slow', 'relaxed', 'calm', 'gentle'],
    'メジャーコード': ['major', 'happy', 'bright', 'uplifting'],
    'マイナーコード': ['minor', 'sad', 'dark', 'melancholic'],
    'キラキラ': ['sparkle', 'bright', 'shimmer', 'bell'],
    'ダーク': ['dark', 'heavy', 'ominous', 'shadow'],
    'ピアノ': ['piano', 'keys', 'keyboard'],
    '和楽器': ['traditional', 'japanese', 'koto', 'shamisen'],

    // 音楽ジャンル
    'カフェ': ['cafe', 'lounge', 'coffee', 'chill'],
    'カフェミュージック': ['cafe', 'lounge', 'chill', 'background'],
    'チル': ['chill', 'relaxed', 'mellow', 'laid-back'],
    'アコースティック': ['acoustic', 'guitar', 'folk', 'gentle'],
    'ロック': ['rock', 'guitar', 'riff', 'drums'],
    'ポップ': ['pop', 'catchy', 'upbeat', 'bright'],
    'ジャズ': ['jazz', 'smooth', 'saxophone', 'piano'],
    'エレクトロ': ['electronic', 'synth', 'dance', 'beat'],
    'アンビエント': ['ambient', 'atmospheric', 'pad', 'space'],
    'フォーク': ['folk', 'acoustic', 'guitar', 'gentle'],
    'シティポップ': ['city', 'pop', 'urban', 'night'],
    'シンセウェーブ': ['synthwave', 'retro', '80s', 'synth'],
    'ヒップホップ': ['hip', 'hop', 'beat', 'rap'],
    'レゲエ': ['reggae', 'offbeat', 'bass', 'island'],
    'メタル': ['metal', 'heavy', 'distorted', 'aggressive'],
    'パンク': ['punk', 'raw', 'energy', 'fast'],

    // 雰囲気・ムード
    'おしゃれ': ['stylish', 'elegant', 'sophisticated'],
    'オシャレ': ['stylish', 'elegant', 'sophisticated'],
    'リラックス': ['relax', 'calm', 'peaceful', 'soft'],
    '元気': ['energetic', 'upbeat', 'lively', 'bright'],
    '静か': ['quiet', 'calm', 'peaceful', 'soft'],
    '激しい': ['heavy', 'aggressive', 'intense', 'powerful'],
    '甘い': ['sweet', 'soft', 'gentle', 'romantic'],
    '切ない': ['melancholic', 'sad', 'emotional', 'bittersweet'],
    '明るい': ['bright', 'happy', 'cheerful', 'upbeat'],
    '暗い': ['dark', 'moody', 'gloomy', 'shadow'],
    'エレガント': ['elegant', 'sophisticated', 'refined'],
    'ワイルド': ['wild', 'raw', 'energetic', 'aggressive'],

    // 場面
    '夜': ['night', 'nocturnal', 'dark', 'moody'],
    '朝': ['morning', 'dawn', 'sunrise', 'bright'],
    '夏': ['summer', 'beach', 'tropical', 'sunny'],
    '冬': ['winter', 'snow', 'cold', 'christmas'],
    '雨': ['rain', 'rainy', 'wet', 'melancholic'],
    '海': ['ocean', 'sea', 'beach', 'waves'],

    // 動作
    '流れる': ['flowing', 'smooth', 'gentle'],
    '踊る': ['dance', 'groove', 'rhythm'],
    '弾く': ['play', 'guitar', 'piano'],
    '歌う': ['sing', 'vocal', 'voice'],

    // その他
    '曲': ['music', 'song', 'melody'],
    '音': ['sound', 'tone', 'audio'],
    'リズム': ['rhythm', 'beat', 'groove'],
    'メロディー': ['melody', 'tune', 'song'],
    'ハーモニー': ['harmony', 'chord'],
  };

  for (const [jp, en] of Object.entries(jpEnMap)) {
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
