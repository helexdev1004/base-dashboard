'use strict';

// Small completes chart in the PROGRESS column (hourly or daily) and its tooltip.

/* Progress: completes per hour over the past 24 hours (oldest first), adding up to the
   "Completes past 24 hours" count. Hours without completes show as a dash. Entries per
   hour add up to the past-24-hours entries, so each hour has its own conversion. */
const HOUR = 60 * MINUTE;
const SPARK_HOURS = 24;
const sparkCache = new Map();
const hourStart = (ts) => { const d = new Date(ts); d.setMinutes(0, 0, 0); return d.getTime(); };

// Split a whole number over weighted slots (largest remainder), adding to `into`.
function spreadInt(total, weights, into) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!total || !sum) return;
  const raw = weights.map((w) => (total * w) / sum);
  raw.forEach((v, i) => { into[i] += Math.floor(v); });
  let rest = total - raw.reduce((s, v) => s + Math.floor(v), 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (rest > 0 && weights[i]) { into[i] += 1; rest -= 1; } });
}

function hourlyCompletes(p) {
  const start = hourStart(Date.now()) - (SPARK_HOURS - 1) * HOUR;
  const key = `${start}|${p.c24h}|${p.eb24h}|${p.lastCompleteAt}|${p.lastEntryAt}`;
  const hit = sparkCache.get(p.id);
  if (hit?.key === key) return hit;
  const hourOf = (ts) => Math.max(0, Math.min(SPARK_HOURS - 1, Math.floor((hourStart(ts) - start) / HOUR)));
  const counts = new Array(SPARK_HOURS).fill(0);
  let first = null;
  if (p.c24h && p.lastCompleteAt) {
    const next = mulberry32(p.id * 2971 + 13);
    const last = hourOf(p.lastCompleteAt);
    first = Math.max(0, last - 2 - Math.floor(next() * 18));
    // Busier towards the end, with a few quiet hours; the last complete's hour always has one.
    const weights = counts.map((_, i) => (i < first || i > last ? 0
      : i === last ? 1 + next() : next() < 0.25 ? 0 : next() * 0.8 + ((i - first) / (last - first + 1)) * 0.7));
    const sum = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map((w) => (p.c24h * w) / sum);
    raw.forEach((v, i) => { counts[i] = Math.floor(v); });
    let rest = p.c24h - counts.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0])
      .forEach(([, i]) => { if (rest > 0 && weights[i]) { counts[i] += 1; rest -= 1; } });
    if (!counts[last]) {
      const donor = counts.indexOf(Math.max(...counts));
      counts[donor] -= 1;
      counts[last] += 1;
    }
  }
  // Entries: every complete was an entry, plus the other entries spread over the same hours,
  // with at least one in the hour of the last entry.
  const entries = [...counts];
  let extra = Math.max(0, (p.eb24h || 0) - (p.c24h || 0));
  if (extra && p.lastEntryAt && Date.now() - p.lastEntryAt < SPARK_HOURS * HOUR) {
    const next = mulberry32(p.id * 4099 + 7);
    const lastE = hourOf(p.lastEntryAt);
    const firstE = Math.min(first ?? lastE, Math.max(0, lastE - 2 - Math.floor(next() * 18)));
    entries[lastE] += 1;
    extra -= 1;
    spreadInt(extra, entries.map((_, i) => (i < firstE || i > lastE ? 0
      : counts[i] ? counts[i] * 1.5 + 0.5 : next() < 0.2 ? 0 : 0.6)), entries);
  }
  const entry = { key, start, counts, entries };
  sparkCache.set(p.id, entry);
  return entry;
}

// Daily: completes and entries per day over the past 14 days (oldest first), from the project's
// own day-by-day numbers (the same ones as its Progress over time table).
const SPARK_DAYS = 14;
const dailySparkCache = new Map();
function dailyCompletes(p) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: SPARK_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (SPARK_DAYS - 1 - i));
    return d.getTime();
  });
  const key = `${days[0]}|${p.c1}|${p.eb}|${p.lastEntryAt}`;
  const hit = dailySparkCache.get(p.id);
  if (hit?.key === key) return hit;
  const detail = ensureDetail(p); // project.js
  const byDate = new Map(detail.days.map((date, i) => [date, detail.vendors.reduce((acc, v) => {
    acc.c1 += v.daily[i]?.c1 || 0;
    acc.eb += v.daily[i]?.eb || 0;
    return acc;
  }, { c1: 0, eb: 0 })]));
  const counts = days.map((ts) => byDate.get(isoDay(ts))?.c1 || 0);
  const entries = days.map((ts) => byDate.get(isoDay(ts))?.eb || 0);
  const entry = { key, days, counts, entries };
  dailySparkCache.set(p.id, entry);
  return entry;
}

const pad2h = (n) => String(n).padStart(2, '0');
const fmtSparkDay = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtSparkHours = (ts) => { const h = pad2h(new Date(ts).getHours()); return `${h}:00 – ${h}:59`; };

function sparkHtml(p) {
  const daily = state.sparkMode === 'daily';
  const data = daily ? dailyCompletes(p) : hourlyCompletes(p);
  const { counts, entries } = data;
  const at = (i) => (daily ? data.days[i] : data.start + i * HOUR);
  const max = Math.max(...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const busiest = at(counts.indexOf(max));
  const label = !total
    ? `No completes in the past ${daily ? '14 days' : '24 hours'}`
    : `${fmtInt(total)} complete${total === 1 ? '' : 's'} in the past ${daily ? '14 days' : '24 hours'}, most ${daily
      ? `on ${fmtSparkDay(busiest)}` : `between ${fmtSparkHours(busiest).replace(' – ', ' and ')}`}`;
  return `
    <div class="spark${daily ? ' is-daily' : ''}" role="img" aria-label="${label}">
      ${counts.map((n, i) => `<span class="spark-slot" data-at="${at(i)}" data-n="${n}" data-e="${entries[i]}"><span class="spark-bar${n ? '' : ' is-zero'}"${n ? ` style="height:${Math.max(10, Math.round((n / max) * 100))}%"` : ''}></span></span>`).join('')}
    </div>`;
}

// One tooltip for every chart: the date, the hour (hourly only), the completes and the conversion (completes ÷ entries).
function initSparkTips() {
  const tip = document.createElement('div');
  tip.className = 'spark-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  const tbody = $('#projectTbody');
  let current = null;
  const hide = () => {
    tip.hidden = true;
    current?.classList.remove('is-hover');
    current = null;
  };
  tbody.addEventListener('mouseover', (e) => {
    const slot = e.target.closest('.spark-slot');
    if (!slot) return;
    current?.classList.remove('is-hover');
    current = slot;
    slot.classList.add('is-hover');
    const at = Number(slot.dataset.at);
    const n = Number(slot.dataset.n);
    const entries = Number(slot.dataset.e);
    const conversion = entries ? `${Math.round((n / entries) * 100)}% conversion` : 'No entries';
    const hours = slot.parentElement.classList.contains('is-daily') ? '' : `<span>${fmtSparkHours(at)}</span>`;
    tip.innerHTML = `<span>${fmtSparkDay(at)}</span>${hours}
      <span class="spark-tip-hl">${fmtInt(n)} complete${n === 1 ? '' : 's'}</span><span class="spark-tip-hl">${conversion}</span>`;
    tip.hidden = false;
    const r = slot.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2))}px`;
    tip.style.top = `${r.bottom + 10}px`;
    tip.style.setProperty('--arrow-x', `${r.left + r.width / 2 - parseFloat(tip.style.left)}px`);
  });
  tbody.addEventListener('mouseout', (e) => {
    if (e.target.closest('.spark-slot') && !e.relatedTarget?.closest?.('.spark-slot')) hide();
  });
  window.addEventListener('scroll', hide, { passive: true });
}
