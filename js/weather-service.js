/**
 * Ride Or Die - Weerdienst & Geocodering (Service Layer)
 * Verantwoordelijk voor netwerkverkeer naar Open-Meteo en KNMI Harmonie model.
 * Bevat L1 geheugencache + L2 localStorage cache, daggrens-invalidatie,
 * tijdreeks-voorindexering en automatische request-ontdubbeling. Volledig vrij van DOM-mutaties (SRP).
 */

const WeatherService = {
  /**
   * Voorindexeert ISO-tijdreeksen eenmalig naar epoch-milliseconden (Float64Array)
   * zodat RouteEngine en UIRenderer geen duizenden Date-objecten hoeven aan te maken.
   */
  _indexTimeArrays(data) {
    if (!data || typeof data !== 'object') return data;
    const indexBlock = (block) => {
      if (block && Array.isArray(block.time) && !block._epochMs) {
        const len = block.time.length;
        const arr = new Float64Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = Date.parse(block.time[i]);
        }
        Object.defineProperty(block, '_epochMs', {
          value: arr,
          enumerable: false,
          configurable: true
        });
      }
    };
    indexBlock(data.minutely_15);
    indexBlock(data.hourly);
    return data;
  },

  _cache: {
    _mem: new Map(),

    getCacheKey(lat, lon, isCompact = false) {
      return `rideordie_weather_${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}_${isCompact ? 'compact' : 'full'}`;
    },

    get(lat, lon, isCompact = false) {
      try {
        const key = this.getCacheKey(lat, lon, isCompact);
        const now = Date.now();
        const todayStr = new Date(now).toDateString();

        // 1. Snelle L1 geheugencache (vermijdt JSON.parse van ~30KB per aanroep)
        let parsed = this._mem.get(key);

        // 2. Terugval op L2 localStorage
        if (!parsed) {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          parsed = JSON.parse(raw);
          if (!parsed || !parsed.data || !parsed.timestamp) return null;
          WeatherService._indexTimeArrays(parsed.data);
          this._mem.set(key, parsed);
        }

        const age = now - parsed.timestamp;
        const isSameDay = new Date(parsed.timestamp).toDateString() === todayStr;
        return {
          data: parsed.data,
          timestamp: parsed.timestamp,
          isFresh: isSameDay && (age < Config.API.CACHE_TTL_MS),
          ageMinutes: Math.floor(age / 60000)
        };
      } catch (err) {
        console.warn("Fout bij uitlezen weercache:", err);
        return null;
      }
    },

    set(lat, lon, data, isCompact = false) {
      try {
        WeatherService._indexTimeArrays(data);
        const key = this.getCacheKey(lat, lon, isCompact);
        const entry = {
          timestamp: Date.now(),
          data
        };
        this._mem.set(key, entry);
        this.prune();
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (err) {
        console.warn("Fout bij opslaan in weercache:", err);
      }
    },

    prune() {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('rideordie_weather_')) keys.push(k);
        }
        if (keys.length > Config.API.MAX_CACHE_ENTRIES) {
          const entries = keys.map(k => {
            try {
              const memEntry = this._mem.get(k);
              if (memEntry && memEntry.timestamp) {
                return { key: k, timestamp: memEntry.timestamp };
              }
              const p = JSON.parse(localStorage.getItem(k));
              return { key: k, timestamp: (p && p.timestamp) ? p.timestamp : 0 };
            } catch (_) {
              return { key: k, timestamp: 0 };
            }
          });
          entries.sort((a, b) => a.timestamp - b.timestamp);
          while (entries.length > Config.API.MAX_CACHE_ENTRIES) {
            const oldest = entries.shift();
            this._mem.delete(oldest.key);
            localStorage.removeItem(oldest.key);
          }
        }
      } catch (err) {
        console.warn("Fout bij opschonen cache:", err);
      }
    }
  },

  _inFlightRequests: new Map(),
  _geocodingCache: new Map(),

  /**
   * Bouwt een geoptimaliseerde Open-Meteo URL op.
   */
  _buildWeatherUrl(lat, lon, isCompact = false) {
    const params = new URLSearchParams({
      latitude: Number(lat).toFixed(4),
      longitude: Number(lon).toFixed(4),
      timezone: 'auto',
      models: Config.API.MODEL
    });

    if (isCompact) {
      // Slanke payload voor tussenstops (bespaart tot 65% dataverkeer)
      params.append('minutely_15', 'temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m');
      params.append('forecast_days', '2');
    } else {
      // Volledige payload voor de basislocatie en cockpit
      params.append('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,uv_index');
      params.append('minutely_15', 'temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m');
      params.append('hourly', 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,visibility');
      params.append('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max');
      params.append('forecast_days', '7');
    }

    return `${Config.API.WEATHER_BASE_URL}?${params.toString()}`;
  },

  /**
   * Haalt weergegevens op voor één geografisch punt met automatische request-deduplicatie.
   * Wanneer de volledige ('full') dataset al in cache of in-flight is voor dezelfde coördinaat,
   * wordt deze ook hergebruikt voor compacte verzoeken (0 dubbele netwerkcalls).
   */
  async fetchPointWeather(lat, lon, force = false, isCompact = false) {
    const cached = this._cache.get(lat, lon, isCompact) || (isCompact ? this._cache.get(lat, lon, false) : null);
    if (!force && cached && cached.isFresh) {
      return { data: cached.data, fromCache: true };
    }

    const reqKey = this._cache.getCacheKey(lat, lon, isCompact);
    const fullReqKey = this._cache.getCacheKey(lat, lon, false);

    // Hergebruik lopende identieke (of volledige) request voor dezelfde locatie
    if (this._inFlightRequests.has(reqKey)) {
      return this._inFlightRequests.get(reqKey);
    }
    if (isCompact && this._inFlightRequests.has(fullReqKey)) {
      return this._inFlightRequests.get(fullReqKey);
    }

    const promise = (async () => {
      const controller = new AbortController();
      const timeoutMs = (Config.API && Config.API.FETCH_TIMEOUT_MS) || 10000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = this._buildWeatherUrl(lat, lon, isCompact);
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        this._indexTimeArrays(data);
        this._cache.set(lat, lon, data, isCompact);
        return { data, fromCache: false };
      } catch (err) {
        if (cached && cached.data) {
          return { data: cached.data, fromCache: true, isStaleFallback: true };
        }
        throw err;
      } finally {
        clearTimeout(timer);
        this._inFlightRequests.delete(reqKey);
      }
    })();

    this._inFlightRequests.set(reqKey, promise);
    return promise;
  },

  /**
   * Haalt hoofdlocatieweer op en deelt lopende requests met de route-corridor (geen dubbele fetch).
   */
  async fetchMainLocationWeather(lat, lon, force = false) {
    const cached = this._cache.get(lat, lon, false);
    const instantData = (!force && cached && cached.data) ? cached.data : null;

    if (!force && cached && cached.isFresh) {
      return { data: cached.data, instantData: null, fromCache: true };
    }

    const res = await this.fetchPointWeather(lat, lon, force, false);
    return { data: res.data, instantData, fromCache: res.fromCache };
  },

  /**
   * Haalt gelijktijdig de weersgegevens op voor alle drie de routepunten.
   */
  async fetchRouteWeather(startPoint, midPoint, destPoint, force = false) {
    const [startRes, midRes, destRes] = await Promise.all([
      this.fetchPointWeather(startPoint.lat, startPoint.lon, force, false),
      this.fetchPointWeather(midPoint.lat, midPoint.lon, force, true),
      this.fetchPointWeather(destPoint.lat, destPoint.lon, force, false)
    ]);

    return {
      start: startRes.data,
      mid: midRes.data,
      dest: destRes.data
    };
  },

  /**
   * Zoekt plaatsen via de Open-Meteo geocoderingsdienst met geheugencache.
   */
  async searchCities(query) {
    const trimmed = (query || '').trim().toLowerCase();
    if (trimmed.length < 2) return [];

    if (this._geocodingCache.has(trimmed)) {
      return this._geocodingCache.get(trimmed);
    }

    const url = `${Config.API.GEOCODING_BASE_URL}?name=${encodeURIComponent(trimmed)}&count=${Config.API.GEOCODING_MAX_RESULTS}&language=nl&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const results = (json && json.results) ? json.results : [];

    // Prioriteer Nederlandse locaties (NL)
    const sorted = [...results].sort((a, b) => {
      const aNL = (a.country_code || '').toUpperCase() === 'NL' ? 0 : 1;
      const bNL = (b.country_code || '').toUpperCase() === 'NL' ? 0 : 1;
      return aNL - bNL;
    });

    this._geocodingCache.set(trimmed, sorted);
    return sorted;
  },

  /**
   * Bepaalt plaatsnaam op basis van coördinaten (omgekeerde geocodering).
   */
  async reverseGeocode(lat, lon) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Config.API.GPS_REVERSE_TIMEOUT_MS);
    try {
      const url = `${Config.API.REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=nl`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        return {
          name: json.city || json.locality || 'Mijn locatie',
          country: json.countryCode || 'NL'
        };
      }
    } catch (_) {
      // Val netjes terug bij time-out of offline
    }
    return { name: 'Mijn locatie', country: 'NL' };
  }
};

// Aliassen voor bestaande modules
const WeatherCache = WeatherService._cache;
const fetchWeatherData = (lat, lon, force) => WeatherService.fetchMainLocationWeather(lat, lon, force);
const fetchRouteWeather = (s, m, d, f) => WeatherService.fetchRouteWeather(s, m, d, f);

if (typeof window !== 'undefined') {
  window.WeatherService = WeatherService;
  window.WeatherCache = WeatherCache;
  window.fetchWeatherData = fetchWeatherData;
  window.fetchRouteWeather = fetchRouteWeather;
}
if (typeof module !== 'undefined') {
  module.exports = { WeatherService, WeatherCache, fetchWeatherData, fetchRouteWeather };
}
