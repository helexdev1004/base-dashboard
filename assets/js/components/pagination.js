'use strict';

// Pager, search box and paging helpers shared by the list pages.

function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => set.add(p));
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

// First, prev, page numbers, next, last. Every button carries data-<attr>="<page>".
function pagerHtml(cur, pages, attr) {
  const btn = (page, label, aria, disabled) => `
    <li><button type="button" data-${attr}="${page}" ${disabled ? 'disabled' : ''} aria-label="${aria}">${label}</button></li>`;
  return `
    <ul class="pagination-dark">
      ${btn(1, '«', 'First page', cur === 1)}
      ${btn(cur - 1, '‹', 'Previous page', cur === 1)}
      ${pageList(cur, pages).map((p) => (p === '…'
        ? '<li><span class="ellipsis">…</span></li>'
        : `<li><button type="button" data-${attr}="${p}" class="${p === cur ? 'active' : ''}" ${p === cur ? 'aria-current="page"' : ''}>${p}</button></li>`)).join('')}
      ${btn(cur + 1, '›', 'Next page', cur === pages)}
      ${btn(pages, '»', 'Last page', cur === pages)}
    </ul>`;
}

// Search field with a search button and a clear button (inputs carry data-search="<key>").
function searchGroupHtml(key, placeholder, value = '') {
  return `
    <div class="input-group search-group" role="search">
      <input class="form-control" type="search" data-search="${key}" value="${escapeHtml(value)}" placeholder="${placeholder}" aria-label="${placeholder}" autocomplete="off">
      <button type="button" class="btn btn-ghost" data-search-go="${key}" title="Search" aria-label="Search"><i class="bi bi-search"></i></button>
      <button type="button" class="btn btn-ghost" data-search-clear="${key}" title="Clear search" aria-label="Clear search"><i class="bi bi-x-circle"></i></button>
    </div>`;
}

// Page slice for a sorted list: { rows, page, pages, start }.
function paginate(list, page, size) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const cur = Math.min(Math.max(1, page), pages);
  const start = (cur - 1) * size;
  return { rows: list.slice(start, start + size), page: cur, pages, start };
}
