const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadDataGlobals() {
  const dataPath = path.join(__dirname, '../../src/data.js');
  const src = fs.readFileSync(dataPath, 'utf8');
  const context = { globalThis: {} };
  vm.createContext(context);
  vm.runInContext(src, context);
  return { CATEGORIES: context.globalThis.CATEGORIES, PROMPT_DATA: context.globalThis.PROMPT_DATA };
}

function countTags(PROMPT_DATA, CATEGORIES) {
  let total = 0;
  for (const cat of Object.values(CATEGORIES)) {
    const key = cat.dataKey;
    const bucket = PROMPT_DATA[key];
    if (Array.isArray(bucket)) total += bucket.length;
  }
  return total;
}

describe('data.js 整合性', () => {
  const { CATEGORIES, PROMPT_DATA } = loadDataGlobals();

  it('カテゴリ数は 38', () => {
    assert.equal(Object.keys(CATEGORIES).length, 38);
  });

  it('タグ総数は 4545', () => {
    assert.equal(countTags(PROMPT_DATA, CATEGORIES), 4545);
  });
});
