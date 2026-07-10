// ============================================================
// Suno Prompt Maker - メインアプリ（Tailwind CSS対応）
// ============================================================

  // --- Utility ---
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickMultiple(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Toast ---
  function showToast(message, duration) {
    duration = duration || 2000;
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'bg-surface border border-border text-text px-4 py-2.5 rounded-md text-sm flex items-center gap-2 shadow-lg';
    toast.innerHTML = '<span>' + escapeHtml(message) + '</span><button class="text-text-dim cursor-pointer text-base hover:text-text">&times;</button>';
    toast.querySelector('button').addEventListener('click', () => removeToast(toast));
    container.appendChild(toast);
    setTimeout(() => removeToast(toast), duration);
  }

  // グローバルに公開（モジュールスクリプトからアクセス可能にする）
  window.showToast = showToast;

  function removeToast(toast) {
    if (toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }

  // --- History ---
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('suno_prompt_history') || '[]');
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    localStorage.setItem('suno_prompt_history', JSON.stringify(history));
  }

  function addToHistory(entry) {
    const history = loadHistory();
    history.unshift(entry);
    if (history.length > 50) history.pop();
    saveHistory(history);
  }

  function clearHistory() {
    localStorage.removeItem('suno_prompt_history');
  }

  // --- Tag Select (表示専用) ---
  function createTagSelect(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const selected = new Set();

    items.forEach((item) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = item;
      container.appendChild(tag);
    });

    return {
      getSelected: () => [...selected],
      setFromValue: (value) => {
        selected.clear();
        container.querySelectorAll('.tag').forEach((t) => t.classList.remove('active'));
        if (value) {
          const vals = Array.isArray(value) ? value : [value];
          vals.forEach((v) => {
            selected.add(v);
            container.querySelectorAll('.tag').forEach((t) => {
              if (t.textContent === v) t.classList.add('active');
            });
          });
        }
      },
      clear: () => {
        selected.clear();
        container.querySelectorAll('.tag').forEach((t) => t.classList.remove('active'));
      },
    };
  }

  // --- CATEGORIES から UI を自動生成 ---
  const WEIGHT_IDS = Object.keys(CATEGORIES);
  const SEL_MAP = {};
  const weightSliders = {};
  const weightValues = {};
  const weightPanel = document.getElementById('weight-panel');
  const tagSections = document.getElementById('tag-sections');

  WEIGHT_IDS.forEach((id) => {
    const cat = CATEGORIES[id];

    // ツールチップ用のサンプル候補を生成（10個）
    var items = PROMPT_DATA[cat.dataKey] || [];
    var sample = items.slice(0, 10).join(', ');
    var tooltip = (cat.desc || cat.name) + '\n' + sample;

    // ウエイトスライダー生成
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2.5';
    row.innerHTML =
      '<span class="text-xs text-text-dim min-w-36 shrink-0 cursor-pointer hover:text-accent transition-colors" title="' + escapeHtml(tooltip) + '">' + escapeHtml(cat.label) + '</span>' +
      '<input type="range" id="w-' + id + '" min="0" max="100" value="' + cat.defaultWeight + '" class="flex-1">' +
      '<span class="text-xs text-accent min-w-10 text-right font-semibold tabular-nums" id="w-' + id + '-val">' + cat.defaultWeight + '%</span>';
    weightPanel.appendChild(row);
    weightSliders[id] = row.querySelector('input');
    weightValues[id] = row.querySelector('span:last-child');

    // ラベルクリックで0%⇔100%切替
    const label = row.querySelector('span:first-child');
    label.addEventListener('click', () => {
      const slider = weightSliders[id];
      slider.value = slider.value === '0' ? '100' : '0';
      updateWeightLabels();
    });

    // タグセレクト生成
    const section = document.createElement('div');
    section.className = 'mb-4';
    var descSpan = cat.desc ? ' <span class="text-xs text-text-dim">' + escapeHtml(cat.desc) + '</span>' : '';
    section.innerHTML =
      '<label for="' + id + '" class="block text-sm text-text-dim mb-1">' + escapeHtml(cat.name) + descSpan + '</label>' +
      '<div class="tag-select" id="' + id + '-select"></div>';
    tagSections.appendChild(section);
    SEL_MAP[id] = createTagSelect(id + '-select', PROMPT_DATA[cat.dataKey]);
  });

  // ウエイト設定ボタン行を追加（ヒントテキスト含む）
  var btnRow = document.createElement('div');
  btnRow.className = 'col-span-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-3 border-t border-border mt-1';
  btnRow.innerHTML =
    '<span class="text-xs text-text-dim">※ 合計が100%になるように自動調整されます</span>' +
    '<div class="flex gap-2">' +
    '<button id="btn-apply-prompt" class="bg-accent text-white px-4 py-1.5 rounded text-xs hover:bg-accent-hover transition-colors">(AI) メインプロンプトから反映</button>' +
    '<button id="btn-random-weight" class="bg-surface2 text-text border border-border px-4 py-1.5 rounded text-xs hover:bg-border transition-colors">ランダム設定</button>' +
    '<button id="btn-reset-weight" class="bg-surface2 text-text border border-border px-4 py-1.5 rounded text-xs hover:bg-border transition-colors">リセット</button>' +
    '</div>';
  weightPanel.appendChild(btnRow);

  function getWeights() {
    const raw = {};
    let sum = 0;
    WEIGHT_IDS.forEach((id) => {
      raw[id] = parseInt(weightSliders[id].value, 10);
      sum += raw[id];
    });
    if (sum === 0) return WEIGHT_IDS.reduce((o, id) => (o[id] = 0, o), {});
    const normalized = {};
    WEIGHT_IDS.forEach((id) => {
      normalized[id] = raw[id] / sum;
    });
    return normalized;
  }

  function updateWeightLabels() {
    const raw = {};
    let sum = 0;
    WEIGHT_IDS.forEach((id) => {
      raw[id] = parseInt(weightSliders[id].value, 10);
      sum += raw[id];
    });
    WEIGHT_IDS.forEach((id) => {
      const pct = sum > 0 ? Math.round((raw[id] / sum) * 100) : 0;
      weightValues[id].textContent = pct + '%';
    });
  }

  WEIGHT_IDS.forEach((id) => {
    weightSliders[id].addEventListener('input', updateWeightLabels);
  });

  // --- Theme toggle ---
  const themeToggle = document.getElementById('theme-toggle');
  const bulbOn = themeToggle.querySelector('.icon-bulb-on');
  const bulbOff = themeToggle.querySelector('.icon-bulb-off');

  function applyTheme(dark) {
    if (dark) {
      document.body.classList.add('dark');
      bulbOn.style.display = 'none';
      bulbOff.style.display = 'inline';
    } else {
      document.body.classList.remove('dark');
      bulbOn.style.display = 'inline';
      bulbOff.style.display = 'none';
    }
    localStorage.setItem('suno_theme', dark ? 'dark' : 'light');
  }

  // デフォルトはライトモード
  const savedTheme = localStorage.getItem('suno_theme');
  applyTheme(savedTheme === 'dark');

  themeToggle.addEventListener('click', () => {
    applyTheme(!document.body.classList.contains('dark'));
  });

  // --- Tabs ---
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'history') renderHistory();
      if (tab.dataset.tab === 'templates') renderTemplates();
    });
  });

  // --- Build prompt (翻訳対応) ---
  async function buildPrompt() {
    const parts = [];
    let extra = document.getElementById('extra').value.trim();

    // 日本語が含まれていたら英語に翻訳
    if (extra) {
      extra = await window.translateMainPrompt(extra);
      parts.push(extra);
    }

    // 全カテゴリの選択済みアイテムをフラットに集約
    const allItems = [];
    for (const id of WEIGHT_IDS) {
      const sel = SEL_MAP[id];
      const items = sel.getSelected();
      if (items.length) allItems.push(...items);
    }

    // フラットにした全アイテムをシャッフルしてから結合
    if (allItems.length) {
      parts.push(shuffle(allItems).join(', '));
    }

    const promptLine = parts.join(', ');
    return { promptLine, full: promptLine };
  }

  // --- Random fill (割合ベース、翻訳対応) ---
  async function randomFill() {
    for (const id of WEIGHT_IDS) SEL_MAP[id].clear();

    const MAX = parseInt(document.getElementById('w-charlimit').value, 10);
    const extraText = document.getElementById('extra').value.trim();
    const separator = extraText ? ', ' : '';
    const randomLimit = MAX - extraText.length - separator.length;
    const weights = getWeights();
    const activeIds = WEIGHT_IDS.filter((id) => weights[id] > 0);

    // 各カテゴリの候補プールと選択済みリスト
    const pools = {};
    const selected = {};
    for (const id of WEIGHT_IDS) {
      pools[id] = [...PROMPT_DATA[CATEGORIES[id].dataKey]];
      selected[id] = [];
    }

    function randomLength() {
      const allItems = [];
      for (const id of WEIGHT_IDS) allItems.push(...selected[id]);
      return allItems.length > 0 ? allItems.join(', ').length : 0;
    }

    function afterAddLength(item) {
      const current = randomLength();
      if (current === 0) return item.length;
      return current + 2 + item.length;
    }

    // 各カテゴリから最低1つ選ぶ
    activeIds.forEach((id) => {
      const shuffled = shuffle(pools[id]);
      for (const item of shuffled) {
        if (afterAddLength(item) <= randomLimit) {
          selected[id].push(item);
          break;
        }
      }
    });

    // 割合に応じて追加
    let safety = 0;
    while (safety < 500) {
      safety++;
      if (randomLength() >= randomLimit) break;

      const totalWeight = activeIds.reduce((sum, id) => sum + weights[id], 0);
      let roll = Math.random() * totalWeight;
      for (const id of activeIds) {
        roll -= weights[id];
        if (roll <= 0) {
          const remaining = pools[id].filter((p) => !selected[id].includes(p));
          const shuffled = shuffle(remaining);
          for (const item of shuffled) {
            if (afterAddLength(item) <= randomLimit) {
              selected[id].push(item);
              break;
            }
          }
          break;
        }
      }
    }

    // セレクトに反映
    for (const id of WEIGHT_IDS) {
      SEL_MAP[id].setFromValue(shuffle(selected[id]));
    }

    await showOutput();
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- Output (翻訳対応) ---
  async function showOutput() {
    const { full } = await buildPrompt();
    const outputArea = document.getElementById('output-area');
    const outputEl = document.getElementById('prompt-output');
    outputEl.textContent = full;
    outputArea.classList.remove('hidden');
    outputArea.style.display = '';

    // 文字数カウンター
    const len = full.length;
    const maxLen = parseInt(document.getElementById('w-charlimit').value, 10);
    const countEl = document.getElementById('char-count');
    countEl.textContent = len + ' / ' + maxLen;
    countEl.className = 'text-xs text-text-dim tabular-nums';
    if (len >= maxLen - 50 && len <= maxLen + 50) countEl.classList.add('near');
    if (len > maxLen + 50) countEl.classList.add('over');
  }

  document.getElementById('btn-generate').addEventListener('click', randomFill);

  // --- Random weight button ---
  const randomConfirmDialog = document.getElementById('random-confirm-dialog');
  document.getElementById('btn-random-weight').addEventListener('click', () => {
    randomConfirmDialog.showModal();
  });
  document.getElementById('btn-random-cancel').addEventListener('click', () => {
    randomConfirmDialog.close();
  });
  document.getElementById('btn-random-ok').addEventListener('click', () => {
    WEIGHT_IDS.forEach((id) => {
      weightSliders[id].value = Math.floor(Math.random() * 101);
    });
    updateWeightLabels();
    randomConfirmDialog.close();
  });
  randomConfirmDialog.addEventListener('click', (e) => {
    if (e.target === randomConfirmDialog) randomConfirmDialog.close();
  });

  // --- Reset weight button ---
  const resetConfirmDialog = document.getElementById('reset-confirm-dialog');
  document.getElementById('btn-reset-weight').addEventListener('click', () => {
    resetConfirmDialog.showModal();
  });
  document.getElementById('btn-reset-cancel').addEventListener('click', () => {
    resetConfirmDialog.close();
  });
  document.getElementById('btn-reset-ok').addEventListener('click', () => {
    WEIGHT_IDS.forEach((id) => {
      weightSliders[id].value = 0;
    });
    updateWeightLabels();
    resetConfirmDialog.close();
  });
  resetConfirmDialog.addEventListener('click', (e) => {
    if (e.target === resetConfirmDialog) resetConfirmDialog.close();
  });

  // --- Char limit slider ---
  document.getElementById('w-charlimit').addEventListener('input', (e) => {
    document.getElementById('w-charlimit-val').textContent = e.target.value;
  });

  // --- Cookie save/load for extra prompt ---
  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/';
  }

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : '';
  }

  const extraEl = document.getElementById('extra');
  extraEl.value = getCookie('suno_extra');
  extraEl.addEventListener('input', () => {
    setCookie('suno_extra', extraEl.value, 365);
  });

  document.getElementById('btn-copy').addEventListener('click', () => {
    const text = document.getElementById('prompt-output').textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast('コピーしました');
    });
  });

  // --- Save to history with dialog ---
  const commentDialog = document.getElementById('comment-dialog');
  const historyCommentInput = document.getElementById('history-comment');

  document.getElementById('btn-save').addEventListener('click', () => {
    historyCommentInput.value = '';
    commentDialog.showModal();
    historyCommentInput.focus();
  });

  document.getElementById('btn-dialog-cancel').addEventListener('click', () => {
    commentDialog.close();
  });

  document.getElementById('btn-dialog-save').addEventListener('click', async () => {
    const { promptLine, full } = await buildPrompt();
    const comment = historyCommentInput.value.trim();
    addToHistory({
      comment,
      promptLine,
      full,
      date: new Date().toISOString(),
    });
    commentDialog.close();
    showToast('履歴に保存しました');
  });

  // ダイアログ外クリックで閉じる
  commentDialog.addEventListener('click', (e) => {
    if (e.target === commentDialog) commentDialog.close();
  });

  // --- Templates ---
  function renderTemplates() {
    const list = document.getElementById('template-list');
    list.innerHTML = '';
    TEMPLATES.forEach((tpl) => {
      const card = document.createElement('div');
      card.className = 'relative bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-all';
      card.innerHTML =
        '<button class="card-copy-btn absolute top-2 right-2 bg-surface2 border border-border rounded w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-accent hover:border-accent hover:text-white transition-all" title="コピー">&#128203;</button>' +
        '<h4 class="text-sm font-bold mb-1">' + escapeHtml(tpl.name) + '</h4>' +
        '<p class="text-xs text-text-dim">' + escapeHtml(tpl.description) + '</p>' +
        '<p class="mt-1 text-accent text-xs">' + escapeHtml(tpl.prompt) + '</p>';
      card.querySelector('.card-copy-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(tpl.prompt).then(() => {
          showToast('コピーしました');
        });
      });
      card.addEventListener('click', async () => {
        for (const id of WEIGHT_IDS) SEL_MAP[id].clear();

        if (tpl.tags) {
          for (const [key, val] of Object.entries(tpl.tags)) {
            if (SEL_MAP[key]) SEL_MAP[key].setFromValue(val);
          }
        }

        // メインプロンプトにテンプレートのプロンプトを設定
        document.getElementById('extra').value = tpl.prompt;

        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        document.querySelector('[data-tab="create"]').classList.add('active');
        document.getElementById('tab-create').classList.add('active');

        await showOutput();
      });
      list.appendChild(card);
    });
  }

  // --- Lyric Templates ---
  function renderLyricTemplates() {
    const list = document.getElementById('lyrics-list');
    list.innerHTML = '';
    if (typeof LYRIC_TEMPLATES === 'undefined') return;
    LYRIC_TEMPLATES.forEach((tpl) => {
      const card = document.createElement('div');
      card.className = 'relative bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-all';
      card.innerHTML =
        '<button class="card-copy-btn absolute top-2 right-2 bg-surface2 border border-border rounded w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-accent hover:border-accent hover:text-white transition-all" title="コピー">&#128203;</button>' +
        '<h4 class="text-sm font-bold mb-1">' + escapeHtml(tpl.name) + '</h4>' +
        '<p class="text-xs text-text-dim mb-2">' + escapeHtml(tpl.description) + '</p>' +
        '<pre class="text-xs text-text-dim bg-bg border border-border rounded p-2 whitespace-pre-wrap overflow-x-auto max-h-40">' + escapeHtml(tpl.structure) + '</pre>';
      card.querySelector('.card-copy-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(tpl.structure).then(() => {
          showToast('コピーしました');
        });
      });
      card.addEventListener('click', () => {
        navigator.clipboard.writeText(tpl.structure).then(() => {
          showToast('歌詞構造をコピーしました');
        });
      });
      list.appendChild(card);
    });
  }

  // --- Template Sub-tabs ---
  document.querySelectorAll('.template-subtab').forEach((subtab) => {
    subtab.addEventListener('click', () => {
      document.querySelectorAll('.template-subtab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.template-subtab-content').forEach((c) => c.classList.remove('active'));
      subtab.classList.add('active');
      document.getElementById('subtab-' + subtab.dataset.subtab).classList.add('active');
    });
  });

  // --- History ---
  function renderHistory() {
    const list = document.getElementById('history-list');
    const history = loadHistory();
    list.innerHTML = '';
    if (!history.length) {
      list.innerHTML = '<div class="text-center text-text-dim py-12 px-4 text-sm">まだ履歴がありません</div>';
      return;
    }
    history.forEach((entry, i) => {
      const card = document.createElement('div');
      card.className = 'relative bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-all';
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const commentHtml = entry.comment ? '<h4 class="text-sm font-bold mb-1">' + escapeHtml(entry.comment) + '</h4>' : '';
      card.innerHTML =
        '<button class="card-copy-btn absolute top-2 right-2 bg-surface2 border border-border rounded w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-accent hover:border-accent hover:text-white transition-all" title="コピー">&#128203;</button>' +
        commentHtml +
        '<p class="text-sm text-text-dim">' + escapeHtml(entry.promptLine) + '</p>' +
        '<div class="text-xs text-text-dim mt-1">' + dateStr + '</div>';
      card.querySelector('.card-copy-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(entry.full).then(() => {
          showToast('コピーしました');
        });
      });
      list.appendChild(card);
    });
  }

  document.getElementById('btn-clear-history').addEventListener('click', () => {
    if (confirm('履歴を全削除しますか？')) {
      clearHistory();
      renderHistory();
    }
  });

  // --- Scroll to top button ---
  var scrollTopBtn = document.getElementById('scroll-top');
  window.addEventListener('scroll', function () {
    scrollTopBtn.style.display = window.scrollY > 300 ? '' : 'none';
  });
  scrollTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Initial ---
  updateWeightLabels();
  renderTemplates();
  renderLyricTemplates();
  
  // グローバル変数として公開（AI反映機能用）
  window.weightSliders = weightSliders;
  window.updateWeightLabels = updateWeightLabels;
  window.renderHistory = renderHistory;
  window.sunoWeightIds = WEIGHT_IDS;
  window.sunoSelMap = SEL_MAP;
  window.sunoGetWeights = getWeights;
  window.sunoShowOutput = showOutput;
  window.sunoRandomFill = randomFill;

  window.sunoGetRawWeightSum = function () {
    return WEIGHT_IDS.reduce((sum, id) => sum + parseInt(weightSliders[id].value, 10), 0);
  };

  window.sunoApplyTags = function (tagsByCategory) {
    for (const id of WEIGHT_IDS) {
      SEL_MAP[id].clear();
    }
    for (const [catId, tags] of Object.entries(tagsByCategory || {})) {
      if (SEL_MAP[catId] && tags.length > 0) {
        SEL_MAP[catId].setFromValue(tags);
      }
    }
  };

  window.sunoClearAllTags = function () {
    for (const id of WEIGHT_IDS) {
      SEL_MAP[id].clear();
    }
  };
