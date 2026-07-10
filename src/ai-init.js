import { initTernlight, isFallbackMode, translateMainPrompt } from './ternlight-engine.js';
import { buildTagIndex, clearTagIndexCache } from './tag-index.js';
import { createSearchBox, filterTagElements } from './semantic-search.js';
import { autoSetWeights } from './auto-setter.js';
import { searchHistory } from './history-search.js';
import { generateDirectPrompt, generateWeightedPrompt } from './ai-prompt-generator.js';

function getLoadingEl() {
  return document.getElementById('ai-loading');
}

function showLoading(message, showFirstTimeNote = false) {
  const el = getLoadingEl();
  const msgEl = document.getElementById('ai-loading-message');
  const noteEl = document.getElementById('ai-loading-note');
  if (msgEl) msgEl.textContent = message;
  if (noteEl) noteEl.classList.toggle('hidden', !showFirstTimeNote);
  if (!el) return;
  el.classList.remove('hidden');
}

function hideLoading() {
  const el = getLoadingEl();
  if (!el) return;
  el.classList.add('hidden');
}

function addSearchBoxes() {
  for (const [catId] of Object.entries(CATEGORIES)) {
    const tagContainer = document.getElementById(catId + '-select');
    if (!tagContainer) continue;

    const searchBox = createSearchBox(catId, (results) => {
      filterTagElements(tagContainer.querySelectorAll('.tag'), results);
    });
    tagContainer.parentElement.insertBefore(searchBox, tagContainer);
  }
}

function bindAiEvents() {
  const applyPromptConfirmDialog = document.getElementById('apply-prompt-confirm-dialog');
  document.getElementById('btn-apply-prompt').addEventListener('click', () => {
    const input = document.getElementById('extra').value.trim();
    if (!input) return;
    applyPromptConfirmDialog.showModal();
  });

  document.getElementById('btn-apply-prompt-ok').addEventListener('click', async () => {
    const input = document.getElementById('extra').value.trim();
    await autoSetWeights(input, window.weightSliders, window.updateWeightLabels);
    applyPromptConfirmDialog.close();
    window.showToast('メインプロンプトからスライダーを設定しました');
  });

  document.getElementById('btn-apply-prompt-cancel').addEventListener('click', () => {
    applyPromptConfirmDialog.close();
  });

  applyPromptConfirmDialog.addEventListener('click', (e) => {
    if (e.target === applyPromptConfirmDialog) applyPromptConfirmDialog.close();
  });

  document.getElementById('history-search').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    const history = JSON.parse(localStorage.getItem('suno_prompt_history') || '[]');

    if (query.length === 0) {
      window.renderHistory();
      return;
    }

    const results = searchHistory(query, history);
    window.renderHistory(results.map(r => r.entry));
  });

  bindAiGenerateButtons();
  bindCacheRebuild();
}

function bindCacheRebuild() {
  const btn = document.getElementById('btn-rebuild-tag-cache');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!confirm('タグインデックスのローカルキャッシュを削除し、再構築します。よろしいですか？')) {
      return;
    }

    try {
      btn.disabled = true;
      await clearTagIndexCache();

      showLoading('タグインデックスを再構築中...', true);
      await buildTagIndex(
        (done, total) => {
          showLoading(`タグインデックスを構築中... ${done}/${total}`, true);
        },
        {
          onCacheMiss: () => {
            showLoading('タグインデックスを構築中...', true);
          },
        },
      );

      hideLoading();
      window.showToast('ローカルキャッシュを再構築しました');
    } catch (error) {
      hideLoading();
      console.warn('Tag index cache rebuild failed:', error);
      window.showToast('キャッシュの再構築に失敗しました');
    } finally {
      btn.disabled = false;
    }
  });
}

function getMainPromptText() {
  return document.getElementById('extra').value.trim();
}

function getMaxChars() {
  return parseInt(document.getElementById('w-charlimit').value, 10);
}

async function runWeightedAiGenerate() {
  const mainText = getMainPromptText();
  const maxChars = getMaxChars();

  if (window.sunoGetRawWeightSum() === 0) {
    window.sunoClearAllTags();
    await window.sunoShowOutput();
    return;
  }

  const weights = window.sunoGetWeights();
  const { tagsByCategory } = await generateWeightedPrompt(
    mainText,
    weights,
    window.sunoWeightIds,
    maxChars,
  );

  window.sunoApplyTags(tagsByCategory);
  await window.sunoShowOutput();
}

async function runDirectAiGenerate() {
  const mainText = getMainPromptText();
  const maxChars = getMaxChars();

  if (!mainText) {
    window.sunoClearAllTags();
    await window.sunoShowOutput();
    return;
  }

  const { tagsByCategory } = await generateDirectPrompt(mainText, maxChars);
  window.sunoApplyTags(tagsByCategory);
  await window.sunoShowOutput();
}

function bindAiGenerateButtons() {
  const weightedBtn = document.getElementById('btn-generate-ai-weighted');
  const directBtn = document.getElementById('btn-generate-ai-direct');

  if (weightedBtn) {
    weightedBtn.addEventListener('click', async () => {
      try {
        weightedBtn.disabled = true;
        await runWeightedAiGenerate();
      } catch (error) {
        console.warn('AI weighted generate failed:', error);
        window.showToast('AIプロンプト生成に失敗しました');
      } finally {
        weightedBtn.disabled = false;
      }
    });
  }

  if (directBtn) {
    directBtn.addEventListener('click', async () => {
      try {
        directBtn.disabled = true;
        await runDirectAiGenerate();
      } catch (error) {
        console.warn('AI direct generate failed:', error);
        window.showToast('AIプロンプト生成に失敗しました');
      } finally {
        directBtn.disabled = false;
      }
    });
  }
}

export async function initializeAI() {
  try {
    showLoading('AIエンジンを読み込み中...');
    await initTernlight();

    showLoading('タグインデックスを準備中...');
    await buildTagIndex(
      (done, total) => {
        showLoading(`タグインデックスを構築中... ${done}/${total}`, true);
      },
      {
        onCacheMiss: () => {
          showLoading('タグインデックスを構築中...', true);
        },
      },
    );

    addSearchBoxes();
    window.translateMainPrompt = translateMainPrompt;
    bindAiEvents();
    hideLoading();

    console.log(`AI features ready (${isFallbackMode() ? 'フォールバック' : 'WASM'})`);
  } catch (error) {
    hideLoading();
    console.warn('AI features unavailable:', error);
  }
}
