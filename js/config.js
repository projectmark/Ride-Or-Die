/**
 * Ride Or Die - Centrale Configuratie & Omgevingsinstellingen
 * Bevat alle API-eindpunten, drempelwaarden, presets en modelinstellingen.
 * Vrij van DOM-logica, toestand of taalteksten (Single Responsibility).
 */

const Config = {
  // 1. API-eindpunten & netwerkparameters
  API: {
    WEATHER_BASE_URL: 'https://api.open-meteo.com/v1/forecast',
    GEOCODING_BASE_URL: 'https://geocoding-api.open-meteo.com/v1/search',
    REVERSE_GEOCODE_URL: 'https://api.bigdatacloud.net/data/reverse-geocode-client',
    MODEL: 'knmi_seamless',
    CACHE_TTL_MS: 10 * 60 * 1000, // 10 minuten cache (afgestemd op modelverversingen)
    MAX_CACHE_ENTRIES: 20,
    GEOCODING_MAX_RESULTS: 8,
    SEARCH_DEBOUNCE_MS: 250,
    GPS_TIMEOUT_MS: 10000,
    GPS_REVERSE_TIMEOUT_MS: 3500
  },

  // 2. Weerdrempels & veiligheidslimieten voor motorrijders
  THRESHOLDS: {
    RAIN: {
      TRACE_MM: 0.05,
      LIGHT_MM: 0.2,
      MODERATE_MM: 0.8,
      HEAVY_MM: 1.5,
      SEVERE_MM: 3.0,
      HIGH_PROB_PERCENT: 60
    },
    WIND: {
      DEFAULT_MAX_GUSTS: 55, // km/u
      STRONG_GUSTS: 50,
      DANGEROUS_GUSTS: 75,
      STORM_GUSTS: 90
    },
    TEMPERATURE: {
      DEFAULT_MIN: 8, // °C
      ICE_RISK: 2,
      COLD_RISK: 4,
      WARM_WARNING: 25,
      EXTREME_HEAT: 31
    },
    SURFACE_PRESSURE: {
      HIGH_STABLE: 1020,
      LOW_UNSTABLE: 1005
    },
    VISIBILITY_KM: {
      EXCELLENT: 10,
      GOOD: 5,
      MODERATE: 2
    },
    UV_INDEX: {
      VERY_HIGH: 8,
      HIGH: 6,
      MODERATE: 3
    }
  },

  // 3. Standaardwaarden voor gebruikersvoorkeuren
  DEFAULTS: {
    THEME: 'light',
    VIEW_MODE: 'cockpit', // 'cockpit' | 'widget'
    SELECTED_DAY: 'today', // 'today' | 'nextWorkday'
    COMMUTE: {
      MORNING_TIME: '08:00',
      EVENING_TIME: '17:00',
      MIN_TEMP: 8,
      MAX_GUSTS: 55
    },
    LOCATION: {
      name: 'Ameide',
      latitude: 51.9547,
      longitude: 4.9622,
      country: 'NL'
    },
    ROUTE: {
      start: { name: 'Ameide', lat: 51.9547, lon: 4.9622, country: 'NL' },
      mid: { name: 'Utrecht', lat: 52.0908, lon: 5.1222, country: 'NL' },
      dest: { name: 'Bilthoven', lat: 52.1306, lon: 5.2036, country: 'NL' },
      legDurationMinutes: 20
    }
  },

  // 4. Voorgedefinieerde Nederlandse steden voor snelle selectie & corridor-herkenning
  PRESET_CITIES: [
    { name: 'Ameide', lat: 51.9547, lon: 4.9622 },
    { name: 'Bilthoven', lat: 52.1306, lon: 5.2036 },
    { name: 'Utrecht', lat: 52.0908, lon: 5.1222 },
    { name: 'Nieuwegein', lat: 52.0292, lon: 5.0817 },
    { name: 'Vianen', lat: 51.9892, lon: 5.0931 },
    { name: 'Hilversum', lat: 52.2233, lon: 5.1764 },
    { name: 'Weesp', lat: 52.3072, lon: 5.0414 },
    { name: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
    { name: 'Amersfoort', lat: 52.1561, lon: 5.3878 },
    { name: 'Zeist', lat: 52.0911, lon: 5.2333 },
    { name: 'Woerden', lat: 52.0858, lon: 4.8833 },
    { name: 'Gouda', lat: 52.0167, lon: 4.7083 },
    { name: 'Gorinchem', lat: 51.8333, lon: 4.9667 },
    { name: 'Dordrecht', lat: 51.8133, lon: 4.6736 },
    { name: 'Almere', lat: 52.3702, lon: 5.2141 },
    { name: 'Lelystad', lat: 52.5185, lon: 5.4714 },
    { name: 'Rotterdam', lat: 51.9244, lon: 4.4777 },
    { name: 'Delft', lat: 52.0116, lon: 4.3571 },
    { name: 'Den Haag', lat: 52.0705, lon: 4.3007 },
    { name: 'Leiden', lat: 52.1601, lon: 4.4970 },
    { name: 'Eindhoven', lat: 51.4416, lon: 5.4697 },
    { name: 'Den Bosch', lat: 51.6978, lon: 5.3037 },
    { name: 'Breda', lat: 51.5719, lon: 4.7683 },
    { name: 'Tilburg', lat: 51.5555, lon: 5.0913 },
    { name: 'Groningen', lat: 53.2194, lon: 6.5665 },
    { name: 'Heerenveen', lat: 52.9567, lon: 5.9250 },
    { name: 'Arnhem', lat: 51.9851, lon: 5.8987 },
    { name: 'Nijmegen', lat: 51.8426, lon: 5.8637 },
    { name: 'Apeldoorn', lat: 52.2112, lon: 5.9699 },
    { name: 'Zwolle', lat: 52.5168, lon: 6.0830 }
  ],

  // 5. Veelgebruikte trajecten (30-50 km woon-werk corridors)
  PRESET_ROUTES: [
    {
      name: 'Ameide ➔ Utrecht ➔ Bilthoven',
      start: { name: 'Ameide', lat: 51.9547, lon: 4.9622, country: 'NL' },
      mid: { name: 'Utrecht', lat: 52.0908, lon: 5.1222, country: 'NL' },
      dest: { name: 'Bilthoven', lat: 52.1306, lon: 5.2036, country: 'NL' },
      duration: 20
    },
    {
      name: 'Hilversum ➔ Weesp ➔ Amsterdam',
      start: { name: 'Hilversum', lat: 52.2233, lon: 5.1764, country: 'NL' },
      mid: { name: 'Weesp', lat: 52.3072, lon: 5.0414, country: 'NL' },
      dest: { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, country: 'NL' },
      duration: 18
    },
    {
      name: 'Utrecht ➔ Zeist ➔ Amersfoort',
      start: { name: 'Utrecht', lat: 52.0908, lon: 5.1222, country: 'NL' },
      mid: { name: 'Zeist', lat: 52.0911, lon: 5.2333, country: 'NL' },
      dest: { name: 'Amersfoort', lat: 52.1561, lon: 5.3878, country: 'NL' },
      duration: 15
    },
    {
      name: 'Rotterdam ➔ Delft ➔ Den Haag',
      start: { name: 'Rotterdam', lat: 51.9244, lon: 4.4777, country: 'NL' },
      mid: { name: 'Delft', lat: 52.0116, lon: 4.3571, country: 'NL' },
      dest: { name: 'Den Haag', lat: 52.0705, lon: 4.3007, country: 'NL' },
      duration: 15
    }
  ]
};

if (typeof window !== 'undefined') window.Config = Config;
if (typeof module !== 'undefined') module.exports = Config;
