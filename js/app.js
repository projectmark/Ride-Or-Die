/**
 * Ride Or Die - Main Application Controller (Material Design 3 Expressive 2026)
 * Handles UI rendering, Dual Views (Full Cockpit & Single Widget), lifecycle & events
 */

// 1. STATE PERSISTENCE & LOADING
// ============================================================================
function loadSavedState() {
  try {
    const savedTheme = localStorage.getItem('rideordie_theme');
    AppState.theme = savedTheme || 'light'; // Standaard Licht ("ik haat darkmode")

    const savedLoc = localStorage.getItem('rideordie_loc');
    if (savedLoc) {
      AppState.location = JSON.parse(savedLoc);
    }

    const savedCommute = localStorage.getItem('rideordie_commute');
    if (savedCommute) {
      AppState.commute = { ...AppState.commute, ...JSON.parse(savedCommute) };
    }

    // View Mode: 'cockpit' (default) vs 'widget' (single compact card)
    const savedView = localStorage.getItem('rideordie_view_mode');
    const hash = window.location.hash || '';
    if (savedView === 'widget' || hash.includes('widget') || hash.includes('simple')) {
      AppState.viewMode = 'widget';
    } else {
      AppState.viewMode = 'cockpit';
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
        if (parsed.roadKm) AppState.route.roadKm = parsed.roadKm;
      } catch (err) {
        console.warn("Kon route niet laden:", err);
      }
    }

    // Automated Corridor initial calculation
    if (typeof RouteEngine !== 'undefined' && RouteEngine.syncRouteState && AppState.route.start && AppState.route.dest) {
      RouteEngine.syncRouteState(AppState.route.start, AppState.route.dest, AppState.route.legDurationMinutes);
    }
  } catch (e) {
    console.error("Kon instellingen niet laden:", e);
  }

  applyTheme(AppState.theme, false);
  updateViewModeUI();
  updateNavbarLabels();
}

function saveState() {
  try {
    localStorage.setItem('rideordie_theme', AppState.theme);
    localStorage.setItem('rideordie_loc', JSON.stringify(AppState.location));
    localStorage.setItem('rideordie_commute', JSON.stringify(AppState.commute));
    localStorage.setItem('rideordie_view_mode', AppState.viewMode || 'cockpit');
    localStorage.setItem('rideordie_selected_day', AppState.selectedDay || 'today');
    if (AppState.route) {
      localStorage.setItem('rideordie_route', JSON.stringify({
        start: AppState.route.start,
        mid: AppState.route.mid,
        dest: AppState.route.dest,
        legDurationMinutes: AppState.route.legDurationMinutes,
        roadKm: AppState.route.roadKm
      }));
    }
  } catch (e) {
    console.error("Kon instellingen niet opslaan:", e);
  }
}

function updateNavbarLabels() {
  const navLoc = document.getElementById('nav-location-label');
  if (navLoc && AppState.location) {
    navLoc.textContent = `${AppState.location.name}, ${AppState.location.country || 'NL'}`;
  }

  const navRouteNames = document.getElementById('nav-route-names');
  if (navRouteNames && AppState.route && AppState.route.start && AppState.route.dest) {
    navRouteNames.textContent = `${AppState.route.start.name} ➔ ${AppState.route.dest.name}`;
  }

  const navRouteTime = document.getElementById('nav-route-time-chip');
  if (navRouteTime && AppState.route) {
    const totalMins = (AppState.route.legDurationMinutes || 20) * 2;
    navRouteTime.textContent = `~${totalMins}m`;
  }
}

// 2. VIEW MODE TOGGLE (Cockpit ⇄ Single Widget)
// ============================================================================
function setViewMode(targetMode) {
  if (targetMode !== 'cockpit' && targetMode !== 'widget') return;
  AppState.viewMode = targetMode;
  saveState();
  updateViewModeUI();
  syncUrlHash(document.fullscreenElement !== null, targetMode === 'widget');
  showToast(targetMode === 'widget' ? 'Compacte Widget modus geactiveerd 📱' : 'Uitgebreide Cockpit weergave geactiveerd 📊');
}

function toggleViewMode() {
  setViewMode(AppState.viewMode === 'widget' ? 'cockpit' : 'widget');
}

function updateViewModeUI() {
  const isWidget = AppState.viewMode === 'widget';
  const cockpitView = document.getElementById('cockpit-view');
  const widgetView = document.getElementById('widget-view');
  const btnText = document.getElementById('view-mode-btn-text');
  const btnIcon = document.getElementById('view-mode-btn-icon');
  const toggleBtn = document.getElementById('view-mode-toggle-btn');

  if (cockpitView) cockpitView.style.display = isWidget ? 'none' : 'flex';
  if (widgetView) widgetView.style.display = isWidget ? 'flex' : 'none';

  if (btnText && btnIcon) {
    if (isWidget) {
      btnIcon.textContent = '📊';
      btnText.textContent = 'Cockpit';
      if (toggleBtn) toggleBtn.setAttribute('title', 'Schakel naar uitgebreide cockpit');
    } else {
      btnIcon.textContent = '📱';
      btnText.textContent = 'Widget';
      if (toggleBtn) toggleBtn.setAttribute('title', 'Schakel naar compacte widget');
    }
  }
}

// 3. THEME MANAGEMENT
// ============================================================================
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

  const btnIcon = document.getElementById('theme-btn-icon');
  if (btnIcon) {
    btnIcon.textContent = themeMode === 'light' ? '☀️' : themeMode === 'auto' ? '🔄' : '🌙';
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', effectiveTheme === 'light' ? '#f5f8fc' : '#09101d');
  }

  updateThemeButtonsUI();
  saveState();
  if (showFeedback) {
    showToast(themeMode === 'light' ? 'Thema: Licht ☀️' : themeMode === 'auto' ? 'Thema: Automatisch 🔄' : 'Thema: Donker 🌙');
  }
}

function cycleTheme() {
  if (AppState.theme === 'light') applyTheme('auto');
  else if (AppState.theme === 'auto') applyTheme('dark');
  else applyTheme('light');
}

function updateThemeButtonsUI() {
  ['light', 'auto', 'dark'].forEach(mode => {
    const btn = document.getElementById(`theme-btn-${mode}`);
    if (btn) {
      btn.classList.toggle('active', AppState.theme === mode);
      if (AppState.theme === mode) {
        btn.style.borderColor = 'var(--md-sys-color-primary)';
      } else {
        btn.style.borderColor = '';
      }
    }
  });
}

// 4. DAY TOGGLE VIEW (Vandaag / Volgende werkdag)
// ============================================================================
function updateDayToggleUI() {
  const config = getWorkdayConfig();
  const currentMode = AppState.selectedDay || 'today';
  const navNextText = document.getElementById('nav-next-day-text');
  if (navNextText) navNextText.textContent = config.nextWorkday.buttonLabel;

  document.querySelectorAll('.day-toggle-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-day') === currentMode;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });
}

function switchDayView(dayKey) {
  if (!['today', 'nextWorkday'].includes(dayKey)) return;
  if (AppState.selectedDay === dayKey) return;
  AppState.selectedDay = dayKey;
  saveState();
  updateDayToggleUI();

  if (AppState.weatherData) {
    renderDashboard(AppState.weatherData);
  }
}

// 5. TOAST NOTIFICATIONS & URL HASH
// ============================================================================
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toast-pill');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

function syncUrlHash(isFs, isWidget) {
  const parts = [];
  if (isFs) parts.push('fullscreen');
  if (isWidget) parts.push('widget');
  const targetHash = parts.length ? '#' + parts.join('&') : '';
  if (window.location.hash !== targetHash) {
    history.replaceState(null, '', targetHash || (window.location.pathname + window.location.search));
  }
}

function toggleFullScreen() {
  const isAlreadyFs = !!(document.fullscreenElement);
  if (!isAlreadyFs) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    showToast("Volledig scherm geactiveerd ⛶");
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    showToast("Normaal scherm hersteld");
  }
}

// 6. MASTER DASHBOARD RENDERER (Cockpit & Widget Views)
// ============================================================================
function renderDashboard(data) {
  if (!data || !data.current) return;
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  const advice = computeCommuteAdvise(data);
  const isNextWorkday = AppState.selectedDay === 'nextWorkday';
  const workdayConfig = advice.workdayConfig;

  // Sync Navbar
  updateNavbarLabels();

  // Find Day Index for Forecast mode
  let dayIdx = 0;
  if (daily && daily.time) {
    const foundIdx = daily.time.findIndex(t => t.startsWith(workdayConfig.nextWorkday.dateStr));
    if (foundIdx >= 0) dayIdx = foundIdx;
  }

  // --- A. MASTER VERDICT BANNER (COCKPIT) ---
  const verdictCard = document.getElementById('master-verdict-card');
  const verdictPill = document.getElementById('master-verdict-pill');
  const verdictScore = document.getElementById('master-verdict-score');
  const verdictHeadline = document.getElementById('master-verdict-headline');
  const verdictExpl = document.getElementById('master-verdict-explanation');
  const masterStartName = document.getElementById('master-start-name');
  const masterDestName = document.getElementById('master-dest-name');
  const corridorHint = document.getElementById('master-corridor-subtext');

  if (verdictCard) verdictCard.dataset.verdict = advice.dayVerdict;
  if (verdictPill) verdictPill.innerHTML = advice.dayPill;
  if (verdictScore) verdictScore.textContent = `Index: ${advice.minScore}/100`;
  if (verdictHeadline) verdictHeadline.textContent = advice.dayHeadline;
  if (verdictExpl) verdictExpl.textContent = advice.dayExplanation;

  if (masterStartName && AppState.route && AppState.route.start) {
    masterStartName.textContent = AppState.route.start.name;
  }
  if (masterDestName && AppState.route && AppState.route.dest) {
    masterDestName.textContent = AppState.route.dest.name;
  }

  if (corridorHint && AppState.route) {
    const midText = AppState.route.mid ? `via ${AppState.route.mid.name} • ` : '';
    const kmText = AppState.route.roadKm ? `~${AppState.route.roadKm} km • ` : '';
    const minsText = `~${(AppState.route.legDurationMinutes || 20) * 2}m reistijd`;
    corridorHint.textContent = `Routecorridor gecontroleerd (${midText}${kmText}${minsText})`;
  }

  // --- B. DE TWEE RITTEN (Ochtend & Middag/Avond) ---
  const prefixSlot = isNextWorkday ? `${workdayConfig.nextWorkday.dayShort.toUpperCase()} ` : '';

  // Ochtendrit
  const mTimeEl = document.getElementById('morning-slot-time');
  if (mTimeEl) mTimeEl.textContent = `${prefixSlot}(${AppState.commute.morningTime} Heen)`;

  const mBadge = document.getElementById('morning-status-badge');
  if (mBadge) {
    mBadge.textContent = advice.morningAnalysis ? advice.morningAnalysis.badgeText : advice.morningScore.badgeText;
    mBadge.dataset.verdict = advice.morningAnalysis ? advice.morningAnalysis.verdict : advice.morningScore.verdict;
  }

  const mTempEl = document.getElementById('morning-temp');
  if (mTempEl) mTempEl.textContent = `${advice.morningAnalysis ? advice.morningAnalysis.startWeather.temp : advice.morningData.avgTemp}°C`;

  const mRainEl = document.getElementById('morning-rain');
  if (mRainEl) {
    const rVal = advice.morningAnalysis ? advice.morningAnalysis.maxRainOverall : advice.morningData.totalPrecip;
    mRainEl.textContent = rVal > 0.05 ? `${rVal.toFixed(1)} mm` : '0.0 mm';
  }

  const mGustsEl = document.getElementById('morning-gusts');
  if (mGustsEl) mGustsEl.textContent = `${advice.morningAnalysis ? advice.morningAnalysis.maxGustsOverall : advice.morningData.maxGusts} km/u`;

  const mNote = document.getElementById('morning-note');
  if (mNote) {
    const noteText = advice.morningAnalysis
      ? `${advice.morningAnalysis.headline}. ${advice.morningAnalysis.adviceTip || ''}`
      : (advice.morningScore.reasons.length ? advice.morningScore.reasons.join(". ") : (isNextWorkday ? `Ideale rit op ${workdayConfig.nextWorkday.dayName.toLowerCase()}! Droog asfalt en kalme wind.` : "Ideale ochtendrit! Droog asfalt en kalme wind."));
    mNote.innerHTML = `<span>👉</span> ${noteText}`;
  }

  // Avondrit
  const eTimeEl = document.getElementById('evening-slot-time');
  if (eTimeEl) eTimeEl.textContent = `${prefixSlot}(${AppState.commute.eveningTime} Terug)`;

  const eBadge = document.getElementById('evening-status-badge');
  if (eBadge) {
    eBadge.textContent = advice.eveningAnalysis ? advice.eveningAnalysis.badgeText : advice.eveningScore.badgeText;
    eBadge.dataset.verdict = advice.eveningAnalysis ? advice.eveningAnalysis.verdict : advice.eveningScore.verdict;
  }

  const eTempEl = document.getElementById('evening-temp');
  if (eTempEl) eTempEl.textContent = `${advice.eveningAnalysis ? advice.eveningAnalysis.startWeather.temp : advice.eveningData.avgTemp}°C`;

  const eRainEl = document.getElementById('evening-rain');
  if (eRainEl) {
    const rVal = advice.eveningAnalysis ? advice.eveningAnalysis.maxRainOverall : advice.eveningData.totalPrecip;
    eRainEl.textContent = rVal > 0.05 ? `${rVal.toFixed(1)} mm` : '0.0 mm';
  }

  const eGustsEl = document.getElementById('evening-gusts');
  if (eGustsEl) eGustsEl.textContent = `${advice.eveningAnalysis ? advice.eveningAnalysis.maxGustsOverall : advice.eveningData.maxGusts} km/u`;

  const eNote = document.getElementById('evening-note');
  if (eNote) {
    const noteText = advice.eveningAnalysis
      ? `${advice.eveningAnalysis.headline}. ${advice.eveningAnalysis.adviceTip || ''}`
      : (advice.eveningScore.reasons.length ? advice.eveningScore.reasons.join(". ") : (isNextWorkday ? `Prettige terugrit op ${workdayConfig.nextWorkday.dayName.toLowerCase()}! Asfalt is droog.` : "Prettige terugreis! Asfalt is droog en goed begaanbaar."));
    eNote.innerHTML = `<span>👉</span> ${noteText}`;
  }

  // --- C. UITRUSTING & KLEDINGADVIES ---
  const gearContainer = document.getElementById('gear-chips-container');
  if (gearContainer && advice.gearPills) {
    gearContainer.innerHTML = advice.gearPills.map(p => `<span class="gear-chip-pill">${p}</span>`).join('');
  }

  // --- D. 4 ESSENTIAL SAFETY TELEMETRY METERS ---
  const telem = advice.telemetry || {};

  // 1. Zijwind
  const windVal = telem.maxGusts || Math.max(advice.morningData.maxGusts, advice.eveningData.maxGusts);
  const windValEl = document.getElementById('meter-wind-val');
  if (windValEl) windValEl.textContent = `${windVal} km/u`;
  const windBftEl = document.getElementById('meter-wind-bft');
  if (windBftEl) windBftEl.textContent = kmhToBeaufort(windVal);

  const userMaxGusts = (AppState.commute && AppState.commute.maxGusts) ? AppState.commute.maxGusts : 55;
  const isDangerousGust = windVal > 75 || windVal > (userMaxGusts + 12);
  const isAlertGust = windVal > userMaxGusts || windVal > 45;
  const windTagEl = document.getElementById('meter-wind-tag');
  if (windTagEl) {
    windTagEl.textContent = isDangerousGust ? 'Gevaarlijk' : isAlertGust ? (windVal > userMaxGusts ? 'Boven limiet' : 'Alert') : 'Veilig';
    windTagEl.style.color = isDangerousGust ? '#ef4444' : isAlertGust ? '#f59e0b' : '#10b981';
  }
  const windBar = document.getElementById('meter-wind-bar');
  if (windBar) {
    const windPercent = Math.min(100, Math.round((windVal / 80) * 100));
    windBar.style.width = `${windPercent}%`;
    windBar.style.background = isDangerousGust ? '#ef4444' : isAlertGust ? '#f59e0b' : '#10b981';
  }

  // 2. Wegdek Grip
  const gripVal = telem.gripPercent !== undefined ? telem.gripPercent : 100;
  const gripStatus = telem.gripStatus || (gripVal === 100 ? 'Optimaal droog' : gripVal > 70 ? 'Vochtig asfalt' : 'Glad / Nat');
  const gripValEl = document.getElementById('meter-grip-val');
  if (gripValEl) gripValEl.textContent = `${gripVal}%`;
  const gripStatusEl = document.getElementById('meter-grip-status');
  if (gripStatusEl) gripStatusEl.textContent = gripStatus;
  const gripTagEl = document.getElementById('meter-grip-tag');
  if (gripTagEl) {
    gripTagEl.textContent = gripVal === 100 ? 'Optimaal' : gripVal > 70 ? 'Vochtig' : 'Glad';
    gripTagEl.style.color = gripVal === 100 ? '#10b981' : gripVal > 70 ? '#f59e0b' : '#ef4444';
  }
  const gripBar = document.getElementById('meter-grip-bar');
  if (gripBar) {
    gripBar.style.width = `${gripVal}%`;
    gripBar.style.background = gripVal === 100 ? '#10b981' : gripVal > 70 ? '#f59e0b' : '#ef4444';
  }

  // 3. Regenkans
  const rainVal = telem.maxRain !== undefined ? telem.maxRain : Math.max(advice.morningData.totalPrecip, advice.eveningData.totalPrecip);
  const maxProb = Math.max(advice.morningData.maxPrecipProb, advice.eveningData.maxPrecipProb);
  const rainValEl = document.getElementById('meter-rain-val');
  const rainMmEl = document.getElementById('meter-rain-mm');
  const rainTagEl = document.getElementById('meter-rain-tag');
  const rainBar = document.getElementById('meter-rain-bar');

  if (rainVal > 0.2) {
    if (rainValEl) rainValEl.textContent = `${rainVal.toFixed(1)} mm`;
    if (rainMmEl) rainMmEl.textContent = `Kans: ${maxProb}%`;
    if (rainTagEl) {
      rainTagEl.textContent = rainVal > 2.0 ? 'Plensbui' : 'Bui verwacht';
      rainTagEl.style.color = rainVal > 2.0 ? '#ef4444' : '#f59e0b';
    }
    if (rainBar) {
      const rainPercent = Math.min(100, Math.max(16, Math.round((rainVal / 4.0) * 100)));
      rainBar.style.width = `${rainPercent}%`;
      rainBar.style.background = rainVal > 2.0 ? '#ef4444' : '#f59e0b';
    }
  } else {
    if (rainValEl) rainValEl.textContent = `0.0 mm`;
    if (rainMmEl) rainMmEl.textContent = maxProb > 40 ? `Regio: ${maxProb}%` : `Droog`;
    if (rainTagEl) {
      rainTagEl.textContent = maxProb > 50 ? 'Droog (0 mm)' : 'Droog';
      rainTagEl.style.color = '#10b981';
    }
    if (rainBar) {
      rainBar.style.width = maxProb > 50 ? '12%' : '5%';
      rainBar.style.background = '#10b981';
    }
  }

  // 4. Comfort / Temperatuur
  const tempVal = telem.avgTemp !== undefined ? telem.avgTemp : Math.round((advice.morningData.avgTemp + advice.eveningData.avgTemp) / 2);
  const tempValEl = document.getElementById('meter-temp-val');
  if (tempValEl) tempValEl.textContent = `${tempVal}°C`;
  const tempStatusEl = document.getElementById('meter-temp-status');
  if (tempStatusEl) {
    tempStatusEl.textContent = tempVal < 2 ? 'Kans op gladheid!' : tempVal < 8 ? 'Koud' : tempVal < 15 ? 'Fris' : tempVal <= 24 ? 'Behaaglijk' : 'Warm';
  }
  const tempTagEl = document.getElementById('meter-temp-tag');
  if (tempTagEl) {
    tempTagEl.textContent = tempVal < 4 ? 'Koud' : tempVal > 29 ? 'Warm' : 'Behaaglijk';
    tempTagEl.style.color = tempVal < 4 ? '#0284c7' : tempVal > 29 ? '#f59e0b' : '#10b981';
  }
  const tempBar = document.getElementById('meter-temp-bar');
  if (tempBar) {
    const tempPercent = Math.min(100, Math.max(10, Math.round(((tempVal + 5) / 40) * 100)));
    tempBar.style.width = `${tempPercent}%`;
    tempBar.style.background = tempVal < 4 ? '#0284c7' : tempVal > 29 ? '#f59e0b' : '#10b981';
  }

  // --- E. LIVE WEER & 6 SPECS (HERO MINI) ---
  const heroCity = document.getElementById('hero-city-name');
  if (heroCity) heroCity.textContent = AppState.location.name || 'Ameide';

  const heroTemp = document.getElementById('hero-temp');
  const heroIcon = document.getElementById('hero-weather-icon');
  const heroCond = document.getElementById('hero-condition');
  const heroFeels = document.getElementById('hero-feels-like');
  const heroMax = document.getElementById('hero-max-temp');
  const heroMin = document.getElementById('hero-min-temp');

  if (isNextWorkday && daily && daily.time) {
    const code = daily.weather_code[dayIdx] || 0;
    const wmoInfo = WMO_DICT[code] || { text: "Helder", icon: "sun", state: "sunny" };
    setWeatherState(wmoInfo.state);
    const maxT = Math.round(daily.temperature_2m_max[dayIdx]);
    const minT = Math.round(daily.temperature_2m_min[dayIdx]);
    const dayAvgT = Math.round((maxT + minT) / 2);

    if (heroTemp) heroTemp.textContent = dayAvgT;
    if (heroIcon) heroIcon.innerHTML = getWeatherSvg(wmoInfo.icon, false);
    if (heroCond) heroCond.textContent = wmoInfo.text;
    if (heroFeels) heroFeels.textContent = `${dayAvgT}°`;
    if (heroMax) heroMax.textContent = `${maxT}°`;
    if (heroMin) heroMin.textContent = `${minT}°`;
  } else {
    const code = current.weather_code || 0;
    const wmoInfo = WMO_DICT[code] || { text: "Helder", icon: "sun", state: "sunny" };
    setWeatherState(wmoInfo.state);
    const isNight = current.is_day === 0;

    if (heroTemp) heroTemp.textContent = Math.round(current.temperature_2m);
    if (heroIcon) heroIcon.innerHTML = getWeatherSvg(wmoInfo.icon, isNight);
    if (heroCond) heroCond.textContent = wmoInfo.text;
    if (heroFeels) heroFeels.textContent = `${Math.round(current.apparent_temperature)}°`;
    if (daily && daily.temperature_2m_max) {
      if (heroMax) heroMax.textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
      if (heroMin) heroMin.textContent = `${Math.round(daily.temperature_2m_min[0])}°`;
    }
  }

  // 6 Specs Tiles
  const specWindSpeed = document.getElementById('spec-wind-speed');
  const specWindDir = document.getElementById('spec-wind-dir');
  const windSpd = isNextWorkday
    ? Math.round((daily && daily.wind_speed_10m_max && daily.wind_speed_10m_max[dayIdx]) || 15)
    : Math.round(current.wind_speed_10m || 0);
  const windDirDeg = current.wind_direction_10m || 0;
  if (specWindSpeed) specWindSpeed.textContent = `${windSpd} km/u`;
  if (specWindDir) {
    specWindDir.textContent = isNextWorkday
      ? kmhToBeaufort(windSpd)
      : `${kmhToBeaufort(windSpd)} • ${getWindDirectionText(windDirDeg)}`;
  }

  const specWindGusts = document.getElementById('spec-wind-gusts');
  const specGustStatus = document.getElementById('spec-gust-status');
  const gustsVal = isNextWorkday
    ? Math.round((daily && daily.wind_gusts_10m_max && daily.wind_gusts_10m_max[dayIdx]) || 25)
    : Math.round(current.wind_gusts_10m || 0);
  if (specWindGusts) specWindGusts.textContent = `${gustsVal} km/u`;
  if (specGustStatus) {
    specGustStatus.textContent = gustsVal > 75 ? 'Gevaarlijk' : gustsVal > 55 ? 'Krachtig' : gustsVal > 35 ? 'Matig' : 'Rustig';
    specGustStatus.style.color = gustsVal > 75 ? '#ef4444' : gustsVal > 55 ? '#f59e0b' : 'var(--text-muted)';
  }

  const specPrecip = document.getElementById('spec-precip');
  const specPrecipProb = document.getElementById('spec-precip-prob');
  const precipVal = isNextWorkday
    ? ((daily && daily.precipitation_sum && daily.precipitation_sum[dayIdx]) || 0)
    : (current.precipitation || 0);
  const precipProbVal = isNextWorkday
    ? ((daily && daily.precipitation_probability_max && daily.precipitation_probability_max[dayIdx]) || 0)
    : ((hourly && hourly.precipitation_probability && hourly.precipitation_probability[0] !== undefined)
      ? hourly.precipitation_probability[0]
      : ((daily && daily.precipitation_probability_max && daily.precipitation_probability_max[0]) || 0));
  if (specPrecip) specPrecip.textContent = `${precipVal.toFixed(1)} mm`;
  if (specPrecipProb) specPrecipProb.textContent = `Kans: ${precipProbVal}%`;

  const specUv = document.getElementById('spec-uv');
  const specUvStatus = document.getElementById('spec-uv-status');
  const uvVal = current.uv_index !== undefined ? Math.round(current.uv_index) : 0;
  if (specUv) specUv.textContent = `${uvVal}`;
  if (specUvStatus) {
    specUvStatus.textContent = uvVal >= 8 ? 'Zeer hoog' : uvVal >= 6 ? 'Hoog' : uvVal >= 3 ? 'Matig' : 'Laag';
  }

  const specPressure = document.getElementById('spec-pressure');
  const specPressureStatus = document.getElementById('spec-pressure-status');
  const pressureVal = current.surface_pressure ? Math.round(current.surface_pressure) : 1015;
  if (specPressure) specPressure.textContent = `${pressureVal} hPa`;
  if (specPressureStatus) {
    specPressureStatus.textContent = pressureVal > 1020 ? 'Hoog (stabiel)' : pressureVal < 1005 ? 'Laag (onstuimig)' : 'Stabiel';
  }

  const specVisibility = document.getElementById('spec-visibility');
  const specVisibilityStatus = document.getElementById('spec-visibility-status');
  const visKm = (hourly && hourly.visibility && hourly.visibility[0] !== undefined)
    ? Math.round(hourly.visibility[0] / 1000)
    : 10;
  if (specVisibility) specVisibility.textContent = `${visKm} km`;
  if (specVisibilityStatus) {
    specVisibilityStatus.textContent = visKm >= 10 ? 'Uitstekend' : visKm >= 5 ? 'Goed' : visKm >= 2 ? 'Matig' : 'Beperkt';
  }

  // --- F. UURLIJKSE TREND & 7-DAAGSE VERWACHTING ---
  renderHourlyStrip(hourly);
  renderDailyForecast(daily);

  // --- G. SINGLE WIDGET VIEW (Compact Mode) ---
  const singleCard = document.getElementById('single-widget-card');
  const widgetRoute = document.getElementById('widget-route-text');
  const widgetTemp = document.getElementById('widget-hero-temp');
  const widgetIcon = document.getElementById('widget-hero-icon');
  const widgetBanner = document.getElementById('widget-verdict-banner');
  const widgetPill = document.getElementById('widget-verdict-pill');
  const widgetScore = document.getElementById('widget-verdict-score');
  const widgetSummary = document.getElementById('widget-verdict-summary');

  if (singleCard) singleCard.dataset.verdict = advice.dayVerdict;
  if (widgetRoute && AppState.route && AppState.route.start && AppState.route.dest) {
    widgetRoute.textContent = `${AppState.route.start.name} ➔ ${AppState.route.dest.name}`;
  }
  if (widgetTemp) widgetTemp.textContent = `${Math.round(current.temperature_2m)}°`;
  if (widgetIcon) {
    const code = current.weather_code || 0;
    const wmoInfo = WMO_DICT[code] || { icon: "sun" };
    widgetIcon.innerHTML = getWeatherSvg(wmoInfo.icon, current.is_day === 0);
  }
  if (widgetBanner) widgetBanner.dataset.verdict = advice.dayVerdict;
  if (widgetPill) widgetPill.textContent = advice.dayPill;
  if (widgetScore) widgetScore.textContent = `Score: ${advice.minScore}/100`;
  if (widgetSummary) widgetSummary.textContent = advice.dayHeadline;

  // Widget Morning & Evening boxes
  const wMorningBadge = document.getElementById('widget-morning-badge');
  const wMorningTemp = document.getElementById('widget-morning-temp');
  const wMorningRain = document.getElementById('widget-morning-rain');
  const wMorningGusts = document.getElementById('widget-morning-gusts');
  if (wMorningBadge) {
    wMorningBadge.textContent = advice.morningAnalysis ? advice.morningAnalysis.badgeText.replace(/^[🟢🟡🔴⚠️]\s*/, '') : 'DROOG';
  }
  if (wMorningTemp) wMorningTemp.textContent = `${advice.morningAnalysis ? advice.morningAnalysis.startWeather.temp : advice.morningData.avgTemp}°C`;
  if (wMorningRain) {
    const rVal = advice.morningAnalysis ? advice.morningAnalysis.maxRainOverall : advice.morningData.totalPrecip;
    wMorningRain.textContent = rVal > 0.05 ? `${rVal.toFixed(1)} mm` : '0.0 mm';
  }
  if (wMorningGusts) wMorningGusts.textContent = `${advice.morningAnalysis ? advice.morningAnalysis.maxGustsOverall : advice.morningData.maxGusts} km/u`;

  const wEveningBadge = document.getElementById('widget-evening-badge');
  const wEveningTemp = document.getElementById('widget-evening-temp');
  const wEveningRain = document.getElementById('widget-evening-rain');
  const wEveningGusts = document.getElementById('widget-evening-gusts');
  if (wEveningBadge) {
    wEveningBadge.textContent = advice.eveningAnalysis ? advice.eveningAnalysis.badgeText.replace(/^[🟢🟡🔴⚠️]\s*/, '') : 'DROOG';
  }
  if (wEveningTemp) wEveningTemp.textContent = `${advice.eveningAnalysis ? advice.eveningAnalysis.startWeather.temp : advice.eveningData.avgTemp}°C`;
  if (wEveningRain) {
    const rVal = advice.eveningAnalysis ? advice.eveningAnalysis.maxRainOverall : advice.eveningData.totalPrecip;
    wEveningRain.textContent = rVal > 0.05 ? `${rVal.toFixed(1)} mm` : '0.0 mm';
  }
  if (wEveningGusts) wEveningGusts.textContent = `${advice.eveningAnalysis ? advice.eveningAnalysis.maxGustsOverall : advice.eveningData.maxGusts} km/u`;

  const widgetGear = document.getElementById('widget-gear-chips');
  if (widgetGear && advice.gearPills) {
    widgetGear.innerHTML = advice.gearPills.map(p => `<span class="gear-chip-pill" style="font-size:0.75rem;padding:4px 10px;">${p}</span>`).join('');
  }

  const widgetWind = document.getElementById('widget-wind-text');
  if (widgetWind) widgetWind.textContent = `💨 Wind: ${windVal} km/u`;
  const widgetGrip = document.getElementById('widget-grip-text');
  if (widgetGrip) widgetGrip.textContent = `🛣️ Grip: ${gripVal}%`;
  const widgetRain = document.getElementById('widget-rain-text');
  if (widgetRain) widgetRain.textContent = `💧 Regen: ${maxProb}%`;
}

// 7. HOURLY STRIP RENDERER
// ============================================================================
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
    startIdx = dayStartIndex !== -1 ? dayStartIndex : Math.max(0, hourly.time.findIndex(t => t.startsWith(activeDateStr)));
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

  const endIdx = Math.min(hourly.time.length, startIdx + 24);
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

    let rainDisplay = precip > 0.05 ? `💧${precip.toFixed(1)}m` : (rainProb > 45 ? `⛅0m` : `☀️0%`);
    const isCurrent = !isNextWorkday && (i === currentIdx);
    let commuteClass = '';

    if (isCurrent) commuteClass = 'is-current-hour';
    else if (hourly.time[i].startsWith(activeDateStr)) {
      if (hourNum === morningHour) commuteClass = 'is-commute-morning';
      else if (hourNum === eveningHour) commuteClass = 'is-commute-evening';
    }

    html += `
      <div class="hour-chip ${commuteClass}">
        <span class="hour-time">${hourStr}</span>
        <div class="hour-icon">${getWeatherSvg(iconType, isNight)}</div>
        <span class="hour-temp">${temp}°</span>
        <span class="hour-rain">${rainDisplay}</span>
      </div>
    `;
  }
  strip.innerHTML = html;
}

// 8. 7-DAY FORECAST RENDERER
// ============================================================================
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

    let rainDisplay = rainSum > 0.1 ? `💧 ${rainSum.toFixed(1)}m` : (rainProb > 40 ? `⛅ 0m` : `☀️ 0%`);

    html += `
      <div class="daily-row">
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

// 9. ROUTE PLANNER CONTROLLER (Start + Bestemming)
// ============================================================================
let currentFocusedWaypoint = 'start';
let routeSearchDebounceTimer = null;

function updateCorridorPreviewUI() {
  if (!AppState.route) return;
  const startName = AppState.route.start ? AppState.route.start.name : 'Ameide';
  const midName = AppState.route.mid ? AppState.route.mid.name : 'Utrecht';
  const destName = AppState.route.dest ? AppState.route.dest.name : 'Bilthoven';
  const roadKm = AppState.route.roadKm || 36;

  const prevStart = document.getElementById('corridor-preview-start');
  const prevMid = document.getElementById('corridor-preview-mid');
  const prevDest = document.getElementById('corridor-preview-dest');
  const kmChip = document.getElementById('route-auto-km-chip');
  const midInput = document.getElementById('route-mid-input');

  if (prevStart) prevStart.textContent = startName;
  if (prevMid) prevMid.textContent = midName;
  if (prevDest) prevDest.textContent = destName;
  if (kmChip) kmChip.textContent = `~${roadKm} km`;
  if (midInput) midInput.value = midName;

  const masterStart = document.getElementById('master-start-name');
  const masterDest = document.getElementById('master-dest-name');
  if (masterStart) masterStart.textContent = startName;
  if (masterDest) masterDest.textContent = destName;

  const widgetRoute = document.getElementById('widget-route-text');
  if (widgetRoute) widgetRoute.textContent = `${startName} ➔ ${destName}`;

  updateNavbarLabels();
}

function openRoutePlannerModal() {
  const modal = document.getElementById('route-planner-modal');
  if (!modal) return;

  const startInput = document.getElementById('route-start-input');
  const destInput = document.getElementById('route-dest-input');
  if (startInput) startInput.value = AppState.route.start.name;
  if (destInput) destInput.value = AppState.route.dest.name;

  updateCorridorPreviewUI();
  renderRoutePresetChips();
  highlightActiveRoutePresets();
  modal.classList.add('open');
  loadRouteAndAnalyze(false);
}

function closeRoutePlannerModal() {
  const modal = document.getElementById('route-planner-modal');
  if (modal) modal.classList.remove('open');
  ['start', 'dest'].forEach(key => {
    const drop = document.getElementById(`route-${key}-results`);
    if (drop) drop.classList.remove('show');
  });
}

function highlightActiveRoutePresets() {
  const quickPresets = document.getElementById('route-quick-presets');
  if (!quickPresets) return;
  const currentStart = (AppState.route?.start?.name || '').toLowerCase();
  const currentDest = (AppState.route?.dest?.name || '').toLowerCase();
  quickPresets.querySelectorAll('.city-chip').forEach(btn => {
    const idx = parseInt(btn.dataset.idx, 10);
    const r = PRESET_ROUTES[idx];
    if (r && r.start.name.toLowerCase() === currentStart && r.dest.name.toLowerCase() === currentDest) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function renderRoutePresetChips() {
  const container = document.getElementById('route-preset-chips');
  if (!container) return;
  const currentDest = (AppState.route?.dest?.name || '').toLowerCase();
  container.innerHTML = PRESET_CITIES.slice(0, 10).map(c => {
    const isAct = c.name.toLowerCase() === currentDest;
    return `<button type="button" class="city-chip ${isAct ? 'active' : ''}" data-name="${c.name}" data-lat="${c.lat}" data-lon="${c.lon}">${c.name}</button>`;
  }).join('');
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

  const results = document.getElementById(`route-${targetKey}-results`);
  if (results) results.classList.remove('show');

  // Recalculate automated corridor (Start ➔ Mid ➔ Dest)
  if (typeof RouteEngine !== 'undefined' && RouteEngine.syncRouteState) {
    RouteEngine.syncRouteState(AppState.route.start, AppState.route.dest, AppState.route.legDurationMinutes);
  }

  if (targetKey === 'start') {
    AppState.location = {
      name,
      latitude: Number(lat),
      longitude: Number(lon),
      country
    };
    fetchWeatherData(Number(lat), Number(lon), false);
  }

  updateCorridorPreviewUI();
  renderRoutePresetChips();
  highlightActiveRoutePresets();
  saveState();
  loadRouteAndAnalyze(false);
  showToast(`${name} gekozen voor route!`);
}

function swapRouteEndpoints() {
  const temp = AppState.route.start;
  AppState.route.start = AppState.route.dest;
  AppState.route.dest = temp;

  if (typeof RouteEngine !== 'undefined' && RouteEngine.syncRouteState) {
    RouteEngine.syncRouteState(AppState.route.start, AppState.route.dest, AppState.route.legDurationMinutes);
  }

  if (AppState.route.start) {
    AppState.location = {
      name: AppState.route.start.name,
      latitude: AppState.route.start.lat,
      longitude: AppState.route.start.lon,
      country: AppState.route.start.country || 'NL'
    };
  }

  const startInput = document.getElementById('route-start-input');
  const destInput = document.getElementById('route-dest-input');
  if (startInput) startInput.value = AppState.route.start.name;
  if (destInput) destInput.value = AppState.route.dest.name;

  updateCorridorPreviewUI();
  renderRoutePresetChips();
  highlightActiveRoutePresets();
  saveState();
  fetchWeatherData(AppState.location.latitude, AppState.location.longitude, false);
  loadRouteAndAnalyze(false);
  showToast("Heen- en terugreis omgedraaid! ⇄");
}

function applyPresetRoute(startName, destName, duration = 20) {
  const findCity = (name) => {
    return PRESET_CITIES.find(c => c.name.toLowerCase() === name.toLowerCase()) || {
      name: name,
      lat: 52.0907,
      lon: 5.1214,
      country: 'NL'
    };
  };

  const startCity = findCity(startName);
  const destCity = findCity(destName);

  AppState.route.start = { ...startCity };
  AppState.route.dest = { ...destCity };
  AppState.route.legDurationMinutes = duration;

  if (typeof RouteEngine !== 'undefined' && RouteEngine.syncRouteState) {
    RouteEngine.syncRouteState(AppState.route.start, AppState.route.dest, duration);
  }

  AppState.location = {
    name: startCity.name,
    latitude: startCity.lat,
    longitude: startCity.lon,
    country: startCity.country || 'NL'
  };

  const startInput = document.getElementById('route-start-input');
  const destInput = document.getElementById('route-dest-input');
  if (startInput) startInput.value = startCity.name;
  if (destInput) destInput.value = destCity.name;

  updateCorridorPreviewUI();
  renderRoutePresetChips();
  highlightActiveRoutePresets();
  saveState();
  fetchWeatherData(startCity.lat, startCity.lon, false);
  loadRouteAndAnalyze(false);
  showToast(`Traject ${startCity.name} ➔ ${destCity.name} geladen!`);
}

async function loadRouteAndAnalyze(force = false) {
  try {
    const waypointsWeather = await fetchRouteWeather(
      AppState.route.start,
      AppState.route.mid,
      AppState.route.dest,
      force
    );
    AppState.route.waypointsWeather = waypointsWeather;
    renderRouteModalAnalysis();
    if (AppState.weatherData) {
      renderDashboard(AppState.weatherData);
    }
  } catch (err) {
    console.error("Fout bij route analyse:", err);
  }
}

function renderRouteModalAnalysis() {
  if (!AppState.route.waypointsWeather || !AppState.route.waypointsWeather.start) return;

  const evaluation = RouteEngine.evaluateRoute(
    AppState.route,
    AppState.route.waypointsWeather,
    new Date()
  );
  if (!evaluation) return;

  const banner = document.getElementById('route-verdict-banner');
  const badge = document.getElementById('route-verdict-badge');
  const score = document.getElementById('route-score-badge');
  const headline = document.getElementById('route-verdict-headline');
  const expl = document.getElementById('route-verdict-explanation');
  const tip = document.getElementById('route-verdict-tip');

  if (banner) banner.dataset.verdict = evaluation.verdict;
  if (badge) badge.textContent = evaluation.badgeText;
  if (score) score.textContent = `Score: ${evaluation.score}/100`;
  if (headline) headline.textContent = evaluation.headline;
  if (expl) expl.textContent = evaluation.explanation;
  if (tip) tip.textContent = evaluation.adviceTip || '';

  // Alternatives strip
  const strip = document.getElementById('route-alternatives-strip');
  if (strip) {
    const alts = RouteEngine.computeDepartureAlternatives(
      AppState.route,
      AppState.route.waypointsWeather,
      new Date()
    );
    strip.innerHTML = alts.slots.map(s => `
      <button type="button" class="city-chip ${s.isCurrent ? 'active' : ''}" style="white-space:nowrap;font-size:0.75rem;">
        ${s.departureTimeStr} • ${s.maxRain > 0 ? `💧 ${s.maxRain}mm` : '🟢 Droog'}
      </button>
    `).join('');
  }
}

function handleRouteWaypointSearch(query, targetKey) {
  clearTimeout(routeSearchDebounceTimer);
  const container = document.getElementById(`route-${targetKey}-results`);
  if (!container) return;

  const trimmed = (query || '').trim();
  if (trimmed.length < 2) {
    container.classList.remove('show');
    return;
  }

  routeSearchDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=nl&format=json`);
      if (!res.ok) return;
      const data = await res.json();
      const results = (data && data.results) ? data.results : [];

      if (results.length > 0) {
        container.innerHTML = results.map(item => `
          <div class="route-search-item" data-key="${targetKey}" data-lat="${item.latitude}" data-lon="${item.longitude}" data-name="${escapeHtml(item.name)}">
            <strong>${escapeHtml(item.name)}</strong>
            <small style="opacity:0.7;">${escapeHtml(item.admin1 || item.country || 'NL')}</small>
          </div>
        `).join('');
        container.classList.add('show');
      } else {
        container.classList.remove('show');
      }
    } catch (err) {
      console.warn("Geocoding fout:", err);
    }
  }, 220);
}

// 10. LOCATION MODAL CONTROLLER
// ============================================================================
function openLocationModal() {
  const modal = document.getElementById('location-modal');
  if (!modal) return;
  renderPresetCityChips();
  modal.classList.add('open');
  const input = document.getElementById('location-search-input');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 60);
  }
}

function closeLocationModal() {
  const modal = document.getElementById('location-modal');
  if (modal) modal.classList.remove('open');
  const res = document.getElementById('search-results-list');
  if (res) res.classList.remove('show');
}

function renderPresetCityChips() {
  const container = document.getElementById('preset-cities-container');
  if (!container) return;
  const currentName = (AppState.location?.name || '').toLowerCase();
  container.innerHTML = PRESET_CITIES.map(c => {
    const isAct = c.name.toLowerCase() === currentName;
    return `<button type="button" class="city-chip ${isAct ? 'active' : ''}" data-name="${c.name}" data-lat="${c.lat}" data-lon="${c.lon}">${c.name}</button>`;
  }).join('');
}

function selectNewLocation(name, lat, lon, country = 'NL') {
  AppState.location = { name, latitude: lat, longitude: lon, country };
  saveState();
  closeLocationModal();
  updateNavbarLabels();
  fetchWeatherData(lat, lon, false);
  showToast(`Locatie gewijzigd naar ${name}`);
}

// 11. SETTINGS MODAL CONTROLLER
// ============================================================================
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  updateThemeButtonsUI();

  const selMorning = document.getElementById('setting-morning-time');
  const selEvening = document.getElementById('setting-evening-time');
  const rangeMinTemp = document.getElementById('setting-min-temp');
  const rangeMaxGusts = document.getElementById('setting-max-gusts');

  if (selMorning) selMorning.value = AppState.commute.morningTime;
  if (selEvening) selEvening.value = AppState.commute.eveningTime;
  if (rangeMinTemp) rangeMinTemp.value = AppState.commute.minTemp;
  if (rangeMaxGusts) rangeMaxGusts.value = AppState.commute.maxGusts;

  const valMinTemp = document.getElementById('val-min-temp');
  if (valMinTemp) valMinTemp.textContent = `${AppState.commute.minTemp}°C`;
  const valMaxGusts = document.getElementById('val-max-gusts');
  if (valMaxGusts) valMaxGusts.textContent = `${AppState.commute.maxGusts} km/u`;

  modal.classList.add('open');
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('open');
}

// 12. EVENT LISTENERS SETUP
// ============================================================================
function setupAppEvents() {
  // View mode switcher button
  const viewToggleBtn = document.getElementById('view-mode-toggle-btn');
  if (viewToggleBtn) viewToggleBtn.addEventListener('click', toggleViewMode);

  const widgetSwitchBtn = document.getElementById('widget-switch-to-cockpit-btn');
  if (widgetSwitchBtn) widgetSwitchBtn.addEventListener('click', () => setViewMode('cockpit'));

  // Theme toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) themeBtn.addEventListener('click', cycleTheme);

  // GPS buttons
  const gpsBtn = document.getElementById('gps-btn');
  if (gpsBtn) gpsBtn.addEventListener('click', requestGPSLocation);
  const modalGpsBtn = document.getElementById('modal-gps-btn');
  if (modalGpsBtn) modalGpsBtn.addEventListener('click', () => {
    closeLocationModal();
    requestGPSLocation();
  });

  // Refresh
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => {
    fetchWeatherData(AppState.location.latitude, AppState.location.longitude, true);
    loadRouteAndAnalyze(true);
  });

  // Fullscreen
  const fsBtn = document.getElementById('fullscreen-btn');
  if (fsBtn) fsBtn.addEventListener('click', toggleFullScreen);

  // Day toggle segmented
  document.querySelectorAll('.day-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-day');
      if (day) switchDayView(day);
    });
  });

  // Route pill & Swap
  const navRouteBtn = document.getElementById('nav-route-btn');
  if (navRouteBtn) navRouteBtn.addEventListener('click', openRoutePlannerModal);

  const masterSwapBtn = document.getElementById('master-swap-btn');
  if (masterSwapBtn) masterSwapBtn.addEventListener('click', swapRouteEndpoints);

  const routeSwapBtn = document.getElementById('route-swap-btn');
  if (routeSwapBtn) routeSwapBtn.addEventListener('click', swapRouteEndpoints);

  // Open modals
  const openLocBtn = document.getElementById('open-location-btn');
  if (openLocBtn) openLocBtn.addEventListener('click', openLocationModal);
  const closeLocBtn = document.getElementById('close-location-modal-btn');
  if (closeLocBtn) closeLocBtn.addEventListener('click', closeLocationModal);

  const openSettingsBtn = document.getElementById('open-settings-btn');
  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);
  const closeSettingsBtn = document.getElementById('close-modal-btn');
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);

  const closeRouteBtn = document.getElementById('close-route-modal-btn');
  if (closeRouteBtn) closeRouteBtn.addEventListener('click', closeRoutePlannerModal);
  const closeRouteSaveBtn = document.getElementById('close-route-save-btn');
  if (closeRouteSaveBtn) closeRouteSaveBtn.addEventListener('click', closeRoutePlannerModal);

  // Close modals on backdrop click or escape
  ['location-modal', 'settings-modal', 'route-planner-modal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLocationModal();
      closeSettingsModal();
      closeRoutePlannerModal();
    }
  });

  // Settings Save
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const selM = document.getElementById('setting-morning-time');
      const selE = document.getElementById('setting-evening-time');
      const rTemp = document.getElementById('setting-min-temp');
      const rGusts = document.getElementById('setting-max-gusts');

      if (selM) AppState.commute.morningTime = selM.value;
      if (selE) AppState.commute.eveningTime = selE.value;
      if (rTemp) AppState.commute.minTemp = parseInt(rTemp.value, 10);
      if (rGusts) AppState.commute.maxGusts = parseInt(rGusts.value, 10);

      saveState();
      closeSettingsModal();
      if (AppState.weatherData) renderDashboard(AppState.weatherData);
      showToast("Instellingen opgeslagen & advies herrekend!");
    });
  }

  // Sliders preview
  const rMinTemp = document.getElementById('setting-min-temp');
  if (rMinTemp) {
    rMinTemp.addEventListener('input', (e) => {
      const el = document.getElementById('val-min-temp');
      if (el) el.textContent = `${e.target.value}°C`;
    });
  }
  const rMaxGusts = document.getElementById('setting-max-gusts');
  if (rMaxGusts) {
    rMaxGusts.addEventListener('input', (e) => {
      const el = document.getElementById('val-max-gusts');
      if (el) el.textContent = `${e.target.value} km/u`;
    });
  }

  // Theme buttons in Settings
  ['light', 'auto', 'dark'].forEach(m => {
    const btn = document.getElementById(`theme-btn-${m}`);
    if (btn) btn.addEventListener('click', () => applyTheme(m));
  });

  // Preset cities in Location modal
  const presetLocContainer = document.getElementById('preset-cities-container');
  if (presetLocContainer) {
    presetLocContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.city-chip');
      if (btn) {
        selectNewLocation(btn.dataset.name, parseFloat(btn.dataset.lat), parseFloat(btn.dataset.lon), 'NL');
      }
    });
  }

  // Location Search input & search-results-list click in Location modal
  const locSearchInput = document.getElementById('location-search-input');
  if (locSearchInput) {
    locSearchInput.addEventListener('input', (e) => handleLocationSearch(e.target.value));
  }

  const searchResultsList = document.getElementById('search-results-list');
  if (searchResultsList) {
    searchResultsList.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (item) {
        selectNewLocation(
          item.dataset.name,
          parseFloat(item.dataset.lat),
          parseFloat(item.dataset.lon),
          item.dataset.country || 'NL'
        );
      }
    });
  }

  // Route Quick Presets
  const quickPresets = document.getElementById('route-quick-presets');
  if (quickPresets) {
    quickPresets.addEventListener('click', (e) => {
      const btn = e.target.closest('.city-chip');
      if (btn && btn.dataset.idx !== undefined) {
        const idx = parseInt(btn.dataset.idx, 10);
        const r = PRESET_ROUTES[idx];
        if (r) applyPresetRoute(r.start.name, r.dest.name, r.duration);
      }
    });
  }

  // Route Waypoint Inputs
  ['start', 'dest'].forEach(key => {
    const input = document.getElementById(`route-${key}-input`);
    if (input) {
      input.addEventListener('focus', () => { currentFocusedWaypoint = key; });
      input.addEventListener('input', (e) => handleRouteWaypointSearch(e.target.value, key));
    }

    const drop = document.getElementById(`route-${key}-results`);
    if (drop) {
      drop.addEventListener('click', (e) => {
        const item = e.target.closest('.route-search-item');
        if (item) {
          selectRouteWaypoint(item.dataset.key, item.dataset.name, parseFloat(item.dataset.lat), parseFloat(item.dataset.lon), 'NL');
        }
      });
    }
  });

  // Preset chips in Route modal
  const routePresetContainer = document.getElementById('route-preset-chips');
  if (routePresetContainer) {
    routePresetContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.city-chip');
      if (btn) {
        selectRouteWaypoint(currentFocusedWaypoint || 'dest', btn.dataset.name, parseFloat(btn.dataset.lat), parseFloat(btn.dataset.lon), 'NL');
      }
    });
  }

  // Duration buttons in Route modal
  const durContainer = document.getElementById('route-duration-buttons');
  if (durContainer) {
    durContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.city-chip');
      if (btn && btn.dataset.duration) {
        durContainer.querySelectorAll('.city-chip').forEach(b => b.style.background = '');
        durContainer.querySelectorAll('.city-chip').forEach(b => b.style.color = '');
        btn.style.background = 'var(--md-sys-color-primary)';
        btn.style.color = '#fff';
        AppState.route.legDurationMinutes = parseInt(btn.dataset.duration, 10);
        saveState();
        loadRouteAndAnalyze(false);
      }
    });
  }

  // Route refresh button
  const routeRefBtn = document.getElementById('route-refresh-btn');
  if (routeRefBtn) routeRefBtn.addEventListener('click', () => loadRouteAndAnalyze(true));

  // Fullscreen change listener
  document.addEventListener('fullscreenchange', () => {
    syncUrlHash(!!document.fullscreenElement, AppState.viewMode === 'widget');
  });

  // Hash change
  window.addEventListener('hashchange', () => {
    const h = window.location.hash || '';
    const shouldBeWidget = h.includes('widget') || h.includes('simple');
    if (shouldBeWidget && AppState.viewMode !== 'widget') {
      setViewMode('widget');
    } else if (!shouldBeWidget && AppState.viewMode === 'widget') {
      setViewMode('cockpit');
    }
  });
}

// 13. APP STARTUP
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  updateDayToggleUI();
  setupAppEvents();
  fetchWeatherData(AppState.location.latitude, AppState.location.longitude, false);
  loadRouteAndAnalyze(false);
  startWeatherPolling();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const cached = WeatherCache.get(AppState.location.latitude, AppState.location.longitude);
      if (!cached || !cached.isFresh) {
        fetchWeatherData(AppState.location.latitude, AppState.location.longitude, false);
      }
    }
  });
});
