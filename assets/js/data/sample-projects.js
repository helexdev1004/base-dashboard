'use strict';

// Generates the sample project list. Seeded, so every reload shows the same numbers.

const TOTAL_PROJECTS = 88;
const LIVE_PROJECTS = 55;

function makeMetrics(base, live, now) {
  const eb = randInt(40, 900);
  const ec = Math.round(eb * rand(0.55, 0.85));
  const c1 = Math.round(ec * rand(0.04, 0.3));
  const s1 = Math.round((ec - c1) * rand(0.35, 0.8));
  const q1 = Math.round((ec - c1 - s1) * rand(0, 0.7));
  const s2 = rng() < 0.65 ? 0 : Math.round((ec - c1 - s1 - q1) * rand(0.2, 0.9));
  const q2 = rng() < 0.8 ? 0 : randInt(1, 25);
  const dupsA = rng() < 0.3 ? 0 : randInt(1, 130);
  const qfA = rng() < 0.5 ? 0 : randInt(1, 6);
  const loiBid = pick([5, 7, 8, 10, 12, 15, 20]);

  const minsAgo = live
    ? (rng() < 0.8 ? randInt(1, 120) : randInt(121, 1800))
    : randInt(2, 75) * 1440 + randInt(0, 1439);
  const lastEntryAt = now - minsAgo * MINUTE;
  const lastCompleteAt = c1 ? lastEntryAt - randInt(0, live ? 240 : 2880) * MINUTE : null;

  const activeToday = live && minsAgo < 1440;
  // Completes in the past 24 hours: at least one when the last complete was that recent, none otherwise.
  const completeToday = Boolean(activeToday && lastCompleteAt && now - lastCompleteAt < DAY);
  const c24hShare = activeToday ? Math.round(c1 * rand(0.03, 0.2)) : 0;
  const c24h = completeToday ? Math.max(1, c24hShare) : 0;
  const eb24h = activeToday ? Math.max(c24h, Math.round(eb * rand(0.05, 0.2))) : 0;
  const inThisMonth = live || (lastCompleteAt && lastCompleteAt >= startOfMonth(now));

  return {
    ...base,
    status: live ? 'Live' : 'Closed',
    eb, ec, c1, s1, q1, s2, q2,
    ir: c1 ? Math.max(1, Math.round(ratio(c1, c1 + s1 + s2))) : 0,
    conv: c1 ? Math.max(1, Math.round(ratio(c1, eb))) : 0,
    loiBid,
    loiReal: c1 ? +(loiBid * rand(0.85, 1.35)).toFixed(2) : null,
    drops: Math.round(eb * rand(0.02, 0.1)),
    dupsA,
    dupsB: Math.round(dupsA * rand(0.15, 0.6)),
    qfA,
    qfB: Math.round(qfA * rand(0, 0.7)),
    others: rng() < 0.3 ? 0 : randInt(1, 20),
    lastEntryAt,
    lastCompleteAt,
    c24h,
    eb24h,
    cMonth: inThisMonth ? c1 : 0,
    ebMonth: inThisMonth ? eb : 0,
  };
}

function buildProjects() {
  const now = Date.now();
  const countryByCode = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
  const bases = [];
  let id = 8650;
  let jobNo = 33732;

  for (let i = 0; i < TOTAL_PROJECTS; i++) {
    if (i > 0) {
      id -= randInt(1, 3);
      jobNo -= rng() < 0.7 ? randInt(1, 40) : randInt(200, 900);
    }
    const preset = PRESET_TOPICS[i];
    const topicIndex = i - PRESET_TOPICS.length;
    const wave = Math.floor(topicIndex / TOPICS.length);
    bases.push({
      id,
      jobNo,
      po: String(jobNo), // the client's PO; sample projects use the job number
      name: preset ? preset.name : TOPICS[topicIndex % TOPICS.length] + (wave ? ` W${wave + 1}` : ''),
      country: preset ? countryByCode[preset.country] : pick(COUNTRIES),
      client: pick(CLIENTS),
      pms: [i < 6 ? PMS[0] : pick(PMS)],
    });
  }

  // Newer projects are more likely to still be live.
  const liveIds = new Set(
    bases
      .map((b, i) => ({ id: b.id, score: i + rng() * 30 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, LIVE_PROJECTS)
      .map((s) => s.id)
  );

  const list = bases.map((b) => makeMetrics(b, liveIds.has(b.id), now));

  // Project 8650 (top of the list) gets fixed numbers and is always live.
  // If it came out Closed, another live one is closed so the count stays at LIVE_PROJECTS.
  const first = list.find((p) => p.id === 8650);
  if (first.status !== 'Live') {
    const swap = list.find((p) => p.status === 'Live' && p.id !== 8650);
    swap.status = 'Closed';
  }
  Object.assign(first, {
    status: 'Live', c1: 55, ir: 11, conv: 10, loiBid: 10, loiReal: 11,
    eb: 472, ec: 333, s1: 280, q1: 115, s2: 0, q2: 0, drops: 31,
    dupsA: 126, dupsB: 55, qfA: 1, qfB: 0, others: 15, cMonth: 55, ebMonth: 472,
    lastEntryAt: now - 6 * MINUTE, lastCompleteAt: now - 14 * MINUTE,
  });
  first.c24h = Math.max(first.c24h, 8);
  first.eb24h = Math.max(first.eb24h, 74);

  return list;
}

let projects = buildProjects();
