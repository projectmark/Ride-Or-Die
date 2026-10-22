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

#### 2. Het Cumulatieve 100-punts Aftreksysteem & Persoonlijke Toleranties
Elke rit start met een perfecte basis van **100/100 punten**. Het algoritme past de puntentelling dynamisch aan op jouw persoonlijke toleranties en uitrusting:

- **☀️ Droogrijder (`avoid`)**: Je rijdt puur voor je plezier of wilt absoluut droog blijven. Zodra er regen valt op jouw traject, daalt de score sterk (-28 tot -60 pt) en kleurt het advies direct rood (*Koekblik Dag*).
- **🌦️ Flexibel (`flexible`, standaard)**: Een lichte bui of motregen (<0,8 mm) neem je voor lief met een geel advies (*"Regenpak mee!"*), maar aanhoudende of zware regenval wordt vermeden.
- **🌧️ Doorrijder (`all_weather`)**: Je beschikt over een hoogwaardig waterdicht motorpak en pinlock-vizier. Regendumpingen worden milder gewaardeerd; alleen extreme hoosbuien en storm sturen je naar het ov.
- **🧤 Verwarmde handschoenen / Handvatverwarming**: Schakel je verwarmde uitrusting in, dan wordt de koude-aftrek zolang de temperatuur $\ge 3^\circ\text{C}$ is verlaagd van **-20 punten naar slechts -5 punten**. Je behoudt soepele remvingers en het kledingadvies adviseert direct verwarmde handschoenen.
- **⚠️ Koud & Nat wegdek (< 7°C Compound Risico)**: Onder 7°C verliest motorbandenrubber zijn elasticiteit en warmt het nauwelijks op. In combinatie met een nat wegdek geldt een **samengestelde aftrek van -22 punten** en halveert de asfaltgrip naar 50%.
- **🍂 Herfstseizoen (September t/m December)**: Natte bladeren op het wegdek gedragen zich als nat ijs. Bij regen of harde wind in de herfst berekent het algoritme preventief **-8 punten aftrek** voor slipgevaar.
- **🚨 Instant No-Go's (Onvoorwaardelijk Rood)**: Gladheid, ijzel, vorst of sneeuw ($\le 1{,}5^\circ\text{C}$ of wintercodes), zware stormstoten (>75 km/u), onweer (WMO 95-99) en wolkbreuken (>3,5 mm) leiden **altijd** direct tot een rode *Instant No-Go*, ongeacht jouw uitrusting of toleranties!

| Risicofactor | Situatie / Drempel | Doorrijder | Flexibel | Droogrijder | Status & Veiligheidsreden |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **🚨 IJzel / Vorst / Sneeuw** | Temp $\le$ 1.5°C of wintercode | **-65 pt** | **-65 pt** | **-65 pt** | 🔴 **Instant No-Go**: *Levensgevaarlijk glad asfalt!* |
| **🚨 Stormstoten** | Piekstoten > 75 km/u | **-55 pt** | **-55 pt** | **-55 pt** | 🔴 **Instant No-Go**: *Gevaarlijke stormstoten (>75 km/u)* |
| **🚨 Onweer of hagel** | WMO-code 95, 96, 97, 99 | **-60 pt** | **-60 pt** | **-60 pt** | 🔴 **Instant No-Go**: *Onweer, valwinden en hagel* |
| **🚨 Wolkbreuk / Stortvloed**| Neerslag > 3.5 mm | **-45 pt** | **-55 pt** | **-60 pt** | 🔴 **Instant No-Go**: *Zicht nihil en aquaplaninggevaar* |
| **⚠️ Koud & nat wegdek** | Temp $\le$ 7°C én neerslag $\ge$ 0.15 mm | **-22 pt** | **-22 pt** | **-22 pt** | 🟡 **Compound risico**: *Bandenwarmte nihil & brugbevriezing* |
| **🍂 Herfstbladerdek** | Sep-Dec én (nat asfalt of stoten $\ge$ 40) | **-8 pt** | **-8 pt** | **-8 pt** | 🟡 **Herfstfactor**: *Bladeren gedragen zich als nat ijs* |
| **Stevige regenbui** | 2.0 – 3.5 mm neerslag | **-25 pt** | **-35 pt** | **-50 pt** | 🟡 Geel (Doorrijder) / 🔴 Rood (Droogrijder) |
| **Matige regenbui** | 0.8 – 2.0 mm neerslag | **-15 pt** | **-24 pt** | **-38 pt** | 🟡 Geel: *Regenpak en pinlock aan* |
| **Lichte bui / motregen** | 0.15 – 0.8 mm neerslag | **-8 pt** | **-18 pt** | **-28 pt** | 🟢 Groen (Doorrijder) / 🟡 Geel (Flexibel) / 🔴 Rood (Droog) |
| **Enkel spatje neerslag** | 0.05 – 0.15 mm | **-3 pt** | **-6 pt** | **-10 pt** | 🟢 Groen: *Minimaal spatje, wegdek begaanbaar* |
| **Boven persoonlijke windlimiet** | Stoten boven ingestelde limiet | **-20 tot -30 pt** | **-20 tot -30 pt** | **-20 tot -30 pt** | 🟡 Geel: *Merkbare zijwind op open stukken* |
| **Kou (met verwarmde handschoenen 🧤)** | Temp < minTemp maar $\ge$ 3°C | **-5 pt** | **-5 pt** | **-5 pt** | 🟢/🟡 *Vingers blijven warm en soepel* |
| **Kou (zonder verwarmde handschoenen)** | Temp < ingestelde minimum | **-20 pt** | **-20 pt** | **-20 pt** | 🟡 Geel: *Koud - thermokleding vereist* |
| **Hitte in motorpak** | Temperatuur > 31°C | **-20 pt** | **-20 pt** | **-20 pt** | 🟡 Geel: *Erg warm in motorpak (>30°C)* |

#### 3. Scoregrenzen & Verdicten
- 🟢 **80 – 100 pt (🏍️ RIDE ON!)**: Ideale omstandigheden. Droog asfalt, kalme wind en veilige temperatuur.
- 🟡 **50 – 79 pt (⚠️ OPLETTEN)**: Wisselvallig of nat: lichte buien op de route, stevige wind of kou. Goed te doen met motorkleding & regenpak!
- 🔴 **< 50 pt (🚗 DIE HARD ONLY / KOEKBLIK DAG)**: Onveilige condities of droogrijder-uitsluiting. Pak liever de auto of het OV!

#### 4. Hoe Combinaties in de Praktijk Werken
- **All-weather rijder met lichte bui**: Een bui van 0.4 mm (-12 pt) $\rightarrow$ Score: **88/100 (🟡 Geel / Opletten: Regenpak mee)**. Geen rode status!
- **All-weather rit met matige bui + wind**: Windstoten 48 km/u (-10 pt) + bui van 1.0 mm (-20 pt) $\rightarrow$ Score: **70/100 (🟡 Geel)**.
- **Droogrijder met bui**: Zelfde bui van 0.4 mm (-28 pt) $\rightarrow$ Score zakt direct onder 80, en bij regen over het hele traject kleurt de status direct **🔴 Rood**.
- **Instant No-Go situatie**: IJzelkans bij 1°C (-60 pt) of stormstoten van 80 km/u (-55 pt) $\rightarrow$ Score: **< 35 pt (🔴 NO-GO!)**, onafhankelijk van regenvoorkeur.

#### 5. Het "Zwakste Schakel"-principe
Het uiteindelijke dagadvies wordt bepaald door de **laagste score** van de ochtend- en avondrit (`minScore = Math.min(morning, evening)`):
> *Als de ochtendrit een score van **95/100 (droog)** heeft, maar de terugreis heeft regen (**score 72/100**), dan toont de app direct een **🟡 Oranje advies ("Heenrit droog, maar bui verwacht bij de terugreis. Regenpak mee!")**.*  
Hierdoor word je nooit misleid door een groen ochtendweerbericht wanneer je 's middags door de regen moet rijden.

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
 
- **📍 Gecentreerde Motorrit-, Locatie- & Voorkeurenkiezer in de Navigatiebalk (`#route-planner-modal`)**:
  Midden in de navigatiebalk (op mobiel én desktop direct met de duim bereikbaar) staat jouw actieve motorroute als interactieve pill-knop (bijv. `Utrecht ➔ Amersfoort`). Eén klik opent direct het scherm voor **Motorrit, Locaties & Ritvoorkeuren**:
  - **Motorrit (Van A naar B)**: Bepaal vertrek (A) en bestemming (B) via live zoeken, GPS of snelle stedenknoppen, met wisselknop (⇄) en automatische routecorridor-berekening (inclusief tussenstop en wegafstand).
  - **Rijvoorkeuren & Toleranties**: Stel jouw gewenste minimumtemperatuur (0-18°C) en maximale windstoot-limiet (35-80 km/u) in.
  - **🧤 Verwarmde handschoenen / Handvatverwarming**: Schakel in voor soepele vingers tot 3°C met gereduceerde koude-aftrek (-5 pt i.p.v. -20 pt).
  - **🌧️ Neerslagtolerantie**: Kies jouw profiel uit **☀️ Droogrijder** (regen vermijden), **🌦️ Flexibel** (standaard) of **🌧️ Doorrijder** (all-weather kleding).
  - **🕒 Woon-werk Vertrektijden**: Pas jouw vaste ochtendvertrek (heen) en avondvertrek (terug) aan met automatische uitwijkvenster-detectie.
  - **Basislocatie (Weerstation)**: Bepaal jouw lokale weerstation voor het actuele weer, de 24-uurs trend en 7-daagse verwachting.
  - Klik op "Rit & Voorkeuren Opslaan" om het advies en alle risicometers direct realtime opnieuw te berekenen.
- **⚙️ Pagina-instellingen & Weergave (`#settings-modal`)**:
  Klik op het tandwiel-icoon rechtsboven voor de algehele website- en dashboard-weergave:
  - **Themakeuze**: Wissel snel tussen Licht (standaard), Automatisch en Donker.
  - **Dashboard-indeling**: Schakel tussen de Uitgebreide Cockpit en de Beknopte Widget.

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
