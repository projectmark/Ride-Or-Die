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
      LIGHT_MM: 0.15,
      MODERATE_MM: 0.8,
      HEAVY_MM: 1.5,
      SEVERE_MM: 2.0,
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
      morningTime: '08:00',
      eveningTime: '17:00',
      minTemp: 8,
      maxGusts: 55,
      avoidRain: false,
      MORNING_TIME: '08:00',
      EVENING_TIME: '17:00',
      MIN_TEMP: 8,
      MAX_GUSTS: 55,
      AVOID_RAIN: false
    },
    LOCATION: {
      name: 'Utrecht',
      latitude: 52.0908,
      longitude: 5.1222,
      country: 'NL'
    },
    ROUTE: {
      start: { name: 'Utrecht', lat: 52.0908, lon: 5.1222, country: 'NL' },
      mid: { name: 'Zeist', lat: 52.0911, lon: 5.2333, country: 'NL' },
      dest: { name: 'Amersfoort', lat: 52.1561, lon: 5.3878, country: 'NL' },
      legDurationMinutes: 15
    }
  },

  // 4. Voorgedefinieerde Nederlandse steden voor snelle selectie & corridor-herkenning
  PRESET_CITIES: [
    { name: 'Utrecht', lat: 52.0908, lon: 5.1222 },
    { name: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
    { name: 'Rotterdam', lat: 51.9244, lon: 4.4777 },
    { name: 'Den Haag', lat: 52.0705, lon: 4.3007 },
    { name: 'Eindhoven', lat: 51.4416, lon: 5.4697 },
    { name: 'Amersfoort', lat: 52.1561, lon: 5.3878 },
    { name: 'Arnhem', lat: 51.9851, lon: 5.8987 },
    { name: 'Zwolle', lat: 52.5168, lon: 6.0830 },
    { name: 'Breda', lat: 51.5719, lon: 4.7683 },
    { name: 'Groningen', lat: 53.2194, lon: 6.5665 },
    { name: 'Nijmegen', lat: 51.8426, lon: 5.8637 },
    { name: 'Tilburg', lat: 51.5555, lon: 5.0913 },
    { name: 'Den Bosch', lat: 51.6978, lon: 5.3037 },
    { name: 'Apeldoorn', lat: 52.2112, lon: 5.9699 },
    { name: 'Hilversum', lat: 52.2233, lon: 5.1764 },
    { name: 'Almere', lat: 52.3702, lon: 5.2141 },
    { name: 'Leiden', lat: 52.1601, lon: 4.4970 },
    { name: 'Delft', lat: 52.0116, lon: 4.3571 },
    { name: 'Gouda', lat: 52.0167, lon: 4.7083 },
    { name: 'Dordrecht', lat: 51.8133, lon: 4.6736 },
    { name: 'Deventer', lat: 52.2550, lon: 6.1639 },
    { name: 'Heerenveen', lat: 52.9567, lon: 5.9250 },
    { name: 'Lelystad', lat: 52.5185, lon: 5.4714 },
    { name: 'Zeist', lat: 52.0911, lon: 5.2333 },
    { name: 'Weesp', lat: 52.3072, lon: 5.0414 },
    { name: 'Woerden', lat: 52.0858, lon: 4.8833 },
    { name: 'Nieuwegein', lat: 52.0292, lon: 5.0817 },
    { name: 'Vianen', lat: 51.9892, lon: 5.0931 },
    { name: 'Gorinchem', lat: 51.8333, lon: 4.9667 }
  ],

  // 5. Veelgebruikte trajecten (30-50 km woon-werk corridors door heel Nederland)
  PRESET_ROUTES: [
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
    },
    {
      name: 'Hilversum ➔ Weesp ➔ Amsterdam',
      start: { name: 'Hilversum', lat: 52.2233, lon: 5.1764, country: 'NL' },
      mid: { name: 'Weesp', lat: 52.3072, lon: 5.0414, country: 'NL' },
      dest: { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, country: 'NL' },
      duration: 20
    },
    {
      name: 'Breda ➔ Tilburg ➔ Eindhoven',
      start: { name: 'Breda', lat: 51.5719, lon: 4.7683, country: 'NL' },
      mid: { name: 'Tilburg', lat: 51.5555, lon: 5.0913, country: 'NL' },
      dest: { name: 'Eindhoven', lat: 51.4416, lon: 5.4697, country: 'NL' },
      duration: 25
    },
    {
      name: 'Arnhem ➔ Veluwe ➔ Apeldoorn',
      start: { name: 'Arnhem', lat: 51.9851, lon: 5.8987, country: 'NL' },
      mid: { name: 'Beekbergen', lat: 52.1592, lon: 5.9628, country: 'NL' },
      dest: { name: 'Apeldoorn', lat: 52.2112, lon: 5.9699, country: 'NL' },
      duration: 20
    },
    {
      name: 'Zwolle ➔ Wijhe ➔ Deventer',
      start: { name: 'Zwolle', lat: 52.5168, lon: 6.0830, country: 'NL' },
      mid: { name: 'Wijhe', lat: 52.3875, lon: 6.1347, country: 'NL' },
      dest: { name: 'Deventer', lat: 52.2550, lon: 6.1639, country: 'NL' },
      duration: 20
    }
  ],

  /**
   * Kiest willekeurig een anoniem voorbeeldtraject bij een eerste bezoek.
   */
  getRandomPresetRoute() {
    const list = this.PRESET_ROUTES;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx] || list[0];
  }
};

if (typeof window !== 'undefined') window.Config = Config;
if (typeof module !== 'undefined') module.exports = Config;
