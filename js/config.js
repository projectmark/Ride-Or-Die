/**
 * Ride Or Die - Config, State, Dictionaries & Formatting Helpers
 * Self-contained, zero-dependency motorcycle cockpit configuration
 */

// HTML Sanitization Helper (XSS / Injection prevention)
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Set Dynamic Atmospheric Weather State across root and body
function setWeatherState(state) {
  if (!state) return;
  document.documentElement.setAttribute('data-weather-state', state);
  if (document.body) document.body.setAttribute('data-weather-state', state);
}

// Central Application State
const AppState = {
  theme: 'light', // Default to Light Mode as requested ("ik haat darkmode")
  location: {
    name: 'Utrecht',
    latitude: 52.0908,
    longitude: 5.1222,
    country: 'NL'
  },
  commute: {
    morningTime: '08:00',
    eveningTime: '17:00',
    minTemp: 8,
    maxGusts: 55,
    rainTolerance: 'normal'
  },
  isSimpleMode: false,
  selectedDay: 'today', // 'today' | 'nextWorkday'
  weatherData: null
};

// Preset Cities Source of Truth (Single Source, No Repetition)
const PRESET_CITIES = [
  { name: 'Utrecht', lat: 52.0908, lon: 5.1222 },
  { name: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
  { name: 'Rotterdam', lat: 51.9244, lon: 4.4777 },
  { name: 'Den Haag', lat: 52.0705, lon: 4.3007 },
  { name: 'Eindhoven', lat: 51.4416, lon: 5.4697 },
  { name: 'Groningen', lat: 53.2194, lon: 6.5665 },
  { name: 'Arnhem', lat: 51.9851, lon: 5.8987 },
  { name: 'Zwolle', lat: 52.5168, lon: 6.0830 },
  { name: 'Maastricht', lat: 50.8514, lon: 5.6910 },
  { name: 'Middelburg', lat: 51.5000, lon: 3.6136 },
  { name: 'Texel', lat: 53.0543, lon: 4.7975 }
];

// Weather Code Dutch Dictionary
const WMO_DICT = {
  0: { text: "Strakblauw / Zonnig", icon: "sun", state: "sunny" },
  1: { text: "Vrijwel helder", icon: "sun", state: "sunny" },
  2: { text: "Licht bewolkt", icon: "partly-cloudy", state: "sunny" },
  3: { text: "Zwaar bewolkt", icon: "cloudy", state: "cloudy" },
  45: { text: "Mistig", icon: "fog", state: "cloudy" },
  48: { text: "Aanvriezende mist", icon: "fog", state: "cloudy" },
  51: { text: "Lichte motregen", icon: "drizzle", state: "rain" },
  53: { text: "Matige motregen", icon: "drizzle", state: "rain" },
  55: { text: "Dichte motregen", icon: "drizzle", state: "rain" },
  56: { text: "Aanvriezende motregen", icon: "drizzle", state: "storm" },
  57: { text: "Dichte aanvriezende motregen", icon: "drizzle", state: "storm" },
  61: { text: "Lichte regen", icon: "rain", state: "rain" },
  63: { text: "Matige regen", icon: "rain", state: "rain" },
  65: { text: "Zware regen", icon: "heavy-rain", state: "rain" },
  66: { text: "Aanvriezende regen", icon: "heavy-rain", state: "storm" },
  67: { text: "Zware aanvriezende regen", icon: "heavy-rain", state: "storm" },
  71: { text: "Lichte sneeuwval", icon: "snow", state: "cloudy" },
  73: { text: "Matige sneeuwval", icon: "snow", state: "cloudy" },
  75: { text: "Hevige sneeuwval", icon: "snow", state: "storm" },
  77: { text: "Sneeuwkorrels", icon: "snow", state: "storm" },
  80: { text: "Lichte buien", icon: "rain", state: "rain" },
  81: { text: "Matige buien", icon: "rain", state: "rain" },
  82: { text: "Zware stortbuien", icon: "heavy-rain", state: "storm" },
  85: { text: "Lichte sneeuwbuien", icon: "snow", state: "cloudy" },
  86: { text: "Zware sneeuwbuien", icon: "snow", state: "storm" },
  95: { text: "Onweersbui", icon: "thunder", state: "storm" },
  96: { text: "Onweersbui met hagel", icon: "thunder", state: "storm" },
  97: { text: "Zware onweersbui met hagel", icon: "thunder", state: "storm" },
  99: { text: "Zware onweersbui met hagel", icon: "thunder", state: "storm" }
};

// Weather SVG Icons Generator
function getWeatherSvg(iconType, isNight = false) {
  if (isNight && (iconType === 'sun' || iconType === 'partly-cloudy')) {
    return `
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M44 38A18 18 0 1 1 26 20a14 14 0 0 0 18 18z" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
        <circle cx="48" cy="18" r="1.5" fill="#f59e0b"/>
        <circle cx="54" cy="28" r="1" fill="#f59e0b"/>
      </svg>`;
  }
  switch (iconType) {
    case 'sun':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="14" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
          <path d="M32 6v6M32 52v6M6 32h6M52 32h6M13.6 13.6l4.2 4.2M46.2 46.2l4.2 4.2M13.6 50.4l4.2-4.2M46.2 17.8l4.2-4.2" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
    case 'partly-cloudy':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="26" cy="24" r="10" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
          <path d="M22 48h22a10 10 0 0 0 2-19.8 14 14 0 0 0-26.4 4.8A8 8 0 0 0 22 48z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
        </svg>`;
    case 'cloudy':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M20 46h24a10 10 0 0 0 1-19.9 14 14 0 0 0-26 3.9A8 8 0 0 0 20 46z" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>
        </svg>`;
    case 'drizzle':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M20 40h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 20 40z" fill="#94a3b8"/>
          <path d="M24 46l-2 6M34 46l-2 6M44 46l-2 6" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`;
    case 'rain':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M20 38h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 20 38z" fill="#64748b"/>
          <path d="M22 44l-4 12M32 44l-4 12M42 44l-4 12" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
    case 'heavy-rain':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M20 36h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 20 36z" fill="#475569"/>
          <path d="M20 42l-5 14M30 42l-5 14M40 42l-5 14M50 42l-5 14" stroke="#1d4ed8" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
    case 'thunder':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M19 36h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 19 36z" fill="#334155"/>
          <path d="M32 38l-6 10h8l-4 10 12-14h-8l4-6h-6z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
        </svg>`;
    case 'snow':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M20 40h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 20 40z" fill="#94a3b8"/>
          <circle cx="22" cy="48" r="2" fill="#38bdf8"/>
          <circle cx="32" cy="52" r="2" fill="#38bdf8"/>
          <circle cx="42" cy="48" r="2" fill="#38bdf8"/>
        </svg>`;
    case 'fog':
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M16 26h32M12 34h40M18 42h28" stroke="#64748b" stroke-width="3.5" stroke-linecap="round"/>
        </svg>`;
    default:
      return `
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="14" fill="#fbbf24"/>
        </svg>`;
  }
}

// Wind & Compass Conversions
function getWindDirectionText(degrees) {
  const dirs = ['Noord', 'NNO', 'NO', 'ONO', 'Oost', 'OZO', 'ZO', 'ZZO', 'Zuid', 'ZZW', 'ZW', 'WZW', 'West', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return dirs[index];
}

function kmhToBeaufort(kmh) {
  if (kmh < 1) return '0 Bft';
  if (kmh <= 5) return '1 Bft';
  if (kmh <= 11) return '2 Bft';
  if (kmh <= 19) return '3 Bft';
  if (kmh <= 28) return '4 Bft';
  if (kmh <= 38) return '5 Bft';
  if (kmh <= 49) return '6 Bft';
  if (kmh <= 61) return '7 Bft';
  if (kmh <= 74) return '8 Bft';
  if (kmh <= 88) return '9 Bft';
  return '10+ Bft';
}

// Shared Formatters (DRY)
function formatDisplayDate(date = new Date()) {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const str = date.toLocaleDateString('nl-NL', options);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDisplayTime(date = new Date()) {
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function formatCommuteSlotStatus(slotData, slotScore) {
  if (!slotData || !slotScore) return '--';
  const rainStr = slotData.totalPrecip > 0.05 
    ? `${slotData.totalPrecip} mm` 
    : (slotData.maxPrecipProb > 50 ? `0.0 mm (${slotData.maxPrecipProb}%)` : 'Droog (0 mm)');
  return `${slotData.avgTemp}°C • ${rainStr} • ${slotScore.badgeText}`;
}
