let isInitialized = false;
let embedFn = null;
let cosineSimFn = null;
let fallbackMode = false;

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
    embedFn = (text) => text.toLowerCase().split(/\s+/);
    cosineSimFn = (a, b) => {
      const setA = new Set(a);
      const setB = new Set(b);
      const intersection = [...setA].filter(x => setB.has(x));
      return intersection.length / Math.max(setA.size, setB.size);
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
