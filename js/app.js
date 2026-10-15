/**
 * Ride Or Die - Hoofdcontroller & Applicatie-orchestrator
 * Verbindt de Toestand (State), Weerdienst (WeatherService), Rekenkernen (Commute & Route)
 * en de Weergavelaag (UIRenderer) volgens het Single Responsibility Principle.
 */

const App = {
  _routeSearchTimer: null,
  _locationSearchTimer: null,
  _focusedWaypoint: 'start',

  /**
   * Initialiseert de applicatie bij het laden van de pagina.
   */
  async init() {
    State.load();
    UIRenderer.renderTheme(State.get('theme'), true);
    UIRenderer.renderViewMode(State.get('viewMode'));
    UIRenderer.updateNavbar(State.state);

    const workdayConfig = CommuteEngine.getWorkdayConfig();
    UIRenderer.renderDayToggle(State.get('selectedDay'), workdayConfig);

    this._bindEvents();
    this._setupStateSubscribers();

    // Initieel weer ophalen voor huidige locatie en route
    await this.refreshWeather(false);
    await this.analyzeCurrentRoute(false);
    this._startBackgroundPolling();
  },

  /**
   * Reageert op toestandsveranderingen (reactief patroon).
   */
  _setupStateSubscribers() {
    State.subscribe('theme', (theme) => {
      UIRenderer.renderTheme(theme, true);
    });

    State.subscribe('viewMode', (mode) => {
      UIRenderer.renderViewMode(mode);
      this._syncUrlHash();
    });

    State.subscribe('selectedDay', (day) => {
      const workdayConfig = CommuteEngine.getWorkdayConfig();
      UIRenderer.renderDayToggle(day, workdayConfig);
      if (State.get('weatherData')) {
        this._renderCurrentData();
      }
    });

    State.subscribe('location', () => {
      UIRenderer.updateNavbar(State.state);
    });

    State.subscribe('route', () => {
      UIRenderer.updateNavbar(State.state);
    });
  },

  /**
   * Rendert de huidige toestand en berekent het advies.
   */
  _renderCurrentData() {
    const data = State.get('weatherData');
    if (!data) return;

    const advice = CommuteEngine.computeAdvice(data, {
      selectedDay: State.get('selectedDay'),
      morningTime: State.state.commute.morningTime,
      eveningTime: State.state.commute.eveningTime,
      minTemp: State.state.commute.minTemp,
      maxGusts: State.state.commute.maxGusts
    }, State.state.route);

    UIRenderer.renderDashboard(data, advice, State.state);
  },

  /**
   * Haalt weergegevens op via WeatherService.
   */
  async refreshWeather(force = false) {
    const loc = State.get('location');
    if (!loc) return;

    UIRenderer.setLoading(true);
    if (force) {
      UIRenderer.showToast(I18n.t.toasts.weatherForceRefresh);
    }

    try {
      const res = await WeatherService.fetchMainLocationWeather(loc.latitude, loc.longitude, force);
      if (res.instantData && !State.get('weatherData')) {
        State.set('weatherData', res.instantData, false);
        this._renderCurrentData();
      }

      State.set('weatherData', res.data, false);
      this._renderCurrentData();

      if (force) {
        UIRenderer.showToast(I18n.t.toasts.weatherRefreshed);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Fout bij ophalen weergegevens:", err);
        UIRenderer.showToast(I18n.t.toasts.fetchError);
      }
    } finally {
      UIRenderer.setLoading(false);
    }
  },

  /**
   * Analyseert het actuele traject over start, tussenstop en bestemming.
   */
  async analyzeCurrentRoute(force = false) {
    const route = State.state.route;
    if (!route || !route.start || !route.dest) return;

    // Automatische corridor bijwerken indien nodig
    RouteEngine.syncRouteState(route.start, route.dest, route.legDurationMinutes);

    try {
      const waypointsWeather = await WeatherService.fetchRouteWeather(
        route.start,
        route.mid,
        route.dest,
        force
      );

      route.waypointsWeather = waypointsWeather;
      this._renderRouteModalAnalysis();
      this._renderCurrentData();
    } catch (err) {
      console.warn("Fout bij trajectanalyse:", err);
    }
  },

  /**
   * Rendert de route-analyse in de dialoog.
   */
  _renderRouteModalAnalysis() {
    const route = State.state.route;
    if (!route.waypointsWeather || !route.waypointsWeather.start) return;

    const evalRes = RouteEngine.evaluateRoute(route, route.waypointsWeather, new Date());
    if (!evalRes) return;

    const banner = document.getElementById('route-verdict-banner');
    const badge = document.getElementById('route-verdict-badge');
    const score = document.getElementById('route-score-badge');
    const headline = document.getElementById('route-verdict-headline');
    const expl = document.getElementById('route-verdict-explanation');
    const tip = document.getElementById('route-verdict-tip');

    if (banner) banner.dataset.verdict = evalRes.verdict;
    if (badge) badge.textContent = evalRes.badgeText;
    if (score) score.textContent = `Score: ${evalRes.score}/100`;
    if (headline) headline.textContent = evalRes.headline;
    if (expl) expl.textContent = evalRes.explanation;
    if (tip) tip.textContent = evalRes.adviceTip || '';

    // Alternatievenstrip
    const strip = document.getElementById('route-alternatives-strip');
    if (strip) {
      const alts = RouteEngine.computeDepartureAlternatives(route, route.waypointsWeather, new Date());
      strip.innerHTML = alts.slots.map(s => `
        <button type="button" class="city-chip ${s.isCurrent ? 'active' : ''}" style="white-space:nowrap;font-size:0.75rem;">
          ${s.departureTimeStr} uur • ${s.maxRain > 0 ? `💧 ${I18n.formatters.millimeters(s.maxRain)}` : '🟢 Droog'}
        </button>
      `).join('');
    }
  },

  /**
   * Kiest een nieuwe basislocatie.
   */
  selectLocation(name, lat, lon, country = 'NL') {
    State.set('location', { name, latitude: Number(lat), longitude: Number(lon), country });
    this.closeModal('location-modal');
    this.refreshWeather(false);
    UIRenderer.showToast(I18n.t.toasts.locationChanged(name));
  },

  /**
   * Selecteert een punt op de route (start of bestemming).
   */
  selectRoutePoint(key, name, lat, lon, country = 'NL') {
    State.state.route[key] = { name, lat: Number(lat), lon: Number(lon), country };
    RouteEngine.syncRouteState(State.state.route.start, State.state.route.dest, State.state.route.legDurationMinutes);

    const input = document.getElementById(`route-${key}-input`);
    if (input) input.value = name;
    const drop = document.getElementById(`route-${key}-results`);
    if (drop) drop.classList.remove('show');

    if (key === 'start') {
      State.set('location', { name, latitude: Number(lat), longitude: Number(lon), country });
      this.refreshWeather(false);
    }

    this._updateCorridorPreview();
    this._renderRouteChips();
    State.save();
    this.analyzeCurrentRoute(false);
    UIRenderer.showToast(`${name} gekozen voor de route`);
  },

  /**
   * Draait startpunt en bestemming om.
   */
  swapRoute() {
    const temp = State.state.route.start;
    State.state.route.start = State.state.route.dest;
    State.state.route.dest = temp;

    RouteEngine.syncRouteState(State.state.route.start, State.state.route.dest, State.state.route.legDurationMinutes);
    if (State.state.route.start) {
      State.set('location', {
        name: State.state.route.start.name,
        latitude: State.state.route.start.lat,
        longitude: State.state.route.start.lon,
        country: State.state.route.start.country || 'NL'
      });
    }

    const startIn = document.getElementById('route-start-input');
    const destIn = document.getElementById('route-dest-input');
    if (startIn) startIn.value = State.state.route.start.name;
    if (destIn) destIn.value = State.state.route.dest.name;

    this._updateCorridorPreview();
    this._renderRouteChips();
    State.save();
    this.refreshWeather(false);
    this.analyzeCurrentRoute(false);
    UIRenderer.showToast(I18n.t.toasts.routeSwapped);
  },

  _updateCorridorPreview() {
    const route = State.state.route;
    const prevStart = document.getElementById('corridor-preview-start');
    const prevMid = document.getElementById('corridor-preview-mid');
    const prevDest = document.getElementById('corridor-preview-dest');
    const kmChip = document.getElementById('route-auto-km-chip');

    if (prevStart && route.start) prevStart.textContent = route.start.name;
    if (prevMid && route.mid) prevMid.textContent = route.mid.name;
    if (prevDest && route.dest) prevDest.textContent = route.dest.name;
    if (kmChip && route.roadKm) kmChip.textContent = I18n.formatters.distance(route.roadKm);
  },

  _renderLocationChips() {
    const container = document.getElementById('preset-cities-container');
    if (!container) return;
    const curName = (State.state.location.name || '').toLowerCase();
    container.innerHTML = Config.PRESET_CITIES.map(c => `
      <button type="button" class="city-chip ${c.name.toLowerCase() === curName ? 'active' : ''}" data-name="${c.name}" data-lat="${c.lat}" data-lon="${c.lon}">${c.name}</button>
    `).join('');
  },

  _renderRouteChips() {
    const quickPresets = document.getElementById('route-quick-presets');
    if (quickPresets) {
      const curStart = (State.state.route.start?.name || '').toLowerCase();
      const curDest = (State.state.route.dest?.name || '').toLowerCase();
      quickPresets.querySelectorAll('.city-chip').forEach(btn => {
        const idx = parseInt(btn.dataset.idx, 10);
        const r = Config.PRESET_ROUTES[idx];
        const isMatch = r && r.start.name.toLowerCase() === curStart && r.dest.name.toLowerCase() === curDest;
        btn.classList.toggle('active', !!isMatch);
      });
    }

    const routePresets = document.getElementById('route-preset-chips');
    if (routePresets) {
      const curDest = (State.state.route.dest?.name || '').toLowerCase();
      routePresets.innerHTML = Config.PRESET_CITIES.slice(0, 10).map(c => `
        <button type="button" class="city-chip ${c.name.toLowerCase() === curDest ? 'active' : ''}" data-name="${c.name}" data-lat="${c.lat}" data-lon="${c.lon}">${c.name}</button>
      `).join('');
    }
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modalId === 'location-modal') {
      this._renderLocationChips();
      const inp = document.getElementById('location-search-input');
      if (inp) {
        inp.value = '';
        setTimeout(() => inp.focus(), 60);
      }
    } else if (modalId === 'route-planner-modal') {
      const startIn = document.getElementById('route-start-input');
      const destIn = document.getElementById('route-dest-input');
      if (startIn && State.state.route.start) startIn.value = State.state.route.start.name;
      if (destIn && State.state.route.dest) destIn.value = State.state.route.dest.name;
      this._updateCorridorPreview();
      this._renderRouteChips();
      this.analyzeCurrentRoute(false);
    } else if (modalId === 'settings-modal') {
      const selM = document.getElementById('setting-morning-time');
      const selE = document.getElementById('setting-evening-time');
      const rTemp = document.getElementById('setting-min-temp');
      const rGusts = document.getElementById('setting-max-gusts');
      if (selM) selM.value = State.state.commute.morningTime;
      if (selE) selE.value = State.state.commute.eveningTime;
      if (rTemp) rTemp.value = State.state.commute.minTemp;
      if (rGusts) rGusts.value = State.state.commute.maxGusts;
      const vTemp = document.getElementById('val-min-temp');
      if (vTemp) vTemp.textContent = I18n.formatters.celsius(State.state.commute.minTemp);
      const vGusts = document.getElementById('val-max-gusts');
      if (vGusts) vGusts.textContent = I18n.formatters.kmh(State.state.commute.maxGusts);
    }
    modal.classList.add('open');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
    ['search-results-list', 'route-start-results', 'route-dest-results'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('show');
    });
  },

  _syncUrlHash() {
    const isFs = !!document.fullscreenElement;
    const isWidget = State.get('viewMode') === 'widget';
    const parts = [];
    if (isFs) parts.push('schermvullend');
    if (isWidget) parts.push('beknopt');
    const hash = parts.length ? '#' + parts.join('&') : '';
    if (window.location.hash !== hash) {
      history.replaceState(null, '', hash || (window.location.pathname + window.location.search));
    }
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      UIRenderer.showToast(I18n.t.toasts.fullscreenOn);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      UIRenderer.showToast(I18n.t.toasts.fullscreenOff);
    }
  },

  _startBackgroundPolling() {
    setInterval(() => {
      if (!document.hidden) {
        this.refreshWeather(false);
      }
    }, Config.API.CACHE_TTL_MS);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const cached = WeatherCache.get(State.state.location.latitude, State.state.location.longitude);
        if (!cached || !cached.isFresh) {
          this.refreshWeather(false);
        }
      }
    });
  },

  _bindEvents() {
    // 1. Weergavewissel (Cockpit ⇄ Beknopt)
    const toggleView = document.getElementById('view-mode-toggle-btn');
    if (toggleView) {
      toggleView.addEventListener('click', () => {
        const next = State.get('viewMode') === 'widget' ? 'cockpit' : 'widget';
        State.set('viewMode', next);
        UIRenderer.showToast(next === 'widget' ? I18n.t.toasts.widgetModeActive : I18n.t.toasts.cockpitModeActive);
      });
    }

    const switchBack = document.getElementById('widget-switch-to-cockpit-btn');
    if (switchBack) {
      switchBack.addEventListener('click', () => {
        State.set('viewMode', 'cockpit');
        UIRenderer.showToast(I18n.t.toasts.cockpitModeActive);
      });
    }

    // 2. Themawissel
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = State.get('theme');
        const next = cur === 'light' ? 'auto' : cur === 'auto' ? 'dark' : 'light';
        State.set('theme', next);
        UIRenderer.showToast(`Thema ingesteld op ${I18n.t.themes[next]}`);
      });
    }

    ['light', 'auto', 'dark'].forEach(m => {
      const b = document.getElementById(`theme-btn-${m}`);
      if (b) b.addEventListener('click', () => {
        State.set('theme', m);
        UIRenderer.showToast(`Thema ingesteld op ${I18n.t.themes[m]}`);
      });
    });

    // 3. Dagkeuze
    document.querySelectorAll('.day-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = btn.getAttribute('data-day');
        if (day) State.set('selectedDay', day);
      });
    });

    // 4. Verversen & Schermvullend
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
      this.refreshWeather(true);
      this.analyzeCurrentRoute(true);
    });

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this._syncUrlHash());

    // 5. GPS-locatie
    const handleGps = () => {
      if (!navigator.geolocation) {
        UIRenderer.showToast(I18n.t.toasts.gpsUnsupported);
        return;
      }
      UIRenderer.showToast(I18n.t.toasts.gpsLocating);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const geo = await WeatherService.reverseGeocode(lat, lon);
          this.selectLocation(geo.name, lat, lon, geo.country);
        },
        () => {
          UIRenderer.showToast(I18n.t.toasts.gpsDenied);
        },
        { timeout: Config.API.GPS_TIMEOUT_MS, enableHighAccuracy: true }
      );
    };

    const navGps = document.getElementById('gps-btn');
    if (navGps) navGps.addEventListener('click', handleGps);
    const modalGps = document.getElementById('modal-gps-btn');
    if (modalGps) modalGps.addEventListener('click', () => {
      this.closeModal('location-modal');
      handleGps();
    });

    // 6. Dialoogvensters openen en sluiten
    const bindModal = (openId, closeId, modalId) => {
      const openBtn = document.getElementById(openId);
      if (openBtn) openBtn.addEventListener('click', () => this.openModal(modalId));
      const closeBtn = document.getElementById(closeId);
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal(modalId));
    };

    bindModal('open-location-btn', 'close-location-modal-btn', 'location-modal');
    bindModal('open-settings-btn', 'close-modal-btn', 'settings-modal');
    bindModal('nav-route-btn', 'close-route-modal-btn', 'route-planner-modal');

    const saveCloseRoute = document.getElementById('close-route-save-btn');
    if (saveCloseRoute) saveCloseRoute.addEventListener('click', () => this.closeModal('route-planner-modal'));

    ['location-modal', 'settings-modal', 'route-planner-modal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal(id);
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal('location-modal');
        this.closeModal('settings-modal');
        this.closeModal('route-planner-modal');
      }
    });

    // 7. Routeknoppen & Omdraaien
    const swapBtns = ['master-swap-btn', 'route-swap-btn'];
    swapBtns.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.swapRoute());
    });

    const routeRef = document.getElementById('route-refresh-btn');
    if (routeRef) routeRef.addEventListener('click', () => this.analyzeCurrentRoute(true));

    // 8. Zoekveld Locatie
    const locInp = document.getElementById('location-search-input');
    if (locInp) {
      locInp.addEventListener('input', (e) => {
        clearTimeout(this._locationSearchTimer);
        const query = e.target.value;
        this._locationSearchTimer = setTimeout(async () => {
          const results = await WeatherService.searchCities(query);
          const list = document.getElementById('search-results-list');
          if (!list) return;
          if (results.length > 0) {
            list.innerHTML = results.map(item => `
              <div class="search-result-item" data-lat="${item.latitude}" data-lon="${item.longitude}" data-name="${item.name}" data-country="${item.country_code || 'NL'}">
                <span class="search-result-name">${item.name} <small style="opacity:0.7;">(${item.country_code || 'NL'})</small></span>
                <span class="search-result-province">${item.admin1 || ''}</span>
              </div>
            `).join('');
            list.classList.add('show');
          } else if (query.trim().length >= 2) {
            list.innerHTML = `<div style="padding:10px;font-size:0.8rem;color:var(--text-muted);text-align:center;">${I18n.t.locationPicker.noResults}</div>`;
            list.classList.add('show');
          } else {
            list.classList.remove('show');
          }
        }, Config.API.SEARCH_DEBOUNCE_MS);
      });
    }

    const searchList = document.getElementById('search-results-list');
    if (searchList) {
      searchList.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
          this.selectLocation(item.dataset.name, item.dataset.lat, item.dataset.lon, item.dataset.country);
        }
      });
    }

    const presetCities = document.getElementById('preset-cities-container');
    if (presetCities) {
      presetCities.addEventListener('click', (e) => {
        const btn = e.target.closest('.city-chip');
        if (btn && btn.dataset.name) {
          this.selectLocation(btn.dataset.name, btn.dataset.lat, btn.dataset.lon, 'NL');
        }
      });
    }

    // 9. Route-invoer en presets
    ['start', 'dest'].forEach(key => {
      const inp = document.getElementById(`route-${key}-input`);
      if (inp) {
        inp.addEventListener('focus', () => { this._focusedWaypoint = key; });
        inp.addEventListener('input', (e) => {
          clearTimeout(this._routeSearchTimer);
          const q = e.target.value;
          this._routeSearchTimer = setTimeout(async () => {
            const results = await WeatherService.searchCities(q);
            const drop = document.getElementById(`route-${key}-results`);
            if (!drop) return;
            if (results.length > 0) {
              drop.innerHTML = results.map(item => `
                <div class="route-search-item" data-key="${key}" data-lat="${item.latitude}" data-lon="${item.longitude}" data-name="${item.name}">
                  <strong>${item.name}</strong>
                  <small style="opacity:0.7;">${item.admin1 || item.country_code || 'NL'}</small>
                </div>
              `).join('');
              drop.classList.add('show');
            } else {
              drop.classList.remove('show');
            }
          }, Config.API.SEARCH_DEBOUNCE_MS);
        });
      }

      const drop = document.getElementById(`route-${key}-results`);
      if (drop) {
        drop.addEventListener('click', (e) => {
          const item = e.target.closest('.route-search-item');
          if (item) {
            this.selectRoutePoint(item.dataset.key, item.dataset.name, item.dataset.lat, item.dataset.lon);
          }
        });
      }
    });

    const routeQuick = document.getElementById('route-quick-presets');
    if (routeQuick) {
      routeQuick.addEventListener('click', (e) => {
        const btn = e.target.closest('.city-chip');
        if (btn && btn.dataset.idx !== undefined) {
          const r = Config.PRESET_ROUTES[parseInt(btn.dataset.idx, 10)];
          if (r) {
            State.state.route.start = { ...r.start };
            State.state.route.dest = { ...r.dest };
            State.state.route.legDurationMinutes = r.duration;
            this.selectRoutePoint('start', r.start.name, r.start.lat, r.start.lon);
            this.selectRoutePoint('dest', r.dest.name, r.dest.lat, r.dest.lon);
          }
        }
      });
    }

    const routePresets = document.getElementById('route-preset-chips');
    if (routePresets) {
      routePresets.addEventListener('click', (e) => {
        const btn = e.target.closest('.city-chip');
        if (btn && btn.dataset.name) {
          this.selectRoutePoint(this._focusedWaypoint || 'dest', btn.dataset.name, btn.dataset.lat, btn.dataset.lon);
        }
      });
    }

    const durBox = document.getElementById('route-duration-buttons');
    if (durBox) {
      durBox.addEventListener('click', (e) => {
        const btn = e.target.closest('.city-chip');
        if (btn && btn.dataset.duration) {
          durBox.querySelectorAll('.city-chip').forEach(b => {
            b.style.background = '';
            b.style.color = '';
          });
          btn.style.background = 'var(--md-sys-color-primary)';
          btn.style.color = '#fff';
          State.state.route.legDurationMinutes = parseInt(btn.dataset.duration, 10);
          State.save();
          this.analyzeCurrentRoute(false);
        }
      });
    }

    // 10. Instellingen opslaan
    const saveSettings = document.getElementById('save-settings-btn');
    if (saveSettings) {
      saveSettings.addEventListener('click', () => {
        const selM = document.getElementById('setting-morning-time');
        const selE = document.getElementById('setting-evening-time');
        const rTemp = document.getElementById('setting-min-temp');
        const rGusts = document.getElementById('setting-max-gusts');

        if (selM) State.state.commute.morningTime = selM.value;
        if (selE) State.state.commute.eveningTime = selE.value;
        if (rTemp) State.state.commute.minTemp = parseInt(rTemp.value, 10);
        if (rGusts) State.state.commute.maxGusts = parseInt(rGusts.value, 10);

        State.save();
        this.closeModal('settings-modal');
        this._renderCurrentData();
        UIRenderer.showToast(I18n.t.toasts.settingsSaved);
      });
    }

    const rMinTemp = document.getElementById('setting-min-temp');
    if (rMinTemp) {
      rMinTemp.addEventListener('input', (e) => {
        const v = document.getElementById('val-min-temp');
        if (v) v.textContent = I18n.formatters.celsius(e.target.value);
      });
    }
    const rMaxGusts = document.getElementById('setting-max-gusts');
    if (rMaxGusts) {
      rMaxGusts.addEventListener('input', (e) => {
        const v = document.getElementById('val-max-gusts');
        if (v) v.textContent = I18n.formatters.kmh(e.target.value);
      });
    }
  }
};

if (typeof window !== 'undefined') window.App = App;
if (typeof module !== 'undefined') module.exports = App;

// Start de applicatie zodra de DOM geladen is
window.addEventListener('DOMContentLoaded', () => App.init());
