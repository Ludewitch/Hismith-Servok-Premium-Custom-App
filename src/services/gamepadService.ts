/**
 * ============================================================================
 * HISMITH SERVOK PREMIUM — XBOX GAMEPAD & CONTROLLER / KEYBOARD MAPPING SERVICE
 * ============================================================================
 * - Full Web Gamepad API integration for Xbox Wireless & USB controllers
 * - Configurable stick sensitivity & deadzone for the 2D One-Handed Pad
 * - Custom button mappings for Editor and Pad controls
 * - Keyboard fallback shortcuts with custom remapping
 * - Dual-rumble haptic vibration actuation for tactile hardware feedback
 * ============================================================================
 */

export interface XboxButtonDef {
  index: number;
  id: string;
  name: string;
  shortName: string;
  xboxLabel: string;
  category: 'action' | 'shoulder' | 'dpad' | 'menu' | 'stick_click';
  color: string;
}

export const XBOX_BUTTONS: XboxButtonDef[] = [
  { index: 0, id: 'btn_a', name: 'Taste A (Grün)', shortName: 'A', xboxLabel: 'A', category: 'action', color: '#22c55e' },
  { index: 1, id: 'btn_b', name: 'Taste B (Rot)', shortName: 'B', xboxLabel: 'B', category: 'action', color: '#ef4444' },
  { index: 2, id: 'btn_x', name: 'Taste X (Blau)', shortName: 'X', xboxLabel: 'X', category: 'action', color: '#3b82f6' },
  { index: 3, id: 'btn_y', name: 'Taste Y (Gelb)', shortName: 'Y', xboxLabel: 'Y', category: 'action', color: '#eab308' },
  { index: 4, id: 'btn_lb', name: 'Linker Bumper (LB)', shortName: 'LB', xboxLabel: 'LB', category: 'shoulder', color: '#a855f7' },
  { index: 5, id: 'btn_rb', name: 'Rechter Bumper (RB)', shortName: 'RB', xboxLabel: 'RB', category: 'shoulder', color: '#a855f7' },
  { index: 6, id: 'btn_lt', name: 'Linker Trigger (LT)', shortName: 'LT', xboxLabel: 'LT', category: 'shoulder', color: '#06b6d4' },
  { index: 7, id: 'btn_rt', name: 'Rechter Trigger (RT)', shortName: 'RT', xboxLabel: 'RT', category: 'shoulder', color: '#06b6d4' },
  { index: 8, id: 'btn_view', name: 'View / Zurück (Back)', shortName: 'View', xboxLabel: '⧉', category: 'menu', color: '#94a3b8' },
  { index: 9, id: 'btn_menu', name: 'Menü / Start', shortName: 'Start', xboxLabel: '☰', category: 'menu', color: '#94a3b8' },
  { index: 10, id: 'btn_ls', name: 'Linker Stick Klick (L3)', shortName: 'LS Click', xboxLabel: 'LS', category: 'stick_click', color: '#64748b' },
  { index: 11, id: 'btn_rs', name: 'Rechter Stick Klick (R3)', shortName: 'RS Click', xboxLabel: 'RS', category: 'stick_click', color: '#64748b' },
  { index: 12, id: 'dpad_up', name: 'Steuerkreuz Oben', shortName: 'D-Pad ▲', xboxLabel: '▲', category: 'dpad', color: '#38bdf8' },
  { index: 13, id: 'dpad_down', name: 'Steuerkreuz Unten', shortName: 'D-Pad ▼', xboxLabel: '▼', category: 'dpad', color: '#38bdf8' },
  { index: 14, id: 'dpad_left', name: 'Steuerkreuz Links', shortName: 'D-Pad ◄', xboxLabel: '◄', category: 'dpad', color: '#38bdf8' },
  { index: 15, id: 'dpad_right', name: 'Steuerkreuz Rechts', shortName: 'D-Pad ►', xboxLabel: '►', category: 'dpad', color: '#38bdf8' },
  { index: 16, id: 'btn_xbox', name: 'Xbox Guide Logo', shortName: 'Xbox', xboxLabel: '⨂', category: 'menu', color: '#10b981' },
];

export type ControllerActionId =
  // Editor Aktionen
  | 'editor_play_pause'
  | 'editor_emergency_stop'
  | 'editor_reset_to_start'
  | 'editor_prev_chapter'
  | 'editor_next_chapter'
  | 'editor_spm_increase'
  | 'editor_spm_decrease'
  | 'editor_turbo_toggle'
  | 'editor_loop_toggle'
  // Einhand-Pad Aktionen
  | 'pad_toggle_flow'
  | 'pad_emergency_stop'
  | 'pad_next_mode'
  | 'pad_prev_mode'
  | 'pad_trigger_lube'
  | 'pad_record_toggle'
  | 'pad_turbo_toggle'
  | 'pad_turbo_decrease'
  | 'pad_smoothness_increase'
  | 'pad_smoothness_decrease';

export interface ActionDefinition {
  id: ControllerActionId;
  label: string;
  description: string;
  context: 'editor' | 'pad';
  defaultGamepadButton: number | null;
  defaultKey: string | null;
  defaultKeyLabel: string;
}

export const ACTION_DEFINITIONS: ActionDefinition[] = [
  // --- EDITOR AKTIONEN ---
  {
    id: 'editor_play_pause',
    label: 'Play / Pause (Start & Stopp)',
    description: 'Startet oder stoppt die Wiedergabe des Templates / Scripts im Editor',
    context: 'editor',
    defaultGamepadButton: 0, // A
    defaultKey: 'Space',
    defaultKeyLabel: 'Leertaste',
  },
  {
    id: 'editor_emergency_stop',
    label: 'Not-Aus (Sofort-Halt)',
    description: 'Hält die Servok-Hardware sofort an und trennt den Motorstrom',
    context: 'editor',
    defaultGamepadButton: 1, // B
    defaultKey: 'Escape',
    defaultKeyLabel: 'Esc',
  },
  {
    id: 'editor_reset_to_start',
    label: 'Zurück zum Start (00:00:00)',
    description: 'Setzt den Abspielkopf an den Anfang der Vorlage zurück',
    context: 'editor',
    defaultGamepadButton: 8, // View / Back
    defaultKey: 'Home',
    defaultKeyLabel: 'Pos 1 (Home)',
  },
  {
    id: 'editor_prev_chapter',
    label: 'Vorheriges Kapitel / Marker',
    description: 'Springt zum Beginn des vorherigen Teilabschnitts',
    context: 'editor',
    defaultGamepadButton: 4, // LB
    defaultKey: 'PageUp',
    defaultKeyLabel: 'Bild Auf (PgUp)',
  },
  {
    id: 'editor_next_chapter',
    label: 'Nächstes Kapitel / Marker',
    description: 'Springt zum Beginn des nächsten Teilabschnitts',
    context: 'editor',
    defaultGamepadButton: 5, // RB
    defaultKey: 'PageDown',
    defaultKeyLabel: 'Bild Ab (PgDn)',
  },
  {
    id: 'editor_spm_increase',
    label: 'Tempo / SPM schneller (+5)',
    description: 'Erhöht die Geschwindigkeit der aktuellen Vorlage schrittweise',
    context: 'editor',
    defaultGamepadButton: 12, // D-Pad Up
    defaultKey: 'ArrowUp',
    defaultKeyLabel: 'Pfeil Oben',
  },
  {
    id: 'editor_spm_decrease',
    label: 'Tempo / SPM langsamer (-5)',
    description: 'Verringert die Geschwindigkeit der aktuellen Vorlage schrittweise',
    context: 'editor',
    defaultGamepadButton: 13, // D-Pad Down
    defaultKey: 'ArrowDown',
    defaultKeyLabel: 'Pfeil Unten',
  },
  {
    id: 'editor_turbo_toggle',
    label: 'Turbo-Boost umschalten',
    description: 'Aktiviert oder deaktiviert den verzögerungsfreien SPM-Turbo',
    context: 'editor',
    defaultGamepadButton: 3, // Y
    defaultKey: 'KeyT',
    defaultKeyLabel: 'T',
  },
  {
    id: 'editor_loop_toggle',
    label: 'Wiederholung (Loop) umschalten',
    description: 'Schaltet die kontinuierliche Endlosschleife im Editor ein/aus',
    context: 'editor',
    defaultGamepadButton: 2, // X
    defaultKey: 'KeyL',
    defaultKeyLabel: 'L',
  },

  // --- EINHAND-PAD AKTIONEN ---
  {
    id: 'pad_toggle_flow',
    label: 'Flow starten / stoppen',
    description: 'Aktiviert oder pausiert die autonome Wellenbewegung im Pad',
    context: 'pad',
    defaultGamepadButton: 0, // A
    defaultKey: 'Space',
    defaultKeyLabel: 'Leertaste',
  },
  {
    id: 'pad_emergency_stop',
    label: 'Not-Aus im Einhand-Pad',
    description: 'Notfall-Soforthalt während des Einhand-Betriebs',
    context: 'pad',
    defaultGamepadButton: 1, // B
    defaultKey: 'Escape',
    defaultKeyLabel: 'Esc',
  },
  {
    id: 'pad_next_mode',
    label: 'Nächstes Wellenmuster',
    description: 'Wechselt zum nächsten Algorithmus (Seiden-Sinus, Goldener Klimax, etc.)',
    context: 'pad',
    defaultGamepadButton: 5, // RB
    defaultKey: 'ArrowRight',
    defaultKeyLabel: 'Pfeil Rechts',
  },
  {
    id: 'pad_prev_mode',
    label: 'Vorheriges Wellenmuster',
    description: 'Wechselt zum vorherigen Algorithmus',
    context: 'pad',
    defaultGamepadButton: 4, // LB
    defaultKey: 'ArrowLeft',
    defaultKeyLabel: 'Pfeil Links',
  },
  {
    id: 'pad_trigger_lube',
    label: 'Gleitmittel-Stoß auslösen',
    description: 'Gibt einen präzisen Lube-Pumpschub an die angeschlossene Pumpe ab',
    context: 'pad',
    defaultGamepadButton: 3, // Y
    defaultKey: 'KeyG',
    defaultKeyLabel: 'G',
  },
  {
    id: 'pad_record_toggle',
    label: 'Echtzeit-Aufnahme Start / Stopp',
    description: 'Nimmt deine Live-Gesten direkt als neues Template auf',
    context: 'pad',
    defaultGamepadButton: 2, // X
    defaultKey: 'KeyR',
    defaultKeyLabel: 'R',
  },
  {
    id: 'pad_turbo_toggle',
    label: 'SPM Turbo hochschalten (aufsteigend)',
    description: 'Schaltet die Turbostufen schrittweise hoch [RT / R2]: (1.0x -> 1.25x -> 1.5x -> 1.75x -> 2.0x)',
    context: 'pad',
    defaultGamepadButton: 7, // RT (Rechter Trigger)
    defaultKey: 'KeyT',
    defaultKeyLabel: 'T',
  },
  {
    id: 'pad_turbo_decrease',
    label: 'SPM Turbo runterschalten (absteigend)',
    description: 'Schaltet die Turbostufen schrittweise runter [LT / L2]: (2.0x -> 1.75x -> 1.5x -> 1.25x -> 1.0x Normal)',
    context: 'pad',
    defaultGamepadButton: 6, // LT (Linker Trigger)
    defaultKey: 'KeyE',
    defaultKeyLabel: 'E',
  },
  {
    id: 'pad_smoothness_increase',
    label: 'Umkehr-Sanftheit weicher (+1)',
    description: 'Erhöht die Umkehr-Sanftheit schrittweise (D-Pad Rechts: sanftere Richtungswechsel an Totpunkten)',
    context: 'pad',
    defaultGamepadButton: 15, // D-Pad Right
    defaultKey: 'BracketRight',
    defaultKeyLabel: ']',
  },
  {
    id: 'pad_smoothness_decrease',
    label: 'Umkehr-Sanftheit direkter (-1)',
    description: 'Verringert die Umkehr-Sanftheit schrittweise (D-Pad Links: knackigere, direktere Richtungswechsel)',
    context: 'pad',
    defaultGamepadButton: 14, // D-Pad Left
    defaultKey: 'BracketLeft',
    defaultKeyLabel: '[',
  },
];

export interface ControllerMappingConfig {
  gamepadButton: number | null; // index of Xbox button, or null
  keyboardKey: string | null;    // event.code like 'Space', 'KeyT'
  keyboardLabel: string;        // human readable
}

export interface GamepadSettings {
  stickSensitivity: number; // 0.2 to 3.0 (default 1.0)
  stickDeadzone: number;    // 0.04 to 0.35 (default 0.12)
  invertY: boolean;         // default false: up moves point up (deeper stroke)
  activeStick: 'left' | 'right'; // default 'left'
  rumbleEnabled: boolean;   // default true
  mappings: Record<ControllerActionId, ControllerMappingConfig>;
}

const STORAGE_KEY = 'hismith_servok_gamepad_config_v2';

const getDefaultMappings = (): Record<ControllerActionId, ControllerMappingConfig> => {
  const map: Partial<Record<ControllerActionId, ControllerMappingConfig>> = {};
  for (const act of ACTION_DEFINITIONS) {
    map[act.id] = {
      gamepadButton: act.defaultGamepadButton,
      keyboardKey: act.defaultKey,
      keyboardLabel: act.defaultKeyLabel,
    };
  }
  return map as Record<ControllerActionId, ControllerMappingConfig>;
};

const DEFAULT_SETTINGS: GamepadSettings = {
  stickSensitivity: 1.0,
  stickDeadzone: 0.12,
  invertY: false,
  activeStick: 'left',
  rumbleEnabled: true,
  mappings: getDefaultMappings(),
};

type ConnectionListener = (connected: boolean, name: string) => void;

class GamepadService {
  private settings: GamepadSettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<ConnectionListener> = new Set();
  private lastButtonStates: boolean[] = [];
  private lastTriggerTime: Record<string, number> = {};
  private buttonHoldStartTime: Record<number, number> = {};
  private activeGamepadIndex: number | null = null;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
        this.activeGamepadIndex = e.gamepad.index;
        this.notifyListeners();
      });

      window.addEventListener('gamepaddisconnected', () => {
        this.refreshActiveGamepad();
        this.notifyListeners();
      });
    }
  }

  public subscribe(cb: ConnectionListener): () => void {
    this.listeners.add(cb);
    // Sofort initialen Status melden
    const pad = this.getConnectedGamepad();
    cb(pad !== null, pad?.id || '');
    return () => this.listeners.delete(cb);
  }

  private notifyListeners() {
    const pad = this.getConnectedGamepad();
    this.listeners.forEach((fn) => fn(pad !== null, pad?.id || ''));
  }

  public getConnectedGamepad(): Gamepad | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (!pads) return null;

    // Bevorzuge zuvor aktives Gamepad
    if (this.activeGamepadIndex !== null && pads[this.activeGamepadIndex]) {
      return pads[this.activeGamepadIndex];
    }

    // Sonst nimm das erste verfügbare Gamepad
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]) {
        this.activeGamepadIndex = i;
        return pads[i];
      }
    }
    return null;
  }

  private refreshActiveGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      this.activeGamepadIndex = null;
      return;
    }
    const pads = navigator.getGamepads();
    for (let i = 0; i < (pads?.length || 0); i++) {
      if (pads[i]) {
        this.activeGamepadIndex = i;
        return;
      }
    }
    this.activeGamepadIndex = null;
  }

  public isGamepadConnected(): boolean {
    return this.getConnectedGamepad() !== null;
  }

  public getGamepadName(): string {
    const pad = this.getConnectedGamepad();
    if (!pad) return 'Kein Controller erkannt';
    let id = pad.id;
    if (id.toLowerCase().includes('xbox')) return 'XBOX Wireless Controller';
    if (id.toLowerCase().includes('045e')) return 'Microsoft XBOX Controller';
    return id.split('(')[0].trim() || 'USB/Bluetooth Gamepad';
  }

  public getSettings(): GamepadSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<GamepadSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
  }

  public updateMapping(actionId: ControllerActionId, config: Partial<ControllerMappingConfig>) {
    this.settings.mappings[actionId] = {
      ...this.settings.mappings[actionId],
      ...config,
    };
    this.saveSettings();
  }

  public resetToDefaults() {
    this.settings = {
      ...DEFAULT_SETTINGS,
      mappings: getDefaultMappings(),
    };
    this.saveSettings();
    return this.settings;
  }

  private loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          mappings: {
            ...getDefaultMappings(),
            ...(parsed.mappings || {}),
          },
        };
      }
    } catch (_) {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (_) {}
  }

  /**
   * Controller Dual-Rumble Haptik Vibration (z. B. bei Tastenanschlag, Not-Aus oder Grenzwert)
   */
  public triggerRumble(weakMagnitude = 0.4, strongMagnitude = 0.2, durationMs = 120) {
    if (!this.settings.rumbleEnabled) return;
    const pad = this.getConnectedGamepad();
    if (!pad) return;

    try {
      const actuator = (pad as any).vibrationActuator;
      if (actuator && typeof actuator.playEffect === 'function') {
        actuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1, Math.max(0, weakMagnitude)),
          strongMagnitude: Math.min(1, Math.max(0, strongMagnitude)),
        }).catch(() => {});
      }
    } catch (_) {}
  }

  /**
   * Liest die aktuellen Stick-Achsen (X, Y normiert) unter Berücksichtigung von Deadzone & Invertierung
   */
  public getStickDelta(dtSeconds: number): { dx: number; dy: number; rawX: number; rawY: number } {
    const pad = this.getConnectedGamepad();
    if (!pad) return { dx: 0, dy: 0, rawX: 0, rawY: 0 };

    const isLeft = this.settings.activeStick === 'left';
    const axisXIndex = isLeft ? 0 : 2;
    const axisYIndex = isLeft ? 1 : 3;

    const rawX = pad.axes[axisXIndex] ?? 0;
    const rawY = pad.axes[axisYIndex] ?? 0;

    const deadzone = this.settings.stickDeadzone;
    const sensitivity = this.settings.stickSensitivity;

    // Radial oder achsenweise Deadzone-Kompensation
    let nx = 0;
    if (Math.abs(rawX) > deadzone) {
      const sign = rawX > 0 ? 1 : -1;
      nx = sign * ((Math.abs(rawX) - deadzone) / (1 - deadzone));
    }

    let ny = 0;
    if (Math.abs(rawY) > deadzone) {
      const sign = rawY > 0 ? 1 : -1;
      ny = sign * ((Math.abs(rawY) - deadzone) / (1 - deadzone));
    }

    // Invertierung der Y-Achse: Bei Gamepads ist Stick nach OBEN standardmäßig -1.0
    // Für unseren 2D-Graphen wollen wir: Stick OBEN = tieferer Hub (+Y)
    const factorY = this.settings.invertY ? 1 : -1;
    const directedNy = ny * factorY;

    // Basis-Geschwindigkeit: 70 Prozentpunkte pro Sekunde bei Vollanschlag und Sensitivität 1.0
    const baseSpeedPctPerSec = 72;
    const dx = nx * baseSpeedPctPerSec * sensitivity * dtSeconds;
    const dy = directedNy * baseSpeedPctPerSec * sensitivity * dtSeconds;

    return { dx, dy, rawX, rawY };
  }

  /**
   * Liest den rechten / sekundären Analogstick (RS) im Einhandmodus:
   * - Y-Achse: Steuerung des Hub-Reglers / Amplitude (spanPct: 14% bis 90%)
   * Die Umkehr-Sanftheit wird separat isoliert über das D-Pad Links/Rechts gesteuert,
   * damit beim Verstellen des Hubs keine versehentliche Beeinflussung der Sanftheit stattfindet.
   */
  public getRightStickDelta(dtSeconds: number): {
    dxSmooth: number; // 0 (Umkehr-Sanftheit wird 100% separat über das D-Pad gesteuert)
    dySpan: number;   // Änderung der Hub-Amplitude (Spanne)
    rawX: number;
    rawY: number;
    isDeflected: boolean;
  } {
    const pad = this.getConnectedGamepad();
    if (!pad) return { dxSmooth: 0, dySpan: 0, rawX: 0, rawY: 0, isDeflected: false };

    // Wenn activeStick 'left' ist, ist der sekundäre Stick der rechte Stick (Achsen 2 & 3)
    const isLeftPrimary = this.settings.activeStick === 'left';
    const axisXIndex = isLeftPrimary ? 2 : 0;
    const axisYIndex = isLeftPrimary ? 3 : 1;

    const rawX = pad.axes[axisXIndex] ?? 0;
    const rawY = pad.axes[axisYIndex] ?? 0;

    const deadzone = this.settings.stickDeadzone;
    const sensitivity = this.settings.stickSensitivity;

    let ny = 0;
    if (Math.abs(rawY) > deadzone) {
      const sign = rawY > 0 ? 1 : -1;
      ny = sign * ((Math.abs(rawY) - deadzone) / (1 - deadzone));
    }

    // Invertierung der Y-Achse: Standard ist Stick OBEN = -1.0.
    // Stick nach OBEN soll Amplitude vergrößern (+dySpan).
    const factorY = this.settings.invertY ? 1 : -1;
    const directedNy = ny * factorY;

    // Amplitude (spanPct 14..90%): 48 Prozentpunkte pro Sekunde bei Vollanschlag
    const dySpan = directedNy * 48 * sensitivity * dtSeconds;

    // Nur reine vertikale Auslenkung für den Hub werten (keine X-Achsen-Kollision mit der Sanftheit)
    const isDeflected = Math.abs(directedNy) > 0.001;

    return { dxSmooth: 0, dySpan, rawX, rawY, isDeflected };
  }

  /**
   * Prüft Tastenanschläge (Flankenerkennung mit Debounce & Hold-Repeat für D-Pad Stufen)
   */
  public pollTriggeredActions(context: 'editor' | 'pad'): ControllerActionId[] {
    const triggered: ControllerActionId[] = [];
    const pad = this.getConnectedGamepad();
    if (!pad) return triggered;

    const now = performance.now();
    const currentButtons = pad.buttons.map((b) => b.pressed || b.value > 0.5);

    // Initialisiere lastButtonStates falls nötig
    while (this.lastButtonStates.length < currentButtons.length) {
      this.lastButtonStates.push(false);
    }

    // Gehe alle konfigurierten Aktionen durch
    for (const act of ACTION_DEFINITIONS) {
      if (act.context !== context) continue;
      const mapping = this.settings.mappings[act.id];
      if (!mapping || mapping.gamepadButton === null) continue;

      const btnIndex = mapping.gamepadButton;
      const isPressedNow = currentButtons[btnIndex] === true;
      const wasPressedBefore = this.lastButtonStates[btnIndex] === true;

      if (isPressedNow && !wasPressedBefore) {
        this.buttonHoldStartTime[btnIndex] = now;
      }

      const holdStart = this.buttonHoldStartTime[btnIndex] || now;
      const isRepeatAction = act.id.includes('smoothness') || act.id.includes('spm');
      const lastTrigger = this.lastTriggerTime[act.id] || 0;

      // Positive Flanke (Erstklick) oder Wiederholung bei Halten
      const isInitialPress = isPressedNow && !wasPressedBefore && (now - lastTrigger > 120);
      const isHeldRepeat = isRepeatAction && isPressedNow && (now - holdStart > 320) && (now - lastTrigger > 110);

      if (isInitialPress || isHeldRepeat) {
        this.lastTriggerTime[act.id] = now;
        triggered.push(act.id);
        this.triggerRumble(0.2, 0.08, 60);
      }
    }

    this.lastButtonStates = currentButtons;
    return triggered;
  }

  /**
   * Prüft ob ein Tastatur-Event einer konfigurierten Aktion entspricht
   */
  public matchKeyboardAction(e: KeyboardEvent, context: 'editor' | 'pad'): ControllerActionId | null {
    // Ignoriere Eingaben in Input/Textarea/Select Feldern
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return null;
    }

    for (const act of ACTION_DEFINITIONS) {
      if (act.context !== context && act.context !== 'editor') continue;
      const mapping = this.settings.mappings[act.id];
      if (!mapping || !mapping.keyboardKey) continue;

      if (e.code === mapping.keyboardKey) {
        return act.id;
      }
    }
    return null;
  }
}

export const gamepadService = new GamepadService();
