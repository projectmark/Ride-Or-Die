/**
 * Ride Or Die - Hoofdcontroller & Applicatie-orchestrator
 * Verbindt de Toestand (State), Weerdienst (WeatherService), Rekenkernen (Commute & Route)
 * en de Weergavelaag (UIRenderer) volgens het Single Responsibility Principle.
 */

const App = {
  _routeSearchTimer: null,
  _locationSearchTimer: null,
  _focusedWaypoint: 'start',
  _lastActiveDateStr: new Date().toDateString(),
  _rafRenderId: null,
  _rafFuelRenderId: null,

  /**
   * Plan een dashboard-render op het eerstvolgende animatieframe (60fps/120fps throttling bij sliders).
   */
  _scheduleRender() {
    if (this._rafRenderId) return;
    this._rafRenderId = requestAnimationFrame(() => {
      this._rafRenderId = null;
      this._renderCurrentData();
    });
  },

  /**
   * Plan een brandstofkaart-render op het eerstvolgende animatieframe.
   */
  _scheduleFuelRender() {
    if (this._rafFuelRenderId) return;
    this._rafFuelRenderId = requestAnimationFrame(() => {
      this._rafFuelRenderId = null;
      const records = State.get('fuelData');
      if (records) UIRenderer.renderFuelCard(records, State.state);
      this._updateFuelPrefPreview();
    });
  },

  /**
   * Initialiseert de applicatie bij het laden van de pagina.
   */
  async init() {
    this._lastActiveDateStr = new Date().toDateString();
    State.load();
    UIRenderer.renderTheme(State.get('theme'), true);
    UIRenderer.renderViewMode(State.get('viewMode'));
    UIRenderer.updateNavbar(State.state);
    UIRenderer.populateFuelPresets(State.state.fuel?.presetId, State.state.fuel?.carPresetId);

    const workdayConfig = CommuteEngine.getWorkdayConfig();
    UIRenderer.renderDayToggle(State.get('selectedDay'), workdayConfig);

    this._bindEvents();
    this._setupStateSubscribers();

    // Initieel weer ophalen voor huidige locatie en route (parallel voor minimale laadtijd, 1x gecontroleerd renderen)
    await Promise.all([
      this.refreshWeather(false, true),
      this.analyzeCurrentRoute(false, true),
      this.refreshFuelData(false)
    ]);
    this._renderCurrentData();
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
      const fuelRecords = State.get('fuelData');
      if (fuelRecords) {
        UIRenderer.renderFuelCard(fuelRecords, State.state);
      }
    });

    State.subscribe('fuel', () => {
      const fuelRecords = State.get('fuelData');
      if (fuelRecords) {
        UIRenderer.renderFuelCard(fuelRecords, State.state);
      }
      this._syncPreferenceSlidersToDOM();
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
      maxGusts: State.state.commute.maxGusts,
      avoidRain: State.state.commute.avoidRain,
      rainTolerance: State.state.commute.rainTolerance,
      heatedGloves: State.state.commute.heatedGloves
    }, State.state.route);

    UIRenderer.renderDashboard(data, advice, State.state);

    const fuelRecords = State.get('fuelData');
    if (fuelRecords) {
      UIRenderer.renderFuelCard(fuelRecords, State.state);
    }
  },

  /**
   * Haalt weergegevens op via WeatherService.
   */
  async refreshWeather(force = false, skipRender = false) {
    const loc = State.get('location');
    if (!loc) return;

    UIRenderer.setLoading(true);
    if (force) {
      UIRenderer.showToast(I18n.t.toasts.weatherForceRefresh);
    }

    try {
      const res = await WeatherService.fetchMainLocationWeather(loc.latitude, loc.longitude, force);
      if (res.instantData && !State.get('weatherData') && !skipRender) {
        State.set('weatherData', res.instantData, false);
        this._renderCurrentData();
      }

      State.set('weatherData', res.data, false);
      if (!skipRender) {
        this._renderCurrentData();
      }

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
   * Haalt actuele en historische brandstofprijzen op via FuelService (CBS + Dynamische Dagkoers).
   */
  async refreshFuelData(force = false) {
    const syncIcon = document.getElementById('fuel-refresh-icon');
    if (syncIcon && force) syncIcon.classList.add('spin');
    try {
      const records = await FuelService.fetchFuelData(force);
      State.set('fuelData', records, false);
      UIRenderer.renderFuelCard(records, State.state);
      this._updateFuelPrefPreview();
      if (force) {
        UIRenderer.showToast('\u26FD Brandstofprijzen & actuele dagkoers bijgewerkt');
      }
    } catch (e) {
      console.warn('[App] Kon brandstofdata niet laden:', e);
    } finally {
      if (syncIcon) {
        setTimeout(() => syncIcon.classList.remove('spin'), 400);
      }
    }
  },

  _updateFuelPrefPreview() {
    const previewEl = document.getElementById('fuel-pref-preview-text');
    if (!previewEl) return;
    const roadKm = State.state.route?.roadKm || 36;
    const cons = State.state.fuel?.consumptionL100km || 5.6;
    const carCons = State.state.fuel?.carConsumptionL100km || 5.8;
    const records = State.get('fuelData');
    const fuelType = State.state.fuel?.fuelType || 'BenzineEuro95_1';
    const stats = records ? FuelService.getStats(records, fuelType, '30D', State.state.fuel) : null;
    const price = FuelService.getEffectivePrice(stats, State.state.fuel);
    const trip = FuelService.calculateTripCost(roadKm, cons, price);
    const savings = FuelService.calculateCarSavings(roadKm, cons, carCons, price);
    const costStr = (typeof I18n !== 'undefined' && I18n.formatters?.currency)
      ? I18n.formatters.currency(trip.cost)
      : `€ ${trip.cost.toFixed(2)}`;
    const litersStr = (typeof I18n !== 'undefined' && I18n.formatters?.liters)
      ? I18n.formatters.liters(trip.liters)
      : `${trip.liters.toFixed(1)} L`;

    const carPresets = Config.FUEL?.CAR_PRESETS || [];
    const activeCar = carPresets.find(c => c.id === State.state.fuel?.carPresetId) || carPresets.find(c => c.consumption === carCons);
    const carLabel = (activeCar && activeCar.id !== 'custom') ? (activeCar.shortName || activeCar.name) : `Auto (${carCons.toFixed(1).replace('.', ',')} L)`;
    const diffStr = savings.daily >= 0
      ? `Besparing vs. ${carLabel}: € ${savings.absDaily.toFixed(2).replace('.', ',')}/dag (€ ${Math.round(savings.absMonthly)}/mnd)`
      : `Verschil vs. ${carLabel}: ${carLabel} is € ${savings.absDaily.toFixed(2).replace('.', ',')}/dag zuiniger`;

    previewEl.textContent = `Rit (${roadKm} km): ${costStr} enkele reis (${litersStr}) • ${diffStr}`;
  },

  _applyBikePreset(presetId) {
    const presets = Config.FUEL?.PRESETS || [];
    const found = presets.find(p => p.id === presetId);
    if (!found) return;

    State.state.fuel.presetId = presetId;
    if (presetId !== 'custom') {
      State.state.fuel.consumptionL100km = found.consumption;
      if (found.tank) State.state.fuel.tankCapacityL = found.tank;
    }
    State.save();

    this._syncPreferenceSlidersToDOM();
    const records = State.get('fuelData');
    if (records) UIRenderer.renderFuelCard(records, State.state);
    const shortName = found.name.split('—')[0].trim();
    const toastMsg = (typeof I18n !== 'undefined' && I18n.t?.toasts?.bikeProfileUpdated)
      ? I18n.t.toasts.bikeProfileUpdated(shortName)
      : `Motorfiets: ${shortName}`;
    UIRenderer.showToast(toastMsg);
  },

  _applyCarPreset(carPresetId) {
    const carPresets = Config.FUEL?.CAR_PRESETS || [];
    const found = carPresets.find(c => c.id === carPresetId);
    if (!found) return;

    State.state.fuel.carPresetId = carPresetId;
    if (carPresetId !== 'custom') {
      State.state.fuel.carConsumptionL100km = found.consumption;
    }
    State.save();

    this._syncPreferenceSlidersToDOM();
    const records = State.get('fuelData');
    if (records) UIRenderer.renderFuelCard(records, State.state);
    const shortName = found.name.split('—')[0].trim();
    UIRenderer.showToast(`\uD83D\uDE97 Vergelijkingsauto: ${shortName} (${found.consumption.toFixed(1).replace('.', ',')} L/100km)`);
  },

  async analyzeCurrentRoute(force = false, skipRender = false) {
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
      if (!skipRender) {
        this._renderCurrentData();
      }
    } catch (err) {
      console.warn("Fout bij trajectanalyse:", err);
    }
  },

  /**
   * Kiest een nieuwe basislocatie.
   */
  selectLocation(name, lat, lon, country = 'NL') {
    State.set('location', { name, latitude: Number(lat), longitude: Number(lon), country });
    State.markUserConfigured();
    this._renderLocationChips();
    this.closeModal('route-planner-modal');
    this.refreshWeather(false);
    UIRenderer.showToast(I18n.t.toasts.locationChanged(name));
  },

  /**
   * Selecteert een punt op de route (start of bestemming).
   */
  selectRoutePoint(key, name, lat, lon, country = 'NL') {
    State.state.route[key] = { name, lat: Number(lat), lon: Number(lon), country };
    State.markUserConfigured();
    RouteEngine.syncRouteState(State.state.route.start, State.state.route.dest, State.state.route.legDurationMinutes);

    const input = document.getElementById(`route-${key}-input`);
    if (input) input.value = name;
    const drop = document.getElementById(`route-${key}-results`);
    if (drop) drop.classList.remove('show');

    this._updateCorridorPreview();
    this._renderRouteChips();
    this._renderLocationChips();
    State.save();

    if (key === 'start') {
      State.set('location', { name, latitude: Number(lat), longitude: Number(lon), country });
      Promise.all([
        this.refreshWeather(false, true),
        this.analyzeCurrentRoute(false, true)
      ]).then(() => this._renderCurrentData());
    } else {
      this.analyzeCurrentRoute(false);
    }

    UIRenderer.showToast(`${name} gekozen voor je motorrit`);
  },

  /**
   * Draait startpunt en bestemming om.
   */
  swapRoute() {
    const temp = State.state.route.start;
    State.state.route.start = State.state.route.dest;
    State.state.route.dest = temp;
    State.markUserConfigured();

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
    this._renderLocationChips();
    State.save();
    Promise.all([
      this.refreshWeather(false, true),
      this.analyzeCurrentRoute(false, true)
    ]).then(() => this._renderCurrentData());
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

  _syncPreferenceSlidersToDOM() {
    const minT = State.state.commute.minTemp !== undefined ? State.state.commute.minTemp : 8;
    const maxG = State.state.commute.maxGusts !== undefined ? State.state.commute.maxGusts : 55;
    const avoidR = !!State.state.commute.avoidRain;
    const heatedG = !!State.state.commute.heatedGloves;
    const rainTol = State.state.commute.rainTolerance || (avoidR ? 'avoid' : 'flexible');

    const selM = document.getElementById('setting-morning-time');
    const selE = document.getElementById('setting-evening-time');
    if (selM && State.state.commute.morningTime) selM.value = State.state.commute.morningTime;
    if (selE && State.state.commute.eveningTime) selE.value = State.state.commute.eveningTime;

    const vMorning = document.getElementById('val-morning-time');
    if (vMorning && selM) {
      const opt = selM.options[selM.selectedIndex];
      vMorning.textContent = opt ? opt.text : (State.state.commute.morningTime || '08.00 uur');
    }
    const vEvening = document.getElementById('val-evening-time');
    if (vEvening && selE) {
      const opt = selE.options[selE.selectedIndex];
      vEvening.textContent = opt ? opt.text : (State.state.commute.eveningTime || '17.00 uur');
    }

    const rTemp = document.getElementById('setting-min-temp');
    if (rTemp) rTemp.value = minT;
    const vTemp = document.getElementById('val-min-temp');
    if (vTemp) vTemp.textContent = I18n.formatters.celsius(minT);

    // Verwarmde Handschoenen sync
    const chkGloves = document.getElementById('setting-heated-gloves');
    if (chkGloves) chkGloves.checked = heatedG;
    const vGloves = document.getElementById('val-heated-gloves');
    if (vGloves) {
      vGloves.textContent = heatedG ? "Aan (vanaf 3°C)" : "Uit";
      vGloves.style.color = heatedG ? "#f59e0b" : "var(--text-muted)";
    }

    const rGusts = document.getElementById('setting-max-gusts');
    if (rGusts) rGusts.value = maxG;
    const vGusts = document.getElementById('val-max-gusts');
    if (vGusts) vGusts.textContent = I18n.formatters.kmh(maxG);

    // Neerslagtolerantie buttons sync
    const tolButtons = document.querySelectorAll('#setting-rain-tolerance-group .tolerance-seg-btn');
    tolButtons.forEach(btn => {
      const mode = btn.getAttribute('data-tolerance');
      const isActive = mode === rainTol;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    const vTolerance = document.getElementById('val-rain-tolerance');
    if (vTolerance) {
      if (rainTol === 'avoid') {
        vTolerance.textContent = "Droogrijder";
        vTolerance.style.color = "#ef4444";
      } else if (rainTol === 'all_weather') {
        vTolerance.textContent = "Doorrijder";
        vTolerance.style.color = "#10b981";
      } else {
        vTolerance.textContent = "Flexibel";
        vTolerance.style.color = "#0284c7";
      }
    }

    const dTolerance = document.getElementById('desc-rain-tolerance');
    if (dTolerance) {
      if (rainTol === 'avoid') {
        dTolerance.textContent = "Droogrijder: Regen weegt zwaar. Bij neerslag op je traject kleurt het advies direct rood (advies: auto/ov).";
      } else if (rainTol === 'all_weather') {
        dTolerance.textContent = "Doorrijder: Waterdicht pak & pinlock actief. Gewone regenbuien geven geel/groen advies; alleen wolkbreuk of onweer stopt je.";
      } else {
        dTolerance.textContent = "Flexibel: Een lichte bui (<0,8 mm) is acceptabel (geel advies), aanhoudende of zware regen wordt afgeraden.";
      }
    }

    // Brandstof & Motorfiets sync
    const fuel = State.state.fuel || { consumptionL100km: 5.6, tankCapacityL: 16, presetId: 'hornet' };
    const selPreset = document.getElementById('setting-bike-preset');
    if (selPreset) selPreset.value = fuel.presetId || 'custom';

    const vPreset = document.getElementById('modal-val-bike-preset');
    if (vPreset && selPreset) {
      const opt = selPreset.options[selPreset.selectedIndex];
      vPreset.textContent = opt ? opt.text.split('—')[0].trim() : 'Aangepast';
    }

    const rCons = document.getElementById('setting-fuel-consumption');
    if (rCons) rCons.value = fuel.consumptionL100km || 5.6;

    const vCons = document.getElementById('val-fuel-consumption');
    if (vCons) {
      const consVal = Number(fuel.consumptionL100km || 5.6);
      const ratio = consVal > 0 ? (100 / consVal).toFixed(1) : '20,0';
      vCons.textContent = `${consVal.toFixed(1).replace('.', ',')} L / 100 km (1 op ${ratio.replace('.', ',')})`;
    }

    const rTank = document.getElementById('setting-tank-capacity');
    if (rTank) rTank.value = fuel.tankCapacityL || 16;

    const vTank = document.getElementById('val-tank-capacity');
    if (vTank) vTank.textContent = `${fuel.tankCapacityL || 16} Liter`;

    // Vergelijkingsauto (Motor vs. Auto) sync
    const carPresets = Config.FUEL?.CAR_PRESETS || [];
    const carConsVal = Number(fuel.carConsumptionL100km || 5.8);
    const matchedCar = carPresets.find(c => c.id === fuel.carPresetId) || carPresets.find(c => c.consumption === carConsVal);
    const activeCarId = fuel.carPresetId || (matchedCar ? matchedCar.id : 'custom');

    const selCarPreset = document.getElementById('setting-car-preset');
    if (selCarPreset) selCarPreset.value = activeCarId;
    const quickCarPreset = document.getElementById('fuel-quick-car-select');
    if (quickCarPreset) quickCarPreset.value = activeCarId;

    const vCarPreset = document.getElementById('modal-val-car-preset');
    if (vCarPreset) {
      vCarPreset.textContent = (matchedCar && activeCarId !== 'custom') ? matchedCar.name : 'Eigen Auto';
    }

    const rCarCons = document.getElementById('setting-car-consumption');
    if (rCarCons) rCarCons.value = carConsVal;

    const vCarCons = document.getElementById('val-car-consumption');
    if (vCarCons) {
      const carRatio = carConsVal > 0 ? (100 / carConsVal).toFixed(1) : '17,2';
      vCarCons.textContent = `${carConsVal.toFixed(1).replace('.', ',')} L / 100 km (1 op ${carRatio.replace('.', ',')})`;
    }
    // Prijsmodus & Dagkoers sync
    const mode = fuel.priceMode || 'daily';
    const isUserCustom = Boolean(fuel.isUserCustom && typeof fuel.customPricePerLiter === 'number');
    const records = State.get('fuelData');
    const stats = records ? FuelService.getStats(records, fuel.fuelType || 'BenzineEuro95_1', '30D', fuel) : null;
    const effectivePrice = FuelService.getEffectivePrice(stats, fuel);
    const fmtPrice = (p) => (typeof I18n !== 'undefined' && I18n.formatters?.fuelPrice) ? I18n.formatters.fuelPrice(p) : Number(p).toFixed(3).replace('.', ',');

    const modalModeBtns = document.querySelectorAll('#modal-fuel-mode-group .fuel-seg-btn');
    modalModeBtns.forEach(btn => {
      const m = btn.getAttribute('data-mode');
      const active = (m === 'cbs' && mode === 'cbs' && !isUserCustom) || (m === 'daily' && mode === 'daily' && !isUserCustom);
      btn.classList.toggle('active', active);
    });

    const wrapCustom = document.getElementById('custom-price-slider-wrap');
    if (wrapCustom) wrapCustom.style.display = 'block';
    const chipsCustom = document.getElementById('fuel-quick-price-chips');
    if (chipsCustom) chipsCustom.style.display = 'flex';

    const rPrice = document.getElementById('setting-custom-fuel-price');
    if (rPrice) rPrice.value = effectivePrice.toFixed(2);

    const vPricePill = document.getElementById('val-fuel-price-pill');
    if (vPricePill) {
      const note = isUserCustom ? '(Aangepast)' : (mode === 'cbs' ? '(CBS)' : '(Dagkoers)');
      vPricePill.textContent = `\u20AC ${fmtPrice(effectivePrice)} / L ${note}`;
    }

    this._updateFuelPrefPreview();

    const chkRain = document.getElementById('setting-avoid-rain');
    if (chkRain) chkRain.checked = (rainTol === 'avoid');
  },

  _syncSettingsViewButtons() {
    const isWidget = State.get('viewMode') === 'widget';
    const btnCockpit = document.getElementById('settings-view-cockpit');
    const btnWidget = document.getElementById('settings-view-widget');
    if (btnCockpit) btnCockpit.classList.toggle('active', !isWidget);
    if (btnWidget) btnWidget.classList.toggle('active', isWidget);
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
    const routePresets = document.getElementById('route-preset-chips');
    if (routePresets) {
      const curDest = (State.state.route.dest?.name || '').toLowerCase();
      routePresets.innerHTML = Config.PRESET_CITIES.slice(0, 12).map(c => `
        <button type="button" class="city-chip ${c.name.toLowerCase() === curDest ? 'active' : ''}" data-name="${c.name}" data-lat="${c.lat}" data-lon="${c.lon}">${c.name}</button>
      `).join('');
    }
  },

  _switchRouteModalTab(targetTab) {
    const modal = document.getElementById('route-planner-modal');
    if (!modal) return;
    modal.querySelectorAll('.route-wiki-tab').forEach(t => {
      const isAct = t.getAttribute('data-route-tab') === targetTab;
      t.classList.toggle('is-active', isAct);
      t.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });
    modal.querySelectorAll('.route-tab-panel').forEach(panel => {
      panel.style.display = panel.getAttribute('data-route-panel') === targetTab ? 'flex' : 'none';
    });
    if (targetTab === 'base') {
      this._renderLocationChips();
    }
  },

  openModal(modalId, initialSubTab = null) {
    if (modalId === 'location-modal') {
      return this.openModal('route-planner-modal', 'base');
    }

    const modal = document.getElementById(modalId);
    if (!modal) return;

    const modalSheet = modal.querySelector('.score-modal-sheet, .m3-modal-sheet');
    if (modalSheet) modalSheet.scrollTop = 0;

    if (modalId === 'route-planner-modal') {
      const targetTab = initialSubTab || 'route';
      this._switchRouteModalTab(targetTab);

      const startIn = document.getElementById('route-start-input');
      const destIn = document.getElementById('route-dest-input');
      if (startIn && State.state.route.start) startIn.value = State.state.route.start.name;
      if (destIn && State.state.route.dest) destIn.value = State.state.route.dest.name;

      this._syncPreferenceSlidersToDOM();
      this._updateCorridorPreview();
      this._renderRouteChips();
      this._renderLocationChips();
      if (!State.state.route?.waypointsWeather?.start) {
        this.analyzeCurrentRoute(false);
      }
      if (!State.get('fuelData')) {
        this.refreshFuelData(false);
      }
    } else if (modalId === 'settings-modal') {
      UIRenderer.renderTheme(State.get('theme'), true);
      this._syncPreferenceSlidersToDOM();
      this._syncSettingsViewButtons();
    } else if (modalId === 'score-breakdown-modal') {
      modal.querySelectorAll('.score-wiki-tab:not(.route-wiki-tab)').forEach(t => {
        const isLive = t.getAttribute('data-tab') === 'live';
        t.classList.toggle('is-active', isLive);
        t.setAttribute('aria-selected', isLive ? 'true' : 'false');
      });
      modal.querySelectorAll('.score-tab-panel:not(.route-tab-panel)').forEach(panel => {
        panel.style.display = panel.getAttribute('data-panel') === 'live' ? 'flex' : 'none';
      });

      if (UIRenderer._lastAdvice) {
        UIRenderer.renderScoreBreakdown(UIRenderer._lastAdvice, State.state);
      } else {
        const curData = State.get('weatherData');
        if (curData) {
          const curAdvice = CommuteEngine.computeAdvice(curData, {
            selectedDay: State.get('selectedDay'),
            morningTime: State.state.commute.morningTime,
            eveningTime: State.state.commute.eveningTime,
            minTemp: State.state.commute.minTemp,
            maxGusts: State.state.commute.maxGusts,
            avoidRain: State.state.commute.avoidRain,
            rainTolerance: State.state.commute.rainTolerance,
            heatedGloves: State.state.commute.heatedGloves
          }, State.state.route);
          UIRenderer.renderScoreBreakdown(curAdvice, State.state);
        }
      }
    }
    modal.classList.add('open');
  },

  closeModal(modalId) {
    const targetId = modalId === 'location-modal' ? 'route-planner-modal' : modalId;
    const modal = document.getElementById(targetId);
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
    const checkDailyRolloverAndRefresh = () => {
      const todayStr = new Date().toDateString();
      const isNewDay = todayStr !== this._lastActiveDateStr;
      if (isNewDay) {
        this._lastActiveDateStr = todayStr;
        const workdayConfig = CommuteEngine.getWorkdayConfig();
        UIRenderer.renderDayToggle(State.get('selectedDay'), workdayConfig);
        this.refreshWeather(true);
        this.analyzeCurrentRoute(true);
        this.refreshFuelData(true);
        return;
      }

      const cached = WeatherCache.get(State.state.location.latitude, State.state.location.longitude, false);
      if (!cached || !cached.isFresh) {
        this.refreshWeather(false);
        this.analyzeCurrentRoute(false);
      }
      this.refreshFuelData(false);
    };

    setInterval(() => {
      if (!document.hidden) {
        checkDailyRolloverAndRefresh();
      }
    }, Config.API.CACHE_TTL_MS);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkDailyRolloverAndRefresh();
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
        this._syncSettingsViewButtons();
        UIRenderer.showToast(next === 'widget' ? I18n.t.toasts.widgetModeActive : I18n.t.toasts.cockpitModeActive);
      });
    }

    const switchBack = document.getElementById('widget-switch-to-cockpit-btn');
    if (switchBack) {
      switchBack.addEventListener('click', () => {
        State.set('viewMode', 'cockpit');
        this._syncSettingsViewButtons();
        UIRenderer.showToast(I18n.t.toasts.cockpitModeActive);
      });
    }

    const btnCockpit = document.getElementById('settings-view-cockpit');
    if (btnCockpit) {
      btnCockpit.addEventListener('click', () => {
        State.set('viewMode', 'cockpit');
        this._syncSettingsViewButtons();
        UIRenderer.showToast(I18n.t.toasts.cockpitModeActive);
      });
    }

    const btnWidget = document.getElementById('settings-view-widget');
    if (btnWidget) {
      btnWidget.addEventListener('click', () => {
        State.set('viewMode', 'widget');
        this._syncSettingsViewButtons();
        UIRenderer.showToast(I18n.t.toasts.widgetModeActive);
      });
    }

    // 2. Themawissel
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
      this.refreshFuelData(true);
    });

    const fuelRefreshBtn = document.getElementById('fuel-refresh-btn');
    if (fuelRefreshBtn) fuelRefreshBtn.addEventListener('click', () => {
      this.refreshFuelData(true);
    });

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this._syncUrlHash());

    // 5. GPS-locatie (Basislocatie & Startpunt Route)
    const requestGpsLocation = (onSuccess) => {
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
          onSuccess(geo, lat, lon);
        },
        () => {
          UIRenderer.showToast(I18n.t.toasts.gpsDenied);
        },
        { timeout: Config.API.GPS_TIMEOUT_MS, enableHighAccuracy: true }
      );
    };

    const modalGps = document.getElementById('modal-gps-btn');
    if (modalGps) {
      modalGps.addEventListener('click', () => {
        requestGpsLocation((geo, lat, lon) => {
          this.selectLocation(geo.name, lat, lon, geo.country);
        });
      });
    }

    const routeStartGps = document.getElementById('route-start-gps-btn');
    if (routeStartGps) {
      routeStartGps.addEventListener('click', () => {
        requestGpsLocation((geo, lat, lon) => {
          this.selectRoutePoint('start', geo.name, lat, lon, geo.country);
        });
      });
    }

    // 6. Dialoogvensters openen en sluiten
    const bindModal = (openId, closeId, modalId) => {
      const openBtn = document.getElementById(openId);
      if (openBtn) openBtn.addEventListener('click', () => this.openModal(modalId));
      const closeBtn = document.getElementById(closeId);
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal(modalId));
    };

    bindModal('open-settings-btn', 'close-modal-btn', 'settings-modal');
    bindModal('nav-route-btn', 'close-route-modal-btn', 'route-planner-modal');

    const closeScoreBtn = document.getElementById('close-score-modal-btn');
    if (closeScoreBtn) closeScoreBtn.addEventListener('click', () => this.closeModal('score-breakdown-modal'));
    const closeScoreAck = document.getElementById('close-score-ack-btn');
    if (closeScoreAck) closeScoreAck.addEventListener('click', () => this.closeModal('score-breakdown-modal'));

    // Wiki / FAQ Tab switching inside score breakdown modal
    const scoreTabs = document.querySelectorAll('.score-wiki-tab:not(.route-wiki-tab)');
    scoreTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        if (!targetTab) return;
        scoreTabs.forEach(t => {
          const isActive = t === tab;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        document.querySelectorAll('.score-tab-panel:not(.route-tab-panel)').forEach(panel => {
          panel.style.display = panel.getAttribute('data-panel') === targetTab ? 'flex' : 'none';
        });
      });
    });

    // Tab switching inside Route & Locatie modal (Motorrit vs Basislocatie)
    const routeTabs = document.querySelectorAll('.route-wiki-tab');
    routeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-route-tab');
        if (targetTab) this._switchRouteModalTab(targetTab);
      });
    });

    // Delegate any score-breakdown-trigger clicks to open score breakdown modal
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.score-breakdown-trigger');
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        this.openModal('score-breakdown-modal');
      }
    });

    const saveCloseRoute = document.getElementById('close-route-save-btn');
    if (saveCloseRoute) {
      saveCloseRoute.addEventListener('click', () => {
        State.save();
        this.closeModal('route-planner-modal');
        this._renderCurrentData();
        UIRenderer.showToast(I18n.t.toasts.settingsSaved);
      });
    }

    const switchToRoutePrefs = document.getElementById('switch-to-route-prefs-btn');
    if (switchToRoutePrefs) {
      switchToRoutePrefs.addEventListener('click', () => {
        this.closeModal('settings-modal');
        this.openModal('route-planner-modal');
      });
    }

    const saveSettings = document.getElementById('save-settings-btn');
    if (saveSettings) {
      saveSettings.addEventListener('click', () => {
        this.closeModal('settings-modal');
      });
    }

    ['settings-modal', 'route-planner-modal', 'score-breakdown-modal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal(id);
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal('settings-modal');
        this.closeModal('route-planner-modal');
        this.closeModal('score-breakdown-modal');
      }
    });

    // 7. Routeknoppen & Omdraaien
    const swapBtns = ['master-swap-btn', 'route-swap-btn'];
    swapBtns.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.swapRoute());
    });

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

    const routePresets = document.getElementById('route-preset-chips');
    if (routePresets) {
      routePresets.addEventListener('click', (e) => {
        const btn = e.target.closest('.city-chip');
        if (btn && btn.dataset.name) {
          this.selectRoutePoint(this._focusedWaypoint || 'dest', btn.dataset.name, btn.dataset.lat, btn.dataset.lon);
        }
      });
    }

    // 10. Vaste Rittijden & Temperatuur/Windlimiet (in het Rit-scherm)
    const selMorning = document.getElementById('setting-morning-time');
    if (selMorning) {
      selMorning.addEventListener('change', (e) => {
        State.state.commute.morningTime = e.target.value;
        this._syncPreferenceSlidersToDOM();
        State.save();
        this._renderCurrentData();
      });
    }

    const selEvening = document.getElementById('setting-evening-time');
    if (selEvening) {
      selEvening.addEventListener('change', (e) => {
        State.state.commute.eveningTime = e.target.value;
        this._syncPreferenceSlidersToDOM();
        State.save();
        this._renderCurrentData();
      });
    }

    const bindPrefSlider = (inputId, prop) => {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        State.state.commute[prop] = val;
        if (prop === 'minTemp') {
          const vTemp = document.getElementById('val-min-temp');
          if (vTemp) vTemp.textContent = I18n.formatters.celsius(val);
        } else if (prop === 'maxGusts') {
          const vGusts = document.getElementById('val-max-gusts');
          if (vGusts) vGusts.textContent = I18n.formatters.kmh(val);
        }
        State.saveDebounced();
        this._scheduleRender();
      });
    };

    bindPrefSlider('setting-min-temp', 'minTemp');
    bindPrefSlider('setting-max-gusts', 'maxGusts');

    const chkGloves = document.getElementById('setting-heated-gloves');
    if (chkGloves) {
      chkGloves.addEventListener('change', (e) => {
        State.state.commute.heatedGloves = e.target.checked;
        this._syncPreferenceSlidersToDOM();
        State.save();
        this._renderCurrentData();
      });
    }

    const tolButtons = document.querySelectorAll('#setting-rain-tolerance-group .tolerance-seg-btn');
    tolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tol = btn.getAttribute('data-tolerance');
        State.state.commute.rainTolerance = tol;
        State.state.commute.avoidRain = (tol === 'avoid');
        this._syncPreferenceSlidersToDOM();
        State.save();
        this._renderCurrentData();
      });
    });

    // 7. Brandstof & Verbruik Events
    document.querySelectorAll('#fuel-type-group .fuel-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fuelType = btn.getAttribute('data-fuel');
        if (fuelType) {
          State.state.fuel.fuelType = fuelType;
          State.save();
          const records = State.get('fuelData');
          if (records) UIRenderer.renderFuelCard(records, State.state);
        }
      });
    });

    document.querySelectorAll('#fuel-range-group .fuel-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const range = btn.getAttribute('data-range');
        if (range) {
          State.state.fuel.timeRange = range;
          State.save();
          const records = State.get('fuelData');
          if (records) UIRenderer.renderFuelCard(records, State.state);
        }
      });
    });

    const quickPreset = document.getElementById('fuel-quick-preset-select');
    if (quickPreset) {
      quickPreset.addEventListener('change', (e) => {
        this._applyBikePreset(e.target.value);
      });
    }

    const modalPreset = document.getElementById('setting-bike-preset');
    if (modalPreset) {
      modalPreset.addEventListener('change', (e) => {
        this._applyBikePreset(e.target.value);
      });
    }

    const quickCarPreset = document.getElementById('fuel-quick-car-select');
    if (quickCarPreset) {
      quickCarPreset.addEventListener('change', (e) => {
        this._applyCarPreset(e.target.value);
      });
    }

    const modalCarPreset = document.getElementById('setting-car-preset');
    if (modalCarPreset) {
      modalCarPreset.addEventListener('change', (e) => {
        this._applyCarPreset(e.target.value);
      });
    }

    const carConsSlider = document.getElementById('setting-car-consumption');
    if (carConsSlider) {
      carConsSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          State.state.fuel.carConsumptionL100km = val;
          State.state.fuel.carPresetId = 'custom';
          const vCarCons = document.getElementById('val-car-consumption');
          if (vCarCons) {
            const ratio = (100 / val).toFixed(1);
            vCarCons.textContent = `${val.toFixed(1).replace('.', ',')} L / 100 km (1 op ${ratio.replace('.', ',')})`;
          }
          const selCarM = document.getElementById('setting-car-preset');
          if (selCarM) selCarM.value = 'custom';
          const vCarP = document.getElementById('modal-val-car-preset');
          if (vCarP) vCarP.textContent = 'Eigen Auto';
          const quickCarP = document.getElementById('fuel-quick-car-select');
          if (quickCarP) quickCarP.value = 'custom';
          State.saveDebounced();
          this._scheduleFuelRender();
        }
      });
    }

    const consSlider = document.getElementById('setting-fuel-consumption');
    if (consSlider) {
      consSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        State.state.fuel.consumptionL100km = val;
        State.state.fuel.presetId = 'custom';
        const vCons = document.getElementById('val-fuel-consumption');
        if (vCons) {
          const ratio = (100 / val).toFixed(1);
          vCons.textContent = val.toFixed(1).replace('.', ',') + ' L / 100 km (1 op ' + ratio.replace('.', ',') + ')';
        }
        const selM = document.getElementById('setting-bike-preset');
        if (selM) selM.value = 'custom';
        const vP = document.getElementById('modal-val-bike-preset');
        if (vP) vP.textContent = 'Aangepast';
        const quickP = document.getElementById('fuel-quick-preset-select');
        if (quickP) quickP.value = 'custom';
        State.saveDebounced();
        this._scheduleFuelRender();
      });
    }

    const tankSlider = document.getElementById('setting-tank-capacity');
    if (tankSlider) {
      tankSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        State.state.fuel.tankCapacityL = val;
        const vTank = document.getElementById('val-tank-capacity');
        if (vTank) vTank.textContent = val + ' Liter';
        State.saveDebounced();
        this._scheduleFuelRender();
      });
    }

        // Dynamische Prijsmodus toggle (Actuele Dagkoers vs. CBS Meting)
    const handlePriceModeChange = (targetMode) => {
      const mode = (targetMode === 'cbs') ? 'cbs' : 'daily';
      State.state.fuel.priceMode = mode;
      State.state.fuel.isUserCustom = false;
      State.state.fuel.customPricePerLiter = null;
      State.save();
      this._syncPreferenceSlidersToDOM();
      const records = State.get('fuelData');
      if (records) UIRenderer.renderFuelCard(records, State.state);
      this._updateFuelPrefPreview();

      const toastMsg = (mode === 'daily') ? '\u26A1 Dynamische actuele dagkoers actief' : '\uD83C\uDFDB\uFE0F CBS landelijk gewogen meting actief';
      UIRenderer.showToast(toastMsg);
    };

    document.querySelectorAll('#fuel-mode-group .fuel-seg-btn, #modal-fuel-mode-group .fuel-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.getAttribute('data-mode');
        if (m) handlePriceModeChange(m);
      });
    });

    // Snelle prijzen chips (Dynamisch met offsets)
    document.querySelectorAll('#fuel-quick-price-chips .quick-price-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        const offsetAttr = btn.getAttribute('data-offset');

        if (preset === 'today' || preset === 'reset') {
          State.state.fuel.priceMode = 'daily';
          State.state.fuel.isUserCustom = false;
          State.state.fuel.customPricePerLiter = null;
          State.save();
          this._syncPreferenceSlidersToDOM();
          const records = State.get('fuelData');
          if (records) UIRenderer.renderFuelCard(records, State.state);
          this._updateFuelPrefPreview();
          UIRenderer.showToast('Hersteld naar live actuele dagkoers');
          return;
        }

        if (offsetAttr) {
          const offset = parseFloat(offsetAttr);
          const records = State.get('fuelData');
          const stats = records ? FuelService.getStats(records, State.state.fuel.fuelType, '30D', State.state.fuel) : null;
          const basePrice = stats ? stats.latestPrice : 2.25;
          const targetPrice = parseFloat((basePrice + offset).toFixed(3));

          State.state.fuel.priceMode = 'custom';
          State.state.fuel.isUserCustom = true;
          State.state.fuel.customPricePerLiter = targetPrice;
          State.save();
          this._syncPreferenceSlidersToDOM();
          if (records) UIRenderer.renderFuelCard(records, State.state);
          this._updateFuelPrefPreview();

          const fmtP = (typeof I18n !== 'undefined' && I18n.formatters?.currency)
            ? I18n.formatters.currency(targetPrice)
            : `\u20AC ${targetPrice.toFixed(2)}`;
          UIRenderer.showToast(`Pompprijs ingesteld op ${fmtP}/L`);
        }
      });
    });

    // Eigen Pompprijs Slider
    const customPriceSlider = document.getElementById('setting-custom-fuel-price');
    if (customPriceSlider) {
      customPriceSlider.addEventListener('input', (e) => {
        const p = parseFloat(e.target.value);
        if (!isNaN(p)) {
          State.state.fuel.priceMode = 'custom';
          State.state.fuel.isUserCustom = true;
          State.state.fuel.customPricePerLiter = p;
          const vPill = document.getElementById('val-fuel-price-pill');
          if (vPill) vPill.textContent = `\u20AC ${p.toFixed(3).replace('.', ',')} / L (Aangepast)`;
          State.saveDebounced();
          this._scheduleFuelRender();
        }
      });
    }

    const openFuelPrefsBtn = document.getElementById('fuel-open-prefs-btn');
    if (openFuelPrefsBtn) {
      openFuelPrefsBtn.addEventListener('click', () => {
        this.openModal('route-planner-modal', 'route');
        setTimeout(() => {
          const tegel3 = document.querySelector('#route-planner-modal .wiki-card[style*="grid-column"]');
          if (tegel3) tegel3.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      });
    }

    const widgetFuelBar = document.getElementById('widget-fuel-bar');
    if (widgetFuelBar) {
      widgetFuelBar.addEventListener('click', () => {
        State.set('viewMode', 'cockpit');
        setTimeout(() => {
          const card = document.getElementById('fuel-card');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      });
    }
    const chkRain = document.getElementById('setting-avoid-rain');
    if (chkRain) {
      chkRain.addEventListener('change', (e) => {
        State.state.commute.avoidRain = e.target.checked;
        State.state.commute.rainTolerance = e.target.checked ? 'avoid' : 'flexible';
        this._syncPreferenceSlidersToDOM();
        State.save();
        this._renderCurrentData();
      });
    }
  }
};

if (typeof window !== 'undefined') window.App = App;
if (typeof module !== 'undefined') module.exports = App;

// Start de applicatie zodra de DOM geladen is
window.addEventListener('DOMContentLoaded', () => App.init());
