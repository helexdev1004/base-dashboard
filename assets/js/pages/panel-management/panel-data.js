'use strict';

// Panels and their members. Members are generated on demand from a seed, so a panel can have ~90k of them.

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

// countries: [country, weight, name pool, language]. Pool and language are optional and default from the country.
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
// completes in the project history; exchanges and refunds come from redemptionsOf().
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
// cache = false skips storing the history (exports go through every member).
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
