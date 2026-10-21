import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Keyboard,
  Sliders,
  RotateCcw,
  X,
  Check,
  Zap,
  Volume2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  gamepadService,
  XBOX_BUTTONS,
  ACTION_DEFINITIONS,
  ControllerActionId,
  GamepadSettings,
} from '../services/gamepadService';
import { sensoryEngine } from '../services/sensoryEngine';
import { tr, Language } from '../i18n/translations';

interface ControllerMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

const getActionMeta = (id: ControllerActionId, lang: Language) => {
  const map: Record<ControllerActionId, { label: string; desc: string }> = {
    editor_play_pause: {
      label: tr(lang, 'Play / Pause (Start & Stopp)', 'Play / Pause (Start & Stop)', 'Reproducir / Pausa (Iniciar y Detener)'),
      desc: tr(lang, 'Startet oder stoppt die Wiedergabe des Templates / Scripts im Editor', 'Starts or stops template / script playback in the editor', 'Inicia o detiene la reproducción de la plantilla / guion en el editor'),
    },
    editor_emergency_stop: {
      label: tr(lang, 'Not-Aus (Sofort-Halt)', 'Emergency Stop (Instant Halt)', 'Parada de Emergencia (Alto Inmediato)'),
      desc: tr(lang, 'Hält die Servok-Hardware sofort an und trennt den Motorstrom', 'Immediately halts Servok hardware and cuts motor power', 'Detiene de inmediato el hardware Servok y corta la energía del motor'),
    },
    editor_reset_to_start: {
      label: tr(lang, 'Zurück zum Start (00:00:00)', 'Reset to Start (00:00:00)', 'Volver al Inicio (00:00:00)'),
      desc: tr(lang, 'Setzt den Abspielkopf an den Anfang der Vorlage zurück', 'Resets the playhead to the beginning of the template', 'Restablece el cabezal de reproducción al inicio de la plantilla'),
    },
    editor_prev_chapter: {
      label: tr(lang, 'Vorheriger Abschnitt', 'Previous Subsection', 'Subsección Anterior'),
      desc: tr(lang, 'Springt zum vorherigen kuratierten Kapitel / Unterabschnitt', 'Jumps to the previous subsection / chapter', 'Salta a la subsección / capítulo anterior'),
    },
    editor_next_chapter: {
      label: tr(lang, 'Nächster Abschnitt', 'Next Subsection', 'Siguiente Subsección'),
      desc: tr(lang, 'Springt zum nächsten kuratierten Kapitel / Unterabschnitt', 'Jumps to the next subsection / chapter', 'Salta a la siguiente subsección / capítulo'),
    },
    editor_spm_increase: {
      label: tr(lang, 'Tempo +5 SPM (Schneller)', 'Speed +5 SPM (Faster)', 'Ritmo +5 SPM (Más Rápido)'),
      desc: tr(lang, 'Erhöht die Geschwindigkeit aller Hubbewegungen um 5 SPM', 'Increases stroke frequency by 5 SPM', 'Aumenta la frecuencia de carrera en 5 SPM'),
    },
    editor_spm_decrease: {
      label: tr(lang, 'Tempo -5 SPM (Langsamer)', 'Speed -5 SPM (Slower)', 'Ritmo -5 SPM (Más Lento)'),
      desc: tr(lang, 'Verringert die Geschwindigkeit aller Hubbewegungen um 5 SPM', 'Decreases stroke frequency by 5 SPM', 'Disminuye la frecuencia de carrera en 5 SPM'),
    },
    editor_turbo_toggle: {
      label: tr(lang, 'Turbo-Schub Umschalten', 'Toggle Turbo Boost', 'Alternar Turbo-Boost'),
      desc: tr(lang, 'Schaltet den globalen SPM Turbo-Multiplikator ein / aus', 'Toggles global SPM turbo multiplier on / off', 'Activa o desactiva el multiplicador global de turbo SPM'),
    },
    editor_loop_toggle: {
      label: tr(lang, 'Loop Endlosschleife Umschalten', 'Toggle Loop Playback', 'Alternar Bucle Continuo'),
      desc: tr(lang, 'Wiederholt die aktuelle Sequenz nahtlos von vorn', 'Seamlessly repeats the current sequence from the start', 'Repite la secuencia actual continuamente'),
    },
    pad_toggle_flow: {
      label: tr(lang, 'Wellen-Fluss Start / Stopp', 'Wave Flow Start / Stop', 'Iniciar / Detener Flujo de Ondas'),
      desc: tr(lang, 'Startet oder pausiert den autonomen Wellen-Generator auf dem Pad', 'Starts or pauses the autonomous wave flow on the pad', 'Inicia o pausa el flujo de ondas autónomo en el pad'),
    },
    pad_emergency_stop: {
      label: tr(lang, 'Not-Aus (Sofort-Halt)', 'Emergency Stop (Instant Halt)', 'Parada de Emergencia (Alto Inmediato)'),
      desc: tr(lang, 'Sofortiger Stopp aller Hub- und Oszillationsbewegungen', 'Immediate stop of all stroke and oscillation movements', 'Detención inmediata de todos los movimientos de carrera y oscilación'),
    },
    pad_next_mode: {
      label: tr(lang, 'Nächster Wellen-Modus', 'Next Wave Mode', 'Siguiente Modo de Onda'),
      desc: tr(lang, 'Wechselt zur nächsten Bewegungscharakteristik', 'Switches to the next wave motion character', 'Cambia a la siguiente característica de movimiento'),
    },
    pad_prev_mode: {
      label: tr(lang, 'Vorheriger Wellen-Modus', 'Previous Wave Mode', 'Modo de Onda Anterior'),
      desc: tr(lang, 'Wechselt zur vorherigen Bewegungscharakteristik', 'Switches to the previous wave motion character', 'Cambia a la característica de movimiento anterior'),
    },
    pad_trigger_lube: {
      label: tr(lang, 'Gleitmittel-Impuls', 'Trigger Lube Dispenser', 'Impulso de Lubricante'),
      desc: tr(lang, 'Gibt 2 Dosiereinheiten Gleitmittel über den Spender ab', 'Dispenses 2 doses of lubricant via the hardware dispenser', 'Aplica 2 dosis de lubricante mediante el dispensador de hardware'),
    },
    pad_record_toggle: {
      label: tr(lang, 'Aufnahme Start / Stopp', 'Record Start / Stop', 'Iniciar / Detener Grabación'),
      desc: tr(lang, 'Zeichnet Pad-Koordinaten, Spanne und Sanftheit live auf', 'Records pad coordinates, span, and softness in real time', 'Graba coordenadas del pad, amplitud y suavidad en tiempo real'),
    },
    pad_turbo_toggle: {
      label: tr(lang, 'Turbo Hochschalten [RT]', 'Turbo Shift Up [RT]', 'Subir Turbo [RT]'),
      desc: tr(lang, 'Schaltet den SPM-Turbo stufenweise hoch (bis zu 2.0x)', 'Shifts SPM turbo multiplier up incrementally (up to 2.0x)', 'Aumenta gradualmente el turbo SPM (hasta 2.0x)'),
    },
    pad_turbo_decrease: {
      label: tr(lang, 'Turbo Runterschalten [LT]', 'Turbo Shift Down [LT]', 'Bajar Turbo [LT]'),
      desc: tr(lang, 'Schaltet den SPM-Turbo stufenweise runter (bis zu 1.0x Normal)', 'Shifts SPM turbo multiplier down incrementally (down to 1.0x)', 'Reduce gradualmente el turbo SPM (hasta 1.0x normal)'),
    },
    pad_smoothness_increase: {
      label: tr(lang, 'Sanftere Umkehr [D-Pad ►]', 'Softer Reversal [D-Pad ►]', 'Inversión más Suave [D-Pad ►]'),
      desc: tr(lang, 'Erhöht die Umkehr-Sanftheit (0x09) für weichere Richtungswechsel', 'Increases reversal softness (0x09) for smoother directional changes', 'Aumenta la suavidad de inversión (0x09) para transiciones más fluidas'),
    },
    pad_smoothness_decrease: {
      label: tr(lang, 'Knackigere Umkehr [D-Pad ◄]', 'Crisper Reversal [D-Pad ◄]', 'Inversión más Directa [D-Pad ◄]'),
      desc: tr(lang, 'Verringert die Sanftheit für direktere, definiertere Umkehrpunkte', 'Decreases softness for crisper, more defined turnaround points', 'Reduce la suavidad para puntos de retorno más directos y definidos'),
    },
  };
  return map[id] || { label: id, desc: '' };
};

export const ControllerMappingModal: React.FC<ControllerMappingModalProps> = ({
  isOpen,
  onClose,
  language = 'de',
}) => {
  const lang = (language || 'de') as Language;
  const [settings, setSettings] = useState<GamepadSettings>(() => gamepadService.getSettings());
  const [activeTab, setActiveTab] = useState<'editor' | 'pad' | 'stick'>('editor');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [gamepadName, setGamepadName] = useState<string>('Kein Controller');
  const [activeListeningAction, setActiveListeningAction] = useState<{
    id: ControllerActionId;
    type: 'gamepad' | 'keyboard';
  } | null>(null);

  // Live Controller-Zustand für den interaktiven SVG-Visualisierer
  const [pressedButtons, setPressedButtons] = useState<boolean[]>(new Array(17).fill(false));
  const [stickPositions, setStickPositions] = useState<{
    lx: number;
    ly: number;
    rx: number;
    ry: number;
  }>({ lx: 0, ly: 0, rx: 0, ry: 0 });

  // Gamepad Connection Subscription
  useEffect(() => {
    const unsub = gamepadService.subscribe((conn, name) => {
      setIsConnected(conn);
      setGamepadName(name || (conn ? 'XBOX Controller' : 'Kein Controller'));
    });
    return unsub;
  }, []);

  // Live Polling Loop für Visualisierung und Zuweisung
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let prevPressed: boolean[] = new Array(17).fill(false);

    const poll = () => {
      const pad = gamepadService.getConnectedGamepad();
      if (pad) {
        setIsConnected(true);
        const currentPressed = pad.buttons.map((b) => b.pressed || b.value > 0.45);
        setPressedButtons(currentPressed);

        const lx = pad.axes[0] ?? 0;
        const ly = pad.axes[1] ?? 0;
        const rx = pad.axes[2] ?? 0;
        const ry = pad.axes[3] ?? 0;
        setStickPositions({ lx, ly, rx, ry });

        // Wenn wir gerade auf einen Gamepad-Knopf für ein Rebinding warten:
        if (activeListeningAction && activeListeningAction.type === 'gamepad') {
          for (let i = 0; i < currentPressed.length; i++) {
            if (currentPressed[i] && !prevPressed[i]) {
              // Taste wurde neu gedrückt!
              gamepadService.updateMapping(activeListeningAction.id, {
                gamepadButton: i,
              });
              setSettings(gamepadService.getSettings());
              sensoryEngine.playTactileClick('primary');
              gamepadService.triggerRumble(0.4, 0.2, 100);
              setActiveListeningAction(null);
              break;
            }
          }
        }

        prevPressed = currentPressed;
      } else {
        setIsConnected(false);
      }

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeListeningAction]);

  // Tastatur-Listener für Rebinding
  useEffect(() => {
    if (!isOpen || !activeListeningAction || activeListeningAction.type !== 'keyboard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape bricht Rebinding ab
      if (e.code === 'Escape' && activeListeningAction.id !== 'editor_emergency_stop') {
        setActiveListeningAction(null);
        return;
      }

      gamepadService.updateMapping(activeListeningAction.id, {
        keyboardKey: e.code,
        keyboardLabel: e.key.length === 1 ? e.key.toUpperCase() : e.code.replace('Key', ''),
      });
      setSettings(gamepadService.getSettings());
      sensoryEngine.playTactileClick('primary');
      setActiveListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, activeListeningAction]);

  if (!isOpen) return null;

  const handleSensitivityChange = (val: number) => {
    gamepadService.updateSettings({ stickSensitivity: val });
    setSettings(gamepadService.getSettings());
  };

  const handleDeadzoneChange = (val: number) => {
    gamepadService.updateSettings({ stickDeadzone: val });
    setSettings(gamepadService.getSettings());
  };

  const handleInvertYToggle = () => {
    const next = !settings.invertY;
    gamepadService.updateSettings({ invertY: next });
    setSettings(gamepadService.getSettings());
    sensoryEngine.playToggle(next);
  };

  const handleStickSelect = (stick: 'left' | 'right') => {
    gamepadService.updateSettings({ activeStick: stick });
    setSettings(gamepadService.getSettings());
    sensoryEngine.playTactileClick('secondary');
  };

  const handleResetDefaults = () => {
    const def = gamepadService.resetToDefaults();
    setSettings(def);
    sensoryEngine.playTactileClick('primary');
  };

  const handleTestRumble = () => {
    sensoryEngine.playTactileClick('primary');
    gamepadService.triggerRumble(0.7, 0.4, 250);
  };

  const filteredActions = ACTION_DEFINITIONS.filter((a) => a.context === activeTab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => {
        if (!activeListeningAction) onClose();
      }}
    >
      <div
        className="bg-bg-panel border border-brand-cyan/40 shadow-2xl shadow-cyan-950/40 rounded-sm w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-text-bright font-sans"
        onClick={(e) => e.stopPropagation()}
        id="controller-mapping-modal"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim bg-bg-base/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/40">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-mono text-base font-black tracking-wide text-white uppercase">
                  {tr(
                    lang,
                    'XBOX Hardware Controller & Tastatur Schnittstelle',
                    'XBOX Hardware Controller & Keyboard Interface',
                    'Interfaz de Controlador XBOX y Teclado'
                  )}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                    }`}
                  />
                  {isConnected
                    ? tr(lang, 'XBOX Verbunden', 'XBOX Connected', 'XBOX Conectado')
                    : tr(lang, 'Tastatur-Modus', 'Keyboard Mode', 'Modo Teclado')}
                </span>
              </div>
              <p className="text-xs text-text-dim mt-0.5 font-mono">
                {isConnected
                  ? gamepadName
                  : tr(
                      lang,
                      'Schließe einen Controller via Bluetooth oder USB an, oder nutze Tastatur-Hotkeys',
                      'Connect a controller via Bluetooth or USB, or use keyboard shortcuts',
                      'Conecta un mando por Bluetooth o USB, o usa atajos de teclado'
                    )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-sm hover:bg-border-bright text-text-dim hover:text-white transition-colors cursor-pointer"
            title={tr(lang, 'Schließen', 'Close', 'Cerrar')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTROLLER VISUALIZER & LIVE TELEMETRY STRIP */}
        <div className="bg-bg-base border-b border-border-dim px-5 py-3 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Stylized Interactive Xbox Controller Schematic */}
          <div className="relative w-full md:w-80 h-28 bg-black/50 border border-border-bright rounded-sm p-2 flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 320 120"
              className="w-full h-full max-w-[280px] drop-shadow-[0_0_12px_rgba(0,0,0,0.8)]"
            >
              {/* Controller Body Shell */}
              <path
                d="M 60 25 C 90 20, 230 20, 260 25 C 295 32, 310 80, 290 115 C 278 122, 260 110, 245 92 C 200 98, 120 98, 75 92 C 60 110, 42 122, 30 115 C 10 80, 25 32, 60 25 Z"
                fill="#12131a"
                stroke="#2b2d3d"
                strokeWidth="2"
              />
              {/* Analog Triggers LT (6) & RT (7) */}
              <rect
                x="68"
                y="2"
                width="48"
                height="8"
                rx="3"
                fill={pressedButtons[6] ? '#f59e0b' : '#1d1e28'}
                stroke="#3f4257"
                strokeWidth="1"
                className="transition-colors"
              />
              <text x="92" y="8" textAnchor="middle" fill={pressedButtons[6] ? '#ffffff' : '#f59e0b'} fontSize="6" fontWeight="bold">
                LT (L2)
              </text>

              <rect
                x="204"
                y="2"
                width="48"
                height="8"
                rx="3"
                fill={pressedButtons[7] ? '#f59e0b' : '#1d1e28'}
                stroke="#3f4257"
                strokeWidth="1"
                className="transition-colors"
              />
              <text x="228" y="8" textAnchor="middle" fill={pressedButtons[7] ? '#ffffff' : '#f59e0b'} fontSize="6" fontWeight="bold">
                RT (R2)
              </text>

              {/* Shoulder Bumpers LB & RB */}
              <rect
                x="65"
                y="12"
                width="55"
                height="10"
                rx="4"
                fill={pressedButtons[4] ? '#a855f7' : '#22232f'}
                stroke="#3f4257"
                strokeWidth="1"
                className="transition-colors"
              />
              <text x="92" y="20" textAnchor="middle" fill="#8e92a8" fontSize="7" fontWeight="bold">
                LB
              </text>

              <rect
                x="200"
                y="12"
                width="55"
                height="10"
                rx="4"
                fill={pressedButtons[5] ? '#a855f7' : '#22232f'}
                stroke="#3f4257"
                strokeWidth="1"
                className="transition-colors"
              />
              <text x="227" y="20" textAnchor="middle" fill="#8e92a8" fontSize="7" fontWeight="bold">
                RB
              </text>

              {/* Left Stick (Positioned Upper-Left) */}
              <circle cx="85" cy="50" r="16" fill="#181922" stroke="#33374a" strokeWidth="1.5" />
              <circle
                cx={85 + stickPositions.lx * 9}
                cy={50 + stickPositions.ly * 9}
                r="9"
                fill={pressedButtons[10] ? '#00f0ff' : '#282b3d'}
                stroke={pressedButtons[10] ? '#ffffff' : '#454a63'}
                strokeWidth="1.5"
                className="transition-transform duration-75"
              />
              <text x="85" y="73" textAnchor="middle" fill="#696f8c" fontSize="6" fontWeight="bold">
                LS ({settings.activeStick === 'left' ? 'AKTIV' : ''})
              </text>

              {/* D-Pad (Positioned Lower-Left) */}
              <g transform="translate(118, 70)">
                {/* D-Pad Up */}
                <rect
                  x="-4"
                  y="-14"
                  width="8"
                  height="10"
                  fill={pressedButtons[12] ? '#00f0ff' : '#20222f'}
                  stroke="#383c52"
                />
                {/* D-Pad Down */}
                <rect
                  x="-4"
                  y="4"
                  width="8"
                  height="10"
                  fill={pressedButtons[13] ? '#00f0ff' : '#20222f'}
                  stroke="#383c52"
                />
                {/* D-Pad Left */}
                <rect
                  x="-14"
                  y="-4"
                  width="10"
                  height="8"
                  fill={pressedButtons[14] ? '#00f0ff' : '#20222f'}
                  stroke="#383c52"
                />
                {/* D-Pad Right */}
                <rect
                  x="4"
                  y="-4"
                  width="10"
                  height="8"
                  fill={pressedButtons[15] ? '#00f0ff' : '#20222f'}
                  stroke="#383c52"
                />
                <circle cx="0" cy="0" r="4" fill="#181924" />
              </g>

              {/* Xbox Center Guide Logo */}
              <circle
                cx="160"
                cy="38"
                r="8"
                fill={pressedButtons[16] ? '#10b981' : '#242838'}
                stroke="#10b981"
                strokeWidth="1"
              />
              <text x="160" y="41" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                ✕
              </text>

              {/* View & Menu Buttons */}
              <circle
                cx="140"
                cy="46"
                r="3.5"
                fill={pressedButtons[8] ? '#ffffff' : '#2a2d3d'}
              />
              <circle
                cx="180"
                cy="46"
                r="3.5"
                fill={pressedButtons[9] ? '#ffffff' : '#2a2d3d'}
              />

              {/* Action Buttons: A (0), B (1), X (2), Y (3) */}
              <g transform="translate(235, 50)">
                {/* Y (Top, Yellow) */}
                <circle
                  cx="0"
                  cy="-12"
                  r="6"
                  fill={pressedButtons[3] ? '#eab308' : '#20222f'}
                  stroke="#eab308"
                  strokeWidth="1"
                />
                <text x="0" y="-9.5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                  Y
                </text>

                {/* A (Bottom, Green) */}
                <circle
                  cx="0"
                  cy="12"
                  r="6"
                  fill={pressedButtons[0] ? '#22c55e' : '#20222f'}
                  stroke="#22c55e"
                  strokeWidth="1"
                />
                <text x="0" y="14.5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                  A
                </text>

                {/* X (Left, Blue) */}
                <circle
                  cx="-12"
                  cy="0"
                  r="6"
                  fill={pressedButtons[2] ? '#3b82f6' : '#20222f'}
                  stroke="#3b82f6"
                  strokeWidth="1"
                />
                <text x="-12" y="2.5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                  X
                </text>

                {/* B (Right, Red) */}
                <circle
                  cx="12"
                  cy="0"
                  r="6"
                  fill={pressedButtons[1] ? '#ef4444' : '#20222f'}
                  stroke="#ef4444"
                  strokeWidth="1"
                />
                <text x="12" y="2.5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                  B
                </text>
              </g>

              {/* Right Stick (Positioned Lower-Right) */}
              <circle cx="195" cy="72" r="14" fill="#181922" stroke="#33374a" strokeWidth="1.5" />
              <circle
                cx={195 + stickPositions.rx * 8}
                cy={72 + stickPositions.ry * 8}
                r="8"
                fill={pressedButtons[11] ? '#00f0ff' : '#282b3d'}
                stroke={pressedButtons[11] ? '#ffffff' : '#454a63'}
                strokeWidth="1.5"
                className="transition-transform duration-75"
              />
              <text x="195" y="94" textAnchor="middle" fill="#696f8c" fontSize="6" fontWeight="bold">
                RS ({settings.activeStick === 'right' ? 'AKTIV' : ''})
              </text>
            </svg>
          </div>

          {/* Quick Diagnostics & Rumble Test */}
          <div className="flex-1 flex flex-col justify-center space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-dim">{tr(lang, 'Status:', 'Status:', 'Estado:')}</span>
              <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                {isConnected
                  ? tr(lang, '✓ Controller Eingaben aktiv', '✓ Controller inputs active', '✓ Entradas de mando activas')
                  : tr(lang, 'Kein Signal – Controller einschalten', 'No signal – power on controller', 'Sin señal – enciende el mando')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-dim">{tr(lang, 'Stick-Position (X / Y):', 'Stick Position (X / Y):', 'Posición Palanca (X / Y):')}</span>
              <span className="text-brand-cyan font-bold">
                {settings.activeStick === 'left'
                  ? `${(stickPositions.lx * 100).toFixed(0)}% / ${(stickPositions.ly * -100).toFixed(0)}%`
                  : `${(stickPositions.rx * 100).toFixed(0)}% / ${(stickPositions.ry * -100).toFixed(0)}%`}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestRumble}
                disabled={!isConnected}
                className="px-3 py-1 bg-border-bright/40 hover:bg-brand-cyan/20 border border-border-dim hover:border-brand-cyan/50 text-xs font-mono rounded-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={tr(lang, 'Sendet ein Test-Vibrationsmuster an den XBOX Controller', 'Sends a test vibration pattern to the Xbox controller', 'Envía un patrón de vibración de prueba al mando Xbox')}
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>{tr(lang, 'Haptik-Vibration testen', 'Test Haptic Vibration', 'Probar Vibración Háptica')}</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1 bg-bg-panel hover:bg-rose-500/10 border border-border-dim hover:border-rose-500/40 text-xs font-mono text-text-dim hover:text-rose-300 rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title={tr(lang, 'Alle Controller- und Tastenbelegungen auf Standard zurücksetzen', 'Reset all controller and key bindings to defaults', 'Restablecer todas las asignaciones a los valores predeterminados')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{tr(lang, 'Standardbelegung', 'Reset Defaults', 'Restablecer')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-border-dim bg-bg-base/60 shrink-0 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'editor'
                ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10'
                : 'border-transparent text-text-dim hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>{tr(lang, '1. Session-Editor Buttons', '1. Session Editor Buttons', '1. Botones del Editor')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pad')}
            className={`px-4 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'pad'
                ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10'
                : 'border-transparent text-text-dim hover:text-white'
            }`}
          >
            <Gamepad2 className="h-4 w-4" />
            <span>{tr(lang, '2. Einhand-Pad Steuerung', '2. One-Hand Pad Controls', '2. Controles del Pad')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stick')}
            className={`px-4 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'stick'
                ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10'
                : 'border-transparent text-text-dim hover:text-white'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>{tr(lang, '3. Stick-Sensitivität & Kalibrierung', '3. Stick Sensitivity & Calibration', '3. Sensibilidad y Calibración')}</span>
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeListeningAction && (
            <div className="p-3 bg-amber-500/20 border border-amber-400 rounded-sm flex items-center justify-between text-amber-200 animate-pulse text-xs font-mono">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {activeListeningAction.type === 'gamepad'
                    ? tr(
                        lang,
                        'Drücke jetzt die gewünschte Taste auf deinem XBOX Controller...',
                        'Press the desired button on your XBOX controller now...',
                        'Presiona el botón deseado en tu mando XBOX...'
                      )
                    : tr(
                        lang,
                        'Drücke jetzt die gewünschte Taste auf deiner Tastatur... (Esc zum Abbrechen)',
                        'Press the desired key on your keyboard now... (Esc to cancel)',
                        'Presiona la tecla deseada en tu teclado... (Esc para cancelar)'
                      )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveListeningAction(null)}
                className="px-2 py-0.5 bg-black/40 hover:bg-black/70 rounded text-[11px] font-bold cursor-pointer"
              >
                {tr(lang, 'Abbrechen', 'Cancel', 'Cancelar')}
              </button>
            </div>
          )}

          {/* TAB 1 & 2: MAPPING MATRIX */}
          {(activeTab === 'editor' || activeTab === 'pad') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-text-dim pb-1 border-b border-border-dim font-mono">
                <span>{tr(lang, 'AKTION', 'ACTION', 'ACCIÓN')}</span>
                <div className="flex items-center gap-6">
                  <span className="w-40 text-center">{tr(lang, 'XBOX CONTROLLER', 'XBOX CONTROLLER', 'MANDO XBOX')}</span>
                  <span className="w-36 text-center">{tr(lang, 'TASTATUR (FALLBACK)', 'KEYBOARD (FALLBACK)', 'TECLADO (RESPALDO)')}</span>
                </div>
              </div>

              {filteredActions.map((action) => {
                const map = settings.mappings[action.id] || {
                  gamepadButton: action.defaultGamepadButton,
                  keyboardKey: action.defaultKey,
                  keyboardLabel: action.defaultKeyLabel,
                };

                const mappedBtnDef =
                  map.gamepadButton !== null
                    ? XBOX_BUTTONS.find((b) => b.index === map.gamepadButton)
                    : null;

                const isListeningThisGamepad =
                  activeListeningAction?.id === action.id &&
                  activeListeningAction.type === 'gamepad';
                const isListeningThisKeyboard =
                  activeListeningAction?.id === action.id &&
                  activeListeningAction.type === 'keyboard';

                const meta = getActionMeta(action.id, lang);

                return (
                  <div
                    key={action.id}
                    className="p-3 bg-bg-base/70 hover:bg-bg-base border border-border-dim hover:border-brand-cyan/40 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    {/* Action Title & Info */}
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{meta.label}</span>
                      </div>
                      <div className="text-xs text-text-dim mt-0.5">
                        {meta.desc}
                      </div>
                    </div>

                    {/* Controls & Rebinding Buttons */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Gamepad Button Rebind */}
                      <button
                        type="button"
                        onClick={() => {
                          sensoryEngine.playTactileClick('secondary');
                          setActiveListeningAction({ id: action.id, type: 'gamepad' });
                        }}
                        className={`w-40 px-3 py-1.5 rounded-sm border font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          isListeningThisGamepad
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse font-bold'
                            : mappedBtnDef
                            ? 'bg-bg-panel border-border-bright hover:border-brand-cyan text-white shadow-inner'
                            : 'bg-zinc-900 border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300'
                        }`}
                        title={tr(lang, 'Klicken, um eine Taste auf dem Xbox Controller zuzuweisen', 'Click to assign an Xbox controller button', 'Haz clic para asignar un botón del mando Xbox')}
                      >
                        <Gamepad2 className="h-3.5 w-3.5 text-brand-cyan shrink-0" />
                        <span className="font-bold truncate">
                          {isListeningThisGamepad
                            ? tr(lang, 'Taste drücken...', 'Press button...', 'Presiona botón...')
                            : mappedBtnDef
                            ? `${mappedBtnDef.shortName} (${mappedBtnDef.name})`
                            : tr(lang, 'Nicht belegt', 'Unbound', 'Sin asignar')}
                        </span>
                      </button>

                      {/* Keyboard Key Rebind */}
                      <button
                        type="button"
                        onClick={() => {
                          sensoryEngine.playTactileClick('secondary');
                          setActiveListeningAction({ id: action.id, type: 'keyboard' });
                        }}
                        className={`w-36 px-3 py-1.5 rounded-sm border font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          isListeningThisKeyboard
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse font-bold'
                            : map.keyboardKey
                            ? 'bg-bg-panel border-border-bright hover:border-purple-400 text-white shadow-inner'
                            : 'bg-zinc-900 border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300'
                        }`}
                        title={tr(lang, 'Klicken, um eine Taste auf der Tastatur zuzuweisen', 'Click to assign a keyboard key', 'Haz clic para asignar una tecla')}
                      >
                        <Keyboard className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span className="font-bold truncate">
                          {isListeningThisKeyboard
                            ? tr(lang, 'Taste drücken...', 'Press key...', 'Presiona tecla...')
                            : map.keyboardLabel || map.keyboardKey || tr(lang, 'Nicht belegt', 'Unbound', 'Sin asignar')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: STICK SENSITIVITY & CALIBRATION */}
          {activeTab === 'stick' && (
            <div className="space-y-6">
              <div className="p-4 bg-bg-base/80 border border-brand-cyan/30 rounded-sm space-y-4">
                <div className="flex items-center gap-2 text-brand-cyan font-mono text-sm font-bold uppercase">
                  <Sliders className="h-4 w-4" />
                  <span>{tr(lang, 'Einhand-Pad: Stick-Empfindlichkeit (Sensitivität)', 'One-Hand Pad: Stick Sensitivity', 'Pad con Una Mano: Sensibilidad de Palanca')}</span>
                </div>
                <p className="text-xs text-text-dim">
                  {tr(
                    lang,
                    'Bestimmt, wie schnell sich der Cursor im 2D-Graphen des Einhand-Modus bewegt, wenn du den Stick neigst.',
                    'Determines how fast the cursor moves in the 2D graph when tilting the stick.',
                    'Determina qué tan rápido se mueve el cursor en el gráfico 2D al inclinar la palanca.'
                  )}
                </p>

                {/* Sensitivitäts-Schieberegler */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-text-dim">{tr(lang, 'Reaktions-Multiplikator:', 'Response Multiplier:', 'Multiplicador de Respuesta:')}</span>
                    <span className="text-brand-cyan font-black text-sm">
                      {settings.stickSensitivity.toFixed(2)}x (
                      {Math.round(settings.stickSensitivity * 72)} % / {tr(lang, 'Sekunde', 'Second', 'Segundo')})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={settings.stickSensitivity}
                    onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-dim font-mono">
                    <span>0.2x ({tr(lang, 'Ultra-Fein & Sanft', 'Ultra-Fine & Smooth', 'Ultra fino y suave')})</span>
                    <span>1.0x ({tr(lang, 'Präziser Standard', 'Precise Default', 'Estándar preciso')})</span>
                    <span>3.0x ({tr(lang, 'Hyper-Speed Reaktionszeit', 'Hyper-Speed Response', 'Respuesta hiperrápida')})</span>
                  </div>
                </div>

                {/* Deadzone Schieberegler */}
                <div className="space-y-2 pt-3 border-t border-border-dim">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-text-dim">{tr(lang, 'Stick-Deadzone (Totzone gegen Stick-Drift):', 'Stick Deadzone (Anti-Drift):', 'Zona Muerta de Palanca (Anti-Deriva):')}</span>
                    <span className="text-amber-300 font-bold">
                      {Math.round(settings.stickDeadzone * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.04"
                    max="0.30"
                    step="0.01"
                    value={settings.stickDeadzone}
                    onChange={(e) => handleDeadzoneChange(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-dim font-mono">
                    <span>4% ({tr(lang, 'Sehr empfindlich', 'Very sensitive', 'Muy sensible')})</span>
                    <span>12% ({tr(lang, 'Optimal für Xbox', 'Optimal for Xbox', 'Óptimo para Xbox')})</span>
                    <span>30% ({tr(lang, 'Starker Drift-Schutz', 'High drift protection', 'Alta protección')})</span>
                  </div>
                </div>

                {/* Stick Auswahl (Links vs Rechts) & Y-Invertierung */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border-dim">
                  <div>
                    <label className="block text-xs font-mono text-text-dim mb-1.5">
                      {tr(lang, 'Aktiver Stick für 2D-Pad:', 'Active Stick for 2D Pad:', 'Palanca Activa para Pad 2D:')}
                    </label>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => handleStickSelect('left')}
                        className={`flex-1 py-1.5 px-3 rounded-sm border cursor-pointer font-bold transition-all ${
                          settings.activeStick === 'left'
                            ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-sm'
                            : 'bg-bg-panel border-border-dim text-text-dim hover:text-white'
                        }`}
                      >
                        {tr(lang, 'Linker Stick (LS)', 'Left Stick (LS)', 'Palanca Izquierda (LS)')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStickSelect('right')}
                        className={`flex-1 py-1.5 px-3 rounded-sm border cursor-pointer font-bold transition-all ${
                          settings.activeStick === 'right'
                            ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-sm'
                            : 'bg-bg-panel border-border-dim text-text-dim hover:text-white'
                        }`}
                      >
                        {tr(lang, 'Rechter Stick (RS)', 'Right Stick (RS)', 'Palanca Derecha (RS)')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-text-dim mb-1.5">
                      {tr(lang, 'Vertikale Achse (Y-Achse):', 'Vertical Axis (Y-Axis):', 'Eje Vertical (Eje Y):')}
                    </label>
                    <button
                      type="button"
                      onClick={handleInvertYToggle}
                      className={`w-full py-1.5 px-3 rounded-sm border cursor-pointer font-mono text-xs font-bold transition-all flex items-center justify-between ${
                        settings.invertY
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-bg-panel border-border-dim text-text-dim hover:text-white'
                      }`}
                    >
                      <span>{tr(lang, 'Y-Achse Invertieren', 'Invert Y-Axis', 'Invertir Eje Y')}</span>
                      <span className="text-[11px] uppercase">
                        {settings.invertY
                          ? tr(lang, 'Aktiv (Ab = Mehr Hub)', 'Active (Down = More Stroke)', 'Activo (Abajo = Más Carrera)')
                          : tr(lang, 'Standard (Auf = Mehr Hub)', 'Default (Up = More Stroke)', 'Estándar (Arriba = Más Carrera)')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Steuerung im Einhand-Modus Infokarte */}
                <div className="pt-3 border-t border-border-dim space-y-2">
                  <div className="text-xs font-mono font-bold text-brand-cyan flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-emerald-400" />
                    <span>{tr(lang, 'Steuerung im Einhand-Modus (Isolierte Achsen & Tasten):', 'One-Hand Mode Controls (Isolated Axes & Buttons):', 'Control en Modo de Una Mano (Ejes y Botones Aislados):')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-bg-panel border border-border-dim">
                      <div className="text-brand-cyan font-bold flex items-center justify-between">
                        <span>{tr(lang, 'Linker Stick (LS)', 'Left Stick (LS)', 'Palanca Izquierda (LS)')}</span>
                        <span className="text-[10px] text-text-dim">{tr(lang, '2D-Pad Position', '2D Pad Position', 'Posición del Pad 2D')}</span>
                      </div>
                      <div className="text-[11px] text-text-dim mt-1.5 space-y-1">
                        <div>• <strong>{tr(lang, 'X-Achse (↔):', 'X-Axis (↔):', 'Eje X (↔):')}</strong> {tr(lang, 'Taktrate / Tempo (SPM)', 'Cadence / Speed (SPM)', 'Cadencia / Ritmo (SPM)')}</div>
                        <div>• <strong>{tr(lang, 'Y-Achse (↕):', 'Y-Axis (↕):', 'Eje Y (↕):')}</strong> {tr(lang, 'Max. Hubtiefe (mm)', 'Max Stroke Depth (mm)', 'Profundidad Máx. (mm)')}</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-bg-panel border border-brand-cyan/40">
                      <div className="text-brand-cyan font-bold flex items-center justify-between">
                        <span>{tr(lang, 'Rechter Stick (RS)', 'Right Stick (RS)', 'Palanca Derecha (RS)')}</span>
                        <span className="text-[10px] text-brand-cyan">{tr(lang, 'Hub-Amplitude', 'Stroke Amplitude', 'Amplitud de Carrera')}</span>
                      </div>
                      <div className="text-[11px] text-text-dim mt-1.5 space-y-1">
                        <div>• <strong>{tr(lang, 'Y-Achse (↕):', 'Y-Axis (↕):', 'Eje Y (↕):')}</strong> {tr(lang, 'Hub-Regler (Spanne 14% – 90%)', 'Stroke slider (Span 14% – 90%)', 'Control de carrera (14% – 90%)')}</div>
                        <div className="text-brand-cyan/80 text-[10px]">{tr(lang, 'Rein isoliert: Vertikale Hub-Verstellung ohne Sanftheits-Kollision', 'Isolated: Vertical stroke adjustment without softness collision', 'Aislado: Ajuste vertical sin conflicto con suavidad')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-bg-panel border border-brand-orchid/40 font-mono text-xs">
                    <div className="text-brand-orchid font-bold flex items-center justify-between">
                      <span>{tr(lang, 'D-Pad (Steuerkreuz ◄ / ►)', 'D-Pad (◄ / ►)', 'Cruceta D-Pad (◄ / ►)')}</span>
                      <span className="text-[10px] text-brand-orchid">{tr(lang, 'Umkehr-Sanftheit (0x09)', 'Reversal Softness (0x09)', 'Suavidad de Inversión (0x09)')}</span>
                    </div>
                    <div className="text-[11px] text-text-dim mt-1.5 space-y-1">
                      <div>• <strong>{tr(lang, 'D-Pad Links (◄):', 'D-Pad Left (◄):', 'D-Pad Izquierda (◄):')}</strong> {tr(lang, 'Umkehr direkter & knackiger (-1 Stufe)', 'Reversal crisper & direct (-1 level)', 'Inversión más directa y nítida (-1 nivel)')}</div>
                      <div>• <strong>{tr(lang, 'D-Pad Rechts (►):', 'D-Pad Right (►):', 'D-Pad Derecha (►):')}</strong> {tr(lang, 'Umkehr sanfter & seidenweicher (+1 Stufe)', 'Reversal softer & smoother (+1 level)', 'Inversión más suave y sedosa (+1 nivel)')}</div>
                      <div className="text-brand-orchid/80 text-[10px]">{tr(lang, '100% sauber entkoppelt: Verhindert versehentliches Verstellen beim Hub-Steuern', 'Decoupled: Prevents accidental adjustments when adjusting stroke', 'Desacoplado: Evita cambios accidentales al ajustar la carrera')}</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-bg-panel border border-amber-500/40 font-mono text-xs">
                    <div className="text-amber-300 font-bold flex items-center justify-between">
                      <span>{tr(lang, 'Trigger-Schaltung (RT / R2 & LT / L2)', 'Trigger Shifting (RT / R2 & LT / L2)', 'Cambio con Gatillos (RT / R2 & LT / L2)')}</span>
                      <span className="text-[10px] text-amber-300">{tr(lang, 'SPM Turbo-Gänge', 'SPM Turbo Gears', 'Marchas Turbo SPM')}</span>
                    </div>
                    <div className="text-[11px] text-text-dim mt-1.5 space-y-1">
                      <div>• <strong>{tr(lang, 'Rechter Trigger (RT / R2):', 'Right Trigger (RT / R2):', 'Gatillo Derecho (RT / R2):')}</strong> {tr(lang, 'Turbo aufsteigend hochschalten (1.0x → 1.25x → 1.5x → 1.75x → 2.0x)', 'Shift turbo up (1.0x → 1.25x → 1.5x → 1.75x → 2.0x)', 'Subir turbo (1.0x → 1.25x → 1.5x → 1.75x → 2.0x)')}</div>
                      <div>• <strong>{tr(lang, 'Linker Trigger (LT / L2):', 'Left Trigger (LT / L2):', 'Gatillo Izquierdo (LT / L2):')}</strong> {tr(lang, 'Turbo absteigend runterschalten (2.0x → 1.75x → 1.5x → 1.25x → 1.0x Normal)', 'Shift turbo down (2.0x → 1.75x → 1.5x → 1.25x → 1.0x Normal)', 'Bajar turbo (2.0x → 1.75x → 1.5x → 1.25x → 1.0x Normal)')}</div>
                      <div className="text-amber-300/80 text-[10px]">{tr(lang, 'Bequemes Zurückschalten direkt per LT, ohne alle oberen Gänge durchschalten zu müssen!', 'Convenient downshifting via LT without having to cycle through all gears!', '¡Cambio descendente cómodo mediante LT sin tener que recorrer todas las marchas superiores!')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-dim bg-bg-base shrink-0 font-mono text-xs">
          <div className="flex items-center gap-2 text-text-dim">
            <HelpCircle className="h-4 w-4 text-brand-cyan" />
            <span className="hidden sm:inline">
              {tr(
                lang,
                'Belegungen werden automatisch im lokalen Speicher gesichert.',
                'Mappings are automatically saved to local storage.',
                'Las asignaciones se guardan automáticamente en el almacenamiento local.'
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-brand-cyan text-bg-base hover:bg-brand-cyan/90 font-bold rounded-sm shadow-md cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>{tr(lang, 'Fertig & Schließen', 'Done & Close', 'Listo y Cerrar')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
