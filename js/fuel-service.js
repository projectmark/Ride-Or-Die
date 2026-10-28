/**
 * Ride Or Die - Brandstofdienst & Pompprijzen (CBS Open Data StatLine)
 * Haalt actuele en historische pompprijzen van motorbrandstoffen op via het
 * Centraal Bureau voor de Statistiek (Tabel 80416NED).
 * 100% Modulaire berekenings- & datadienst. Vrij van directe DOM-afhankelijkheden.
 */

const FuelService = {
  _cacheKey: 'rideordie_cbs_fuel_cache_v1',
  _inFlightPromise: null,

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

      // 1. Controleer lokale cache
      if (!force) {
        try {
          const cached = localStorage.getItem(this._cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const age = Date.now() - (parsed.timestamp || 0);
            const ttl = fuelCfg.CACHE_TTL_MS || (12 * 60 * 60 * 1000);
            if (age < ttl && Array.isArray(parsed.records) && parsed.records.length > 0) {
              return parsed.records;
            }
          }
        } catch (e) {
          console.warn('[FuelService] Fout bij lezen cache:', e);
        }
      }

      // 2. Ophalen via CBS OData REST API (CORS ingeschakeld door CBS)
      const startDate = this._getStartDateString();
      const baseUrl = fuelCfg.CBS_API_URL || 'https://opendata.cbs.nl/ODataApi/OData/80416ned/TypedDataSet';
      const url = `${baseUrl}?$filter=Perioden ge '${startDate}'`;

      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' }
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

        // 4. Bewaar in cache
        try {
          localStorage.setItem(this._cacheKey, JSON.stringify({
            timestamp: Date.now(),
            records
          }));
        } catch (e) {
          console.warn('[FuelService] Fout bij schrijven cache:', e);
        }

        return records;
      } catch (err) {
        console.warn('[FuelService] Fout bij ophalen CBS-data, fallback actief:', err);
        try {
          const cached = localStorage.getItem(this._cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.records) && parsed.records.length > 0) {
              return parsed.records;
            }
          }
        } catch (e) {}
        return this._getFallbackRecords();
      } finally {
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
    const baseEuro = fuelCfg.FALLBACK_PRICE_EURO95 || 2.274;
    const baseDiesel = fuelCfg.FALLBACK_PRICE_DIESEL || 2.462;
    const baseLpg = fuelCfg.FALLBACK_PRICE_LPG || 0.984;
    const superSurcharge = fuelCfg.SUPER98_SURCHARGE || 0.19;
    const now = new Date();

    for (let i = 35; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
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
   */
  getStats(records, fuelType = 'BenzineEuro95_1', range = '30D') {
    if (!Array.isArray(records) || records.length === 0) return null;

    const daysCount = range === '90D' ? 90 : 30;
    const validRecords = records.filter(r => typeof r[fuelType] === 'number');
    if (validRecords.length === 0) return null;

    const slice = validRecords.slice(-daysCount);
    const latest = slice[slice.length - 1];
    const latestPrice = latest[fuelType];

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

    return {
      fuelType,
      range,
      latestPrice,
      latestDateStr: latest.dateStr,
      latestPeriod: latest.period,
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
        price: r[fuelType]
      }))
    };
  },

  /**
   * Bepaalt de effectieve rekenprijs op basis van de gebruikersvoorkeur (CBS vs. Aangepast/Actueel).
   */
  getEffectivePrice(stats, fuelState) {
    if (fuelState && fuelState.priceMode === 'custom' && typeof fuelState.customPricePerLiter === 'number' && fuelState.customPricePerLiter > 0) {
      return fuelState.customPricePerLiter;
    }
    return stats ? stats.latestPrice : (Config.FUEL?.FALLBACK_PRICE_EURO95 || 2.274);
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
   * Berekent de besparing van de motor ten opzichte van de auto ('het koekblik').
   */
  calculateCarSavings(distanceKm, bikeConsumption, carConsumption, fuelPrice) {
    const fuelCfg = Config.FUEL || {};
    const dFuel = Config.DEFAULTS?.FUEL || {};
    const kmDaily = (Number(distanceKm) || 0) * 2;
    const bikeL = (kmDaily / 100) * (Number(bikeConsumption) || dFuel.consumptionL100km || 5.6);
    const carL = (kmDaily / 100) * (Number(carConsumption) || fuelCfg.DEFAULT_CAR_CONSUMPTION_L100KM || 6.5);
    const price = Number(fuelPrice) || fuelCfg.FALLBACK_PRICE_EURO95 || 2.274;

    const bikeCost = bikeL * price;
    const carCost = carL * price;
    const savingsDaily = Math.max(0, carCost - bikeCost);
    const workdaysWeek = fuelCfg.WORKDAYS_PER_WEEK || 5;
    const workdaysMonth = fuelCfg.WORKDAYS_PER_MONTH || 21.6;

    return {
      daily: parseFloat(savingsDaily.toFixed(2)),
      weekly: parseFloat((savingsDaily * workdaysWeek).toFixed(2)),
      monthly: parseFloat((savingsDaily * workdaysMonth).toFixed(2))
    };
  }
};

if (typeof window !== 'undefined') window.FuelService = FuelService;
if (typeof module !== 'undefined') module.exports = FuelService;
