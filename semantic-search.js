import { searchTags } from './tag-index.js';

export function createSearchBox(categoryId, onFilter) {
  const container = document.createElement('div');
  container.className = 'flex items-center gap-2 mb-2';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '\uD83D\uDD0D \u5019\u88DC\u3092\u7D5E\u308A\u8FBC\u307F';
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
