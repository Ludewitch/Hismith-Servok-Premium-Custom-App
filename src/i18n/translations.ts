export type Language = 'de' | 'en' | 'es';

export interface Translations {
  // Navigation & Header
  appTitle: string;
  appSubtitle: string;
  versionBadge: string;
  languageLabel: string;
  helpButton: string;
  performanceModeLabel: string;
  startpageBtn: string;
  presetsBtn: string;
  presetsCatalogTitle: string;
  newBtn: string;
  loadImportBtn: string;
  aiGeneratorBtn: string;
  saveExportBtn: string;
  bleConnectBtn: string;
  bleDisconnectBtn: string;
  openNewTabBtn: string;
  padViewBtn: string;
  editorViewBtn: string;
  settingsBtn: string;
  emergencyStopBtn: string;
  emergencyStopTitle: string;
  modulesOrderBtn: string;
  modulesOrderTitle: string;

  // Preset Catalog & Filters
  presetCatalogHeader: string;
  profilesCountLabel: string;
  customPresetsTitle: string;
  searchPresetsPlaceholder: string;
  tracksLabel: string;
  durationLabel: string;
  characterLabel: string;
  categoryLabel: string;
  subcategoryLabel: string;
  allLabel: string;
  allCategoriesLabel: string;
  allSubcategoriesLabel: string;
  shortDurationLabel: string;
  mediumDurationLabel: string;
  longDurationLabel: string;
  softIntensityLabel: string;
  mediumIntensityLabel: string;
  intenseIntensityLabel: string;
  openInEditorBtn: string;
  playDirectBtn: string;
  noPresetsFound: string;
  noPresetsFoundDesc: string;
  resetFiltersBtn: string;
  backToStartMenu: string;
  toStudioEditor: string;

  // Start Screen Page
  startModalTitle: string;
  startModalSubtitle: string;
  manualTitle: string;
  manualDesc: string;
  manualBtn: string;
  generatorTitle: string;
  generatorDesc: string;
  generatorBtn: string;
  uploadTitle: string;
  uploadDesc: string;
  uploadBtn: string;
  appStorageBtn: string;
  quickPresetsTitle: string;
  quickPresetsDesc: string;

  // Editor Labels & Controls
  layerMinDepth: string;
  layerMaxDepth: string;
  layerSpm: string;
  layerHardness: string;
  playBtn: string;
  pauseBtn: string;
  stopBtn: string;
  loopBtn: string;
  addPointBtn: string;
  snapBtn: string;
  clearBtn: string;
  undoBtn: string;
  redoBtn: string;

  // Settings & Dev Tools
  settingsModalTitle: string;
  settingsModalSubtitle: string;
  devToolsTitle: string;
  openInNewTabDesc: string;
  
  // Footer Disclaimer
  footerTitle: string;
  footerDisclaimerNotice: string;
  footerHardwareNote: string;

  // Help Modal Tabs
  helpTabLayers: string;
  helpTabGenerator: string;
  helpTabLimits: string;
  helpTabSubsections: string;
  helpTabBle: string;
  helpTabStorage: string;
  helpTabLocalUse: string;

  // Help Modal Header & Download
  helpHeaderTitle: string;
  helpHeaderSubtitle: string;
  downloadLocalTxtBtn: string;

  // Help Content Local Setup
  localSetupHeading: string;
  localSetupDesc: string;
  localCostHeading: string;
  localCostDesc: string;
  localSecurityHeading: string;
  localSecurityDesc: string;
  localStepsHeading: string;
  localStep1: string;
  localStep2: string;
  localStep3: string;
  localStep4: string;
  localStep5: string;
}

export const translations: Record<Language, Translations> = {
  de: {
    appTitle: 'Hismith Servok Studio',
    appSubtitle: 'Kinetic Cockpit & Mechatronic Motion Studio',
    versionBadge: 'V0.9',
    languageLabel: 'Sprache',
    helpButton: 'Anleitung & Hilfe',
    performanceModeLabel: 'Energiesparmodus',
    startpageBtn: 'Startseite',
    presetsBtn: 'Vorlagen',
    presetsCatalogTitle: 'Vorlagen-Katalog',
    newBtn: 'Neu',
    loadImportBtn: 'Laden / Import',
    aiGeneratorBtn: 'Generator',
    saveExportBtn: 'Speichern & Export',
    bleConnectBtn: 'BLE Verbinden',
    bleDisconnectBtn: 'Getrennt',
    openNewTabBtn: 'Im neuen Tab öffnen',
    padViewBtn: 'Einhand-Pad',
    editorViewBtn: 'Studio-Editor',
    settingsBtn: 'Einstellungen',
    emergencyStopBtn: 'STOP',
    emergencyStopTitle: 'NOT-STOPP: Motor und Wiedergabe sofort stoppen (0x04: 0)',
    modulesOrderBtn: 'Module',
    modulesOrderTitle: 'Dashboard-Anordnung anpassen (Felder verschieben oder ausblenden)',

    presetCatalogHeader: 'Servok Vorlagen-Katalog',
    profilesCountLabel: 'Profile',
    customPresetsTitle: 'Eigene Vorlagen',
    searchPresetsPlaceholder: 'Vorlagen durchsuchen (z.B. Sanft, Welle, Turbo, Ausdauer)...',
    tracksLabel: 'Spuren:',
    durationLabel: 'Dauer:',
    characterLabel: 'Charakter:',
    categoryLabel: 'Kategorie:',
    subcategoryLabel: 'Unterkategorie:',
    allLabel: 'Alle',
    allCategoriesLabel: 'Alle Kategorien',
    allSubcategoriesLabel: 'Alle Unterkategorien',
    shortDurationLabel: 'Kurz <5m',
    mediumDurationLabel: 'Mittel 5–15m',
    longDurationLabel: 'Lang >15m',
    softIntensityLabel: 'Sanft & Sinnlich',
    mediumIntensityLabel: 'Geschmeidig & Dynamisch',
    intenseIntensityLabel: 'Kraftvoll & Intensiv',
    openInEditorBtn: 'Im Editor öffnen',
    playDirectBtn: 'Direkt Starten',
    noPresetsFound: 'Keine Vorlagen gefunden',
    noPresetsFoundDesc: 'Für die ausgewählten Filterkriterien wurden keine Vorlagen gefunden.',
    resetFiltersBtn: 'Filter zurücksetzen',
    backToStartMenu: 'Startmenü',
    toStudioEditor: 'Zum Studio-Editor',

    startModalTitle: 'Wie möchtest du deine Session erstellen?',
    startModalSubtitle: 'Wähle aus unserem umfangreichen Vorlagen-Katalog, starte im manuellen 4-Ebenen-Editor oder lade eine bestehende Session-Datei direkt hoch.',
    manualTitle: '1. Manuell Erstellen',
    manualDesc: 'Startet eine leere Session mit deiner definierten Gesamtdauer. Du platzierst Punkte, Oszillationen und Gleitmittel-Trigger manuell im Diagramm.',
    manualBtn: 'Manuell Öffnen',
    generatorTitle: 'Vorlagen-Katalog',
    generatorDesc: 'Wähle aus über 240 mechatronisch optimierten Profilen in 10 Kategorien – von zarter Morgenbrise über harmonische Gezeiten bis zu Grenzerfahrungen.',
    generatorBtn: 'Vorlagen Öffnen',
    uploadTitle: '2. Session Upload & Import',
    uploadDesc: 'Lade eine bestehende Session-Datei (.json, .csv, .fun, .funscript) direkt hoch, um sofort im Editor weiterzuarbeiten.',
    uploadBtn: 'Datei Auswählen',
    appStorageBtn: 'Oder App-Speicher öffnen',
    quickPresetsTitle: 'Schnellstart-Vorlagen',
    quickPresetsDesc: 'Generiere in Sekunden eine fertige Beispiel-Session',

    layerMinDepth: 'Mindesttiefe (%)',
    layerMaxDepth: 'Maximaltiefe (%)',
    layerSpm: 'Stöße / Min (SPM)',
    layerHardness: 'Stoß-Härte (%)',
    playBtn: 'Start',
    pauseBtn: 'Pause',
    stopBtn: 'Stopp',
    loopBtn: 'Schleife',
    addPointBtn: 'Punkt Hinzufügen',
    snapBtn: 'Gitter-Einrasten',
    clearBtn: 'Zurücksetzen',
    undoBtn: 'Rückgängig',
    redoBtn: 'Wiederholen',

    settingsModalTitle: 'Einstellungen',
    settingsModalSubtitle: 'Präferenzen, Hardware-Kopplung & lokale Speicherung',
    devToolsTitle: 'Entwickler- & Test-Werkzeuge',
    openInNewTabDesc: 'App in separatem Browser-Tab öffnen (empfohlen für Web Bluetooth iframe-Isolation)',

    footerTitle: 'Hismith Servok Studio',
    footerDisclaimerNotice: 'Hinweis: Diese Anwendung steht in keiner offiziellen Verbindung zu Hismith.',
    footerHardwareNote: 'Die Software ist optimiert für den Hismith Servok Premium und kompatible lineare Aktor-Hardware. Es handelt sich um eine experimentelle Software – Nutzung auf eigene Gefahr.',

    helpTabLayers: '1. Editor & 4 Ebenen',
    helpTabGenerator: '2. Vorlagen & Upload',
    helpTabLimits: '3. Hub-Grenzen & Physik',
    helpTabSubsections: '4. Abschnitte & Snippets',
    helpTabBle: '5. Dual-Hardware (BLE)',
    helpTabStorage: '6. Speichern & Export',
    helpTabLocalUse: '7. Lokale Verwendung',

    helpHeaderTitle: 'Bedienungsanleitung & Feature-Dokumentation',
    helpHeaderSubtitle: 'Ausführliche Erklärung aller Funktionen, Sicherheitsmechanismen und Anleitung zur lokalen Verwendung',
    downloadLocalTxtBtn: 'Anleitung als .txt Herunterladen',

    localSetupHeading: '🔥 Lokale Verwendung auf dem eigenen PC',
    localSetupDesc: 'Du kannst die gesamte Anwendung vollständig lokal auf deinem PC ausführen – völlig unabhängig, offline-fähig und privat.',
    localCostHeading: 'Entstehen Kosten bei der Nutzung?',
    localCostDesc: 'NEIN! Die Anwendung läuft lokal und Open-Source ohne jegliche versteckte Gebühren oder Abonnements.',
    localSecurityHeading: 'Sind deine Daten lokal geschützt?',
    localSecurityDesc: 'JA! Alle Skripte und Einstellungen verbleiben ausschließlich lokal in deinem Browser und auf deinem eigenen Rechner. Es werden keine Daten an Dritte übertragen.',
    localStepsHeading: 'Step-by-Step Anleitung (1-Klick Start & Verknüpfungen):',
    localStep1: '1. Einmalig: Node.js (v18+) von https://nodejs.org/ installieren.',
    localStep2: '2. Desktop-Verknüpfung erstellen: Einmalig "Desktop_Verknuepfung_erstellen.bat" doppelklicken.',
    localStep3: '3. 1-Klick Start: Doppelklick auf die Verknüpfung startet automatisch den Server und öffnet deinen Standard-Browser.',
    localStep4: '4. Dein persönlicher Standard-Webbrowser öffnet sich direkt auf http://localhost:3000 (ohne Browser-Zwang oder Fehler).',
    localStep5: '5. Servok einschalten, koppeln & loslegen – Einstellungen & Geräte werden automatisch in servok-settings.json gespeichert.',
  },
  en: {
    appTitle: 'Hismith Servok Studio',
    appSubtitle: 'Kinetic Cockpit & Mechatronic Motion Studio',
    versionBadge: 'V0.9',
    languageLabel: 'Language',
    helpButton: 'Guide & Help',
    performanceModeLabel: 'Power Saving Mode',
    startpageBtn: 'Home',
    presetsBtn: 'Presets',
    presetsCatalogTitle: 'Preset Catalog',
    newBtn: 'New',
    loadImportBtn: 'Load / Import',
    aiGeneratorBtn: 'Generator',
    saveExportBtn: 'Save & Export',
    bleConnectBtn: 'Connect BLE',
    bleDisconnectBtn: 'Disconnected',
    openNewTabBtn: 'Open in new tab',
    padViewBtn: 'One-Handed Pad',
    editorViewBtn: 'Studio Editor',
    settingsBtn: 'Settings',
    emergencyStopBtn: 'STOP',
    emergencyStopTitle: 'EMERGENCY STOP: Stop motor and playback immediately (0x04: 0)',
    modulesOrderBtn: 'Modules',
    modulesOrderTitle: 'Customize dashboard module layout and visibility',

    presetCatalogHeader: 'Servok Preset Catalog',
    profilesCountLabel: 'Profiles',
    customPresetsTitle: 'Custom Presets',
    searchPresetsPlaceholder: 'Search presets (e.g. gentle, wave, turbo, endurance)...',
    tracksLabel: 'Tracks:',
    durationLabel: 'Duration:',
    characterLabel: 'Intensity:',
    categoryLabel: 'Category:',
    subcategoryLabel: 'Subcategory:',
    allLabel: 'All',
    allCategoriesLabel: 'All Categories',
    allSubcategoriesLabel: 'All Subcategories',
    shortDurationLabel: 'Short <5m',
    mediumDurationLabel: 'Medium 5–15m',
    longDurationLabel: 'Long >15m',
    softIntensityLabel: 'Gentle & Sensual',
    mediumIntensityLabel: 'Smooth & Dynamic',
    intenseIntensityLabel: 'Powerful & Intense',
    openInEditorBtn: 'Open in Editor',
    playDirectBtn: 'Start Now',
    noPresetsFound: 'No presets found',
    noPresetsFoundDesc: 'No presets matched the currently selected filter criteria.',
    resetFiltersBtn: 'Reset filters',
    backToStartMenu: 'Home Menu',
    toStudioEditor: 'To Studio Editor',

    startModalTitle: 'How would you like to create your session?',
    startModalSubtitle: 'Choose from our extensive preset catalog, build in the manual 4-layer editor, or upload an existing session file directly.',
    manualTitle: '1. Create Manually',
    manualDesc: 'Starts a blank session with your custom duration. Manually place waypoints, oscillations, and lubricant triggers on the chart.',
    manualBtn: 'Open Manual Editor',
    generatorTitle: 'Preset Catalog',
    generatorDesc: 'Choose from over 240 mechatronically tuned profiles in 10 categories – from gentle dawn caresses to harmonic tides and borderline limits.',
    generatorBtn: 'Open Presets',
    uploadTitle: '2. Session Upload & Import',
    uploadDesc: 'Upload an existing session file (.json, .csv, .fun, .funscript) directly to continue editing right away.',
    uploadBtn: 'Select File',
    appStorageBtn: 'Or open App Storage',
    quickPresetsTitle: 'Quick Start Presets',
    quickPresetsDesc: 'Generate a ready-to-play sample session in seconds',

    layerMinDepth: 'Min Depth (%)',
    layerMaxDepth: 'Max Depth (%)',
    layerSpm: 'Strokes / Min (SPM)',
    layerHardness: 'Stroke Hardness (%)',
    playBtn: 'Play',
    pauseBtn: 'Pause',
    stopBtn: 'Stop',
    loopBtn: 'Loop',
    addPointBtn: 'Add Point',
    snapBtn: 'Snap Grid',
    clearBtn: 'Clear All',
    undoBtn: 'Undo',
    redoBtn: 'Redo',

    settingsModalTitle: 'Settings',
    settingsModalSubtitle: 'Preferences, hardware pairing & local file persistence',
    devToolsTitle: 'Developer & Test Tools',
    openInNewTabDesc: 'Open app in separate browser tab (recommended for Web Bluetooth iframe isolation)',

    footerTitle: 'Hismith Servok Studio',
    footerDisclaimerNotice: 'Notice: This application is not officially affiliated with or endorsed by Hismith.',
    footerHardwareNote: 'Optimized for Hismith Servok Premium and compatible linear actuator hardware. This is experimental software – use at your own risk.',

    helpTabLayers: '1. Editor & 4 Layers',
    helpTabGenerator: '2. Presets & Upload',
    helpTabLimits: '3. Stroke Limits & Physics',
    helpTabSubsections: '4. Subsections & Snippets',
    helpTabBle: '5. Dual Hardware (BLE)',
    helpTabStorage: '6. Storage & Export',
    helpTabLocalUse: '7. Local Usage',

    helpHeaderTitle: 'User Manual & Feature Documentation',
    helpHeaderSubtitle: 'Comprehensive guide covering all features, safety controls, and local deployment',
    downloadLocalTxtBtn: 'Download Guide (.txt)',

    localSetupHeading: '🔥 Running Locally on Your Computer',
    localSetupDesc: 'You can run the entire application completely locally on your PC – totally independent, offline-ready, and private.',
    localCostHeading: 'Are there any recurring costs?',
    localCostDesc: 'NO! The application runs locally and open-source without any subscriptions or external fees.',
    localSecurityHeading: 'Is your data safe locally?',
    localSecurityDesc: 'YES! All scripts and settings stay strictly in your browser and on your local machine. No data is shared with third parties.',
    localStepsHeading: 'Step-by-Step Instructions (1-Click Launch & Shortcuts):',
    localStep1: '1. One-time setup: Install Node.js (v18+) from https://nodejs.org/.',
    localStep2: '2. Create shortcut: Double-click "Desktop_Verknuepfung_erstellen.bat" once.',
    localStep3: '3. 1-Click Launch: Double-clicking the shortcut automatically launches the server and opens your default browser.',
    localStep4: '4. Your default web browser opens directly at http://localhost:3000.',
    localStep5: '5. Turn on Servok, connect & start – settings & paired devices persist in servok-settings.json.',
  },
  es: {
    appTitle: 'Hismith Servok Studio',
    appSubtitle: 'Cockpit Cinético y Estudio de Movimiento Mecatrónico',
    versionBadge: 'V0.9',
    languageLabel: 'Idioma',
    helpButton: 'Guía y Ayuda',
    performanceModeLabel: 'Ahorro de energía',
    startpageBtn: 'Inicio',
    presetsBtn: 'Plantillas',
    presetsCatalogTitle: 'Catálogo de Plantillas',
    newBtn: 'Nuevo',
    loadImportBtn: 'Cargar / Importar',
    aiGeneratorBtn: 'Generador',
    saveExportBtn: 'Guardar y Exportar',
    bleConnectBtn: 'Conectar BLE',
    bleDisconnectBtn: 'Desconectado',
    openNewTabBtn: 'Abrir en nueva pestaña',
    padViewBtn: 'Pad Monomanual',
    editorViewBtn: 'Editor de Estudio',
    settingsBtn: 'Ajustes',
    emergencyStopBtn: 'PARADA',
    emergencyStopTitle: 'PARADA DE EMERGENCIA: Detener motor y reproducción de inmediato (0x04: 0)',
    modulesOrderBtn: 'Módulos',
    modulesOrderTitle: 'Personalizar orden y visibilidad de los módulos del panel',

    presetCatalogHeader: 'Catálogo de Plantillas Servok',
    profilesCountLabel: 'Perfiles',
    customPresetsTitle: 'Plantillas Propias',
    searchPresetsPlaceholder: 'Buscar plantillas (ej. suave, ola, turbo, resistencia)...',
    tracksLabel: 'Pistas:',
    durationLabel: 'Duración:',
    characterLabel: 'Carácter:',
    categoryLabel: 'Categoría:',
    subcategoryLabel: 'Subcategoría:',
    allLabel: 'Todas',
    allCategoriesLabel: 'Todas las Categorías',
    allSubcategoriesLabel: 'Todas las Subcategorías',
    shortDurationLabel: 'Corta <5m',
    mediumDurationLabel: 'Media 5–15m',
    longDurationLabel: 'Larga >15m',
    softIntensityLabel: 'Suave y Sensual',
    mediumIntensityLabel: 'Fluido y Dinámico',
    intenseIntensityLabel: 'Potente e Intenso',
    openInEditorBtn: 'Abrir en Editor',
    playDirectBtn: 'Iniciar Ahora',
    noPresetsFound: 'No se encontraron plantillas',
    noPresetsFoundDesc: 'No se encontraron plantillas para los criterios de filtro seleccionados.',
    resetFiltersBtn: 'Restablecer filtros',
    backToStartMenu: 'Menú Inicio',
    toStudioEditor: 'Al Editor de Estudio',

    startModalTitle: '¿Cómo deseas crear tu sesión?',
    startModalSubtitle: 'Elige de nuestro catálogo de plantillas, diseña en el editor manual de 4 capas o sube un archivo de sesión existente directamente.',
    manualTitle: '1. Crear Manualmente',
    manualDesc: 'Inicia una sesión en blanco con la duración definida. Coloca puntos, oscilaciones e impulsos de lubricante manualmente en el gráfico.',
    manualBtn: 'Abrir Editor Manual',
    generatorTitle: 'Catálogo de Plantillas',
    generatorDesc: 'Elige entre más de 240 perfiles mecatrónicos en 10 categorías: desde caricias suaves matutinas hasta mareas armónicas y límites físicos.',
    generatorBtn: 'Abrir Plantillas',
    uploadTitle: '2. Cargar Sesión e Importar',
    uploadDesc: 'Carga directamente un archivo de sesión (.json, .csv, .fun, .funscript) para continuar editando de inmediato.',
    uploadBtn: 'Seleccionar Archivo',
    appStorageBtn: 'O abrir almacenamiento de la app',
    quickPresetsTitle: 'Plantillas de Inicio Rápido',
    quickPresetsDesc: 'Genera una sesión de ejemplo en cuestión de segundos',

    layerMinDepth: 'Prof. Mínima (%)',
    layerMaxDepth: 'Prof. Máxima (%)',
    layerSpm: 'Empujes / Min (SPM)',
    layerHardness: 'Dureza (%)',
    playBtn: 'Iniciar',
    pauseBtn: 'Pausar',
    stopBtn: 'Detener',
    loopBtn: 'Bucle',
    addPointBtn: 'Añadir Punto',
    snapBtn: 'Ajuste de Rejilla',
    clearBtn: 'Reiniciar Todo',
    undoBtn: 'Deshacer',
    redoBtn: 'Rehacer',

    settingsModalTitle: 'Ajustes',
    settingsModalSubtitle: 'Preferencias, emparejamiento de hardware y persistencia local',
    devToolsTitle: 'Herramientas de Desarrollador y Prueba',
    openInNewTabDesc: 'Abrir app en pestaña separada del navegador (recomendado para aislamiento de iframe con Web Bluetooth)',

    footerTitle: 'Hismith Servok Studio',
    footerDisclaimerNotice: 'Aviso: Esta aplicación no está afiliada ni respaldada oficialmente por Hismith.',
    footerHardwareNote: 'Optimizada para Hismith Servok Premium y hardware de actuadores lineales compatibles. Software experimental: úsalo bajo tu propio riesgo.',

    helpTabLayers: '1. Editor y 4 Capas',
    helpTabGenerator: '2. Plantillas y Carga',
    helpTabLimits: '3. Límites de Carrera y Física',
    helpTabSubsections: '4. Subsecciones y Snippets',
    helpTabBle: '5. Hardware Dual (BLE)',
    helpTabStorage: '6. Guardar y Exportar',
    helpTabLocalUse: '7. Uso Local',

    helpHeaderTitle: 'Manual de Usuario y Documentación',
    helpHeaderSubtitle: 'Guía detallada sobre todas las funciones, mecanismos de seguridad y configuración local',
    downloadLocalTxtBtn: 'Descargar Guía (.txt)',

    localSetupHeading: '🔥 Uso Local en tu propia Computadora',
    localSetupDesc: 'Puedes ejecutar toda la aplicación de forma totalmente local en tu PC: independiente, funcional offline y privada.',
    localCostHeading: '¿Hay algún costo recurrente?',
    localCostDesc: '¡NO! La aplicación se ejecuta de forma local y de código abierto sin suscripciones ni cargos externos.',
    localSecurityHeading: '¿Están seguros tus datos localmente?',
    localSecurityDesc: '¡SÍ! Todos los guiones y configuraciones permanecen exclusivamente dentro de tu navegador y en tu propia máquina.',
    localStepsHeading: 'Guía paso a paso (Inicio con 1 clic y accesos directos):',
    localStep1: '1. Configuración única: Instala Node.js (v18+) desde https://nodejs.org/.',
    localStep2: '2. Crear acceso directo: Doble clic en "Desktop_Verknuepfung_erstellen.bat".',
    localStep3: '3. Inicio con 1 clic: Al hacer doble clic en el acceso directo se inicia el servidor y se abre tu navegador predeterminado.',
    localStep4: '4. Tu navegador web predeterminado se abre directamente en http://localhost:3000.',
    localStep5: '5. Enciende tu Servok, empareja y listo – las configuraciones y dispositivos se guardan en servok-settings.json.',
  },
};

/**
 * Universal safe multi-language helper: guarantees exact language mapping for DE, EN, and ES
 */
export function tr(lang: Language | string | undefined, de: string, en: string, es: string): string {
  if (lang === 'en') return en;
  if (lang === 'es') return es;
  return de;
}
