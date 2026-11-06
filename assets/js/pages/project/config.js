'use strict';

// Project detail settings: tabs, stat columns, question types and screener presets.

const PROJECT_TYPES = ['ad hoc', 'tracker', 'omnibus'];
const ENTITY_STATUSES = ['active', 'paused', 'closed'];
const LINK_VARIABLES = ['{MFID}', '{UNIQUE_CODES}', '{CUSTOM_LINK}'];
const SURVEY_GROUP_HELP = 'Respondents that attempted in selected projects are not eligible for this project.';
// Project exclusions: [code, description] of each status that can be excluded.
const EXCLUSION_STATUSES = [
  ['C1', 'Complete'], ['S1', 'Screenout'], ['S2', 'Screenout in screener'], ['Q1', 'Quota full'], ['Q2', 'Quota full in screener'],
  ['INC', 'Incomplete'], ['DUP1', 'Duplicate'], ['DUP2', 'Duplicate in Base'], ['DUP3', 'Excluded in group'], ['GEO1', 'GeoIP fail'],
  ['QFAIL1', 'Quality fail'], ['QFAIL2', 'Quality fail in screener'], ['DEV1', 'Wrong device'], ['EX1', 'Forbidden IP'], ['EX2', 'Excluded'],
];
const EXCLUSION_UNITS = [['weeks', 'Weeks'], ['months', 'Months']];
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

// Screener / post poll question builder.
const QUESTION_TYPES = ['Single radio', 'Single dropdown', 'Multiple choice', 'Numeric', 'Open text'];
const TYPES_WITHOUT_ANSWERS = new Set(['Numeric', 'Open text']);
// QFAIL2 is a quality fail in the screener (QFAIL1 is reported from the survey itself).
const ANSWER_ACTIONS = [
  ['none', 'No action'], ['S1', 'S1'], ['S2', 'S2'], ['Q2', 'Q2'], ['QFAIL2', 'QFAIL2'], ['Required', 'Required'], ['Qualify', 'Qualify'],
];
const SCREENOUT_ACTIONS = new Set(['S1', 'S2', 'Q2', 'QFAIL2']);
const POLL_STATUSES = [
  ['C1', 'Complete (C1)'], ['S1', 'Screenout (S1)'], ['S2', 'Screenout (S2)'], ['Q1', 'Quota full (Q1)'],
  ['Q2', 'Quota full (Q2)'], ['QFAIL', 'Quality fail'], ['DUP', 'Duplicate'], ['GEO', 'Geo IP fail'],
];

// Library answers are [text, action]; the action defaults to "No action".
// Generic screener questions, used for sample project screeners and to build the per-country Screener Library.
const SCREENER_TEMPLATES = [
  { id: 'age', text: 'How old are you?', type: 'Single dropdown',
    answers: [['Under 18', 'S1'], ['18–24'], ['25–34'], ['35–44'], ['45–54'], ['55–64'], ['65 or older', 'S1']] },
  { id: 'gender', text: 'What is your gender?', type: 'Single radio',
    answers: [['Female'], ['Male'], ['Non-binary'], ['Prefer not to say']] },
  { id: 'region', text: 'Which region do you live in?', type: 'Single dropdown',
    answers: [['Capital region'], ['North'], ['South'], ['East'], ['West']] },
  { id: 'employment', text: 'What is your current employment status?', type: 'Single radio',
    answers: [['Employed full time', 'Qualify'], ['Employed part time', 'Qualify'], ['Self-employed'], ['Unemployed', 'S1'], ['Student', 'S1'], ['Retired', 'S1']] },
  { id: 'education', text: 'What is the highest level of education you have completed?', type: 'Single dropdown',
    answers: [['No formal education'], ['Primary school'], ['Secondary school'], ['Vocational qualification'], ['Bachelor’s degree'], ['Master’s degree'], ['Doctorate']] },
  { id: 'income', text: 'What is your annual household income?', type: 'Single dropdown',
    answers: [['Under €20,000'], ['€20,000–39,999'], ['€40,000–59,999'], ['€60,000–99,999'], ['€100,000 or more'], ['Prefer not to say', 'S2']] },
  { id: 'parent', text: 'Are you a parent of a child under 18?', type: 'Single radio',
    answers: [['Yes', 'Qualify'], ['No', 'S1']] },
  { id: 'car', text: 'Do you own or lease a car?', type: 'Single radio',
    answers: [['Own', 'Qualify'], ['Lease', 'Qualify'], ['Neither', 'S1']] },
  { id: 'industry', text: 'Do you or anyone in your household work in any of these industries?', type: 'Multiple choice',
    answers: [['Market research', 'S1'], ['Advertising or PR', 'S1'], ['Journalism', 'S1'], ['None of these']] },
];

const POLL_LIBRARY = [
  { id: 'rating', text: 'How would you rate this survey overall?', type: 'Single radio', answers: [['Very poor'], ['Poor'], ['Okay'], ['Good'], ['Excellent']] },
  { id: 'length', text: 'How did you find the length of the survey?', type: 'Single radio', answers: [['Too short'], ['About right'], ['Too long']] },
  { id: 'device', text: 'Did the survey work well on your device?', type: 'Single radio', answers: [['Yes'], ['Partly'], ['No']] },
  { id: 'again', text: 'Would you take part in a similar survey again?', type: 'Single radio', answers: [['Yes'], ['Maybe'], ['No']] },
  { id: 'feedback', text: 'Is there anything you would like to tell us about this survey?', type: 'Open text', answers: [] },
];

const TABS = [
  { id: 'main', label: 'Main' },
  { id: 'vendors', label: 'Project vendors' },
  { id: 'exclusions', label: 'Project exclusions' },
  { id: 'progress', label: 'Progress' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'codes', label: 'Unique codes' },
  { id: 'links', label: 'Custom Link' },
  { id: 'ips', label: 'Exclude IPs' },
  { id: 'screener', label: 'Screener' },
  { id: 'poll', label: 'Post Poll' },
];
const TAB_IDS = new Set(TABS.map((t) => t.id));

// [key, label, tooltip] — every response metric a project tracks.
const STAT_COLS = [
  ['eb', 'EB', 'Entry base'], ['ec', 'EC', 'Entry client'], ['incomplete', 'Incomplete'], ['c1', 'C1', 'Completes'],
  ['s1', 'S1', 'Screenouts'], ['s2', 'S2', 'Screenouts'], ['q1', 'Q1', 'Quota fulls'], ['q2', 'Q2', 'Quota fulls'],
  ['dup1', 'DUP1', 'Duplicates'], ['dup2', 'DUP2', 'Duplicates'], ['dup3', 'DUP3', 'Duplicates'],
  ['geo1', 'GEO1'], ['qfail1', 'QFAIL1', 'Quality fails'], ['qfail2', 'QFAIL2', 'Quality fails'],
  ['ex1', 'EX1'], ['ex2', 'EX2'], ['dev1', 'DEV1'], ['noUnique', 'No unique code'],
];
const STAT_KEYS = STAT_COLS.map(([key]) => key);
const colsFor = (keys) => keys.map((k) => STAT_COLS.find(([key]) => key === k));
// Computed columns: IR% and CONV% (one decimal), DUPS and FAILS (sums). Drops are "incomplete" (campaigns: "inc").
const pctOf = (part, whole) => (whole ? (part / whole) * 100 : null);
const STAT_DERIVED = {
  ir: (s) => pctOf(s.c1 || 0, (s.c1 || 0) + (s.s1 || 0) + (s.s2 || 0)),
  conv: (s) => pctOf(s.c1 || 0, s.eb || 0),
  dups: (s) => (s.dup1 || 0) + (s.dup2 || 0) + (s.dup3 || 0),
  fails: (s) => (s.qfail1 || 0) + (s.qfail2 || 0),
};
const PCT_KEYS = new Set(['ir', 'conv']);
const statValue = (s, key) => (STAT_DERIVED[key] ? STAT_DERIVED[key](s) : s[key] || 0);
const fmtPct1 = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);
// One table cell for a stat column: counts as whole numbers, IR% and CONV% as 33.5%.
function statCell(s, key, hl = 'c1') {
  const v = statValue(s, key);
  const cls = key === hl ? 'col-hl' : '';
  if (PCT_KEYS.has(key)) return `<td class="${cls}${v ? '' : ' zero'}">${fmtPct1(v)}</td>`;
  return numCell(v, cls);
}
const statCsv = (s, key) => (PCT_KEYS.has(key) ? fmtPct1(statValue(s, key)) : statValue(s, key));

// Project vendors, Progress over time (daily) and the Progress tab share these columns.
const VENDOR_COLS = [
  ['eb', 'EB', 'Entry base'], ['ec', 'EC', 'Entry client'], ['c1', 'C1', 'Completes'],
  ['ir', 'IR%', 'Incidence rate: C1 ÷ (C1 + S1 + S2)'], ['conv', 'CONV%', 'Conversion: C1 ÷ EB'],
  ['s1', 'S1', 'Screenouts'], ['s2', 'S2', 'Screenouts in screener'], ['q1', 'Q1', 'Quota fulls'], ['q2', 'Q2', 'Quota fulls in screener'],
  ['incomplete', 'DROPS', 'Drop-outs (incomplete)'], ['dups', 'DUPS', 'Duplicates: DUP1 + DUP2 + DUP3'],
  ['fails', 'FAILS', 'Quality fails: QFAIL1 + QFAIL2'],
];
const DAILY_COLS = VENDOR_COLS;
const CAMPAIGN_COLS = [
  ['inv', 'INV', 'Invitations sent'], ['eb', 'EB', 'Entry base'], ['ec', 'EC', 'Entry client'], ['rr', 'RR', 'Response rate (EB ÷ INV)'],
  ['c1', 'C1', 'Completes'], ['ir', 'IR%', 'Incidence rate: C1 ÷ (C1 + S1 + S2)'], ['conv', 'CONV%', 'Conversion: C1 ÷ EB'],
  ['s1', 'S1'], ['s2', 'S2'], ['q1', 'Q1'], ['q2', 'Q2'], ['inc', 'DROPS', 'Drop-outs (incomplete)'],
  ['dups', 'DUPS', 'Duplicates: DUP1 + DUP2 + DUP3'], ['fails', 'FAILS', 'Quality fails: QFAIL1 + QFAIL2'],
];
// Statuses a campaign counts besides INV / EB / EC / C1 / S / Q / drops (shown one by one in Campaign info).
const CAMPAIGN_OTHER_KEYS = ['dup1', 'dup2', 'dup3', 'geo1', 'qfail1', 'qfail2', 'ex1', 'ex2', 'dev1', 'noUnique'];
const CAMPAIGN_KEYS = ['inv', 'eb', 'ec', 'c1', 's1', 's2', 'q1', 'q2', 'inc', ...CAMPAIGN_OTHER_KEYS];
const campStat = (s, key) => statValue(s, key);
// Campaign info: every status of the campaign.
const CAMPAIGN_INFO_STATS = [
  ['eb', 'EB'], ['ec', 'EC'], ['inc', 'Incomplete'], ['c1', 'C1'], ['s1', 'S1'], ['s2', 'S2'], ['q1', 'Q1'], ['q2', 'Q2'],
  ['dup1', 'DUP1'], ['dup2', 'DUP2'], ['dup3', 'DUP3'], ['geo1', 'GEO1'], ['qfail1', 'QFAIL1'], ['qfail2', 'QFAIL2'],
  ['ex1', 'EX1'], ['ex2', 'EX2'], ['dev1', 'DEV1'], ['noUnique', 'No unique code'],
];

const emptyStats = () => Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
function addStats(into, from) {
  STAT_KEYS.forEach((k) => { into[k] += from[k] || 0; });
  return into;
}
