# 🏍️ Ride Or Die Weather Web App

Een moderne, expressieve **Single Page Weerapplicatie & Motor Commute Cockpit**, speciaal ontworpen voor Nederland en aangedreven door het open-source **KNMI Harmonie-AROME weermodel** (2 km rasterresolutie).

De web app beantwoordt direct de belangrijkste vraag van elke motorrijder:
> *"Kan ik vandaag veilig en comfortabel met de motor naar het werk ('s ochtends heen en aan het einde van de dag weer terug)?"*

---

## ✨ Kenmerken & Optimalisaties

- **📱 Geoptimaliseerd voor 7 & 8 inch Schermen (1280x720 / 1280x800p)**:
  - Speciaal geproportioneerd voor compacte touchscreens, car/bike dashboard displays, mini tablets en desktop widgets.
  - Slimme 3-koloms cockpit lay-out die binnen de schermhoogte blijft en in één oogopslag alle vitale parameters toont.
  - Inclusief **Volledig Scherm (Kiosk Mode)** toggleknop om randloos op een display te draaien.
- **🇳🇱 Direct aangedreven door KNMI Harmonie-AROME (2km)**:
  - Gebruikt het officiële numerieke weermodel van het KNMI (via Open-Meteo `knmi_seamless`), geoptimaliseerd voor lokale Nederlandse buiencomplexen en windstoten.
- **🏍️ "Ride Or Die" Commute Command Center**:
  - **Ochtendrit (Heen)** vs **Avondrit (Terug)** analyse op basis van jouw eigen vertrektijden.
  - **Duidelijke Verdicts**: 🟢 *Groen licht (Ride On)*, 🟡 *Alert zijn (Wisselvallig/Zijwind)*, of 🔴 *Koekblik Dag (Blijf binnen of pak de auto)*.
  - **4 Veiligheidsmeters**: Wind & Zijwind (inclusief Beaufort & stoten), Wegdek & Grip (droog/nat/ijzel), Regenkans & mm neerslag, en Thermisch Comfort.
  - **Uitrusting & Kledingadvies**: Automatisch advies voor doorwaaijas, thermovoering, regenpak, handschoenen en vizierkeuze.
- **🎨 Material You 3 Expressive & Android Gradient Weather Design**:
  - Vloeiende, dynamische achtergrond-gradients die meekleuren met het weer en dag/nacht.
  - Acryl / Frosted Glass effecten (`backdrop-filter: blur(24px)`, subtiele borders en dieptewerking).
- **📍 GPS & Plaatskeuze**:
  - Direct je huidige GPS-locatie bepalen of zoeken op elke Nederlandse plaatsnaam of postcode.
  - Snelle selectieknoppen voor steden als Utrecht, Amsterdam, Rotterdam, Den Haag, Eindhoven, Groningen, etc.
- **⚙️ Volledig Aanpasbaar**:
  - Stel je eigen vertrektijden in (bijv. 07:30 heen, 17:00 terug).
  - Stel je eigen temperatuur-ondergrens en maximale windstoot-tolerantie in.
  - Instellingen worden lokaal bewaard (`localStorage`).
- **⚡ 100% Single-Page & GitHub Pages Compatible**:
  - Alles bevindt zich in één enkel `index.html` bestand. Geen build-stappen (geen Node.js, geen Python, geen bundlers vereist).

---

## 🚀 Publiceren naar GitHub Pages

Je kunt deze applicatie in minder dan 1 minuut live zetten op GitHub Pages:

1. Maak een nieuwe repository aan op GitHub, bijvoorbeeld genaamd `RideOrDieWeather`.
2. Upload of commit `index.html` naar de `main` (of `master`) branch.
3. Ga in GitHub naar **Settings** -> **Pages**.
4. Kies onder **Build and deployment** bij Source voor **Deploy from a branch**.
5. Selecteer branch `main` en map `/ (root)`, en klik op **Save**.
6. Na circa 30 seconden is je pagina live op:
   ```
   https://<jouw-github-gebruikersnaam>.github.io/RideOrDieWeather/
   ```

---

## 🛠️ Technische Details

- **Bestand**: `index.html` (bevat HTML, CSS en JavaScript)
- **API Weerdata**: Open-Meteo API met parameter `models=knmi_seamless` (KNMI Harmonie-AROME 2km dataset)
- **API Geocoding**: Open-Meteo Geocoding API (Nederlandse zoekresultaten zonder API sleutel)
- **Fonts**: Google Fonts (*Outfit*, *Plus Jakarta Sans*, *JetBrains Mono*)
