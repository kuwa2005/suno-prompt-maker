const DB_NAME = 'suno-prompt-maker';
const DB_VERSION = 1;
const STORE_NAME = 'tagIndex';
const WASM_DIM = 384;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function idbClear(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearTagIndexDb() {
  const db = await openDatabase();
  try {
    await idbClear(db);
  } finally {
    db.close();
  }
}

export function getDataFingerprint() {
  let count = 0;
  let hash = 0;
  for (const cat of Object.values(CATEGORIES)) {
    const items = PROMPT_DATA[cat.dataKey] || [];
    count += items.length;
    for (const item of items) {
      for (let i = 0; i < item.length; i++) {
        hash = ((hash << 5) - hash + item.charCodeAt(i)) | 0;
      }
    }
  }
  return `${count}_${hash}`;
}

export function buildCacheKey(mode, fingerprint) {
  return `tag_index_${mode}_${fingerprint}`;
}

function packWasmIndex(index) {
  const buffer = new ArrayBuffer(index.length * WASM_DIM * 4);
  const view = new Float32Array(buffer);
  const items = index.map((entry, i) => {
    const offset = i * WASM_DIM;
    for (let j = 0; j < WASM_DIM; j++) {
      view[offset + j] = entry.vector[j];
    }
    return { category: entry.category, tag: entry.tag, vectorIndex: i };
  });
  return { kind: 'wasm', dim: WASM_DIM, items, vectors: buffer };
}

function unpackWasmIndex(record) {
  const view = new Float32Array(record.vectors);
  const dim = record.dim;
  return record.items.map(({ category, tag, vectorIndex }) => ({
    category,
    tag,
    vector: view.subarray(vectorIndex * dim, vectorIndex * dim + dim),
  }));
}

function packFallbackIndex(index) {
  return {
    kind: 'fallback',
    items: index.map(({ category, tag, vector }) => ({
      category,
      tag,
      vector: Array.from(vector),
    })),
  };
}

function unpackFallbackIndex(record) {
  return record.items.map(({ category, tag, vector }) => ({
    category,
    tag,
    vector,
  }));
}

export async function loadTagIndexFromDb(cacheKey, expectedKind) {
  const db = await openDatabase();
  try {
    const record = await idbGet(db, cacheKey);
    if (!record || record.kind !== expectedKind) return null;
    return expectedKind === 'wasm'
      ? unpackWasmIndex(record)
      : unpackFallbackIndex(record);
  } finally {
    db.close();
  }
}

export async function saveTagIndexToDb(cacheKey, index, kind) {
  const db = await openDatabase();
  try {
    const record = kind === 'wasm'
      ? packWasmIndex(index)
      : packFallbackIndex(index);
    await idbPut(db, cacheKey, record);
  } finally {
    db.close();
  }
}
