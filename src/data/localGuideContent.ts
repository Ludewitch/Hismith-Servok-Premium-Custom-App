export const LOCAL_GUIDE_TEXT = `================================================================================
  HISMITH SERVOK PREMIUM H2 STUDIO — BEDIENUNGSANLEITUNG & SETUP GUIDE
================================================================================

[DE] DEUTSCH — AUSFÜHRLICHE ANLEITUNG & STEP-BY-STEP SETUP
--------------------------------------------------------------------------------
🔥 WICHTIGER RECHTLICHER HINWEIS:
Diese Anwendung steht in keiner offiziellen Verbindung zu Hismith.
Die Software ist spezialisiert und optimiert für den Hismith Servok Premium H2 / S2
sowie kompatible Servok-Linearaktoren mit Hismith BLE-Protokoll.
Nutzung auf eigene Gefahr und Verantwortung.

WILLKOMMEN IM OBSIDIAN KINETIC COCKPIT!
Erlebe modernste audiophile Haptik, fließende 2D-Einhand-Gestensteuerung,
eine interaktive Vorlagen-Bibliothek in 10 harmonisierten Kategorien,
das neue Einstellungen-System mit 10+10 Akzentfarben sowie professionelle 4-Spur-Kurvenbearbeitung.

================================================================================
1. NEU: 1-KLICK STARTER & VERKNÜPFUNGSDATEIEN AM PC
================================================================================

Im Hauptordner der Anwendung stehen dir fertige Verknüpfungs- und Starterdateien
zur Verfügung, damit du die App ohne Terminal-Befehle oder Programmierkenntnisse
direkt mit einem Mausklick wie ein reguläres Desktop-Programm ausführen kannst:

A) "Desktop_Verknuepfung_erstellen.bat" (Empfohlen für Windows):
   - Führe diese Datei einmalig per Doppelklick aus.
   - Erstellt automatisch eine fertige Desktop-Verknüpfung namens
     "Hismith Servok Premium Studio.lnk" direkt auf deinem Windows-Desktop!
   - Künftig startest du die App einfach mit einem Doppelklick auf dieses Desktop-Icon.
     Die Verknüpfung führt "start_windows.bat" im Hintergrund aus, startet den Server
     automatisch und öffnet direkt deinen persönlichen Standard-Webbrowser!

B) "start_windows.bat" (1-Klick Windows Starter):
   - Startet die Anwendung sofort per Doppelklick.
   - Prüft vollautomatisch, ob Node.js installiert ist (mit direktem Download-Link falls nicht).
   - Installiert beim ersten Start alle benötigten Pakete automatisch ("npm install").
   - Startet den lokalen Server im Hintergrund (erkennt auch, wenn er bereits läuft).
   - Öffnet direkt und ausschließlich deinen persönlichen Standard-Webbrowser auf http://localhost:3000.

C) "Hismith_Servok_Studio.url" (Browser-Direktlink):
   - Internet-Verknüpfung für den schnellen Wiederaufruf im Browser unter http://localhost:3000/.

D) "start_mac_linux.sh" & "start_local.js" (Für macOS & Linux):
   - Startet Server und Standard-Browser auf Apple Mac und Linux-Systemen mit einem Klick bzw. Befehl.

================================================================================
2. STEP-BY-STEP ANLEITUNG: LOKALE VERWENDUNG AM PC
================================================================================

--------------------------------------------------------------------------------
VARIANTE 1: DER SCHNELLE 1-KLICK START (WINDOWS EMPFOHLEN)
--------------------------------------------------------------------------------

SCHRITT 1: EINMALIGE VORAUSSETZUNG (NODE.JS)
- Lade Node.js (kostenlose LTS-Version 18 oder neuer) herunter und installiere es:
  --> https://nodejs.org/
- Bestätige die Standard-Installationsoptionen. Ein Neustart des PCs ist meist nicht nötig.

SCHRITT 2: DESKTOP-ICON ANLEGEN
- Öffne den Ordner, in dem sich die Hismith Servok Studio Dateien befinden.
- Mache einen Doppelklick auf die Datei:
  --> "Desktop_Verknuepfung_erstellen.bat"
- Du erhältst die Bestätigung: "[ERFOLG] Die Verknuepfung wurde auf deinem Desktop erstellt!"
- Auf deinem Desktop findest du nun das Icon "Hismith Servok Premium Studio".

SCHRITT 3: APP STARTEN
- Mache einen Doppelklick auf die neue Desktop-Verknüpfung
  (oder direkt im Ordner auf "start_windows.bat").
- Es öffnet sich kurz ein Konsolenfenster:
  1. Node.js wird verifiziert.
  2. Fehlende Pakete werden beim ersten Start automatisch installiert.
  3. Der Server fährt auf Port 3000 hoch.
  4. Dein Standard-Webbrowser öffnet sich direkt: http://localhost:3000
- Das Konsolenfenster minimiert sich und kann während der Nutzung geöffnet bleiben.

SCHRITT 4: BLUETOOTH-KOPPLUNG & HARDWARE-START
- Schalte deinen Hismith Servok Premium Linearaktor ein (blaue LED blinkt/leuchtet).
- Klicke in der Web-App oben rechts auf "Servok Verbinden" oder im Startmenü auf "Jetzt koppeln".
- Der Browser öffnet den Bluetooth-Suchdialog.
- Wähle dein Servok-Gerät (z. B. "Servok-H2" oder "Hismith-BLE") und klicke auf "Koppeln".
- Das Gerät wird gekoppelt und in deinen Einstellungen hinterlegt.

SCHRITT 5: AUTO-RECONNECT (KÜNFTIG VOLLAUTOMATISCH)
- In den Einstellungen (Reiter "Geräte") ist der Auto-Reconnect standardmäßig aktiv.
- Wenn du die App beim nächsten Mal startest, sucht sie automatisch nach deinen gekoppelten
  Geräten und stellt die Verbindung ohne erneuten Suchdialog wieder her!

SCHRITT 6: PERSÖNLICHE EINSTELLUNGEN & DESIGN (servok-settings.json)
- Alle getroffenen Anpassungen (Design, 10+10 Akzentfarben, Startkadenz, SPM-Modus, gekoppelte Geräte)
  werden bei lokaler Ausführung in der Datei "servok-settings.json" im Anwendungsordner gespeichert.
- Beim nächsten Start liest die App diese Datei automatisch ein – deine Einstellungen gehen nie verloren.

--------------------------------------------------------------------------------
VARIANTE 2: START ÜBER MACOS ODER LINUX
--------------------------------------------------------------------------------

SCHRITT 1: Node.js (v18+) von https://nodejs.org/ installieren.
SCHRITT 2: Terminal im App-Ordner öffnen.
SCHRITT 3: Ausführrechte einmalig setzen:
           chmod +x start_mac_linux.sh
SCHRITT 4: Skript ausführen:
           ./start_mac_linux.sh
           (oder alternativ: node start_local.js)
SCHRITT 5: Google Chrome oder Chromium auf http://localhost:3000 öffnen.

--------------------------------------------------------------------------------
VARIANTE 3: KLASSISCHER ENTWICKLER-START VIA TERMINAL
--------------------------------------------------------------------------------

SCHRITT 1: Terminal im Ordner öffnen.
SCHRITT 2: npm install
SCHRITT 3: npm run dev
SCHRITT 4: Browser aufrufen: http://localhost:3000

================================================================================
3. DIE NEUEN CORE-FEATURES IM ÜBERBLICK
================================================================================

A) NEUES MENÜ "EINSTELLUNGEN" (KOPFZEILE ODER STARTMENÜ):
   - Reiter 1: "Design & Akzentfarben":
     * OLED Darkmode und Soft Lightmode, kombiniert mit Warm/Cold-Nuance.
     * 10 kuratierte Akzentfarben für Darkmode (Electric Cyan, Sensual Rose, Ultraviolet Neon,
       Champagne Amber, Emerald Silk, Crimson Passion, Celestial Blue, Orchid Blush, Cyber Lime,
       Titanium Platinum).
     * 10 kuratierte Akzentfarben für Lightmode (Royal Mulberry, Rose Terracotta, Sapphire Indigo,
       Sunset Peach, Imperial Jade, Golden Honey, Lavender Iris, Ruby Coral, Teal Laguna, Espresso Bronze).
     * Alle Farben wirken sofort in Echtzeit auf Buttons, Kurven, Shader und Glass-Optiken.

   - Reiter 2: "Werte & Standard-Dynamik":
     * Standard-Steuerungsmodus: 0x02 Positions-Wegsteuerung (präzise Tiefenkorridore) oder
       0x01 Geschwindigkeits-Regelung (freier Hub mit Temporegelung).
     * Standard-Dynamik / Umkehr-Sanftheit (Register 0x09: Stufe 1 bis 10 für samtweiche Bremskurven).
     * Standard-Startkadenz (15 bis 240 SPM).
     * Standard-Hubbereich (Min % und Max %).
     * Sensorische Rückmeldung: Klick-Synthesizer, Mobil-Vibration und Display Wake-Lock.

   - Reiter 3: "Geräte & Bluetooth Auto-Reconnect":
     * Liste aller gekoppelten / bekannten Bluetooth-Geräte.
     * Schalter "Beim Start automatisch nach gekoppelten Geräten suchen und verbinden".
     * Manuelles Scannen & Koppeln neuer Servok-Hardware.

   - Reiter 4: "Datei & Speicher (servok-settings.json)":
     * Lokale Datei "servok-settings.json" im Anwendungsordner speichert alle Parameter.
     * Schnellexport als JSON-Datei und Import beliebiger Einstellungs-Dateien.

B) INTERAKTIVES FLOATING WINDOW ZUR VORLAGEN-INSPEKTION:
   - Beim Klick direkt in das Wellenform-Vorschaubild einer Vorlage im Katalog öffnet sich
     ein großes, schwebendes Inspektions-Fenster.
   - Vollständige, unbeschnittene Vorlagenbeschreibung für 100%ige Lesbarkeit.
   - Hochauflösende 4-Spur-Wellenform mit interaktivem Maus-/Touch-Scrubbing.
   - Echtzeit-Telemetrie-Dock: Sekundengenaue Anzeige von Hub-Korridor (in cm und mm),
     Amplitude, SPM-Tempo und Umkehr-Sanftheit.
   - Integrierte Audio-Simulation mit rhythmischen Web-Audio-Ticks.
   - Phasen-Aufbau (Subsections) und automatisierte Gleitmittel-Impulse.
   - Direkte Buttons zum Laden in den Editor oder zum Sofortstart via Bluetooth.

C) EIGENSTÄNDIGER EINHAND-PAD PLAYER MIT LIVE-RECORDING:
   - Erreichbar direkt über das Hauptmenü und den Startbildschirm.
   - 2D-Gestenfläche zur synchronen Regelung von Hubtiefe (Y-Achse) und Tempo (X-Achse).
   - "● REC"-Funktion: Zeichnet deine manuellen Gesten in Echtzeit als 4-Spur-Session auf.
   - Speichern als eigene Vorlage mit frei wählbarem Titel, Beschreibung und Kategorie.

D) 4-SPUR STUDIO-EDITOR:
   - Feinjustierung von Min-Tiefe, Max-Tiefe, SPM-Kadenz und Stoß-Härte.
   - Phasenunterteilung (Subsections) und Gleitmittel-Trigger setzen.
   - Eigene Sessions dauerhaft in den Vorlagen-Katalog aufnehmen.

E) MINIMALISTISCHES STARTMENÜ (OBSIDIAN KINETIC COCKPIT):
   - Kinetische Konsolen für Einhand-Pad, Vorlagen-Katalog (240+ Profile) und 4-Spur-Studio.
   - Aufklappbares Untermenü für erweiterte Werkzeuge (Datei-Import, Browser-Archiv, Einstellungen, Hilfe).
   - "Ausgewählte Kompositionen" vollständig entfernt für maximale Übersichtlichkeit.

================================================================================
4. SICHERHEIT & HARDWARE-NOT-AUS
================================================================================
- Der rote Not-Aus-Button schwebt stets griffbereit über der Benutzeroberfläche.
- Tastatur-Hotkeys am PC:
  * LEERTASTE: Not-Aus / Sofortiger Motor-Stopp (BLE Register 0x02 + 0x03 auf 0).
  * ESC-Taste: Schließt offene Detail- oder Einstellungsfenster.

--------------------------------------------------------------------------------

[EN] ENGLISH — SETUP GUIDE & STEP-BY-STEP INSTRUCTIONS
--------------------------------------------------------------------------------
🔥 LEGAL DISCLAIMER:
This software is not officially affiliated with or endorsed by Hismith.
Engineered specifically for Hismith Servok Premium H2 / S2 and compatible BLE actuators.
Use at your own risk.

================================================================================
1. 1-CLICK LAUNCHERS & DESKTOP SHORTCUTS
================================================================================
A) "Desktop_Verknuepfung_erstellen.bat" (Windows Shortcut Creator):
   - Double-click to instantly create a desktop shortcut named "Hismith Servok Premium Studio.lnk".
   - The shortcut starts the server via start_windows.bat and opens your default browser automatically.
B) "start_windows.bat" (Windows 1-Click Launcher):
   - Automatically verifies Node.js, installs dependencies, and launches the app in your default browser.
C) "start_mac_linux.sh" (macOS & Linux):
   - Run in terminal: ./start_mac_linux.sh

================================================================================
2. STEP-BY-STEP SETUP GUIDE (WINDOWS)
================================================================================
STEP 1: Install Node.js (v18+) from https://nodejs.org/.
STEP 2: Double-click "Desktop_Verknuepfung_erstellen.bat" to create your Desktop icon.
STEP 3: Double-click the new Desktop icon (or "start_windows.bat") to start the studio.
STEP 4: Turn on your Hismith Servok Premium and click "Connect Servok" via Web Bluetooth.
STEP 5: Future connections will reconnect automatically via the built-in Auto-Reconnect feature!
STEP 6: Customize your preferences in Settings (10+10 colors, cadence, dynamic mode).
        All settings are saved locally to "servok-settings.json".
================================================================================
`;
