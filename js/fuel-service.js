/**
 * Ride Or Die - Brandstofdienst & Pompprijzen (CBS Open Data StatLine)
 * Haalt actuele en historische pompprijzen van motorbrandstoffen op via het
 * Centraal Bureau voor de Statistiek (Tabel 80416NED).
 * 100% Modulaire berekenings- & datadienst. Vrij van directe DOM-afhankelijkheden.
 */

const FuelService = {
  _cacheKey: 'rideordie_cbs_fuel_cache_v1',
  _inFlightPromise: null,
  _memRecords: null,
  _memTimestamp: 0,
  _statsCacheKey: '',
  _statsCacheVal: null,

  /**
   * Berekent de begindatum voor de CBS OData query (standaard geconfigureerd in Config.FUEL).
   */
  _getStartDateString(daysAgo = null) {
    const days = daysAgo || (Config.FUEL && Config.FUEL.HISTORY_DAYS_QUERY) || 120;
    const d = new Date();
    d.setDate(d.getDate() - days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  },

  /**
   * Haalt brandstofrecords op via CBS StatLine OData API met localStorage caching.
   */
  async fetchFuelData(force = false) {
    if (this._inFlightPromise && !force) {
      return this._inFlightPromise;
    }

    this._inFlightPromise = (async () => {
      const fuelCfg = Config.FUEL || {};

      // 1. Controleer L1 geheugencache en L2 localStorage cache (inclusief daggrens-controle voor gegarandeerde dagelijkse update)
      if (!force) {
        const now = Date.now();
        const ttl = fuelCfg.CACHE_TTL_MS || (12 * 60 * 60 * 1000);
        const todayStr = new Date(now).toDateString();

        if (this._memRecords && this._memTimestamp && (now - this._memTimestamp < ttl) && (new Date(this._memTimestamp).toDateString() === todayStr)) {
          return this._memRecords;
        }

        try {
          const cached = localStorage.getItem(this._cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const age = now - (parsed.timestamp || 0);
            const isSameDay = parsed.timestamp && (new Date(parsed.timestamp).toDateString() === todayStr);
            if (isSameDay && age < ttl && Array.isArray(parsed.records) && parsed.records.length > 0) {
              this._memRecords = parsed.records;
              this._memTimestamp = parsed.timestamp;
              return parsed.records;
            }
          }
        } catch (e) {
          console.warn('[FuelService] Fout bij lezen cache:', e);
        }
      }

      // 2. Ophalen via CBS OData REST API (CORS ingeschakeld door CBS) met netwerk-timeout
      const startDate = this._getStartDateString();
      const baseUrl = fuelCfg.CBS_API_URL || 'https://opendata.cbs.nl/ODataApi/OData/80416ned/TypedDataSet';
      const url = `${baseUrl}?$filter=Perioden ge '${startDate}'`;
      const controller = new AbortController();
      const timeoutMs = (Config.API && Config.API.FETCH_TIMEOUT_MS) || 10000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`CBS API HTTP ${response.status}`);
        }

        const json = await response.json();
        const rawList = json && json.value ? json.value : [];
        if (!Array.isArray(rawList) || rawList.length === 0) {
          throw new Error('Geen records ontvangen van CBS');
        }

        const superSurcharge = fuelCfg.SUPER98_SURCHARGE || 0.19;

        // 3. Normaliseren en sorteren van data
        const records = rawList
          .filter(r => r.Perioden && (r.BenzineEuro95_1 || r.Diesel_2))
          .map(r => {
            const p = String(r.Perioden).trim();
            const year = parseInt(p.substring(0, 4), 10);
            const month = parseInt(p.substring(4, 6), 10) - 1;
            const day = parseInt(p.substring(6, 8), 10);
            const dateObj = new Date(year, month, day);

            const benzine = typeof r.BenzineEuro95_1 === 'number' ? r.BenzineEuro95_1 : null;
            const diesel = typeof r.Diesel_2 === 'number' ? r.Diesel_2 : null;
            const lpg = typeof r.Lpg_3 === 'number' ? r.Lpg_3 : null;
            const super98 = benzine !== null ? parseFloat((benzine + superSurcharge).toFixed(3)) : null;

            return {
              period: p,
              timestamp: dateObj.getTime(),
              dateStr: (typeof I18n !== 'undefined' && I18n.formatters?.shortDate)
                ? I18n.formatters.shortDate(dateObj)
                : `${day} m${month + 1}`,
              isoDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
              BenzineEuro95_1: benzine,
              SuperPlus98: super98,
              Diesel_2: diesel,
              Lpg_3: lpg
            };
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        // 4. Bewaar in geheugen- en localStorage-cache
        const nowTs = Date.now();
        this._memRecords = records;
        this._memTimestamp = nowTs;
        this._statsCacheKey = '';
        try {
          localStorage.setItem(this._cacheKey, JSON.stringify({
            timestamp: nowTs,
            records
          }));
        } catch (e) {
          console.warn('[FuelService] Fout bij schrijven cache:', e);
        }

        return records;
      } catch (err) {
        console.warn('[FuelService] Fout bij ophalen CBS-data, fallback actief:', err);
        if (this._memRecords && this._memRecords.length > 0) {
          return this._memRecords;
        }
        try {
          const cached = localStorage.getItem(this._cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.records) && parsed.records.length > 0) {
              this._memRecords = parsed.records;
              return parsed.records;
            }
          }
        } catch (e) {}
        return this._getFallbackRecords();
      } finally {
        clearTimeout(timer);
        this._inFlightPromise = null;
      }
    })();

    return this._inFlightPromise;
  },

  /**
   * Genereert een representatieve fallback-reeks mocht de CBS server tijdelijk onbereikbaar zijn.
   */
  _getFallbackRecords() {
    const list = [];
    const fuelCfg = Config.FUEL || {};
    const baseEuro = fuelCfg.FALLBACK_PRICE_EURO95 || 2.25;
    const baseDiesel = fuelCfg.FALLBACK_PRICE_DIESEL || 2.40;
    const baseLpg = fuelCfg.FALLBACK_PRICE_LPG || 0.98;
    const superSurcharge = fuelCfg.SUPER98_SURCHARGE || 0.19;
    const now = new Date();

    for (let i = 35; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const wave = Math.sin(i / 5) * 0.03;
      const benzine = parseFloat((baseEuro + wave).toFixed(3));
      list.push({
        period: d.toISOString().slice(0, 10).replace(/-/g, ''),
        timestamp: d.getTime(),
        dateStr: (typeof I18n !== 'undefined' && I18n.formatters?.shortDate)
          ? I18n.formatters.shortDate(d)
          : `${d.getDate()} m${d.getMonth() + 1}`,
        isoDate: d.toISOString().slice(0, 10),
        BenzineEuro95_1: benzine,
        SuperPlus98: parseFloat((benzine + superSurcharge).toFixed(3)),
        Diesel_2: parseFloat((baseDiesel + wave * 0.8).toFixed(3)),
        Lpg_3: baseLpg
      });
    }
    return list;
  },

  /**
   * Berekent statistieken en trends voor de gekozen brandstof en periode.
   * Analyseert de live CBS-tabel en berekent bij de actuele dagkoersmodus een
   * dynamische, wiskundige extrapolatie (nowcast) voor de dagen tussen de laatste
   * CBS-publicatie en vandaag. 100% dynamisch, zonder hardgecodeerde datums of prijzen.
   */
  getStats(records, fuelType = 'BenzineEuro95_1', range = '30D', fuelState = null) {
    if (!Array.isArray(records) || records.length === 0) return null;

    const mode = fuelState?.priceMode || 'daily'; // 'daily' | 'cbs' | 'custom'
    const isUserCustom = Boolean(fuelState?.isUserCustom && typeof fuelState?.customPricePerLiter === 'number');
    const customPrice = isUserCustom ? fuelState.customPricePerLiter : '';
    const todayKey = new Date().toDateString();
    const lastRecPeriod = records[records.length - 1]?.period || '';
    const cacheKey = `${lastRecPeriod}_${records.length}_${fuelType}_${range}_${mode}_${isUserCustom}_${customPrice}_${todayKey}`;

    if (this._statsCacheKey === cacheKey && this._statsCacheVal) {
      return this._statsCacheVal;
    }

    const validCbs = records.filter(r => typeof r[fuelType] === 'number');
    if (validCbs.length === 0) return null;

    const isCbsMode = mode === 'cbs';

    const lastCbs = validCbs[validCbs.length - 1];
    const cbsPrice = lastCbs[fuelType];
    const cbsDateStr = lastCbs.dateStr;
    const cbsIsoDate = lastCbs.isoDate;

    let allRecords = records;
    let isNowcast = false;
    let daysProjected = 0;

    // Dynamische Nowcast (alleen in 'daily' modus wanneer CBS nog niet vandaag bevat)
    if (!isCbsMode) {
      const now = new Date();
      const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const parts = lastCbs.isoDate ? lastCbs.isoDate.split('-') : [];
      const lastCbsDate = parts.length === 3
        ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
        : new Date(lastCbs.timestamp);

      const diffMs = todayMid.getTime() - lastCbsDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        // Bereken dagelijkse veranderingssnelheid over de laatste 7 CBS-dagen
        const window7 = validCbs.slice(-7);
        const pLast = window7[window7.length - 1][fuelType];
        const pFirst = window7[0][fuelType];
        const spanDays = Math.max(1, window7.length - 1);
        const rawDailySlope = (pLast - pFirst) / spanDays;
        // Begrens extreme uitschieters tot max +/- 2 cent per dag voor stabiliteit
        const dailySlope = Math.max(-0.02, Math.min(0.02, rawDailySlope));

        const projectedRecords = [];
        let runningPrice = pLast;
        const superSurcharge = Config.FUEL?.SUPER98_SURCHARGE || 0.19;

        for (let step = 1; step <= diffDays; step++) {
          const stepDate = new Date(lastCbsDate.getFullYear(), lastCbsDate.getMonth(), lastCbsDate.getDate() + step);
          // Demp de helling geleidelijk naarmate dagen verder van de laatste meting liggen
          const decay = Math.pow(0.92, step - 1);
          runningPrice = parseFloat((runningPrice + (dailySlope * decay)).toFixed(3));

          const y = stepDate.getFullYear();
          const m = String(stepDate.getMonth() + 1).padStart(2, '0');
          const d = String(stepDate.getDate()).padStart(2, '0');
          const pCode = `${y}${m}${d}`;
          const iso = `${y}-${m}-${d}`;
          const dStr = (typeof I18n !== 'undefined' && I18n.formatters?.shortDate)
            ? I18n.formatters.shortDate(stepDate)
            : `${stepDate.getDate()} m${stepDate.getMonth() + 1}`;

          const projRec = {
            period: pCode,
            timestamp: stepDate.getTime(),
            dateStr: dStr,
            isoDate: iso,
            isNowcast: true,
            [fuelType]: runningPrice
          };

          if (fuelType === 'BenzineEuro95_1') {
            projRec.SuperPlus98 = parseFloat((runningPrice + superSurcharge).toFixed(3));
          }

          projectedRecords.push(projRec);
        }

        if (projectedRecords.length > 0) {
          allRecords = records.concat(projectedRecords);
          isNowcast = true;
          daysProjected = diffDays;
        }
      }
    }

    const daysCount = range === '90D' ? 90 : 30;
    const finalValid = allRecords.filter(r => typeof r[fuelType] === 'number');
    const slice = finalValid.slice(-daysCount);
    const latest = slice[slice.length - 1];
    const latestPrice = isUserCustom ? fuelState.customPricePerLiter : (isCbsMode ? cbsPrice : latest[fuelType]);

    const ref7Idx = Math.max(0, slice.length - 8);
    const price7d = slice[ref7Idx] ? slice[ref7Idx][fuelType] : latestPrice;
    const diff7d = latestPrice - price7d;

    const oldestInSlice = slice[0];
    const diffRange = latestPrice - (oldestInSlice ? oldestInSlice[fuelType] : latestPrice);

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    slice.forEach(r => {
      const p = r[fuelType];
      if (p < min) min = p;
      if (p > max) max = p;
      sum += p;
    });

    const avg = slice.length > 0 ? (sum / slice.length) : latestPrice;

    const result = {
      fuelType,
      range,
      mode,
      isUserCustom,
      isNowcast,
      daysProjected,
      cbsPrice,
      cbsDateStr,
      cbsIsoDate,
      latestPrice,
      latestDateStr: isCbsMode ? cbsDateStr : latest.dateStr,
      latestPeriod: isCbsMode ? lastCbs.period : latest.period,
      diff7d,
      diff7dCents: (diff7d * 100).toFixed(1),
      diffRange,
      diffRangeCents: (diffRange * 100).toFixed(1),
      min,
      max,
      avg,
      history: slice.map(r => ({
        timestamp: r.timestamp,
        dateStr: r.dateStr,
        price: r[fuelType],
        isNowcast: Boolean(r.isNowcast)
      }))
    };

    this._statsCacheKey = cacheKey;
    this._statsCacheVal = result;
    return result;
  },

  /**
   * Bepaalt de effectieve rekenprijs op basis van gebruikersvoorkeur en de dynamische data.
   */
  getEffectivePrice(stats, fuelState) {
    if (fuelState?.isUserCustom && typeof fuelState?.customPricePerLiter === 'number') {
      return fuelState.customPricePerLiter;
    }
    if (stats) {
      if (fuelState?.priceMode === 'cbs') {
        return stats.cbsPrice;
      }
      return stats.latestPrice;
    }
    return Config.FUEL?.FALLBACK_PRICE_EURO95 || 2.25;
  },

  /**
   * Berekent informatie over de eerstvolgende CBS publicatiedatum (altijd wekelijks op donderdag).
   */
  getCbsScheduleInfo(latestPeriodStr) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = zon, 1 = maa, 2 = din, 3 = woe, 4 = don, 5 = vri, 6 = zat
    let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
    if (daysUntilThursday === 0 && now.getHours() >= 14) {
      daysUntilThursday = 7;
    }
    const nextPub = new Date(now);
    nextPub.setDate(now.getDate() + daysUntilThursday);

    const isToday = daysUntilThursday === 0;
    const isTomorrow = daysUntilThursday === 1;

    let relativeLabel = '';
    if (isToday) {
      relativeLabel = 'vandaag';
    } else if (isTomorrow) {
      relativeLabel = 'morgen (donderdag)';
    } else {
      relativeLabel = (typeof I18n !== 'undefined' && I18n.formatters?.shortDate)
        ? `donderdag ${I18n.formatters.shortDate(nextPub)}`
        : `donderdag ${nextPub.getDate()} okt`;
    }

    return {
      nextDate: nextPub,
      relativeLabel,
      cycleText: 'Wekelijks op donderdag'
    };
  },

  /**
   * Berekent de kosten voor een enkele rit.
   */
  calculateTripCost(distanceKm, consumptionL100km, pricePerLiter) {
    const km = Math.max(0, Number(distanceKm) || 0);
    const dFuel = Config.DEFAULTS?.FUEL || {};
    const cons = Math.max(0.5, Number(consumptionL100km) || dFuel.consumptionL100km || 5.6);
    const price = Math.max(0, Number(pricePerLiter) || Config.FUEL?.FALLBACK_PRICE_EURO95 || 2.274);

    const liters = (km / 100) * cons;
    const cost = liters * price;

    return {
      distanceKm: km,
      consumptionL100km: cons,
      pricePerLiter: price,
      liters: parseFloat(liters.toFixed(2)),
      cost: parseFloat(cost.toFixed(2))
    };
  },

  /**
   * Berekent de kosten voor een volledige woon-werkdag (heen & terug = 2x).
   */
  calculateDailyCommuteCost(distanceKm, consumptionL100km, pricePerLiter) {
    return this.calculateTripCost((Number(distanceKm) || 0) * 2, consumptionL100km, pricePerLiter);
  },

  /**
   * Berekent de kosten van een volle tankbeurt.
   */
  calculateTankCost(tankCapacityL, pricePerLiter) {
    const dFuel = Config.DEFAULTS?.FUEL || {};
    const tank = Math.max(1, Number(tankCapacityL) || dFuel.tankCapacityL || 16);
    const price = Math.max(0, Number(pricePerLiter) || Config.FUEL?.FALLBACK_PRICE_EURO95 || 2.274);
    const cost = tank * price;

    return {
      liters: tank,
      cost: parseFloat(cost.toFixed(2))
    };
  },

  /**
   * Berekent de geschatte actieradius in kilometers op een volle tank.
   */
  calculateRangeKm(tankCapacityL, consumptionL100km) {
    const dFuel = Config.DEFAULTS?.FUEL || {};
    const tank = Math.max(1, Number(tankCapacityL) || dFuel.tankCapacityL || 16);
    const cons = Math.max(0.5, Number(consumptionL100km) || dFuel.consumptionL100km || 5.6);
    return Math.round((tank / cons) * 100);
  },

  /**
   * Berekent het kostenverschil / de besparing van de motor ten opzichte van het geselecteerde autovoertuig.
   * Ondersteunt zowel positieve besparing (motor zuiniger dan bijv. Swift Sport of Clio RS)
   * als negatief verschil (wanneer een hybride stadsauto zoals Aygo X 2026 zuiniger is dan bijv. een 2002 Hornet).
   */
  calculateCarSavings(distanceKm, bikeConsumption, carConsumption, fuelPrice) {
    const fuelCfg = Config.FUEL || {};
    const dFuel = Config.DEFAULTS?.FUEL || {};
    const kmDaily = (Number(distanceKm) || 0) * 2;
    const bikeCons = Number(bikeConsumption) || dFuel.consumptionL100km || 5.6;
    const carCons = Number(carConsumption) || dFuel.carConsumptionL100km || fuelCfg.DEFAULT_CAR_CONSUMPTION_L100KM || 5.8;
    const bikeL = (kmDaily / 100) * bikeCons;
    const carL = (kmDaily / 100) * carCons;
    const price = Number(fuelPrice) || fuelCfg.FALLBACK_PRICE_EURO95 || 2.250;

    const bikeCost = bikeL * price;
    const carCost = carL * price;
    const diffDaily = carCost - bikeCost; // Positief = motor is goedkoper (besparing)
    const workdaysWeek = fuelCfg.WORKDAYS_PER_WEEK || 5;
    const workdaysMonth = fuelCfg.WORKDAYS_PER_MONTH || 21.6;
    const workdaysYear = fuelCfg.WORKDAYS_PER_YEAR || 215;

    return {
      daily: parseFloat(diffDaily.toFixed(2)),
      weekly: parseFloat((diffDaily * workdaysWeek).toFixed(2)),
      monthly: parseFloat((diffDaily * workdaysMonth).toFixed(2)),
      yearly: parseFloat((diffDaily * workdaysYear).toFixed(2)),
      absDaily: parseFloat(Math.abs(diffDaily).toFixed(2)),
      absMonthly: parseFloat(Math.abs(diffDaily * workdaysMonth).toFixed(2)),
      absYearly: parseFloat(Math.abs(diffDaily * workdaysYear).toFixed(2)),
      isBikeCheaper: diffDaily >= -0.005,
      bikeCostDaily: parseFloat(bikeCost.toFixed(2)),
      carCostDaily: parseFloat(carCost.toFixed(2)),
      diffLitersPer100km: parseFloat((carCons - bikeCons).toFixed(1))
    };
  }
};

if (typeof window !== 'undefined') window.FuelService = FuelService;
if (typeof module !== 'undefined') module.exports = FuelService;
