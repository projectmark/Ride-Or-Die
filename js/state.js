/**
 * Ride Or Die - Reactive State Management
 * Beheert de toestand van de applicatie, persistentie in localStorage en
 * biedt een reactief publish/subscribe-patroon. Vrij van directe DOM-afhankelijkheden.
 */

class StateStore {
  constructor() {
    this._subscribers = new Map();
    this.state = this._getInitialState();
  }

  _getInitialState() {
    const d = Config.DEFAULTS;
    const randomRoute = (typeof Config.getRandomPresetRoute === 'function')
      ? Config.getRandomPresetRoute()
      : d.ROUTE;

    return {
      theme: d.THEME,
      viewMode: d.VIEW_MODE,
      selectedDay: d.SELECTED_DAY,
      userConfiguredLocation: false,
      location: {
        name: randomRoute.start.name,
        latitude: randomRoute.start.lat,
        longitude: randomRoute.start.lon,
        country: randomRoute.start.country || 'NL'
      },
      commute: {
        morningTime: d.COMMUTE.morningTime || d.COMMUTE.MORNING_TIME || '08:00',
        eveningTime: d.COMMUTE.eveningTime || d.COMMUTE.EVENING_TIME || '17:00',
        minTemp: d.COMMUTE.minTemp !== undefined ? d.COMMUTE.minTemp : (d.COMMUTE.MIN_TEMP || 8),
        maxGusts: d.COMMUTE.maxGusts !== undefined ? d.COMMUTE.maxGusts : (d.COMMUTE.MAX_GUSTS || 55),
        rainTolerance: d.COMMUTE.rainTolerance || 'flexible',
        avoidRain: d.COMMUTE.avoidRain !== undefined ? d.COMMUTE.avoidRain : (d.COMMUTE.AVOID_RAIN !== undefined ? d.COMMUTE.AVOID_RAIN : false),
        heatedGloves: d.COMMUTE.heatedGloves !== undefined ? !!d.COMMUTE.heatedGloves : false,
        ...d.COMMUTE
      },
      route: {
        start: { ...randomRoute.start },
        mid: { ...randomRoute.mid },
        dest: { ...randomRoute.dest },
        legDurationMinutes: randomRoute.duration || d.ROUTE.legDurationMinutes || 20,
        roadKm: 36,
        waypointsWeather: { start: null, mid: null, dest: null },
        morningAnalysis: null,
        eveningAnalysis: null
      },
      fuel: {
        ...(d.FUEL || {
          consumptionL100km: 5.6,
          tankCapacityL: 16,
          presetId: 'hornet',
          fuelType: 'BenzineEuro95_1',
          timeRange: '30D',
          carConsumptionL100km: 6.5,
          priceMode: 'custom',
          customPricePerLiter: 2.274
        })
      },
      fuelData: null,
      weatherData: null,
      isLoading: false
    };
  }

  /**
   * Abonneert een luisteraar op toestandsveranderingen.
   * @param {string} key - Toestandssleutel of '*' voor alle wijzigingen.
   * @param {Function} callback - Aangeroepen met (nieuwWaarde, oudWaarde, sleutel)
   */
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }
    this._subscribers.get(key).add(callback);
    return () => this._subscribers.get(key).delete(callback);
  }

  _notify(key, newVal, oldVal) {
    if (this._subscribers.has(key)) {
      this._subscribers.get(key).forEach(cb => cb(newVal, oldVal, key));
    }
    if (this._subscribers.has('*')) {
      this._subscribers.get('*').forEach(cb => cb(newVal, oldVal, key));
    }
  }

  /**
   * Werkt een deel van de toestand bij en stelt luisteraars op de hoogte.
   */
  set(key, value, persist = true) {
    const oldVal = this.state[key];
    this.state[key] = value;
    this._notify(key, value, oldVal);
    if (persist) this.save();
  }

  get(key) {
    return this.state[key];
  }

  /**
   * Markeert dat de gebruiker zelf een locatie of traject heeft ingesteld.
   */
  markUserConfigured() {
    this.state.userConfiguredLocation = true;
    try {
      localStorage.setItem('rideordie_user_configured', 'true');
    } catch (e) {
      // Negeer storage fouten in private browsing
    }
    this.save();
  }

  /**
   * Laadt opgeslagen toestand uit localStorage met veilige fallbacks.
   */
  load() {
    try {
      const theme = localStorage.getItem('rideordie_theme');
      if (theme && ['light', 'auto', 'dark'].includes(theme)) {
        this.state.theme = theme;
      }

      const viewMode = localStorage.getItem('rideordie_view_mode');
      const hash = window.location.hash || '';
      if (hash.includes('widget') || hash.includes('simple') || viewMode === 'widget') {
        this.state.viewMode = 'widget';
      } else {
        this.state.viewMode = 'cockpit';
      }

      const day = localStorage.getItem('rideordie_selected_day');
      if (day && ['today', 'nextWorkday'].includes(day)) {
        this.state.selectedDay = day;
      }

      const commuteRaw = localStorage.getItem('rideordie_commute');
      if (commuteRaw) {
        const parsedCommute = JSON.parse(commuteRaw);
        this.state.commute = {
          ...this.state.commute,
          ...parsedCommute,
          morningTime: parsedCommute.morningTime || parsedCommute.MORNING_TIME || this.state.commute.morningTime,
          eveningTime: parsedCommute.eveningTime || parsedCommute.EVENING_TIME || this.state.commute.eveningTime,
          minTemp: parsedCommute.minTemp !== undefined ? parsedCommute.minTemp : (parsedCommute.MIN_TEMP !== undefined ? parsedCommute.MIN_TEMP : this.state.commute.minTemp),
          maxGusts: parsedCommute.maxGusts !== undefined ? parsedCommute.maxGusts : (parsedCommute.MAX_GUSTS !== undefined ? parsedCommute.MAX_GUSTS : this.state.commute.maxGusts),
          rainTolerance: parsedCommute.rainTolerance || (parsedCommute.avoidRain ? 'avoid' : this.state.commute.rainTolerance || 'flexible'),
          avoidRain: parsedCommute.avoidRain !== undefined ? !!parsedCommute.avoidRain : (parsedCommute.rainTolerance === 'avoid'),
          heatedGloves: parsedCommute.heatedGloves !== undefined ? !!parsedCommute.heatedGloves : (this.state.commute.heatedGloves || false)
        };
      }

      const fuelRaw = localStorage.getItem('rideordie_fuel');
      if (fuelRaw) {
        try {
          const parsedFuel = JSON.parse(fuelRaw);
          if (parsedFuel && typeof parsedFuel === 'object') {
            const fCfg = Config.FUEL || {};
            const dFuel = Config.DEFAULTS?.FUEL || {};
            this.state.fuel = {
              ...this.state.fuel,
              consumptionL100km: typeof parsedFuel.consumptionL100km === 'number' && !isNaN(parsedFuel.consumptionL100km)
                ? Math.max(fCfg.CONSUMPTION_MIN || 1.5, Math.min(fCfg.CONSUMPTION_MAX || 15, parsedFuel.consumptionL100km))
                : (dFuel.consumptionL100km || 5.6),
              tankCapacityL: typeof parsedFuel.tankCapacityL === 'number' && !isNaN(parsedFuel.tankCapacityL)
                ? Math.max(fCfg.TANK_MIN || 5, Math.min(fCfg.TANK_MAX || 50, parsedFuel.tankCapacityL))
                : (dFuel.tankCapacityL || 16),
              presetId: typeof parsedFuel.presetId === 'string' ? parsedFuel.presetId : (dFuel.presetId || 'hornet'),
              fuelType: ['BenzineEuro95_1', 'SuperPlus98', 'Diesel_2'].includes(parsedFuel.fuelType) ? parsedFuel.fuelType : (dFuel.fuelType || 'BenzineEuro95_1'),
              timeRange: ['30D', '90D'].includes(parsedFuel.timeRange) ? parsedFuel.timeRange : (dFuel.timeRange || '30D'),
              carConsumptionL100km: typeof parsedFuel.carConsumptionL100km === 'number' && !isNaN(parsedFuel.carConsumptionL100km)
                ? parsedFuel.carConsumptionL100km
                : (dFuel.carConsumptionL100km || 6.5),
              priceMode: ['cbs', 'custom'].includes(parsedFuel.priceMode) ? parsedFuel.priceMode : (dFuel.priceMode || 'custom'),
              customPricePerLiter: typeof parsedFuel.customPricePerLiter === 'number' && !isNaN(parsedFuel.customPricePerLiter)
                ? Math.max(fCfg.PRICE_MIN || 1.0, Math.min(fCfg.PRICE_MAX || 4.0, parsedFuel.customPricePerLiter))
                : (dFuel.customPricePerLiter || 2.274)
            };
          }
        } catch (e) {
          console.warn('Fout bij parsen van opgeslagen brandstofdata:', e);
        }
      }

      const isUserConfigured = localStorage.getItem('rideordie_user_configured') === 'true';
      this.state.userConfiguredLocation = isUserConfigured;

      if (isUserConfigured) {
        const locRaw = localStorage.getItem('rideordie_loc');
        if (locRaw) {
          const parsedLoc = JSON.parse(locRaw);
          if (parsedLoc && parsedLoc.name && parsedLoc.latitude) {
            this.state.location = parsedLoc;
          }
        }

        const routeRaw = localStorage.getItem('rideordie_route');
        if (routeRaw) {
          const parsedRoute = JSON.parse(routeRaw);
          if (parsedRoute.start && parsedRoute.dest) {
            this.state.route.start = parsedRoute.start;
            this.state.route.dest = parsedRoute.dest;
            if (parsedRoute.mid) this.state.route.mid = parsedRoute.mid;
            if (parsedRoute.legDurationMinutes) this.state.route.legDurationMinutes = parsedRoute.legDurationMinutes;
            if (parsedRoute.roadKm) this.state.route.roadKm = parsedRoute.roadKm;
          }
        }
      }
    } catch (err) {
      console.warn("Fout bij laden van opgeslagen toestand:", err);
    }
  }

  /**
   * Slaat de huidige toestand op in localStorage.
   */
  save() {
    try {
      localStorage.setItem('rideordie_theme', this.state.theme);
      localStorage.setItem('rideordie_view_mode', this.state.viewMode);
      localStorage.setItem('rideordie_selected_day', this.state.selectedDay);
      localStorage.setItem('rideordie_commute', JSON.stringify(this.state.commute));
      localStorage.setItem('rideordie_fuel', JSON.stringify(this.state.fuel));
      if (this.state.userConfiguredLocation) {
        localStorage.setItem('rideordie_loc', JSON.stringify(this.state.location));
        localStorage.setItem('rideordie_route', JSON.stringify({
          start: this.state.route.start,
          mid: this.state.route.mid,
          dest: this.state.route.dest,
          legDurationMinutes: this.state.route.legDurationMinutes,
          roadKm: this.state.route.roadKm
        }));
      }
    } catch (err) {
      console.warn("Fout bij opslaan toestand:", err);
    }
  }
}

// Centrale instantie
const State = new StateStore();
// Compatibiliteitsalias voor bestaande engines
const AppState = State.state;

if (typeof window !== 'undefined') {
  window.StateStore = StateStore;
  window.State = State;
  window.AppState = AppState;
}
if (typeof module !== 'undefined') {
  module.exports = { StateStore, State, AppState };
}
