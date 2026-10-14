/**
 * Ride Or Die - Commute Advice Engine & Scoring Algorithm
 * Calculates motorcycle suitability index, safety penalties, and gear advice
 */

// Workday and Day-View Management
function getWorkdayConfig() {
  const now = new Date();
  
  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  
  const todayDateStr = formatYMD(now);
  
  // Calculate next workday:
  // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const currentDayOfWeek = now.getDay();
  let daysOffset = 1;
  if (currentDayOfWeek === 5) {
    daysOffset = 3; // Friday -> Monday
  } else if (currentDayOfWeek === 6) {
    daysOffset = 2; // Saturday -> Monday
  } else if (currentDayOfWeek === 0) {
    daysOffset = 1; // Sunday -> Monday
  } else {
    daysOffset = 1; // Mon-Thu -> Tomorrow
  }
  
  const nextWorkdayDate = new Date(now);
  nextWorkdayDate.setDate(now.getDate() + daysOffset);
  const nextWorkdayStr = formatYMD(nextWorkdayDate);
  
  const dayNamesNL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
  const dayNamesShortNL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const nextDayName = dayNamesNL[nextWorkdayDate.getDay()];
  const nextDayShort = dayNamesShortNL[nextWorkdayDate.getDay()];
  const isTomorrow = (daysOffset === 1);
  
  const buttonLabel = isTomorrow ? `Morgen (${nextDayShort})` : `Maandag (${nextDayShort})`;
  const fullLabel = isTomorrow ? `Morgen (${nextDayName})` : `Volgende werkdag (${nextDayName})`;
  
  return {
    today: {
      date: now,
      dateStr: todayDateStr,
      label: 'Vandaag',
      sublabel: 'Vandaag, live update'
    },
    nextWorkday: {
      date: nextWorkdayDate,
      dateStr: nextWorkdayStr,
      dayName: nextDayName,
      dayShort: nextDayShort,
      isTomorrow,
      buttonLabel,
      fullLabel
    }
  };
}

// Master Motorcycle Commute Algorithm (Supports Active Day: Vandaag of Volgende werkdag)
function computeCommuteAdvise(weatherData, targetDateStr = null) {
  const current = weatherData.current;
  const hourly = weatherData.hourly;
  const times = hourly.time;

  const workdayConfig = getWorkdayConfig();
  const isNextWorkday = AppState.selectedDay === 'nextWorkday';
  const activeDateStr = targetDateStr || (isNextWorkday ? workdayConfig.nextWorkday.dateStr : workdayConfig.today.dateStr);

  const morningHour = parseInt(AppState.commute.morningTime.split(':')[0], 10);
  const eveningHour = parseInt(AppState.commute.eveningTime.split(':')[0], 10);

  function getCommuteSlice(targetHour) {
    let indices = [];
    for (let i = 0; i < times.length; i++) {
      if (times[i].startsWith(activeDateStr)) {
        const h = parseInt(times[i].substring(11, 13), 10);
        if (Math.abs(h - targetHour) <= 1) {
          indices.push(i);
        }
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
      const t = hourly.temperature_2m[idx];
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

    const avgTemp = Math.round((maxTemp + minTemp) / 2);
    return {
      avgTemp,
      totalPrecip: parseFloat(totalPrecip.toFixed(1)),
      maxPrecipProb,
      maxGusts: Math.round(maxGusts),
      worstCode
    };
  }

  const morningData = getCommuteSlice(morningHour);
  const eveningData = getCommuteSlice(eveningHour);

  function scoreRide(slot) {
    let score = 100;
    let reasons = [];

    if (slot.totalPrecip > 3.0 || (slot.totalPrecip > 1.5 && slot.maxPrecipProb > 75)) {
      score -= 45;
      reasons.push("Stevige regenval verwacht (>3 mm)");
    } else if (slot.totalPrecip > 0.8 || (slot.totalPrecip > 0.3 && slot.maxPrecipProb > 60)) {
      score -= 25;
      reasons.push(`Kans op bui (${slot.totalPrecip} mm)`);
    } else if (slot.totalPrecip > 0.2) {
      score -= 15;
      reasons.push(`Lichte bui of motregen (${slot.totalPrecip} mm)`);
    } else if (slot.totalPrecip > 0.05) {
      score -= 5;
      reasons.push("Mogelijk enkel spatje neerslag (<0.2 mm)");
    } else if (slot.maxPrecipProb > 65) {
      // Hoofdzakelijk droog 0.0 mm, lichte regionale onzekerheid
      score -= 5;
      reasons.push(`Overwegend droog (0 mm, buienkans in regio ${slot.maxPrecipProb}%)`);
    }

    const userMaxGusts = (AppState.commute && AppState.commute.maxGusts) ? AppState.commute.maxGusts : 55;
    if (slot.maxGusts > 75) {
      score -= 50;
      reasons.push(`Gevaarlijke stormstoten (${slot.maxGusts} km/u)`);
    } else if (slot.maxGusts > userMaxGusts) {
      const over = slot.maxGusts - userMaxGusts;
      const penalty = over > 10 ? 35 : 20;
      score -= penalty;
      reasons.push(`Windstoten (${slot.maxGusts} km/u) boven jouw limiet (${userMaxGusts} km/u)`);
    } else if (slot.maxGusts > 50) {
      score -= 15;
      reasons.push(`Felle zijwind op bruggen/dijken (${slot.maxGusts} km/u)`);
    } else if (slot.maxGusts > 40) {
      score -= 5;
      reasons.push(`Merkbare wind op snelweg (${slot.maxGusts} km/u)`);
    }

    const userMinTemp = (AppState.commute && AppState.commute.minTemp !== undefined) ? AppState.commute.minTemp : 8;
    if (slot.avgTemp < 2) {
      score -= 60;
      reasons.push("Kans op gladheid / ijzel!");
    } else if (slot.avgTemp < userMinTemp) {
      score -= 20;
      reasons.push(`Koud (${slot.avgTemp}°C) - onder jouw minimum (${userMinTemp}°C)`);
    } else if (slot.avgTemp > 31) {
      score -= 20;
      reasons.push("Erg warm in motorpak (>30°C)");
    }

    if ([95, 96, 97, 99].includes(slot.worstCode)) {
      score -= 60;
      reasons.push("Onweer en hagel voorspeld");
    }

    score = Math.max(0, Math.min(100, score));

    let verdict = "green";
    let badgeText = "🟢 GOED";
    if (score < 50) {
      verdict = "red";
      badgeText = "🔴 PAS OP";
    } else if (score < 80) {
      verdict = "yellow";
      badgeText = "🟡 OPLETTEN";
    }

    return { score, verdict, badgeText, reasons };
  }

  const morningScore = scoreRide(morningData);
  const eveningScore = scoreRide(eveningData);

  let morningAnalysis = null;
  let eveningAnalysis = null;

  // If Route and Waypoint weather are available, evaluate the true 30-50 km corridor!
  if (typeof RouteEngine !== 'undefined' && AppState.route && AppState.route.waypointsWeather && AppState.route.waypointsWeather.start) {
    try {
      const morningDate = new Date(`${activeDateStr}T${AppState.commute.morningTime}:00`);
      const eveningDate = new Date(`${activeDateStr}T${AppState.commute.eveningTime}:00`);

      const forwardRouteState = {
        start: AppState.route.start,
        mid: AppState.route.mid,
        dest: AppState.route.dest,
        legDurationMinutes: AppState.route.legDurationMinutes || 20
      };

      const returnRouteState = {
        start: AppState.route.dest,
        mid: AppState.route.mid,
        dest: AppState.route.start,
        legDurationMinutes: AppState.route.legDurationMinutes || 20
      };

      const forwardWaypoints = {
        start: AppState.route.waypointsWeather.start,
        mid: AppState.route.waypointsWeather.mid,
        dest: AppState.route.waypointsWeather.dest
      };

      const returnWaypoints = {
        start: AppState.route.waypointsWeather.dest,
        mid: AppState.route.waypointsWeather.mid,
        dest: AppState.route.waypointsWeather.start
      };

      morningAnalysis = RouteEngine.evaluateRoute(forwardRouteState, forwardWaypoints, morningDate);
      eveningAnalysis = RouteEngine.evaluateRoute(returnRouteState, returnWaypoints, eveningDate);
    } catch (err) {
      console.warn("Fout bij traject-evaluatie in commute engine:", err);
    }
  }

  // Use route analysis if available, otherwise fallback to local slice
  const mScore = morningAnalysis ? morningAnalysis.score : morningScore.score;
  const eScore = eveningAnalysis ? eveningAnalysis.score : eveningScore.score;
  const minScore = Math.min(mScore, eScore);

  let dayVerdict = "green";
  const dayNameNL = isNextWorkday ? workdayConfig.nextWorkday.dayName.toLowerCase() : '';
  let dayHeadline = isNextWorkday
    ? `Groen licht voor ${dayNameNL}: Heerlijk weer over jouw hele traject!`
    : "Groen licht: Heerlijk motorweer over jouw hele traject!";
  let dayPill = "🏍️ RIDE ON!";
  let dayExplanation = isNextWorkday
    ? `Zowel de ochtend- als de avondrit op ${dayNameNL} zijn droog en veilig over het traject ${AppState.route.start.name} ➔ ${AppState.route.dest.name}.`
    : `Zowel de ochtend- als de avondrit zijn droog en veilig over het traject ${AppState.route.start.name} ➔ ${AppState.route.dest.name}.`;

  if (morningAnalysis && eveningAnalysis) {
    const startName = AppState.route.start.name;
    const midName = AppState.route.mid.name;
    const destName = AppState.route.dest.name;

    if (minScore < 50) {
      dayVerdict = "red";
      dayPill = "🚗 DIE HARD ONLY";
      dayHeadline = isNextWorkday
        ? `Koekblik Dag op ${dayNameNL}: Slecht weer op je route!`
        : `Koekblik Dag: Stevige regen of harde wind op je route!`;
      if (morningAnalysis.verdict === 'red' && eveningAnalysis.verdict === 'red') {
        dayExplanation = `Zowel heen (${startName} ➔ ${destName}) als terug (${destName} ➔ ${startName}) valt regen of zijn er gevaarlijke windstoten.`;
      } else if (morningAnalysis.verdict === 'red') {
        dayExplanation = `Ochtendrit (${startName} ➔ ${destName}): ${morningAnalysis.headline}. Terugrit is rustiger.`;
      } else {
        dayExplanation = `Avondrit (${destName} ➔ ${startName}): ${eveningAnalysis.headline}. Heenrit is rustiger.`;
      }
    } else if (minScore < 80) {
      dayVerdict = "yellow";
      dayPill = "⚠️ OPLETTEN";
      if (morningAnalysis.verdict === 'yellow' && eveningAnalysis.verdict === 'green') {
        dayHeadline = `⚠️ Let op bij heenrit: bui halverwege rond ${morningAnalysis.midWeather.timeStr}!`;
        dayExplanation = `Tussen ${startName} en ${destName} passeer je bij ${midName} een bui (${morningAnalysis.maxRainOverall} mm). De terugreis om ${AppState.commute.eveningTime} is 100% droog.`;
      } else if (eveningAnalysis.verdict === 'yellow' && morningAnalysis.verdict === 'green') {
        dayHeadline = `⚠️ Heenrit droog, maar let op bij de terugreis (${destName} ➔ ${startName})!`;
        dayExplanation = `Ochtendrit is 100% droog. Bij de terugrit rond ${eveningAnalysis.midWeather.timeStr} trekt een bui over bij ${midName} (${eveningAnalysis.maxRainOverall} mm).`;
      } else {
        dayHeadline = `Rijden kan, maar wees voorbereid op wisselvallig trajectweer`;
        dayExplanation = `Mogelijk spatje neerslag of merkbare zijwind op open stukken. Pas je snelheid aan.`;
      }
    } else {
      dayVerdict = "green";
      dayPill = "🟢 100% RIDE ON!";
      dayHeadline = `🟢 100% Droog asfalt & kalme wind over het hele traject!`;
      dayExplanation = `Zowel heen (${startName} ➔ ${destName}) als terug (${destName} ➔ ${startName}) blijven alle waypoints droog.`;
    }
  } else {
    // Fallback based on single-location slice
    if (minScore < 50) {
      dayVerdict = "red";
      dayHeadline = isNextWorkday ? `Koekblik Dag: Pak ${dayNameNL} liever de auto of OV!` : "Koekblik Dag: Pak liever de auto of OV!";
      dayPill = "🚗 DIE HARD ONLY";
      const allReasons = [...morningScore.reasons, ...eveningScore.reasons];
      dayExplanation = `Onveilige condities: ${[...new Set(allReasons)].join(". ") || "slecht weer voorspeld"}.`;
    } else if (minScore < 80) {
      dayVerdict = "yellow";
      dayHeadline = isNextWorkday ? `Rijden kan op ${dayNameNL}, maar let goed op!` : "Rijden kan, maar let goed op!";
      dayPill = "⚠️ OPLETTEN";
      const allReasons = [...morningScore.reasons, ...eveningScore.reasons];
      dayExplanation = `Rijden kan, wees voorbereid: ${[...new Set(allReasons)].join(", ") || "wisselvallig"}.`;
    }
  }

  const maxDayTemp = morningAnalysis && eveningAnalysis
    ? Math.max(morningAnalysis.destWeather.temp, eveningAnalysis.destWeather.temp)
    : Math.max(morningData.avgTemp, eveningData.avgTemp);

  const minDayTemp = morningAnalysis && eveningAnalysis
    ? Math.min(morningAnalysis.startWeather.temp, eveningAnalysis.startWeather.temp)
    : Math.min(morningData.avgTemp, eveningData.avgTemp);

  let gearPills = [];

  if (minDayTemp < 7) {
    gearPills.push("🧤 Winterhandschoenen");
    gearPills.push("🧥 Thermovoering & Kol");
  } else if (minDayTemp < 15) {
    gearPills.push("🧥 Textieljas met tussenlaag");
    gearPills.push("🧤 Middenhandschoenen");
  } else if (maxDayTemp > 24) {
    gearPills.push("🧥 Doorwaaijas / Leer");
    gearPills.push("🧤 Zomerhandschoenen");
    gearPills.push("🕶️ Zonnevizier");
  } else {
    gearPills.push("🧥 Allround Leer/Textiel");
    gearPills.push("🧤 All-season handschoenen");
  }

  const maxRouteRain = morningAnalysis && eveningAnalysis
    ? Math.max(morningAnalysis.maxRainOverall, eveningAnalysis.maxRainOverall)
    : Math.max(morningData.totalPrecip, eveningData.totalPrecip);

  if (maxRouteRain > 0.2) {
    gearPills.push("🌧️ Regenpak & Pinlock Vizier");
  } else {
    gearPills.push("✨ Droog vizier / Geen regenpak");
  }

  // Traject Telemetry consolidation
  const maxRouteGusts = morningAnalysis && eveningAnalysis
    ? Math.max(morningAnalysis.maxGustsOverall, eveningAnalysis.maxGustsOverall)
    : Math.max(morningData.maxGusts, eveningData.maxGusts);

  const gripPercent = maxRouteRain > 2.0 ? 55 : maxRouteRain > 0.3 ? 75 : 100;
  const gripStatus = gripPercent === 100 ? "Optimaal droog" : gripPercent > 70 ? "Vochtig asfalt" : "Glad / Nat";

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
    gearPills,
    isNextWorkday,
    activeDateStr,
    workdayConfig
  };
}
