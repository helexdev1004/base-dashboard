'use strict';

// Sample detail for a project (vendors, days, campaigns, codes...), built the first time it is opened.

const pmNames = (p) => p.pms.map((x) => x.name).join(', ');
const makeLiveLink = (next = Math.random) => `https://fwredirect.com/start/${token(15, next)}/{MFID}`;

// Totals shown inside a project. Most come straight from the list row; the extra
// breakdown (DUP3, GEO1, EX1/2, DEV1, no unique code) lives in project.detail.
function projectStats(p) {
  const d = p.detail;
  return {
    eb: p.eb, ec: p.ec, incomplete: p.drops, c1: p.c1, s1: p.s1, s2: p.s2, q1: p.q1, q2: p.q2,
    dup1: p.dupsA, dup2: p.dupsB, dup3: d.dup3, geo1: d.geo1, qfail1: p.qfA, qfail2: p.qfB,
    ex1: d.ex1, ex2: d.ex2, dev1: d.dev1, noUnique: d.noUnique,
  };
}

function newDetail() {
  return {
    type: 'ad hoc', geoIp: true, blockDupIp: true, exclusions: [], notes: '', liveLink: makeLiveLink(),
    dup3: 0, geo1: 0, ex1: 0, ex2: 0, dev1: 0, noUnique: 0,
    days: [], vendors: [], campaigns: [], codes: [], links: [], ips: [],
    screenerActive: true, screener: [], pollActive: false, pollStatuses: ['C1'], poll: [],
  };
}

// A question copied from a library entry, with zeroed answer counts.
function questionFromLibrary(lib, id) {
  return {
    id,
    libId: lib.id,
    text: lib.text,
    type: lib.type,
    answers: lib.answers.map(([text, action = 'none'], i) => ({ id: i + 1, text, action, counts: [0, 0, 0] })),
  };
}

// Some projects exclude respondents of earlier projects in the same country.
function sampleExclusions(p) {
  const r = seeded(p.id * 53 + 5);
  if (!r.chance(0.4)) return [];
  const older = projects.filter((x) => x.country.code === p.country.code && x.id < p.id);
  return shuffle(older, r.next).slice(0, r.int(1, 2)).map((x, i) => {
    const [period, unit] = r.pick([[6, 'months'], [12, 'months'], [3, 'months'], [8, 'weeks']]);
    return {
      id: i + 1,
      projectId: x.id,
      statuses: r.chance(0.6) ? EXCLUSION_STATUSES.map(([code]) => code) : ['C1', 'S1', 'S2', 'QFAIL1', 'QFAIL2'],
      period,
      unit,
    };
  });
}

// Sample detail, generated the first time a project is opened (seeded by its id, so it's stable).
function ensureDetail(p) {
  if (p.detail) return p.detail;
  const r = seeded(p.id * 7919 + 17);
  const live = p.status === 'Live';
  const end = p.lastEntryAt || Date.now();
  const dayCount = p.eb ? r.int(3, 7) : 0;
  const days = Array.from({ length: dayCount }, (_, i) => isoDay(end - (dayCount - 1 - i) * DAY));
  // The list's OTHERS column is GEO1 + EX1 + EX2 + DEV1 + no unique code.
  const [geo1, ex1, ex2, dev1, noUnique] = splitInt(p.others,
    [r.between(2, 5), r.between(0, 1), r.between(0, 1), r.between(0, 1), r.between(0, 1.5)]);

  const d = {
    type: r.chance(0.7) ? 'ad hoc' : r.pick(PROJECT_TYPES),
    geoIp: r.chance(0.8),
    blockDupIp: r.chance(0.75),
    exclusions: sampleExclusions(p),
    notes: '',
    liveLink: makeLiveLink(r.next),
    dup3: r.chance(0.7) ? 0 : r.int(1, 5),
    geo1, ex1, ex2, dev1, noUnique,
    days,
    vendors: [], campaigns: [], codes: [], links: [], ips: [],
    screenerActive: r.chance(0.85), screener: [],
    pollActive: r.chance(0.4), pollStatuses: r.chance(0.6) ? ['C1'] : ['C1', 'S1'], poll: [],
  };
  p.detail = d;

  // Vendors share the project's totals; each vendor's totals are spread over the fieldwork days.
  if (p.eb) {
    const count = r.chance(0.55) ? 1 : r.int(2, 3);
    const names = ['Gavenze', ...shuffle(VENDORS.slice(1), r.next)].slice(0, count);
    const weights = names.map(() => r.between(0.35, 1));
    const totals = projectStats(p);
    const parts = names.map(() => emptyStats());
    STAT_KEYS.forEach((k) => splitInt(totals[k], weights).forEach((v, i) => { parts[i][k] = v; }));
    d.vendors = names.map((name, i) => ({
      id: i + 1,
      name,
      status: live ? (r.chance(0.85) ? 'active' : 'paused') : 'closed',
      stats: parts[i],
      daily: spreadOverDays(parts[i], days, live, r),
    }));
  }

  d.campaigns = makeCampaigns(r, end, live, p);
  if (r.chance(0.5)) d.codes = makePool(r.int(80, 300), p.c1, r, () => token(8, r.next, CODE_CHARS), days, end);
  if (r.chance(0.3)) {
    d.links = makePool(r.int(40, 160), Math.round(p.c1 * 0.8), r,
      () => `https://panel.example.com/r/${token(10, r.next)}`, days, end);
  }
  if (r.chance(0.5)) {
    d.ips = Array.from({ length: r.int(1, 6) }, () => ({
      ip: `${r.int(11, 223)}.${r.int(0, 255)}.${r.int(0, 255)}.${r.chance(0.25) ? '0/24' : r.int(1, 254)}`,
      addedAt: end - r.between(1, 20) * DAY,
    }));
  }
  // Screener: "age" plus a few library questions. Counts per answer are
  // [chose this answer, went on to complete, screened out here].
  const picks = ['age', ...shuffle(SCREENER_TEMPLATES.slice(1).map((q) => q.id), r.next).slice(0, r.int(1, 2))];
  d.screener = picks.map((libId, i) => {
    const q = questionFromLibrary(SCREENER_TEMPLATES.find((l) => l.id === libId), i + 1);
    const chose = splitInt(p.eb, q.answers.map(() => r.between(0.2, 1)));
    const passing = q.answers.map((a, j) => (SCREENOUT_ACTIONS.has(a.action) ? 0 : chose[j]));
    const completed = splitInt(p.c1, passing.some(Boolean) ? passing : passing.map(() => 1));
    q.answers.forEach((a, j) => {
      a.counts = [chose[j], SCREENOUT_ACTIONS.has(a.action) ? 0 : completed[j], SCREENOUT_ACTIONS.has(a.action) ? chose[j] : 0];
    });
    return q;
  });

  // Post poll: answer counts are responses from completes.
  if (d.pollActive) {
    d.poll = shuffle(POLL_LIBRARY.slice(0, 4), r.next).slice(0, r.int(1, 2)).map((lib, i) => {
      const q = questionFromLibrary(lib, i + 1);
      const responses = splitInt(Math.round(p.c1 * r.between(0.5, 0.9)), q.answers.map(() => r.between(0.2, 1)));
      q.answers.forEach((a, j) => { a.counts = [responses[j]]; });
      return q;
    });
  }
  return d;
}

function spreadOverDays(stats, days, live, r) {
  if (!days.length) return [];
  // The last day of a live project is still in progress, so it gets a smaller share.
  const base = days.map((_, i) => (live && i === days.length - 1 ? r.between(0.05, 0.35) : r.between(0.4, 1)));
  const rows = days.map((date) => ({ date, ...emptyStats() }));
  STAT_KEYS.forEach((k) => {
    splitInt(stats[k], base.map((w) => w * r.between(0.75, 1.25))).forEach((v, i) => { rows[i][k] = v; });
  });
  return rows;
}

function campaignStats(r) {
  const inv = r.int(50, 800);
  const eb = Math.round(inv * (r.chance(0.6) ? r.between(0.02, 0.15) : r.between(0.35, 0.85)));
  const ec = Math.round(eb * r.between(0.5, 0.9));
  const c1 = Math.round(ec * r.between(0.2, 0.6));
  const rare = () => (r.chance(0.85) ? 0 : r.int(1, 6));
  const stats = {
    inv, eb, ec, c1, s1: rare(), s2: rare(), q1: rare(),
    q2: Math.round((ec - c1) * r.between(0.5, 1)),
    inc: Math.round((eb - ec) * r.between(0.2, 0.7)),
  };
  // OTH: a few duplicates and geo fails, the odd quality fail.
  const oth = r.int(0, 4);
  splitInt(oth, CAMPAIGN_OTHER_KEYS.map((k) => ({ geo1: 4, dup1: 3, dup2: 1.5, qfail1: 1 }[k] || 0.2) * r.between(0.3, 1)))
    .forEach((v, j) => { stats[CAMPAIGN_OTHER_KEYS[j]] = v; });
  return stats;
}

const zeroCampaignStats = (inv = 0) => ({ ...Object.fromEntries(CAMPAIGN_KEYS.map((k) => [k, 0])), inv });
const sampleName = (s) => `${s.gender}, ${s.from}-${s.to}`;

// Segments are the campaign's samples, each with its share of the numbers.
function segmentsFor(c, stats, r = null) {
  if (!c.setup.batch) return [];
  const weights = c.setup.samples.map(() => (r ? r.between(0.6, 1) : 1));
  const parts = c.setup.samples.map(() => ({}));
  CAMPAIGN_KEYS.forEach((k) => splitInt(stats[k], weights).forEach((v, j) => { parts[j][k] = v; }));
  return c.setup.samples.map((s, j) => ({ id: j + 1, name: sampleName(s), status: c.status, created: c.created, stats: parts[j] }));
}

const SAMPLE_PRESETS = [
  [['Male', 18, 99], ['Female', 18, 99]],
  [['Female', 25, 65], ['Male', 25, 65]],
  [['Female', 18, 34], ['Female', 35, 54], ['Female', 55, 99]],
];

function makeCampaigns(r, end, live, p) {
  const count = r.chance(0.25) ? 0 : r.int(2, 6);
  const list = [];
  let created = end - r.between(3, 6) * DAY;
  for (let i = 1; i <= count; i++) {
    created = Math.min(end, created + r.between(0.2, 1.1) * DAY);
    const stats = campaignStats(r);
    const panel = r.chance(0.6) ? 'GAV' : r.pick(PANELS).code;
    const batch = r.chance(0.85);
    const preset = r.pick(SAMPLE_PRESETS);
    const big = r.chance(0.5);
    const campaign = {
      id: i,
      name: `Campaign ${pad2(i)}`,
      panel,
      status: !live || (i < count - 2 && r.chance(0.3)) ? 'closed' : 'active',
      created,
      stats,
      setup: {
        points: campaignPoints(panel, p.loiBid),
        length: p.loiBid,
        extra: { on: false, text: '', html: '' },
        batch,
        filters: [
          { key: 'reliable', op: '=', a: 'yes', b: '', values: [] },
          ...(r.chance(0.4) ? [{ key: 'points', op: 'between', a: '0', b: String(r.pick([70, 150, 300])), values: [] }] : []),
        ],
        samples: batch ? preset.map(([gender, from, to], j) => ({
          id: j + 1, gender, from, to, requested: big ? 999 : Math.ceil((stats.inv / preset.length) * r.between(1.05, 1.4) / 10) * 10,
        })) : [],
        source: { type: 'text', field: 'id', ids: batch ? '' : Array.from({ length: Math.min(stats.inv, 6) }, () => String(r.int(400001, 493865))).join('\n') },
        autoSample: r.chance(0.15),
      },
    };
    campaign.segments = segmentsFor(campaign, stats, r);
    list.push(campaign);
  }
  return list;
}

// Survey points for a panel and survey length, from Panel management ▸ Survey points.
function campaignPoints(code, length) {
  if (typeof surveyPoints === 'undefined' || typeof PANEL_INFO === 'undefined' || !(length > 0)) return '';
  const slug = PANEL_INFO.find((x) => x.code === code)?.slug;
  const rows = surveyPoints.find((x) => x.panel === slug)?.points || [];
  if (!rows.length) return '';
  const minutes = Math.round(length);
  const exact = rows.find(([m]) => m === minutes);
  if (exact) return exact[1];
  const below = rows.filter(([m]) => m <= minutes);
  return (below.length ? below.at(-1) : rows[0])[1];
}

function makePool(count, used, r, makeValue, days, end) {
  const seen = new Set();
  const items = [];
  while (items.length < count) {
    const value = makeValue();
    if (seen.has(value)) continue;
    seen.add(value);
    items.push({ value, mrid: null, usedAt: null });
  }
  for (let i = 0; i < Math.min(used, count); i++) {
    items[i].mrid = `MR${r.int(100000, 999999)}`;
    items[i].usedAt = end - r.between(0, Math.max(1, days.length)) * DAY;
  }
  return items;
}

function createProject(v) {
  const p = {
    id: Math.max(...projects.map((x) => x.id)) + 1,
    jobNo: v.jobNo,
    po: v.po,
    name: v.name,
    country: v.country,
    client: v.client,
    pms: v.pms,
    status: v.status,
    eb: 0, ec: 0, c1: 0, s1: 0, q1: 0, s2: 0, q2: 0,
    ir: 0, conv: 0,
    loiBid: v.loiBid,
    loiReal: null,
    drops: 0, dupsA: 0, dupsB: 0, qfA: 0, qfB: 0, others: 0,
    lastEntryAt: null, lastCompleteAt: null,
    c24h: 0, eb24h: 0, cMonth: 0, ebMonth: 0,
    createdAt: Date.now(),
  };
  p.detail = {
    ...newDetail(),
    type: v.type, geoIp: v.geoIp, blockDupIp: v.blockDupIp,
    notes: v.notes, liveLink: v.liveLink,
  };
  // Library questions marked "Project default" for this country start the screener.
  p.detail.screener = SCREENER_LIBRARY
    .filter((lib) => lib.projectDefault && lib.country === v.country.code.toUpperCase())
    .map((lib, i) => questionFromLibrary(lib, i + 1));
  projects.unshift(p);
  return p;
}
