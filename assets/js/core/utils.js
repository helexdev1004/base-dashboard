'use strict';

// Small helpers used everywhere: DOM lookups, the seeded random generator, formatting and HTML snippets.

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Seeded PRNG so the sample data is the same on every load.
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261015);
const rand = (min, max) => min + rng() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtPct = (n) => `${n.toFixed(1)}%`;
const ratio = (a, b) => (b ? (a / b) * 100 : 0);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function relativeTime(ts) {
  const mins = Math.max(0, Math.round((Date.now() - ts) / MINUTE));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function startOfMonth(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function freshness(ts) {
  const mins = (Date.now() - ts) / MINUTE;
  if (mins < 60) return 'fresh';
  if (mins < 1440) return 'warm';
  return 'stale';
}

// Monotone cubic curve through [x, y] points: smooth, but never overshoots the data.
function smoothPath(pts) {
  const n = pts.length;
  const f = (v) => v.toFixed(1);
  if (!n) return '';
  if (n < 3) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)},${f(y)}`).join(' ');
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0
      ? 0
      : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]);
  }
  tangent[n - 1] = slope[n - 2];
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${f(pts[i][0] + h)},${f(pts[i][1] + tangent[i] * h)} ${f(pts[i + 1][0] - h)},${f(pts[i + 1][1] - tangent[i + 1] * h)} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
  }
  return d;
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((cols) => cols.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  // Starts with an invisible UTF-8 BOM so Excel doesn't mangle accented names.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Local date as YYYY-MM-DD (for export file names).
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-US');
const fmtDateTime = (ts) => new Date(ts).toLocaleString('en-US');

function seeded(seed) {
  const next = mulberry32(seed);
  const between = (min, max) => min + next() * (max - min);
  return {
    next,
    between,
    int: (min, max) => Math.floor(between(min, max + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function token(length, next = Math.random, chars = TOKEN_CHARS) {
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(next() * chars.length)];
  return out;
}

function shuffle(arr, next) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Split an integer total into parts proportional to the weights (largest remainder; parts sum to total).
function splitInt(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (rest > 0) { out[i] += 1; rest -= 1; } });
  return out;
}

const pad2 = (n) => String(n).padStart(2, '0');
function isoDay(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtStamp(ts) {
  const d = new Date(ts);
  return `${isoDay(ts)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const plural = (n, word, many = `${word}s`) => `${fmtInt(n)} ${n === 1 ? word : many}`;
const numCell = (n, cls = '') => `<td class="${cls}${n === 0 ? ' zero' : ''}">${fmtInt(n)}</td>`;
const thCells = (cols, hl = 'c1') => cols
  .map(([key, label, title]) => `<th class="${key === hl ? 'col-hl' : ''}"${title ? ` title="${title}"` : ''}>${label}</th>`)
  .join('');
const optionsHtml = (opts, selected) => opts
  .map(([value, label]) => `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escapeHtml(label)}</option>`)
  .join('');
const emptyRow = (span, title, text) => `
  <tr class="pv-empty"><td colspan="${span}">
    <i class="bi bi-inboxes"></i><div class="empty-title">${title}</div><div class="empty-text">${text}</div>
  </td></tr>`;

function copyText(text, message) {
  navigator.clipboard.writeText(text)
    .then(() => showToast(message))
    .catch(() => showToast('Copy failed — select the text and copy it manually.', 'info'));
}
