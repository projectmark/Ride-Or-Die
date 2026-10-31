/**
 * Ride Or Die - Berekeningsmodel Motorrit & Geschiktheidsindex (Pure Calculation Engine)
 * Evalueert weersomstandigheden tegen persoonlijke limieten en berekent kledingadvies.
 * Vrij van DOM-interacties en gebruikt centrale drempelwaarden en lokalisatie.
 */

const CommuteEngine = {
  _workdayCacheKey: '',
  _workdayCacheVal: null,

  /**
   * Bepaalt werkdaginformatie (Vandaag en Volgende werkdag) met dag-caching.
   */
  getWorkdayConfig(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDateStr = `${y}-${m}-${day}`;

    if (this._workdayCacheKey === todayDateStr && this._workdayCacheVal) {
      return this._workdayCacheVal;
    }

    const formatYMD = (d) => {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${dy}`;
    };

    const dayOfWeek = now.getDay(); // 0 = zo, 1 = ma, ..., 6 = za

    let daysOffset = 1;
    if (dayOfWeek === 5) daysOffset = 3; // Vrijdag -> Maandag
    else if (dayOfWeek === 6) daysOffset = 2; // Zaterdag -> Maandag
    else if (dayOfWeek === 0) daysOffset = 1; // Zondag -> Maandag

    const nextWorkdayDate = new Date(now);
    nextWorkdayDate.setDate(now.getDate() + daysOffset);
    const nextWorkdayStr = formatYMD(nextWorkdayDate);

    const dayNamesNL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
    const dayNamesShortNL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
    const nextDayName = dayNamesNL[nextWorkdayDate.getDay()];
    const nextDayShort = dayNamesShortNL[nextWorkdayDate.getDay()];
    const isTomorrow = (daysOffset === 1);

    const result = {
      today: {
        date: now,
        dateStr: todayDateStr,
        label: 'Vandaag'
      },
      nextWorkday: {
        date: nextWorkdayDate,
        dateStr: nextWorkdayStr,
        dayName: nextDayName,
        dayShort: nextDayShort,
        isTomorrow,
        buttonLabel: isTomorrow ? `Morgen (${nextDayShort})` : `Maandag (${nextDayShort})`,
        fullLabel: isTomorrow ? `Morgen (${nextDayName})` : `Volgende werkdag (${nextDayName})`
      }
    };

    this._workdayCacheKey = todayDateStr;
    this._workdayCacheVal = result;
    return result;
  },

  /**
   * Berekent het gemiddelde van een specifiek tijdvak (ochtend of avond).
   */
  getCommuteSlice(hourly, activeDateStr, targetHour) {
    if (!hourly || !hourly.time) return null;
    const times = hourly.time;
    let indices = [];

    for (let i = 0; i < times.length; i++) {
      if (times[i].startsWith(activeDateStr)) {
        const h = parseInt(times[i].substring(11, 13), 10);
        if (Math.abs(h - targetHour) <= 1) indices.push(i);
      }
    }

    if (indices.length === 0) {
      const dayIndices = [];
      for (let i = 0; i < times.length; i++) {
        if (times[i].startsWith(activeDateStr)) dayIndices.push(i);
      }
      indices = dayIndices.length ? dayIndices.slice(0, 3) : [0, 1, 2];
    }

    let maxTemp = -999, minTemp = 999, totalPrecip = 0, maxPrecipProb = 0, maxGusts = 0, worstCode = 0;
    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      const t = hourly.temperature_2m[idx] || 0;
      if (t > maxTemp) maxTemp = t;
      if (t < minTemp) minTemp = t;
      totalPrecip += (hourly.precipitation[idx] || 0);
      const prob = hourly.precipitation_probability[idx] || 0;
      if (prob > maxPrecipProb) maxPrecipProb = prob;
      const g = hourly.wind_gusts_10m[idx] || 0;
      if (g > maxGusts) maxGusts = g;
      const code = hourly.weather_code[idx] || 0;
      if (code > worstCode) worstCode = code;
    }

    return {
      avgTemp: Math.round((maxTemp + minTemp) / 2),
      totalPrecip: parseFloat(totalPrecip.toFixed(1)),
      maxPrecipProb,
      maxGusts: Math.round(maxGusts),
      worstCode
    };
  },

  /**
   * Berekent de ritscore en aftrekpunten voor een enkel tijdvak.
   */
  scoreCommuteSlot(slot, userLimits = {}, activeDateStr = null) {
    let score = 100;
    const reasons = [];
    const deductions = [];
    let hasInstantNoGo = false;

    const R = Config.THRESHOLDS.RAIN;
    const W = Config.THRESHOLDS.WIND;
    const T = Config.THRESHOLDS.TEMPERATURE;

    const maxGustsLimit = userLimits.maxGusts || W.DEFAULT_MAX_GUSTS;
    const minTempLimit = userLimits.minTemp !== undefined ? userLimits.minTemp : T.DEFAULT_MIN;
    const rainTolerance = userLimits.rainTolerance || (userLimits.avoidRain ? 'avoid' : 'flexible');
    const heatedGloves = !!userLimits.heatedGloves;

    // 1. Absolute Zero-Tolerance: IJzel, sneeuw en bevroren wegdek
    const winterWmoCodes = [48, 56, 57, 66, 67, 71, 73, 75, 77, 85, 86];
    const isWinterCode = winterWmoCodes.includes(slot.worstCode);
    const isFreezing = slot.avgTemp <= (T.FREEZING || 1.5);

    if (isFreezing || isWinterCode) {
      score -= 65;
      hasInstantNoGo = true;
      deductions.push({
        category: 'temp',
        icon: '❄️',
        points: -65,
        isInstantNoGo: true,
        title: 'Instant No-Go: Kans op gladheid, ijzel of sneeuw',
        desc: `${I18n.formatters.celsius(slot.avgTemp)}. Asfalt bevriest of winterse neerslag. Twee wielen hebben nul grip: NIET rijden!`
      });
      reasons.push("Levensgevaarlijk glad asfalt door ijzel, vorst of sneeuw.");
    }

    // 2. Compound Risico: Koud asfalt (< 7°C) gecombineerd met nat wegdek
    const isColdWet = !isFreezing && slot.avgTemp <= 7.0 && slot.totalPrecip >= 0.15;
    if (isColdWet) {
      score -= 22;
      deductions.push({
        category: 'cold_wet',
        icon: '❄️💧',
        points: -22,
        title: 'Koud & Nat wegdek (< 7°C met regen)',
        desc: `${I18n.formatters.celsius(slot.avgTemp)} met ${I18n.formatters.millimeters(slot.totalPrecip)} neerslag. Koude banden hebben fors minder grip en kans op opvriezing op viaducten.`
      });
      reasons.push("Verhoogd sliprisico: koud asfalt (< 7°C) met nat wegdek.");
    }

    // 3. Seizoenscontext: Herfst & nat bladerdek (september t/m december)
    const currentMonth = (typeof activeDateStr === 'string' && activeDateStr.length >= 7)
      ? (parseInt(activeDateStr.substring(5, 7), 10) - 1)
      : new Date().getMonth();
    const isAutumn = (currentMonth >= 8 && currentMonth <= 11);
    if (isAutumn && !isFreezing && (slot.totalPrecip >= 0.05 || slot.maxGusts >= 40)) {
      score -= 8;
      deductions.push({
        category: 'autumn',
        icon: '🍂',
        points: -8,
        title: 'Herfst: Nat bladerdek op de weg',
        desc: 'Natte bladeren vormen in de herfst een verraderlijke glijbaan in bochten en bij remacties.'
      });
      reasons.push("Herfstseizoen: pas extra op voor natte bladeren op het asfalt.");
    }

    // 4. Neerslagbeoordeling op basis van persoonlijke tolerantie
    if (rainTolerance === 'avoid') {
      // Droogrijder: regen weegt zwaar
      if (slot.totalPrecip > 3.5) {
        score -= 60;
        hasInstantNoGo = true;
        deductions.push({ category: 'rain', icon: '🌧️', points: -60, isInstantNoGo: true, title: 'Instant No-Go: Wolkbreuk / Stortregen', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag. Zicht nihil en aquaplaning!` });
        reasons.push(`Wolkbreuk / zware stortregen (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.SEVERE_MM || (slot.totalPrecip > R.HEAVY_MM && slot.maxPrecipProb > 75)) {
        score -= 50;
        deductions.push({ category: 'rain', icon: '🌧️', points: -50, title: 'Stevige regenval (Droogrijder)', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag voorspeld.` });
        reasons.push(`Stevige regenval verwacht (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.MODERATE_MM || (slot.totalPrecip > 0.3 && slot.maxPrecipProb > 60)) {
        score -= 38;
        deductions.push({ category: 'rain', icon: '🌦️', points: -38, title: 'Kans op een bui (Droogrijder)', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag (kans ${slot.maxPrecipProb}%).` });
        reasons.push(`Kans op een bui (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.LIGHT_MM) {
        score -= 28;
        deductions.push({ category: 'rain', icon: '🌦️', points: -28, title: 'Lichte bui / motregen (Droogrijder)', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag.` });
        reasons.push(`Lichte bui of motregen (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.TRACE_MM) {
        score -= 10;
        deductions.push({ category: 'rain', icon: '💧', points: -10, title: 'Mogelijk spatje neerslag', desc: 'Minimale neerslaghoeveelheid.' });
        reasons.push("Mogelijk een enkel spatje neerslag.");
      } else if (slot.maxPrecipProb > 65) {
        score -= 10;
        deductions.push({ category: 'rain', icon: '💧', points: -10, title: 'Lichte buienkans', desc: `${slot.maxPrecipProb}% regenkans in de regio.` });
        reasons.push(`Overwegend droog, lichte buienkans in de regio (${slot.maxPrecipProb}%).`);
      }
    } else if (rainTolerance === 'all_weather') {
      // Doorrijder: regenpak paraat, milde aftrek
      if (slot.totalPrecip > 3.5) {
        score -= 50;
        hasInstantNoGo = true;
        deductions.push({ category: 'rain', icon: '🌧️', points: -50, isInstantNoGo: true, title: 'Instant No-Go: Wolkbreuk / Stortregen', desc: `Gevaarlijk zware regenval (${I18n.formatters.millimeters(slot.totalPrecip)}). Zicht nihil en aquaplaning!` });
        reasons.push(`Gevaarlijke stortbui (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.SEVERE_MM || (slot.totalPrecip > R.HEAVY_MM && slot.maxPrecipProb > 75)) {
        score -= 30;
        deductions.push({ category: 'rain', icon: '🌧️', points: -30, title: 'Stevige regenval (Doorrijder)', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag voorspeld. Pas snelheid aan.` });
        reasons.push(`Stevige regenval (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.MODERATE_MM || (slot.totalPrecip > 0.3 && slot.maxPrecipProb > 60)) {
        score -= 18;
        deductions.push({ category: 'rain', icon: '🌦️', points: -18, title: 'Regenbui (Goed te rijden)', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag (kans ${slot.maxPrecipProb}%). Regenpak aan!` });
        reasons.push(`Kans op een bui (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.LIGHT_MM) {
        score -= 10;
        deductions.push({ category: 'rain', icon: '🌦️', points: -10, title: 'Lichte motregen / bui', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag. Prima met all-weather kleding.` });
        reasons.push(`Lichte bui of motregen (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.TRACE_MM) {
        score -= 4;
        deductions.push({ category: 'rain', icon: '💧', points: -4, title: 'Enkel spatje', desc: 'Nauwelijks merkbare neerslag.' });
      }
    } else {
      // Flexibel (Standaard motorrijder)
      if (slot.totalPrecip > 3.5) {
        score -= 55;
        hasInstantNoGo = true;
        deductions.push({ category: 'rain', icon: '🌧️', points: -55, isInstantNoGo: true, title: 'Instant No-Go: Wolkbreuk / Stortregen', desc: `Piek van ${I18n.formatters.millimeters(slot.totalPrecip)}. Zicht nihil en aquaplaning!` });
        reasons.push(`Wolkbreuk / stortregen (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.SEVERE_MM || (slot.totalPrecip > R.HEAVY_MM && slot.maxPrecipProb > 75)) {
        score -= 40;
        deductions.push({ category: 'rain', icon: '🌧️', points: -40, title: 'Stevige regenval', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag voorspeld.` });
        reasons.push(`Stevige regenval (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.MODERATE_MM || (slot.totalPrecip > 0.3 && slot.maxPrecipProb > 60)) {
        score -= 28;
        deductions.push({ category: 'rain', icon: '🌦️', points: -28, title: 'Kans op een bui', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag (kans ${slot.maxPrecipProb}%).` });
        reasons.push(`Kans op een bui (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.LIGHT_MM) {
        score -= 18;
        deductions.push({ category: 'rain', icon: '🌦️', points: -18, title: 'Lichte motregen / bui', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag.` });
        reasons.push(`Lichte bui of motregen (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
      } else if (slot.totalPrecip > R.TRACE_MM) {
        score -= 8;
        deductions.push({ category: 'rain', icon: '💧', points: -8, title: 'Mogelijk spatje neerslag', desc: 'Minimale neerslaghoeveelheid.' });
      }
    }

    // 5. Wind- en stotenbeoordeling & Instant No-Go voor stormstoten
    if (slot.maxGusts > W.DANGEROUS_GUSTS) {
      score -= 55;
      hasInstantNoGo = true;
      deductions.push({ category: 'wind', icon: '🌪️', points: -55, isInstantNoGo: true, title: 'Instant No-Go: Gevaarlijke stormstoten', desc: `${I18n.formatters.kmh(slot.maxGusts)} (boven ${W.DANGEROUS_GUSTS} km/u). Hoog risico op omwaaien!` });
      reasons.push(`Gevaarlijke windstoten van ${I18n.formatters.kmh(slot.maxGusts)}.`);
    } else if (slot.maxGusts > maxGustsLimit) {
      const penalty = (slot.maxGusts - maxGustsLimit) > 10 ? 30 : 20;
      score -= penalty;
      deductions.push({ category: 'wind', icon: '💨', points: -penalty, title: 'Boven jouw windlimiet', desc: `Stoten van ${I18n.formatters.kmh(slot.maxGusts)} (jouw limiet: ${I18n.formatters.kmh(maxGustsLimit)})` });
      reasons.push(`Windstoten (${I18n.formatters.kmh(slot.maxGusts)}) boven jouw limiet van ${I18n.formatters.kmh(maxGustsLimit)}.`);
    } else if (slot.maxGusts > W.STRONG_GUSTS) {
      score -= 15;
      deductions.push({ category: 'wind', icon: '💨', points: -15, title: 'Felle zijwind', desc: `${I18n.formatters.kmh(slot.maxGusts)} op open wegen` });
      reasons.push(`Felle zijwind op open wegen (${I18n.formatters.kmh(slot.maxGusts)}).`);
    } else if (slot.maxGusts > 40) {
      score -= 5;
      deductions.push({ category: 'wind', icon: '💨', points: -5, title: 'Merkbare snelwegwind', desc: `${I18n.formatters.kmh(slot.maxGusts)} stoten` });
      reasons.push(`Merkbare wind op de snelweg (${I18n.formatters.kmh(slot.maxGusts)}).`);
    }

    // 6. Temperatuur & Verwarmde Handschoenen personalisatie
    if (!isFreezing) {
      if (slot.avgTemp < minTempLimit) {
        if (heatedGloves && slot.avgTemp >= 3.0) {
          score -= 5;
          deductions.push({
            category: 'temp',
            icon: '🧤',
            points: -5,
            title: 'Fris weer • Verwarmde handschoenen actief',
            desc: `${I18n.formatters.celsius(slot.avgTemp)} (onder jouw grens van ${I18n.formatters.celsius(minTempLimit)}), maar verwarmde handschoenen houden je vingers soepel en veilig.`
          });
          reasons.push(`Fris (${I18n.formatters.celsius(slot.avgTemp)}), maar verwarmde handschoenen compenseren de kou.`);
        } else {
          score -= 20;
          deductions.push({
            category: 'temp',
            icon: '🧣',
            points: -20,
            title: 'Onder jouw minimumtemperatuur',
            desc: `${I18n.formatters.celsius(slot.avgTemp)} (jouw limiet: ${I18n.formatters.celsius(minTempLimit)})`
          });
          reasons.push(`Koud (${I18n.formatters.celsius(slot.avgTemp)}), onder jouw limiet van ${I18n.formatters.celsius(minTempLimit)}.`);
        }
      } else if (slot.avgTemp > T.EXTREME_HEAT) {
        score -= 20;
        deductions.push({ category: 'temp', icon: '☀️', points: -20, title: 'Extreme warmte', desc: `${I18n.formatters.celsius(slot.avgTemp)} in motorpak` });
        reasons.push(`Erg warm in motorpak (${I18n.formatters.celsius(slot.avgTemp)}).`);
      }
    }

    // 7. Onweerscodes (Instant No-Go)
    if ([95, 96, 97, 99].includes(slot.worstCode)) {
      score -= 60;
      hasInstantNoGo = true;
      deductions.push({ category: 'storm', icon: '⚡', points: -60, isInstantNoGo: true, title: 'Instant No-Go: Onweer of hagel', desc: 'Blikseminslag, grote hagelstenen en valwinden. Niet rijden!' });
      reasons.push("Onweer of hagel voorspeld.");
    }

    if (hasInstantNoGo) {
      score = Math.min(score, 30);
    }
    score = Math.max(0, Math.min(100, score));

    let verdict = "green";
    let badgeText = I18n.t.verdicts.greenBadge;
    if (hasInstantNoGo || score < 50 || (rainTolerance === 'avoid' && slot.totalPrecip > R.LIGHT_MM)) {
      verdict = "red";
      badgeText = hasInstantNoGo ? (I18n.t.verdicts.instantNoGoBadge || "🔴 NO-GO!") : I18n.t.verdicts.redBadge;
    } else if (score < 80 || isColdWet || (rainTolerance !== 'all_weather' && slot.totalPrecip > R.LIGHT_MM)) {
      verdict = "yellow";
      badgeText = I18n.t.verdicts.yellowBadge;
    }

    return { score, verdict, badgeText, reasons, deductions, hasInstantNoGo };
  },

  /**
   * Berekent het kleding- en uitrustingsadvies op basis van minimumtemperatuur en neerslag.
   */
  computeGearAdvice(minTemp, maxTemp, maxRain, heatedGloves = false) {
    const pills = [];
    const G = I18n.t.gear;

    if (heatedGloves && minTemp < 12) {
      pills.push(G.heatedGloves || "🧤 Verwarmde handschoenen (Aan)");
      if (minTemp < 8) pills.push(G.thermoLining);
      pills.push(minTemp < 15 ? G.textileJacket : G.allroundGear);
    } else {
      if (minTemp < 7) {
        pills.push(G.winterGloves);
        pills.push(G.thermoLining);
      } else if (minTemp < 15) {
        pills.push(G.textileJacket);
        pills.push(G.midGloves);
      } else if (maxTemp > 24) {
        pills.push(G.meshJacket);
        pills.push(G.summerGloves);
        pills.push(G.sunVisor);
      } else {
        pills.push(G.allroundGear);
        pills.push(G.allSeasonGloves);
      }
    }

    if (maxRain > Config.THRESHOLDS.RAIN.LIGHT_MM) {
      pills.push(G.rainSuit);
    } else {
      pills.push(G.dryVisor);
    }

    return pills;
  },

  /**
   * Hoofdbeoordelingsfunctie die de gehele motorrit berekent.
   */
  computeAdvice(weatherData, userPreferences = {}, routeState = null) {
    if (!weatherData || !weatherData.hourly) return null;

    const workdayConfig = this.getWorkdayConfig();
    const isNextWorkday = userPreferences.selectedDay === 'nextWorkday';
    const activeDateStr = isNextWorkday ? workdayConfig.nextWorkday.dateStr : workdayConfig.today.dateStr;

    const morningHour = parseInt((userPreferences.morningTime || '08:00').split(':')[0], 10);
    const eveningHour = parseInt((userPreferences.eveningTime || '17:00').split(':')[0], 10);

    const morningData = this.getCommuteSlice(weatherData.hourly, activeDateStr, morningHour);
    const eveningData = this.getCommuteSlice(weatherData.hourly, activeDateStr, eveningHour);

    const morningScore = this.scoreCommuteSlot(morningData, userPreferences, activeDateStr);
    const eveningScore = this.scoreCommuteSlot(eveningData, userPreferences, activeDateStr);

    let morningAnalysis = null;
    let eveningAnalysis = null;

    // Evaluatie over de routecorridor indien tussenstops beschikbaar zijn
    if (typeof RouteEngine !== 'undefined' && routeState && routeState.waypointsWeather && routeState.waypointsWeather.start) {
      try {
        const morningDate = new Date(`${activeDateStr}T${userPreferences.morningTime || '08:00'}:00`);
        const eveningDate = new Date(`${activeDateStr}T${userPreferences.eveningTime || '17:00'}:00`);

        morningAnalysis = RouteEngine.evaluateRoute({
          start: routeState.start,
          mid: routeState.mid,
          dest: routeState.dest,
          legDurationMinutes: routeState.legDurationMinutes || 20
        }, {
          start: routeState.waypointsWeather.start,
          mid: routeState.waypointsWeather.mid,
          dest: routeState.waypointsWeather.dest
        }, morningDate, userPreferences);

        eveningAnalysis = RouteEngine.evaluateRoute({
          start: routeState.dest,
          mid: routeState.mid,
          dest: routeState.start,
          legDurationMinutes: routeState.legDurationMinutes || 20
        }, {
          start: routeState.waypointsWeather.dest,
          mid: routeState.waypointsWeather.mid,
          dest: routeState.waypointsWeather.start
        }, eveningDate, userPreferences);
      } catch (err) {
        console.warn("Fout bij corridoranalyse:", err);
      }
    }

    const mScore = morningAnalysis ? morningAnalysis.score : morningScore.score;
    const eScore = eveningAnalysis ? eveningAnalysis.score : eveningScore.score;
    const mVerd = morningAnalysis ? morningAnalysis.verdict : morningScore.verdict;
    const eVerd = eveningAnalysis ? eveningAnalysis.verdict : eveningScore.verdict;
    const minScore = Math.min(mScore, eScore);

    const morningHasNoGo = (morningAnalysis && morningAnalysis.hasInstantNoGo) || (morningScore && morningScore.hasInstantNoGo);
    const eveningHasNoGo = (eveningAnalysis && eveningAnalysis.hasInstantNoGo) || (eveningScore && eveningScore.hasInstantNoGo);
    const hasInstantNoGo = morningHasNoGo || eveningHasNoGo;

    const noGoDeduction = (morningAnalysis && morningAnalysis.deductions && morningAnalysis.deductions.find(d => d.isInstantNoGo))
      || (morningScore && morningScore.deductions && morningScore.deductions.find(d => d.isInstantNoGo))
      || (eveningAnalysis && eveningAnalysis.deductions && eveningAnalysis.deductions.find(d => d.isInstantNoGo))
      || (eveningScore && eveningScore.deductions && eveningScore.deductions.find(d => d.isInstantNoGo));

    const startName = routeState && routeState.start ? routeState.start.name : 'Start';
    const destName = routeState && routeState.dest ? routeState.dest.name : 'Bestemming';

    const morningRainAmt = morningAnalysis ? morningAnalysis.maxRainOverall : (morningData ? morningData.totalPrecip : 0);
    const eveningRainAmt = eveningAnalysis ? eveningAnalysis.maxRainOverall : (eveningData ? eveningData.totalPrecip : 0);
    const isMorningWet = mVerd !== 'green' || morningRainAmt >= Config.THRESHOLDS.RAIN.LIGHT_MM;
    const isEveningWet = eVerd !== 'green' || eveningRainAmt >= Config.THRESHOLDS.RAIN.LIGHT_MM;

    const rainTolerance = userPreferences.rainTolerance || (userPreferences.avoidRain ? 'avoid' : 'flexible');
    const isAvoidRain = rainTolerance === 'avoid';
    const isAllWeather = rainTolerance === 'all_weather';
    const heatedGloves = !!userPreferences.heatedGloves;

    let dayVerdict = "green";
    let dayPill = I18n.t.verdicts.greenBadge;
    let dayHeadline = "Groen licht: Heerlijk motorweer over jouw hele traject!";
    let dayExplanation = `Zowel de ochtend- als avondrit zijn droog en veilig tussen ${startName} en ${destName}.`;

    if (hasInstantNoGo) {
      dayVerdict = "red";
      dayPill = I18n.t.verdicts.instantNoGoBadge || "🔴 NO-GO!";
      dayHeadline = noGoDeduction ? `${noGoDeduction.title}!` : "Onveilig motorweer: Instant No-Go op je route!";
      dayExplanation = noGoDeduction
        ? `${noGoDeduction.desc} Laat de motor absoluut staan en kies voor de auto of het ov.`
        : `Onveilige condities door gladheid of storm tussen ${startName} en ${destName}.`;
    } else if (minScore < 50 || mVerd === 'red' || eVerd === 'red' || (isAvoidRain && (isMorningWet || isEveningWet))) {
      dayVerdict = "red";
      dayPill = I18n.t.verdicts.redBadge;
      if (isAvoidRain && (isMorningWet || isEveningWet)) {
        dayHeadline = "Regen op je route: pak liever de auto of het ov.";
        dayExplanation = `Omdat jouw voorkeur staat op 'Droogrijder' (regen vermijden), kleurt het advies rood bij neerslag tussen ${startName} en ${destName}.`;
      } else {
        dayHeadline = "Slecht weer op je route. Pak liever de auto of het ov.";
        dayExplanation = `Onveilige omstandigheden door weerfactoren tussen ${startName} en ${destName}.`;
      }
    } else if (minScore < 80 || mVerd === 'yellow' || eVerd === 'yellow' || isMorningWet || isEveningWet) {
      dayVerdict = "yellow";
      dayPill = I18n.t.verdicts.yellowBadge;
      if (isMorningWet && !isEveningWet) {
        dayHeadline = `Let op bij de heenrit: kans op een bui op je route.`;
        dayExplanation = `Onderweg trekt een bui over (${I18n.formatters.millimeters(morningRainAmt)}). De terugreis is wel droog.`;
      } else if (!isMorningWet && isEveningWet) {
        dayHeadline = `Heenrit droog, maar bui verwacht bij de terugreis.`;
        dayExplanation = `Ochtendrit is droog en veilig. Bij de terugreis valt neerslag (${I18n.formatters.millimeters(eveningRainAmt)}). Regenpak mee!`;
      } else if (isMorningWet && isEveningWet) {
        dayHeadline = isAllWeather
          ? "Buiig weer: goed te doen voor een all-weather doorrijder."
          : "Wisselvallig weer: kans op buien tijdens beide ritten.";
        dayExplanation = "Houd rekening met nat asfalt en verminderde grip. Goed te doen met een waterdicht motorpak!";
      } else {
        dayHeadline = "Rijden kan prima, maar wees voorbereid op wisselvallig weer.";
        dayExplanation = "Mogelijk een spatje neerslag of merkbare zijwind op open stukken weg.";
      }
    } else {
      dayHeadline = "Volledig droog asfalt en kalme wind over het hele traject.";
      dayExplanation = `Alle routepunten tussen ${startName} en ${destName} blijven droog en begaanbaar.`;
    }

    const minDayTemp = morningAnalysis && eveningAnalysis
      ? Math.min(morningAnalysis.startWeather.temp, eveningAnalysis.startWeather.temp)
      : Math.min(morningData.avgTemp, eveningData.avgTemp);

    const maxDayTemp = morningAnalysis && eveningAnalysis
      ? Math.max(morningAnalysis.destWeather.temp, eveningAnalysis.destWeather.temp)
      : Math.max(morningData.avgTemp, eveningData.avgTemp);

    const maxRouteRain = morningAnalysis && eveningAnalysis
      ? Math.max(morningAnalysis.maxRainOverall, eveningAnalysis.maxRainOverall)
      : Math.max(morningData.totalPrecip, eveningData.totalPrecip);

    const maxRouteGusts = morningAnalysis && eveningAnalysis
      ? Math.max(morningAnalysis.maxGustsOverall, eveningAnalysis.maxGustsOverall)
      : Math.max(morningData.maxGusts, eveningData.maxGusts);

    const isFreezingRisk = minDayTemp <= (Config.THRESHOLDS.TEMPERATURE.FREEZING || 1.5);
    const isColdWetRisk = minDayTemp <= (Config.THRESHOLDS.TEMPERATURE.COMPOUND_COLD_WET || 7) && maxRouteRain >= Config.THRESHOLDS.RAIN.TRACE_MM;
    const activeMonth = (typeof activeDateStr === 'string' && activeDateStr.length >= 7)
      ? (parseInt(activeDateStr.substring(5, 7), 10) - 1)
      : new Date().getMonth(); // 8=Sep, 9=Okt, 10=Nov, 11=Dec
    const isAutumnSeason = activeMonth >= 8 && activeMonth <= 11;
    const isAutumnLeavesRisk = isAutumnSeason && (maxRouteRain >= Config.THRESHOLDS.RAIN.TRACE_MM || maxRouteGusts >= 40);

    let gripPercent = 100;
    let gripStatus = I18n.t.telemetry.optimal;

    if (isFreezingRisk) {
      gripPercent = 25;
      gripStatus = I18n.t.telemetry.slippery;
    } else if (isColdWetRisk) {
      gripPercent = 50;
      gripStatus = I18n.t.telemetry.coldWetSlippery || "Koud & spekglad (<7°C)";
    } else if (maxRouteRain > 2.0) {
      gripPercent = 55;
      gripStatus = I18n.t.telemetry.slippery;
    } else if (isAutumnLeavesRisk && maxRouteRain > 0) {
      gripPercent = 65;
      gripStatus = I18n.t.telemetry.autumnLeaves || "Nat bladerdek (Herfst)";
    } else if (maxRouteRain > 0.3) {
      gripPercent = 75;
      gripStatus = I18n.t.telemetry.damp;
    }

    return {
      morningData,
      eveningData,
      morningScore,
      eveningScore,
      morningAnalysis,
      eveningAnalysis,
      telemetry: {
        maxGusts: maxRouteGusts,
        maxRain: maxRouteRain,
        gripPercent,
        gripStatus,
        avgTemp: Math.round((minDayTemp + maxDayTemp) / 2)
      },
      dayVerdict,
      dayHeadline,
      dayPill,
      dayExplanation,
      minScore,
      gearPills: this.computeGearAdvice(minDayTemp, maxDayTemp, maxRouteRain, heatedGloves),
      isNextWorkday,
      activeDateStr,
      workdayConfig
    };
  }
};

// Aliassen voor bestaande code
const computeCommuteAdvise = (wData, tDateStr) => {
  const prefs = {
    selectedDay: AppState.selectedDay,
    morningTime: AppState.commute.morningTime,
    eveningTime: AppState.commute.eveningTime,
    minTemp: AppState.commute.minTemp,
    maxGusts: AppState.commute.maxGusts,
    avoidRain: AppState.commute.avoidRain,
    rainTolerance: AppState.commute.rainTolerance,
    heatedGloves: AppState.commute.heatedGloves
  };
  return CommuteEngine.computeAdvice(wData, prefs, AppState.route);
};
const getWorkdayConfig = () => CommuteEngine.getWorkdayConfig();
const kmhToBeaufort = (kmh) => I18n.beaufortScale(kmh);

if (typeof window !== 'undefined') {
  window.CommuteEngine = CommuteEngine;
  window.computeCommuteAdvise = computeCommuteAdvise;
  window.getWorkdayConfig = getWorkdayConfig;
  window.kmhToBeaufort = kmhToBeaufort;
}
if (typeof module !== 'undefined') {
  module.exports = { CommuteEngine, computeCommuteAdvise, getWorkdayConfig, kmhToBeaufort };
}
