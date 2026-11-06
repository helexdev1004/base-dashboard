'use strict';

// Countries, clients, PMs, regions and the panels/vendors lists.

const COUNTRIES = [
  { code: 'fr', name: 'France' },
  { code: 'hu', name: 'Hungary' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'de', name: 'Germany' },
  { code: 'es', name: 'Spain' },
  { code: 'it', name: 'Italy' },
  { code: 'pl', name: 'Poland' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'us', name: 'United States' },
  { code: 'se', name: 'Sweden' },
  { code: 'be', name: 'Belgium' },
  { code: 'cz', name: 'Czech Republic' },
  { code: 'ro', name: 'Romania' },
  { code: 'pt', name: 'Portugal' },
];

const CLIENTS = [
  'Northwind Research',
  'Bluepeak Insights',
  'Kestrel Analytics',
  'Meridian Panels',
  'Orbit Consumer Lab',
  'Vantage Media Group',
  'Cobalt Strategy',
];

const PMS = [
  { initials: 'RG', name: 'Ruth Gallagher' },
  { initials: 'AL', name: 'Adam Lindqvist' },
  { initials: 'MK', name: 'Mia Kovács' },
  { initials: 'JS', name: 'Jonas Schmidt' },
  { initials: 'TD', name: 'Tara Dubois' },
  { initials: 'RA', name: 'Ray' },
];

// The first few topics mirror the reference designs; the rest are sample data.
const PRESET_TOPICS = [
  { name: 'Test concepts assurance auto', country: 'fr' },
  { name: 'HelloOmnibus 2026-Oct', country: 'fr' },
  { name: 'The impact of influencers', country: 'hu' },
  { name: "Men's basketball followers", country: 'hu' },
  { name: 'Employed individuals', country: 'hu' },
  { name: 'SurveyR', country: 'gb' },
];

const TOPICS = [
  'Grocery delivery habits', 'Electric vehicle purchase intent', 'Streaming service churn drivers',
  'Banking app satisfaction', 'Pet food brand tracker', 'Holiday travel planning',
  'Smart home device usage', 'Coffee shop loyalty', 'Sustainable packaging attitudes',
  'Mobile gaming spend', 'Fitness tracker adoption', 'Skincare routine U&A',
  'B2B IT decision makers', 'Fast food menu test', 'Home insurance switching',
  'Craft beer preferences', 'Parents of toddlers', 'Online fashion returns',
  'Public transport commuters', 'Energy supplier perceptions', 'Podcast listening habits',
  'Plant-based dairy trial', 'Small business owners pulse', 'Ad recall wave 3',
  'Premium chocolate packaging test', 'Healthcare professionals panel', 'Gen Z social media',
  'Retirement planning attitudes', 'Car rental experience', 'Luxury watch buyers',
  'Back to school spending', 'Mattress purchase journey', 'Telecom NPS tracker',
  'Frozen meals concept screen', 'Home improvement DIYers', 'Sports betting attitudes',
];

// Every country used by panels, rewards, recruiters and the Screener Library.
const WORLD_COUNTRIES = [
  ['ae', 'United Arab Emirates'], ['ar', 'Argentina'], ['at', 'Austria'], ['au', 'Australia'], ['be', 'Belgium'],
  ['bg', 'Bulgaria'], ['bo', 'Bolivia'], ['br', 'Brazil'], ['ca', 'Canada'], ['ch', 'Switzerland'], ['cl', 'Chile'],
  ['co', 'Colombia'], ['cz', 'Czech Republic'], ['de', 'Germany'], ['ee', 'Estonia'], ['eg', 'Egypt'], ['es', 'Spain'],
  ['fr', 'France'], ['gb', 'United Kingdom'], ['gr', 'Greece'], ['hr', 'Croatia'], ['hu', 'Hungary'], ['ie', 'Ireland'],
  ['it', 'Italy'], ['ma', 'Morocco'], ['mx', 'Mexico'], ['nl', 'Netherlands'], ['pe', 'Peru'], ['pl', 'Poland'],
  ['pt', 'Portugal'], ['ro', 'Romania'], ['sa', 'Saudi Arabia'], ['se', 'Sweden'], ['si', 'Slovenia'], ['sk', 'Slovakia'],
  ['us', 'United States'],
].map(([code, name]) => ({ code, name }));
const countryName = (code) => WORLD_COUNTRIES.find((c) => c.code === String(code).toLowerCase())?.name ?? code;
const countryOptions = () => [...WORLD_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)).map((c) => [c.code, c.name]);

// A few regions per country (panelist profiles, Screener Library region questions).
const DEFAULT_REGIONS = ['Capital region', 'North', 'South', 'East', 'West'];
const REGIONS = {
  at: ['Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'],
  be: ['Brussels', 'Flanders', 'Wallonia'],
  bg: ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse'],
  br: ['Amazonas', 'Bahia', 'Minas Gerais', 'Rio de Janeiro', 'São Paulo'],
  cz: ['Prague', 'Central Bohemia', 'South Moravia', 'Moravia-Silesia', 'Plzeň'],
  de: ['Bayern', 'Baden-Württemberg', 'Berlin', 'Hamburg', 'Hessen', 'Nordrhein-Westfalen', 'Sachsen'],
  ee: ['Harju', 'Tartu', 'Ida-Viru', 'Pärnu'],
  es: ['Andalucía', 'Cataluña', 'Comunidad de Madrid', 'Comunidad Valenciana', 'Galicia', 'País Vasco'],
  fr: ['Auvergne-Rhône-Alpes', 'Île-de-France', 'Nouvelle-Aquitaine', 'Occitanie', 'Provence-Alpes-Côte d’Azur', 'Hauts-de-France'],
  gb: ['London', 'South East', 'North West', 'West Midlands', 'Scotland', 'Wales', 'Northern Ireland'],
  gr: ['Attica', 'Central Macedonia', 'Crete', 'Thessaly'],
  hr: ['Zagreb', 'Split-Dalmatia', 'Primorje-Gorski Kotar', 'Osijek-Baranja'],
  hu: ['Budapest', 'Pest', 'Győr-Moson-Sopron', 'Hajdú-Bihar', 'Baranya', 'Csongrád-Csanád'],
  it: ['Lombardia', 'Lazio', 'Campania', 'Sicilia', 'Veneto', 'Piemonte'],
  nl: ['Noord-Holland', 'Zuid-Holland', 'Utrecht', 'Noord-Brabant', 'Gelderland'],
  pl: ['Mazowieckie', 'Małopolskie', 'Śląskie', 'Wielkopolskie', 'Dolnośląskie', 'Pomorskie'],
  pt: ['Lisboa', 'Norte', 'Centro', 'Alentejo', 'Algarve'],
  ro: ['București', 'Cluj', 'Timiș', 'Iași', 'Constanța', 'Brașov'],
  se: ['Stockholm', 'Västra Götaland', 'Skåne', 'Uppsala'],
  si: ['Osrednjeslovenska', 'Podravska', 'Savinjska', 'Gorenjska'],
  sk: ['Bratislava', 'Košice', 'Žilina', 'Prešov'],
  us: ['Northeast', 'Midwest', 'South', 'West'],
};
const regionsFor = (code) => REGIONS[String(code).toLowerCase()] || DEFAULT_REGIONS;

const VENDORS = ['Gavenze', 'Panelwise', 'Northfield Sample', 'Opinion Bridge', 'SurveyHub Direct', 'Quickpoll Panels'];
// Panels (Panel management ▸ Panels has the details).
const PANELS = [
  { code: 'GAV', name: 'Gavenze' },
  { code: 'JAF', name: 'Jafenzi' },
  { code: 'ENC', name: 'Encuestat' },
  { code: 'SDD', name: 'Sondage Direct' },
  { code: 'MVD', name: 'Mening Vandaag' },
  { code: 'OPT', name: 'Opinion Today' },
  { code: 'SEP', name: 'Sondaggi & premi' },
];
