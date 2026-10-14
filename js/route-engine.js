/**
 * Ride Or Die - Route Planning & Multi-Waypoint Weather Engine
 * Analyzes motorcycle journeys with Start, Midway, and Destination waypoints
 * in configurable 30-minute time intervals to detect rain progression
 * ("Blijft het droog of rijd je naar een bui toe?")
 */

const RouteEngine = {
  /**
   * Calculates Haversine distance in kilometers between two geo-coordinates
   */
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * 100% Automated Route Corridor Engine
   * User only gives Start and Dest; app automatically calculates midway checkpoint,
   * highway road distance, and travel duration (~20m per leg).
   */
  calculateCorridor(start, dest, forcedDuration = null) {
    if (!start || !dest) return null;

    const straightKm = this.calculateDistanceKm(start.lat, start.lon, dest.lat, dest.lon);
    // Real-world Dutch motorway/provincial winding factor ~1.25x
    const roadKm = Math.max(6, Math.round(straightKm * 1.25));

    // Midpoint coordinates
    const midLat = (start.lat + dest.lat) / 2;
    const midLon = (start.lon + dest.lon) / 2;

    // Automatically find closest named Dutch town from PRESET_CITIES
    let closestCity = null;
    let minCityDist = Infinity;

    const startNameLower = (start.name || '').toLowerCase();
    const destNameLower = (dest.name || '').toLowerCase();

    if (typeof PRESET_CITIES !== 'undefined' && Array.isArray(PRESET_CITIES)) {
      PRESET_CITIES.forEach(city => {
        const cNameLower = city.name.toLowerCase();
        if (cNameLower === startNameLower || cNameLower === destNameLower) return;

        const d = this.calculateDistanceKm(midLat, midLon, city.lat, city.lon);
        if (d < minCityDist) {
          minCityDist = d;
          closestCity = city;
        }
      });
    }

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

    // Estimate leg duration for 30-50 km motorcycle trip (~60-70 km/h average)
    let legDurationMinutes = forcedDuration;
    if (!legDurationMinutes) {
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
   * Synchronizes AppState.route with the automated corridor
   */
  syncRouteState(start, dest, forcedDuration = null) {
    const corridor = this.calculateCorridor(start, dest, forcedDuration);
    if (!corridor) return null;

    AppState.route.start = corridor.start;
    AppState.route.mid = corridor.mid;
    AppState.route.dest = corridor.dest;
    AppState.route.legDurationMinutes = corridor.legDurationMinutes;
    AppState.route.roadKm = corridor.roadKm;

    if (typeof saveState === 'function') {
      saveState();
    }
    return corridor;
  },

  /**
   * Formats a Date object to local HH:mm string
   */
  formatTime(date) {
    if (!date) return '--:--';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  /**
   * Formats a Date object to YYYY-MM-DDTHH:mm string matching Open-Meteo time format
   */
  formatIsoTimeKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  },

  /**
   * Extracts point-in-time weather for a specific timestamp from Open-Meteo data
   * Prioritizes high-resolution minutely_15 data (15-min intervals) with hourly fallback
   */
  extractWaypointWeatherAtTime(weatherData, targetDate) {
    if (!weatherData) return null;

    const minutely = weatherData.minutely_15;
    const hourly = weatherData.hourly;
    const current = weatherData.current;
    const targetMs = targetDate.getTime();

    // 1. Try minutely_15 first for high-precision 15/30-minute intervals
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

      // If within 25 minutes of a 15-min step, use minutely_15
      if (closestIdx >= 0 && minDiff <= 25 * 60 * 1000) {
        const code = minutely.weather_code[closestIdx] || 0;
        const wmoInfo = (typeof WMO_DICT !== 'undefined' && WMO_DICT[code]) ? WMO_DICT[code] : { text: 'Helder', icon: 'sun', state: 'sunny' };
        const hour = targetDate.getHours();
        const isNight = hour < 6 || hour > 21;

        return {
          source: 'minutely_15',
          timeStr: this.formatTime(targetDate),
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

    // 2. Fallback to hourly data if minutely is unavailable or out of range
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
        const wmoInfo = (typeof WMO_DICT !== 'undefined' && WMO_DICT[code]) ? WMO_DICT[code] : { text: 'Helder', icon: 'sun', state: 'sunny' };
        const hour = targetDate.getHours();
        const isNight = hour < 6 || hour > 21;

        return {
          source: 'hourly',
          timeStr: this.formatTime(targetDate),
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

    // 3. Fallback to current weather if available
    if (current) {
      const code = current.weather_code || 0;
      const wmoInfo = (typeof WMO_DICT !== 'undefined' && WMO_DICT[code]) ? WMO_DICT[code] : { text: 'Helder', icon: 'sun', state: 'sunny' };
      return {
        source: 'current',
        timeStr: this.formatTime(targetDate),
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
   * Scans intermediate 15-minute intervals between two waypoints
   * to detect showers moving over the highway between stops
   */
  scanLegInterval(weatherDataFrom, weatherDataTo, startMs, endMs) {
    let maxPrecip = 0;
    let maxGusts = 0;
    let worstCode = 0;

    const checkDataset = (data) => {
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

    checkDataset(weatherDataFrom);
    checkDataset(weatherDataTo);

    return {
      maxPrecip: parseFloat(maxPrecip.toFixed(1)),
      maxGusts: Math.round(maxGusts),
      worstCode
    };
  },

  /**
   * Evaluates the entire 3-waypoint route for a specific departure time
   */
  evaluateRoute(routeState, waypointsWeather, departureDate) {
    const legMinutes = routeState.legDurationMinutes || 30;
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

    if (!startWeather || !midWeather || !destWeather) {
      return null;
    }

    const leg1 = this.scanLegInterval(waypointsWeather.start, waypointsWeather.mid, startMs, midMs);
    const leg2 = this.scanLegInterval(waypointsWeather.mid, waypointsWeather.dest, midMs, destMs);

    // Rain thresholds
    const RAIN_THRESHOLD = 0.15; // mm in 15/30 min
    const HEAVY_RAIN_THRESHOLD = 1.0; // mm

    const startHasRain = startWeather.precip >= RAIN_THRESHOLD;
    const midHasRain = midWeather.precip >= RAIN_THRESHOLD || leg1.maxPrecip >= RAIN_THRESHOLD;
    const destHasRain = destWeather.precip >= RAIN_THRESHOLD || leg2.maxPrecip >= RAIN_THRESHOLD;

    const maxRainOverall = Math.max(
      startWeather.precip,
      midWeather.precip,
      destWeather.precip,
      leg1.maxPrecip,
      leg2.maxPrecip
    );

    const maxGustsOverall = Math.max(
      startWeather.windGusts,
      midWeather.windGusts,
      destWeather.windGusts,
      leg1.maxGusts,
      leg2.maxGusts
    );

    const userMaxGusts = (typeof AppState !== 'undefined' && AppState.commute && AppState.commute.maxGusts) ? AppState.commute.maxGusts : 55;

    // Determine the Core Scenario
    let scenario = 'FULLY_DRY';
    let verdict = 'green';
    let badgeText = '🟢 100% DROOG';
    let headline = '';
    let explanation = '';
    let adviceTip = '';

    const startName = routeState.start.name;
    const midName = routeState.mid.name;
    const destName = routeState.dest.name;

    if (!startHasRain && (midHasRain || destHasRain)) {
      // SCENARIO 1: Riding into a rain shower! (De kernelement gevraagd door de gebruiker)
      scenario = 'RIDING_INTO_RAIN';
      verdict = maxRainOverall >= HEAVY_RAIN_THRESHOLD ? 'red' : 'yellow';
      badgeText = verdict === 'red' ? '🔴 PAS OP: BUI ONDERWEG' : '🟡 NAAR BUI TOE';

      const firstRainPoint = midHasRain ? midName : destName;
      const firstRainTime = midHasRain ? midWeather.timeStr : destWeather.timeStr;
      const rainAmount = midHasRain ? Math.max(midWeather.precip, leg1.maxPrecip) : Math.max(destWeather.precip, leg2.maxPrecip);

      headline = `⚠️ Let op: Je vertrekt droog in ${startName}, maar rond ${firstRainTime} rijd je een bui tegemoet bij ${firstRainPoint}!`;
      explanation = `Op je startpunt blijft het nog droog (0.0 mm), maar tussen ${startWeather.timeStr} en ${firstRainTime} trekt er neerslag over het traject (${rainAmount.toFixed(1)} mm regen verwacht).`;
      adviceTip = `💡 Tip: Verschuif je vertrektijd hieronder met 15 of 30 minuten om te zien of de bui dan al voorbijgetrokken is.`;
    } else if (startHasRain && !midHasRain && !destHasRain) {
      // SCENARIO 2: Starts wet, clears up en route
      scenario = 'CLEARING_UP';
      verdict = 'yellow';
      badgeText = '🟡 KLAART OP ONDERWEG';
      headline = `🌧️ ➔ ⛅ Start met regen bij ${startName}, maar droog asfalt vanaf ${midName}!`;
      explanation = `Trek bij vertrek (${startWeather.timeStr}) alvast je regenkleding aan. Na circa ${legMinutes} min rijd je de bui uit en arriveer je droog in ${destName}.`;
      adviceTip = `💡 Tip: Als je ${legMinutes} minuten later vertrekt, is de bui bij ${startName} mogelijk al gepasseerd.`;
    } else if (startHasRain && (midHasRain || destHasRain)) {
      // SCENARIO 3: Wet throughout the entire route
      scenario = 'RAIN_THROUGHOUT';
      verdict = 'red';
      badgeText = '🔴 REGEN OVER HELE ROUTE';
      headline = `🌧️ Aanhoudende regen over het hele traject van ${startName} naar ${destName}`;
      explanation = `Zowel bij vertrek (${startWeather.precip} mm), halverwege (${midWeather.precip} mm) als op je bestemming (${destWeather.precip} mm) valt neerslag. Max neerslagpiek: ${maxRainOverall.toFixed(1)} mm.`;
      adviceTip = `⚠️ Waterdicht motorpak en pinlock vizier vereist, of overweeg de rit uit te stellen.`;
    } else {
      // SCENARIO 4: Fully dry
      scenario = 'FULLY_DRY';
      verdict = 'green';
      badgeText = '🟢 100% DROGE ROUTE';
      headline = `🟢 Groen licht: Volledig droog traject van ${startName} naar ${destName}!`;
      explanation = `Ideale condities: noch bij vertrek (${startWeather.timeStr}), halverwege (${midWeather.timeStr}) noch op de bestemming (${destWeather.timeStr}) wordt neerslag verwacht.`;
      adviceTip = `🏍️ Heerlijk motorweer! Asfalt blijft droog over alle tijdvakken van ${legMinutes} minuten.`;
    }

    // Add wind gust alert if gusts exceed user limit
    if (maxGustsOverall > userMaxGusts) {
      explanation += ` 💨 Let wel op voor stevige zijwindstoten tot ${maxGustsOverall} km/u boven jouw limiet (${userMaxGusts} km/u).`;
      if (verdict === 'green') {
        verdict = 'yellow';
        badgeText = '🟡 ZIJWIND ALERT';
      }
    }

    // Calculate Route Index (0-100)
    let score = 100;
    if (maxRainOverall > 2.0) score -= 50;
    else if (maxRainOverall > 0.8) score -= 30;
    else if (maxRainOverall > 0.2) score -= 15;
    else if (maxRainOverall > 0.05) score -= 5;

    if (maxGustsOverall > 70) score -= 45;
    else if (maxGustsOverall > userMaxGusts) score -= 25;
    else if (maxGustsOverall > 45) score -= 10;

    const minTemp = Math.min(startWeather.temp, midWeather.temp, destWeather.temp);
    if (minTemp < 4) score -= 40;
    else if (minTemp < 8) score -= 15;

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
      score
    };
  },

  /**
   * Tests multiple departure time slots (-30m, -15m, 0m, +15m, +30m, +45m, +60m)
   * to find if delaying or advancing departure avoids rain showers!
   */
  computeDepartureAlternatives(routeState, waypointsWeather, baseDepartureDate) {
    const offsetsMinutes = [-30, -15, 0, 15, 30, 45, 60, 90];
    const results = [];

    offsetsMinutes.forEach(offset => {
      const depDate = new Date(baseDepartureDate.getTime() + offset * 60 * 1000);
      const evalRes = this.evaluateRoute(routeState, waypointsWeather, depDate);
      if (evalRes) {
        results.push({
          offsetMinutes: offset,
          departureTimeStr: this.formatTime(depDate),
          depDate,
          verdict: evalRes.verdict,
          scenario: evalRes.scenario,
          score: evalRes.score,
          maxRain: evalRes.maxRainOverall,
          isCurrent: offset === 0,
          label: offset === 0 ? 'Gekozen' : offset > 0 ? `+${offset}m` : `${offset}m`
        });
      }
    });

    // Find the best dry departure slot
    const drySlots = results.filter(r => r.maxRain < 0.1 && r.score >= 80);
    let bestAlternative = null;

    if (drySlots.length > 0) {
      bestAlternative = drySlots[0];
    }

    return {
      slots: results,
      bestAlternative
    };
  }
};
