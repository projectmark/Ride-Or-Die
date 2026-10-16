/**
 * Ride Or Die - Berekeningsmodel Motorrit & Geschiktheidsindex (Pure Calculation Engine)
 * Evalueert weersomstandigheden tegen persoonlijke limieten en berekent kledingadvies.
 * Vrij van DOM-interacties en gebruikt centrale drempelwaarden en lokalisatie.
 */

const CommuteEngine = {
  /**
   * Bepaalt werkdaginformatie (Vandaag en Volgende werkdag).
   */
  getWorkdayConfig(now = new Date()) {
    const formatYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const todayDateStr = formatYMD(now);
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

    return {
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
    indices.forEach(idx => {
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
    });

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
  scoreCommuteSlot(slot, userLimits = {}) {
    let score = 100;
    const reasons = [];
    const deductions = [];
    const R = Config.THRESHOLDS.RAIN;
    const W = Config.THRESHOLDS.WIND;
    const T = Config.THRESHOLDS.TEMPERATURE;

    const maxGustsLimit = userLimits.maxGusts || W.DEFAULT_MAX_GUSTS;
    const minTempLimit = userLimits.minTemp !== undefined ? userLimits.minTemp : T.DEFAULT_MIN;

    // 1. Neerslagbeoordeling
    if (slot.totalPrecip > R.SEVERE_MM || (slot.totalPrecip > R.HEAVY_MM && slot.maxPrecipProb > 75)) {
      score -= 50;
      deductions.push({ category: 'rain', icon: '🌧️', points: -50, title: 'Stevige regenval', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag voorspeld` });
      reasons.push(`Stevige regenval verwacht (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
    } else if (slot.totalPrecip > R.MODERATE_MM || (slot.totalPrecip > 0.3 && slot.maxPrecipProb > 60)) {
      score -= 35;
      deductions.push({ category: 'rain', icon: '🌦️', points: -35, title: 'Kans op een bui', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag (kans ${slot.maxPrecipProb}%)` });
      reasons.push(`Kans op een bui (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
    } else if (slot.totalPrecip > R.LIGHT_MM) {
      score -= 28;
      deductions.push({ category: 'rain', icon: '🌦️', points: -28, title: 'Lichte motregen / bui', desc: `${I18n.formatters.millimeters(slot.totalPrecip)} neerslag` });
      reasons.push(`Lichte bui of motregen (${I18n.formatters.millimeters(slot.totalPrecip)}).`);
    } else if (slot.totalPrecip > R.TRACE_MM) {
      score -= 10;
      deductions.push({ category: 'rain', icon: '💧', points: -10, title: 'Mogelijk spatje neerslag', desc: 'Minimale neerslaghoeveelheid' });
      reasons.push("Mogelijk een enkel spatje neerslag.");
    } else if (slot.maxPrecipProb > 65) {
      score -= 10;
      deductions.push({ category: 'rain', icon: '💧', points: -10, title: 'Lichte buienkans', desc: `${slot.maxPrecipProb}% regenkans in de regio` });
      reasons.push(`Overwegend droog, lichte buienkans in de regio (${slot.maxPrecipProb}%).`);
    }

    // 2. Wind- en stotenbeoordeling
    if (slot.maxGusts > W.DANGEROUS_GUSTS) {
      score -= 50;
      deductions.push({ category: 'wind', icon: '💨', points: -50, title: 'Gevaarlijke windstoten', desc: `${I18n.formatters.kmh(slot.maxGusts)} (boven ${W.DANGEROUS_GUSTS} km/u limiet)` });
      reasons.push(`Gevaarlijke windstoten van ${I18n.formatters.kmh(slot.maxGusts)}.`);
    } else if (slot.maxGusts > maxGustsLimit) {
      const penalty = (slot.maxGusts - maxGustsLimit) > 10 ? 35 : 20;
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

    // 3. Temperatuur- en gladheidsbeoordeling
    if (slot.avgTemp < T.ICE_RISK) {
      score -= 60;
      deductions.push({ category: 'temp', icon: '❄️', points: -60, title: 'Kans op gladheid of ijzel', desc: `${I18n.formatters.celsius(slot.avgTemp)} (asfalt kan bevriezen)` });
      reasons.push("Kans op gladheid of ijzel op het asfalt.");
    } else if (slot.avgTemp < minTempLimit) {
      score -= 20;
      deductions.push({ category: 'temp', icon: '🧣', points: -20, title: 'Onder jouw minimumtemperatuur', desc: `${I18n.formatters.celsius(slot.avgTemp)} (jouw limiet: ${I18n.formatters.celsius(minTempLimit)})` });
      reasons.push(`Koud (${I18n.formatters.celsius(slot.avgTemp)}), onder jouw limiet van ${I18n.formatters.celsius(minTempLimit)}.`);
    } else if (slot.avgTemp > T.EXTREME_HEAT) {
      score -= 20;
      deductions.push({ category: 'temp', icon: '☀️', points: -20, title: 'Extreme warmte', desc: `${I18n.formatters.celsius(slot.avgTemp)} in motorpak` });
      reasons.push(`Erg warm in motorpak (${I18n.formatters.celsius(slot.avgTemp)}).`);
    }

    // 4. Onweerscodes
    if ([95, 96, 97, 99].includes(slot.worstCode)) {
      score -= 60;
      deductions.push({ category: 'storm', icon: '⚡', points: -60, title: 'Onweer of hagel', desc: 'Code oranje/rood gevaar' });
      reasons.push("Onweer of hagel voorspeld.");
    }

    score = Math.max(0, Math.min(100, score));

    let verdict = "green";
    let badgeText = I18n.t.verdicts.greenBadge;
    if (score < 50) {
      verdict = "red";
      badgeText = I18n.t.verdicts.redBadge;
    } else if (score < 80) {
      verdict = "yellow";
      badgeText = I18n.t.verdicts.yellowBadge;
    }

    return { score, verdict, badgeText, reasons, deductions };
  },

  /**
   * Berekent het kleding- en uitrustingsadvies op basis van minimumtemperatuur en neerslag.
   */
  computeGearAdvice(minTemp, maxTemp, maxRain) {
    const pills = [];
    const G = I18n.t.gear;

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

    const morningScore = this.scoreCommuteSlot(morningData, userPreferences);
    const eveningScore = this.scoreCommuteSlot(eveningData, userPreferences);

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
        }, morningDate);

        eveningAnalysis = RouteEngine.evaluateRoute({
          start: routeState.dest,
          mid: routeState.mid,
          dest: routeState.start,
          legDurationMinutes: routeState.legDurationMinutes || 20
        }, {
          start: routeState.waypointsWeather.dest,
          mid: routeState.waypointsWeather.mid,
          dest: routeState.waypointsWeather.start
        }, eveningDate);
      } catch (err) {
        console.warn("Fout bij corridoranalyse:", err);
      }
    }

    const mScore = morningAnalysis ? morningAnalysis.score : morningScore.score;
    const eScore = eveningAnalysis ? eveningAnalysis.score : eveningScore.score;
    const mVerd = morningAnalysis ? morningAnalysis.verdict : morningScore.verdict;
    const eVerd = eveningAnalysis ? eveningAnalysis.verdict : eveningScore.verdict;
    const minScore = Math.min(mScore, eScore);

    const startName = routeState && routeState.start ? routeState.start.name : 'Start';
    const destName = routeState && routeState.dest ? routeState.dest.name : 'Bestemming';
    const midName = routeState && routeState.mid ? routeState.mid.name : 'Halverwege';

    const morningRainAmt = morningAnalysis ? morningAnalysis.maxRainOverall : (morningData ? morningData.totalPrecip : 0);
    const eveningRainAmt = eveningAnalysis ? eveningAnalysis.maxRainOverall : (eveningData ? eveningData.totalPrecip : 0);
    const isMorningWet = mVerd !== 'green' || morningRainAmt >= Config.THRESHOLDS.RAIN.LIGHT_MM;
    const isEveningWet = eVerd !== 'green' || eveningRainAmt >= Config.THRESHOLDS.RAIN.LIGHT_MM;

    let dayVerdict = "green";
    let dayPill = I18n.t.verdicts.greenBadge;
    let dayHeadline = "Groen licht: Heerlijk motorweer over jouw hele traject!";
    let dayExplanation = `Zowel de ochtend- als avondrit zijn droog en veilig tussen ${startName} en ${destName}.`;

    if (minScore < 50 || mVerd === 'red' || eVerd === 'red') {
      dayVerdict = "red";
      dayPill = I18n.t.verdicts.redBadge;
      dayHeadline = "Slecht weer op je route. Pak liever de auto of het ov.";
      dayExplanation = `Onveilige omstandigheden door regen of harde windstoten tussen ${startName} en ${destName}.`;
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
        dayHeadline = "Wisselvallig weer: kans op buien tijdens beide ritten.";
        dayExplanation = "Houd rekening met nat asfalt en verminderde grip zowel 's ochtends als 's avonds.";
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

    const gripPercent = maxRouteRain > 2.0 ? 55 : maxRouteRain > 0.3 ? 75 : 100;
    const gripStatus = gripPercent === 100 ? I18n.t.telemetry.optimal : gripPercent > 70 ? I18n.t.telemetry.damp : I18n.t.telemetry.slippery;

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
      gearPills: this.computeGearAdvice(minDayTemp, maxDayTemp, maxRouteRain),
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
    maxGusts: AppState.commute.maxGusts
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
