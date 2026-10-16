# 🏍️ Ride Or Die Weather Web App

> **De ultieme Single-Page Weer- & Motorcockpit voor Nederland, aangedreven door het numerieke KNMI Harmonie-AROME 2km weermodel.**

---

## ⚡ TL;DR — Belangrijkste Features op een rij

- **🏍️ Woon-Werk Motoradvies (Commute Command Center)**:
  Beantwoordt direct de belangrijkste vraag: *"Kan ik vandaag veilig en droog met de motor naar het werk en weer terug?"*. Analyseert jouw specifieke vertrektijd voor de **ochtendrit (heen)** en **avondrit (terug)**, toont een directe score (*Index 0-100*) en een duidelijk verdict: 🟢 **RIDE ON!**, 🟡 **OPLETTEN** of 🔴 **DIE HARD ONLY (Koekblik Dag)**.
- **📍 Gecentreerde Locatiekiezer in de Navigatiebalk**:
  Midden in de navigatiebalk staat de actieve locatie als interactieve knop (op mobiel direct met de duim bereikbaar). Opent een eigen, dedicated scherm om binnen seconden van stad te wisselen via GPS, live zoeken of snelle stadsknoppen.
- **⛶ Adaptieve Schaling & Fullscreen Kiosk Mode (`#fullscreen`)**:
  Met één klik op de fullscreen-knop (of via `#fullscreen`) opent de app in randloze kiosk-modus. Op grotere schermen (zoals een **24 inch monitor**, desktop of tablet) **schaalt de interface dynamisch mee (tot 145% in fullscreen en 125% in normale venstermodus)** zodat alles royaal ademt en perfect leesbaar is. Op compacte schermen (zoals 7-8 inch cockpits of laptops) blijft de lay-out automatisch strak en compact vergrendeld op 100%. Sluit fullscreen af via de knop of met **ESC**.
- **🔲 Simple Mode — 1 Schermvullend Widget (`#simple`)**:
  Activeer via de toggle-knop naast de fullscreen-knop (of via `#simple`). Verbergt alle secundaire grafieken en tabellen en combineert het **Actuele Weer** en het **Motoradvies** tot **één rustig, schermvullend glazen widget**. Ideaal als minimalistische boordcomputer op het stuur of dashboard.
- **☀️ Heldere Light Mode Standaard**:
  Standaard ingesteld op een rustige, frisse lichte weergave (geen ongewenst donker scherm). Inclusief een snelle toggle-knop in de navigatiebalk om te wisselen tussen **Licht**, **Automatisch** (volgt zonsopgang/ondergang of systeem) en **Donker**.
- **🇳🇱 Rechtstreeks KNMI Harmonie-AROME Weermodel (2 km)**:
  Geen grove wereldwijde schattingen, maar de hoogst beschikbare resolutie van het KNMI (via Open-Meteo `knmi_seamless`) met nauwkeurige neerslag, lokale windstoten, temperatuur en zicht.
- **⏱️ Slimme Uurlijkse Trend (Afgelopen 2 uur + komende 24 uur)**:
  Begint exact bij de afgelopen 2 uur voor het actuele moment voor directe trendcontext en toont wat er aankomt over de komende 24 uur, met visuele highlights voor het actuele uur en jouw rittijden.
- **📱 100% Schaalbaar & Responsief**:
  Volledig geoptimaliseerd tegen tekstoverlap en afsnijden. Schaalt vloeiend van compacte 7-8 inch cockpit-schermen en desktop breedbeeld tot smartphones (met gecentreerde mobiele navigatie).
- **🚀 100% Modulair, Standalone & Serverless**:
  Overzichtelijk opgebouwd in gescheiden modules (`index.html`, `css/style.css`, `js/config.js`, `js/commute-engine.js`, `js/weather-service.js` en `js/app.js`). Geen build tools, geen Node.js, geen externe server en **geen Python** vereist. Werkt direct in elke moderne webbrowser via dubbelklik.

---

## 🧭 Cockpit Weergaven & Schermmodi

### 1. Simple Mode (Eenvoudige Weergave)
Met de **Simple Mode** knop (direct naast de fullscreen knop in de navigatiebalk) schakel je direct naar een minimalistische cockpit-interface:
- **Gecombineerd Widget**: Voegt de actuele temperatuur, weericoon, gevoelstemperatuur, min/max, wind/stoten, live tijd en locatie samen met de grote advies-verdict banner, index-score en rit-samenvattingen in één royaal schermvullend glazen paneel.
- **Dynamische Kleurgloed**: De achtergrond en randen lichten subtiel groen, oranje/geel of rood op afhankelijk van de actuele ritveiligheid.
- **Cockpit Focus**: Geen afleiding van lange lijsten of tabellen; alle essentiële info is in één snelle blik leesbaar.
- **Geheugen & URL**: Jouw keuze wordt bewaard in `localStorage` en gesynchroniseerd in de browserlink (`#simple`).

### 2. Adaptieve Schaling & Fullscreen Kiosk Mode (Meer ademruimte)
- **Royale Weergave op Grote Schermen**: Op grotere monitoren (bijv. een 24 inch 1080p scherm of groter) schaalt de interface automatisch mee en krijgen widgets meer tussenruimte (gap/padding), zodat de pagina natuurlijk ademt in plaats van gecentreerd te zijn in een smal koker-kader.
- **Fullscreen Kiosk Schaling (tot 145%)**: In fullscreen berekent de app de beschikbare resolutie en vergroot mee tot maximaal **145%** (`zoom: 1.45`), waardoor het hele display indrukwekkend schermvullend gevuld wordt.
- **Compact op Kleinere Displays**: Wordt het venster kleiner of draait de app op een 7-8 inch cockpit (1280x720 / 1280x800) of tablet, dan vergrendelt de schaalfactor automatisch op `1.0` (100%), waardoor de lay-out compact en strak blijft zonder scrollbars of vervorming.
- **URL Koppeling**: Voegt automatisch `#fullscreen` toe aan de URL. Een bladwijzer of snelkoppeling direct naar `index.html#fullscreen` start meteen in kiosk-stand.
- **Combineren mogelijk**: Je kunt Simple Mode en Fullscreen gelijktijdig gebruiken (`#fullscreen&simple`) voor een volwaardige digitale motorcockpit.

---

## 🏍️ Het "Ride Or Die" Commute Command Center

Het motoradvies in de app wordt **100% berekend op basis van actuele en uurlijkse weersdata** uit het numerieke KNMI Harmonie-AROME weermodel (2 km resolutie) via het algoritme in `computeCommuteAdvise()`.

### 🧠 Hoe het Motoradvies Berekend Wordt (Data & Combinaties)

Geen enkel weerelement staat op zichzelf; voor motorrijders zijn met name **combinaties van weersfactoren** doorslaggevend voor de veiligheid en het comfort op de weg.

#### 1. Tijdvenster-analyse per Rit (Ochtend & Avond)
In plaats van een algemeen daggemiddelde analyseert het algoritme een specifiek **venster van 3 uur** rond jouw vertrektijden (standaard 07:00 heen en 16:30 terug, instelbaar via het tandwiel-icoon):
- **Neerslagvolume én Neerslagkans**: Zowel de verwachte millimeters neerslag (`totalPrecip`) als de buienkans (`maxPrecipProb`). Een lokaal spatje van 0.2 mm met 60% kans krijgt een heel ander advies dan 3 mm aanhoudende regen.
- **Piek-windstoten (`maxGusts`)**: Er wordt gekeken naar de maximale windstoot in km/u binnen je tijdvak (met name windvlagen op dijken, viaducten en open polders).
- **Temperatuur (`avgTemp`)**: Zowel gevoelstemperatuur als absolute temperatuur ten opzichte van jouw ingestelde minimumtemperatuur.
- **Gevaarcodes (`worstCode`)**: WMO-weercodes voor onweer (95, 96, 99), hagel, dichte mist of sneeuw.

#### 2. Het Cumulatieve 100-punts Aftreksysteem
Elke rit start met een perfecte score van **100/100**. Risicofactoren trekken cumulatief strafpunten af:

| Risicofactor | Drempelwaarde | Aftrek | Reden in advies |
| :--- | :--- | :--- | :--- |
| **Hevige regen / stortbui** | > 2.0 mm (of > 1.5 mm bij > 75% kans) | **-50 pt** | *Stevige regenval verwacht (>2 mm)* |
| **Matige regenbui** | 0.8 – 2.0 mm (of > 0.3 mm bij > 60% kans) | **-35 pt** | *Kans op bui (x.x mm)* |
| **Lichte bui / meetbare regen** | 0.15 – 0.8 mm | **-28 pt** | *Bui op de route (direct oranje/geel)* |
| **Spatje neerslag** | 0.05 – 0.15 mm | **-10 pt** | *Mogelijk enkel spatje neerslag* |
| **Regionale onzekerheid** | 0.0 mm maar regenkans > 65% | **-10 pt** | *Overwegend droog (buienkans in regio)* |
| **Gevaarlijke stormstoten**| Piekstoten > 70 km/u | **-50 pt** | *Gevaarlijke windstoten (>70 km/u)* |
| **Felle zijwind** | Piekstoten > 50 km/u | **-25 pt** | *Felle zijwind op bruggen/dijken* |
| **Merkbare wind** | Piekstoten > 40 km/u | **-10 pt** | *Merkbare wind op snelweg* |
| **Kans op gladheid / ijzel**| Temperatuur < 2°C | **-60 pt** | *Kans op gladheid / ijzel!* |
| **Kou / Onder comfort** | Temp < ingestelde minimum | **-20 pt** | *Koud (x°C) - thermokleding vereist* |
| **Hitte in motorpak** | Temperatuur > 31°C | **-20 pt** | *Erg warm in motorpak (>30°C)* |
| **Onweer of hagel** | WMO-code 95, 96, 99 | **-60 pt** | *Onweer en hagel voorspeld* |

#### 3. Scoregrenzen & Verdicten
- 🟢 **80 – 100 pt (🏍️ RIDE ON!)**: Ideale omstandigheden. Volledig droog asfalt, kalme wind en aangename temperatuur.
- 🟡 **50 – 79 pt (⚠️ OPLETTEN)**: Wisselvallig of nat: regen op de route (of terugweg), stevige wind of frisse kou. Regenpak mee!
- 🔴 **< 50 pt (🚗 DIE HARD ONLY / KOEKBLIK DAG)**: Onveilige condities. Te veel risico op zware regen, gevaarlijke windstoten of gladheid. Pak liever de auto of het OV!

#### 4. Hoe Combinaties in de Praktijk Werken
Het algoritme straft ongunstige omstandigheden realistisch af zodat regen direct zwaar weegt:
- **Eén lichte regenbui**: Een bui van 0.3 mm (-28 pt) $\rightarrow$ Score: **72/100 (🟡 Geel/Oranje)**. Direct het advies om alert te zijn en regenkleding mee te nemen.
- **Dubbele combinatie (Wind + Lichte bui)**: Windstoten van 52 km/u (-25 pt) **én** een bui van 0.5 mm (-28 pt) $\rightarrow$ Score: **47/100 (🔴 Rood: Koekblik Dag)**.
- **Drievoudige combinatie (Wind + Regen + Kou)**: Windstoten 52 km/u (-25 pt) + regenbui 1.2 mm (-35 pt) + temperatuur onder minimum (-20 pt) $\rightarrow$ Score: **20/100 (🔴 Rood: Koekblik Dag)**.

#### 5. Het "Zwakste Schakel"-principe
Het uiteindelijke dagadvies wordt bepaald door de **laagste score** van de ochtend- en avondrit (`minScore = Math.min(morning, evening)`):
> *Als de ochtendrit een score van **95/100 (zonnig en droog)** heeft, maar de avondrit heeft regen op de route (**score 72/100 of lager**), dan toont de app direct een **🟡 Oranje advies ("Heenrit droog, maar bui verwacht bij de terugreis")** met een lagere score van 72/100.*  
Als motorrijder moet je immers aan het einde van de werkdag ook weer veilig en droog thuiskomen. Hierdoor word je nooit misleid door een groen dagadvies wanneer je 's middags door de regen moet rijden.

#### 6. Dynamisch Kleding- & Uitrustingsadvies
Op basis van de extremen over de ritten adviseert de cockpit direct de juiste uitrusting:
- **< 7°C**: Winterhandschoenen, thermovoering en kol.
- **7°C – 15°C**: Textieljas met tussenlaag, middenhandschoenen.
- **15°C – 24°C**: Allround leer/textiel, all-season handschoenen.
- **> 24°C**: Doorwaaijas/leer, zomerhandschoenen, zonnevizier.
- **Neerslag > 0.3 mm**: Regenpak & Pinlock vizier verplicht mee; anders blijft het regenpak veilig thuis.

#### 7. Veiligheidsmatrix (4 Live Meters)
- **✦ Zijwind & Stoten**: Meet piek-windstoten en vertaalt deze naar Beaufort en veiligheidsstatus (*Veilig / Alert / Gevaarlijk*).
- **🚵 Wegdek & Grip**: Berekent gripcondities op basis van verwachte neerslag (*Optimaal / Vochtig / Glad of Nat*).
- **🌧️ Regenrisico & Volume**: Toont neerslaghoeveelheid in mm en buienkans in % (*Droog / Spatje / Bui / Plensbui*).
- **🌡️ Thermisch Comfort**: Koppelt gevoelstemperatuur en actuele temperatuur aan comfortniveaus (*Koud / Behaaglijk / Warm*).

---

## 📍 Snelle Locatiewissel & Instellingen
 
- **📍 Gecentreerde Locatiekiezer in de Navigatiebalk**:
  Midden in de navigatiebalk (op mobiel én desktop direct met de duim bereikbaar) staat jouw huidige locatie weergegeven als een duidelijke interactieve pill-knop. Eén klik opent direct het speciale **Locatiescherm**:
  - Direct zoeken op elke Nederlandse plaatsnaam of postcode met realtime zoeksuggesties.
  - Snelle knoppen voor populaire steden (*Utrecht, Amsterdam, Rotterdam, Den Haag, Eindhoven, Groningen, Arnhem, Zwolle, Maastricht, Middelburg, Texel*).
  - Snelle GPS-knop om je actuele coördinaten direct over te nemen.
  - Een klik op een plaats stelt deze direct in en sluit het venster automatisch.
  - Ook het aantikken van de stadsnaam in het hoofdscherm opent direct deze locatiekiezer.
- **⚙️ Instellingen & Reistijden (`#settings-modal`)**:
  Klik op het tandwiel-icoon rechtsboven voor jouw persoonlijke motorvoorkeuren:
  - **Themakeuze**: Wissel snel tussen Licht (standaard), Automatisch en Donker.
  - **Woon-werk Vertrektijden**: Stel jouw ochtendvertrektijd (heen) en avondvertrektijd (terug) in.
  - **Motorrijder Comfort & Toleranties**: Stel jouw minimale comforttemperatuur en maximale windstoot-limiet in.
  - Klik op "Instellingen Opslaan" om het advies en de risicometers direct opnieuw te berekenen.

---

## 🎨 Design & Stijl

- **Custom Chopper / Cruiser Logo**: Strak vector-embleem van een cruiser motor met voorvork, teardrop tank, drag pipes en een subtiele weerszon aan de horizon.
- **Material You 3 & Glassmorphism**: Hoogwaardige acryl blur effecten (`backdrop-filter: blur(28px)`), zachte borders en een dynamische achtergrondmesh die subtiel mee-animeert.
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
| `#fullscreen` | Start direct schermvullend (automatisch vergroot voor grote schermen) |
| `#simple` | Start direct in Simple Mode (1 gecombineerd widget) |
| `#fullscreen&simple` | Start schermvullend én in Simple Mode (ultieme cockpitstand) |

---

## 🚀 Direct Gebruiken & Projectstructuur
 
De app is 100% serverloos, opgedeeld in overzichtelijke bestanden en vereist geen build-proces:
- `index.html`: Hoofd-HTML skelet met WAI-ARIA toegankelijkheid en dialoogvensters (~880 regels).
- `css/style.css`: Material You 3 Expressive stijlen, animaties en responsive media queries.
- `js/config.js`: Steden, WMO codes, weer-SVG's en centrale applicatiestatus.
- `js/commute-engine.js`: Algoritme voor motorrit-geschiktheid, scoreberekening en uitrustingsadvies.
- `js/weather-service.js`: Open-Meteo KNMI Harmonie model communicatie, caching en geolocatie.
- `js/app.js`: UI controllers, touch/click events, dialoogvensters en bootstrap.

Dubbelklik simpelweg op `index.html` om de app direct in elke browser (Chrome, Edge, Firefox, Safari) te openen.

---

## 📄 Licentie

Gepubliceerd onder de **MIT License (Open Source)**.  
Copyright &copy; 2026 Mark Tapking.
