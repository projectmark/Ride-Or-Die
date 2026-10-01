# 🏍️ Ride Or Die Weather Web App

> **De ultieme Single-Page Weer- & Motorcockpit voor Nederland, aangedreven door het numerieke KNMI Harmonie-AROME 2km weermodel.**

---

## ⚡ TL;DR — Belangrijkste Features op een rij

- **🏍️ Woon-Werk Motoradvies (Commute Command Center)**:
  Beantwoordt direct de belangrijkste vraag: *"Kan ik vandaag veilig en droog met de motor naar het werk en weer terug?"*. Analyseert jouw specifieke vertrektijd voor de **ochtendrit (heen)** en **avondrit (terug)**, toont een directe score (*Index 0-100*) en een duidelijk verdict: 🟢 **RIDE ON!**, 🟡 **PAS OP!** of 🔴 **RIDE OR DIE!**.
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
- **⏱️ Slimme Tijdlijn (Vanaf afgelopen uur)**:
  Begint exact bij het afgelopen uur en toont wat er aankomt (`het afgelopen uur + komende 24 uur`), met visuele highlights voor het actuele uur en jouw woon-werktijden.
- **📱 100% Schaalbaar & Responsief**:
  Volledig geoptimaliseerd tegen tekstoverlap en afsnijden. Schaalt vloeiend van compacte 7-8 inch cockpit-schermen en desktop breedbeeld tot smartphones (met gecentreerde mobiele navigatie).
- **🚀 100% Single-File & Standalone**:
  Alle HTML, CSS en JavaScript bevindt zich in één enkel `index.html` bestand. Geen build tools, geen Node.js, geen externe server en **geen Python** vereist. Werkt direct in elke moderne webbrowser.

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

## 🚀 Direct Gebruiken

De app is 100% self-contained in `index.html` en vereist geen installatie, server of build-proces:
- Dubbelklik op `index.html` of open het bestand in een moderne browser (Chrome, Edge, Safari, Firefox).
- Alle instellingen (locatie, reistijden, thema en eenvoudige weergave) worden automatisch lokaal in je browser opgeslagen via `localStorage`.

---

## 📄 Licentie

Gepubliceerd onder de **MIT License (Open Source)**.  
Copyright &copy; 2026 Mark Tapking.
