# E-Auto Ladekosten Rechner & Tarifvergleich

Ein moderner, interaktiver Rechner für E-Auto Ladekosten mit Tarifvergleich und Kartenintegration.

## 🚀 Features

### 📊 Tarifvergleich

- **Übersicht verschiedener Ladetarife** basierend auf ADAC-Daten
- **Echtzeit-Berechnung** der Ladekosten für verschiedene Anbieter
- **Sortierung nach Gesamtkosten** für optimale Übersicht
- **Detaillierte Aufschlüsselung** von Energie-, Zeit- und Grundgebühren

### 🔍 Anbieter-Filter

- **Mehrfach-Auswahl** von Ladetarifen
- **Schnellfilter** "Alle auswählen" / "Alle abwählen"
- **Dynamische Tabellenaktualisierung** basierend auf Auswahl

### 🗺️ Google Maps Integration

- **Interaktive Karte** mit Ladesäulen-Markierungen
- **Unterschiedliche Icons** für AC/DC Ladesäulen
- **Info-Windows** mit detaillierten Stationsinformationen
- **Standort-Erkennung** für personalisierte Ergebnisse
- **Verfügbare Tarife** pro Ladesäule

### 💡 Ladekosten-Rechner

- **Batteriekapazität** und Ladestand-Eingabe
- **Ladeleistung-Auswahl** (3,7kW bis 300kW)
- **Automatische Berechnung** von Ladezeit und -kosten
- **Echtzeit-Updates** bei Parameteränderungen

### 🎨 Design

- **Minimalistisches, cleanes Design**
- **Responsive Layout** für alle Geräte
- **Moderne UI-Elemente** mit Hover-Effekten
- **Fancy Animationen** und Übergänge
- **Gradient-Hintergründe** und Schatten

## 🛠️ Technische Details

### Verwendete Technologien

- **HTML5** - Semantische Struktur
- **CSS3** - Moderne Styling mit CSS Grid/Flexbox
- **JavaScript ES6+** - Klassenbasierte Architektur
- **Google Maps API** - Kartenintegration
- **Font Awesome** - Icons
- **Google Fonts** - Inter Schriftart

### Dateistruktur

```
pages/calculator/
├── calculator.html    # Haupt-HTML-Datei
├── styles.css        # CSS-Styling
├── calculator.js     # JavaScript-Funktionalität
└── tariffs.json      # Ladetarife-Daten
```

### Ladetarife (basierend auf ADAC-Daten)

- **Aral Pulse (ADAC)** - 0,57 €/kWh (AC)
- **Qwello NRW** - 0,49 €/kWh + 0,02 €/min (AC)
- **Mobility+ Fremd** - 0,84 €/kWh + 0,10 €/min (DC)
- **Aral Pulse ADAC Roaming** - 0,75 €/kWh + 0,15 €/min (DC)
- **Tesla Supercharger** - 0,52 €/kWh + 9,99 €/Monat (DC)
- **Ionity** - 0,79 €/kWh (DC)
- **Fastned** - 0,69 €/kWh (DC)
- **Shell Recharge** - 0,65 €/kWh (DC, dynamische Preise)

## 🚀 Installation & Setup

### Voraussetzungen

- Webserver (Apache, Nginx, oder lokaler Server)
- Google Maps API Key

### Setup

#### Option 1: User-Provided API Key (Recommended for GitHub Pages)

1. **Google Maps API Key** erstellen:

   - Besuche [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Erstelle einen neuen API Key mit Maps JavaScript API
   - Beschränke den Key auf deine Domain (z.B. `yourusername.github.io`)

2. **API Key im Browser** hinzufügen:
   - Öffne die Browser-Konsole (F12)
   - Führe folgenden Code aus:
   ```javascript
   localStorage.setItem(
     "secrets",
     JSON.stringify({
       googleMapsApiKey: "YOUR_ACTUAL_API_KEY_HERE",
     })
   );
   ```
   - Seite neu laden

#### Option 2: Build-Time Injection (For CI/CD)

1. **GitHub Secrets** konfigurieren:

   - Repository Settings → Secrets and variables → Actions
   - Füge `GOOGLE_MAPS_API_KEY` hinzu

2. **GitHub Actions Workflow** erstellen (siehe `.github/workflows/deploy.yml`)

#### Option 3: Lokale Entwicklung

1. **secrets.json** erstellen:

   ```bash
   cp secrets.json.example secrets.json
   # Bearbeite secrets.json und füge deinen API Key ein
   ```

2. **Dateien auf Webserver** hochladen

3. **Browser öffnen** und `calculator.html` aufrufen

### Lokale Entwicklung

```bash
# Mit Python
python -m http.server 8000

# Mit Node.js
npx serve .

# Mit PHP
php -S localhost:8000
```

## 📱 Responsive Design

Das Design ist vollständig responsive und optimiert für:

- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (bis 767px)

## 🎯 Verwendung

### Ladekosten berechnen

1. **Batteriekapazität** eingeben (z.B. 64 kWh)
2. **Aktuellen Ladestand** einstellen (z.B. 20%)
3. **Ziel-Ladestand** wählen (z.B. 80%)
4. **Ladeleistung** auswählen (z.B. 50 kW DC)
5. **Ergebnisse** werden automatisch aktualisiert

### Anbieter filtern

1. **Checkboxen** für gewünschte Anbieter aktivieren/deaktivieren
2. **"Alle auswählen"** für komplette Übersicht
3. **"Alle abwählen"** für gezielte Suche

### Karte nutzen

1. **"Meine Position"** für Standort-basierte Suche
2. **Ladesäulen-Marker** anklicken für Details
3. **"Aktualisieren"** für neue Stationsdaten

## 🔧 Anpassungen

### Neue Ladetarife hinzufügen

In `tariffs.json` einen neuen Tarif hinzufügen:

```json
{
  "id": "neuer-anbieter",
  "name": "Neuer Anbieter",
  "type": "DC",
  "pricePerKwh": 0.65,
  "pricePerMin": 0.0,
  "baseFee": 0.0,
  "description": "Beschreibung des Tarifs"
}
```

**JSON-Struktur:**

- `id`: Eindeutige Kennung (kebab-case)
- `name`: Anzeigename des Anbieters
- `type`: "AC" oder "DC" für Ladeart
- `pricePerKwh`: Preis pro Kilowattstunde in Euro
- `pricePerMin`: Preis pro Minute in Euro (0.00 wenn nicht anwendbar)
- `baseFee`: Grundgebühr in Euro (0.00 wenn nicht anwendbar)
- `description`: Beschreibung des Tarifs

### Styling anpassen

CSS-Variablen in `styles.css` ändern:

```css
:root {
  --primary-color: #2563eb; /* Hauptfarbe */
  --secondary-color: #64748b; /* Sekundärfarbe */
  --success-color: #10b981; /* Erfolgsfarbe */
  /* ... weitere Variablen */
}
```

## 📊 Datenquellen

- **Ladetarife**: [ADAC E-Auto Ladesäulen Strompreise](https://www.adac.de/rund-ums-fahrzeug/elektromobilitaet/laden/elektroauto-ladesaeulen-strompreise/)
- **Ladesäulen-Daten**: Beispiel-Daten für Demo-Zwecke
- **Preise**: Stand 2025, regelmäßige Updates empfohlen

## 🤝 Beitragen

Verbesserungsvorschläge und Bug-Reports sind willkommen!

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz.

---

**Entwickelt mit ❤️ für die E-Mobilität**
