/**
 * Ride Or Die - Weergavelaag (UI View Renderer)
 * Verantwoordelijk voor alle DOM-updates, SVG-iconen en visualisaties.
 * Geoptimaliseerd met element-caching om overbodige DOM-queries en reflows te voorkomen.
 */

const UIRenderer = {
  // Gecachte DOM-referenties voor maximale rendersnelheid
  _elements: null,

  _getElements() {
    if (!this._elements) {
      this._elements = {
        toast: document.getElementById('toast-pill'),
        cockpitView: document.getElementById('cockpit-view'),
        widgetView: document.getElementById('widget-view'),
        viewModeBtnText: document.getElementById('view-mode-btn-text'),
        viewModeBtnIcon: document.getElementById('view-mode-btn-icon'),
        viewModeToggleBtn: document.getElementById('view-mode-toggle-btn'),
        metaTheme: document.querySelector('meta[name="theme-color"]'),
        navLocationLabel: document.getElementById('nav-location-label'),
        navRouteNames: document.getElementById('nav-route-names'),
        navNextDayText: document.getElementById('nav-next-day-text'),
        dayToggleButtons: document.querySelectorAll('.day-toggle-btn'),

        // Master Verdict
        masterVerdictCard: document.getElementById('master-verdict-card'),
        masterVerdictPill: document.getElementById('master-verdict-pill'),
        masterVerdictScore: document.getElementById('master-verdict-score'),
        masterVerdictHeadline: document.getElementById('master-verdict-headline'),
        masterVerdictExplanation: document.getElementById('master-verdict-explanation'),
        masterStartName: document.getElementById('master-start-name'),
        masterDestName: document.getElementById('master-dest-name'),
        masterCorridorSubtext: document.getElementById('master-corridor-subtext'),

        // Commute slots
        slotMorningCard: document.getElementById('slot-morning-card'),
        slotEveningCard: document.getElementById('slot-evening-card'),
        morningSlotTime: document.getElementById('morning-slot-time'),
        morningStatusBadge: document.getElementById('morning-status-badge'),
        morningTemp: document.getElementById('morning-temp'),
        morningRain: document.getElementById('morning-rain'),
        morningGusts: document.getElementById('morning-gusts'),
        morningNote: document.getElementById('morning-note'),

        eveningSlotTime: document.getElementById('evening-slot-time'),
        eveningStatusBadge: document.getElementById('evening-status-badge'),
        eveningTemp: document.getElementById('evening-temp'),
        eveningRain: document.getElementById('evening-rain'),
        eveningGusts: document.getElementById('evening-gusts'),
        eveningNote: document.getElementById('evening-note'),

        // Gear
        gearAdvisorCard: document.getElementById('gear-advisor-card'),
        gearChipsContainer: document.getElementById('gear-chips-container'),

        // Telemetrie
        telemetryGrid: document.querySelector('.safety-telemetry-grid'),
        cockpitBottom2Col: document.querySelector('.cockpit-bottom-2col'),
        meterWindVal: document.getElementById('meter-wind-val'),
        meterWindBft: document.getElementById('meter-wind-bft'),
        meterWindTag: document.getElementById('meter-wind-tag'),
        meterWindBar: document.getElementById('meter-wind-bar'),
        meterGripVal: document.getElementById('meter-grip-val'),
        meterGripStatus: document.getElementById('meter-grip-status'),
        meterGripTag: document.getElementById('meter-grip-tag'),
        meterGripBar: document.getElementById('meter-grip-bar'),
        meterRainVal: document.getElementById('meter-rain-val'),
        meterRainMm: document.getElementById('meter-rain-mm'),
        meterRainTag: document.getElementById('meter-rain-tag'),
        meterRainBar: document.getElementById('meter-rain-bar'),
        meterTempVal: document.getElementById('meter-temp-val'),
        meterTempStatus: document.getElementById('meter-temp-status'),
        meterTempTag: document.getElementById('meter-temp-tag'),
        meterTempBar: document.getElementById('meter-temp-bar'),

        // Hero Mini
        heroCityName: document.getElementById('hero-city-name'),
        heroTemp: document.getElementById('hero-temp'),
        heroWeatherIcon: document.getElementById('hero-weather-icon'),
        heroCondition: document.getElementById('hero-condition'),
        heroFeelsLike: document.getElementById('hero-feels-like'),
        heroMaxTemp: document.getElementById('hero-max-temp'),
        heroMinTemp: document.getElementById('hero-min-temp'),

        // 6 Specs
        specWindSpeed: document.getElementById('spec-wind-speed'),
        specWindDir: document.getElementById('spec-wind-dir'),
        specWindGusts: document.getElementById('spec-wind-gusts'),
        specGustStatus: document.getElementById('spec-gust-status'),
        specPrecip: document.getElementById('spec-precip'),
        specPrecipProb: document.getElementById('spec-precip-prob'),
        specUv: document.getElementById('spec-uv'),
        specUvStatus: document.getElementById('spec-uv-status'),
        specPressure: document.getElementById('spec-pressure'),
        specPressureStatus: document.getElementById('spec-pressure-status'),
        specVisibility: document.getElementById('spec-visibility'),
        specVisibilityStatus: document.getElementById('spec-visibility-status'),

        // Strips
        hourlyStrip: document.getElementById('hourly-strip'),
        dailyList: document.getElementById('daily-list'),
        dailyCityName: document.getElementById('daily-city-name'),

        // Single Widget
        singleWidgetCard: document.getElementById('single-widget-card'),
        widgetRouteText: document.getElementById('widget-route-text'),
        widgetDateTime: document.getElementById('widget-date-time'),
        widgetHeroTemp: document.getElementById('widget-hero-temp'),
        widgetHeroIcon: document.getElementById('widget-hero-icon'),
        widgetVerdictBanner: document.getElementById('widget-verdict-banner'),
        widgetVerdictPill: document.getElementById('widget-verdict-pill'),
        widgetVerdictScore: document.getElementById('widget-verdict-score'),
        widgetVerdictSummary: document.getElementById('widget-verdict-summary'),
        widgetMorningTitle: document.getElementById('widget-morning-title'),
        widgetMorningBadge: document.getElementById('widget-morning-badge'),
        widgetMorningTemp: document.getElementById('widget-morning-temp'),
        widgetMorningRain: document.getElementById('widget-morning-rain'),
        widgetMorningGusts: document.getElementById('widget-morning-gusts'),
        widgetEveningTitle: document.getElementById('widget-evening-title'),
        widgetEveningBadge: document.getElementById('widget-evening-badge'),
        widgetEveningTemp: document.getElementById('widget-evening-temp'),
        widgetEveningRain: document.getElementById('widget-evening-rain'),
        widgetEveningGusts: document.getElementById('widget-evening-gusts'),
        widgetGearChips: document.getElementById('widget-gear-chips'),
        widgetWindText: document.getElementById('widget-wind-text'),
        widgetGripText: document.getElementById('widget-grip-text'),
        widgetRainText: document.getElementById('widget-rain-text'),

        // Score Breakdown Modal
        scoreBreakdownModal: document.getElementById('score-breakdown-modal'),
        scoreHeroCard: document.getElementById('score-hero-card'),
        scoreBadgeVal: document.getElementById('score-badge-val'),
        scoreHeroVerdictPill: document.getElementById('score-hero-verdict-pill'),
        scoreHeroHeadline: document.getElementById('score-hero-headline'),
        scoreHeroRule: document.getElementById('score-hero-rule'),
        scoreSlotsComparison: document.getElementById('score-slots-comparison'),
        scoreFactorsList: document.getElementById('score-factors-list'),

        // Fuel Widget Elements
        fuelCard: document.getElementById('fuel-card'),
        fuelPriceVal: document.getElementById('fuel-price-val'),
        fuelTrendPill: document.getElementById('fuel-trend-pill'),
        fuelTrendIcon: document.getElementById('fuel-trend-icon'),
        fuelTrendText: document.getElementById('fuel-trend-text'),
        fuelDateSub: document.getElementById('fuel-date-sub'),
        fuelChartContainer: document.getElementById('fuel-chart-container'),
        fuelTypeButtons: document.querySelectorAll('#fuel-type-group .fuel-seg-btn'),
        fuelRangeButtons: document.querySelectorAll('#fuel-range-group .fuel-seg-btn'),
        fuelCalcRouteName: document.getElementById('fuel-calc-route-name'),
        fuelCalcKm: document.getElementById('fuel-calc-km'),
        fuelCalcBikeName: document.getElementById('fuel-calc-bike-name'),
        fuelCostSingle: document.getElementById('fuel-cost-single'),
        fuelLitersSingle: document.getElementById('fuel-liters-single'),
        fuelCostCommute: document.getElementById('fuel-cost-commute'),
        fuelLitersCommute: document.getElementById('fuel-liters-commute'),
        fuelCostTank: document.getElementById('fuel-cost-tank'),
        fuelLblTank: document.getElementById('fuel-lbl-tank'),
        fuelRangeTank: document.getElementById('fuel-range-tank'),
        fuelCarSavings: document.getElementById('fuel-car-savings'),
        fuelQuickPresetSelect: document.getElementById('fuel-quick-preset-select'),
        fuelCustomTag: document.getElementById('fuel-custom-tag'),
        fuelModeButtons: document.querySelectorAll('#fuel-mode-group .fuel-seg-btn'),
        modalFuelModeButtons: document.querySelectorAll('#modal-fuel-mode-group .fuel-seg-btn'),
        fuelQuickPriceChips: document.getElementById('fuel-quick-price-chips'),
        customPriceSliderWrap: document.getElementById('custom-price-slider-wrap'),
        settingCustomFuelPrice: document.getElementById('setting-custom-fuel-price'),
        valFuelPricePill: document.getElementById('val-fuel-price-pill'),
        cbsScheduleHint: document.getElementById('cbs-schedule-hint'),

        // Widget view fuel
        widgetFuelPriceLbl: document.getElementById('widget-fuel-price-lbl'),
        widgetFuelTripCost: document.getElementById('widget-fuel-trip-cost'),
        widgetFuelConsumptionLbl: document.getElementById('widget-fuel-consumption-lbl'),

        refreshIcon: document.getElementById('refresh-icon')
      };
    }
    return this._elements;
  },

  /**
   * Genereert weer-iconen (SVG).
   */
  getWeatherSvg(iconType, isNight = false) {
    if (isNight && (iconType === 'sun' || iconType === 'partly-cloudy')) {
      return `
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <path d="M44 38A18 18 0 1 1 26 20a14 14 0 0 0 18 18z" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
          <circle cx="48" cy="18" r="1.5" fill="#f59e0b"/>
          <circle cx="54" cy="28" r="1" fill="#f59e0b"/>
        </svg>`;
    }
    switch (iconType) {
      case 'sun':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="14" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
            <path d="M32 6v6M32 52v6M6 32h6M52 32h6M13.6 13.6l4.2 4.2M46.2 46.2l4.2 4.2M13.6 50.4l4.2-4.2M46.2 17.8l4.2-4.2" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>
          </svg>`;
      case 'partly-cloudy':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="26" cy="24" r="10" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
            <path d="M22 48h22a10 10 0 0 0 2-19.8 14 14 0 0 0-26.4 4.8A8 8 0 0 0 22 48z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
          </svg>`;
      case 'cloudy':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M20 46h24a10 10 0 0 0 1-19.9 14 14 0 0 0-26 3.9A8 8 0 0 0 20 46z" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>
          </svg>`;
      case 'drizzle':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M20 40h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 20 40z" fill="#94a3b8"/>
            <path d="M24 46l-2 6M34 46l-2 6M44 46l-2 6" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
          </svg>`;
      case 'rain':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M20 38h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 20 38z" fill="#64748b"/>
            <path d="M22 44l-4 12M32 44l-4 12M42 44l-4 12" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
          </svg>`;
      case 'heavy-rain':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M20 36h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 20 36z" fill="#475569"/>
            <path d="M20 42l-5 14M30 42l-5 14M40 42l-5 14M50 42l-5 14" stroke="#1d4ed8" stroke-width="3" stroke-linecap="round"/>
          </svg>`;
      case 'thunder':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M19 36h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 19 36z" fill="#334155"/>
            <path d="M32 38l-6 10h8l-4 10 12-14h-8l4-6h-6z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
          </svg>`;
      case 'snow':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M20 40h24a9 9 0 0 0 1-17.9 13 13 0 0 0-24 3.9A7 7 0 0 0 20 40z" fill="#94a3b8"/>
            <circle cx="22" cy="48" r="2" fill="#38bdf8"/>
            <circle cx="32" cy="52" r="2" fill="#38bdf8"/>
            <circle cx="42" cy="48" r="2" fill="#38bdf8"/>
          </svg>`;
      case 'fog':
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M16 26h32M12 34h40M18 42h28" stroke="#64748b" stroke-width="3.5" stroke-linecap="round"/>
          </svg>`;
      default:
        return `
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="14" fill="#fbbf24"/>
          </svg>`;
    }
  },

  /**
   * Toont een korte pop-upmelding (toast).
   */
  _toastTimer: null,
  showToast(message) {
    const el = this._getElements().toast;
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  },

  /**
   * Draait het ververs-icoon rond bij het ophalen van nieuwe data.
   */
  setLoading(isLoading) {
    const icon = this._getElements().refreshIcon;
    if (icon) {
      icon.classList.toggle('spin', isLoading);
    }
  },

  /**
   * Animeert een voortgangsbalk soepel naar het doelpercentage via CSS transitions.
   */
  _animateBar(barEl, targetPercent, bg) {
    if (!barEl) return;
    if (bg) barEl.style.background = bg;

    // Directe reset naar 0% zonder terugwaartse animatie
    barEl.style.transition = 'none';
    barEl.style.width = '0%';

    // Vloeiende voorwaartse sweep met Material Design 3 curve
    requestAnimationFrame(() => {
      setTimeout(() => {
        barEl.style.transition = 'width 0.75s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease';
        barEl.style.width = `${targetPercent}%`;
      }, 40);
    });
  },

  /**
   * Activeert een serene, rustige fade-overgang over de dashboardkaarten.
   */
  triggerContentTransition() {
    const cards = [
      document.getElementById('master-verdict-card'),
      document.getElementById('slot-morning-card'),
      document.getElementById('slot-evening-card'),
      document.getElementById('gear-advisor-card'),
      document.querySelector('.safety-telemetry-grid'),
      document.querySelector('.weather-hero-mini'),
      document.querySelector('.daily-forecast-card'),
      document.getElementById('single-widget-card')
    ].filter(Boolean);

    cards.forEach(el => {
      el.classList.remove('m3-day-switch');
      el.style.animationDelay = '';
    });

    requestAnimationFrame(() => {
      cards.forEach(el => el.classList.add('m3-day-switch'));
    });
  },

  /**
   * Werkt navigatiebalklabels en pillen bij.
   */
  updateNavbar(state) {
    const els = this._getElements();
    if (els.navLocationLabel && state.location) {
      els.navLocationLabel.textContent = `${state.location.name}, ${state.location.country || 'NL'}`;
    }
    const tabBaseLoc = document.getElementById('tab-base-loc-name');
    if (tabBaseLoc && state.location) {
      tabBaseLoc.textContent = state.location.name;
    }
    if (els.dailyCityName && state.location) {
      els.dailyCityName.textContent = state.location.name;
    }
    if (els.navRouteNames && state.route && state.route.start && state.route.dest) {
      els.navRouteNames.textContent = `${state.route.start.name} ➔ ${state.route.dest.name}`;
    }
  },

  /**
   * Schakelt de interface tussen uitgebreide cockpit en beknopte widget.
   */
  renderViewMode(viewMode) {
    const els = this._getElements();
    const isWidget = viewMode === 'widget';
    if (els.cockpitView) {
      els.cockpitView.style.display = isWidget ? 'none' : 'flex';
      if (!isWidget) {
        els.cockpitView.classList.remove('view-enter');
        requestAnimationFrame(() => els.cockpitView.classList.add('view-enter'));
      }
    }
    if (els.widgetView) {
      els.widgetView.style.display = isWidget ? 'flex' : 'none';
      if (isWidget) {
        els.widgetView.classList.remove('view-enter');
        requestAnimationFrame(() => els.widgetView.classList.add('view-enter'));
      }
    }

    if (els.viewModeBtnText && els.viewModeBtnIcon) {
      if (isWidget) {
        els.viewModeBtnIcon.textContent = '📊';
        els.viewModeBtnText.textContent = I18n.t.views.cockpit;
        if (els.viewModeToggleBtn) els.viewModeToggleBtn.setAttribute('title', I18n.t.views.cockpitTitle);
      } else {
        els.viewModeBtnIcon.textContent = '📱';
        els.viewModeBtnText.textContent = I18n.t.views.widget;
        if (els.viewModeToggleBtn) els.viewModeToggleBtn.setAttribute('title', I18n.t.views.widgetTitle);
      }
    }
  },

  /**
   * Past het actieve thema toe op de DOM (licht, donker of automatisch).
   */
  renderTheme(themeMode, isDayTime = true) {
    const els = this._getElements();
    let effective = themeMode;
    if (themeMode === 'auto') {
      effective = isDayTime ? 'light' : 'dark';
    }

    document.documentElement.setAttribute('data-theme', effective);
    if (document.body) document.body.setAttribute('data-theme', effective);

    if (els.themeBtnIcon) {
      els.themeBtnIcon.textContent = themeMode === 'light' ? '☀️' : themeMode === 'auto' ? '🔄' : '🌙';
    }
    if (els.metaTheme) {
      els.metaTheme.setAttribute('content', effective === 'light' ? '#f5f8fc' : '#09101d');
    }

    ['light', 'auto', 'dark'].forEach(mode => {
      const btn = document.getElementById(`theme-btn-${mode}`);
      if (btn) {
        btn.classList.toggle('active', themeMode === mode);
        btn.style.borderColor = themeMode === mode ? 'var(--md-sys-color-primary)' : '';
      }
    });
  },

  /**
   * Werkt de dagkeuzeknop (Vandaag / Volgende werkdag) bij.
   */
  renderDayToggle(selectedDay, workdayConfig) {
    const els = this._getElements();
    if (els.navNextDayText && workdayConfig) {
      els.navNextDayText.textContent = workdayConfig.nextWorkday.buttonLabel;
    }
    els.dayToggleButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-day') === selectedDay;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });
  },

  /**
   * Hoofdrenderfunctie voor het gehele dashboard.
   */
  renderDashboard(data, advice, state) {
    if (!data || !advice) return;
    const els = this._getElements();
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;
    const isNextWorkday = state.selectedDay === 'nextWorkday';
    const workdayConfig = advice.workdayConfig;

    this.updateNavbar(state);

    // Subtiele zijdezachte crossfade bij gegevens- of dagwissel
    this.triggerContentTransition();

    // Dynamische achtergrondatmosfeer
    const isSevere = advice.dayVerdict === 'red' || (advice.telemetry && advice.telemetry.maxGusts > 65);
    const isWet = (advice.telemetry && advice.telemetry.maxRain > 0.3) || (advice.morningData && advice.morningData.maxPrecipProb > 50) || (advice.eveningData && advice.eveningData.maxPrecipProb > 50);
    const weatherState = isSevere ? 'storm' : (isWet ? 'rain' : 'clear');
    document.documentElement.setAttribute('data-weather-state', weatherState);

    // --- 1. HOOFDOORDEEL (MASTER VERDICT) ---
    if (els.masterVerdictCard) {
      els.masterVerdictCard.dataset.verdict = advice.dayVerdict;
    }
    if (els.masterVerdictPill) els.masterVerdictPill.textContent = advice.dayPill;
    if (els.masterVerdictScore) els.masterVerdictScore.innerHTML = `Score: ${advice.minScore}/100 <span class="score-info-icon" title="Bekijk score-opbouw">ℹ️</span>`;
    if (els.masterVerdictHeadline) els.masterVerdictHeadline.textContent = advice.dayHeadline;
    if (els.masterVerdictExplanation) els.masterVerdictExplanation.textContent = advice.dayExplanation;

    this._lastData = data;
    this._lastAdvice = advice;
    this._lastState = state;
    this.renderScoreBreakdown(advice, state);

    if (els.masterStartName && state.route && state.route.start) {
      els.masterStartName.textContent = state.route.start.name;
    }
    if (els.masterDestName && state.route && state.route.dest) {
      els.masterDestName.textContent = state.route.dest.name;
    }

    if (els.masterCorridorSubtext && state.route) {
      const midText = state.route.mid ? `via ${state.route.mid.name}` : '';
      const kmText = state.route.roadKm ? I18n.formatters.distance(state.route.roadKm) : '';
      const parts = [midText, kmText].filter(Boolean).join(' • ');
      els.masterCorridorSubtext.textContent = parts ? `Routecorridor gecontroleerd (${parts})` : 'Routecorridor gecontroleerd';
    }

    // --- 2. DE TWEE RITTEN (OCHTEND & AVOND) ---
    const prefixSlot = isNextWorkday ? `${workdayConfig.nextWorkday.dayShort.toUpperCase()} ` : '';
    const mTime = (state.commute.morningTime || '08:00').replace(':', '.');
    const eTime = (state.commute.eveningTime || '17:00').replace(':', '.');

    // Ochtend
    if (els.morningSlotTime) els.morningSlotTime.textContent = `${prefixSlot}${mTime} uur (Heen)`;
    if (els.morningStatusBadge) {
      const mText = advice.morningAnalysis ? advice.morningAnalysis.badgeText : advice.morningScore.badgeText;
      const mVerd = advice.morningAnalysis ? advice.morningAnalysis.verdict : advice.morningScore.verdict;
      els.morningStatusBadge.textContent = mText;
      els.morningStatusBadge.dataset.verdict = mVerd;
      if (els.slotMorningCard) els.slotMorningCard.dataset.verdict = mVerd;
    }
    if (els.morningTemp) {
      const t = advice.morningAnalysis ? advice.morningAnalysis.startWeather.temp : advice.morningData.avgTemp;
      els.morningTemp.textContent = I18n.formatters.celsius(t);
    }
    if (els.morningRain) {
      const r = advice.morningAnalysis ? advice.morningAnalysis.maxRainOverall : advice.morningData.totalPrecip;
      els.morningRain.textContent = I18n.formatters.millimeters(r);
    }
    if (els.morningGusts) {
      const g = advice.morningAnalysis ? advice.morningAnalysis.maxGustsOverall : advice.morningData.maxGusts;
      els.morningGusts.textContent = I18n.formatters.kmh(g);
    }
    if (els.morningNote) {
      const noteText = advice.morningAnalysis
        ? `${advice.morningAnalysis.headline} ${advice.morningAnalysis.adviceTip || ''}`
        : (advice.morningScore.reasons.length ? advice.morningScore.reasons.join(" ") : "Ideale ochtendrit. Droog asfalt en kalme wind.");
      els.morningNote.innerHTML = `<span>👉</span> ${noteText}`;
    }

    // Avond
    if (els.eveningSlotTime) els.eveningSlotTime.textContent = `${prefixSlot}${eTime} uur (Terug)`;
    if (els.eveningStatusBadge) {
      const eText = advice.eveningAnalysis ? advice.eveningAnalysis.badgeText : advice.eveningScore.badgeText;
      const eVerd = advice.eveningAnalysis ? advice.eveningAnalysis.verdict : advice.eveningScore.verdict;
      els.eveningStatusBadge.textContent = eText;
      els.eveningStatusBadge.dataset.verdict = eVerd;
      if (els.slotEveningCard) els.slotEveningCard.dataset.verdict = eVerd;
    }
    if (els.eveningTemp) {
      const t = advice.eveningAnalysis ? advice.eveningAnalysis.startWeather.temp : advice.eveningData.avgTemp;
      els.eveningTemp.textContent = I18n.formatters.celsius(t);
    }
    if (els.eveningRain) {
      const r = advice.eveningAnalysis ? advice.eveningAnalysis.maxRainOverall : advice.eveningData.totalPrecip;
      els.eveningRain.textContent = I18n.formatters.millimeters(r);
    }
    if (els.eveningGusts) {
      const g = advice.eveningAnalysis ? advice.eveningAnalysis.maxGustsOverall : advice.eveningData.maxGusts;
      els.eveningGusts.textContent = I18n.formatters.kmh(g);
    }
    if (els.eveningNote) {
      const noteText = advice.eveningAnalysis
        ? `${advice.eveningAnalysis.headline} ${advice.eveningAnalysis.adviceTip || ''}`
        : (advice.eveningScore.reasons.length ? advice.eveningScore.reasons.join(" ") : "Prettige terugrit. Asfalt is droog en goed begaanbaar.");
      els.eveningNote.innerHTML = `<span>👉</span> ${noteText}`;
    }

    // --- 3. KLEDINGADVIES ---
    if (els.gearChipsContainer && advice.gearPills) {
      els.gearChipsContainer.innerHTML = advice.gearPills.map(p => `<span class="gear-chip-pill">${p}</span>`).join('');
    }

    // --- 4. TELEMETRIEMETERS ---
    const telem = advice.telemetry || {};
    const windVal = telem.maxGusts || 25;
    if (els.meterWindVal) els.meterWindVal.textContent = I18n.formatters.kmh(windVal);
    if (els.meterWindBft) els.meterWindBft.textContent = I18n.beaufortScale(windVal);

    const userMaxGusts = state.commute.maxGusts || Config.THRESHOLDS.WIND.DEFAULT_MAX_GUSTS;
    const isDangerousGust = windVal > Config.THRESHOLDS.WIND.DANGEROUS_GUSTS;
    const isAlertGust = windVal > userMaxGusts || windVal > Config.THRESHOLDS.WIND.STRONG_GUSTS;

    if (els.meterWindTag) {
      els.meterWindTag.textContent = isDangerousGust ? I18n.t.telemetry.dangerous : isAlertGust ? I18n.t.telemetry.alert : I18n.t.telemetry.safe;
      els.meterWindTag.style.color = isDangerousGust ? '#ef4444' : isAlertGust ? '#f59e0b' : '#10b981';
    }
    if (els.meterWindBar) {
      const wPercent = Math.min(100, Math.round((windVal / 80) * 100));
      const wColor = isDangerousGust ? '#ef4444' : isAlertGust ? '#f59e0b' : '#10b981';
      this._animateBar(els.meterWindBar, wPercent, wColor);
    }

    const gripVal = telem.gripPercent !== undefined ? telem.gripPercent : 100;
    if (els.meterGripVal) els.meterGripVal.textContent = `${gripVal}%`;
    if (els.meterGripStatus) els.meterGripStatus.textContent = telem.gripStatus || I18n.t.telemetry.optimal;
    if (els.meterGripTag) {
      els.meterGripTag.textContent = gripVal === 100 ? I18n.t.telemetry.optimal : gripVal > 70 ? I18n.t.telemetry.damp : I18n.t.telemetry.slippery;
      els.meterGripTag.style.color = gripVal === 100 ? '#10b981' : gripVal > 70 ? '#f59e0b' : '#ef4444';
    }
    if (els.meterGripBar) {
      const gripPercent = Math.min(100, Math.max(0, gripVal));
      const gColor = gripVal === 100 ? '#10b981' : gripVal > 70 ? '#f59e0b' : '#ef4444';
      this._animateBar(els.meterGripBar, gripPercent, gColor);
    }

    const rainVal = telem.maxRain !== undefined ? telem.maxRain : 0;
    const maxProb = Math.max(advice.morningData.maxPrecipProb, advice.eveningData.maxPrecipProb);
    if (els.meterRainVal) els.meterRainVal.textContent = I18n.formatters.millimeters(rainVal);
    if (els.meterRainMm) els.meterRainMm.textContent = rainVal > 0.1 ? `Kans: ${maxProb}%` : I18n.t.telemetry.dry;
    if (els.meterRainTag) {
      els.meterRainTag.textContent = rainVal > 2.0 ? 'Plensbui' : rainVal > 0.2 ? 'Bui verwacht' : I18n.t.telemetry.dry;
      els.meterRainTag.style.color = rainVal > 2.0 ? '#ef4444' : rainVal > 0.2 ? '#f59e0b' : '#10b981';
    }
    if (els.meterRainBar) {
      const rPercent = Math.min(100, Math.max(8, Math.round((rainVal / 4.0) * 100)));
      const targetRainW = rainVal > 0.1 ? rPercent : 6;
      const rColor = rainVal > 2.0 ? '#ef4444' : rainVal > 0.2 ? '#f59e0b' : '#10b981';
      this._animateBar(els.meterRainBar, targetRainW, rColor);
    }

    const tempVal = telem.avgTemp !== undefined ? telem.avgTemp : 15;
    if (els.meterTempVal) els.meterTempVal.textContent = I18n.formatters.celsius(tempVal);
    if (els.meterTempStatus) {
      els.meterTempStatus.textContent = tempVal < 2 ? I18n.t.telemetry.frostWarning : tempVal < 8 ? 'Koud' : tempVal < 15 ? I18n.t.telemetry.chilly : tempVal <= 24 ? I18n.t.telemetry.comfortable : I18n.t.telemetry.warm;
    }
    if (els.meterTempTag) {
      els.meterTempTag.textContent = tempVal < 4 ? 'Koud' : tempVal > 29 ? 'Warm' : I18n.t.telemetry.comfortable;
      els.meterTempTag.style.color = tempVal < 4 ? '#0284c7' : tempVal > 29 ? '#f59e0b' : '#10b981';
    }
    if (els.meterTempBar) {
      const tPercent = Math.min(100, Math.max(10, Math.round(((tempVal + 5) / 40) * 100)));
      const tColor = tempVal < 4 ? '#0284c7' : tempVal > 29 ? '#f59e0b' : '#10b981';
      this._animateBar(els.meterTempBar, tPercent, tColor);
    }

    // --- 5. LIVE WEER & 6 SPECIFICATIES ---
    const defaultCity = (typeof Config !== 'undefined' && Config.DEFAULTS && Config.DEFAULTS.LOCATION && Config.DEFAULTS.LOCATION.name) || 'Utrecht';
    if (els.heroCityName) els.heroCityName.textContent = state.location.name || defaultCity;
    if (els.dailyCityName) els.dailyCityName.textContent = state.location.name || defaultCity;

    let dayIdx = 0;
    if (daily && daily.time) {
      const fIdx = daily.time.findIndex(t => t.startsWith(workdayConfig.nextWorkday.dateStr));
      if (fIdx >= 0) dayIdx = fIdx;
    }

    if (isNextWorkday && daily && daily.time) {
      const code = daily.weather_code[dayIdx] || 0;
      const wmo = I18n.weatherCodes[code] || { text: "Helder", icon: "sun" };
      const maxT = Math.round(daily.temperature_2m_max[dayIdx]);
      const minT = Math.round(daily.temperature_2m_min[dayIdx]);
      const avgT = Math.round((maxT + minT) / 2);

      if (els.heroTemp) els.heroTemp.textContent = avgT;
      if (els.heroWeatherIcon) els.heroWeatherIcon.innerHTML = this.getWeatherSvg(wmo.icon, false);
      if (els.heroCondition) els.heroCondition.textContent = wmo.text;
      if (els.heroFeelsLike) els.heroFeelsLike.textContent = `${avgT}°`;
      if (els.heroMaxTemp) els.heroMaxTemp.textContent = `${maxT}°`;
      if (els.heroMinTemp) els.heroMinTemp.textContent = `${minT}°`;
    } else if (current) {
      const code = current.weather_code || 0;
      const wmo = I18n.weatherCodes[code] || { text: "Helder", icon: "sun" };
      const isNight = current.is_day === 0;

      if (els.heroTemp) els.heroTemp.textContent = Math.round(current.temperature_2m);
      if (els.heroWeatherIcon) els.heroWeatherIcon.innerHTML = this.getWeatherSvg(wmo.icon, isNight);
      if (els.heroCondition) els.heroCondition.textContent = wmo.text;
      if (els.heroFeelsLike) els.heroFeelsLike.textContent = `${Math.round(current.apparent_temperature)}°`;
      if (daily && daily.temperature_2m_max) {
        if (els.heroMaxTemp) els.heroMaxTemp.textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
        if (els.heroMinTemp) els.heroMinTemp.textContent = `${Math.round(daily.temperature_2m_min[0])}°`;
      }
    }

    // 6 Specificatietegels
    const windSpeedVal = isNextWorkday ? Math.round((daily && daily.wind_speed_10m_max && daily.wind_speed_10m_max[dayIdx]) || 15) : Math.round(current.wind_speed_10m || 0);
    const windDirDeg = current.wind_direction_10m || 0;
    const windDirText = I18n.windDirections[Math.round((windDirDeg % 360) / 22.5) % 16];

    if (els.specWindSpeed) els.specWindSpeed.textContent = I18n.formatters.kmh(windSpeedVal);
    if (els.specWindDir) els.specWindDir.textContent = `${I18n.beaufortScale(windSpeedVal)} • ${windDirText}`;

    const gustsVal = isNextWorkday ? Math.round((daily && daily.wind_gusts_10m_max && daily.wind_gusts_10m_max[dayIdx]) || 25) : Math.round(current.wind_gusts_10m || 0);
    if (els.specWindGusts) els.specWindGusts.textContent = I18n.formatters.kmh(gustsVal);
    if (els.specGustStatus) {
      els.specGustStatus.textContent = gustsVal > 75 ? I18n.t.specs.dangerous : gustsVal > 55 ? I18n.t.specs.strong : gustsVal > 35 ? I18n.t.specs.moderate : I18n.t.specs.quiet;
      els.specGustStatus.style.color = gustsVal > 75 ? '#ef4444' : gustsVal > 55 ? '#f59e0b' : 'var(--text-muted)';
    }

    const precipSum = isNextWorkday ? ((daily && daily.precipitation_sum && daily.precipitation_sum[dayIdx]) || 0) : (current.precipitation || 0);
    const precipProbVal = isNextWorkday ? ((daily && daily.precipitation_probability_max && daily.precipitation_probability_max[dayIdx]) || 0) : ((hourly && hourly.precipitation_probability && hourly.precipitation_probability[0] !== undefined) ? hourly.precipitation_probability[0] : 0);
    if (els.specPrecip) els.specPrecip.textContent = I18n.formatters.millimeters(precipSum);
    if (els.specPrecipProb) els.specPrecipProb.textContent = `Kans: ${precipProbVal}%`;

    const uv = current.uv_index !== undefined ? Math.round(current.uv_index) : 0;
    if (els.specUv) els.specUv.textContent = `${uv}`;
    if (els.specUvStatus) {
      els.specUvStatus.textContent = uv >= 8 ? I18n.t.specs.veryHigh : uv >= 6 ? I18n.t.specs.high : uv >= 3 ? I18n.t.specs.moderate : I18n.t.specs.low;
    }

    const pressure = current.surface_pressure ? Math.round(current.surface_pressure) : 1015;
    if (els.specPressure) els.specPressure.textContent = `${pressure} hPa`;
    if (els.specPressureStatus) {
      els.specPressureStatus.textContent = pressure > Config.THRESHOLDS.SURFACE_PRESSURE.HIGH_STABLE ? I18n.t.specs.stable : pressure < Config.THRESHOLDS.SURFACE_PRESSURE.LOW_UNSTABLE ? I18n.t.specs.unstable : I18n.t.specs.stable;
    }

    const vis = (hourly && hourly.visibility && hourly.visibility[0] !== undefined) ? Math.round(hourly.visibility[0] / 1000) : 10;
    if (els.specVisibility) els.specVisibility.textContent = `${vis} km`;
    if (els.specVisibilityStatus) {
      els.specVisibilityStatus.textContent = vis >= 10 ? I18n.t.specs.excellent : vis >= 5 ? I18n.t.specs.good : vis >= 2 ? I18n.t.specs.moderate : I18n.t.specs.limited;
    }

    // --- 6. UURLIJKSE EN 7-DAAGSE VERWACHTING ---
    this.renderHourlyStrip(hourly, state.selectedDay, workdayConfig, state.commute);
    this.renderDailyForecast(daily);

    // --- 7. BEKNOPTE WIDGET WEERGAVE ---
    if (els.singleWidgetCard) els.singleWidgetCard.dataset.verdict = advice.dayVerdict;
    if (els.widgetRouteText && state.route) {
      els.widgetRouteText.textContent = `${state.route.start.name} ➔ ${state.route.dest.name}`;
    }
    if (els.widgetDateTime) {
      els.widgetDateTime.textContent = isNextWorkday ? `${workdayConfig.nextWorkday.fullLabel} • KNMI Harmonie` : `Vandaag • KNMI Harmonie`;
    }
    const widgetTemp = isNextWorkday && daily && daily.time
      ? Math.round((daily.temperature_2m_max[dayIdx] + daily.temperature_2m_min[dayIdx]) / 2)
      : Math.round(current.temperature_2m);
    if (els.widgetHeroTemp) els.widgetHeroTemp.textContent = `${widgetTemp}°`;
    if (els.widgetHeroIcon) {
      const code = isNextWorkday && daily && daily.time ? (daily.weather_code[dayIdx] || 0) : (current.weather_code || 0);
      const wmo = I18n.weatherCodes[code] || { icon: "sun" };
      els.widgetHeroIcon.innerHTML = this.getWeatherSvg(wmo.icon, !isNextWorkday && current.is_day === 0);
    }
    if (els.widgetVerdictBanner) els.widgetVerdictBanner.dataset.verdict = advice.dayVerdict;
    if (els.widgetVerdictPill) els.widgetVerdictPill.textContent = advice.dayPill;
    if (els.widgetVerdictScore) els.widgetVerdictScore.innerHTML = `Score: ${advice.minScore}/100 <span class="score-info-icon">ℹ️</span>`;
    if (els.widgetVerdictSummary) els.widgetVerdictSummary.textContent = advice.dayHeadline;

    // Ochtendrit in widget (gebaseerd op corridor-analyse indien beschikbaar)
    const mVerd = advice.morningAnalysis ? advice.morningAnalysis.verdict : advice.morningScore.verdict;
    const mBadgeRaw = advice.morningAnalysis ? advice.morningAnalysis.badgeText : advice.morningScore.badgeText;
    const mBadgeClean = mBadgeRaw.replace(/^[🟢🟡🔴⚠️]\s*/, '');
    const mTemp = advice.morningAnalysis ? advice.morningAnalysis.startWeather.temp : advice.morningData.avgTemp;
    const mRain = advice.morningAnalysis ? advice.morningAnalysis.maxRainOverall : advice.morningData.totalPrecip;
    const mGusts = advice.morningAnalysis ? advice.morningAnalysis.maxGustsOverall : advice.morningData.maxGusts;
    const mColor = mVerd === 'green' ? '#10b981' : mVerd === 'yellow' ? '#f59e0b' : '#ef4444';

    if (els.widgetMorningTitle) {
      const mTime = (state.commute.morningTime || '08:00').replace(':', '.');
      els.widgetMorningTitle.textContent = `🌅 ${prefixSlot}Ochtendrit (${mTime} uur)`;
    }
    if (els.widgetMorningBadge) {
      els.widgetMorningBadge.textContent = mBadgeClean;
      els.widgetMorningBadge.style.color = mColor;
    }
    if (els.widgetMorningTemp) els.widgetMorningTemp.textContent = I18n.formatters.celsius(mTemp);
    if (els.widgetMorningRain) els.widgetMorningRain.textContent = I18n.formatters.millimeters(mRain);
    if (els.widgetMorningGusts) els.widgetMorningGusts.textContent = I18n.formatters.kmh(mGusts);

    // Avondrit in widget (gebaseerd op corridor-analyse indien beschikbaar)
    const eVerd = advice.eveningAnalysis ? advice.eveningAnalysis.verdict : advice.eveningScore.verdict;
    const eBadgeRaw = advice.eveningAnalysis ? advice.eveningAnalysis.badgeText : advice.eveningScore.badgeText;
    const eBadgeClean = eBadgeRaw.replace(/^[🟢🟡🔴⚠️]\s*/, '');
    const eTemp = advice.eveningAnalysis ? advice.eveningAnalysis.startWeather.temp : advice.eveningData.avgTemp;
    const eRain = advice.eveningAnalysis ? advice.eveningAnalysis.maxRainOverall : advice.eveningData.totalPrecip;
    const eGusts = advice.eveningAnalysis ? advice.eveningAnalysis.maxGustsOverall : advice.eveningData.maxGusts;
    const eColor = eVerd === 'green' ? '#10b981' : eVerd === 'yellow' ? '#f59e0b' : '#ef4444';

    if (els.widgetEveningTitle) {
      const eTime = (state.commute.eveningTime || '17:00').replace(':', '.');
      els.widgetEveningTitle.textContent = `🌇 ${prefixSlot}Avondrit (${eTime} uur)`;
    }
    if (els.widgetEveningBadge) {
      els.widgetEveningBadge.textContent = eBadgeClean;
      els.widgetEveningBadge.style.color = eColor;
    }
    if (els.widgetEveningTemp) els.widgetEveningTemp.textContent = I18n.formatters.celsius(eTemp);
    if (els.widgetEveningRain) els.widgetEveningRain.textContent = I18n.formatters.millimeters(eRain);
    if (els.widgetEveningGusts) els.widgetEveningGusts.textContent = I18n.formatters.kmh(eGusts);

    if (els.widgetGearChips && advice.gearPills) {
      els.widgetGearChips.innerHTML = advice.gearPills.map(p => `<span class="gear-chip-pill" style="font-size:0.75rem;padding:4px 10px;">${p}</span>`).join('');
    }
    if (els.widgetWindText) els.widgetWindText.textContent = `💨 Wind: ${I18n.formatters.kmh(windVal)}`;
    if (els.widgetGripText) els.widgetGripText.textContent = `🛣️ Grip: ${gripVal}%`;
    if (els.widgetRainText) els.widgetRainText.textContent = `💧 Regen: ${maxProb}%`;
  },

  /**
   * Vult de motormodel-keuzelijsten dynamisch vanuit Config.FUEL.PRESETS (DRY).
   */
  populateFuelPresets(activePresetId = 'hornet') {
    const presets = Config.FUEL?.PRESETS || [];
    const els = this._getElements();

    const renderOptions = (includeRatio = false) => {
      return presets.map(p => {
        const isCustom = p.id === 'custom';
        const ratioStr = (!isCustom && typeof I18n !== 'undefined' && I18n.formatters?.consumptionRatio)
          ? ` (${I18n.formatters.consumptionRatio(p.consumption)})`
          : '';
        const consStr = !isCustom ? ` \u2014 ${I18n.formatters.decimal(p.consumption, 1)} L / 100 km` : '';
        const label = includeRatio ? `${p.name}${consStr}${ratioStr}` : `${p.name}${consStr}`;
        const selected = p.id === activePresetId ? ' selected' : '';
        return `<option value="${p.id}"${selected}>${label}</option>`;
      }).join('');
    };

    if (els.fuelQuickPresetSelect) {
      els.fuelQuickPresetSelect.innerHTML = renderOptions(false);
    }
    const modalSelect = document.getElementById('setting-bike-preset');
    if (modalSelect) {
      modalSelect.innerHTML = renderOptions(true);
    }
  },

  /**
   * Genereert een responsive vector SVG Trendgrafiek voor brandstofprijzen.
   */
  renderFuelSvgChart(stats, width = 540, height = 180) {
    if (!stats || !Array.isArray(stats.history) || stats.history.length < 2) {
      return `
        <div class="fuel-chart-loading">
          Geen historische koersdata beschikbaar
        </div>`;
    }

    const history = stats.history;
    const padding = { top: 22, right: 28, bottom: 32, left: 54 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    let minY = stats.min;
    let maxY = stats.max;
    if (minY === maxY) {
      minY -= 0.05;
      maxY += 0.05;
    } else {
      const spread = maxY - minY;
      minY -= spread * 0.12;
      maxY += spread * 0.14;
    }

    const getX = (index) => padding.left + (index / (history.length - 1)) * chartW;
    const getY = (val) => padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;

    const points = history.map((pt, idx) => ({
      x: getX(idx),
      y: getY(pt.price),
      price: pt.price,
      dateStr: pt.dateStr
    }));

    let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const cx = ((prev.x + cur.x) / 2).toFixed(1);
      pathD += ` C ${cx} ${prev.y.toFixed(1)}, ${cx} ${cur.y.toFixed(1)}, ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`;
    }

    const fillD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding.top + chartH).toFixed(1)} Z`;

    const isDropping = stats.diff7d <= 0;
    const strokeColor = isDropping ? '#10b981' : '#f59e0b';
    const gradientTop = isDropping ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)';
    const gradientBottom = isDropping ? 'rgba(16, 185, 129, 0.02)' : 'rgba(245, 158, 11, 0.02)';

    const midVal = (stats.min + stats.max) / 2;
    const gridYMin = getY(stats.min);
    const gridYMid = getY(midVal);
    const gridYMax = getY(stats.max);

    const firstDate = history[0].dateStr;
    const midDate = history[Math.floor(history.length / 2)].dateStr;
    const lastDate = history[history.length - 1].dateStr;
    const lastPoint = points[points.length - 1];

    const fmt = (typeof I18n !== 'undefined' && I18n.formatters?.currency)
      ? (val) => I18n.formatters.currency(val, 2)
      : (val) => `\u20AC ${val.toFixed(2)}`;

    return `
      <svg viewBox="0 0 ${width} ${height}" class="fuel-svg-chart" preserveAspectRatio="xMidYMid meet" aria-label="Brandstofprijs trendgrafiek">
        <defs>
          <linearGradient id="fuelFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${gradientTop}"/>
            <stop offset="100%" stop-color="${gradientBottom}"/>
          </linearGradient>
          <filter id="fuelGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${strokeColor}" flood-opacity="0.35"/>
          </filter>
        </defs>

        <g class="fuel-chart-grid" stroke="var(--border-subtle)" stroke-dasharray="3,3" stroke-width="1">
          <line x1="${padding.left}" y1="${gridYMax.toFixed(1)}" x2="${(width - padding.right)}" y2="${gridYMax.toFixed(1)}" />
          <line x1="${padding.left}" y1="${gridYMid.toFixed(1)}" x2="${(width - padding.right)}" y2="${gridYMid.toFixed(1)}" />
          <line x1="${padding.left}" y1="${gridYMin.toFixed(1)}" x2="${(width - padding.right)}" y2="${gridYMin.toFixed(1)}" />
        </g>

        <g class="fuel-chart-labels" fill="var(--text-subtle)" font-size="10" font-weight="600" text-anchor="end">
          <text x="${padding.left - 8}" y="${(gridYMax + 3).toFixed(1)}">${fmt(stats.max)}</text>
          <text x="${padding.left - 8}" y="${(gridYMid + 3).toFixed(1)}">${fmt(midVal)}</text>
          <text x="${padding.left - 8}" y="${(gridYMin + 3).toFixed(1)}">${fmt(stats.min)}</text>
        </g>

        <path d="${fillD}" fill="url(#fuelFillGrad)" />
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#fuelGlow)" />

        <g class="fuel-chart-x-labels" fill="var(--text-subtle)" font-size="10.5" font-weight="600">
          <text x="${padding.left}" y="${height - 8}" text-anchor="start">${firstDate}</text>
          <text x="${(width / 2).toFixed(1)}" y="${height - 8}" text-anchor="middle">${midDate}</text>
          <text x="${(width - padding.right)}" y="${height - 8}" text-anchor="end">${lastDate}</text>
        </g>

        <circle cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="7" fill="${strokeColor}" opacity="0.25" class="fuel-pulse-circle" />
        <circle cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="4.2" fill="#ffffff" stroke="${strokeColor}" stroke-width="2.5" />
      </svg>`;
  },

  /**
   * Rendert de Brandstof & Ritkosten kaart en de interactieve trendgrafiek.
   */
  renderFuelCard(fuelRecords, state) {
    const els = this._getElements();
    if (!els.fuelCard) return;

    const dFuel = Config.DEFAULTS?.FUEL || {};
    const fuelState = state.fuel || {
      fuelType: dFuel.fuelType || 'BenzineEuro95_1',
      timeRange: dFuel.timeRange || '30D',
      consumptionL100km: dFuel.consumptionL100km || 5.6,
      tankCapacityL: dFuel.tankCapacityL || 16,
      presetId: dFuel.presetId || 'hornet',
      carConsumptionL100km: dFuel.carConsumptionL100km || 6.5
    };

    const stats = FuelService.getStats(fuelRecords, fuelState.fuelType, fuelState.timeRange);
    if (!stats) return;

    // 1. Prijs & Trend Banner
    const effectivePrice = FuelService.getEffectivePrice(stats, fuelState);
    const isCustomMode = fuelState.priceMode === 'custom';
    if (els.fuelPriceVal) {
      els.fuelPriceVal.textContent = (typeof I18n !== 'undefined' && I18n.formatters?.fuelPrice)
        ? I18n.formatters.fuelPrice(isCustomMode ? effectivePrice : stats.latestPrice)
        : (isCustomMode ? effectivePrice : stats.latestPrice).toFixed(3).replace('.', ',');
    }

    if (els.fuelCustomTag) {
      els.fuelCustomTag.style.display = isCustomMode ? 'inline-flex' : 'none';
      els.fuelCustomTag.textContent = isCustomMode ? 'Actuele koers' : '';
    }

    // Prijsmodus knoppen synchroniseren
    const updateModeButtons = (btns) => {
      if (!btns) return;
      btns.forEach(btn => {
        const m = btn.getAttribute('data-mode');
        const active = (m === 'custom' && isCustomMode) || (m === 'cbs' && !isCustomMode);
        btn.classList.toggle('active', active);
      });
    };
    updateModeButtons(els.fuelModeButtons);
    updateModeButtons(els.modalFuelModeButtons);

    if (els.fuelTrendPill && els.fuelTrendText && els.fuelTrendIcon) {
      const isDown = stats.diff7d <= 0;
      const absDiff = Math.abs(parseFloat(stats.diff7dCents));
      const icon = isDown ? '\u25BC' : '\u25B2';
      const sign = isDown ? '-' : '+';
      els.fuelTrendIcon.textContent = icon;
      els.fuelTrendText.textContent = `${sign}${absDiff.toFixed(1)} ct (7d)`;
      els.fuelTrendPill.className = `fuel-trend-pill ${isDown ? 'down' : 'up'}`;
    }

    if (els.fuelDateSub) {
      const sched = FuelService.getCbsScheduleInfo(stats.latestPeriod);
      els.fuelDateSub.textContent = isCustomMode
        ? ((typeof I18n !== 'undefined' && I18n.t?.fuel?.usingCustomPriceNotice) ? I18n.t.fuel.usingCustomPriceNotice(I18n.formatters.fuelPrice(effectivePrice)) : `Rekent met actuele dagprijs: \u20AC ${effectivePrice.toFixed(3)}/L`)
        : ((typeof I18n !== 'undefined' && I18n.t?.fuel?.cbsDateWithNext) ? I18n.t.fuel.cbsDateWithNext(stats.latestDateStr, sched.relativeLabel) : `Laatste CBS meting: ${stats.latestDateStr} \u2022 Volgende: ${sched.relativeLabel}`);


    }

    // 2. Active buttons sync
    if (els.fuelTypeButtons) {
      els.fuelTypeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-fuel') === fuelState.fuelType);
      });
    }
    if (els.fuelRangeButtons) {
      els.fuelRangeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-range') === fuelState.timeRange);
      });
    }

    // 3. SVG Grafiek renderen via UIRenderer
    if (els.fuelChartContainer) {
      els.fuelChartContainer.innerHTML = this.renderFuelSvgChart(stats);
    }

    // 4. Rit- en Tankkostencalculator
    const roadKm = (state.route && state.route.roadKm) ? state.route.roadKm : 36;
    const startName = state.route?.start?.name || 'Start';
    const destName = state.route?.dest?.name || 'Bestemming';

    if (els.fuelCalcRouteName) {
      els.fuelCalcRouteName.textContent = `${startName} \u2794 ${destName}`;
    }
    if (els.fuelCalcKm) {
      els.fuelCalcKm.textContent = `${roadKm} km`;
    }

    // Motorbadge naam
    const presets = Config.FUEL?.PRESETS || [];
    const activePreset = presets.find(p => p.id === fuelState.presetId) || presets.find(p => p.consumption === fuelState.consumptionL100km);
    const bikeName = activePreset
      ? activePreset.name
      : `Motorfiets (${I18n.formatters.decimal(fuelState.consumptionL100km, 1)} L / 100 km)`;

    if (els.fuelCalcBikeName) {
      els.fuelCalcBikeName.textContent = `\uD83C\uDFCD\uFE0F ${bikeName}`;
    }
    if (els.fuelQuickPresetSelect) {
      els.fuelQuickPresetSelect.value = fuelState.presetId || 'custom';
    }

    // Berekeningen via FuelService met effectieve prijs (CBS of actuele dagkoers)
    const singleTrip = FuelService.calculateTripCost(roadKm, fuelState.consumptionL100km, effectivePrice);
    const dailyCommute = FuelService.calculateDailyCommuteCost(roadKm, fuelState.consumptionL100km, effectivePrice);
    const tank = FuelService.calculateTankCost(fuelState.tankCapacityL, effectivePrice);
    const estRangeKm = FuelService.calculateRangeKm(fuelState.tankCapacityL, fuelState.consumptionL100km);
    const savings = FuelService.calculateCarSavings(roadKm, fuelState.consumptionL100km, fuelState.carConsumptionL100km, effectivePrice);

    const fmtCurrency = (val) => (typeof I18n !== 'undefined' && I18n.formatters?.currency) ? I18n.formatters.currency(val) : `\u20AC ${val.toFixed(2)}`;
    const fmtLiters = (val) => (typeof I18n !== 'undefined' && I18n.formatters?.liters) ? I18n.formatters.liters(val) : `${val.toFixed(1)} L`;

    if (els.fuelCostSingle) els.fuelCostSingle.textContent = fmtCurrency(singleTrip.cost);
    if (els.fuelLitersSingle) els.fuelLitersSingle.textContent = `${fmtLiters(singleTrip.liters)} brandstof`;

    if (els.fuelCostCommute) els.fuelCostCommute.textContent = fmtCurrency(dailyCommute.cost);
    if (els.fuelLitersCommute) els.fuelLitersCommute.textContent = `${fmtLiters(dailyCommute.liters)} per werkdag`;

    if (els.fuelCostTank) els.fuelCostTank.textContent = fmtCurrency(tank.cost);
    if (els.fuelLblTank) els.fuelLblTank.textContent = (typeof I18n !== 'undefined' && I18n.t?.fuel?.fullTank)
      ? I18n.t.fuel.fullTank(fuelState.tankCapacityL)
      : `Volle Tank (${fuelState.tankCapacityL} L)`;
    if (els.fuelRangeTank) els.fuelRangeTank.textContent = (typeof I18n !== 'undefined' && I18n.t?.fuel?.rangeEstimate)
      ? I18n.t.fuel.rangeEstimate(estRangeKm)
      : `ca. ${estRangeKm} km bereik`;

    if (els.fuelCarSavings) els.fuelCarSavings.textContent = `+ ${fmtCurrency(savings.daily)}`;

    // 5. Update compact strip in widget view
    if (els.widgetFuelPriceLbl) {
      els.widgetFuelPriceLbl.textContent = `${fmtCurrency(effectivePrice)}/L`;
    }
    if (els.widgetFuelTripCost) {
      els.widgetFuelTripCost.textContent = fmtCurrency(singleTrip.cost);
    }
    if (els.widgetFuelConsumptionLbl) {
      els.widgetFuelConsumptionLbl.textContent = `${I18n.formatters.decimal(fuelState.consumptionL100km, 1)} L/100km`;
    }
  },
  renderHourlyStrip(hourly, selectedDay, workdayConfig, commute) {
    const strip = this._getElements().hourlyStrip;
    if (!strip || !hourly || !hourly.time) return;

    const isNextWorkday = selectedDay === 'nextWorkday';
    const activeDateStr = isNextWorkday ? workdayConfig.nextWorkday.dateStr : workdayConfig.today.dateStr;
    const now = new Date();
    const currentMs = now.getTime();

    const commuteConfig = commute || {};
    const morningTimeStr = commuteConfig.morningTime || commuteConfig.MORNING_TIME || '08:00';
    const eveningTimeStr = commuteConfig.eveningTime || commuteConfig.EVENING_TIME || '17:00';
    const morningHour = parseInt(morningTimeStr.split(':')[0], 10);
    const eveningHour = parseInt(eveningTimeStr.split(':')[0], 10);

    const currentHourTarget = `${workdayConfig.today.dateStr}T${String(now.getHours()).padStart(2, '0')}`;
    let currentIdx = hourly.time.findIndex(t => t.startsWith(currentHourTarget));
    if (currentIdx === -1) {
      let minDiff = Infinity;
      for (let i = 0; i < hourly.time.length; i++) {
        const diff = Math.abs(new Date(hourly.time[i]).getTime() - currentMs);
        if (diff < minDiff) {
          minDiff = diff;
          currentIdx = i;
        }
      }
    }

    let startIdx = 0;
    if (isNextWorkday) {
      const idx = hourly.time.findIndex(t => t.startsWith(`${activeDateStr}T06:00`));
      startIdx = idx !== -1 ? idx : Math.max(0, hourly.time.findIndex(t => t.startsWith(activeDateStr)));
    } else {
      // Toon exact de afgelopen 2 uur voor het huidige tijdstip voor directe context
      startIdx = Math.max(0, currentIdx - 2);
    }

    const endIdx = Math.min(hourly.time.length, Math.max(startIdx + 26, currentIdx + 24));

    const chips = [];
    for (let i = startIdx; i < endIdx; i++) {
      const timeStr = hourly.time[i];
      const hourNum = parseInt(timeStr.substring(11, 13), 10);
      const hourStr = `${hourNum.toString().padStart(2, '0')}.00`;
      const temp = Math.round(hourly.temperature_2m[i]);
      const rainProb = hourly.precipitation_probability[i] || 0;
      const precip = hourly.precipitation[i] || 0;
      const code = hourly.weather_code[i] || 0;
      const iconType = (I18n.weatherCodes[code] || {}).icon || 'sun';
      const isNight = hourNum < 6 || hourNum > 21;

      let rainDisplay = precip > 0.05 ? `💧${I18n.formatters.decimal(precip, 1)}m` : (rainProb > 45 ? `⛅0m` : `☀️0%`);
      const isSameDate = timeStr.startsWith(activeDateStr);
      const isMorning = isSameDate && (hourNum === morningHour);
      const isEvening = isSameDate && (hourNum === eveningHour);
      const isCurrent = !isNextWorkday && (i === currentIdx);

      let commuteClass = '';
      let tagText = '';
      let tagClass = 'tag-empty';

      if (isMorning) {
        commuteClass = 'is-commute-morning';
        if (isCurrent) commuteClass += ' is-current-hour';
        tagText = isCurrent ? 'Heen (Nu)' : 'Heen';
        tagClass = 'tag-morning';
      } else if (isEvening) {
        commuteClass = 'is-commute-evening';
        if (isCurrent) commuteClass += ' is-current-hour';
        tagText = isCurrent ? 'Terug (Nu)' : 'Terug';
        tagClass = 'tag-evening';
      } else if (isCurrent) {
        commuteClass = 'is-current-hour';
        tagText = 'Nu';
        tagClass = 'tag-current';
      }

      chips.push(`
        <div class="hour-chip ${commuteClass}" data-hour="${hourNum}">
          <span class="hour-tag ${tagClass}">${tagText || '&nbsp;'}</span>
          <span class="hour-time">${hourStr}</span>
          <div class="hour-icon">${this.getWeatherSvg(iconType, isNight)}</div>
          <span class="hour-temp">${temp}°</span>
          <span class="hour-rain">${rainDisplay}</span>
        </div>
      `);
    }

    strip.innerHTML = chips.join('');
    strip.classList.remove('m3-day-switch');
    requestAnimationFrame(() => {
      strip.classList.add('m3-day-switch');
      const targetChip = strip.querySelector('.hour-chip.is-current-hour') || strip.querySelector('.hour-chip.is-commute-morning');
      if (targetChip) {
        const chipRect = targetChip.getBoundingClientRect();
        const stripRect = strip.getBoundingClientRect();
        const scrollOffset = strip.scrollLeft + (chipRect.left - stripRect.left) - (strip.clientWidth / 2) + (targetChip.clientWidth / 2);
        strip.scrollLeft = Math.max(0, scrollOffset);
      }
    });
  },

  /**
   * Rendert de 7-daagse weersverwachting.
   */
  renderDailyForecast(daily) {
    const container = this._getElements().dailyList;
    if (!container || !daily || !daily.time) return;

    const dayNames = ['Zon', 'Maa', 'Din', 'Woe', 'Don', 'Vri', 'Zat'];
    const count = Math.min(7, daily.time.length);
    const rows = [];

    for (let i = 0; i < count; i++) {
      const d = new Date(daily.time[i] + 'T00:00:00');
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const name = isToday ? 'Vandaag' : isTomorrow ? 'Morgen' : dayNames[d.getDay()];
      const code = daily.weather_code[i] || 0;
      const iconType = (I18n.weatherCodes[code] || {}).icon || 'sun';
      const minTemp = Math.round(daily.temperature_2m_min[i]);
      const maxTemp = Math.round(daily.temperature_2m_max[i]);
      const rainSum = daily.precipitation_sum[i] || 0;
      const rainProb = daily.precipitation_probability_max[i] || 0;

      const barLeft = Math.max(5, Math.min(65, ((minTemp + 5) / 35) * 100));
      const rawBarWidth = Math.max(15, Math.min(75, ((maxTemp - minTemp) / 20) * 80));
      const safeBarWidth = Math.min(rawBarWidth, Math.max(12, 96 - barLeft));

      let rainDisplay = rainSum > 0.1 ? `💧 ${I18n.formatters.decimal(rainSum, 1)}m` : (rainProb > 40 ? `⛅ 0m` : `☀️ 0%`);

      rows.push(`
        <div class="daily-row ${isToday ? 'is-today' : ''}">
          <span class="daily-name">${name}</span>
          <div class="daily-icon">${this.getWeatherSvg(iconType, false)}</div>
          <div class="daily-temp-bar-container">
            <span class="daily-min">${minTemp}°</span>
            <div class="temp-bar-track">
              <div class="temp-bar-fill" style="left: ${barLeft}%; width: 0%;" data-target-width="${safeBarWidth}%"></div>
            </div>
            <span class="daily-max">${maxTemp}°</span>
          </div>
          <span class="daily-rain-pill">${rainDisplay}</span>
        </div>
      `);
    }

    container.innerHTML = rows.join('');

    requestAnimationFrame(() => {
      setTimeout(() => {
        const fills = container.querySelectorAll('.temp-bar-fill');
        fills.forEach((fill, idx) => {
          fill.style.transitionDelay = `${idx * 0.04}s`;
          fill.style.width = fill.dataset.targetWidth || '40%';
        });
      }, 40);
    });
  },

  /**
   * Rendert de gedetailleerde score-opbouw en aftrekposten in de popup/modal.
   */
  renderScoreBreakdown(advice, state) {
    if (!advice) return;
    const els = this._getElements();
    if (!els.scoreBreakdownModal) return;

    const mScore = advice.morningAnalysis ? advice.morningAnalysis.score : advice.morningScore.score;
    const eScore = advice.eveningAnalysis ? advice.eveningAnalysis.score : advice.eveningScore.score;
    const minScore = advice.minScore;

    // 1. Hero Card
    if (els.scoreBadgeVal) els.scoreBadgeVal.textContent = minScore;
    if (els.scoreHeroCard) els.scoreHeroCard.dataset.verdict = advice.dayVerdict;
    if (els.scoreHeroVerdictPill) {
      els.scoreHeroVerdictPill.textContent = advice.dayPill;
      els.scoreHeroVerdictPill.dataset.verdict = advice.dayVerdict;
    }
    if (els.scoreHeroHeadline) els.scoreHeroHeadline.textContent = advice.dayHeadline;

    if (els.scoreHeroRule) {
      if (mScore === eScore) {
        els.scoreHeroRule.textContent = `Zowel de ochtend- als de avondrit scoren ${mScore}/100. Het dagadvies staat daarom gelijk op ${mScore}/100.`;
      } else if (mScore < eScore) {
        els.scoreHeroRule.textContent = `De ochtendrit (${mScore}/100) scoort lager dan de avondrit (${eScore}/100). Het Zwakste Schakel-principe hanteert de laagste score als dagadvies.`;
      } else {
        els.scoreHeroRule.textContent = `De avondrit (${eScore}/100) scoort lager dan de ochtendrit (${mScore}/100). Het Zwakste Schakel-principe hanteert de terugreis als dagadvies om te voorkomen dat je strandt.`;
      }
    }

    // 2. Ritten Vergelijking
    if (els.scoreSlotsComparison) {
      const mTime = (state.commute.morningTime || '08:00').replace(':', '.');
      const eTime = (state.commute.eveningTime || '17:00').replace(':', '.');

      const mVerd = advice.morningAnalysis ? advice.morningAnalysis.verdict : advice.morningScore.verdict;
      const mBadge = advice.morningAnalysis ? advice.morningAnalysis.badgeText : advice.morningScore.badgeText;
      const mTemp = advice.morningAnalysis ? advice.morningAnalysis.startWeather.temp : advice.morningData.avgTemp;
      const mRain = advice.morningAnalysis ? advice.morningAnalysis.maxRainOverall : advice.morningData.totalPrecip;
      const mGusts = advice.morningAnalysis ? advice.morningAnalysis.maxGustsOverall : advice.morningData.maxGusts;
      const mDeductions = (advice.morningAnalysis && advice.morningAnalysis.deductions) || (advice.morningScore && advice.morningScore.deductions) || [];

      const eVerd = advice.eveningAnalysis ? advice.eveningAnalysis.verdict : advice.eveningScore.verdict;
      const eBadge = advice.eveningAnalysis ? advice.eveningAnalysis.badgeText : advice.eveningScore.badgeText;
      const eTemp = advice.eveningAnalysis ? advice.eveningAnalysis.startWeather.temp : advice.eveningData.avgTemp;
      const eRain = advice.eveningAnalysis ? advice.eveningAnalysis.maxRainOverall : advice.eveningData.totalPrecip;
      const eGusts = advice.eveningAnalysis ? advice.eveningAnalysis.maxGustsOverall : advice.eveningData.maxGusts;
      const eDeductions = (advice.eveningAnalysis && advice.eveningAnalysis.deductions) || (advice.eveningScore && advice.eveningScore.deductions) || [];

      const isMorningWeakest = mScore <= eScore;
      const isEveningWeakest = eScore < mScore;

      els.scoreSlotsComparison.innerHTML = `
        <div class="score-slot-box ${isMorningWeakest ? 'is-weakest' : ''}">
          <div class="score-slot-top">
            <span class="score-slot-title">🌅 Ochtend (${mTime}u)</span>
            <span class="score-slot-num" style="color: ${mScore >= 80 ? '#10b981' : mScore >= 50 ? '#f59e0b' : '#ef4444'};">${mScore}/100</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
            <span class="slot-status-pill" data-verdict="${mVerd}" style="font-size:0.68rem;padding:2px 8px;">${mBadge}</span>
            ${isMorningWeakest ? '<span class="score-weakest-tag">Zwakste schakel</span>' : ''}
          </div>
          <div class="score-slot-meta">
            <span>🌡️ ${I18n.formatters.celsius(mTemp)} • 💧 ${I18n.formatters.millimeters(mRain)} • 💨 ${I18n.formatters.kmh(mGusts)}</span>
            <span style="font-size:0.72rem;color:var(--text-muted);">${mDeductions.length === 0 ? '✨ Geen aftrek (100% droog & kalm)' : mDeductions.map(d => `${d.title} (${d.points} pt)`).join(', ')}</span>
          </div>
        </div>

        <div class="score-slot-box ${isEveningWeakest ? 'is-weakest' : ''}">
          <div class="score-slot-top">
            <span class="score-slot-title">🌇 Avond (${eTime}u)</span>
            <span class="score-slot-num" style="color: ${eScore >= 80 ? '#10b981' : eScore >= 50 ? '#f59e0b' : '#ef4444'};">${eScore}/100</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
            <span class="slot-status-pill" data-verdict="${eVerd}" style="font-size:0.68rem;padding:2px 8px;">${eBadge}</span>
            ${isEveningWeakest ? '<span class="score-weakest-tag">Zwakste schakel</span>' : ''}
          </div>
          <div class="score-slot-meta">
            <span>🌡️ ${I18n.formatters.celsius(eTemp)} • 💧 ${I18n.formatters.millimeters(eRain)} • 💨 ${I18n.formatters.kmh(eGusts)}</span>
            <span style="font-size:0.72rem;color:var(--text-muted);">${eDeductions.length === 0 ? '✨ Geen aftrek (100% droog & kalm)' : eDeductions.map(d => `${d.title} (${d.points} pt)`).join(', ')}</span>
          </div>
        </div>
      `;
    }

    // 3. Pijlers & Aftrekposten
    if (els.scoreFactorsList) {
      const isMorningDecisive = mScore <= eScore;
      const decisiveSlot = isMorningDecisive ? (advice.morningAnalysis || advice.morningScore) : (advice.eveningAnalysis || advice.eveningScore);
      const decisiveData = isMorningDecisive ? advice.morningData : advice.eveningData;
      const deductions = (decisiveSlot && decisiveSlot.deductions) || [];

      const rainDed = deductions.find(d => d.category === 'rain');
      const windDed = deductions.find(d => d.category === 'wind');
      const tempDeds = deductions.filter(d => d.category === 'temp' || d.category === 'cold_wet');
      const seasonDeds = deductions.filter(d => d.category === 'season' || d.category === 'autumn');
      const stormDed = deductions.find(d => d.category === 'storm');

      const maxG = advice.telemetry ? advice.telemetry.maxGusts : (decisiveData ? decisiveData.maxGusts : 25);
      const userGustLimit = state.commute.maxGusts || 55;
      const minT = advice.telemetry
        ? (advice.morningAnalysis ? Math.min(advice.morningAnalysis.startWeather.temp, advice.eveningAnalysis.startWeather.temp) : Math.min(advice.morningData ? advice.morningData.avgTemp : 15, advice.eveningData ? advice.eveningData.avgTemp : 15))
        : (decisiveData ? decisiveData.avgTemp : 15);
      const userTempLimit = state.commute.minTemp !== undefined ? state.commute.minTemp : 8;
      const rainTolerance = state.commute.rainTolerance || (state.commute.avoidRain ? 'avoid' : 'flexible');
      const rainTolLabel = rainTolerance === 'avoid'
        ? 'Droogrijder (regen vermijden)'
        : rainTolerance === 'all_weather'
        ? 'Doorrijder (all-weather kleding)'
        : 'Flexibel (lichte bui acceptabel)';

      const items = [];

      // Basis
      items.push(`
        <div class="score-factor-item">
          <div class="score-factor-info">
            <span class="score-factor-name">🎯 Startscore (Optimaal)</span>
            <span class="score-factor-desc">Elke rit start op 100 punten bij ideaal, droog en kalm weer.</span>
          </div>
          <span class="score-factor-points points-neutral">100 pt</span>
        </div>
      `);

      // Neerslag
      if (rainDed) {
        items.push(`
          <div class="score-factor-item has-penalty ${rainDed.isInstantNoGo ? 'has-severe-penalty' : ''}">
            <div class="score-factor-info">
              <span class="score-factor-name">
                ${rainDed.icon || '🌧️'} ${rainDed.title}
                ${rainDed.isInstantNoGo ? '<span class="score-instant-badge">🚨 Instant No-Go</span>' : ''}
              </span>
              <span class="score-factor-desc">${rainDed.desc} • Profiel: ${rainTolLabel}</span>
            </div>
            <span class="score-factor-points points-penalty">${rainDed.points} pt</span>
          </div>
        `);
      } else {
        const precipVal = decisiveData ? decisiveData.totalPrecip : 0;
        items.push(`
          <div class="score-factor-item">
            <div class="score-factor-info">
              <span class="score-factor-name">💧 Neerslag &amp; Grip</span>
              <span class="score-factor-desc">Volledig droog wegdek (${I18n.formatters.millimeters(precipVal)}), 100% wegdekgrip • Profiel: ${rainTolLabel}</span>
            </div>
            <span class="score-factor-points points-neutral">0 pt</span>
          </div>
        `);
      }

      // Wind
      if (windDed) {
        items.push(`
          <div class="score-factor-item has-penalty ${windDed.isInstantNoGo ? 'has-severe-penalty' : ''}">
            <div class="score-factor-info">
              <span class="score-factor-name">
                ${windDed.icon || '💨'} ${windDed.title}
                ${windDed.isInstantNoGo ? '<span class="score-instant-badge">🚨 Instant No-Go</span>' : ''}
              </span>
              <span class="score-factor-desc">${windDed.desc}</span>
            </div>
            <span class="score-factor-points points-penalty">${windDed.points} pt</span>
          </div>
        `);
      } else {
        items.push(`
          <div class="score-factor-item">
            <div class="score-factor-info">
              <span class="score-factor-name">💨 Wind &amp; Zijwind</span>
              <span class="score-factor-desc">Zijwindstoten (${I18n.formatters.kmh(maxG)}) blijven veilig onder jouw limiet van ${I18n.formatters.kmh(userGustLimit)}.</span>
            </div>
            <span class="score-factor-points points-neutral">0 pt</span>
          </div>
        `);
      }

      // Temperatuur, kou & verwarmde uitrusting
      if (tempDeds.length > 0) {
        tempDeds.forEach(td => {
          items.push(`
            <div class="score-factor-item has-penalty ${td.isInstantNoGo ? 'has-severe-penalty' : ''}">
              <div class="score-factor-info">
                <span class="score-factor-name">
                  ${td.icon || '🧣'} ${td.title}
                  ${td.isInstantNoGo ? '<span class="score-instant-badge">🚨 Instant No-Go</span>' : ''}
                </span>
                <span class="score-factor-desc">${td.desc}</span>
              </div>
              <span class="score-factor-points points-penalty">${td.points} pt</span>
            </div>
          `);
        });
      } else {
        const heatedNote = state.commute.heatedGloves ? ' • 🧤 Verwarmde handschoenen actief' : '';
        items.push(`
          <div class="score-factor-item">
            <div class="score-factor-info">
              <span class="score-factor-name">🌡️ Temperatuur &amp; Asfalt</span>
              <span class="score-factor-desc">Temperatuur (${I18n.formatters.celsius(minT)}) ligt behaaglijk boven jouw koudegrens van ${I18n.formatters.celsius(userTempLimit)}, geen ijzelrisico${heatedNote}.</span>
            </div>
            <span class="score-factor-points points-neutral">0 pt</span>
          </div>
        `);
      }

      // Seizoensfactor (bijv. Herfstbladeren)
      if (seasonDeds.length > 0) {
        seasonDeds.forEach(sd => {
          items.push(`
            <div class="score-factor-item has-penalty">
              <div class="score-factor-info">
                <span class="score-factor-name">${sd.icon || '🍂'} ${sd.title}</span>
                <span class="score-factor-desc">${sd.desc}</span>
              </div>
              <span class="score-factor-points points-penalty">${sd.points} pt</span>
            </div>
          `);
        });
      }

      // Onweer
      if (stormDed) {
        items.push(`
          <div class="score-factor-item has-severe-penalty">
            <div class="score-factor-info">
              <span class="score-factor-name">
                ⚡ ${stormDed.title}
                ${stormDed.isInstantNoGo ? '<span class="score-instant-badge">🚨 Instant No-Go</span>' : ''}
              </span>
              <span class="score-factor-desc">${stormDed.desc}</span>
            </div>
            <span class="score-factor-points points-penalty">${stormDed.points} pt</span>
          </div>
        `);
      }

      els.scoreFactorsList.innerHTML = items.join('');
    }
  }
};

if (typeof window !== 'undefined') window.UIRenderer = UIRenderer;
if (typeof module !== 'undefined') module.exports = UIRenderer;
