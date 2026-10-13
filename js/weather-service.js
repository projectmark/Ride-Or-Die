/**
 * Ride Or Die - Weather Service & Geocoding Engine
 * Handles Open-Meteo KNMI Harmonie model queries, caching, throttling, geocoding & GPS
 */

// ==========================================================================
// SMART WEATHER CACHE & API THROTTLING ENGINE
// 10-min TTL cache, zero-latency instant rendering, abort controller, and offline fallback
// ==========================================================================
const WeatherCache = {
  TTL_MS: 10 * 60 * 1000, // 10 minutes cache TTL (aligned with model update frequencies)
  MAX_ENTRIES: 20, // Keep up to 20 recent location caches in localStorage (covers main + waypoints)

  getCacheKey(lat, lon) {
    return `rideordie_weather_${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}`;
  },

  pruneOldEntries() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('rideordie_weather_')) {
          keys.push(k);
        }
      }
      if (keys.length > this.MAX_ENTRIES) {
        const entries = keys.map(k => {
          try {
            const parsed = JSON.parse(localStorage.getItem(k));
            return { key: k, timestamp: (parsed && parsed.timestamp) ? parsed.timestamp : 0 };
          } catch (_) {
            return { key: k, timestamp: 0 };
          }
        });
        entries.sort((a, b) => a.timestamp - b.timestamp);
        while (entries.length > this.MAX_ENTRIES) {
          const oldest = entries.shift();
          localStorage.removeItem(oldest.key);
        }
      }
    } catch (e) {
      console.warn("Fout bij opschonen weer-cache:", e);
    }
  },

  get(lat, lon) {
    try {
      const key = this.getCacheKey(lat, lon);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data || !parsed.timestamp) return null;
      const age = Date.now() - parsed.timestamp;
      return {
        data: parsed.data,
        timestamp: parsed.timestamp,
        isFresh: age < this.TTL_MS,
        ageMinutes: Math.floor(age / 60000)
      };
    } catch (e) {
      console.warn("Fout bij lezen weer-cache:", e);
      return null;
    }
  },

  set(lat, lon, data) {
    try {
      this.pruneOldEntries();
      const key = this.getCacheKey(lat, lon);
      const entry = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      console.warn("Fout bij opslaan in weer-cache:", e);
    }
  }
};

let currentFetchController = null;

// Fetch Weather Data from KNMI Harmonie model with intelligent cache & throttling
async function fetchWeatherData(lat, lon, force = false) {
  const refreshIcon = document.getElementById('refresh-icon');

  // 1. Check cache first if not forced
  const cached = WeatherCache.get(lat, lon);
  if (!force && cached && cached.isFresh) {
    // Instant 0ms render from cache!
    AppState.weatherData = cached.data;
    if (AppState.theme === 'auto') {
      applyTheme('auto', false);
    }
    renderDashboard(cached.data);
    return;
  }

  // If we have existing data in cache (even slightly older), render immediately while fetching fresh data
  if (!force && cached && cached.data) {
    AppState.weatherData = cached.data;
    if (AppState.theme === 'auto') {
      applyTheme('auto', false);
    }
    renderDashboard(cached.data);
  }

  // 2. Abort prior in-flight fetch if user switched locations quickly
  if (currentFetchController) {
    currentFetchController.abort();
  }
  currentFetchController = new AbortController();
  const signal = currentFetchController.signal;

  if (refreshIcon) refreshIcon.classList.add('spin');
  if (force) {
    showToast("KNMI data forceren & vernieuwen...");
  } else if (!cached) {
    showToast("KNMI Harmonie model data ophalen...");
  }

  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,uv_index&minutely_15=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&models=knmi_seamless&timezone=auto&forecast_days=7`;

  try {
    const response = await fetch(apiUrl, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Update cache and app state
    WeatherCache.set(lat, lon, data);
    AppState.weatherData = data;

    if (AppState.theme === 'auto') {
      applyTheme('auto', false);
    }

    renderDashboard(data);
    showToast(force ? "KNMI data direct vernieuwd! 🔄" : "KNMI data actueel bijgewerkt!");
  } catch (err) {
    if (err.name === 'AbortError') {
      return;
    }
    console.error("Fout bij ophalen weerdata:", err);
    if (cached && cached.data) {
      showToast("Netwerkfout: recente opgeslagen weerdata getoond");
    } else {
      showToast("Fout bij laden van KNMI gegevens. Probeer opnieuw.");
    }
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('spin');
  }
}

// Fetch single point weather with 15-minute resolution & caching
async function fetchPointWeatherData(lat, lon, force = false) {
  const cached = WeatherCache.get(lat, lon);
  if (!force && cached && cached.isFresh) {
    return cached.data;
  }
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,uv_index&minutely_15=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&models=knmi_seamless&timezone=auto&forecast_days=7`;
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  WeatherCache.set(lat, lon, data);
  return data;
}

// Fetch all 3 route waypoints concurrently
async function fetchRouteWeather(startPoint, midPoint, destPoint, force = false) {
  const [startData, midData, destData] = await Promise.all([
    fetchPointWeatherData(startPoint.lat, startPoint.lon, force),
    fetchPointWeatherData(midPoint.lat, midPoint.lon, force),
    fetchPointWeatherData(destPoint.lat, destPoint.lon, force)
  ]);
  return {
    start: startData,
    mid: midData,
    dest: destData
  };
}

// Smart Background Polling (pauses when tab is hidden, resumes when visible if stale)
let pollInterval = null;
function startWeatherPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    if (!document.hidden) {
      const cached = WeatherCache.get(AppState.location.latitude, AppState.location.longitude);
      if (!cached || !cached.isFresh) {
        fetchWeatherData(AppState.location.latitude, AppState.location.longitude, false);
      }
    }
  }, 10 * 60 * 1000); // Check every 10 minutes
}

// Geocoding Search (with memory cache, NL prioritering & security escaping)
const geocodingCache = new Map();
let searchTimeout = null;

function renderSearchResults(results) {
  const resultsList = document.getElementById('search-results-list');
  if (!resultsList) return;

  if (results && results.length > 0) {
    // Prioriteer Nederlandse locaties (NL) bovenaan
    const sorted = [...results].sort((a, b) => {
      const aNL = (a.country_code || '').toUpperCase() === 'NL' ? 0 : 1;
      const bNL = (b.country_code || '').toUpperCase() === 'NL' ? 0 : 1;
      return aNL - bNL;
    });

    resultsList.innerHTML = sorted.map(item => {
      const safeName = escapeHtml(item.name);
      const safeCountry = escapeHtml(item.country_code || item.country || 'NL');
      const safeRegion = escapeHtml(item.admin1 || item.country || '');
      return `
        <div class="search-result-item" data-lat="${Number(item.latitude)}" data-lon="${Number(item.longitude)}" data-name="${safeName}" data-country="${safeCountry}">
          <span class="search-result-name">${safeName} <small style="opacity:0.75;font-weight:600;">(${safeCountry})</small></span>
          <span class="search-result-province">${safeRegion}</span>
        </div>
      `;
    }).join('');
    resultsList.classList.add('show');
  } else {
    resultsList.innerHTML = `<div style="padding:10px;font-size:0.8rem;color:var(--text-muted);text-align:center;">Geen resultaten gevonden in Nederland</div>`;
    resultsList.classList.add('show');
  }
}

function handleLocationSearch(query) {
  clearTimeout(searchTimeout);
  const resultsList = document.getElementById('search-results-list');

  const trimmed = (query || '').trim();
  if (trimmed.length < 2) {
    if (resultsList) {
      resultsList.classList.remove('show');
      resultsList.innerHTML = '';
    }
    return;
  }

  const cacheKey = trimmed.toLowerCase();
  if (geocodingCache.has(cacheKey)) {
    renderSearchResults(geocodingCache.get(cacheKey));
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=10&language=nl&format=json`);
      if (!res.ok) return;
      const data = await res.json();
      const results = (data && data.results) ? data.results : [];
      geocodingCache.set(cacheKey, results);
      renderSearchResults(results);
    } catch (err) {
      console.error("Geocoding zoekfout:", err);
    }
  }, 350);
}

// GPS Geolocation Handler with Automatic Reverse Geocoding
function requestGPSLocation() {
  if (!navigator.geolocation) {
    showToast("Geolocatie wordt niet ondersteund door je browser");
    return;
  }
  showToast("GPS locatie bepalen...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      let placeName = 'Mijn Locatie';
      let countryCode = 'NL';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=nl`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const geo = await res.json();
          if (geo.city || geo.locality) {
            placeName = geo.city || geo.locality;
          }
          if (geo.countryCode) {
            countryCode = geo.countryCode;
          }
        }
      } catch (_) {
        // Netwerk timeout of offline; val netjes terug
      }

      selectNewLocation(placeName, lat, lon, countryCode);
    },
    (error) => {
      console.warn("GPS fout:", error.message);
      showToast("Locatie toegang geweigerd. Huidige locatie behouden.");
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}
