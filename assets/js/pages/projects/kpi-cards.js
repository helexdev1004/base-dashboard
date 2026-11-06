'use strict';

// KPI cards above the project list.

const KPI_CONFIG = [
  // Accents follow the theme (--kpi-1 to --kpi-5 in assets/css/base/themes.css).
  { key: 'live', title: 'Projects', sub: 'currently live', icon: 'bi-broadcast', accent: 'var(--kpi-1)', type: 'int' },
  { key: 'cMonth', title: 'Completes', sub: 'this month', icon: 'bi-check2-circle', accent: 'var(--kpi-2)', type: 'int' },
  { key: 'c24', title: 'Completes', sub: 'past 24 hours', icon: 'bi-clock-history', accent: 'var(--kpi-3)', type: 'int' },
  { key: 'convMonth', title: 'Conversion', sub: 'this month', icon: 'bi-arrow-repeat', accent: 'var(--kpi-4)', type: 'pct' },
  { key: 'conv24', title: 'Conversion', sub: 'past 24 hours', icon: 'bi-lightning-charge', accent: 'var(--kpi-5)', type: 'pct' },
];

function computeKpis() {
  const sum = (key) => projects.reduce((total, p) => total + (p[key] || 0), 0);
  return {
    live: projects.filter((p) => p.status === 'Live').length,
    cMonth: sum('cMonth'),
    c24: sum('c24h'),
    convMonth: ratio(sum('cMonth'), sum('ebMonth')),
    conv24: ratio(sum('c24h'), sum('eb24h')),
  };
}

// Made-up 14-day trend ending at today's value. Built once per card; after that only the last point moves.
const kpiSeries = {};
function seriesFor(key, end) {
  if (!kpiSeries[key]) {
    const out = [end];
    let v = end;
    for (let i = 1; i < 14; i++) {
      v = v / (1 + 0.02 + (rng() - 0.5) * 0.24);
      out.unshift(v);
    }
    kpiSeries[key] = out;
  }
  kpiSeries[key][kpiSeries[key].length - 1] = end;
  return kpiSeries[key];
}

function sparklineSvg(values, id) {
  const w = 120;
  const h = 60;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2.5),
  ]);
  const line = smoothPath(pts);
  const area = `${line} L${w},${h} L0,${h} Z`;

  return `
    <svg class="kpi-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--accent); stop-opacity: .55" />
          <stop offset="1" style="stop-color: var(--accent); stop-opacity: 0" />
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${id})" />
      <path d="${line}" fill="none" style="stroke: var(--accent)" stroke-width="1.8" vector-effect="non-scaling-stroke" />
    </svg>`;
}

function formatKpi(value, type) {
  return type === 'pct' ? fmtPct(value) : fmtInt(value);
}

function renderKpis(animate = false) {
  const values = computeKpis();
  $('#kpiGrid').innerHTML = KPI_CONFIG.map((cfg) => {
    const series = seriesFor(cfg.key, values[cfg.key]);
    return `
      <article class="kpi-card" style="--accent:${cfg.accent}" title="${cfg.title} ${cfg.sub}">
        <span class="kpi-icon"><i class="bi ${cfg.icon}"></i></span>
        <div class="kpi-label">
          <span class="kpi-title">${cfg.title}</span>
          <span class="kpi-sub">${cfg.sub}</span>
        </div>
        <span class="kpi-value" data-value="${values[cfg.key]}" data-type="${cfg.type}">
          ${formatKpi(animate ? 0 : values[cfg.key], cfg.type)}
        </span>
        ${sparklineSvg(series, `spark-${cfg.key}`)}
      </article>`;
  }).join('');

  if (animate) countUp($$('.kpi-value'));
}

function countUp(els) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => { el.textContent = formatKpi(+el.dataset.value, el.dataset.type); });
    return;
  }
  const start = performance.now();
  const duration = 900;
  const step = (t) => {
    const k = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    els.forEach((el) => { el.textContent = formatKpi(+el.dataset.value * eased, el.dataset.type); });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
