# ternlight 統合 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ternlight を活用して、Suno Prompt Maker に AI 検索・自動セッティング機能を実装する

**Architecture:** ternlight (7MB WASM) を CDN で読み込み、ベクトル化・類似度計算をクライアントサイドで実行。ルールベースで%を算出。

**Tech Stack:** @ternlight/base, vanilla JavaScript, Tailwind CSS

## Global Constraints

- WASM ファイルは CDN から読み込み（npm ビルド不要）
- 全ての処理はクライアントサイド完結
- 既存の UI パターンに準拠
- Tailwind CSS のユーティリティクラスを使用

---

### Task 1: ternlight エンジンの初期化

**Covers:** [S2], [S8]

**Files:**
- Create: `ternlight-engine.js`
- Modify: `index.html` (script タグ追加)

**Interfaces:**
- Consumes: @ternlight/base (CDN)
- Produces: `initTernlight()`, `embedText()`, `cosineSimilarity()`

- [ ] **Step 1: ternlight-engine.js を作成**

```javascript
// ternlight-engine.js
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
```

- [ ] **Step 2: index.html に script タグを追加**

```html
<script type="module" src="ternlight-engine.js"></script>
```

- [ ] **Step 3: 動作確認**

ブラウザで開き、コンソールで `ternlight initialized` が表示されることを確認

- [ ] **Step 4: コミット**

```bash
git add ternlight-engine.js index.html
git commit -m "feat: ternlight エンジンの初期化を追加"
```

---

### Task 2: タグベクトルキャッシュの実装

**Covers:** [S6], [S8]

**Files:**
- Create: `tag-index.js`
- Modify: `app.js` (初期化時にベクトル化)

**Interfaces:**
- Consumes: CATEGORIES, PROMPT_DATA, embedText()
- Produces: `buildTagIndex()`, `getTagIndex()`, `searchTags()`

- [ ] **Step 1: tag-index.js を作成**

```javascript
// tag-index.js
import { embedText, cosineSimilarity } from './ternlight-engine.js';

let tagIndex = null;

export async function buildTagIndex() {
  const index = [];
  
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    const items = PROMPT_DATA[cat.dataKey] || [];
    for (const item of items) {
      const vector = embedText(item);
      index.push({
        category: catId,
        tag: item,
        vector: vector
      });
    }
  }
  
  tagIndex = index;
  return index;
}

export function getTagIndex() {
  return tagIndex;
}

export function searchTags(query, topK = 10) {
  if (!tagIndex) return [];
  
  const queryVector = embedText(query);
  const results = tagIndex.map(item => ({
    ...item,
    score: cosineSimilarity(queryVector, item.vector)
  }));
  
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
```

- [ ] **Step 2: app.js に初期化ロジックを追加**

```javascript
// app.js の末尾に追加
import { initTernlight } from './ternlight-engine.js';
import { buildTagIndex } from './tag-index.js';

async function initializeAI() {
  try {
    await initTernlight();
    await buildTagIndex();
    console.log('AI features ready');
  } catch (error) {
    console.warn('AI features unavailable:', error);
  }
}

// ページ読み込み時に初期化
initializeAI();
```

- [ ] **Step 3: 動作確認**

ブラウザで開き、コンソールで `AI features ready` が表示されることを確認

- [ ] **Step 4: コミット**

```bash
git add tag-index.js app.js
git commit -m "feat: タグベクトルキャッシュを追加"
```

---

### Task 3: セマンティック検索機能の実装

**Covers:** [S6]

**Files:**
- Create: `semantic-search.js`
- Modify: `app.js` (検索UIの生成)
- Modify: `styles.css` (アニメーション)

**Interfaces:**
- Consumes: searchTags(), CATEGORIES
- Produces: `createSearchBox()`, `filterTags()`

- [ ] **Step 1: semantic-search.js を作成**

```javascript
// semantic-search.js
import { searchTags } from './tag-index.js';

export function createSearchBox(categoryId, onFilter) {
  const container = document.createElement('div');
  container.className = 'flex items-center gap-2 mb-2';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '🔍 候補を絞り込む';
  input.className = 'flex-1 text-xs bg-surface2 border border-border rounded px-2 py-1';
  
  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length === 0) {
      onFilter([]);
      return;
    }
    
    const results = searchTags(query, 50)
      .filter(r => r.category === categoryId);
    onFilter(results);
  });
  
  container.appendChild(input);
  return container;
}

export function filterTagElements(tagElements, results) {
  const matchSet = new Set(results.map(r => r.tag));
  
  tagElements.forEach(el => {
    if (results.length === 0) {
      el.style.opacity = '1';
      el.style.order = '0';
    } else if (matchSet.has(el.textContent)) {
      el.style.opacity = '1';
      el.style.order = '0';
    } else {
      el.style.opacity = '0.4';
      el.style.order = '1';
    }
  });
}
```

- [ ] **Step 2: app.js に検索UIを追加**

```javascript
// app.js の createTagSelect 関数を修正
import { createSearchBox, filterTagElements } from './semantic-search.js';

function createTagSelect(containerId, items, categoryId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const selected = new Set();
  
  // 検索ボックスを追加
  const searchBox = createSearchBox(categoryId, (results) => {
    filterTagElements(container.querySelectorAll('.tag'), results);
  });
  container.parentElement.insertBefore(searchBox, container);
  
  // ... 既存のタグ生成ロジック ...
}
```

- [ ] **Step 3: スタイルを追加**

```css
/* styles.css に追加 */
.tag {
  transition: opacity 0.2s, order 0.2s;
}
```

- [ ] **Step 4: 動作確認**

「要素候補詳細」を開き、各カテゴリに検索窓が表示されることを確認。検索でタグがフィルタされることを確認。

- [ ] **Step 5: コミット**

```bash
git add semantic-search.js app.js styles.css
git commit -m "feat: セマンティック検索機能を追加"
```

---

### Task 4: 自動セッティング機能の実装

**Covers:** [S5]

**Files:**
- Create: `auto-setter.js`
- Modify: `index.html` (AI入力エリア追加)
- Modify: `app.js` (イベントハンドラ)

**Interfaces:**
- Consumes: searchTags(), weightSliders, updateWeightLabels()
- Produces: `autoSetWeights()`

- [ ] **Step 1: auto-setter.js を作成**

```javascript
// auto-setter.js
import { searchTags } from './tag-index.js';

export function autoSetWeights(inputText, weightSliders, updateWeightLabels) {
  const results = searchTags(inputText, 100);
  
  // 類似度 > 0.3 のカテゴリを集約
  const categoryScores = {};
  for (const result of results) {
    if (result.score > 0.3) {
      if (!categoryScores[result.category]) {
        categoryScores[result.category] = 0;
      }
      categoryScores[result.category] += result.score;
    }
  }
  
  // スコアを正規化して%に変換
  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
  
  // 全スライダーを0%にリセット
  for (const id of Object.keys(weightSliders)) {
    weightSliders[id].value = 0;
  }
  
  // スコアがあるカテゴリに%を設定
  for (const [catId, score] of Object.entries(categoryScores)) {
    if (weightSliders[catId]) {
      const percent = Math.round((score / totalScore) * 100);
      weightSliders[catId].value = Math.min(100, percent);
    }
  }
  
  updateWeightLabels();
}
```

- [ ] **Step 2: index.html に AI 入力エリアを追加**

```html
<!-- メインプロンプトの直下に追加 -->
<div class="col-span-full">
  <label class="block text-sm text-text-dim mb-1">AIイメージ入力</label>
  <div class="flex gap-2">
    <textarea id="ai-input" rows="2" 
      placeholder="例：お洒落なカフェで流れるチルいアコースティック曲"
      class="flex-1 bg-surface border border-border text-text px-3 py-2 rounded-md text-sm resize-none"></textarea>
    <button id="btn-ai-set" class="bg-accent text-white px-4 rounded-md text-sm hover:bg-accent-hover transition-colors">
      AIで反映 ⚡️
    </button>
  </div>
</div>
```

- [ ] **Step 3: app.js にイベントハンドラを追加**

```javascript
// app.js に追加
import { autoSetWeights } from './auto-setter.js';

document.getElementById('btn-ai-set').addEventListener('click', () => {
  const input = document.getElementById('ai-input').value.trim();
  if (!input) return;
  
  autoSetWeights(input, weightSliders, updateWeightLabels);
  showToast('AIで設定を反映しました');
});
```

- [ ] **Step 4: 動作確認**

AI入力エリアにテキストを入力して「AIで反映」をクリックし、スライダーが自動調整されることを確認。

- [ ] **Step 5: コミット**

```bash
git add auto-setter.js index.html app.js
git commit -m "feat: 自動セッティング機能を追加"
```

---

### Task 5: 履歴のあいまい検索の実装

**Covers:** [S7]

**Files:**
- Create: `history-search.js`
- Modify: `app.js` (履歴タブに検索バー追加)

**Interfaces:**
- Consumes: embedText(), cosineSimilarity(), loadHistory()
- Produces: `searchHistory()`

- [ ] **Step 1: history-search.js を作成**

```javascript
// history-search.js
import { embedText, cosineSimilarity } from './ternlight-engine.js';

let historyVectors = null;

export function buildHistoryIndex(history) {
  historyVectors = history.map((entry, i) => ({
    index: i,
    entry: entry,
    vector: embedText(entry.promptLine + ' ' + (entry.comment || ''))
  }));
}

export function searchHistory(query, history) {
  if (!historyVectors) {
    buildHistoryIndex(history);
  }
  
  const queryVector = embedText(query);
  
  const results = historyVectors.map(item => ({
    ...item,
    score: cosineSimilarity(queryVector, item.vector)
  }));
  
  results.sort((a, b) => b.score - a.score);
  return results.filter(r => r.score > 0.3);
}

export function clearHistoryIndex() {
  historyVectors = null;
}
```

- [ ] **Step 2: app.js に履歴検索UIを追加**

```javascript
// app.js の renderHistory 関数を修正
import { searchHistory, buildHistoryIndex } from './history-search.js';

function renderHistory() {
  const list = document.getElementById('history-list');
  const history = loadHistory();
  list.innerHTML = '';
  
  // 検索バーを追加
  const searchContainer = document.createElement('div');
  searchContainer.className = 'mb-4';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '🔍 履歴を検索（意味ベース）';
  searchInput.className = 'w-full bg-surface border border-border text-text px-3 py-2 rounded-md text-sm';
  searchContainer.appendChild(searchInput);
  list.appendChild(searchContainer);
  
  // 検索イベント
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length === 0) {
      renderHistoryCards(list, history);
      return;
    }
    
    const results = searchHistory(query, history);
    renderHistoryCards(list, results.map(r => r.entry));
  });
  
  renderHistoryCards(list, history);
}

function renderHistoryCards(list, history) {
  // 既存のカード生成ロジック...
}
```

- [ ] **Step 3: 動作確認**

履歴タブで検索バーが表示され、入力で履歴がフィルタされることを確認。

- [ ] **Step 4: コミット**

```bash
git add history-search.js app.js
git commit -m "feat: 履歴のあいまい検索を追加"
```

---

### Task 6: エラーハンドリングとフォールバック

**Covers:** [S9]

**Files:**
- Modify: `ternlight-engine.js`
- Modify: `app.js`

**Interfaces:**
- Consumes: 既存のternlight関数
- Produces: フォールバックUI

- [ ] **Step 1: ternlight-engine.js にフォールバックを追加**

```javascript
// ternlight-engine.js を修正
let fallbackMode = false;

export async function initTernlight() {
  if (isInitialized) return;
  
  try {
    const module = await import('https://cdn.jsdelivr.net/npm/@ternlight/base@latest/dist/index.mjs');
    embedFn = module.embed;
    cosineSimFn = module.cosineSim;
    isInitialized = true;
  } catch (error) {
    console.warn('ternlight unavailable, using fallback mode:', error);
    fallbackMode = true;
    // フォールバック: キーワード一致のみ
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
```

- [ ] **Step 2: app.js にフォールバックUIを追加**

```javascript
// AI入力エリアのプレースホルダーを条件分岐
if (isReady()) {
  // 通常のAI入力エリア
} else {
  // フォールバック: 通常のテキスト入力のみ
}
```

- [ ] **Step 3: 動作確認**

ネットワークを切断した状態で動作し、フォールバックモードで動作することを確認。

- [ ] **Step 4: コミット**

```bash
git add ternlight-engine.js app.js
git commit -m "feat: エラーハンドリングとフォールバックを追加"
```

---

### Task 7: パフォーマンス最適化

**Covers:** [S8]

**Files:**
- Modify: `tag-index.js`
- Modify: `history-search.js`

**Interfaces:**
- Consumes: 既存のベクトル化関数
- Produces: キャッシュ機構

- [ ] **Step 1: tag-index.js にキャッシュを追加**

```javascript
// tag-index.js を修正
const CACHE_KEY = 'suno_tag_vectors';

export async function buildTagIndex() {
  // キャッシュ確認
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    tagIndex = JSON.parse(cached);
    return tagIndex;
  }
  
  // ベクトル化
  const index = [];
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    const items = PROMPT_DATA[cat.dataKey] || [];
    for (const item of items) {
      const vector = embedText(item);
      index.push({
        category: catId,
        tag: item,
        vector: Array.from(vector) // Float32Array → Array
      });
    }
  }
  
  tagIndex = index;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(index));
  return index;
}
```

- [ ] **Step 2: 動作確認**

2回目のロードでキャッシュから復元されることを確認（コンソールでベクトル化がスキップされることを確認）

- [ ] **Step 3: コミット**

```bash
git add tag-index.js
git commit -m "perf: タグベクトルキャッシュを追加"
```

---

### Task 8: UI/UX の改善

**Covers:** [S5], [S6]

**Files:**
- Modify: `styles.css`
- Modify: `app.js`

**Interfaces:**
- Consumes: 既存のUI要素
- Produces: アニメーション・視覚的フィードバック

- [ ] **Step 1: スライダーアニメーションを追加**

```css
/* styles.css に追加 */
.weight-slider {
  transition: background 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.weight-slider.ai-highlight {
  box-shadow: 0 0 10px var(--accent);
}
```

- [ ] **Step 2: app.js にハイライト機能を追加**

```javascript
// autoSetWeights 完了後にハイライト
function highlightUpdatedSliders(ids) {
  ids.forEach(id => {
    const slider = weightSliders[id];
    slider.classList.add('ai-highlight');
    setTimeout(() => slider.classList.remove('ai-highlight'), 2000);
  });
}
```

- [ ] **Step 3: 動作確認**

AI反映時にスライダーがハイライトされることを確認。

- [ ] **Step 4: コミット**

```bash
git add styles.css app.js
git commit -m "feat: AI反映時のハイライトアニメーションを追加"
```

---

### Task 9: 最終テストとドキュメント

**Covers:** [S10]

**Files:**
- Modify: `README.md`
- Create: `docs/compose/reports/2026-07-07-ternlight-integration-report.md`

**Interfaces:**
- Consumes: 既存のテスト環境
- Produces: ドキュメント

- [ ] **Step 1: README.md を更新**

```markdown
## AI機能（ternlight）

### セマンティック検索
各カテゴリの「🔍 候補を絞り込む」で意味ベースの検索が可能。

### 自動セッティング
「AIイメージ入力」に自然言語で入力し「AIで反映」でスライダーが自動調整。

### 履歴検索
履歴タブで「🔍 履歴を検索」から過去のプロンプトを意味ベースで検索。

### 技術仕様
- ternlight (@ternlight/base) を使用
- 全てクライアントサイド完結
- WASM: 7MB、初回ロード: < 2秒
```

- [ ] **Step 2: リリースレポートを作成**

```bash
mkdir -p docs/compose/reports
```

- [ ] **Step 3: コミット**

```bash
git add README.md docs/compose/reports/
git commit -m "docs: ternlight統合のドキュメントを更新"
```

---

### Task 10: v1.1.0 タグ作成とプッシュ

**Covers:** 全体

**Files:** なし

**Interfaces:** なし

- [ ] **Step 1: ブランチをマージ**

```bash
git checkout main
git merge feature/local-ai
```

- [ ] **Step 2: タグ作成**

```bash
git tag -a v1.1.0 -m "v1.1.0: ternlight AI機能統合

- セマンティック検索機能
- 自動セッティング機能
- 履歴のあいまい検索
- エラーハンドリング・フォールバック"
```

- [ ] **Step 3: プッシュ**

```bash
git push && git push --tags
```

- [ ] **Step 4: GitHub リリース作成**

```bash
gh release create v1.1.0 --title "v1.1.0" --notes "ternlight AI機能統合"
```
