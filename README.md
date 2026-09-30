# 🏍️ Ride Or Die Weather Web App

> **De ultieme Single-Page Weer- & Motorcockpit voor Nederland, aangedreven door het numerieke KNMI Harmonie-AROME 2km weermodel.**

---

## ⚡ TL;DR — Belangrijkste Features op een rij

- **🏍️ Woon-Werk Motoradvies (Commute Command Center)**:
  Beantwoordt direct de belangrijkste vraag: *"Kan ik vandaag veilig en droog met de motor naar het werk en weer terug?"*. Analyseert jouw specifieke vertrektijd voor de **ochtendrit (heen)** en **avondrit (terug)**, toont een directe score (*Index 0-100*) en een duidelijk verdict: 🟢 **RIDE ON!**, 🟡 **PAS OP!** of 🔴 **RIDE OR DIE!**.
- **⛶ Fullscreen Kiosk Mode (`#fullscreen`)**:
  Met één klik op de fullscreen-knop (of via URL hash `#fullscreen`) opent de app in randloze kiosk-modus. Op grotere displays (zoals laptops, tablets en 1280x720 / 1280x800 cockpit-schermen) **vergroot de interface schermvullend mee tot max 125%** voor maximale leesbaarheid tijdens het rijden. Sluit af via de knop of met **ESC**.
- **🔲 Simple Mode — 1 Schermvullend Widget (`#simple`)**:
  Activeer via de toggle-knop naast de fullscreen-knop (of via `#simple`). Verbergt alle secundaire grafieken en tabellen en combineert het **Actuele Weer** en het **Motoradvies** tot **één rustig, schermvullend glazen widget**. Ideaal als minimalistische boordcomputer op het stuur of dashboard.
- **☀️ Heldere Light Mode Standaard**:
  Standaard ingesteld op een rustige, frisse lichte weergave (geen ongewenst donker scherm). Inclusief een snelle toggle-knop in de navigatiebalk om te wisselen tussen **Licht**, **Automatisch** (volgt zonsopgang/ondergang of systeem) en **Donker**.
- **🇳🇱 Rechtstreeks KNMI Harmonie-AROME Weermodel (2 km)**:
  Geen grove wereldwijde schattingen, maar de hoogst beschikbare resolutie van het KNMI (via Open-Meteo `knmi_seamless`) met nauwkeurige neerslag, lokale windstoten, temperatuur en zicht.
- **⏱️ Slimme Tijdlijn (Vanaf afgelopen uur)**:
  Begint exact bij het afgelopen uur en toont wat er aankomt (`het afgelopen uur + komende 24 uur`), met visuele highlights voor het actuele uur en jouw woon-werktijden.
- **📱 100% Schaalbaar & Responsief**:
  Volledig geoptimaliseerd tegen tekstoverlap en afsnijden. Schaalt vloeiend van compacte 7-8 inch cockpit-schermen en desktop breedbeeld tot smartphones (met gecentreerde mobiele header).
- **🚀 100% Single-File & GitHub Pages Ready**:
  Alle HTML, CSS en JavaScript bevindt zich in één enkel `index.html` bestand. Geen build tools, geen Node.js en **geen Python** vereist.

---

## 🧭 Cockpit Weergaven & Schermmodi

### 1. Simple Mode (Eenvoudige Weergave)
Met de **Simple Mode** knop (direct naast de fullscreen knop in de navigatiebalk) schakel je direct naar een minimalistische cockpit-interface:
- **Gecombineerd Widget**: Voegt de actuele temperatuur, weericoon, gevoelstemperatuur, min/max, wind/stoten, live tijd en locatie samen met de grote advies-verdict banner, index-score en rit-samenvattingen in één royaal schermvullend glazen paneel.
- **Dynamische Kleurgloed**: De achtergrond en randen lichten subtiel groen, oranje/geel of rood op afhankelijk van de actuele ritveiligheid.
- **Cockpit Focus**: Geen afleiding van lange lijsten of tabellen; alle essentiële info is in één snelle blik leesbaar.
- **Geheugen & URL**: Jouw keuze wordt bewaard in `localStorage` en gesynchroniseerd in de browserlink (`#simple`).

### 2. Fullscreen Kiosk Mode (Max 125% Vergroot)
- **Adaptieve Kiosk Schaling**: Berekent de schermverhouding en vergroot de UI dynamisch tot maximaal **125%** (`zoom: 1.25`) op schermen met voldoende ruimte (zoals 1080p, 1440p of 7-8 inch tablets in landscape).
- **Veilig voor kleinere schermen**: Op schermen smaller dan 1260px blijft de schaalfactor vergrendeld op `1.0`, zodat mobiele media-queries en layoutregels behouden blijven zonder vervorming.
- **URL Koppeling**: Voegt automatisch `#fullscreen` toe aan de URL. Een bladwijzer of snelkoppeling direct naar `index.html#fullscreen` start meteen in kiosk-stand.
- **Combineren mogelijk**: Je kunt Simple Mode en Fullscreen gelijktijdig gebruiken (`#fullscreen&simple`) voor een volwaardige digitale motorcockpit.

---

## 🏍️ Het "Ride Or Die" Commute Command Center

1. **Rit-analyse per Dagdeel**:
   - **Ochtendrit (Heen)**: Neerslagkans, temperatuur, windstoten en conditie op jouw ingestelde ochtendtijd.
   - **Avondrit (Terug)**: Analyse voor de terugrit aan het einde van de werkdag.
2. **Veiligheidsmatrix (4 Meters)**:
   - **Wegdek & Grip**: Berekent gripcondities (Optimaal / Glad / Risico op ijzel of aquaplaning).
   - **Regenrisico & Hoeveelheid**: Direct inzicht in millimeters neerslag en buienkansen.
   - **Zijwind & Stoten**: Berekent windkracht en rukwinden voor stabiel rijden op snelweg en bruggen.
   - **Thermisch Comfort**: Aangepast op gevoelstemperatuur en rijwind.
3. **Uitrusting & Kledingadvies**:
   - Dynamische badges voor doorwaaijas, thermovoering, regenpak, vizierkeuze en handschoenen.

---

## 🎨 Design & Stijl

- **Custom Chopper / Cruiser Logo**: Strak vector-embleem van een cruiser motor met voorvork, teardrop tank, drag pipes en een subtiele weerszon aan de horizon.
- **Material You 3 & Glassmorphism**: Hoogwaardige acryl blur effecten (`backdrop-filter: blur(28px)`), zachte borders en een dynamische achtergrondmesh die zacht mee-animeert.
- **Minimalistische Vaste Footer**: Discreet onderaan het scherm geplaatst zonder storende kaders: modelvermelding, databron en opensource copyright.
- **Thema-opties**:
  - ☀️ **Licht**: Heldere, contrastrijke dagweergave (standaard).
  - 🌓 **Auto**: Schakelt automatisch mee op basis van dag/nacht en zonnestand.
  - 🌙 **Donker**: Zachte donkere nachtstand voor ritten in het donker.

---

## 🔗 URL Hashes & Cockpit Snelkoppelingen

Je kunt de web app direct opstarten in een gewenste stand via de browser-URL:

| URL Hash | Resultaat |
| :--- | :--- |
| *(geen hash)* | Standaard dashboard met alle tegels en tabellen |
| `#fullscreen` | Start direct schermvullend (tot max 125% vergroot) |
| `#simple` | Start direct in Simple Mode (1 gecombineerd widget) |
| `#fullscreen&simple` | Start schermvullend én in Simple Mode (ultieme cockpitstand) |

---

## ⚙️ Aanpasbare Instellingen

Klik op het tandwiel-icoon of de locatieknop om jouw voorkeuren aan te passen:
- **Woon-werk Tijden**: Stel jouw exacte ochtend- en avondvertrektijd in (bijv. 07:30 en 16:30).
- **Minimum Temperatuur**: Stel in vanaf welke temperatuur jij het comfortabel vindt om te rijden.
- **Maximale Windstoten**: Bepaal jouw persoonlijke windlimiet (standaard 55 km/u).
- **Locatie**: Kies via GPS, zoek op elke Nederlandse plaatsnaam/postcode, of gebruik de snelle stadsknoppen (*Utrecht, Amsterdam, Rotterdam, Ameide, Eindhoven, Groningen, etc.*).

---

## 🚀 Publiceren naar GitHub Pages

De app is 100% self-contained in `index.html` en draait zonder server of build-stappen:

1. Push `index.html` en `README.md` naar jouw GitHub repository (bijv. `RideOrDieWeather`).
2. Ga in GitHub naar **Settings** ➔ **Pages**.
3. Selecteer onder **Build and deployment** bij Source: **Deploy from a branch**.
4. Kies branch `master` (of `main`) en map `/ (root)`, en klik op **Save**.
5. Binnen circa 1 minuut is jouw cockpit live op:
   ```
   https://<jouw-github-gebruikersnaam>.github.io/RideOrDieWeather/
   ```

---

## 📄 Licentie

Gepubliceerd onder de **MIT License (Open Source)**.  
Copyright &copy; 2026 Mark Tapking.
