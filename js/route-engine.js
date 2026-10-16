/**
 * Ride Or Die - Routecorridor & Meerpuntsweer-Engine (Pure Calculation Engine)
 * Berekent de automatische routecorridor (30-50 km), toetst neerslagprogressie
 * in stappen van 15/30 minuten en berekent alternatieve vertrektijden.
 */

const RouteEngine = {
  /**
   * Berekent de afstand in kilometers tussen twee gps-coördinaten via de Haversine-formule.
   */
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Aardstraal in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Automatische corridorberekening:
   * Bepaalt op basis van start en bestemming de dichtstbijzijnde logische tussenstop,
   * de geschatte wegafstand en reistijd per etappe (~20 min per deel).
   */
  calculateCorridor(start, dest, forcedDuration = null) {
    if (!start || !dest) return null;

    const straightKm = this.calculateDistanceKm(start.lat, start.lon, dest.lat, dest.lon);
    // Factor 1,25 voor het Nederlandse snelweg- en provinciale wegennet
    const roadKm = Math.max(6, Math.round(straightKm * 1.25));

    const midLat = (start.lat + dest.lat) / 2;
    const midLon = (start.lon + dest.lon) / 2;

    let closestCity = null;
    let minCityDist = Infinity;

    const startNameLower = (start.name || '').toLowerCase();
    const destNameLower = (dest.name || '').toLowerCase();
    const presetCities = Config.PRESET_CITIES || [];

    presetCities.forEach(city => {
      const cNameLower = city.name.toLowerCase();
      if (cNameLower === startNameLower || cNameLower === destNameLower) return;

      const d = this.calculateDistanceKm(midLat, midLon, city.lat, city.lon);
      if (d < minCityDist) {
        minCityDist = d;
        closestCity = city;
      }
    });

    let mid = null;
    if (closestCity && minCityDist <= 20) {
      mid = {
        name: closestCity.name,
        lat: closestCity.lat,
        lon: closestCity.lon,
        country: 'NL'
      };
    } else {
      mid = {
        name: `Halverwege (${Math.round(roadKm / 2)} km)`,
        lat: parseFloat(midLat.toFixed(4)),
        lon: parseFloat(midLon.toFixed(4)),
        country: 'NL'
      };
    }

    let legDurationMinutes = forcedDuration;
    if (!legDurationMinutes) {
      // Gemiddelde reissnelheid motor ~60-70 km/u inclusief op- en afritten
      legDurationMinutes = Math.max(12, Math.min(45, Math.round((roadKm / 2) / 1.05)));
    }

    return {
      start,
      mid,
      dest,
      roadKm,
      legDurationMinutes,
      totalMinutes: legDurationMinutes * 2
    };
  },

  /**
   * Synchroniseert een routetoestand met de berekende corridor.
   */
  syncRouteState(start, dest, forcedDuration = null) {
    const corridor = this.calculateCorridor(start, dest, forcedDuration);
    if (!corridor) return null;

    if (typeof State !== 'undefined' && State.state && State.state.route) {
      State.state.route.start = corridor.start;
      State.state.route.mid = corridor.mid;
      State.state.route.dest = corridor.dest;
      State.state.route.legDurationMinutes = corridor.legDurationMinutes;
      State.state.route.roadKm = corridor.roadKm;
      State.save();
    }
    return corridor;
  },

  /**
   * Extraheert het puntweer op een specifiek tijdstip.
   * Prioriteert minutely_15 (15-minutenresolutie) met automatische terugval op hourly.
   */
  extractWaypointWeatherAtTime(weatherData, targetDate) {
    if (!weatherData) return null;

    const minutely = weatherData.minutely_15;
    const hourly = weatherData.hourly;
    const current = weatherData.current;
    const targetMs = targetDate.getTime();

    // 1. Minutely_15 voor nauwkeurige buiendetectie
    if (minutely && minutely.time && minutely.time.length > 0) {
      let closestIdx = -1;
      let minDiff = Infinity;

      for (let i = 0; i < minutely.time.length; i++) {
        const stepMs = new Date(minutely.time[i]).getTime();
        const diff = Math.abs(stepMs - targetMs);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      if (closestIdx >= 0 && minDiff <= 25 * 60 * 1000) {
        const code = minutely.weather_code[closestIdx] || 0;
        const wmoInfo = I18n.weatherCodes[code] || { text: 'Helder', icon: 'sun', state: 'sunny' };
        const hour = targetDate.getHours();
        const isNight = hour < 6 || hour > 21;

        return {
          source: 'minutely_15',
          timeStr: I18n.formatters.time(targetDate),
          isoTime: minutely.time[closestIdx],
          timestamp: targetMs,
          temp: Math.round(minutely.temperature_2m[closestIdx]),
          precip: parseFloat((minutely.precipitation[closestIdx] || 0).toFixed(1)),
          precipProb: hourly && hourly.precipitation_probability ? (hourly.precipitation_probability[Math.floor(closestIdx / 4)] || 0) : 0,
          windSpeed: Math.round(minutely.wind_speed_10m[closestIdx] || 0),
          windGusts: Math.round(minutely.wind_gusts_10m[closestIdx] || 0),
          weatherCode: code,
          condition: wmoInfo.text,
          iconType: wmoInfo.icon,
          state: wmoInfo.state,
          isNight
        };
      }
    }

    // 2. Terugval op uurbasis
    if (hourly && hourly.time && hourly.time.length > 0) {
      let closestIdx = -1;
      let minDiff = Infinity;

      for (let i = 0; i < hourly.time.length; i++) {
        const stepMs = new Date(hourly.time[i]).getTime();
        const diff = Math.abs(stepMs - targetMs);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      if (closestIdx >= 0) {
        const code = hourly.weather_code[closestIdx] || 0;
        const wmoInfo = I18n.weatherCodes[code] || { text: 'Helder', icon: 'sun', state: 'sunny' };
        const hour = targetDate.getHours();
        const isNight = hour < 6 || hour > 21;

        return {
          source: 'hourly',
          timeStr: I18n.formatters.time(targetDate),
          isoTime: hourly.time[closestIdx],
          timestamp: targetMs,
          temp: Math.round(hourly.temperature_2m[closestIdx]),
          precip: parseFloat((hourly.precipitation[closestIdx] || 0).toFixed(1)),
          precipProb: hourly.precipitation_probability ? (hourly.precipitation_probability[closestIdx] || 0) : 0,
          windSpeed: Math.round(hourly.wind_speed_10m[closestIdx] || 0),
          windGusts: Math.round(hourly.wind_gusts_10m[closestIdx] || 0),
          weatherCode: code,
          condition: wmoInfo.text,
          iconType: wmoInfo.icon,
          state: wmoInfo.state,
          isNight
        };
      }
    }

    // 3. Terugval op actuele waarneming
    if (current) {
      const code = current.weather_code || 0;
      const wmoInfo = I18n.weatherCodes[code] || { text: 'Helder', icon: 'sun', state: 'sunny' };
      return {
        source: 'current',
        timeStr: I18n.formatters.time(targetDate),
        isoTime: current.time || '',
        timestamp: targetMs,
        temp: Math.round(current.temperature_2m || 15),
        precip: parseFloat((current.precipitation || 0).toFixed(1)),
        precipProb: 0,
        windSpeed: Math.round(current.wind_speed_10m || 0),
        windGusts: Math.round(current.wind_gusts_10m || 0),
        weatherCode: code,
        condition: wmoInfo.text,
        iconType: wmoInfo.icon,
        state: wmoInfo.state,
        isNight: current.is_day === 0
      };
    }

    return null;
  },

  /**
   * Controleert tussenliggende tijdstappen tussen twee routepunten.
   */
  scanLegInterval(weatherDataFrom, weatherDataTo, startMs, endMs) {
    let maxPrecip = 0;
    let maxGusts = 0;
    let worstCode = 0;

    const check = (data) => {
      if (!data || !data.minutely_15 || !data.minutely_15.time) return;
      const m = data.minutely_15;
      for (let i = 0; i < m.time.length; i++) {
        const stepMs = new Date(m.time[i]).getTime();
        if (stepMs >= startMs && stepMs <= endMs) {
          const p = m.precipitation[i] || 0;
          if (p > maxPrecip) maxPrecip = p;
          const g = m.wind_gusts_10m[i] || 0;
          if (g > maxGusts) maxGusts = g;
          const c = m.weather_code[i] || 0;
          if (c > worstCode) worstCode = c;
        }
      }
    };

    check(weatherDataFrom);
    check(weatherDataTo);

    return {
      maxPrecip: parseFloat(maxPrecip.toFixed(1)),
      maxGusts: Math.round(maxGusts),
      worstCode
    };
  },

  /**
   * Evalueert de gehele 3-puntsroute voor een gekozen vertrektijd.
   */
  evaluateRoute(routeState, waypointsWeather, departureDate, userPreferences = {}) {
    if (!routeState || !waypointsWeather) return null;

    const legMinutes = routeState.legDurationMinutes || 20;
    const legMs = legMinutes * 60 * 1000;

    const startMs = departureDate.getTime();
    const midMs = startMs + legMs;
    const destMs = midMs + legMs;

    const startDate = new Date(startMs);
    const midDate = new Date(midMs);
    const destDate = new Date(destMs);

    const startWeather = this.extractWaypointWeatherAtTime(waypointsWeather.start, startDate);
    const midWeather = this.extractWaypointWeatherAtTime(waypointsWeather.mid, midDate);
    const destWeather = this.extractWaypointWeatherAtTime(waypointsWeather.dest, destDate);

    if (!startWeather || !midWeather || !destWeather) return null;

    const leg1 = this.scanLegInterval(waypointsWeather.start, waypointsWeather.mid, startMs, midMs);
    const leg2 = this.scanLegInterval(waypointsWeather.mid, waypointsWeather.dest, midMs, destMs);

    const R_THRESH = Config.THRESHOLDS.RAIN.LIGHT_MM;
    const startHasRain = startWeather.precip >= R_THRESH;
    const midHasRain = midWeather.precip >= R_THRESH || leg1.maxPrecip >= R_THRESH;
    const destHasRain = destWeather.precip >= R_THRESH || leg2.maxPrecip >= R_THRESH;

    const maxRainOverall = Math.max(startWeather.precip, midWeather.precip, destWeather.precip, leg1.maxPrecip, leg2.maxPrecip);
    const maxGustsOverall = Math.max(startWeather.windGusts, midWeather.windGusts, destWeather.windGusts, leg1.maxGusts, leg2.maxGusts);

    const userMaxGusts = (userPreferences && userPreferences.maxGusts !== undefined)
      ? userPreferences.maxGusts
      : ((typeof State !== 'undefined' && State.state && State.state.commute)
        ? State.state.commute.maxGusts
        : Config.THRESHOLDS.WIND.DEFAULT_MAX_GUSTS);

    const userMinTemp = (userPreferences && userPreferences.minTemp !== undefined)
      ? userPreferences.minTemp
      : ((typeof State !== 'undefined' && State.state && State.state.commute)
        ? State.state.commute.minTemp
        : Config.THRESHOLDS.TEMPERATURE.DEFAULT_MIN);

    const avoidRain = (userPreferences && userPreferences.avoidRain !== undefined)
      ? !!userPreferences.avoidRain
      : ((typeof State !== 'undefined' && State.state && State.state.commute)
        ? !!State.state.commute.avoidRain
        : false);

    const startName = routeState.start.name;
    const midName = routeState.mid.name;
    const destName = routeState.dest.name;

    let scenario = 'FULLY_DRY';
    let verdict = 'green';
    let badgeText = I18n.t.verdicts.dryRoute;
    let headline = '';
    let explanation = '';
    let adviceTip = '';

    if (!startHasRain && (midHasRain || destHasRain)) {
      scenario = 'RIDING_INTO_RAIN';
      if (avoidRain) {
        verdict = maxRainOverall >= Config.THRESHOLDS.RAIN.LIGHT_MM ? 'red' : 'yellow';
      } else {
        verdict = maxRainOverall >= 3.5 ? 'red' : 'yellow';
      }
      badgeText = verdict === 'red' ? I18n.t.verdicts.rainEnRoute : I18n.t.verdicts.rideIntoRain;

      const firstRainPoint = midHasRain ? midName : destName;
      const firstRainTime = midHasRain ? midWeather.timeStr : destWeather.timeStr;
      const rainAmount = midHasRain ? Math.max(midWeather.precip, leg1.maxPrecip) : Math.max(destWeather.precip, leg2.maxPrecip);

      headline = `Let op: Je vertrekt droog in ${startName}, maar rond ${firstRainTime} uur rijd je een bui tegemoet bij ${firstRainPoint}.`;
      explanation = `Bij vertrek is het nog droog. Tussen ${startWeather.timeStr} en ${firstRainTime} uur trekt er neerslag over (${I18n.formatters.millimeters(rainAmount)}).`;
      adviceTip = avoidRain
        ? "Verschuif je vertrektijd om de bui te ontwijken of pak de auto."
        : "Houd rekening met nat wegdek halverwege je rit en neem regenkleding mee.";
    } else if (startHasRain && !midHasRain && !destHasRain) {
      scenario = 'CLEARING_UP';
      verdict = avoidRain ? 'red' : 'yellow';
      badgeText = I18n.t.verdicts.clearingUp;
      headline = `Start met regen in ${startName}, maar droog asfalt vanaf ${midName}.`;
      explanation = `Trek bij vertrek direct je regenkleding aan. Na circa ${legMinutes} minuten rijden klaart het op.`;
      adviceTip = avoidRain
        ? "Even later vertrekken voorkomt een nat begin van je rit."
        : "Trek je regenpak bij vertrek aan; na circa 15-20 minuten ben je de bui voorbij.";
    } else if (startHasRain && (midHasRain || destHasRain)) {
      scenario = 'RAIN_THROUGHOUT';
      if (avoidRain) {
        verdict = 'red';
        badgeText = I18n.t.verdicts.rainThroughout;
        headline = `Regen tijdens de hele motorrit van ${startName} naar ${destName}.`;
        explanation = `Zowel bij vertrek als onderweg valt neerslag (piek ${I18n.formatters.millimeters(maxRainOverall)}). Omdat je liever droog rijdt: pak de auto of het ov.`;
        adviceTip = "Draag een waterdicht regenpak en een pinlock-vizier of stel de rit uit.";
      } else {
        verdict = maxRainOverall > 3.5 ? 'red' : 'yellow';
        badgeText = verdict === 'red' ? I18n.t.verdicts.rainThroughout : (I18n.t.verdicts.rainThroughoutWet || '🟡 NATTE RIT (REGENPAK)');
        headline = verdict === 'red'
          ? `Gevaarlijk zware regenval op het traject van ${startName} naar ${destName}.`
          : `Regen tijdens de motorrit van ${startName} naar ${destName}. Prima te rijden met motorkleding!`;
        explanation = `Zowel bij vertrek als onderweg valt neerslag (piek ${I18n.formatters.millimeters(maxRainOverall)}). Wegdek is nat, pas je volgafstand aan.`;
        adviceTip = "Trek je waterdichte regenpak en pinlock-vizier aan en houd voldoende afstand.";
      }
    } else {
      scenario = 'FULLY_DRY';
      verdict = 'green';
      badgeText = I18n.t.verdicts.dryRoute;
      headline = `Volledig droge motorrit van ${startName} naar ${destName}.`;
      explanation = `Geen neerslag verwacht bij vertrek (${startWeather.timeStr} uur), onderweg noch bij aankomst.`;
      adviceTip = "Uitstekende omstandigheden voor je rit.";
    }

    if (maxGustsOverall > userMaxGusts) {
      explanation += ` Let op voor zijwindstoten tot ${I18n.formatters.kmh(maxGustsOverall)} boven jouw limiet.`;
      if (verdict === 'green') {
        verdict = 'yellow';
        badgeText = I18n.t.verdicts.sideWindAlert;
      }
    }

    let score = 100;
    const deductions = [];
    let hasInstantNoGo = false;

    // Neerslagbeoordeling op basis van rijderstype (Droogrijder vs All-weather)
    if (avoidRain) {
      // Strikte droogrijder modus
      if (maxRainOverall > 3.5) {
        score -= 60;
        hasInstantNoGo = true;
        deductions.push({ category: 'rain', icon: '🌧️', points: -60, isInstantNoGo: true, title: 'Instant No-Go: Wolkbreuk / Stortregen', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)}. Zicht nihil en aquaplaning!` });
      } else if (maxRainOverall > 2.0) {
        score -= 50;
        deductions.push({ category: 'rain', icon: '🌧️', points: -50, title: 'Stevige regenval (Droogrijder)', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)}. Je wilt liever droog blijven.` });
      } else if (maxRainOverall > 0.8) {
        score -= 38;
        deductions.push({ category: 'rain', icon: '🌦️', points: -38, title: 'Matige regenbui op route', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)} neerslag` });
      } else if (maxRainOverall > 0.15) {
        score -= 28;
        deductions.push({ category: 'rain', icon: '🌦️', points: -28, title: 'Bui op de route', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)} neerslag` });
      } else if (maxRainOverall > 0.05) {
        score -= 10;
        deductions.push({ category: 'rain', icon: '💧', points: -10, title: 'Enkel spatje op route', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)}` });
      }
    } else {
      // All-weather / Regen accepteren (milde aftrek bij gewone buien)
      if (maxRainOverall > 3.5) {
        score -= 50;
        hasInstantNoGo = true;
        deductions.push({ category: 'rain', icon: '🌧️', points: -50, isInstantNoGo: true, title: 'Instant No-Go: Wolkbreuk / Stortregen', desc: `Gevaarlijk zware regenval (${I18n.formatters.millimeters(maxRainOverall)}). Zicht nihil en aquaplaning!` });
      } else if (maxRainOverall > 2.0) {
        score -= 30;
        deductions.push({ category: 'rain', icon: '🌧️', points: -30, title: 'Stevige regenbui', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)}. Verlaag snelheid en houd afstand.` });
      } else if (maxRainOverall > 0.8) {
        score -= 20;
        deductions.push({ category: 'rain', icon: '🌦️', points: -20, title: 'Regenbui op route', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)}. Goed te doen met regenpak & pinlock.` });
      } else if (maxRainOverall > 0.15) {
        score -= 12;
        deductions.push({ category: 'rain', icon: '🌦️', points: -12, title: 'Lichte bui / motregen', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)}. Prima te rijden met motorkleding.` });
      } else if (maxRainOverall > 0.05) {
        score -= 5;
        deductions.push({ category: 'rain', icon: '💧', points: -5, title: 'Enkel spatje op route', desc: `Piek van ${I18n.formatters.millimeters(maxRainOverall)} (wegdek droogt snel).` });
      }
    }

    // Windstoten & Instant No-Go voor storm
    if (maxGustsOverall > Config.THRESHOLDS.WIND.DANGEROUS_GUSTS) {
      score -= 55;
      hasInstantNoGo = true;
      verdict = 'red';
      deductions.push({ category: 'wind', icon: '🌪️', points: -55, isInstantNoGo: true, title: 'Instant No-Go: Gevaarlijke stormstoten', desc: `Tot ${I18n.formatters.kmh(maxGustsOverall)} over traject (boven 75 km/u). Hoog val- en omwaairisico!` });
    } else if (maxGustsOverall > userMaxGusts) {
      const p = (maxGustsOverall - userMaxGusts) > 10 ? 30 : 20;
      score -= p;
      deductions.push({ category: 'wind', icon: '💨', points: -p, title: 'Boven jouw windlimiet', desc: `${I18n.formatters.kmh(maxGustsOverall)} (limiet: ${I18n.formatters.kmh(userMaxGusts)})` });
    } else if (maxGustsOverall > 50) {
      score -= 12;
      deductions.push({ category: 'wind', icon: '💨', points: -12, title: 'Felle zijwind', desc: `${I18n.formatters.kmh(maxGustsOverall)} op open stukken` });
    } else if (maxGustsOverall > 40) {
      score -= 5;
      deductions.push({ category: 'wind', icon: '💨', points: -5, title: 'Merkbare snelwegwind', desc: `${I18n.formatters.kmh(maxGustsOverall)} stoten` });
    }

    // Temperatuur & Instant No-Go voor ijzel/sneeuw/gladheid
    const minTemp = Math.min(startWeather.temp, midWeather.temp, destWeather.temp);
    if (minTemp < Config.THRESHOLDS.TEMPERATURE.ICE_RISK) {
      score -= 60;
      hasInstantNoGo = true;
      verdict = 'red';
      deductions.push({ category: 'temp', icon: '❄️', points: -60, isInstantNoGo: true, title: 'Instant No-Go: Kans op gladheid / ijzel', desc: `Minimumtemperatuur ${I18n.formatters.celsius(minTemp)}. Asfalt kan bevriezen!` });
    } else if (minTemp < userMinTemp) {
      score -= 20;
      deductions.push({ category: 'temp', icon: '🧣', points: -20, title: 'Onder jouw minimumtemperatuur', desc: `Minimumtemperatuur ${I18n.formatters.celsius(minTemp)} (jouw limiet: ${I18n.formatters.celsius(userMinTemp)})` });
    } else if (minTemp < 8) {
      score -= 10;
      deductions.push({ category: 'temp', icon: '🧣', points: -10, title: 'Frisse temperatuur', desc: `Minimumtemperatuur ${I18n.formatters.celsius(minTemp)}` });
    }

    // Veiligheidskoppeling: een gele of rode rit kan nooit een te hoge score behouden
    if (hasInstantNoGo) {
      verdict = 'red';
      score = Math.min(score, 35);
    } else if (verdict === 'red') {
      score = Math.min(score, 45);
    } else if (verdict === 'yellow') {
      score = Math.min(score, 78);
    }

    score = Math.max(10, Math.min(100, score));

    return {
      departureDate,
      startDate,
      midDate,
      destDate,
      legMinutes,
      startWeather,
      midWeather,
      destWeather,
      leg1,
      leg2,
      maxRainOverall,
      maxGustsOverall,
      scenario,
      verdict,
      badgeText,
      headline,
      explanation,
      adviceTip,
      score,
      deductions,
      hasInstantNoGo
    };
  },

  /**
   * Berekent alternatieve vertrektijdvakken om buien te ontwijken.
   */
  computeDepartureAlternatives(routeState, waypointsWeather, baseDepartureDate, userPreferences = {}) {
    const offsetsMinutes = [-30, -15, 0, 15, 30, 45, 60, 90];
    const results = [];

    offsetsMinutes.forEach(offset => {
      const depDate = new Date(baseDepartureDate.getTime() + offset * 60 * 1000);
      const evalRes = this.evaluateRoute(routeState, waypointsWeather, depDate, userPreferences);
      if (evalRes) {
        results.push({
          offsetMinutes: offset,
          departureTimeStr: I18n.formatters.time(depDate),
          depDate,
          verdict: evalRes.verdict,
          scenario: evalRes.scenario,
          score: evalRes.score,
          maxRain: evalRes.maxRainOverall,
          isCurrent: offset === 0,
          label: offset === 0 ? 'Gekozen' : offset > 0 ? `+${offset} min` : `${offset} min`
        });
      }
    });

    const drySlots = results.filter(r => r.maxRain < 0.1 && r.score >= 80);
    return {
      slots: results,
      bestAlternative: drySlots.length > 0 ? drySlots[0] : null
    };
  }
};

if (typeof window !== 'undefined') window.RouteEngine = RouteEngine;
if (typeof module !== 'undefined') module.exports = RouteEngine;
