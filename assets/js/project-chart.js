'use strict';

// Progress over time chart on the project page (Project vendors tab). The numbers are in the
// #progressData block at the bottom of project.html; the chart is redrawn to fit its width.

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

const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function niceScale(max, target = 4) {
  const rough = max / target;
  const mag = 10 ** Math.floor(Math.log10(rough));
  // Counts are whole numbers, so only whole-number steps (2.5 is fine once it scales to 25, 250, ...).
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= rough && Number.isInteger(s)));
  return { step, top: Math.ceil(max / step) * step };
}

const progress = JSON.parse($('#progressData').textContent);
let chartIndex = -1;

// Line chart of daily completes per vendor. Colours follow the vendor, never its rank.
function drawProgressChart() {
  const wrap = $('#progressChart');
  if (!wrap || !wrap.clientWidth) return;
  const { days: dates, labels: dayLabels, series } = progress;
  if (!dates.length || !series.length) return; // the empty state is already in the page

  const totals = dates.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0));
  const multi = series.length > 1;
  const W = wrap.clientWidth;
  const H = 300;
  const m = { top: 16, right: 20, bottom: 62, left: 56 };
  const plotH = H - m.top - m.bottom;
  const { step, top: yMax } = niceScale(Math.max(1, ...series.flatMap((s) => s.values)));
  const y = (v) => m.top + plotH - (v / yMax) * plotH;

  // Name labels at the line ends for 2-4 vendors, unless they'd overlap. The legend and tooltip cover the rest.
  let endLabels = false;
  if (multi && series.length <= 4) {
    const ends = series.map((s) => y(s.values[s.values.length - 1])).sort((a, b) => a - b);
    endLabels = ends.every((v, i) => i === 0 || v - ends[i - 1] >= 14);
    if (endLabels) m.right = 18 + Math.min(120, Math.max(...series.map((s) => s.name.length)) * 6.6);
  }
  const plotW = W - m.left - m.right;
  const inset = dates.length > 1 ? 22 : 0;
  const x = (i) => (dates.length === 1 ? m.left + plotW / 2 : m.left + inset + (i / (dates.length - 1)) * (plotW - inset * 2));
  const labelEvery = Math.max(1, Math.ceil((dates.length * 56) / plotW));

  const ticks = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v);
  const grid = ticks.map((v) => `
    <line class="ch-grid" x1="${m.left}" x2="${W - m.right}" y1="${y(v)}" y2="${y(v)}"></line>
    <text class="ch-tick" x="${m.left - 10}" y="${y(v) + 4}" text-anchor="end">${fmtInt(v)}</text>`).join('');

  const xAxis = dates.map((date, i) => {
    if (i % labelEvery !== 0 && i !== dates.length - 1) return '';
    const label = fmtInt(totals[i]);
    const w = 14 + label.length * 7;
    return `
      <text class="ch-tick" x="${x(i)}" y="${H - m.bottom + 20}" text-anchor="middle">${dayLabels[i]}</text>
      <g class="ch-total"><rect x="${x(i) - w / 2}" y="${H - m.bottom + 30}" width="${w}" height="18" rx="5"></rect>
      <text x="${x(i)}" y="${H - m.bottom + 43}" text-anchor="middle">${label}</text></g>`;
  }).join('');

  const lines = series.map((s) => {
    const pts = s.values.map((v, i) => [x(i), y(v)]);
    const path = smoothPath(pts);
    const area = !multi && pts.length > 1
      ? `<path class="ch-area" d="${path} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z" style="fill:${s.color}"></path>`
      : '';
    const dots = pts.map(([px, py]) => `<circle class="ch-dot" cx="${px}" cy="${py}" r="4" style="fill:${s.color}"></circle>`).join('');
    return `${area}<path class="ch-line" d="${path}" style="stroke:${s.color}"></path>${dots}`;
  }).join('');

  const labels = endLabels
    ? series.map((s) => `<text class="ch-end" x="${x(dates.length - 1) + 10}" y="${y(s.values[s.values.length - 1]) + 4}">${escapeHtml(s.name)}</text>`).join('')
    : '';

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true">
      ${grid}
      <line class="ch-axis" x1="${m.left}" x2="${W - m.right}" y1="${y(0)}" y2="${y(0)}"></line>
      <text class="ch-tick" transform="translate(14 ${m.top + plotH / 2}) rotate(-90)" text-anchor="middle">Completes (C1)</text>
      ${xAxis}
      <line class="ch-cross" x1="0" x2="0" y1="${m.top}" y2="${y(0)}" visibility="hidden"></line>
      ${lines}
      ${labels}
      <rect class="ch-hit" x="${m.left}" y="${m.top}" width="${plotW}" height="${plotH}"></rect>
    </svg>
    <div class="chart-tooltip" aria-live="polite" hidden></div>`;

  const hit = $('.ch-hit', wrap);
  const cross = $('.ch-cross', wrap);
  const tip = $('.chart-tooltip', wrap);

  const show = (i) => {
    chartIndex = i;
    cross.setAttribute('x1', x(i));
    cross.setAttribute('x2', x(i));
    cross.setAttribute('visibility', 'visible');
    tip.innerHTML = `
      <div class="tt-date">${dates[i]}</div>
      ${series.map((s) => `
        <div class="tt-row"><span class="tt-val">${fmtInt(s.values[i])}</span><span class="tt-key" style="background:${s.color}"></span><span class="tt-name">${escapeHtml(s.name)}</span></div>`).join('')}
      ${multi ? `<div class="tt-row tt-total"><span class="tt-val">${fmtInt(totals[i])}</span><span class="tt-name">Total</span></div>` : ''}`;
    tip.hidden = false;
    const topY = Math.min(...series.map((s) => y(s.values[i])));
    const left = Math.min(Math.max(x(i), tip.offsetWidth / 2 + 4), W - tip.offsetWidth / 2 - 4);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(topY - 12, tip.offsetHeight + 4)}px`;
  };
  const hide = () => {
    chartIndex = -1;
    cross.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  };
  const nearest = (clientX) => {
    const px = clientX - hit.getBoundingClientRect().left + m.left;
    let best = 0;
    dates.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    return best;
  };

  hit.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
  hit.addEventListener('pointerleave', hide);
  wrap.onblur = hide;
  wrap.onkeydown = (e) => {
    if (e.key === 'Escape') { hide(); return; }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const start = chartIndex < 0 ? (dir > 0 ? -1 : dates.length) : chartIndex;
    show(Math.max(0, Math.min(dates.length - 1, start + dir)));
  };
}

// Redraw whenever the chart's width changes (window resize, sidebar collapse, tab shown again).
document.addEventListener('DOMContentLoaded', () => {
  const wrap = $('#progressChart');
  if (!wrap) return;
  let timer;
  new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(drawProgressChart, 80); }).observe(wrap);
  drawProgressChart();
});
