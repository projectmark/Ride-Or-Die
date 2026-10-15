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
    return {
      theme: d.THEME,
      viewMode: d.VIEW_MODE,
      selectedDay: d.SELECTED_DAY,
      location: { ...d.LOCATION },
      commute: { ...d.COMMUTE },
      route: {
        start: { ...d.ROUTE.start },
        mid: { ...d.ROUTE.mid },
        dest: { ...d.ROUTE.dest },
        legDurationMinutes: d.ROUTE.legDurationMinutes,
        roadKm: 36,
        waypointsWeather: { start: null, mid: null, dest: null },
        morningAnalysis: null,
        eveningAnalysis: null
      },
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

      const locRaw = localStorage.getItem('rideordie_loc');
      if (locRaw) {
        const parsedLoc = JSON.parse(locRaw);
        if (parsedLoc && parsedLoc.name && parsedLoc.latitude) {
          this.state.location = parsedLoc;
        }
      }

      const commuteRaw = localStorage.getItem('rideordie_commute');
      if (commuteRaw) {
        const parsedCommute = JSON.parse(commuteRaw);
        this.state.commute = { ...this.state.commute, ...parsedCommute };
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
      localStorage.setItem('rideordie_loc', JSON.stringify(this.state.location));
      localStorage.setItem('rideordie_commute', JSON.stringify(this.state.commute));
      localStorage.setItem('rideordie_route', JSON.stringify({
        start: this.state.route.start,
        mid: this.state.route.mid,
        dest: this.state.route.dest,
        legDurationMinutes: this.state.route.legDurationMinutes,
        roadKm: this.state.route.roadKm
      }));
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
