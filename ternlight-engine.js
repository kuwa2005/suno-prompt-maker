let isInitialized = false;
let embedFn = null;
let cosineSimFn = null;

export async function initTernlight() {
  if (isInitialized) return;
  
  try {
    const module = await import('https://cdn.jsdelivr.net/npm/@ternlight/base@latest/dist/index.mjs');
    embedFn = module.embed;
    cosineSimFn = module.cosineSim;
    isInitialized = true;
    console.log('ternlight initialized');
  } catch (error) {
    console.error('Failed to initialize ternlight:', error);
    throw error;
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
