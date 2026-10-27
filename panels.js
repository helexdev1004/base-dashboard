'use strict';

/* =========================================================
   Base · Panels
   Panel management ▸ Panels: the panel cards (#/panels), a panel's
   members (#/panels/<panel>) and one panelist (#/panels/<panel>/<id>).
   Members are generated on demand from a seed, so a panel can hold
   tens of thousands of them without building every record up front.
   Uses helpers from script.js and project.js.
   ========================================================= */

const MEMBERS_PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 10;
const MEMBER_STATUSES = ['pending', 'active', 'deleted'];
const GENDERS = ['Male', 'Female', 'Other'];
const POINT_TYPES = ['bonus', 'profile', 'survey', 'correction'];
const WELCOME_POINTS = 50;
const HISTORY_T0 = Date.UTC(2021, 0, 1);
const PANEL_NOW = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
const WORLD_INDEX = new Map(WORLD_COUNTRIES.map((c, i) => [c.code, i]));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// [country, weight, name pool, language] — the pool and language default from the country.
const PANEL_INFO = [
  { slug: 'gavenze', code: 'GAV', base: 400001, seed: 11, launched: '2022-04-21T08:30:00', size: 93865, mix: [0.306, 0.501],
    logo: { mark: 'letter', text: 'G', color: '#d9381e', lines: ['Gavenze'] },
    countries: [['pl', 16], ['ro', 14], ['cz', 11], ['bg', 10], ['hu', 10], ['es', 5], ['br', 4], ['sk', 4], ['hr', 3], ['gr', 3],
      ['pt', 3], ['it', 3], ['de', 3], ['ee', 2], ['si', 2], ['at', 2], ['fr', 2], ['be', 1], ['nl', 1], ['se', 1]] },
  { slug: 'jafenzi', code: 'JAF', base: 500001, seed: 23, launched: '2023-02-06T09:00:00', size: 38412, mix: [0.28, 0.55],
    logo: { mark: 'tile', text: 'جفنزي', color: '#b42b3c', lines: ['Jafenzi'] },
    countries: [['sa', 38], ['ae', 27], ['eg', 25], ['ma', 10]] },
  { slug: 'encuestat', code: 'ENC', base: 600001, seed: 37, launched: '2022-09-12T10:15:00', size: 61237, mix: [0.25, 0.58],
    logo: { mark: 'tile', text: 'E', color: '#2f9e44', lines: ['ENCUESTAT'] },
    countries: [['es', 28], ['mx', 24], ['ar', 14], ['co', 13], ['cl', 9], ['pe', 8], ['bo', 4]] },
  { slug: 'sondage', code: 'SDD', base: 700001, seed: 41, launched: '2023-05-15T08:00:00', size: 45118, mix: [0.27, 0.56],
    logo: { mark: 'bubble', color: '#4c1fb8', lines: ['Sondage', 'Direct'] },
    countries: [['fr', 62], ['be', 16, 'fr', 'French'], ['ca', 10, 'fr', 'French'], ['ch', 8, 'fr', 'French'], ['ma', 4, 'ar', 'French']] },
  { slug: 'mening', code: 'MVD', base: 800001, seed: 53, launched: '2023-10-02T09:30:00', size: 27044, mix: [0.24, 0.6],
    logo: { mark: 'bubble', color: 'ink', lines: ['Mening', 'Vandaag'] },
    countries: [['nl', 78], ['be', 22, 'nl', 'Dutch']] },
  { slug: 'opinion', code: 'OPT', base: 900001, seed: 67, launched: '2024-01-22T08:45:00', size: 72380, mix: [0.29, 0.57],
    logo: { mark: 'bubble', color: 'ink', lines: ['Opinion', 'Today'] },
    countries: [['gb', 42], ['us', 30], ['ca', 12], ['au', 9], ['ie', 7]] },
  { slug: 'sondaggi', code: 'SEP', base: 1000001, seed: 79, launched: '2024-06-10T10:00:00', size: 33126, mix: [0.26, 0.58],
    logo: { mark: 'amp', lines: ['Sondaggi', '& premi'] },
    countries: [['it', 91], ['ch', 9, 'it', 'Italian']] },
].map((p) => {
  const total = p.countries.reduce((s, c) => s + c[1], 0);
  let run = 0;
  return {
    ...p,
    name: PANELS.find((x) => x.code === p.code).name,
    start: new Date(p.launched).getTime(),
    cumulative: p.countries.map((c) => (run += c[1] / total)),
  };
});
const panelBySlug = (slug) => PANEL_INFO.find((p) => p.slug === slug);
const panelLabel = (panel) => `${panel.name} panel`;

/* ---------- Names, emails, addresses ---------- */
const COUNTRY_POOL = {
  ae: 'ar', ar: 'es', at: 'de', au: 'en', be: 'nl', bg: 'bg', bo: 'es', br: 'pt', ca: 'en', ch: 'de', cl: 'es', co: 'es', cz: 'cs',
  de: 'de', ee: 'et', eg: 'ar', es: 'es', fr: 'fr', gb: 'en', gr: 'el', hr: 'hr', hu: 'hu', ie: 'en', it: 'it', ma: 'ar', mx: 'es',
  nl: 'nl', pe: 'es', pl: 'pl', pt: 'pt', ro: 'ro', sa: 'ar', se: 'sv', si: 'hr', sk: 'cs', us: 'en',
};
const COUNTRY_LANGUAGE = {
  ae: 'Arabic', ar: 'Spanish', at: 'German', au: 'English', be: 'Dutch', bg: 'Bulgarian', bo: 'Spanish', br: 'Portuguese', ca: 'English',
  ch: 'German', cl: 'Spanish', co: 'Spanish', cz: 'Czech', de: 'German', ee: 'Estonian', eg: 'Arabic', es: 'Spanish', fr: 'French',
  gb: 'English', gr: 'Greek', hr: 'Croatian', hu: 'Hungarian', ie: 'English', it: 'Italian', ma: 'Arabic', mx: 'Spanish', nl: 'Dutch',
  pe: 'Spanish', pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', sa: 'Arabic', se: 'Swedish', si: 'Slovenian', sk: 'Slovak', us: 'English',
};
const LANGUAGES = [...new Set(Object.values(COUNTRY_LANGUAGE))].sort();

// [male first names, female first names, surnames]
const NAME_POOLS = {
  en: [['James', 'Oliver', 'Daniel', 'Thomas', 'Michael', 'Ryan', 'Liam', 'Matthew'], ['Emma', 'Olivia', 'Sophie', 'Hannah', 'Jessica', 'Chloe', 'Grace', 'Megan'],
    ['Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson', 'Walker', 'Murphy', 'Clarke', 'Hughes', 'Evans']],
  de: [['Lukas', 'Felix', 'Jonas', 'Maximilian', 'Tobias', 'Florian', 'Stefan', 'Markus'], ['Anna', 'Lena', 'Laura', 'Julia', 'Katharina', 'Sabine', 'Hannah', 'Lea'],
    ['Müller', 'Schmidt', 'Huber', 'Wagner', 'Fischer', 'Weber', 'Gruber', 'Bauer', 'Hofer', 'Becker']],
  fr: [['Lucas', 'Hugo', 'Louis', 'Nicolas', 'Julien', 'Thomas', 'Antoine', 'Mathieu'], ['Camille', 'Léa', 'Manon', 'Chloé', 'Julie', 'Sophie', 'Inès', 'Claire'],
    ['Martin', 'Bernard', 'Dubois', 'Laurent', 'Lefebvre', 'Moreau', 'Girard', 'Fontaine', 'Rousseau', 'Mercier']],
  nl: [['Daan', 'Sem', 'Lars', 'Bram', 'Thijs', 'Ruben', 'Jeroen', 'Pieter'], ['Emma', 'Sanne', 'Lotte', 'Fleur', 'Anouk', 'Eva', 'Femke', 'Iris'],
    ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'Bakker', 'Visser', 'Smit', 'Peeters', 'Maes', 'Mulder']],
  it: [['Marco', 'Luca', 'Giuseppe', 'Alessandro', 'Matteo', 'Francesco', 'Davide', 'Andrea'], ['Giulia', 'Chiara', 'Francesca', 'Sara', 'Martina', 'Elena', 'Valentina', 'Alessia'],
    ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco']],
  es: [['Carlos', 'Javier', 'Miguel', 'Alejandro', 'Diego', 'Pablo', 'Andrés', 'Luis'], ['María', 'Lucía', 'Sofía', 'Valentina', 'Camila', 'Laura', 'Carmen', 'Paula'],
    ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz']],
  pt: [['João', 'Pedro', 'Lucas', 'Gabriel', 'Rafael', 'Tiago', 'Rodrigo', 'Bruno'], ['Ana', 'Beatriz', 'Mariana', 'Juliana', 'Inês', 'Larissa', 'Fernanda', 'Carolina'],
    ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Carvalho', 'Ribeiro']],
  pl: [['Piotr', 'Paweł', 'Tomasz', 'Krzysztof', 'Michał', 'Grzegorz', 'Mariusz', 'Łukasz'], ['Anna', 'Katarzyna', 'Magdalena', 'Agnieszka', 'Joanna', 'Monika', 'Ewa', 'Aleksandra'],
    ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Dąbrowski', 'Mazur']],
  cs: [['Jan', 'Petr', 'Tomáš', 'Martin', 'Miroslav', 'Jakub', 'Milan', 'Lukáš'], ['Jana', 'Eva', 'Ivana', 'Pavla', 'Jitka', 'Lucie', 'Tereza', 'Kateřina'],
    ['Novák', 'Svoboda', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Pokorný', 'Marek']],
  hu: [['Gábor', 'László', 'Zoltán', 'Péter', 'Attila', 'Balázs', 'Tamás', 'Csaba'], ['Katalin', 'Éva', 'Zsófia', 'Anna', 'Krisztina', 'Eszter', 'Réka', 'Ildikó'],
    ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas']],
  ro: [['Andrei', 'Alexandru', 'Mihai', 'Ionuț', 'Dan', 'Cristian', 'Florin', 'Adrian'], ['Maria', 'Elena', 'Ioana', 'Andreea', 'Christine', 'Alexandra', 'Gabriela', 'Mihaela'],
    ['Popescu', 'Ionescu', 'Popa', 'Dumitru', 'Stan', 'Stoica', 'Gheorghe', 'Matei', 'Ciobanu', 'Rusu']],
  bg: [['Георги', 'Иван', 'Димитър', 'Николай', 'Стоян', 'Петър', 'Христо', 'Тодор'], ['Мария', 'Светла', 'Елена', 'Десислава', 'Милена', 'Йорданка', 'Гергана', 'Цветелина'],
    ['Иванов', 'Георгиев', 'Димитров', 'Петров', 'Николов', 'Стоянов', 'Христов', 'Тодоров', 'Колев', 'Ангелов']],
  hr: [['Luka', 'Ivan', 'Marko', 'Matej', 'Nik', 'Jure', 'Tomislav', 'Žiga'], ['Ana', 'Petra', 'Maja', 'Nina', 'Lucija', 'Ivana', 'Eva', 'Mateja'],
    ['Horvat', 'Kovačević', 'Babić', 'Novak', 'Krajnc', 'Marić', 'Jurić', 'Zupan', 'Kos', 'Vidović']],
  et: [['Rasmus', 'Martin', 'Andres', 'Kristjan', 'Mart', 'Siim'], ['Kadri', 'Liis', 'Maarja', 'Triin', 'Kertu', 'Anu'],
    ['Tamm', 'Saar', 'Sepp', 'Mägi', 'Kask', 'Kukk', 'Rebane', 'Ilves']],
  el: [['Giorgos', 'Dimitris', 'Nikos', 'Kostas', 'Giannis', 'Christos'], ['Maria', 'Eleni', 'Katerina', 'Sofia', 'Georgia', 'Dimitra'],
    ['Papadopoulos', 'Pappas', 'Nikolaidis', 'Georgiou', 'Vlachos', 'Oikonomou']],
  sv: [['Erik', 'Lars', 'Johan', 'Anders', 'Oskar', 'Karl'], ['Anna', 'Maria', 'Elin', 'Sara', 'Emma', 'Linnea'],
    ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Lindberg', 'Berg']],
  ar: [['Mohammed', 'Ahmed', 'Omar', 'Youssef', 'Khalid', 'Hassan', 'Karim', 'Tariq'], ['Fatima', 'Aisha', 'Mariam', 'Noura', 'Layla', 'Salma', 'Huda', 'Rania'],
    ['Al-Harbi', 'Al-Mansouri', 'Hassan', 'Ibrahim', 'El-Sayed', 'Benali', 'Al-Qahtani', 'Mostafa', 'Haddad', 'Nasser']],
};

// Surnames that change for women.
function femaleSurname(pool, last) {
  switch (pool) {
    case 'bg': return `${last}а`;
    case 'pl': return last.replace(/(sk|ck|dzk)i$/, '$1a');
    case 'cs':
      if (last.endsWith('ý')) return `${last.slice(0, -1)}á`;
      if (last.endsWith('a')) return `${last.slice(0, -1)}ová`;
      if (last.endsWith('ek')) return `${last.slice(0, -2)}ková`;
      return `${last}ová`;
    case 'el': return last.replace(/(os|is)$/, 'ou').replace(/as$/, 'a');
    default: return last;
  }
}

const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};
const emailPart = (s) => s.toLowerCase()
  .replace(/[а-я]/g, (ch) => CYRILLIC[ch] ?? '')
  .replace(/ł/g, 'l').replace(/ß/g, 'ss').replace(/đ/g, 'd')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '');

const MAIL_GENERIC = ['gmail.com', 'gmail.com', 'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
const MAIL_LOCAL = {
  at: ['gmx.at'], be: ['telenet.be'], bg: ['abv.bg'], br: ['uol.com.br'], cz: ['seznam.cz'], de: ['web.de', 'gmx.de'], es: ['hotmail.es'],
  fr: ['orange.fr', 'free.fr'], gb: ['btinternet.com'], hu: ['freemail.hu'], it: ['libero.it'], nl: ['ziggo.nl'], pl: ['wp.pl', 'o2.pl', 'onet.pl'],
  ro: ['yahoo.ro'], sk: ['azet.sk'], si: ['siol.net'], hr: ['net.hr'], se: ['telia.com'],
};

// # = digit, @ = letter.
const POSTAL_FORMATS = {
  at: '####', au: '####', be: '####', bg: '####', ch: '####', hu: '####', si: '####', cz: '### ##', sk: '### ##', se: '### ##',
  gr: '### ##', pl: '##-###', pt: '####-###', br: '#####-###', nl: '#### @@', ro: '######', ca: '@#@ #@#', gb: '@@# #@@',
  ie: '@## @#@#', ar: '@####@@@',
};
function postalCode(country, next) {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXY';
  return (POSTAL_FORMATS[country] || '#####').replace(/[#@]/g, (ch) => (ch === '#'
    ? String(Math.floor(next() * 10))
    : letters[Math.floor(next() * letters.length)]));
}

const hex = (next, n) => {
  let out = '';
  for (let i = 0; i < n; i++) out += Math.floor(next() * 16).toString(16);
  return out;
};
const randomUuid = (next = Math.random) => `${hex(next, 8)}-${hex(next, 4)}-4${hex(next, 3)}-${'89ab'[Math.floor(next() * 4)]}${hex(next, 3)}-${hex(next, 12)}`;

const pad = (n, w = 2) => String(n).padStart(w, '0');
function fmtStampSec(ts) {
  const d = new Date(ts);
  return `${isoDay(ts)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ---------- Members ---------- */
const memberSeed = (panel, i) => (Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(panel.seed, 0x85ebca6b)) >>> 0;
const GOLDEN = 0.6180339887;

// Sign-ups spread evenly from the launch date to today.
function joinedAt(panel, i) {
  const n = panel.size;
  const jitter = (i * GOLDEN) % 1;
  return Math.round(panel.start + ((i + jitter) / n) * (PANEL_NOW - panel.start));
}

function rollStatus(panel, roll) {
  const [pending, active] = panel.mix;
  if (roll < pending) return 0;
  return roll < pending + active ? 1 : 2;
}

function rollCountry(panel, roll) {
  const k = panel.cumulative.findIndex((c) => roll < c);
  return panel.countries[k === -1 ? panel.countries.length - 1 : k];
}

// The value mulberry32 returns for a given internal state (inlined for the hot loop below).
function mulberryValue(s) {
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Status + country of every member as compact arrays; full records are built when needed.
// Matches the first two draws of generateMember().
const panelStore = new Map();
function panelData(panel) {
  let d = panelStore.get(panel.slug);
  if (d) return d;
  const n = panel.size;
  d = { n, status: new Uint8Array(n), country: new Uint8Array(n), extra: [], edits: new Map(), keys: null, history: new Map() };
  const countryIds = panel.countries.map((c) => WORLD_INDEX.get(c[0]));
  const last = countryIds.length - 1;
  for (let i = 0; i < n; i++) {
    const s1 = (memberSeed(panel, i) + 0x6d2b79f5) | 0;
    const s2 = (s1 + 0x6d2b79f5) | 0;
    d.status[i] = rollStatus(panel, mulberryValue(s1));
    const roll = mulberryValue(s2);
    let k = 0;
    while (k < last && roll >= panel.cumulative[k]) k += 1;
    d.country[i] = countryIds[k];
  }
  panelStore.set(panel.slug, d);
  return d;
}

const memberTotal = (d) => d.n + d.extra.length;
const statusAt = (d, i) => (i < d.n ? MEMBER_STATUSES[d.status[i]] : d.extra[i - d.n].status);
const countryAt = (d, i) => (i < d.n ? WORLD_COUNTRIES[d.country[i]].code : d.extra[i - d.n].country);

function statusCounts(panel) {
  const d = panelData(panel);
  const counts = { pending: 0, active: 0, deleted: 0 };
  for (let i = 0; i < d.n; i++) counts[MEMBER_STATUSES[d.status[i]]] += 1;
  d.extra.forEach((m) => { counts[m.status] += 1; });
  return counts;
}

// The member as generated from its seed (before any edits).
function generateMember(panel, i, basicOnly = false) {
  const next = mulberry32(memberSeed(panel, i));
  const status = MEMBER_STATUSES[rollStatus(panel, next())];
  const [country, , poolOverride, langOverride] = rollCountry(panel, next());
  const pool = poolOverride || COUNTRY_POOL[country] || 'en';
  const [males, females, lasts] = NAME_POOLS[pool];
  const female = next() < 0.52;
  const firsts = female ? females : males;
  const first = firsts[Math.floor(next() * firsts.length)];
  const lastBase = lasts[Math.floor(next() * lasts.length)];
  const last = female ? femaleSurname(pool, lastBase) : lastBase;
  const birthYear = 1950 + Math.floor(next() * 57);
  const style = next();
  const f = emailPart(first);
  const l = emailPart(last);
  const handle = style < 0.3 ? `${f}.${l}`
    : style < 0.5 ? `${f}${l}${pad(Math.floor(next() * 100))}`
      : style < 0.7 ? `${f[0]}${l}${pad(birthYear % 100)}`
        : style < 0.85 ? `${f}.${l}${Math.floor(next() * 900) + 100}`
          : `${f}_${pad(birthYear % 100)}${Math.floor(next() * 90) + 10}`;
  const local = MAIL_LOCAL[country];
  const domains = local && next() < 0.4 ? local : MAIL_GENERIC;
  const email = `${handle}@${domains[Math.floor(next() * domains.length)]}`;
  const member = { panel: panel.slug, index: i, id: panel.base + i, status, country, first, last, email };
  if (basicOnly) return member;

  const regions = regionsFor(country);
  const createdAt = joinedAt(panel, i);
  const since = PANEL_NOW - createdAt;
  let lastLoginAt = null;
  if (status === 'active') {
    lastLoginAt = Math.max(createdAt, next() < 0.55 ? PANEL_NOW - next() * 30 * DAY : createdAt + next() * since);
  } else if (status === 'deleted') {
    lastLoginAt = createdAt + next() * Math.min(since, 400 * DAY);
  }
  return Object.assign(member, {
    gender: female ? 'Female' : 'Male',
    birthdate: `${birthYear}-${pad(1 + Math.floor(next() * 12))}-${pad(1 + Math.floor(next() * 28))}`,
    region: regions[Math.floor(next() * regions.length)],
    postal: postalCode(country, next),
    language: langOverride || COUNTRY_LANGUAGE[country] || 'English',
    puuid: randomUuid(next),
    reliable: next() < 0.9,
    createdAt,
    lastLoginAt: lastLoginAt && Math.min(Date.now() - MINUTE, Math.round(lastLoginAt + next() * 12 * 3600 * 1000)),
  });
}

function memberAt(panel, i) {
  const d = panelData(panel);
  if (i >= d.n) return d.extra[i - d.n];
  return d.edits.get(i) || generateMember(panel, i);
}

function findMember(panel, id) {
  const i = Number(id) - panel.base;
  const d = panelData(panel);
  return Number.isInteger(i) && i >= 0 && i < memberTotal(d) ? memberAt(panel, i) : null;
}

const memberName = (m) => [m.first, m.last].filter(Boolean).join(' ') || '—';

// Lower-case "id name email" per member, built the first time a panel is searched.
function searchKey(panel, d, i) {
  if (!d.keys) d.keys = new Array(d.n);
  if (i >= d.n) {
    const m = d.extra[i - d.n];
    return `${m.id} ${m.first} ${m.last} ${m.email}`.toLowerCase();
  }
  if (d.keys[i] === undefined) {
    const m = d.edits.get(i) || generateMember(panel, i, true);
    d.keys[i] = `${m.id} ${m.first} ${m.last} ${m.email}`.toLowerCase();
  }
  return d.keys[i];
}

function emailTaken(panel, email, exceptIndex) {
  const d = panelData(panel);
  const needle = email.toLowerCase();
  for (let i = 0; i < memberTotal(d); i++) {
    if (i === exceptIndex) continue;
    const key = searchKey(panel, d, i);
    if (key.endsWith(` ${needle}`)) return true;
  }
  return false;
}

/* ---------- Participation and points ---------- */
let projectPools = { count: -1, byCountry: new Map() };
function projectsFor(country) {
  if (projectPools.count !== projects.length) projectPools = { count: projects.length, byCountry: new Map() };
  if (!projectPools.byCountry.has(country)) {
    const own = projects.filter((p) => p.country.code === country);
    projectPools.byCountry.set(country, own.length ? own : projects);
  }
  return projectPools.byCountry.get(country);
}

const logId = (at) => 100000 + Math.floor((at - HISTORY_T0) / (8 * MINUTE));
const inviteId = (at) => 1000 + Math.floor((at - HISTORY_T0) / (2 * 3600 * 1000));

function assignIds(list, idOf) {
  let last = 0;
  list.forEach((e) => {
    let id = idOf(e.at);
    if (id <= last) id = last + 1;
    e.id = last = id;
  });
}

// Project invitations and the point log of one member. Survey points match the
// completes in the project history; reward exchanges come from Redeem (rewards.js).
function buildHistory(panel, i) {
  const m = memberAt(panel, i);
  const r = seeded(memberSeed(panel, i) ^ 0x5bd1e995);
  const invites = [];
  const log = [];
  const latest = Date.now() - MINUTE;
  const until = Math.min(latest, m.status === 'deleted' && m.lastLoginAt ? m.lastLoginAt : PANEL_NOW);
  const span = Math.max(0, until - m.createdAt);
  const pool = projectsFor(m.country);

  if (m.status !== 'pending' && !m.imported) {
    log.push({ type: 'bonus', ref: 1, points: WELCOME_POINTS, at: m.createdAt + r.int(2, 30) * MINUTE });
    const profiles = r.int(0, 5);
    for (let k = 1; k <= profiles; k++) log.push({ type: 'profile', ref: k, points: 5, at: m.createdAt + r.between(0.002, 0.3) * span });
    const count = m.status === 'active' ? r.int(0, 14) : r.int(0, 4);
    for (let k = 0; k < count; k++) {
      const p = r.pick(pool);
      const roll = r.next();
      const status = roll < 0.3 ? 'complete' : roll < 0.55 ? 'screenout' : roll < 0.6 ? 'quota full' : roll < 0.7 ? 'started' : 'invited';
      const points = status === 'complete' ? Math.max(50, p.loiBid * 10) : status === 'screenout' ? 5 : 0;
      const at = m.createdAt + r.between(0.01, 1) * span;
      invites.push({ project: p, status, points, at });
      if (points) log.push({ type: 'survey', ref: p.id, points, at: at + r.int(5, 40) * MINUTE });
    }
  }
  redemptionsOf(panel.slug, m.id).forEach((red) => {
    log.push({ type: 'exchange', ref: red.id, points: -red.points, at: red.requestedAt });
    if (red.status === 'rejected') log.push({ type: 'refund', ref: red.id, points: red.points, at: red.requestedAt + r.between(0.3, 3) * DAY });
  });
  [...invites, ...log].forEach((e) => { e.at = Math.min(Math.round(e.at), latest); }); // nothing in the future
  log.sort((a, b) => a.at - b.at);

  // The balance never goes below zero: a member who exchanged points earned them first.
  let balance = 0;
  for (let k = 0; k < log.length; k++) {
    const e = log[k];
    if (balance + e.points < 0) {
      const p = r.pick(pool);
      const points = Math.ceil(-(balance + e.points) / 50) * 50 + r.int(0, 2) * 50;
      const prevAt = k ? log[k - 1].at : m.createdAt;
      const at = prevAt + r.between(0.3, 0.8) * (e.at - prevAt);
      invites.push({ project: p, status: 'complete', points, at: at - r.int(5, 40) * MINUTE });
      log.splice(k, 0, { type: 'survey', ref: p.id, points, at });
      balance += points;
      k += 1;
    }
    balance += e.points;
  }
  invites.sort((a, b) => a.at - b.at);
  assignIds(invites, inviteId);
  assignIds(log, logId);
  return { invites, log };
}

function memberHistory(panel, i) {
  const d = panelData(panel);
  if (!d.history.has(i)) d.history.set(i, buildHistory(panel, i));
  return d.history.get(i);
}

const pointsBalance = (h) => h.log.reduce((s, e) => s + e.points, 0);
// Without caching, for exports that touch every member.
const memberPoints = (panel, i, cache = true) => {
  const d = panelData(panel);
  return pointsBalance(cache || d.history.has(i) ? memberHistory(panel, i) : buildHistory(panel, i));
};

// Adds a point log entry now (Add point, Redeem status changes).
function addPointEntry(panel, i, { type, ref, points }) {
  const h = memberHistory(panel, i);
  const at = Date.now();
  const lastId = h.log.reduce((max, e) => Math.max(max, e.id), 0);
  const entry = { type, ref, points, at, id: Math.max(lastId + 1, logId(at)) };
  h.log.push(entry);
  return entry;
}

/* ---------- Panels (cards) ---------- */
function panelLogoHtml(panel) {
  const { mark, text, color, lines } = panel.logo;
  const words = lines.map((w) => escapeHtml(w).replace('&amp;', '<em>&amp;</em>')).join('<br>');
  const word = `<span class="pl-word${lines.length > 1 ? ' two' : ''}">${words}</span>`;
  const ink = color === 'ink' ? ' is-ink' : '';
  switch (mark) {
    case 'letter':
      return `<span class="pl-letter" style="--mark:${color}" aria-hidden="true">${text}</span><span class="pl-bar" aria-hidden="true"></span>${word}`;
    case 'tile':
      return `<span class="pl-tile${text.length > 2 ? ' is-script' : ''}" style="--mark:${color}" aria-hidden="true"${text.length > 2 ? ' lang="ar" dir="rtl"' : ''}>${text}</span>${word}`;
    case 'bubble':
      return `<span class="pl-bubble${ink}" style="${ink ? '' : `--mark:${color}`}" aria-hidden="true"><i class="bi bi-check-lg"></i></span>${word}`;
    default:
      return `<span class="pl-word two pl-amp">${words}</span>`;
  }
}

function renderPanels() {
  document.title = 'Panels · Base';
  $('#panelsView').innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Panels</h1>
      <p class="page-sub">Members of each panel by status. Open a panel to see and manage its members.</p>
    </header>
    <div class="pl-grid">
      ${PANEL_INFO.map((panel) => {
        const c = statusCounts(panel);
        return `
          <a class="pl-card" href="#/panels/${panel.slug}" aria-label="${escapeHtml(panelLabel(panel))}: ${fmtInt(c.active)} active, ${fmtInt(c.pending)} pending, ${fmtInt(c.deleted)} deleted">
            <span class="pl-logo">${panelLogoHtml(panel)}</span>
            <span class="pl-stats">
              <span class="pl-stat is-active"><span>Active:</span><strong>${fmtInt(c.active)}</strong></span>
              <span class="pl-stat"><span>Pending:</span><strong>${fmtInt(c.pending)}</strong></span>
              <span class="pl-stat"><span>Deleted:</span><strong>${fmtInt(c.deleted)}</strong></span>
            </span>
          </a>`;
      }).join('')}
    </div>`;
}

/* ---------- Panel members ---------- */
const pl = { slug: null, search: '', status: '', country: '', filtersOpen: false, page: 1, mounted: false, flashId: null, timer: 0 };

function panelCountryOptions(panel) {
  const d = panelData(panel);
  const codes = new Set(panel.countries.map((c) => c[0]));
  d.edits.forEach((m) => codes.add(m.country));
  d.extra.forEach((m) => codes.add(m.country));
  return [...codes].map((code) => [code, countryName(code)]).sort((a, b) => a[1].localeCompare(b[1]));
}

function visibleMembers(panel) {
  const d = panelData(panel);
  const q = pl.search.trim().toLowerCase();
  const out = [];
  for (let i = 0, n = memberTotal(d); i < n; i++) {
    if (pl.status && statusAt(d, i) !== pl.status) continue;
    if (pl.country && countryAt(d, i) !== pl.country) continue;
    if (q && !searchKey(panel, d, i).includes(q)) continue;
    out.push(i);
  }
  return out;
}

function renderPanelPage(slug) {
  const panel = panelBySlug(slug);
  if (!panel) {
    history.replaceState(null, '', '#/panels');
    showToast("That panel couldn't be found.", 'info');
    showPage('panels');
    return;
  }
  if (pl.slug !== slug) Object.assign(pl, { slug, search: '', status: '', country: '', filtersOpen: false, page: 1 });
  document.title = `${panelLabel(panel)} · Base`;
  const root = $('#panelView');
  root.innerHTML = `
    <header class="page-head page-head-back pl-head">
      <a class="pv-back-btn" href="#/panels" title="Back to panels" aria-label="Back to panels"><i class="bi bi-arrow-left"></i></a>
      <div class="pl-head-title">
        <h1 class="page-title">${escapeHtml(panelLabel(panel))}</h1>
        <p class="page-sub">Search for an account, or open one to see its profile and history.</p>
      </div>
      <div class="pl-head-actions">
        <button type="button" class="btn btn-ghost btn-sm-h" data-pl-action="stats"><i class="bi bi-bar-chart-fill"></i> Panel statistics</button>
        <button type="button" class="btn btn-ghost btn-sm-h" data-pl-action="import"><i class="bi bi-upload"></i> Import data</button>
        <button type="button" class="btn btn-export btn-sm-h" data-pl-action="export"><i class="bi bi-download"></i> Export data</button>
        <div class="dropdown">
          <button type="button" class="icon-btn-sm pl-mail" data-bs-toggle="dropdown" aria-expanded="false" title="Email members" aria-label="Email members"><i class="bi bi-envelope"></i></button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><button type="button" class="dropdown-item" data-pl-action="mail-active"><i class="bi bi-envelope"></i> Email all active members…</button></li>
            <li><button type="button" class="dropdown-item" data-pl-action="mail-pending"><i class="bi bi-envelope-exclamation"></i> Remind pending members to confirm…</button></li>
          </ul>
        </div>
      </div>
    </header>
    <section class="pl-strip" id="plStrip" aria-label="Members by status"></section>
    <section class="pv-card flush">
      <div class="list-filters">
        ${searchGroupHtml('members', 'Search by ID, name or email…', pl.search)}
        <button type="button" class="btn btn-dark-chip btn-sm-h pl-filter-btn" data-pl-action="filters" aria-expanded="${pl.filtersOpen}" aria-controls="plFilterRow">
          <i class="bi bi-funnel"></i> Filter <span class="pl-filter-count" id="plFilterCount" hidden></span>
        </button>
      </div>
      <div class="list-filters pl-filter-row" id="plFilterRow" ${pl.filtersOpen ? '' : 'hidden'}>
        <select class="form-select pv-filter" data-pl-filter="status" aria-label="Status">
          <option value="">All statuses</option>
          ${optionsHtml(MEMBER_STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)]), pl.status)}
        </select>
        <select class="form-select pv-filter" data-pl-filter="country" aria-label="Country">
          <option value="">All countries</option>
          ${optionsHtml(panelCountryOptions(panel), pl.country)}
        </select>
        <button type="button" class="btn btn-ghost btn-sm-h" data-pl-action="clear-filters">Clear filters</button>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table pl-table">
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Country</th><th>Status</th><th class="t-end">Points</th><th>Created</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody id="plRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="plFooter"></div>
    </section>`;
  if (!pl.mounted) {
    root.addEventListener('click', onPanelClick);
    root.addEventListener('input', onPanelInput);
    root.addEventListener('change', onPanelChange);
    pl.mounted = true;
  }
  renderPanelStrip(panel);
  renderMemberRows(panel);
}

function renderPanelStrip(panel) {
  const c = statusCounts(panel);
  $('#plStrip').innerHTML = MEMBER_STATUSES.map((s) => `
    <button type="button" class="pl-strip-item${pl.status === s ? ' active' : ''}" data-pl-status="${s}" aria-pressed="${pl.status === s}"
            title="${pl.status === s ? 'Show every status' : `Show only ${s} members`}">
      <span class="pl-strip-label">${s[0].toUpperCase() + s.slice(1)}</span>
      <span class="pl-strip-value">${fmtInt(c[s])}</span>
    </button>`).join('');
}

function memberStatusHtml(status) {
  return `<span class="m-status is-${status}">${status}</span>`;
}

function renderMemberRows(panel) {
  const list = visibleMembers(panel);
  const { rows, page, pages, start } = paginate(list, pl.page, MEMBERS_PAGE_SIZE);
  pl.page = page;
  const filters = (pl.status ? 1 : 0) + (pl.country ? 1 : 0);
  const count = $('#plFilterCount');
  count.textContent = filters;
  count.hidden = !filters;
  $('#plRows').innerHTML = rows.length
    ? rows.map((i) => {
        const m = memberAt(panel, i);
        const href = `#/panels/${panel.slug}/${m.id}`;
        return `
          <tr class="row-link${m.id === pl.flashId ? ' row-flash' : ''}" data-href="${href}">
            <td class="col-id">${m.id}</td>
            <td><a class="cell-link" href="${href}">${escapeHtml(memberName(m))}</a></td>
            <td class="pl-email">${escapeHtml(m.email)}</td>
            <td>${m.country.toUpperCase()}</td>
            <td>${memberStatusHtml(m.status)}</td>
            <td class="t-end num">${fmtInt(memberPoints(panel, i))}</td>
            <td class="t-muted">${fmtDate(m.createdAt)}</td>
            <td class="t-end">${m.status === 'active' ? `
              <div class="dropdown">
                <button type="button" class="icon-btn-sm pl-mail" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false"
                        title="Email ${escapeHtml(memberName(m))}" aria-label="Email ${escapeHtml(memberName(m))}"><i class="bi bi-envelope"></i><i class="bi bi-caret-down-fill pl-mail-caret"></i></button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><button type="button" class="dropdown-item" data-pl-action="mail-reset" data-index="${i}"><i class="bi bi-key"></i> Send password reset</button></li>
                  <li><button type="button" class="dropdown-item" data-pl-action="mail-one" data-index="${i}"><i class="bi bi-envelope"></i> Send a message…</button></li>
                </ul>
              </div>` : ''}</td>
          </tr>`;
      }).join('')
    : emptyRow(8, 'No members found', pl.search || filters ? 'Try a different search or filter.' : 'Import members to get started.');
  pl.flashId = null;
  $('#plFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${fmtInt(start + 1)}–${fmtInt(start + rows.length)}</strong> of <strong>${fmtInt(list.length)}</strong> members` : 'No members to show'}</span>
    <nav aria-label="Member pages">${pagerHtml(page, pages, 'pl-page')}</nav>`;
}

function onPanelClick(e) {
  const t = e.target;
  const panel = panelBySlug(pl.slug);
  const pageBtn = t.closest('[data-pl-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      pl.page = Number(pageBtn.dataset.plPage);
      renderMemberRows(panel);
    }
    return;
  }
  const statusBtn = t.closest('[data-pl-status]');
  if (statusBtn) {
    pl.status = pl.status === statusBtn.dataset.plStatus ? '' : statusBtn.dataset.plStatus;
    pl.page = 1;
    $('[data-pl-filter="status"]').value = pl.status;
    renderPanelStrip(panel);
    renderMemberRows(panel);
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="members"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    pl.search = '';
    pl.page = 1;
    $('[data-search="members"]').value = '';
    renderMemberRows(panel);
    return;
  }
  const el = t.closest('[data-pl-action]');
  if (el) {
    const m = el.dataset.index !== undefined ? memberAt(panel, Number(el.dataset.index)) : null;
    switch (el.dataset.plAction) {
      case 'filters': {
        pl.filtersOpen = !pl.filtersOpen;
        el.setAttribute('aria-expanded', String(pl.filtersOpen));
        $('#plFilterRow').hidden = !pl.filtersOpen;
        if (pl.filtersOpen) $('[data-pl-filter="status"]').focus();
        break;
      }
      case 'clear-filters':
        Object.assign(pl, { status: '', country: '', page: 1 });
        $$('[data-pl-filter]').forEach((s) => { s.value = ''; });
        renderPanelStrip(panel);
        renderMemberRows(panel);
        break;
      case 'stats': openPanelStats(panel); break;
      case 'import': openImportMembers(panel); break;
      case 'export': exportMembers(panel); break;
      case 'mail-active': openCompose(panel, { status: 'active' }); break;
      case 'mail-pending': openCompose(panel, { status: 'pending' }); break;
      case 'mail-one': openCompose(panel, { member: m }); break;
      case 'mail-reset': showToast(`Password reset email sent to ${m.email}.`); break;
      default:
    }
    return;
  }
  const row = t.closest('tr[data-href]');
  if (row && !t.closest('a, button, .dropdown-menu')) location.hash = row.dataset.href;
}

function onPanelInput(e) {
  if (e.target.dataset.search !== 'members') return;
  pl.search = e.target.value;
  pl.page = 1;
  clearTimeout(pl.timer);
  pl.timer = setTimeout(() => renderMemberRows(panelBySlug(pl.slug)), 120);
}

function onPanelChange(e) {
  const kind = e.target.dataset.plFilter;
  if (!kind) return;
  pl[kind] = e.target.value;
  pl.page = 1;
  const panel = panelBySlug(pl.slug);
  if (kind === 'status') renderPanelStrip(panel);
  renderMemberRows(panel);
}

function openPanelStats(panel) {
  const d = panelData(panel);
  const byCountry = new Map();
  const recent = PANEL_NOW - 30 * DAY;
  for (let i = 0, n = memberTotal(d); i < n; i++) {
    const code = countryAt(d, i);
    const row = byCountry.get(code) || { pending: 0, active: 0, deleted: 0, joined: 0 };
    row[statusAt(d, i)] += 1;
    if ((i < d.n ? joinedAt(panel, i) : d.extra[i - d.n].createdAt) >= recent) row.joined += 1;
    byCountry.set(code, row);
  }
  const rows = [...byCountry].map(([code, r]) => ({ code, ...r, total: r.pending + r.active + r.deleted })).sort((a, b) => b.total - a.total);
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const cells = (r) => `<td>${fmtInt(r.pending)}</td><td>${fmtInt(r.active)}</td><td>${fmtInt(r.deleted)}</td><td>${fmtInt(r.total)}</td><td>${fmtInt(r.joined)}</td>`;
  openFormModal({
    title: 'Panel statistics',
    subtitle: `${panelLabel(panel)} · launched ${fmtDate(panel.start)}`,
    wide: true,
    body: `
      <div class="pv-table-frame table-responsive pl-stats-table">
        <table class="pv-table">
          <thead><tr><th>Country</th><th>Pending</th><th>Active</th><th>Deleted</th><th>Total</th><th title="Signed up in the last 30 days">New (30 days)</th></tr></thead>
          <tbody>${rows.map((r) => `<tr><td>${escapeHtml(countryName(r.code))}</td>${cells(r)}</tr>`).join('')}</tbody>
          <tfoot><tr><td>Total</td>${cells({ pending: sum('pending'), active: sum('active'), deleted: sum('deleted'), total: sum('total'), joined: sum('joined') })}</tr></tfoot>
        </table>
      </div>`,
  });
}

function exportMembers(panel) {
  const list = visibleMembers(panel);
  const big = list.length > 5000;
  if (big) showToast(`Preparing ${fmtInt(list.length)} members…`, 'info');
  setTimeout(() => {
    downloadCsv(`${panel.slug}-panel-members-${today()}.csv`, [
      ['ID', 'First name', 'Last name', 'Email', 'Country', 'Status', 'Points', 'Created'],
      ...list.map((i) => {
        const m = memberAt(panel, i);
        return [m.id, m.first, m.last, m.email, m.country.toUpperCase(), m.status, memberPoints(panel, i, false), fmtDate(m.createdAt)];
      }),
    ]);
    showToast(`Exported ${plural(list.length, 'member')}.`);
  }, big ? 60 : 0);
}

// Emails are composed here and handed to the mailer; this preview only confirms them.
function openCompose(panel, { status, member }) {
  const count = member ? 1 : statusCounts(panel)[status];
  const to = member ? `${memberName(member)} <${member.email}>` : `All ${status} members of ${panelLabel(panel)} (${fmtInt(count)})`;
  const subject = status === 'pending' ? `Please confirm your ${panel.name} account` : '';
  openFormModal({
    title: member ? 'Send a message' : status === 'pending' ? 'Remind pending members' : 'Email active members',
    subtitle: to,
    body: `
      <label class="form-label" for="mailSubject">Subject</label>
      <input class="form-control" id="mailSubject" name="subject" required maxlength="120" value="${escapeHtml(subject)}">
      <div class="invalid-feedback">Enter a subject.</div>
      <label class="form-label mt-3" for="mailBody">Message</label>
      <textarea class="form-control" id="mailBody" name="body" rows="6" required maxlength="4000">${status === 'pending' ? 'Hi,\n\nYou signed up but haven\'t confirmed your email address yet. Click the link in this email to activate your account and start earning points.\n\nThank you!' : ''}</textarea>
      <div class="invalid-feedback">Write a message.</div>`,
    submitLabel: '<i class="bi bi-send"></i> Send',
    onSubmit: () => {
      showToast(member ? `Message sent to ${member.email}.` : `Message queued for ${plural(count, `${status} member`)}.`);
      return true;
    },
  });
}

/* ---------- Import ---------- */
function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delim = [';', '\t', ','].reduce((best, ch) => (firstLine.split(ch).length > firstLine.split(best).length ? ch : best), ',');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

async function readTableFile(file) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That file is larger than 5 MB.');
  if (/\.xlsx?$/i.test(file.name)) {
    const XLSX = await loadXlsx();
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, blankrows: false })
      .map((r) => r.map((c) => String(c ?? '').trim()));
  }
  return parseCsv((await file.text()).replace(/^﻿/, ''));
}

const IMPORT_COLUMNS = {
  email: /^e-?mail(\s*address)?$/i,
  first: /^first[\s_-]*name$|^firstname$|^first$/i,
  last: /^last[\s_-]*name$|^lastname$|^surname$|^last$/i,
  country: /^country([\s_-]*code)?$/i,
};

function openImportMembers(panel) {
  openFormModal({
    title: 'Import data',
    subtitle: `Add members to ${panelLabel(panel)} from a CSV or Excel file.`,
    body: `
      <label class="form-label" for="imFile">File</label>
      <input class="form-control" type="file" id="imFile" name="file" required accept=".csv,.txt,.xlsx,.xls">
      <div class="invalid-feedback">Choose a file.</div>
      <div class="field-help">Columns: email (required), first name, last name and country (a 2-letter code such as PL). A header row is optional.</div>
      <span class="form-label d-block mt-3" id="imStatusLabel">New members are</span>
      <div class="segmented seg-field" role="group" aria-labelledby="imStatusLabel" data-im-status>
        <button type="button" class="active" data-value="pending" aria-pressed="true">Pending</button>
        <button type="button" data-value="active" aria-pressed="false">Active</button>
      </div>
      <div class="field-help">Pending members get an email asking them to confirm their account.</div>`,
    submitLabel: '<i class="bi bi-upload"></i> Import',
    onSubmit: (form) => {
      const status = $('[data-im-status] .active', form).dataset.value;
      withBusyButton(form, async () => {
        const rows = await readTableFile(form.elements.file.files[0]);
        const result = importMembers(panel, rows, status);
        bootstrap.Modal.getInstance('#pvModal').hide();
        const notes = [result.dupes && `${plural(result.dupes, 'email')} already in the panel`, result.invalid && `${fmtInt(result.invalid)} without a valid email`].filter(Boolean).join(', ');
        showToast(result.added ? `Imported ${plural(result.added, 'member')}${notes ? ` (${notes} skipped)` : ''}.` : `Nothing imported${notes ? `: ${notes}` : ''}.`, result.added ? 'success' : 'info');
        if (currentView === 'panel' && pl.slug === panel.slug) {
          if (result.added) Object.assign(pl, { search: '', status: '', country: '', page: Infinity, flashId: result.lastId });
          renderPanelPage(panel.slug);
        }
      });
      return false;
    },
  });
  $('#pvModalBody').onclick = (e) => {
    const btn = e.target.closest('[data-im-status] button');
    if (!btn) return;
    $$('[data-im-status] button').forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
  };
}

function importMembers(panel, rows, status) {
  const d = panelData(panel);
  let cols = { email: 0, first: 1, last: 2, country: 3 };
  if (rows.length && !rows[0].some((c) => EMAIL_RE.test(c))) {
    const header = rows.shift();
    const found = Object.fromEntries(Object.entries(IMPORT_COLUMNS).map(([key, re]) => [key, header.findIndex((h) => re.test(h))]));
    if (found.email !== -1) cols = found;
  }
  const known = new Set();
  for (let i = 0; i < memberTotal(d); i++) known.add(searchKey(panel, d, i).split(' ').pop());
  const result = { added: 0, dupes: 0, invalid: 0, lastId: null };
  rows.forEach((r) => {
    const email = (r[cols.email] || '').toLowerCase();
    if (!EMAIL_RE.test(email)) { result.invalid += 1; return; }
    if (known.has(email)) { result.dupes += 1; return; }
    known.add(email);
    const code = (r[cols.country] || '').toLowerCase();
    const country = WORLD_INDEX.has(code) ? code : panel.countries[0][0];
    const at = Date.now();
    const m = {
      panel: panel.slug, index: memberTotal(d), id: panel.base + memberTotal(d), status, country, imported: true,
      first: cols.first >= 0 ? r[cols.first] || '' : '', last: cols.last >= 0 ? r[cols.last] || '' : '', email,
      gender: '', birthdate: '', region: '', postal: '', language: COUNTRY_LANGUAGE[country] || 'English',
      puuid: randomUuid(), reliable: true, createdAt: at, lastLoginAt: null,
    };
    d.extra.push(m);
    result.added += 1;
    result.lastId = m.id;
  });
  return result;
}

/* ---------- Panelist ---------- */
const panelistForm = { routeId: null, dirty: false, hash: '', label: 'on this panelist' };
formGuards.panelist = panelistForm;
const pp = { key: '', panel: null, index: -1, tab: 'basic', hist: 'projects', projSearch: '', projSort: 'asc', projPage: 1, pointSort: 'desc', pointPage: 1 };

function renderPanelist(slug, id) {
  const panel = panelBySlug(slug);
  const m = panel && findMember(panel, id);
  if (!m) {
    const back = panel ? `#/panels/${panel.slug}` : '#/panels';
    history.replaceState(null, '', back);
    showToast("That panelist couldn't be found.", 'info');
    if (panel) showPage('panel', { panel: panel.slug });
    else showPage('panels');
    return;
  }
  const key = `${slug}/${id}`;
  if (pp.key !== key) Object.assign(pp, { key, tab: 'basic', hist: 'projects', projSearch: '', projSort: 'asc', projPage: 1, pointSort: 'desc', pointPage: 1 });
  Object.assign(pp, { panel, index: m.index });
  Object.assign(panelistForm, { routeId: key, dirty: false, hash: `#/panels/${slug}/${id}` });
  document.title = `${memberName(m)} · ${panelLabel(panel)} · Base`;

  const root = $('#panelistView');
  root.innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/panels/${panel.slug}" title="Back to ${escapeHtml(panelLabel(panel))}" aria-label="Back to ${escapeHtml(panelLabel(panel))}"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">Panelist</h1>
        <p class="page-sub" id="pfSub"></p>
      </div>
    </header>

    <section class="pv-card pf-card">
      <div class="pv-tabs pf-tabs" role="tablist" aria-label="Panelist details">
        ${[['basic', 'Basic'], ['profiling', 'Profiling']].map(([tab, label]) => `
          <button type="button" class="pv-tab${pp.tab === tab ? ' active' : ''}" role="tab" id="pfTab-${tab}" data-pf-tab="${tab}"
                  aria-controls="pfPanel-${tab}" aria-selected="${pp.tab === tab}" tabindex="${pp.tab === tab ? 0 : -1}">${label}</button>`).join('')}
        <span class="dirty-flag ms-auto" id="pfDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
      </div>
      <div class="pf-tabpanel" role="tabpanel" id="pfPanel-basic" aria-labelledby="pfTab-basic" ${pp.tab === 'basic' ? '' : 'hidden'}></div>
      <div class="pf-tabpanel" role="tabpanel" id="pfPanel-profiling" aria-labelledby="pfTab-profiling" ${pp.tab === 'profiling' ? '' : 'hidden'}>
        <div class="pv-empty-block">
          <i class="bi bi-person-lines-fill"></i>
          <div class="empty-title">No profiling data yet</div>
          <div class="empty-text">Answers from profiling surveys will show up here.</div>
        </div>
      </div>
    </section>

    <section class="pv-card flush">
      <div class="pv-tabs pf-hist-tabs" role="tablist" aria-label="History">
        ${[['projects', 'Project history'], ['points', 'Point history']].map(([tab, label]) => `
          <button type="button" class="pv-tab${pp.hist === tab ? ' active' : ''}" role="tab" id="phTab-${tab}" data-ph-tab="${tab}"
                  aria-controls="phPanel" aria-selected="${pp.hist === tab}" tabindex="${pp.hist === tab ? 0 : -1}">${label}</button>`).join('')}
      </div>
      <div role="tabpanel" id="phPanel" aria-labelledby="phTab-${pp.hist}"></div>
    </section>`;

  renderPanelistForm();
  renderHistoryPanel();
  root.onclick = onPanelistClick;
  root.oninput = onPanelistInput;
  root.onchange = onPanelistChange;
  root.onsubmit = savePanelist;
  root.onkeydown = onPanelistKeys;
}

function renderPanelistSub(m) {
  $('#pfSub').innerHTML = `${escapeHtml(memberName(m))} · #${m.id} · ${escapeHtml(panelLabel(pp.panel))} · ${memberStatusHtml(m.status)}`;
}

function renderPanelistForm() {
  const panel = pp.panel;
  const m = memberAt(panel, pp.index);
  const points = memberPoints(panel, pp.index);
  renderPanelistSub(m);
  const row = (label, field, id) => `
    <div class="pf-row">
      ${id ? `<label class="form-label" for="${id}">${label}</label>` : `<span class="form-label">${label}</span>`}
      <div class="pf-field">${field}</div>
    </div>`;
  const select = (id, name, opts, value, blank) => `
    <select class="form-select" id="${id}" name="${name}">${blank ? `<option value="">${blank}</option>` : ''}${optionsHtml(opts, value)}</select>`;
  const regionOpts = (country, value) => {
    const list = regionsFor(country);
    return (value && !list.includes(value) ? [value, ...list] : list).map((r) => [r, r]);
  };

  $('#pfPanel-basic').innerHTML = `
    <form id="panelistForm" class="pf-form" novalidate autocomplete="off">
      <div class="pf-grid">
        ${row('Email', `
          <input class="form-control" type="email" id="pfEmail" name="email" required maxlength="120" value="${escapeHtml(m.email)}">
          <div class="invalid-feedback" id="pfEmailFeedback">Enter a valid email address.</div>`, 'pfEmail')}
        ${row('Reliable', `
          <div class="segmented seg-field" role="group" aria-label="Reliable" data-pf-reliable>
            <button type="button" data-pf-action="reliable" data-value="1" class="${m.reliable ? 'active' : ''}" aria-pressed="${m.reliable}">Yes</button>
            <button type="button" data-pf-action="reliable" data-value="0" class="${m.reliable ? '' : 'active'}" aria-pressed="${!m.reliable}">No</button>
          </div>`)}
        <div class="pf-row pf-wide">
          <span class="form-label">PUUID / RESPID</span>
          <div class="pf-field"><span class="pf-static mono">${escapeHtml(m.puuid)}</span>
            <button type="button" class="icon-btn-sm" data-pf-action="copy-puuid" title="Copy" aria-label="Copy PUUID"><i class="bi bi-copy"></i></button></div>
        </div>
        ${row('First name', `<input class="form-control" id="pfFirst" name="first" maxlength="60" value="${escapeHtml(m.first)}">`, 'pfFirst')}
        ${row('Last name', `<input class="form-control" id="pfLast" name="last" maxlength="60" value="${escapeHtml(m.last)}">`, 'pfLast')}
        ${row('Birthdate', `<input class="form-control" type="date" id="pfBirth" name="birthdate" min="1900-01-01" max="${isoDay(Date.now())}" value="${m.birthdate}">`, 'pfBirth')}
        ${row('Gender', select('pfGender', 'gender', GENDERS.map((g) => [g, g]), m.gender, m.gender ? '' : 'Not set'), 'pfGender')}
        ${row('Country', `${select('pfCountry', 'country', countryOptions(), m.country)}`, 'pfCountry')}
        ${row('Region', select('pfRegion', 'region', regionOpts(m.country, m.region), m.region, 'Not set'), 'pfRegion')}
        ${row('Postal code', `<input class="form-control" id="pfPostal" name="postal" maxlength="12" value="${escapeHtml(m.postal)}">`, 'pfPostal')}
        ${row('Language', select('pfLanguage', 'language', LANGUAGES.map((l) => [l, l]), m.language), 'pfLanguage')}
        ${row('Created', `<span class="pf-static mono">${new Date(m.createdAt).toISOString()}</span>`)}
        ${row('Last login', `<span class="pf-static mono">${m.lastLoginAt ? new Date(m.lastLoginAt).toISOString() : 'Never'}</span>`)}
        ${row('Status', select('pfStatus', 'status', MEMBER_STATUSES.map((s) => [s, s]), m.status), 'pfStatus')}
        ${row('Points', `<span class="pf-static"><strong class="num">${fmtInt(points)}</strong>
          <button type="button" class="btn-link-sm" data-pf-action="to-points">Point history</button></span>`)}
      </div>
      <div class="pv-form-actions">
        <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> Save</button>
        <button type="button" class="btn btn-ghost" data-pf-action="cancel">Cancel</button>
        <button type="button" class="btn btn-ghost ms-auto" data-pf-action="forgot" ${m.status === 'deleted' ? 'disabled title="Deleted accounts can\'t sign in"' : ''}>
          <i class="bi bi-envelope"></i> Forgot password
        </button>
      </div>
    </form>`;
}

function markPanelistDirty() {
  if (panelistForm.dirty) return;
  panelistForm.dirty = true;
  $('#pfDirty').hidden = false;
}

function selectPanelistTab(attr, tab, focus) {
  if (attr === 'pf') {
    pp.tab = tab;
    $$('[data-pf-tab]').forEach((b) => {
      const on = b.dataset.pfTab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      $(`#pfPanel-${b.dataset.pfTab}`).hidden = !on;
      if (on && focus) b.focus();
    });
  } else {
    pp.hist = tab;
    $$('[data-ph-tab]').forEach((b) => {
      const on = b.dataset.phTab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    $('#phPanel').setAttribute('aria-labelledby', `phTab-${tab}`);
    renderHistoryPanel();
  }
}

function onPanelistKeys(e) {
  const tab = e.target.closest('[data-pf-tab], [data-ph-tab]');
  if (!tab || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const attr = tab.dataset.pfTab ? 'pf' : 'ph';
  const tabs = $$(`[data-${attr}-tab]`);
  const next = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  e.preventDefault();
  selectPanelistTab(attr, next.dataset[`${attr}Tab`], true);
}

function onPanelistClick(e) {
  const t = e.target;
  const pfTab = t.closest('[data-pf-tab]');
  if (pfTab) { selectPanelistTab('pf', pfTab.dataset.pfTab); return; }
  const phTab = t.closest('[data-ph-tab]');
  if (phTab) { selectPanelistTab('ph', phTab.dataset.phTab); return; }
  const pageBtn = t.closest('[data-ph-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      pp[pp.hist === 'projects' ? 'projPage' : 'pointPage'] = Number(pageBtn.dataset.phPage);
      renderHistoryPanel();
    }
    return;
  }
  if (t.closest('[data-search-go]')) { $('[data-search="history"]').focus(); return; }
  if (t.closest('[data-search-clear]')) {
    pp.projSearch = '';
    pp.projPage = 1;
    $('[data-search="history"]').value = '';
    renderHistoryRows();
    return;
  }
  const el = t.closest('[data-pf-action]');
  if (!el || el.disabled) return;
  const panel = pp.panel;
  const m = memberAt(panel, pp.index);
  switch (el.dataset.pfAction) {
    case 'reliable':
      $$('button', el.parentElement).forEach((b) => {
        b.classList.toggle('active', b === el);
        b.setAttribute('aria-pressed', String(b === el));
      });
      markPanelistDirty();
      break;
    case 'copy-puuid': copyText(m.puuid, 'PUUID copied.'); break;
    case 'to-points':
      selectPanelistTab('ph', 'points');
      $('#phPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    case 'cancel':
      panelistForm.dirty = false;
      $('#pfDirty').hidden = true;
      renderPanelistForm();
      break;
    case 'forgot': showToast(`Password reset email sent to ${m.email}.`); break;
    case 'proj-sort':
      pp.projSort = pp.projSort === 'asc' ? 'desc' : 'asc';
      renderHistoryRows();
      break;
    case 'point-sort':
      pp.pointSort = pp.pointSort === 'asc' ? 'desc' : 'asc';
      renderHistoryRows();
      break;
    case 'proj-export': exportProjectHistory(); break;
    case 'add-point': openAddPoint(); break;
    default:
  }
}

function onPanelistInput(e) {
  if (e.target.dataset.search === 'history') {
    pp.projSearch = e.target.value;
    pp.projPage = 1;
    renderHistoryRows();
    return;
  }
  if (e.target.closest('#panelistForm')) markPanelistDirty();
}

function onPanelistChange(e) {
  if (!e.target.closest('#panelistForm')) return;
  markPanelistDirty();
  if (e.target.name === 'country') {
    const regions = regionsFor(e.target.value);
    $('#pfRegion').innerHTML = `<option value="">Not set</option>${optionsHtml(regions.map((r) => [r, r]), '')}`;
    $('#pfLanguage').value = COUNTRY_LANGUAGE[e.target.value] || $('#pfLanguage').value;
  }
}

function savePanelist(e) {
  if (e.target.id !== 'panelistForm') return;
  e.preventDefault();
  const form = e.target;
  const panel = pp.panel;
  const d = panelData(panel);
  const m = memberAt(panel, pp.index);
  const email = form.elements.email.value.trim();
  let problem = '';
  if (!EMAIL_RE.test(email)) problem = 'Enter a valid email address.';
  else if (email.toLowerCase() !== m.email.toLowerCase() && emailTaken(panel, email, pp.index)) problem = 'Another member of this panel already uses this email.';
  form.elements.email.setCustomValidity(problem);
  $('#pfEmailFeedback').textContent = problem || 'Enter a valid email address.';
  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    form.querySelector(':invalid')?.focus();
    return;
  }
  memberHistory(panel, pp.index); // keep the history as it was before the edit
  const saved = {
    ...m,
    email,
    reliable: $('[data-pf-reliable] .active').dataset.value === '1',
    first: form.elements.first.value.trim(),
    last: form.elements.last.value.trim(),
    birthdate: form.elements.birthdate.value,
    gender: form.elements.gender.value,
    country: form.elements.country.value,
    region: form.elements.region.value,
    postal: form.elements.postal.value.trim(),
    language: form.elements.language.value,
    status: form.elements.status.value,
  };
  if (pp.index < d.n) {
    d.edits.set(pp.index, saved);
    d.status[pp.index] = MEMBER_STATUSES.indexOf(saved.status);
    d.country[pp.index] = WORLD_INDEX.get(saved.country);
    if (d.keys) d.keys[pp.index] = undefined;
  } else {
    d.extra[pp.index - d.n] = saved;
  }
  panelistForm.dirty = false;
  $('#pfDirty').hidden = true;
  pl.flashId = saved.id;
  renderPanelistForm();
  showToast(`${memberName(saved)} saved.`);
}

/* History tables */
function renderHistoryPanel() {
  const projectsTab = pp.hist === 'projects';
  $('#phPanel').innerHTML = `
    <div class="list-filters">
      ${projectsTab
        ? `${searchGroupHtml('history', 'Search projects…', pp.projSearch)}
           <button type="button" class="btn btn-export btn-sm-h" data-pf-action="proj-export"><i class="bi bi-download"></i> Export data</button>`
        : `<button type="button" class="btn btn-ghost btn-sm-h" data-pf-action="add-point"><i class="bi bi-plus-circle"></i> Add point</button>
           <span class="pv-toolbar-note" id="phBalance"></span>`}
    </div>
    <div class="table-responsive">
      <table class="pv-table list-table ph-table">
        <thead id="phHead"></thead>
        <tbody id="phRows"></tbody>
      </table>
    </div>
    <div class="table-footer" id="phFooter"></div>`;
  renderHistoryRows();
}

const sortHead = (label, dir, action) => `
  <th aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}">
    <button type="button" class="th-sort" data-pf-action="${action}">${label} <i class="bi bi-caret-${dir === 'asc' ? 'up' : 'down'}-fill"></i></button>
  </th>`;

function visibleInvites() {
  const h = memberHistory(pp.panel, pp.index);
  const q = pp.projSearch.trim().toLowerCase();
  const list = h.invites.filter((v) => !q || `${v.id} ${v.project.jobNo} ${v.project.id} ${v.project.name} ${v.status}`.toLowerCase().includes(q));
  return pp.projSort === 'asc' ? list : [...list].reverse();
}

function renderHistoryRows() {
  const panel = pp.panel;
  const h = memberHistory(panel, pp.index);
  if (pp.hist === 'projects') {
    const list = visibleInvites();
    const { rows, page, pages, start } = paginate(list, pp.projPage, HISTORY_PAGE_SIZE);
    pp.projPage = page;
    $('#phHead').innerHTML = `<tr><th>ID</th><th>Survey number</th><th>Project ID</th><th>Project</th><th>Status</th><th class="t-end">Points</th>${sortHead('Earned', pp.projSort, 'proj-sort')}</tr>`;
    $('#phRows').innerHTML = rows.length
      ? rows.map((v) => `
          <tr>
            <td class="col-id">${v.id}</td>
            <td>${v.project.jobNo}</td>
            <td>${projects.includes(v.project) ? `<a class="cell-link" href="#/project/${v.project.id}">${v.project.id}</a>` : v.project.id}</td>
            <td>${escapeHtml(v.project.name)}</td>
            <td><span class="inv-status is-${v.status.replace(' ', '-')}">${v.status}</span></td>
            <td class="t-end num">${v.points ? fmtInt(v.points) : ''}</td>
            <td class="t-muted">${fmtStampSec(v.at)}</td>
          </tr>`).join('')
      : emptyRow(7, pp.projSearch ? 'No projects found' : 'No project history yet', pp.projSearch ? 'Try a different search.' : 'Survey invitations will show up here.');
    $('#phFooter').innerHTML = `
      <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> invitations` : 'Nothing to show'}</span>
      <nav aria-label="Project history pages">${pagerHtml(page, pages, 'ph-page')}</nav>`;
    return;
  }
  const list = [...h.log].sort((a, b) => (pp.pointSort === 'asc' ? a.at - b.at : b.at - a.at));
  const { rows, page, pages, start } = paginate(list, pp.pointPage, HISTORY_PAGE_SIZE);
  pp.pointPage = page;
  $('#phBalance').innerHTML = `Balance: <strong>${plural(pointsBalance(h), 'point')}</strong>`;
  $('#phHead').innerHTML = `<tr><th>ID</th><th>Type</th><th>Reference ID</th><th class="t-end">Points</th>${sortHead('Earned', pp.pointSort, 'point-sort')}</tr>`;
  $('#phRows').innerHTML = rows.length
    ? rows.map((e) => `
        <tr>
          <td class="col-id">${e.id}</td>
          <td>${e.type}</td>
          <td>${e.type === 'exchange' || e.type === 'refund' ? `<a class="cell-link" href="#/redeem" data-redeem-ref="${e.ref}">${e.ref}</a>` : e.ref}</td>
          <td class="t-end num ${e.points < 0 ? 'pts-neg' : 'pts-pos'}">${e.points > 0 ? '+' : ''}${fmtInt(e.points)}</td>
          <td class="t-muted">${fmtStampSec(e.at)}</td>
        </tr>`).join('')
    : emptyRow(5, 'No points yet', 'Points are added when the member completes surveys or profiling.');
  $('#phFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> entries` : 'Nothing to show'}</span>
    <nav aria-label="Point history pages">${pagerHtml(page, pages, 'ph-page')}</nav>`;
  $$('[data-redeem-ref]', $('#phRows')).forEach((a) => {
    a.addEventListener('click', () => { redeemState.search = a.dataset.redeemRef; redeemState.status = ''; redeemState.page = 1; });
  });
}

function exportProjectHistory() {
  const m = memberAt(pp.panel, pp.index);
  const list = visibleInvites();
  downloadCsv(`panelist-${m.id}-project-history-${today()}.csv`, [
    ['ID', 'Survey number', 'Project ID', 'Project', 'Status', 'Points', 'Earned'],
    ...list.map((v) => [v.id, v.project.jobNo, v.project.id, v.project.name, v.status, v.points || '', fmtStampSec(v.at)]),
  ]);
  showToast(`Exported ${plural(list.length, 'invitation')}.`);
}

function openAddPoint() {
  const panel = pp.panel;
  const i = pp.index;
  const m = memberAt(panel, i);
  const balance = pointsBalance(memberHistory(panel, i));
  openFormModal({
    title: 'Add point',
    subtitle: `${memberName(m)} · balance ${plural(balance, 'point')}`,
    body: `
      <div class="row g-3">
        <div class="col-sm-6">
          <label class="form-label" for="apType">Type</label>
          <select class="form-select" id="apType" name="type">${optionsHtml(POINT_TYPES.map((t) => [t, t]), 'bonus')}</select>
        </div>
        <div class="col-sm-6">
          <label class="form-label" for="apRef">Reference ID</label>
          <input class="form-control" type="number" id="apRef" name="ref" min="1" step="1" value="1" required>
          <div class="invalid-feedback">Enter a reference ID.</div>
        </div>
        <div class="col-12">
          <label class="form-label" for="apPoints">Points</label>
          <input class="form-control" type="number" id="apPoints" name="points" step="1" min="-100000" max="100000" required aria-describedby="apPointsHelp">
          <div class="invalid-feedback" id="apPointsFeedback">Enter a whole number other than 0.</div>
          <div class="field-help" id="apPointsHelp">Use a negative number to take points away.</div>
        </div>
      </div>`,
    submitLabel: '<i class="bi bi-plus-lg"></i> Add',
    onSubmit: (form) => {
      const input = form.elements.points;
      const points = Number(input.value);
      let problem = '';
      if (!Number.isInteger(points) || points === 0) problem = 'Enter a whole number other than 0.';
      else if (balance + points < 0) problem = `The balance can't go below 0 (it's ${fmtInt(balance)} now).`;
      if (problem) {
        input.setCustomValidity(problem);
        $('#apPointsFeedback').textContent = problem;
        form.classList.add('was-validated');
        input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
        return false;
      }
      addPointEntry(panel, i, { type: form.elements.type.value, ref: Number(form.elements.ref.value), points });
      Object.assign(pp, { pointSort: 'desc', pointPage: 1 });
      if (currentView === 'panelist' && pp.panel === panel && pp.index === i) {
        renderHistoryRows();
        const strong = $('#panelistForm .pf-static strong');
        if (strong) strong.textContent = fmtInt(balance + points);
      }
      showToast(`${points > 0 ? 'Added' : 'Took away'} ${plural(Math.abs(points), 'point')}.`);
      return true;
    },
  });
}
