/**
 * Ride Or Die - Lokalisatie & Nederlandse Stijlgids (Helder Schrijven)
 * Bevat alle gebruikersgerichte teksten, statusmeldingen, foutberichten en getalnotaties.
 * Consequent actief geformuleerd, vrij van Engelse leenwoorden en met correcte komma-notatie.
 */

const I18n = {
  // 1. Getal-, datum- en tijdnotaties volgens de Nederlandse standaard
  formatters: {
    // Formatteert een decimaal getal met een komma (bijv. 1,5 i.p.v. 1.5)
    decimal(num, decimals = 1) {
      if (num === null || num === undefined || isNaN(num)) return '0,0';
      return Number(num).toLocaleString('nl-NL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    },

    // Neerslag in millimeters met komma (bijv. "0,0 mm", "1,2 mm")
    millimeters(val) {
      const formatted = this.decimal(val, 1);
      return `${formatted} mm`;
    },

    // Snelheid en windstoten in kilometers per uur
    kmh(val) {
      return `${Math.round(val || 0)} km/u`;
    },

    // Temperatuur in graden Celsius
    celsius(val) {
      return `${Math.round(val || 0)}°C`;
    },

    // Tijdnotatie: 14.30 uur (in lopende tekst) of 14.30 (in compacte velden)
    time(date = new Date(), includeSuffix = false) {
      if (!date) return '--.--';
      const d = (date instanceof Date) ? date : new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return includeSuffix ? `${hours}.${minutes} uur` : `${hours}.${minutes}`;
    },

    // Datum voluit: "Donderdag 15 oktober"
    fullDate(date = new Date()) {
      const d = (date instanceof Date) ? date : new Date(date);
      const str = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Afstand in kilometers met komma
    distance(km) {
      return `~${this.decimal(km, 0)} km`;
    },

    // Reistijd in minuten
    minutes(mins) {
      return `~${Math.round(mins)} min`;
    }
  },

  // 2. WMO Weercode vertalingen (Helder Nederlands)
  weatherCodes: {
    0: { text: "Zonnig en onbewolkt", icon: "sun", state: "sunny" },
    1: { text: "Vrijwel helder", icon: "sun", state: "sunny" },
    2: { text: "Licht bewolkt", icon: "partly-cloudy", state: "sunny" },
    3: { text: "Zwaar bewolkt", icon: "cloudy", state: "cloudy" },
    45: { text: "Mistig", icon: "fog", state: "cloudy" },
    48: { text: "Aanvriezende mist", icon: "fog", state: "cloudy" },
    51: { text: "Lichte motregen", icon: "drizzle", state: "rain" },
    53: { text: "Matige motregen", icon: "drizzle", state: "rain" },
    55: { text: "Dichte motregen", icon: "drizzle", state: "rain" },
    56: { text: "Aanvriezende motregen", icon: "drizzle", state: "storm" },
    57: { text: "Dichte aanvriezende motregen", icon: "drizzle", state: "storm" },
    61: { text: "Lichte regen", icon: "rain", state: "rain" },
    63: { text: "Matige regen", icon: "rain", state: "rain" },
    65: { text: "Zware regenval", icon: "heavy-rain", state: "rain" },
    66: { text: "Aanvriezende regen", icon: "heavy-rain", state: "storm" },
    67: { text: "Zware aanvriezende regen", icon: "heavy-rain", state: "storm" },
    71: { text: "Lichte sneeuwval", icon: "snow", state: "cloudy" },
    73: { text: "Matige sneeuwval", icon: "snow", state: "cloudy" },
    75: { text: "Hevige sneeuwval", icon: "snow", state: "storm" },
    77: { text: "Sneeuwkorrels", icon: "snow", state: "storm" },
    80: { text: "Lichte buien", icon: "rain", state: "rain" },
    81: { text: "Matige buien", icon: "rain", state: "rain" },
    82: { text: "Zware stortbuien", icon: "heavy-rain", state: "storm" },
    85: { text: "Lichte sneeuwbuien", icon: "snow", state: "cloudy" },
    86: { text: "Zware sneeuwbuien", icon: "snow", state: "storm" },
    95: { text: "Onweersbui", icon: "thunder", state: "storm" },
    96: { text: "Onweersbui met hagel", icon: "thunder", state: "storm" },
    97: { text: "Zware onweersbui met hagel", icon: "thunder", state: "storm" },
    99: { text: "Zware onweersbui met hagel", icon: "thunder", state: "storm" }
  },

  // 3. Windrichtingen in het Nederlands
  windDirections: ['Noord', 'NNO', 'NO', 'ONO', 'Oost', 'OZO', 'ZO', 'ZZO', 'Zuid', 'ZZW', 'ZW', 'WZW', 'West', 'WNW', 'NW', 'NNW'],

  // 4. Beaufort Schaal
  beaufortScale(kmh) {
    if (kmh < 1) return '0 Bft';
    if (kmh <= 5) return '1 Bft';
    if (kmh <= 11) return '2 Bft';
    if (kmh <= 19) return '3 Bft';
    if (kmh <= 28) return '4 Bft';
    if (kmh <= 38) return '5 Bft';
    if (kmh <= 49) return '6 Bft';
    if (kmh <= 61) return '7 Bft';
    if (kmh <= 74) return '8 Bft';
    if (kmh <= 88) return '9 Bft';
    return '10+ Bft';
  },

  // 5. Interface labels & teksten (georganiseerd per weergaveonderdeel)
  t: {
    appTitle: "RIDE OR DIE",
    appSubTitle: "Motorweer & Routecockpit",

    // Knoppen & acties
    actions: {
      save: "Opslaan",
      applyAndClose: "Route toepassen en sluiten",
      swapRoute: "Draai start en bestemming om",
      recalculate: "Herberekenen",
      useGps: "Gebruik mijn huidige gps-locatie",
      refresh: "Weergegevens vernieuwen",
      fullscreen: "Schermvullende weergave",
      settings: "Instellingen",
      close: "Sluiten",
      today: "Vandaag",
      nextWorkday: "Volgende werkdag"
    },

    // Weergavemodi
    views: {
      cockpit: "Cockpit",
      widget: "Beknopt",
      cockpitTitle: "Schakel naar de uitgebreide cockpit",
      widgetTitle: "Schakel naar de beknopte weergave"
    },

    // Themakeuzes
    themes: {
      light: "Licht",
      auto: "Automatisch",
      dark: "Donker"
    },

    // Hoofdoordeel & statusbadges
    verdicts: {
      greenBadge: "🟢 GROEN LICHT",
      yellowBadge: "🟡 OPLETTEN",
      redBadge: "🔴 BINNENBLIJVEN",
      dryRoute: "🟢 100% DROGE ROUTE",
      rideIntoRain: "🟡 NAAR BUI TOE",
      rainEnRoute: "🔴 BUI ONDERWEG",
      clearingUp: "🟡 KLAART OP",
      rainThroughout: "🔴 REGEN OP HELE ROUTE",
      sideWindAlert: "🟡 ZIJWINDWAARSCHUWING"
    },

    // Telemetrie & meetwaarden
    telemetry: {
      sideWind: "Zijwind",
      roadGrip: "Wegdekgrip",
      rainChance: "Regenkans",
      comfort: "Gevoelstemperatuur",
      safe: "Veilig",
      optimal: "Optimaal droog",
      damp: "Vochtig asfalt",
      slippery: "Glad en nat",
      aboveLimit: "Boven jouw limiet",
      dangerous: "Gevaarlijk",
      alert: "Wees alert",
      chilly: "Fris",
      comfortable: "Behaaglijk",
      warm: "Warm",
      frostWarning: "Kans op gladheid",
      dry: "Droog"
    },

    // Specificaties (6 tegels)
    specs: {
      wind: "Wind",
      gusts: "Stoten",
      precipitation: "Neerslag",
      uvIndex: "Zonkracht (uv)",
      pressure: "Luchtdruk",
      visibility: "Zicht",
      stable: "Stabiel",
      unstable: "Onstuimig",
      excellent: "Uitstekend",
      good: "Goed",
      limited: "Beperkt",
      low: "Laag",
      moderate: "Matig",
      high: "Hoog",
      veryHigh: "Zeer hoog",
      quiet: "Rustig",
      strong: "Krachtig"
    },

    // Kleding- en uitrustingsadvies
    gear: {
      title: "Aanbevolen uitrusting en kleding",
      subtext: "Berekend op basis van de minimumtemperatuur en actuele neerslag op je route.",
      winterGloves: "🧤 Winterhandschoenen",
      thermoLining: "🧥 Thermovoering en kol",
      midGloves: "🧤 Halfseizoen-handschoenen",
      textileJacket: "🧥 Textieljas met tussenlaag",
      summerGloves: "🧤 Zomerhandschoenen",
      meshJacket: "🧥 Doorwaaijas of leer",
      sunVisor: "🕶️ Zonnevizier",
      allroundGear: "🧥 Allround motorpak (leer of textiel)",
      allSeasonGloves: "🧤 Vierseizoenen-handschoenen",
      rainSuit: "🌧️ Regenpak en pinlock-vizier",
      dryVisor: "✨ Droog vizier (geen regenpak nodig)"
    },

    // Rittenplanner dialogen
    routePlanner: {
      title: "Motorrit en routecorridor",
      subtitle: "Automatisch getoetst via het KNMI Harmonie-weermodel",
      startPoint: "Vertrekpunt (A)",
      destination: "Bestemming (B)",
      corridorLabel: "Motorroute:",
      travelTimePerLeg: "Geschatte ritduur",
      departureTime: "Vertrektijd",
      modelDataInfo: "KNMI Harmonie 15-minutengegevens"
    },

    // Locatiekiezer
    locationPicker: {
      title: "Locatie kiezen",
      searchPlaceholder: "Typ een Nederlandse plaatsnaam...",
      popularCities: "Veelgekozen steden",
      noResults: "Geen plaatsen gevonden in Nederland"
    },

    // Instellingen
    settings: {
      title: "Instellingen en persoonlijke limieten",
      themeChoice: "Themakeuze",
      morningDeparture: "Ochtendvertrek (heen)",
      eveningDeparture: "Avondvertrek (terug)",
      minTemp: "Minimale temperatuur",
      maxGusts: "Maximale windstotenlimiet",
      saveButton: "Instellingen opslaan"
    },

    // Korte statusberichten (toasts)
    toasts: {
      locationChanged: (name) => `Locatie ingesteld op ${name}`,
      locationSaved: "Locatie succesvol bijgewerkt",
      routeSaved: "Route opgeslagen en geanalyseerd",
      routeSwapped: "Heen- en terugrit omgedraaid",
      settingsSaved: "Instellingen opgeslagen",
      gpsLocating: "Jouw gps-positie bepalen...",
      gpsUnsupported: "Geolocatie wordt niet ondersteund door je browser",
      gpsDenied: "Locatietoegang geweigerd. Huidige plaats behouden.",
      weatherRefreshed: "KNMI-gegevens succesvol bijgewerkt",
      weatherRefreshing: "KNMI Harmonie-modelgegevens ophalen...",
      weatherForceRefresh: "Gegevens geforceerd vernieuwen...",
      networkError: "Netwerkfout: recente opgeslagen gegevens getoond",
      fetchError: "Fout bij laden van KNMI-gegevens. Probeer het opnieuw.",
      fullscreenOn: "Schermvullende weergave geactiveerd",
      fullscreenOff: "Standaardweergave hersteld",
      widgetModeActive: "Beknopte weergave ingeschakeld",
      cockpitModeActive: "Uitgebreid dashboard ingeschakeld"
    }
  }
};

if (typeof window !== 'undefined') window.I18n = I18n;
if (typeof module !== 'undefined') module.exports = I18n;
