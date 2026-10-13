/**
 * Ride Or Die - Main Application Controller
 * Handles UI rendering, lifecycle, modal dialogs, scaling and event listeners
 */

// Load saved settings from localStorage
function loadSavedState() {
  try {
    const savedTheme = localStorage.getItem('rideordie_theme');
    if (savedTheme) AppState.theme = savedTheme;
    else AppState.theme = 'light'; // Standaard Licht

    const savedLoc = localStorage.getItem('rideordie_loc');
    if (savedLoc) {
      AppState.location = JSON.parse(savedLoc);
      const navLoc = document.getElementById('nav-location-label');
      if (navLoc && AppState.location && AppState.location.name) {
        navLoc.textContent = `${AppState.location.name}, ${AppState.location.country || 'NL'}`;
      }
    }

    const savedCommute = localStorage.getItem('rideordie_commute');
    if (savedCommute) AppState.commute = { ...AppState.commute, ...JSON.parse(savedCommute) };

    const savedSimple = localStorage.getItem('rideordie_simple');
    if (savedSimple !== null) {
      AppState.isSimpleMode = savedSimple === 'true';
    } else if (window.location.hash.includes('simple')) {
      AppState.isSimpleMode = true;
    }

    const savedDay = localStorage.getItem('rideordie_selected_day');
    if (savedDay && ['today', 'nextWorkday'].includes(savedDay)) {
      AppState.selectedDay = savedDay;
    }

    const savedRoute = localStorage.getItem('rideordie_route');
    if (savedRoute) {
      try {
        const parsed = JSON.parse(savedRoute);
        if (parsed.start) AppState.route.start = parsed.start;
        if (parsed.mid) AppState.route.mid = parsed.mid;
        if (parsed.dest) AppState.route.dest = parsed.dest;
        if (parsed.legDurationMinutes) AppState.route.legDurationMinutes = parsed.legDurationMinutes;
      } catch (err) {
        console.warn("Kon route-instellingen niet laden:", err);
      }
    }
  } catch (e) {
    console.error("Kon instellingen niet laden:", e);
  }
  applyTheme(AppState.theme, false);
  updateSimpleModeUI(AppState.isSimpleMode);
}

function saveState() {
  try {
    localStorage.setItem('rideordie_theme', AppState.theme);
    localStorage.setItem('rideordie_loc', JSON.stringify(AppState.location));
    localStorage.setItem('rideordie_commute', JSON.stringify(AppState.commute));
    localStorage.setItem('rideordie_simple', AppState.isSimpleMode ? 'true' : 'false');
    localStorage.setItem('rideordie_selected_day', AppState.selectedDay || 'today');
    if (AppState.route) {
      localStorage.setItem('rideordie_route', JSON.stringify({
        start: AppState.route.start,
        mid: AppState.route.mid,
        dest: AppState.route.dest,
        legDurationMinutes: AppState.route.legDurationMinutes
      }));
    }
  } catch (e) {
    console.error("Kon instellingen niet opslaan:", e);
  }
}

// Theme Management
function applyTheme(themeMode, showFeedback = true) {
  AppState.theme = themeMode;
  let effectiveTheme = 'light';

  if (themeMode === 'auto') {
    const isDay = AppState.weatherData ? AppState.weatherData.current.is_day === 1 : (new Date().getHours() >= 7 && new Date().getHours() < 20);
    effectiveTheme = isDay ? 'light' : 'dark';
  } else {
    effectiveTheme = themeMode;
  }

  document.documentElement.setAttribute('data-theme', effectiveTheme);
  if (document.body) document.body.setAttribute('data-theme', effectiveTheme);

  // Update Theme Button in Nav
  const btnIcon = document.getElementById('theme-btn-icon');
  const btnText = document.getElementById('theme-btn-text');
  if (btnIcon && btnText) {
    if (themeMode === 'light') {
      btnIcon.textContent = '☀️';
      btnText.textContent = 'Licht';
    } else if (themeMode === 'auto') {
      btnIcon.textContent = '🔄';
      btnText.textContent = 'Auto';
    } else {
      btnIcon.textContent = '🌙';
      btnText.textContent = 'Donker';
    }
  }

  // Update Simple Mode Quick Theme Button
  const simpleThemeBtn = document.getElementById('simple-theme-btn');
  if (simpleThemeBtn) {
    if (themeMode === 'light') {
      simpleThemeBtn.textContent = '☀️';
      simpleThemeBtn.setAttribute('title', 'Huidig: Licht. Klik voor Auto');
    } else if (themeMode === 'auto') {
      simpleThemeBtn.textContent = '🔄';
      simpleThemeBtn.setAttribute('title', 'Huidig: Auto (Dag/Nacht). Klik voor Donker');
    } else {
      simpleThemeBtn.textContent = '🌙';
      simpleThemeBtn.setAttribute('title', 'Huidig: Donker. Klik voor Licht');
    }
  }

  // Update meta theme-color for browser tab
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', effectiveTheme === 'light' ? '#f5f8fc' : '#09101d');
  }

  updateThemeButtonsUI();
  saveState();
  if (showFeedback) {
    showToast(themeMode === 'light' ? 'Thema: Licht ☀️' : themeMode === 'auto' ? 'Thema: Automatisch (Dag/Nacht) 🔄' : 'Thema: Donker 🌙');
  }
}

function cycleTheme() {
  if (AppState.theme === 'light') {
    applyTheme('auto');
  } else if (AppState.theme === 'auto') {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }
}

// Day Toggle UI & Settle Animation
function updateDayToggleUI() {
  const config = getWorkdayConfig();
  const currentMode = AppState.selectedDay || 'today';
  
  const navNextText = document.getElementById('nav-next-day-text');
  const simpleNextText = document.getElementById('simple-next-day-text');
  
  if (navNextText) navNextText.textContent = config.nextWorkday.buttonLabel;
  if (simpleNextText) simpleNextText.textContent = config.nextWorkday.buttonLabel;
  
  // Update active classes for all day-toggle buttons
  document.querySelectorAll('.day-toggle-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-day') === currentMode;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });
}

function triggerContentSettleAnimation() {
  const targets = [
    document.getElementById('master-verdict-card'),
    document.getElementById('slot-morning-card'),
    document.getElementById('slot-evening-card'),
    document.getElementById('simple-combined-card'),
    document.querySelector('.hero-weather-card'),
    document.getElementById('hourly-strip')
  ].filter(Boolean);

  targets.forEach(el => el.classList.remove('m3-motion-settle'));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      targets.forEach(el => el.classList.add('m3-motion-settle'));
    });
  });
}

function switchDayView(dayKey) {
  if (!['today', 'nextWorkday'].includes(dayKey)) return;
  if (AppState.selectedDay === dayKey) return;
  AppState.selectedDay = dayKey;
  saveState();
  updateDayToggleUI();
  
  if (!AppState.weatherData) return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion && typeof document.startViewTransition === 'function') {
    try {
      document.startViewTransition(() => {
        renderDashboard(AppState.weatherData);
      });
      return;
    } catch (e) {
      console.warn("View transition fallback:", e);
    }
  }

  renderDashboard(AppState.weatherData);
  if (!prefersReducedMotion) {
    triggerContentSettleAnimation();
  }
}

function setupDayToggleEvents() {
  document.querySelectorAll('.day-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetDay = btn.getAttribute('data-day');
      if (targetDay) {
        switchDayView(targetDay);
      }
    });
  });
}

// Preset City Chips Rendering & Active State
function renderPresetCityChips() {
  const container = document.getElementById('preset-cities-container');
  if (!container) return;
  const currentName = (AppState.location.name || '').toLowerCase();
  container.innerHTML = PRESET_CITIES.map(city => {
    const isCurrent = city.name.toLowerCase() === currentName;
    return `<button class="city-chip location-city-chip ${isCurrent ? 'is-current' : ''}" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}">${city.name}</button>`;
  }).join('');
}

function updateActiveCityChip() {
  const currentName = (AppState.location.name || '').toLowerCase();
  document.querySelectorAll('.location-city-chip').forEach(chip => {
    const chipName = (chip.dataset.name || '').toLowerCase();
    if (chipName === currentName) {
      chip.classList.add('is-current');
    } else {
      chip.classList.remove('is-current');
    }
  });
}

// Unified Location Change Handler
function selectNewLocation(name, lat, lon, country = 'NL') {
  AppState.location = { name, latitude: lat, longitude: lon, country };
  saveState();

  const locModal = document.getElementById('location-modal');
  if (locModal) locModal.classList.remove('open');
  const resultsList = document.getElementById('search-results-list');
  if (resultsList) resultsList.classList.remove('show');

  const navLoc = document.getElementById('nav-location-label');
  if (navLoc) navLoc.textContent = `${name}, ${country}`;

  updateActiveCityChip();
  fetchWeatherData(lat, lon, false);
  showToast(`Locatie gewijzigd naar ${name}`);
}

// Toast Notification
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toast-pill');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Hash Synchronization Helper
function syncUrlHash(isFs, isSimple) {
  const parts = [];
  if (isFs) parts.push('fullscreen');
  if (isSimple) parts.push('simple');
  const targetHash = parts.length ? '#' + parts.join('&') : '';
  if (window.location.hash !== targetHash) {
    history.replaceState(null, '', targetHash || (window.location.pathname + window.location.search));
  }
}

// Simple Mode Management
function toggleSimpleMode(force) {
  const willBeSimple = typeof force === 'boolean' ? force : !AppState.isSimpleMode;
  AppState.isSimpleMode = willBeSimple;
  saveState();

  const isFs = !!(document.fullscreenElement || document.documentElement.classList.contains('is-fullscreen'));
  syncUrlHash(isFs, willBeSimple);

  updateSimpleModeUI(willBeSimple);

  if (willBeSimple) {
    showToast("Simple mode geactiveerd 🏍️");
  } else {
    showToast("Volledig dashboard hersteld");
  }
}

function updateSimpleModeUI(isSimple) {
  const btn = document.getElementById('simple-mode-btn');
  if (isSimple) {
    document.body.classList.add('is-simple-mode');
    if (btn) {
      btn.classList.add('is-active');
      btn.setAttribute('title', 'Volledig Dashboard (alle widgets)');
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
        </svg>
      `;
    }
  } else {
    document.body.classList.remove('is-simple-mode');
    if (btn) {
      btn.classList.remove('is-active');
      btn.setAttribute('title', 'Simple mode: combineer tot 1 schermvullend widget');
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="3"></rect>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <circle cx="8" cy="15" r="1.5"></circle>
          <line x1="13" y1="15" x2="17" y2="15"></line>
        </svg>
      `;
    }
  }

  if (AppState.weatherData) {
    renderSimpleModeCard(AppState.weatherData);
  }
}

// Adaptive Screen Scaling
function updateFullscreenScale() {
  const isFs = !!(document.fullscreenElement || window.location.hash.includes('fullscreen') || document.documentElement.classList.contains('is-fullscreen'));
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (isFs) {
    document.documentElement.classList.add('is-fullscreen');
    updateFullscreenButtonUI(true);

    if (w >= 1260 && h >= 680) {
      const scaleW = (w - 32) / 1260;
      const scaleH = (h - 52) / 680;
      // Scale up to max 1.45 on large monitors (e.g. 24" 1080p/1440p)
      const scale = Math.min(1.45, Math.max(1.0, Math.min(scaleW, scaleH)));
      document.documentElement.style.setProperty('--ui-scale', scale.toFixed(3));
      document.documentElement.style.setProperty('--fs-scale', scale.toFixed(3));
    } else {
      // Compact 1.0 on smaller displays
      document.documentElement.style.setProperty('--ui-scale', '1.0');
      document.documentElement.style.setProperty('--fs-scale', '1.0');
    }
  } else {
    document.documentElement.classList.remove('is-fullscreen');
    updateFullscreenButtonUI(false);

    // In normal desktop mode on larger displays automatically scale up so interface breathes
    if (w >= 1440 && h >= 760) {
      const scaleW = (w - 60) / 1260;
      const scaleH = (h - 80) / 680;
      const scale = Math.min(1.25, Math.max(1.0, Math.min(scaleW, scaleH)));
      document.documentElement.style.setProperty('--ui-scale', scale.toFixed(3));
      document.documentElement.style.setProperty('--fs-scale', scale.toFixed(3));
    } else {
      document.documentElement.style.setProperty('--ui-scale', '1.0');
      document.documentElement.style.setProperty('--fs-scale', '1.0');
    }
  }
}

function updateFullscreenButtonUI(isFs) {
  const btn = document.getElementById('fullscreen-btn');
  if (!btn) return;
  if (isFs) {
    btn.setAttribute('title', 'Verlaat volledig scherm (ESC)');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
      </svg>
    `;
    btn.style.borderColor = 'var(--sky-accent)';
    btn.style.color = 'var(--sky-accent)';
  } else {
    btn.setAttribute('title', 'Volledig scherm / Kiosk mode');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
      </svg>
    `;
    btn.style.borderColor = '';
    btn.style.color = '';
  }
}

function toggleFullScreen() {
  const isAlreadyFs = document.fullscreenElement || document.documentElement.classList.contains('is-fullscreen');
  if (!isAlreadyFs) {
    document.documentElement.classList.add('is-fullscreen');
    syncUrlHash(true, AppState.isSimpleMode);
    updateFullscreenScale();

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    showToast("Schermvullend vergroot ⛶");
  } else {
    document.documentElement.classList.remove('is-fullscreen');
    syncUrlHash(false, AppState.isSimpleMode);
    updateFullscreenScale();

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    showToast("Normale weergave hersteld");
  }
}

function checkInitialHashModes() {
  const hash = window.location.hash;
  const hasFs = hash.includes('fullscreen');
  const hasSimple = hash.includes('simple');
  const hasRoute = hash.includes('route');

  if (hasSimple) {
    AppState.isSimpleMode = true;
    updateSimpleModeUI(true);
  }

  if (hasRoute) {
    setTimeout(() => {
      openRoutePlannerModal();
    }, 100);
  }

  if (hasFs) {
    document.documentElement.classList.add('is-fullscreen');
    updateFullscreenScale();
    updateFullscreenButtonUI(true);
    const requestOnGesture = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      document.removeEventListener('click', requestOnGesture);
      document.removeEventListener('touchstart', requestOnGesture);
    };
    document.addEventListener('click', requestOnGesture, { once: true });
    document.addEventListener('touchstart', requestOnGesture, { once: true });
  }
}

// Master Dashboard Rendering
function renderDashboard(data) {
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  const advice = computeCommuteAdvise(data);
  const isNextWorkday = AppState.selectedDay === 'nextWorkday';
  const workdayConfig = advice.workdayConfig;

  document.getElementById('nav-location-label').textContent = `${AppState.location.name}, ${AppState.location.country || 'NL'}`;
  document.getElementById('hero-city-name').textContent = AppState.location.name;

  const now = new Date();
  document.getElementById('hero-date-str').textContent = isNextWorkday
    ? `${formatDisplayDate(workdayConfig.nextWorkday.date)} (Volgende werkdag)`
    : formatDisplayDate(now);
  document.getElementById('hero-update-time').textContent = isNextWorkday
    ? 'Voorspelling'
    : formatDisplayTime(now);

  // Hero Weather specs (Live current vs Target Workday Forecast)
  if (isNextWorkday && daily && daily.time) {
    const dayIdx = daily.time.findIndex(t => t.startsWith(workdayConfig.nextWorkday.dateStr));
    if (dayIdx >= 0) {
      const code = daily.weather_code[dayIdx] || 0;
      const wmoInfo = WMO_DICT[code] || { text: "Helder", icon: "sun", state: "sunny" };
      setWeatherState(wmoInfo.state);

      const maxT = Math.round(daily.temperature_2m_max[dayIdx]);
      const minT = Math.round(daily.temperature_2m_min[dayIdx]);
      const dayAvgT = Math.round((maxT + minT) / 2);

      document.getElementById('hero-temp').textContent = dayAvgT;
      document.getElementById('hero-condition').textContent = wmoInfo.text;
      document.getElementById('hero-feels-like').textContent = `${dayAvgT}°`;
      document.getElementById('hero-weather-icon').innerHTML = getWeatherSvg(wmoInfo.icon, false);

      document.getElementById('hero-max-temp').textContent = `${maxT}°`;
      document.getElementById('hero-min-temp').textContent = `${minT}°`;

      const maxWind = Math.round(daily.wind_speed_10m_max[dayIdx] || 0);
      document.getElementById('spec-wind-speed').textContent = `${maxWind} km/u`;
      document.getElementById('spec-wind-dir').textContent = `Regio`;

      const maxGusts = Math.round(daily.wind_gusts_10m_max[dayIdx] || 0);
      document.getElementById('spec-wind-gusts').textContent = `${maxGusts} km/u`;
      let gustStatus = "Rustig";
      if (maxGusts > 65) gustStatus = "⚠️ Zware stoten";
      else if (maxGusts > 45) gustStatus = "Matig/vlagerig";
      document.getElementById('spec-gust-status').textContent = gustStatus;

      const precipSum = daily.precipitation_sum[dayIdx] || 0;
      document.getElementById('spec-precip').textContent = `${precipSum.toFixed(1)} mm`;
      const probMax = daily.precipitation_probability_max[dayIdx] || 0;
      const specPrecipProb = document.getElementById('spec-precip-prob');
      if (specPrecipProb) {
        specPrecipProb.textContent = precipSum > 0.1 ? `Regen (${probMax}%)` : (probMax > 45 ? `Droog (regio ${probMax}%)` : 'Droog (0%)');
      }
    }
  } else {
    const code = current.weather_code || 0;
    const wmoInfo = WMO_DICT[code] || { text: "Helder", icon: "sun", state: "sunny" };
    const isNight = current.is_day === 0;
    setWeatherState(wmoInfo.state);

    document.getElementById('hero-temp').textContent = Math.round(current.temperature_2m);
    document.getElementById('hero-condition').textContent = wmoInfo.text;
    document.getElementById('hero-feels-like').textContent = `${Math.round(current.apparent_temperature)}°`;
    document.getElementById('hero-weather-icon').innerHTML = getWeatherSvg(wmoInfo.icon, isNight);

    if (daily && daily.temperature_2m_max) {
      document.getElementById('hero-max-temp').textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
      document.getElementById('hero-min-temp').textContent = `${Math.round(daily.temperature_2m_min[0])}°`;
    }

    document.getElementById('spec-wind-speed').textContent = `${Math.round(current.wind_speed_10m)} km/u`;
    document.getElementById('spec-wind-dir').textContent = `${getWindDirectionText(current.wind_direction_10m)} (${Math.round(current.wind_direction_10m)}°)`;
    document.getElementById('spec-wind-gusts').textContent = `${Math.round(current.wind_gusts_10m)} km/u`;

    const gustKmh = Math.round(current.wind_gusts_10m);
    let gustStatus = "Rustig";
    if (gustKmh > 65) gustStatus = "⚠️ Zware stoten";
    else if (gustKmh > 45) gustStatus = "Matig/vlagerig";
    document.getElementById('spec-gust-status').textContent = gustStatus;

    const currentPrecip = current.precipitation || 0;
    document.getElementById('spec-precip').textContent = `${currentPrecip.toFixed(1)} mm`;
    const specPrecipProb = document.getElementById('spec-precip-prob');
    if (specPrecipProb) {
      const curProb = (hourly && hourly.precipitation_probability && hourly.precipitation_probability.length > 0)
        ? hourly.precipitation_probability[0]
        : 0;
      if (currentPrecip > 0.1) {
        specPrecipProb.textContent = `Regen (${curProb}%)`;
      } else if (curProb > 45) {
        specPrecipProb.textContent = `Droog (regio ${curProb}%)`;
      } else {
        specPrecipProb.textContent = `Droog (0%)`;
      }
    }
  }

  // UV Index & Status Label
  const uvEl = document.getElementById('spec-uv');
  const uvStatusEl = document.getElementById('spec-uv-status');
  if (current.uv_index !== undefined && current.uv_index !== null) {
    const uvVal = current.uv_index;
    if (uvEl) uvEl.textContent = uvVal.toFixed(1);
    if (uvStatusEl) {
      uvStatusEl.textContent = uvVal < 3 ? 'Laag risico' : uvVal < 6 ? 'Matig (zonnebril)' : uvVal < 8 ? 'Hoog (insmeren!)' : 'Zeer hoog risico';
    }
  } else {
    if (uvEl) uvEl.textContent = '--';
    if (uvStatusEl) uvStatusEl.textContent = '--';
  }

  // Luchtdruk & Status Label
  const pressEl = document.getElementById('spec-pressure');
  const pressStatusEl = document.getElementById('spec-pressure-status');
  if (current.surface_pressure) {
    const p = Math.round(current.surface_pressure);
    if (pressEl) pressEl.textContent = `${p} hPa`;
    if (pressStatusEl) {
      pressStatusEl.textContent = p < 1000 ? 'Lagedruk (wisselvallig)' : p <= 1022 ? 'Stabiel (normaal)' : 'Hogedruk (rustig)';
    }
  } else {
    if (pressEl) pressEl.textContent = '1016 hPa';
    if (pressStatusEl) pressStatusEl.textContent = 'Stabiel';
  }

  // Zicht & Status Label
  const visMeters = hourly && hourly.visibility ? hourly.visibility[0] : 25000;
  const visKm = Math.round(visMeters / 1000);
  const visEl = document.getElementById('spec-visibility');
  const visStatusEl = document.getElementById('spec-visibility-status');
  if (visEl) visEl.textContent = visKm > 20 ? '> 20 km' : `${visKm} km`;
  if (visStatusEl) {
    visStatusEl.textContent = visKm < 1 ? 'Dichte mist (gevaar!)' : visKm < 4 ? 'Matig (mistig)' : visKm < 10 ? 'Goed zicht' : 'Uitstekend';
  }

  const verdictCard = document.getElementById('master-verdict-card');
  const verdictPill = document.getElementById('master-verdict-pill');
  const verdictScore = document.getElementById('master-verdict-score');
  const verdictHeadline = document.getElementById('master-verdict-headline');
  const verdictExpl = document.getElementById('master-verdict-explanation');

  verdictHeadline.textContent = advice.dayHeadline;
  verdictPill.innerHTML = advice.dayPill;
  verdictScore.textContent = `Index: ${advice.minScore}/100`;
  verdictExpl.textContent = advice.dayExplanation;

  // Pure CSS-driven verdict states (Material You 3 Expressive)
  verdictCard.dataset.verdict = advice.dayVerdict;
  verdictPill.dataset.verdict = advice.dayVerdict;
  verdictScore.dataset.verdict = advice.dayVerdict;

  const prefixSlot = isNextWorkday ? `${workdayConfig.nextWorkday.dayShort.toUpperCase()} ` : '';
  document.getElementById('morning-slot-time').textContent = `${prefixSlot}${AppState.commute.morningTime} (Heen)`;
  document.getElementById('morning-temp').textContent = `${advice.morningData.avgTemp}°C`;
  document.getElementById('morning-rain').textContent = advice.morningData.totalPrecip > 0.05 
    ? `${advice.morningData.totalPrecip} mm` 
    : (advice.morningData.maxPrecipProb > 50 ? `0.0 mm (${advice.morningData.maxPrecipProb}%)` : '0.0 mm (Droog)');
  document.getElementById('morning-gusts').textContent = `${advice.morningData.maxGusts} km/u`;
  document.getElementById('morning-status-badge').textContent = advice.morningScore.badgeText;
  document.getElementById('morning-note').innerHTML = `<span>👉</span> ${advice.morningScore.reasons.length ? advice.morningScore.reasons.join(". ") : (isNextWorkday ? `Ideale rit op ${workdayConfig.nextWorkday.dayName.toLowerCase()}! Droog asfalt en kalme wind.` : "Ideale ochtendrit! Droog asfalt en kalme wind.")}`;

  document.getElementById('evening-slot-time').textContent = `${prefixSlot}${AppState.commute.eveningTime} (Terug)`;
  document.getElementById('evening-temp').textContent = `${advice.eveningData.avgTemp}°C`;
  document.getElementById('evening-rain').textContent = advice.eveningData.totalPrecip > 0.05 
    ? `${advice.eveningData.totalPrecip} mm` 
    : (advice.eveningData.maxPrecipProb > 50 ? `0.0 mm (${advice.eveningData.maxPrecipProb}%)` : '0.0 mm (Droog)');
  document.getElementById('evening-gusts').textContent = `${advice.eveningData.maxGusts} km/u`;
  document.getElementById('evening-status-badge').textContent = advice.eveningScore.badgeText;
  document.getElementById('evening-note').innerHTML = `<span>👉</span> ${advice.eveningScore.reasons.length ? advice.eveningScore.reasons.join(". ") : (isNextWorkday ? `Prettige terugrit op ${workdayConfig.nextWorkday.dayName.toLowerCase()}! Asfalt is droog.` : "Prettige terugreis! Asfalt is droog en goed begaanbaar.")}`;

  const maxGustOverall = Math.max(advice.morningData.maxGusts, advice.eveningData.maxGusts);
  document.getElementById('meter-wind-val').textContent = `${maxGustOverall} km/u`;
  document.getElementById('meter-wind-bft').textContent = kmhToBeaufort(maxGustOverall);
  const windPercent = Math.min(100, Math.round((maxGustOverall / 80) * 100));
  const windFill = document.getElementById('meter-wind-bar');
  windFill.style.width = `${windPercent}%`;
  const userMaxGusts = (AppState.commute && AppState.commute.maxGusts) ? AppState.commute.maxGusts : 55;
  const isDangerousGust = maxGustOverall > 75 || maxGustOverall > (userMaxGusts + 12);
  const isAlertGust = maxGustOverall > userMaxGusts || maxGustOverall > 45;
  windFill.style.background = isDangerousGust ? '#ef4444' : isAlertGust ? '#f59e0b' : '#10b981';
  document.getElementById('meter-wind-tag').textContent = isDangerousGust ? 'Gevaarlijk' : isAlertGust ? (maxGustOverall > userMaxGusts ? 'Boven limiet' : 'Alert') : 'Veilig';

  const maxRain = Math.max(advice.morningData.totalPrecip, advice.eveningData.totalPrecip);
  const gripVal = maxRain > 2.0 ? 55 : maxRain > 0.5 ? 75 : 100;
  document.getElementById('meter-grip-val').textContent = `${gripVal}%`;
  const gripFill = document.getElementById('meter-grip-bar');
  gripFill.style.width = `${gripVal}%`;
  gripFill.style.background = gripVal === 100 ? '#10b981' : gripVal > 70 ? '#f59e0b' : '#ef4444';
  document.getElementById('meter-grip-tag').textContent = gripVal === 100 ? 'Optimaal' : gripVal > 70 ? 'Vochtig' : 'Glad/Nat';
  const gripStatusHeader = document.getElementById('meter-grip-status');
  if (gripStatusHeader) {
    gripStatusHeader.textContent = gripVal === 100 ? 'Optimaal' : gripVal > 70 ? 'Vochtig' : 'Glad/Nat';
  }

  const maxProb = Math.max(advice.morningData.maxPrecipProb, advice.eveningData.maxPrecipProb);
  const rainFill = document.getElementById('meter-rain-bar');

  if (maxRain > 0.2) {
    document.getElementById('meter-rain-val').textContent = `${maxRain.toFixed(1)} mm`;
    document.getElementById('meter-rain-mm').textContent = `Kans: ${maxProb}%`;
    const rainPercent = Math.min(100, Math.max(12, Math.round((maxRain / 4.0) * 100)));
    rainFill.style.width = `${rainPercent}%`;
    rainFill.style.background = maxRain > 2.0 ? '#ef4444' : '#f59e0b';
    document.getElementById('meter-rain-tag').textContent = maxRain > 2.0 ? 'Plensbui' : 'Bui verwacht';
  } else if (maxRain > 0.05) {
    document.getElementById('meter-rain-val').textContent = `< 0.2 mm`;
    document.getElementById('meter-rain-mm').textContent = `Kans: ${maxProb}%`;
    rainFill.style.width = `15%`;
    rainFill.style.background = '#10b981';
    document.getElementById('meter-rain-tag').textContent = 'Spatje?';
  } else {
    // 0.0 mm verwacht (Droog!)
    document.getElementById('meter-rain-val').textContent = `0.0 mm`;
    document.getElementById('meter-rain-mm').textContent = maxProb > 40 ? `Regio: ${maxProb}%` : `Droog`;
    rainFill.style.width = maxProb > 50 ? '12%' : '5%';
    rainFill.style.background = '#10b981';
    document.getElementById('meter-rain-tag').textContent = maxProb > 50 ? 'Droog (0 mm)' : 'Droog';
  }

  const tempAvg = Math.round((advice.morningData.avgTemp + advice.eveningData.avgTemp) / 2);
  document.getElementById('meter-temp-val').textContent = `${tempAvg}°C`;
  const tempPercent = Math.min(100, Math.max(10, Math.round(((tempAvg + 5) / 40) * 100)));
  const tempFill = document.getElementById('meter-temp-bar');
  tempFill.style.width = `${tempPercent}%`;
  tempFill.style.background = tempAvg < 4 ? '#0284c7' : tempAvg > 29 ? '#f59e0b' : '#10b981';
  document.getElementById('meter-temp-tag').textContent = tempAvg < 4 ? 'Koud' : tempAvg > 29 ? 'Warm' : 'Behaaglijk';
  const tempStatusHeader = document.getElementById('meter-temp-status');
  if (tempStatusHeader) {
    tempStatusHeader.textContent = tempAvg < 2 ? 'Kans op gladheid!' : tempAvg < 8 ? 'Koud' : tempAvg < 15 ? 'Fris' : tempAvg <= 24 ? 'Behaaglijk' : 'Warm';
  }

  const gearContainer = document.getElementById('gear-chips-container');
  gearContainer.innerHTML = advice.gearPills.map(pill => `<span class="gear-pill">${pill}</span>`).join('');

  // Update Route Planner Promo card summary on dashboard
  const promoSummary = document.getElementById('route-promo-summary');
  const promoHint = document.getElementById('route-promo-hint');
  if (promoSummary && AppState.route) {
    promoSummary.textContent = `${AppState.route.start.name} ➔ ${AppState.route.mid.name} ➔ ${AppState.route.dest.name}`;
  }
  if (promoHint && AppState.route && AppState.route.analysis) {
    promoHint.textContent = `${AppState.route.analysis.badgeText} • Vertrek ${AppState.route.analysis.startWeather.timeStr} ➔`;
  }

  renderHourlyStrip(hourly);
  renderDailyForecast(daily);
  renderSimpleModeCard(data, advice);
  updateDayToggleUI();
}

// Render Simple Mode Card
function renderSimpleModeCard(data, advice) {
  if (!data || !data.current) return;
  if (!advice) advice = computeCommuteAdvise(data);

  const current = data.current;
  const daily = data.daily;
  const isNextWorkday = advice.isNextWorkday || (AppState.selectedDay === 'nextWorkday');
  const workdayConfig = advice.workdayConfig || getWorkdayConfig();

  // Location & Date & Time
  const cityNameEl = document.getElementById('simple-city-name');
  if (cityNameEl) cityNameEl.textContent = AppState.location.name;

  const now = new Date();
  const dateEl = document.getElementById('simple-date-str');
  if (dateEl) {
    dateEl.textContent = isNextWorkday
      ? `${formatDisplayDate(workdayConfig.nextWorkday.date)} (Volgende werkdag)`
      : formatDisplayDate(now);
  }

  const timeEl = document.getElementById('simple-update-time');
  if (timeEl) {
    timeEl.textContent = isNextWorkday ? 'Voorspelling' : formatDisplayTime(now);
  }

  // Weather condition (Live Current vs Next Workday Forecast)
  if (isNextWorkday && daily && daily.time) {
    const dayIdx = daily.time.findIndex(t => t.startsWith(workdayConfig.nextWorkday.dateStr));
    if (dayIdx >= 0) {
      const code = daily.weather_code[dayIdx] || 0;
      const wmoInfo = WMO_DICT[code] || { text: "Helder", icon: "sun", state: "sunny" };
      const maxT = Math.round(daily.temperature_2m_max[dayIdx]);
      const minT = Math.round(daily.temperature_2m_min[dayIdx]);
      const dayAvgT = Math.round((maxT + minT) / 2);

      const tempEl = document.getElementById('simple-temp');
      if (tempEl) tempEl.textContent = dayAvgT;

      const condEl = document.getElementById('simple-condition');
      if (condEl) condEl.textContent = wmoInfo.text;

      const iconEl = document.getElementById('simple-weather-icon');
      if (iconEl) iconEl.innerHTML = getWeatherSvg(wmoInfo.icon, false);

      const feelsEl = document.getElementById('simple-feels-like');
      if (feelsEl) feelsEl.textContent = `${dayAvgT}°`;

      const maxEl = document.getElementById('simple-max-temp');
      const minEl = document.getElementById('simple-min-temp');
      if (maxEl) maxEl.textContent = `${maxT}°`;
      if (minEl) minEl.textContent = `${minT}°`;

      const maxWind = Math.round(daily.wind_speed_10m_max[dayIdx] || 0);
      const maxGusts = Math.round(daily.wind_gusts_10m_max[dayIdx] || 0);
      const windTextEl = document.getElementById('simple-wind-text');
      if (windTextEl) windTextEl.textContent = `Wind: max ${maxWind} km/u • Stoten: ${maxGusts} km/u`;
    }
  } else {
    const code = current.weather_code || 0;
    const wmoInfo = WMO_DICT[code] || { text: "Helder", icon: "sun", state: "sunny" };
    const isNight = current.is_day === 0;

    const tempEl = document.getElementById('simple-temp');
    if (tempEl) tempEl.textContent = Math.round(current.temperature_2m);

    const condEl = document.getElementById('simple-condition');
    if (condEl) condEl.textContent = wmoInfo.text;

    const iconEl = document.getElementById('simple-weather-icon');
    if (iconEl) iconEl.innerHTML = getWeatherSvg(wmoInfo.icon, isNight);

    const feelsEl = document.getElementById('simple-feels-like');
    if (feelsEl) feelsEl.textContent = `${Math.round(current.apparent_temperature)}°`;

    if (daily && daily.temperature_2m_max) {
      const maxEl = document.getElementById('simple-max-temp');
      const minEl = document.getElementById('simple-min-temp');
      if (maxEl) maxEl.textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
      if (minEl) minEl.textContent = `${Math.round(daily.temperature_2m_min[0])}°`;
    }

    const windSpeed = Math.round(current.wind_speed_10m);
    const windDir = getWindDirectionText(current.wind_direction_10m);
    const windGusts = Math.round(current.wind_gusts_10m);
    const windTextEl = document.getElementById('simple-wind-text');
    if (windTextEl) windTextEl.textContent = `Wind: ${windSpeed} km/u (${windDir}) • Stoten: ${windGusts} km/u`;
  }

  // Master Verdict / Advice Banner
  const verdictCard = document.getElementById('simple-combined-card');
  const verdictPill = document.getElementById('simple-verdict-pill');
  const verdictScore = document.getElementById('simple-verdict-score');
  const verdictHeadline = document.getElementById('simple-verdict-headline');
  const verdictExpl = document.getElementById('simple-verdict-explanation');

  if (verdictHeadline) verdictHeadline.textContent = advice.dayHeadline;
  if (verdictPill) verdictPill.innerHTML = advice.dayPill;
  if (verdictScore) verdictScore.textContent = `Index: ${advice.minScore}/100`;
  if (verdictExpl) verdictExpl.textContent = advice.dayExplanation;

  if (verdictCard) verdictCard.dataset.verdict = advice.dayVerdict;
  if (verdictPill) verdictPill.dataset.verdict = advice.dayVerdict;
  if (verdictScore) verdictScore.dataset.verdict = advice.dayVerdict;

  // Commute highlights (Morning & Evening)
  const prefixSlot = isNextWorkday ? `${workdayConfig.nextWorkday.dayShort.toUpperCase()} ` : '';
  const mornTimeEl = document.getElementById('simple-morning-time');
  const mornBadgeEl = document.getElementById('simple-morning-badge');
  const mornStatusEl = document.getElementById('simple-morning-status');

  const eveTimeEl = document.getElementById('simple-evening-time');
  const eveBadgeEl = document.getElementById('simple-evening-badge');
  const eveStatusEl = document.getElementById('simple-evening-status');

  if (mornTimeEl) mornTimeEl.textContent = `(${prefixSlot}${AppState.commute.morningTime})`;
  if (eveTimeEl) eveTimeEl.textContent = `(${prefixSlot}${AppState.commute.eveningTime})`;

  if (advice.morningData && advice.morningScore) {
    if (mornBadgeEl) {
      mornBadgeEl.textContent = advice.morningScore.badgeText;
      mornBadgeEl.dataset.verdict = advice.morningScore.verdict;
    }
    if (mornStatusEl) {
      const rainText = advice.morningData.totalPrecip > 0.05 
        ? `${advice.morningData.totalPrecip} mm` 
        : (advice.morningData.maxPrecipProb > 50 ? `0.0 mm (${advice.morningData.maxPrecipProb}%)` : 'Droog (0 mm)');
      mornStatusEl.textContent = `${advice.morningData.avgTemp}°C • ${rainText} • ${advice.morningData.maxGusts} km/u`;
    }
  }

  if (advice.eveningData && advice.eveningScore) {
    if (eveBadgeEl) {
      eveBadgeEl.textContent = advice.eveningScore.badgeText;
      eveBadgeEl.dataset.verdict = advice.eveningScore.verdict;
    }
    if (eveStatusEl) {
      const rainText = advice.eveningData.totalPrecip > 0.05 
        ? `${advice.eveningData.totalPrecip} mm` 
        : (advice.eveningData.maxPrecipProb > 50 ? `0.0 mm (${advice.eveningData.maxPrecipProb}%)` : 'Droog (0 mm)');
      eveStatusEl.textContent = `${advice.eveningData.avgTemp}°C • ${rainText} • ${advice.eveningData.maxGusts} km/u`;
    }
  }

  // Simple Mode: 4 Mini Safety Gauges
  const maxGustOverall = Math.max(advice.morningData.maxGusts, advice.eveningData.maxGusts);
  const simpleWindVal = document.getElementById('simple-wind-val');
  const simpleWindTag = document.getElementById('simple-wind-tag');
  const simpleWindFill = document.getElementById('simple-wind-bar-fill');
  if (simpleWindVal) simpleWindVal.textContent = `${maxGustOverall} km/u (${kmhToBeaufort(maxGustOverall)})`;
  if (simpleWindTag) simpleWindTag.textContent = maxGustOverall > 65 ? 'Gevaarlijk' : maxGustOverall > 45 ? 'Alert' : 'Veilig';
  if (simpleWindFill) {
    simpleWindFill.style.width = `${Math.min(100, Math.max(10, Math.round((maxGustOverall / 80) * 100)))}%`;
    simpleWindFill.style.background = maxGustOverall > 65 ? '#ef4444' : maxGustOverall > 45 ? '#f59e0b' : '#10b981';
  }

  const maxRain = Math.max(advice.morningData.totalPrecip, advice.eveningData.totalPrecip);
  const gripVal = maxRain > 2.0 ? 55 : maxRain > 0.5 ? 75 : 100;
  const simpleGripVal = document.getElementById('simple-grip-val');
  const simpleGripTag = document.getElementById('simple-grip-tag');
  const simpleGripFill = document.getElementById('simple-grip-bar-fill');
  if (simpleGripVal) simpleGripVal.textContent = `${gripVal}%`;
  if (simpleGripTag) simpleGripTag.textContent = gripVal === 100 ? 'Optimaal' : gripVal > 70 ? 'Vochtig' : 'Glad/Nat';
  if (simpleGripFill) {
    simpleGripFill.style.width = `${gripVal}%`;
    simpleGripFill.style.background = gripVal === 100 ? '#10b981' : gripVal > 70 ? '#f59e0b' : '#ef4444';
  }

  const maxProb = Math.max(advice.morningData.maxPrecipProb, advice.eveningData.maxPrecipProb);
  const simpleRainVal = document.getElementById('simple-rain-val');
  const simpleRainTag = document.getElementById('simple-rain-tag');
  const simpleRainFill = document.getElementById('simple-rain-bar-fill');
  if (simpleRainVal) {
    simpleRainVal.textContent = maxRain > 0.05 ? `${maxRain.toFixed(1)} mm` : `0.0 mm (${maxProb}%)`;
  }
  if (simpleRainTag) {
    simpleRainTag.textContent = maxRain > 2.0 ? 'Plensbui' : maxRain > 0.2 ? 'Bui' : maxProb > 50 ? 'Droog' : 'Droog';
  }
  if (simpleRainFill) {
    simpleRainFill.style.width = `${Math.min(100, Math.max(8, Math.round((maxProb / 100) * 100)))}%`;
    simpleRainFill.style.background = maxRain > 1.5 ? '#ef4444' : maxRain > 0.2 ? '#f59e0b' : '#10b981';
  }

  const tempAvg = Math.round((advice.morningData.avgTemp + advice.eveningData.avgTemp) / 2);
  const simpleTempVal = document.getElementById('simple-temp-val');
  const simpleTempTag = document.getElementById('simple-temp-tag');
  const simpleTempFill = document.getElementById('simple-temp-bar-fill');
  if (simpleTempVal) simpleTempVal.textContent = `${tempAvg}°C`;
  if (simpleTempTag) simpleTempTag.textContent = tempAvg < 4 ? 'Koud' : tempAvg > 29 ? 'Warm' : 'Behaaglijk';
  if (simpleTempFill) {
    const tempPercent = Math.min(100, Math.max(10, Math.round(((tempAvg + 5) / 40) * 100)));
    simpleTempFill.style.width = `${tempPercent}%`;
    simpleTempFill.style.background = tempAvg < 4 ? '#0284c7' : tempAvg > 29 ? '#f59e0b' : '#10b981';
  }

  // Simple Mode: Gear Pills
  const simpleGearContainer = document.getElementById('simple-gear-chips');
  if (simpleGearContainer && advice.gearPills) {
    simpleGearContainer.innerHTML = advice.gearPills.map(pill => `<span class="gear-pill">${pill}</span>`).join('');
  }
}

// Render Hourly Strip
function renderHourlyStrip(hourly) {
  const strip = document.getElementById('hourly-strip');
  if (!strip || !hourly || !hourly.time) return;

  const isNextWorkday = AppState.selectedDay === 'nextWorkday';
  const workdayConfig = getWorkdayConfig();
  const activeDateStr = isNextWorkday ? workdayConfig.nextWorkday.dateStr : workdayConfig.today.dateStr;

  const now = new Date();
  const currentTimestamp = now.getTime();

  let startIdx = 0;
  let currentIdx = -1;

  if (isNextWorkday) {
    const dayStartIndex = hourly.time.findIndex(t => t.startsWith(`${activeDateStr}T06:00`));
    if (dayStartIndex !== -1) {
      startIdx = dayStartIndex;
    } else {
      const firstDayIndex = hourly.time.findIndex(t => t.startsWith(activeDateStr));
      startIdx = firstDayIndex !== -1 ? firstDayIndex : 0;
    }
  } else {
    let minDiff = Infinity;
    for (let i = 0; i < hourly.time.length; i++) {
      const t = new Date(hourly.time[i]).getTime();
      const diff = Math.abs(t - currentTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        currentIdx = i;
      }
    }
    startIdx = Math.max(0, currentIdx - 1);
  }

  const endIdx = Math.min(hourly.time.length, startIdx + 28);
  const morningHour = parseInt(AppState.commute.morningTime.split(':')[0], 10);
  const eveningHour = parseInt(AppState.commute.eveningTime.split(':')[0], 10);

  let html = '';
  for (let i = startIdx; i < endIdx; i++) {
    const timeObj = new Date(hourly.time[i]);
    const hourNum = timeObj.getHours();
    const hourStr = `${hourNum.toString().padStart(2, '0')}:00`;
    const temp = Math.round(hourly.temperature_2m[i]);
    const rainProb = hourly.precipitation_probability[i] || 0;
    const precip = (hourly.precipitation && hourly.precipitation[i] !== undefined) ? hourly.precipitation[i] : 0;
    const code = hourly.weather_code[i] || 0;
    const iconType = (WMO_DICT[code] || {}).icon || 'sun';
    const isNight = hourNum < 6 || hourNum > 21;

    let rainDisplay = '';
    let rainTooltip = '';
    if (precip >= 0.2) {
      rainDisplay = `💧${precip.toFixed(1)}m`;
      rainTooltip = `${precip.toFixed(1)} mm regen verwacht (kans: ${rainProb}%)`;
    } else if (precip > 0.05) {
      rainDisplay = `💧<0.2m`;
      rainTooltip = `Mogelijk enkel spatje (<0.2 mm, kans: ${rainProb}%)`;
    } else if (rainProb > 45) {
      rainDisplay = `⛅0mm`;
      rainTooltip = `Droog (0.0 mm), buienkans in regio: ${rainProb}%`;
    } else {
      rainDisplay = `☀️0%`;
      rainTooltip = `Droog (0.0 mm, regenkans: ${rainProb}%)`;
    }

    const isCurrent = !isNextWorkday && (i === currentIdx);
    let commuteClass = '';

    if (isCurrent) {
      commuteClass = 'is-current-hour';
    } else if (hourly.time[i].startsWith(activeDateStr)) {
      if (hourNum === morningHour) {
        commuteClass = 'is-commute-morning';
      } else if (hourNum === eveningHour) {
        commuteClass = 'is-commute-evening';
      }
    }

    html += `
      <div class="hour-chip ${commuteClass}" title="${isCurrent ? `Huidig uur (${hourStr})` : hourStr}: ${temp}°C • ${rainTooltip}">
        <span class="hour-time">${hourStr}</span>
        <div class="hour-icon">${getWeatherSvg(iconType, isNight)}</div>
        <span class="hour-temp">${temp}°</span>
        <span class="hour-rain">${rainDisplay}</span>
      </div>
    `;
  }
  strip.innerHTML = html;
  strip.scrollLeft = 0;
}

// Render 7-Day Forecast
function renderDailyForecast(daily) {
  const container = document.getElementById('daily-list');
  if (!container || !daily || !daily.time) return;

  const dayNames = ['Zon', 'Maa', 'Din', 'Woe', 'Don', 'Vri', 'Zat'];
  let html = '';

  const count = Math.min(7, daily.time.length);
  for (let i = 0; i < count; i++) {
    const d = new Date(daily.time[i] + 'T00:00:00');
    const name = i === 0 ? 'Vandaag' : i === 1 ? 'Morgen' : dayNames[d.getDay()];
    const code = daily.weather_code[i] || 0;
    const iconType = (WMO_DICT[code] || {}).icon || 'sun';
    const minTemp = Math.round(daily.temperature_2m_min[i]);
    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const rainSum = daily.precipitation_sum[i] || 0;
    const rainProb = daily.precipitation_probability_max[i] || 0;

    const barLeft = Math.max(5, Math.min(65, ((minTemp + 5) / 35) * 100));
    const rawBarWidth = Math.max(15, Math.min(75, ((maxTemp - minTemp) / 20) * 80));
    const safeBarWidth = Math.min(rawBarWidth, Math.max(12, 96 - barLeft));

    let rainDisplay = '';
    let rainTooltip = '';
    if (rainSum > 0.2) {
      rainDisplay = `🌧️ ${rainSum.toFixed(1)}m`;
      rainTooltip = `${rainSum.toFixed(1)} mm neerslagsom (max kans: ${rainProb}%)`;
    } else if (rainProb > 45) {
      rainDisplay = `⛅ 0mm`;
      rainTooltip = `Droog (0.0 mm), lokale kans in regio: ${rainProb}%`;
    } else {
      rainDisplay = `☀️ 0%`;
      rainTooltip = `Droog (0.0 mm, max kans: ${rainProb}%)`;
    }

    html += `
      <div class="daily-row" title="${name}: min ${minTemp}°, max ${maxTemp}°, ${rainTooltip}">
        <span class="daily-name">${name}</span>
        <div class="daily-icon">${getWeatherSvg(iconType, false)}</div>
        <div class="daily-temp-bar-container">
          <span class="daily-min">${minTemp}°</span>
          <div class="temp-bar-track">
            <div class="temp-bar-fill" style="left: ${barLeft}%; width: ${safeBarWidth}%;"></div>
          </div>
          <span class="daily-max">${maxTemp}°</span>
        </div>
        <span class="daily-rain-pill">${rainDisplay}</span>
      </div>
    `;
  }
  container.innerHTML = html;
}

// Setup Modal & Button Handlers
function setupModalEvents() {
  let lastFocusedElement = null;

  // Focus trap helper for accessible modal dialogs
  const handleModalTrap = (e, modal, closeFn) => {
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  // --- Dedicated Location Modal ---
  const locModal = document.getElementById('location-modal');
  const openLocBtn = document.getElementById('open-location-btn');
  const closeLocBtn = document.getElementById('close-location-modal-btn');
  const searchInput = document.getElementById('location-search-input');
  const resultsList = document.getElementById('search-results-list');
  const modalGpsBtn = document.getElementById('modal-gps-btn');

  const openLocationModal = () => {
    if (!locModal) return;
    lastFocusedElement = document.activeElement;
    if (openLocBtn) openLocBtn.setAttribute('aria-expanded', 'true');
    renderPresetCityChips();
    locModal.classList.add('open');
    if (searchInput) {
      searchInput.value = '';
    }
    if (resultsList) {
      resultsList.classList.remove('show');
      resultsList.innerHTML = '';
    }

    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 60);
  };

  const closeLocationModal = () => {
    if (!locModal) return;
    locModal.classList.remove('open');
    if (resultsList) resultsList.classList.remove('show');
    if (openLocBtn) openLocBtn.setAttribute('aria-expanded', 'false');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  };

  if (openLocBtn) openLocBtn.addEventListener('click', openLocationModal);
  if (closeLocBtn) closeLocBtn.addEventListener('click', closeLocationModal);
  if (locModal) {
    locModal.addEventListener('click', (e) => {
      if (e.target === locModal) closeLocationModal();
    });
    locModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLocationModal();
      } else {
        handleModalTrap(e, locModal, closeLocationModal);
      }
    });
  }

  // Quick-click on hero city header also triggers location picker
  const heroCityEl = document.getElementById('hero-city-name');
  if (heroCityEl) {
    heroCityEl.style.cursor = 'pointer';
    heroCityEl.setAttribute('title', 'Klik om locatie te wijzigen');
    heroCityEl.addEventListener('click', openLocationModal);
  }

  const simpleCityEl = document.getElementById('simple-city-name');
  if (simpleCityEl) {
    simpleCityEl.style.cursor = 'pointer';
    simpleCityEl.setAttribute('title', 'Klik om locatie te wijzigen');
    simpleCityEl.addEventListener('click', openLocationModal);
  }

  // Simple View Header Trigger: Click or Enter/Space opens Location Modal
  const simpleLocTrigger = document.getElementById('simple-loc-trigger');
  if (simpleLocTrigger) {
    simpleLocTrigger.addEventListener('click', openLocationModal);
    simpleLocTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLocationModal();
      }
    });
  }

  // Simple View Switch Button
  const simpleExitBtn = document.getElementById('simple-exit-btn');
  if (simpleExitBtn) {
    simpleExitBtn.addEventListener('click', () => toggleSimpleMode(false));
  }

  // Simple View Quick Theme Switcher
  const simpleThemeBtn = document.getElementById('simple-theme-btn');
  if (simpleThemeBtn) {
    simpleThemeBtn.addEventListener('click', cycleTheme);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleLocationSearch(e.target.value));
  }

  // Delegated click handler on search results
  if (resultsList) {
    resultsList.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (item) {
        const lat = parseFloat(item.dataset.lat);
        const lon = parseFloat(item.dataset.lon);
        const name = item.dataset.name;
        const country = item.dataset.country || 'NL';
        selectNewLocation(name, lat, lon, country);
      }
    });
  }

  // Delegated click handler on preset city chips
  const presetContainer = document.getElementById('preset-cities-container');
  if (presetContainer) {
    presetContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.location-city-chip');
      if (btn) {
        const lat = parseFloat(btn.dataset.lat);
        const lon = parseFloat(btn.dataset.lon);
        const name = btn.dataset.name;
        selectNewLocation(name, lat, lon, 'NL');
      }
    });
  }

  if (modalGpsBtn) {
    modalGpsBtn.addEventListener('click', () => {
      closeLocationModal();
      requestGPSLocation();
    });
  }

  // --- Dedicated Settings Modal ---
  const settingsModal = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-modal-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  const selMorning = document.getElementById('setting-morning-time');
  const selEvening = document.getElementById('setting-evening-time');
  const rangeMinTemp = document.getElementById('setting-min-temp');
  const rangeMaxGusts = document.getElementById('setting-max-gusts');

  // Theme buttons inside settings modal
  const themeBtnLight = document.getElementById('theme-btn-light');
  const themeBtnAuto = document.getElementById('theme-btn-auto');
  const themeBtnDark = document.getElementById('theme-btn-dark');
  if (themeBtnLight) themeBtnLight.addEventListener('click', () => applyTheme('light'));
  if (themeBtnAuto) themeBtnAuto.addEventListener('click', () => applyTheme('auto'));
  if (themeBtnDark) themeBtnDark.addEventListener('click', () => applyTheme('dark'));

  const openSettingsModal = () => {
    if (!settingsModal) return;
    lastFocusedElement = document.activeElement;
    if (openSettingsBtn) openSettingsBtn.setAttribute('aria-expanded', 'true');

    if (selMorning) {
      if (!Array.from(selMorning.options).some(opt => opt.value === AppState.commute.morningTime)) {
        const opt = document.createElement('option');
        opt.value = AppState.commute.morningTime;
        opt.textContent = AppState.commute.morningTime;
        selMorning.appendChild(opt);
      }
      selMorning.value = AppState.commute.morningTime;
    }

    if (selEvening) {
      if (!Array.from(selEvening.options).some(opt => opt.value === AppState.commute.eveningTime)) {
        const opt = document.createElement('option');
        opt.value = AppState.commute.eveningTime;
        opt.textContent = AppState.commute.eveningTime;
        selEvening.appendChild(opt);
      }
      selEvening.value = AppState.commute.eveningTime;
    }

    if (rangeMinTemp) rangeMinTemp.value = AppState.commute.minTemp;
    if (rangeMaxGusts) rangeMaxGusts.value = AppState.commute.maxGusts;
    const valMorning = document.getElementById('val-morning-time');
    if (valMorning) valMorning.textContent = AppState.commute.morningTime;
    const valEvening = document.getElementById('val-evening-time');
    if (valEvening) valEvening.textContent = AppState.commute.eveningTime;
    const valMinTemp = document.getElementById('val-min-temp');
    if (valMinTemp) valMinTemp.textContent = `${AppState.commute.minTemp}°C`;
    const valMaxGusts = document.getElementById('val-max-gusts');
    if (valMaxGusts) valMaxGusts.textContent = `${AppState.commute.maxGusts} km/u`;

    updateThemeButtonsUI();
    settingsModal.classList.add('open');
    setTimeout(() => {
      if (selMorning) selMorning.focus();
    }, 60);
  };

  const closeSettingsModal = () => {
    if (!settingsModal) return;
    settingsModal.classList.remove('open');
    if (openSettingsBtn) openSettingsBtn.setAttribute('aria-expanded', 'false');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  };

  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
    settingsModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSettingsModal();
      } else {
        handleModalTrap(e, settingsModal, closeSettingsModal);
      }
    });
  }

  if (selMorning) {
    selMorning.addEventListener('change', (e) => {
      const el = document.getElementById('val-morning-time');
      if (el) el.textContent = e.target.value;
    });
  }
  if (selEvening) {
    selEvening.addEventListener('change', (e) => {
      const el = document.getElementById('val-evening-time');
      if (el) el.textContent = e.target.value;
    });
  }
  if (rangeMinTemp) {
    rangeMinTemp.addEventListener('input', (e) => {
      const el = document.getElementById('val-min-temp');
      if (el) el.textContent = `${e.target.value}°C`;
    });
  }
  if (rangeMaxGusts) {
    rangeMaxGusts.addEventListener('input', (e) => {
      const el = document.getElementById('val-max-gusts');
      if (el) el.textContent = `${e.target.value} km/u`;
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      AppState.commute.morningTime = selMorning.value;
      AppState.commute.eveningTime = selEvening.value;
      AppState.commute.minTemp = parseInt(rangeMinTemp.value, 10);
      AppState.commute.maxGusts = parseInt(rangeMaxGusts.value, 10);
      saveState();
      closeSettingsModal();
      if (AppState.weatherData) {
        renderDashboard(AppState.weatherData);
        showToast("Instellingen opgeslagen & advies herrekend!");
      }
    });
  }
}

// Synchronize Theme Buttons in Settings Modal
function updateThemeButtonsUI() {
  ['light', 'auto', 'dark'].forEach(mode => {
    const btn = document.getElementById(`theme-btn-${mode}`);
    if (btn) {
      if (AppState.theme === mode) {
        btn.classList.add('is-current');
      } else {
        btn.classList.remove('is-current');
      }
    }
  });
}

// Global Listeners: Fullscreen & Hash
document.addEventListener('fullscreenchange', () => {
  const isFs = !!document.fullscreenElement;
  if (isFs) {
    document.documentElement.classList.add('is-fullscreen');
  } else {
    document.documentElement.classList.remove('is-fullscreen');
  }
  syncUrlHash(isFs, AppState.isSimpleMode);
  updateFullscreenScale();
  updateFullscreenButtonUI(isFs);
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash;
  const isFs = hash.includes('fullscreen');
  const isSimple = hash.includes('simple');

  if (isSimple !== AppState.isSimpleMode) {
    AppState.isSimpleMode = isSimple;
    updateSimpleModeUI(isSimple);
  }

  if (isFs) {
    document.documentElement.classList.add('is-fullscreen');
    updateFullscreenScale();
    updateFullscreenButtonUI(true);
  } else {
    document.documentElement.classList.remove('is-fullscreen');
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    updateFullscreenScale();
    updateFullscreenButtonUI(false);
  }
});

let resizeRafId = null;
window.addEventListener('resize', () => {
  if (resizeRafId) cancelAnimationFrame(resizeRafId);
  resizeRafId = requestAnimationFrame(() => {
    updateFullscreenScale();
  });
});

// Refresh, GPS, Theme, Simple Mode & Fullscreen Button Handlers
document.getElementById('refresh-btn').addEventListener('click', () => {
  fetchWeatherData(AppState.location.latitude, AppState.location.longitude, true);
  loadRouteAndAnalyze(true);
});
document.getElementById('gps-btn').addEventListener('click', requestGPSLocation);
const simpleModeBtn = document.getElementById('simple-mode-btn');
if (simpleModeBtn) {
  simpleModeBtn.addEventListener('click', () => toggleSimpleMode());
}
document.getElementById('fullscreen-btn').addEventListener('click', toggleFullScreen);
document.getElementById('theme-toggle-btn').addEventListener('click', cycleTheme);

// ============================================================================
// ROUTE PLANNER CONTROLLER (Start ➔ Halverwege ➔ Bestemming met 30m tijdvakken)
// ============================================================================

let routeSearchDebounceTimer = null;
let currentFocusedWaypoint = 'start'; // 'start' | 'mid' | 'dest'

function openRoutePlannerModal() {
  const modal = document.getElementById('route-planner-modal');
  const openBtn = document.getElementById('open-route-planner-btn');
  if (!modal) return;

  lastFocusedElement = document.activeElement;
  if (openBtn) openBtn.setAttribute('aria-expanded', 'true');

  // Sync inputs with state
  const startInput = document.getElementById('route-start-input');
  const midInput = document.getElementById('route-mid-input');
  const destInput = document.getElementById('route-dest-input');

  if (startInput) startInput.value = AppState.route.start.name;
  if (midInput) midInput.value = AppState.route.mid.name;
  if (destInput) destInput.value = AppState.route.dest.name;

  // Sync Duration Chips
  updateRouteDurationChipsUI();

  // Sync Departure Offset Chips & Time Input
  updateRouteDepartureUI();

  // Render Preset City Chips Helper
  renderRoutePresetChips();

  modal.classList.add('open');

  // Trigger route analysis & weather fetch
  loadRouteAndAnalyze(false);
}

function closeRoutePlannerModal() {
  const modal = document.getElementById('route-planner-modal');
  const openBtn = document.getElementById('open-route-planner-btn');
  if (!modal) return;

  modal.classList.remove('open');
  if (openBtn) openBtn.setAttribute('aria-expanded', 'false');

  // Close all open search dropdowns
  ['start', 'mid', 'dest'].forEach(key => {
    const drop = document.getElementById(`route-${key}-results`);
    if (drop) {
      drop.classList.remove('show');
      drop.innerHTML = '';
    }
  });

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

function updateRouteDurationChipsUI() {
  const container = document.getElementById('route-duration-buttons');
  if (!container) return;
  const currentDuration = AppState.route.legDurationMinutes || 30;
  const buttons = container.querySelectorAll('.route-chip-btn');
  buttons.forEach(btn => {
    const d = parseInt(btn.dataset.duration, 10);
    if (d === currentDuration) {
      btn.classList.add('is-active');
    } else {
      btn.classList.remove('is-active');
    }
  });
}

function updateRouteDepartureUI() {
  const chips = document.getElementById('route-offset-chips');
  const timeInput = document.getElementById('route-custom-time-input');
  const currentOffset = AppState.route.timeOffsetMinutes || 0;

  if (chips) {
    const buttons = chips.querySelectorAll('.route-offset-btn');
    buttons.forEach(btn => {
      const off = parseInt(btn.dataset.offset, 10);
      if (off === currentOffset) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  }

  if (timeInput) {
    if (AppState.route.customTime) {
      timeInput.value = AppState.route.customTime;
    } else {
      const now = new Date();
      timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  }
}

function renderRoutePresetChips() {
  const container = document.getElementById('route-preset-chips');
  if (!container) return;

  container.innerHTML = PRESET_CITIES.slice(0, 8).map(city => {
    const safeName = escapeHtml(city.name);
    return `<button type="button" class="route-preset-chip" data-name="${safeName}" data-lat="${city.lat}" data-lon="${city.lon}">${safeName}</button>`;
  }).join('');
}

function handleRouteWaypointSearch(query, targetKey) {
  clearTimeout(routeSearchDebounceTimer);
  const resultsContainer = document.getElementById(`route-${targetKey}-results`);
  if (!resultsContainer) return;

  const trimmed = (query || '').trim();
  if (trimmed.length < 2) {
    resultsContainer.classList.remove('show');
    resultsContainer.innerHTML = '';
    return;
  }

  const cacheKey = trimmed.toLowerCase();
  if (geocodingCache.has(cacheKey)) {
    renderRouteSearchResults(geocodingCache.get(cacheKey), targetKey);
    return;
  }

  routeSearchDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=nl&format=json`);
      if (!res.ok) return;
      const data = await res.json();
      const results = (data && data.results) ? data.results : [];
      geocodingCache.set(cacheKey, results);
      renderRouteSearchResults(results, targetKey);
    } catch (err) {
      console.error("Fout bij route geocoding:", err);
    }
  }, 220);
}

function renderRouteSearchResults(results, targetKey) {
  const resultsContainer = document.getElementById(`route-${targetKey}-results`);
  if (!resultsContainer) return;

  if (results && results.length > 0) {
    const sorted = [...results].sort((a, b) => {
      const aNL = (a.country_code || '').toUpperCase() === 'NL' ? 0 : 1;
      const bNL = (b.country_code || '').toUpperCase() === 'NL' ? 0 : 1;
      return aNL - bNL;
    });

    resultsContainer.innerHTML = sorted.map(item => {
      const safeName = escapeHtml(item.name);
      const safeCountry = escapeHtml(item.country_code || item.country || 'NL');
      const safeRegion = escapeHtml(item.admin1 || item.country || '');
      return `
        <div class="route-search-item" data-key="${targetKey}" data-lat="${Number(item.latitude)}" data-lon="${Number(item.longitude)}" data-name="${safeName}" data-country="${safeCountry}">
          <span><strong>${safeName}</strong> <small style="opacity:0.75;">(${safeCountry})</small></span>
          <span style="font-size:0.7rem; color:var(--text-muted);">${safeRegion}</span>
        </div>
      `;
    }).join('');
    resultsContainer.classList.add('show');
  } else {
    resultsContainer.innerHTML = `<div style="padding:8px;font-size:0.75rem;color:var(--text-muted);text-align:center;">Geen resultaten gevonden</div>`;
    resultsContainer.classList.add('show');
  }
}

function selectRouteWaypoint(targetKey, name, lat, lon, country = 'NL') {
  AppState.route[targetKey] = {
    name,
    lat: Number(lat),
    lon: Number(lon),
    country
  };

  const input = document.getElementById(`route-${targetKey}-input`);
  if (input) input.value = name;

  const resultsContainer = document.getElementById(`route-${targetKey}-results`);
  if (resultsContainer) {
    resultsContainer.classList.remove('show');
    resultsContainer.innerHTML = '';
  }

  saveState();
  loadRouteAndAnalyze(false);
  showToast(`${name} geselecteerd voor route!`);
}

function swapRouteEndpoints() {
  const temp = AppState.route.start;
  AppState.route.start = AppState.route.dest;
  AppState.route.dest = temp;

  const startInput = document.getElementById('route-start-input');
  const destInput = document.getElementById('route-dest-input');
  if (startInput) startInput.value = AppState.route.start.name;
  if (destInput) destInput.value = AppState.route.dest.name;

  saveState();
  loadRouteAndAnalyze(false);
  showToast("Route omgedraaid! 🔄");
}

async function setStartWaypointFromGPS() {
  if (!navigator.geolocation) {
    showToast("GPS wordt niet ondersteund door je browser");
    return;
  }

  showToast("Huidige GPS positie bepalen...");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      let placeName = 'Mijn Locatie';

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
          headers: { 'Accept-Language': 'nl' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            placeName = data.address.city || data.address.town || data.address.village || data.address.municipality || 'Mijn Locatie';
          }
        }
      } catch (err) {
        console.warn("Reverse geocode startlocatie:", err);
      }

      selectRouteWaypoint('start', placeName, lat, lon, 'NL');
    },
    (err) => {
      console.warn("GPS fout startlocatie:", err);
      showToast("GPS toegang geweigerd of mislukt");
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// Fetch weather data for all 3 waypoints & analyze
async function loadRouteAndAnalyze(force = false) {
  const loadingState = document.getElementById('route-loading-state');
  if (loadingState) loadingState.style.display = 'flex';

  try {
    const waypointsWeather = await fetchRouteWeather(
      AppState.route.start,
      AppState.route.mid,
      AppState.route.dest,
      force
    );
    AppState.route.waypointsWeather = waypointsWeather;
    renderRouteAnalysis();
  } catch (err) {
    console.error("Fout bij ophalen route weerdata:", err);
    showToast("Fout bij laden van routeweer via KNMI.");
  } finally {
    if (loadingState) loadingState.style.display = 'none';
  }
}

function getEffectiveDepartureDate() {
  const baseDate = new Date();

  if (AppState.route.customTime) {
    const parts = AppState.route.customTime.split(':');
    if (parts.length === 2) {
      baseDate.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    }
  }

  const offsetMs = (AppState.route.timeOffsetMinutes || 0) * 60 * 1000;
  return new Date(baseDate.getTime() + offsetMs);
}

function renderRouteAnalysis() {
  if (!AppState.route.waypointsWeather || !AppState.route.waypointsWeather.start) {
    return;
  }

  const departureDate = getEffectiveDepartureDate();
  const evaluation = RouteEngine.evaluateRoute(
    AppState.route,
    AppState.route.waypointsWeather,
    departureDate
  );

  if (!evaluation) return;
  AppState.route.analysis = evaluation;

  // 1. Render Verdict Banner
  const banner = document.getElementById('route-verdict-banner');
  const badge = document.getElementById('route-verdict-badge');
  const headline = document.getElementById('route-verdict-headline');
  const explanation = document.getElementById('route-verdict-explanation');
  const tip = document.getElementById('route-verdict-tip');

  if (banner) {
    banner.className = `route-verdict-banner verdict-${evaluation.verdict}`;
  }
  if (badge) badge.textContent = evaluation.badgeText;
  if (headline) headline.textContent = evaluation.headline;
  if (explanation) explanation.textContent = evaluation.explanation;
  if (tip) tip.textContent = evaluation.adviceTip;

  // 2. Render Score Badge
  const scoreBadge = document.getElementById('route-score-badge');
  if (scoreBadge) {
    scoreBadge.textContent = `Ritveiligheid: ${evaluation.score}/100`;
  }

  // Helper: Generate HTML for 3-waypoint timeline stages
  const generateStagesTimelineHtml = (evalData) => {
    const sw = evalData.startWeather;
    const mw = evalData.midWeather;
    const dw = evalData.destWeather;

    const renderStageBox = (markerClass, letter, name, weather) => {
      const hasHeavy = weather.precip >= 1.0;
      const hasRain = weather.precip >= 0.15;
      const wetClass = hasHeavy ? 'has-heavy-rain' : hasRain ? 'has-rain' : '';
      const rainLabel = weather.precip > 0 ? `${weather.precip} mm` : '0.0 mm';
      const rainClass = hasRain ? 'is-wet' : '';
      const svgIcon = getWeatherSvg(weather.iconType, weather.isNight);

      return `
        <div class="route-stage-step ${wetClass}">
          <div class="route-stage-top">
            <div class="route-stage-pin">
              <span class="route-stage-marker-dot ${markerClass}">${letter}</span>
              <span class="route-stage-city" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
            </div>
            <span class="route-stage-time">${weather.timeStr}</span>
          </div>
          <div class="route-stage-metrics">
            <div class="route-stage-temp">${weather.temp}°</div>
            <div class="route-stage-icon">${svgIcon}</div>
          </div>
          <div class="route-stage-rain ${rainClass}">
            <span>💧 ${rainLabel}</span>
            <span style="font-size:0.7rem;opacity:0.8;">(${weather.precipProb}%)</span>
          </div>
          <div class="route-stage-wind">
            💨 ${weather.windSpeed} km/u <span style="opacity:0.8;">(stoot ${weather.windGusts})</span>
          </div>
        </div>
      `;
    };

    const renderConnector = (legNum, legData) => {
      const isWet = legData.maxPrecip >= 0.15;
      const badgeText = isWet ? `⚠️ ${legData.maxPrecip} mm` : 'Droog';
      const badgeClass = isWet ? 'wet' : 'dry';
      return `
        <div class="route-leg-connector">
          <div class="route-leg-arrow">➔</div>
          <div class="route-leg-duration">${evalData.legMinutes}m</div>
          <div class="route-leg-rain-badge ${badgeClass}" title="Tussenliggende regenscan">${badgeText}</div>
        </div>
      `;
    };

    return `
      ${renderStageBox('marker-start', 'A', AppState.route.start.name, sw)}
      ${renderConnector(1, evalData.leg1)}
      ${renderStageBox('marker-mid', 'B', AppState.route.mid.name, mw)}
      ${renderConnector(2, evalData.leg2)}
      ${renderStageBox('marker-dest', 'C', AppState.route.dest.name, dw)}
    `;
  };

  const stagesHtml = generateStagesTimelineHtml(evaluation);

  // 3. Render 3-Waypoints Stages Timeline in Modal
  const timeline = document.getElementById('route-stages-timeline');
  if (timeline) {
    timeline.innerHTML = stagesHtml;
  }

  // 3b. Render 3-Waypoints Stages Timeline in Dashboard Widget
  const dashTimeline = document.getElementById('dashboard-route-stages-timeline');
  if (dashTimeline) {
    dashTimeline.innerHTML = stagesHtml;
  }

  // 4. Update Dashboard Widget Header & Footer Note (Rustig, clean & netjes)
  const dashScore = document.getElementById('dashboard-route-score-badge');
  if (dashScore) {
    dashScore.textContent = `Ritveiligheid: ${evaluation.score}/100`;
  }

  const dashSummaryTag = document.getElementById('dashboard-route-summary-tag');
  if (dashSummaryTag) {
    dashSummaryTag.textContent = `${AppState.route.start.name} ➔ ${AppState.route.mid.name} ➔ ${AppState.route.dest.name}`;
  }

  const dashFooterNote = document.getElementById('dashboard-route-footer-note');
  const dashNoteText = document.getElementById('dashboard-route-note-text');
  if (dashFooterNote && dashNoteText) {
    dashFooterNote.className = `dashboard-route-footer-note verdict-${evaluation.verdict}`;
    const totalMins = evaluation.totalMinutes || (evaluation.legMinutes * 2);
    // Strip leading emojis to keep it clean, quiet and calm
    const cleanBadge = (evaluation.badgeText || '').replace(/^[🟢🟡🔴⚠️]\s*/, '');
    dashNoteText.textContent = `${cleanBadge} • Totale reistijd ${totalMins}m (${evaluation.legMinutes}m per etappe)`;
  }

  // 5. Render Alternative Departure Slots Strip in Modal
  const alternativesStrip = document.getElementById('route-alternatives-strip');
  if (alternativesStrip) {
    const baseDate = new Date();
    if (AppState.route.customTime) {
      const parts = AppState.route.customTime.split(':');
      if (parts.length === 2) {
        baseDate.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      }
    }

    const alts = RouteEngine.computeDepartureAlternatives(
      AppState.route,
      AppState.route.waypointsWeather,
      baseDate
    );

    alternativesStrip.innerHTML = alts.slots.map(slot => {
      const isCurrent = slot.offsetMinutes === (AppState.route.timeOffsetMinutes || 0);
      const selectedClass = isCurrent ? 'is-selected' : '';
      const rainText = slot.maxRain > 0 ? `💧 ${slot.maxRain.toFixed(1)} mm` : '🟢 Droog';
      return `
        <button type="button" class="route-alt-slot slot-${slot.verdict} ${selectedClass}" data-offset="${slot.offsetMinutes}">
          <span class="route-alt-label">${slot.label}</span>
          <span class="route-alt-time">${slot.departureTimeStr}</span>
          <span class="route-alt-rain">${rainText}</span>
        </button>
      `;
    }).join('');
  }
}

function setupRoutePlannerEvents() {
  const openBtn = document.getElementById('open-route-planner-btn');
  const closeBtn = document.getElementById('close-route-modal-btn');
  const modal = document.getElementById('route-planner-modal');
  const swapBtn = document.getElementById('route-swap-btn');
  const startGpsBtn = document.getElementById('route-start-gps-btn');
  const refreshBtn = document.getElementById('route-refresh-btn');

  // Dashboard Widget triggers
  const dashEditBtn = document.getElementById('dashboard-route-edit-btn');
  const dashSwapBtn = document.getElementById('dashboard-route-swap-btn');
  const dashTimeline = document.getElementById('dashboard-route-stages-timeline');
  const dashFooterNote = document.getElementById('dashboard-route-footer-note');

  if (openBtn) openBtn.addEventListener('click', openRoutePlannerModal);
  if (dashEditBtn) dashEditBtn.addEventListener('click', openRoutePlannerModal);
  if (dashTimeline) dashTimeline.addEventListener('click', openRoutePlannerModal);
  if (dashFooterNote) {
    dashFooterNote.addEventListener('click', openRoutePlannerModal);
    dashFooterNote.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openRoutePlannerModal();
      }
    });
  }
  if (dashSwapBtn) dashSwapBtn.addEventListener('click', swapRouteEndpoints);
  if (closeBtn) closeBtn.addEventListener('click', closeRoutePlannerModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeRoutePlannerModal();
    });
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRoutePlannerModal();
      } else {
        handleModalTrap(e, modal, closeRoutePlannerModal);
      }
    });
  }

  if (swapBtn) swapBtn.addEventListener('click', swapRouteEndpoints);
  if (startGpsBtn) startGpsBtn.addEventListener('click', setStartWaypointFromGPS);
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadRouteAndAnalyze(true));

  // Waypoint inputs & focus tracking
  ['start', 'mid', 'dest'].forEach(key => {
    const input = document.getElementById(`route-${key}-input`);
    if (input) {
      input.addEventListener('focus', () => {
        currentFocusedWaypoint = key;
      });
      input.addEventListener('input', (e) => {
        handleRouteWaypointSearch(e.target.value, key);
      });
    }

    // Delegated click on search results
    const resultsContainer = document.getElementById(`route-${key}-results`);
    if (resultsContainer) {
      resultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.route-search-item');
        if (item) {
          const targetKey = item.dataset.key;
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          const name = item.dataset.name;
          const country = item.dataset.country || 'NL';
          selectRouteWaypoint(targetKey, name, lat, lon, country);
        }
      });
    }
  });

  // Preset chips helper for waypoints
  const presetChipsContainer = document.getElementById('route-preset-chips');
  if (presetChipsContainer) {
    presetChipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.route-preset-chip');
      if (chip) {
        const name = chip.dataset.name;
        const lat = parseFloat(chip.dataset.lat);
        const lon = parseFloat(chip.dataset.lon);
        selectRouteWaypoint(currentFocusedWaypoint || 'mid', name, lat, lon, 'NL');
      }
    });
  }

  // Duration buttons (15m, 30m, 45m, 60m)
  const durationButtons = document.getElementById('route-duration-buttons');
  if (durationButtons) {
    durationButtons.addEventListener('click', (e) => {
      const btn = e.target.closest('.route-chip-btn');
      if (btn) {
        const duration = parseInt(btn.dataset.duration, 10);
        AppState.route.legDurationMinutes = duration;
        updateRouteDurationChipsUI();
        saveState();
        renderRouteAnalysis();
      }
    });
  }

  // Departure offset chips (Nu, +15m, +30m, +45m, +60m)
  const offsetChips = document.getElementById('route-offset-chips');
  if (offsetChips) {
    offsetChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.route-offset-btn');
      if (btn) {
        const offset = parseInt(btn.dataset.offset, 10);
        AppState.route.timeOffsetMinutes = offset;
        updateRouteDepartureUI();
        renderRouteAnalysis();
      }
    });
  }

  // Custom Time Input
  const customTimeInput = document.getElementById('route-custom-time-input');
  if (customTimeInput) {
    customTimeInput.addEventListener('change', (e) => {
      AppState.route.customTime = e.target.value;
      AppState.route.timeOffsetMinutes = 0;
      updateRouteDepartureUI();
      renderRouteAnalysis();
    });
  }

  // Alternatives strip click
  const alternativesStrip = document.getElementById('route-alternatives-strip');
  if (alternativesStrip) {
    alternativesStrip.addEventListener('click', (e) => {
      const slotBtn = e.target.closest('.route-alt-slot');
      if (slotBtn) {
        const offset = parseInt(slotBtn.dataset.offset, 10);
        AppState.route.timeOffsetMinutes = offset;
        updateRouteDepartureUI();
        renderRouteAnalysis();
      }
    });
  }
}

// Initial Start & Smart Lifecycle Management
window.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  checkInitialHashModes();
  updateFullscreenScale();
  renderPresetCityChips();
  updateThemeButtonsUI();
  setupDayToggleEvents();
  updateDayToggleUI();
  setupModalEvents();
  setupRoutePlannerEvents();
  fetchWeatherData(AppState.location.latitude, AppState.location.longitude, false);
  loadRouteAndAnalyze(false);
  startWeatherPolling();

  // Page Visibility Awareness: refresh if data is stale when switching back to tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const cached = WeatherCache.get(AppState.location.latitude, AppState.location.longitude);
      if (!cached || !cached.isFresh) {
        fetchWeatherData(AppState.location.latitude, AppState.location.longitude, false);
      }
    }
  });
});
