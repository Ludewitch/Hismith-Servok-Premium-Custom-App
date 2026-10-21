import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Compass,
  Play,
  Pause,
  Waves,
  Sparkles,
  Heart,
  Sliders,
  Droplets,
  ArrowLeft,
  Bluetooth,
  ShieldCheck,
  TrendingUp,
  Activity,
  Feather,
  Lock,
  CircleDot,
  Square,
  Download,
  Bookmark,
  Trash2,
  CheckCircle2,
  FileDown,
  Gamepad2,
  Zap,
  Flame,
} from 'lucide-react';
import { sensoryEngine } from '../services/sensoryEngine';
import { servokBle } from '../services/servokBle';
import { getAllPresets } from '../data/presets';
import { Waypoint, LubeTrigger, Subsection, PresetDefinition } from '../types/servok';
import { SavePresetModal } from './SavePresetModal';
import { gamepadService, ControllerActionId } from '../services/gamepadService';
import { ControllerMappingModal } from './ControllerMappingModal';
import { tr } from '../i18n/translations';

export type FlowWaveMode =
  | 'manual_glide'
  | 'silk_sine'
  | 'golden_climax'
  | 'heartbeat_pulse'
  | 'ocean_swell'
  | 'butterfly_flutter'
  | 'hardware_cycle';

export interface RecordedPadSessionPayload {
  title: string;
  durationMs: number;
  minDepth: Waypoint[];
  maxDepth: Waypoint[];
  spm: Waypoint[];
  hardness: Waypoint[];
  lubeTriggers?: LubeTrigger[];
  subsections?: Subsection[];
}

interface OneHandedPadPlayerViewProps {
  language: 'de' | 'en' | 'es';
  isConnected: boolean;
  onConnectBle: () => void;
  onBackToStart: () => void;
  onOpenPresets?: () => void;
  onOpenEditor?: () => void;
  onOpenEditorWithCurve?: (payload: RecordedPadSessionPayload) => void;
  onTriggerLube?: (bursts: number) => void;
  lubeConnected?: boolean;
  onEmergencyStop?: () => void;
  onPresetSaved?: (preset: PresetDefinition) => void;
  onOpenControllerMapping?: () => void;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

export const OneHandedPadPlayerView: React.FC<OneHandedPadPlayerViewProps> = ({
  language,
  isConnected,
  onConnectBle,
  onBackToStart,
  onOpenPresets,
  onOpenEditor,
  onOpenEditorWithCurve,
  onTriggerLube,
  onEmergencyStop,
  onPresetSaved,
  onOpenControllerMapping,
}) => {
  // Gamepad & Xbox Controller Integration State
  const [isControllerConnected, setIsControllerConnected] = useState<boolean>(() =>
    gamepadService.isGamepadConnected()
  );
  const [showLocalControllerModal, setShowLocalControllerModal] = useState<boolean>(false);
  const [gamepadSettings, setGamepadSettings] = useState(() => gamepadService.getSettings());

  useEffect(() => {
    return gamepadService.subscribe((conn) => {
      setIsControllerConnected(conn);
      setGamepadSettings(gamepadService.getSettings());
    });
  }, []);

  // Primary 2D Pad Coordinates (X = Tempo/SPM 0..100%, Y = Max Depth 20..100%)
  const [padX, setPadX] = useState<number>(38); // ~68 SPM default
  const [padY, setPadY] = useState<number>(68); // ~121 mm Max Depth default
  const [spanPct, setSpanPct] = useState<number>(42); // Stroke corridor span %
  const [smoothness, setSmoothness] = useState<number>(8); // 0=Direkt, 10=Seidenweich (BLE 0x09)
  const [inertiaEnabled, setInertiaEnabled] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  // Rechter Analogstick Live-Ablenkung (Y-Achse: rein isolierte Hub-Amplitude)
  const [rsDeflection, setRsDeflection] = useState<{ active: boolean; dy: number }>({
    active: false,
    dy: 0,
  });
  // D-Pad Feedback für Umkehr-Sanftheit (Links: Direkter, Rechts: Sanfter)
  const [dpadSmoothPulse, setDpadSmoothPulse] = useState<'left' | 'right' | null>(null);
  const dpadTimeoutRef = useRef<any>(null);

  // SPM Turbo-Boost Engine (1.0x bis 2.0x Multiplikator & Momentary Nitrous Surge)
  const [turboMultiplier, setTurboMultiplier] = useState<number>(1.0); // 1.0 = Standard (aus), 1.25x, 1.5x, 1.8x, 2.0x
  const [isMomentaryTurbo, setIsMomentaryTurbo] = useState<boolean>(false);

  // Autonomous Wave Flow Player State
  const [isFlowPlaying, setIsFlowPlaying] = useState<boolean>(false);
  const [flowMode, setFlowMode] = useState<FlowWaveMode>('silk_sine');
  const [livePosPct, setLivePosPct] = useState<number>(45);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Hardware Signal Übertragungs-Modus & Live-Telemetrie (Standard: Firmware Auto-Cycle für zuverlässige Echtzeit-Rhythmen)
  const [hardwareMode, setHardwareMode] = useState<'firmware_cycle' | 'stream_pos'>('firmware_cycle');
  const [lastTxInfo, setLastTxInfo] = useState<string>('Auto Bereit');
  const [lastTxTime, setLastTxTime] = useState<number>(0);

  // Stetige Phasen-Integration gegen Phasensprünge bei Tempowechseln
  const continuousPhaseRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(performance.now());
  const lastElapsedSecRef = useRef<number>(-1);

  // Aktive Parameter-Referenz für unterbrechungsfreies, ruckelfreies 60fps Wave-Streaming
  const activeFlowStateRef = useRef({
    minDepthPct: 26,
    maxDepthPct: 68,
    currentSpm: 68,
    padX: 38,
    flowMode: 'silk_sine' as FlowWaveMode,
    hardwareMode: 'firmware_cycle' as 'firmware_cycle' | 'stream_pos',
    smoothness: 8,
  });

  // ============================================================================
  // LIVE ONE-HANDED RECORDING ENGINE STATE
  // ============================================================================
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedDurationMs, setRecordedDurationMs] = useState<number>(0);
  const [recordedMinDepth, setRecordedMinDepth] = useState<Waypoint[]>([]);
  const [recordedMaxDepth, setRecordedMaxDepth] = useState<Waypoint[]>([]);
  const [recordedSpm, setRecordedSpm] = useState<Waypoint[]>([]);
  const [recordedHardness, setRecordedHardness] = useState<Waypoint[]>([]);
  const [recordedLubes, setRecordedLubes] = useState<LubeTrigger[]>([]);
  const [recordedSubsections, setRecordedSubsections] = useState<Subsection[]>([]);
  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [savedSuccessBanner, setSavedSuccessBanner] = useState<string | null>(null);

  const recordStartPerfRef = useRef<number>(0);
  const lastSampleTimeMsRef = useRef<number>(-500);
  const liveParamsRef = useRef<{
    minPct: number;
    maxPct: number;
    spmPct: number;
    hardnessPct: number;
    livePos: number;
    mode: FlowWaveMode;
  }>({
    minPct: 26,
    maxPct: 68,
    spmPct: 38,
    hardnessPct: 20,
    livePos: 45,
    mode: 'silk_sine',
  });

  // Refs for 60fps Canvas Fluid Glass Optics & Physics Momentum
  const padContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const lastPointerRef = useRef<{ x: number; y: number; t: number }>({ x: 38, y: 68, t: 0 });
  const momentumAnimRef = useRef<number | null>(null);
  const flowAnimRef = useRef<number | null>(null);
  const lastBleTxRef = useRef<number>(0);

  // Physical millimeter conversions (17 mm to 170 mm)
  const toMm = (pct: number) => Math.round(17 + (Math.max(0, Math.min(100, pct)) / 100) * 153);
  const minDepthPct = Math.max(2, Math.round(padY - spanPct));
  const maxDepthPct = Math.max(minDepthPct + 12, Math.min(98, Math.round(padY)));

  // SPM & Turboboost Berechnungen
  const activeTurboMultiplier = isMomentaryTurbo ? 2.0 : turboMultiplier;
  const isTurboActive = activeTurboMultiplier > 1.0;
  const currentSpm = Math.round(12 + (padX / 100) * 188); // Basis 12 bis 200 SPM
  const effectiveSpm = Math.max(12, Math.min(600, Math.round(currentSpm * activeTurboMultiplier)));
  const currentHardnessPct = Math.max(5, Math.min(100, Math.round(((10 - smoothness) / 10) * 100)));

  // Synchronisiere activeFlowStateRef für die 60fps Oscillator Loop
  useEffect(() => {
    activeFlowStateRef.current = {
      minDepthPct,
      maxDepthPct,
      currentSpm: effectiveSpm,
      padX,
      flowMode,
      hardwareMode,
      smoothness,
    };
  }, [minDepthPct, maxDepthPct, effectiveSpm, padX, flowMode, hardwareMode, smoothness]);

  // Keep liveParamsRef synced for the recording sampler
  useEffect(() => {
    liveParamsRef.current = {
      minPct: minDepthPct,
      maxPct: maxDepthPct,
      spmPct: Math.round(padX),
      hardnessPct: currentHardnessPct,
      livePos: Math.round(livePosPct),
      mode: flowMode,
    };
  }, [minDepthPct, maxDepthPct, padX, currentHardnessPct, livePosPct, flowMode]);

  // Sync Screen Wake Lock when player or recording is active
  useEffect(() => {
    sensoryEngine.syncWakeLock(isFlowPlaying || isDragging || isRecording);
    return () => {
      sensoryEngine.syncWakeLock(false);
    };
  }, [isFlowPlaying, isDragging, isRecording]);

  // Append a sample to the active recording
  const appendRecordingSample = useCallback(
    (forceTimeMs?: number, customMin?: number, customMax?: number, customSpm?: number, customHrd?: number) => {
      if (!isRecording) return;
      const nowMs =
        forceTimeMs !== undefined
          ? Math.max(0, Math.round(forceTimeMs))
          : Math.max(0, Math.round(performance.now() - recordStartPerfRef.current));

      if (forceTimeMs === undefined && nowMs - lastSampleTimeMsRef.current < 180) {
        return;
      }
      lastSampleTimeMsRef.current = nowMs;
      setRecordedDurationMs(nowMs);

      const p = liveParamsRef.current;
      const minVal = Math.max(2, Math.min(86, Math.round(customMin ?? p.minPct)));
      const maxVal = Math.max(minVal + 12, Math.min(98, Math.round(customMax ?? p.maxPct)));
      const spmVal = Math.max(4, Math.min(100, Math.round(customSpm ?? p.spmPct)));
      const hrdVal = Math.max(5, Math.min(100, Math.round(customHrd ?? p.hardnessPct)));

      const uid = `${nowMs}-${Math.random().toString(36).substring(2, 5)}`;
      setRecordedMinDepth((prev) => [...prev, { id: `rmin-${uid}`, time: nowMs, pos: minVal }]);
      setRecordedMaxDepth((prev) => [...prev, { id: `rmax-${uid}`, time: nowMs, pos: maxVal }]);
      setRecordedSpm((prev) => [...prev, { id: `rspm-${uid}`, time: nowMs, pos: spmVal }]);
      setRecordedHardness((prev) => [...prev, { id: `rhrd-${uid}`, time: nowMs, pos: hrdVal }]);
    },
    [isRecording]
  );

  // Periodic 250ms Recording Loop so continuous holds & autonomous waves are smoothly captured
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      appendRecordingSample();
    }, 250);
    return () => clearInterval(interval);
  }, [isRecording, appendRecordingSample]);

  const startRecording = () => {
    sensoryEngine.playStartDrop();
    sensoryEngine.hapticPresetChange();
    const now = performance.now();
    recordStartPerfRef.current = now;
    lastSampleTimeMsRef.current = 0;

    const p = liveParamsRef.current;
    setRecordedDurationMs(0);
    setRecordedMinDepth([{ id: 'rmin-0', time: 0, pos: p.minPct }]);
    setRecordedMaxDepth([{ id: 'rmax-0', time: 0, pos: p.maxPct }]);
    setRecordedSpm([{ id: 'rspm-0', time: 0, pos: p.spmPct }]);
    setRecordedHardness([{ id: 'rhrd-0', time: 0, pos: p.hardnessPct }]);
    setRecordedLubes([]);
    setRecordedSubsections([
      {
        id: `rsub-0`,
        name: `1. ${flowMode}`,
        startTime: 0,
        endTime: 1000,
      },
    ]);
    setSavedSuccessBanner(null);
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!isRecording) return;
    const finalMs = Math.max(2000, Math.round(performance.now() - recordStartPerfRef.current));
    const p = liveParamsRef.current;

    setRecordedDurationMs(finalMs);
    setRecordedMinDepth((prev) => [...prev, { id: `rmin-end`, time: finalMs, pos: p.minPct }]);
    setRecordedMaxDepth((prev) => [...prev, { id: `rmax-end`, time: finalMs, pos: p.maxPct }]);
    setRecordedSpm((prev) => [...prev, { id: `rspm-end`, time: finalMs, pos: p.spmPct }]);
    setRecordedHardness((prev) => [...prev, { id: `rhrd-end`, time: finalMs, pos: p.hardnessPct }]);
    setRecordedSubsections((prev) => {
      if (prev.length === 0) {
        return [{ id: 'rsub-main', name: 'Einhand-Pad Aufnahme', startTime: 0, endTime: finalMs }];
      }
      return prev.map((s, idx) => (idx === prev.length - 1 ? { ...s, endTime: finalMs } : s));
    });

    setIsRecording(false);
    sensoryEngine.playStopDrop();
    sensoryEngine.hapticPresetChange();
  };

  const clearRecording = () => {
    sensoryEngine.playClick(0.9);
    setIsRecording(false);
    setRecordedDurationMs(0);
    setRecordedMinDepth([]);
    setRecordedMaxDepth([]);
    setRecordedSpm([]);
    setRecordedHardness([]);
    setRecordedLubes([]);
    setRecordedSubsections([]);
    setSavedSuccessBanner(null);
  };

  // Direct Session Download (.json or .fun/.csv)
  const downloadRecordedSession = (format: 'json' | 'fun' | 'csv') => {
    if (recordedMinDepth.length === 0) return;
    sensoryEngine.playClick(1.15);
    const dur = Math.max(2000, recordedDurationMs);
    const dateStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    if (format === 'json') {
      const sessionObj = {
        version: '1.0',
        type: 'hismith_servok_session',
        source: 'one_handed_pad_recording',
        timestamp: new Date().toISOString(),
        durationMs: dur,
        subsections:
          recordedSubsections.length > 0
            ? recordedSubsections
            : [{ id: 'sub-rec-1', name: 'Einhand-Pad Session', startTime: 0, endTime: dur }],
        waypoints: {
          minDepth: recordedMinDepth,
          maxDepth: recordedMaxDepth,
          spm: recordedSpm,
          hardness: recordedHardness,
        },
        lubeTriggers: recordedLubes,
        servokSettings: {
          minDepth: 0,
          maxDepth: 100,
        },
      };
      const blob = new Blob([JSON.stringify(sessionObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `servok_einhand_session_${dateStamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSavedSuccessBanner(
        tr(
          language,
          '✓ Aufgezeichnete Session als .json Datei heruntergeladen!',
          '✓ Recorded session downloaded as .json file!',
          '✓ ¡Sesión grabada descargada como archivo .json!'
        )
      );
    } else {
      // Export oscillating actuator trajectory as .fun / .csv ("time,pos")
      const lines: string[] = [];
      for (let i = 0; i < recordedMaxDepth.length; i++) {
        const minWp = recordedMinDepth[i] || recordedMinDepth[recordedMinDepth.length - 1];
        const maxWp = recordedMaxDepth[i];
        lines.push(`${maxWp.time},${Math.round(maxWp.pos)}`);
        if (i < recordedMaxDepth.length - 1) {
          const nextTime = recordedMaxDepth[i + 1].time;
          const midTime = Math.round((maxWp.time + nextTime) / 2);
          if (midTime > maxWp.time) {
            lines.push(`${midTime},${Math.round(minWp ? minWp.pos : 20)}`);
          }
        }
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `servok_einhand_script_${dateStamp}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSavedSuccessBanner(
        tr(
          language,
          `✓ Bewegungs-Skript als .${format} Datei heruntergeladen!`,
          `✓ Script downloaded as .${format} file!`,
          `✓ ¡Script descargado como archivo .${format}!`
        )
      );
    }
  };

  // Berechnet Servok PWM-Leistung (18-100%) unter Berücksichtigung von Turbo-Multiplikatoren
  const calcServokPower = useCallback((padXVal: number, turboMul: number = 1.0): number => {
    if (padXVal <= 0) return 18;
    const boosted = Math.min(100, padXVal * turboMul);
    return Math.max(18, Math.min(100, Math.round(18 + (boosted / 100) * 82)));
  }, []);

  // 1. Live-Position Streaming (0x0A Soll-Position: 0-100% Hub)
  const syncHardwarePosition = useCallback((targetPos: number) => {
    const now = performance.now();
    if (now - lastBleTxRef.current < 25) return; // ~40 Hz optimales GATT Streaming
    lastBleTxRef.current = now;

    const clamped = Math.max(0, Math.min(100, Math.round(targetPos)));
    if (servokBle.connected) {
      servokBle.streamPosition(clamped);
      setLastTxInfo(`0x0A: ${clamped}% (${toMm(clamped)} mm)`);
      setLastTxTime(Date.now());
    }
  }, []);

  // 2. Firmware Auto-Cycle (0x07 Min, 0x08 Max, 0x03 Speed, 0x09 Smoothness)
  const syncHardwareAutoCycle = useCallback(
    (targetMin: number, targetMax: number, padXVal: number, smoothVal: number, force: boolean = false) => {
      const now = performance.now();
      // Bei kontinuierlichen Gesten mindestens 120ms Abstand einhalten, um Richtungsabbrüche des Motors zu verhindern
      if (!force && now - lastBleTxRef.current < 120) return;
      lastBleTxRef.current = now;

      // Hardware-Schutz: Mindestens 18% Hubspanne garantieren (verhindert Servok-Mikrohub-Blockaden)
      const minSpan = 18;
      let safeMin = Math.max(0, Math.min(100 - minSpan, Math.round(targetMin)));
      let safeMax = Math.max(safeMin + minSpan, Math.min(100, Math.round(targetMax)));
      const power = calcServokPower(padXVal, activeTurboMultiplier);
      const safeSmooth = Math.max(0, Math.min(10, Math.round(smoothVal)));

      if (servokBle.connected) {
        servokBle.sendAutoCycleSettings(safeMin, safeMax, power, safeSmooth, force);
        setLastTxInfo(`Auto: ${safeMin}–${safeMax}% | ${power}% | S:${safeSmooth}${isTurboActive ? ` (Turbo ${activeTurboMultiplier}x)` : ''}`);
        setLastTxTime(Date.now());
      }
    },
    [calcServokPower, activeTurboMultiplier, isTurboActive]
  );

  // Sofortige Hardware-Nachführung bei Umschaltung von Turbo-Stufen oder Momentary-Nitro
  useEffect(() => {
    if (isFlowPlaying && servokBle.connected) {
      if (hardwareMode === 'firmware_cycle' || flowMode === 'hardware_cycle') {
        syncHardwareAutoCycle(minDepthPct, maxDepthPct, padX, smoothness, true);
      } else {
        const power = calcServokPower(padX, activeTurboMultiplier);
        servokBle.sendCommand(0x03, power, `Turbo SPM: ${power}% (${activeTurboMultiplier}x)`);
        setLastTxInfo(`Turbo: ${power}% (${activeTurboMultiplier}x)`);
        setLastTxTime(Date.now());
      }
    }
  }, [activeTurboMultiplier, isFlowPlaying, hardwareMode, flowMode, minDepthPct, maxDepthPct, padX, smoothness, syncHardwareAutoCycle, calcServokPower]);

  // Autonomous Organic Flow Oscillator Loop mit kontinuierlicher Phasen-Integration & ruckelfreiem 60fps Lauf
  useEffect(() => {
    if (!isFlowPlaying) {
      if (flowAnimRef.current) {
        cancelAnimationFrame(flowAnimRef.current);
        flowAnimRef.current = null;
      }
      return;
    }

    lastTickTimeRef.current = performance.now();
    const startTime = performance.now();
    const PHI = 1.61803398875;

    const tick = (now: number) => {
      const dt = Math.min(0.08, Math.max(0.001, (now - lastTickTimeRef.current) / 1000));
      lastTickTimeRef.current = now;

      const p = activeFlowStateRef.current;
      const freqHz = Math.max(0.15, p.currentSpm / 60);

      // Kontinuierliche Phasen-Akkumulation: Schützt vor sprunghaften Phasensprüngen bei Geschwindigkeitsänderungen
      continuousPhaseRef.current = (continuousPhaseRef.current + dt * freqHz) % 1;
      const phase = continuousPhaseRef.current;

      const sec = (now - startTime) / 1000;
      const wholeSec = Math.floor(sec);
      if (wholeSec !== lastElapsedSecRef.current) {
        lastElapsedSecRef.current = wholeSec;
        setElapsedSec(wholeSec);
      }

      const mid = (p.minDepthPct + p.maxDepthPct) / 2;
      const amp = (p.maxDepthPct - p.minDepthPct) / 2;

      let pos = mid;

      switch (p.flowMode) {
        case 'manual_glide':
        case 'silk_sine':
          pos = mid + amp * Math.sin(phase * Math.PI * 2);
          break;
        case 'golden_climax': {
          const cycleProgress = (sec % 90) / 90;
          const env =
            cycleProgress <= 0.618
              ? 0.35 + 0.65 * Math.pow(cycleProgress / 0.618, PHI)
              : 0.55 + 0.45 * Math.sin(((cycleProgress - 0.618) / 0.382) * Math.PI);
          pos = mid + amp * env * Math.sin(phase * Math.PI * 2);
          break;
        }
        case 'heartbeat_pulse': {
          const pulse =
            Math.exp(-Math.pow((phase - 0.22) / 0.08, 2)) * 0.75 +
            Math.exp(-Math.pow((phase - 0.42) / 0.1, 2)) * 1.0;
          pos = p.minDepthPct + (p.maxDepthPct - p.minDepthPct) * Math.min(1, pulse);
          break;
        }
        case 'ocean_swell': {
          const swellEnv = 0.55 + 0.45 * Math.sin((sec / 12) * Math.PI * 2);
          pos = mid + amp * swellEnv * Math.sin(phase * Math.PI * 2);
          break;
        }
        case 'butterfly_flutter': {
          const flutterSpan = Math.min(18, p.maxDepthPct - p.minDepthPct);
          pos = p.maxDepthPct - flutterSpan / 2 + (flutterSpan / 2) * Math.sin(phase * Math.PI * 4);
          break;
        }
        case 'hardware_cycle': {
          // Hardware führt Firmware-Autocycle selbst aus
          pos = mid + amp * Math.sin(phase * Math.PI * 2);
          break;
        }
      }

      const clampedPos = Math.max(0, Math.min(100, Math.round(pos)));
      setLivePosPct(clampedPos);

      // Hardware-Signale übertragen:
      if (p.hardwareMode === 'firmware_cycle' || p.flowMode === 'hardware_cycle') {
        // Hardware taktet autonom per Chip-Firmware
      } else {
        // Exakte physikalische Wellenform als Soll-Position (0x0A) mit ~40Hz streamen
        syncHardwarePosition(clampedPos);
      }

      flowAnimRef.current = requestAnimationFrame(tick);
    };

    flowAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (flowAnimRef.current) {
        cancelAnimationFrame(flowAnimRef.current);
        flowAnimRef.current = null;
      }
    };
  }, [isFlowPlaying, syncHardwarePosition]);

  // 2D Pad Canvas Shader & Caustic Ripples Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let wavePhase = 0;

    const renderPad = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (rect.width > 0 && rect.height > 0) {
        if (
          canvas.width !== Math.floor(rect.width * dpr) ||
          canvas.height !== Math.floor(rect.height * dpr)
        ) {
          canvas.width = Math.floor(rect.width * dpr);
          canvas.height = Math.floor(rect.height * dpr);
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      wavePhase += 0.025 + (padX / 100) * 0.08;

      ctx.clearRect(0, 0, w, h);

      const computedStyle = getComputedStyle(document.documentElement);
      const brandAccent = computedStyle.getPropertyValue('--brand-cyan').trim() || '#e895a5';
      const brandOrchid = computedStyle.getPropertyValue('--brand-orchid').trim() || '#c88eb2';

      // Draw Active Depth Corridor Silk Band (minDepthPct to maxDepthPct)
      const topY = h - (maxDepthPct / 100) * h;
      const botY = h - (minDepthPct / 100) * h;

      const bandGrad = ctx.createLinearGradient(0, topY, 0, botY);
      bandGrad.addColorStop(0, 'rgba(232, 149, 165, 0.18)');
      bandGrad.addColorStop(0.5, 'rgba(200, 142, 178, 0.09)');
      bandGrad.addColorStop(1, 'rgba(232, 149, 165, 0.16)');
      ctx.fillStyle = bandGrad;
      ctx.fillRect(0, topY, w, Math.max(4, botY - topY));

      // Flowing Silk Wave inside the active corridor
      ctx.save();
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const nx = x / w;
        const midY = (topY + botY) * 0.5;
        const ampY = Math.max(6, (botY - topY) * 0.38);
        const y =
          midY +
          Math.sin(nx * Math.PI * (2 + (padX / 100) * 4) - wavePhase) * ampY * 0.75 +
          Math.cos(nx * Math.PI * 1.5 + wavePhase * 0.6) * ampY * 0.25;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = isRecording ? '#f43f5e' : brandAccent;
      ctx.lineWidth = 2.2 * dpr;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.restore();

      // Draw Caustic Ripples
      ripplesRef.current.forEach((rip) => {
        rip.r += 1.8 * dpr;
        rip.alpha *= 0.96;
        ctx.save();
        ctx.beginPath();
        ctx.arc(rip.x * w, (1 - rip.y) * h, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = brandOrchid;
        ctx.globalAlpha = rip.alpha;
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
        ctx.restore();
      });
      ripplesRef.current = ripplesRef.current.filter((r) => r.alpha > 0.03);

      // Draw Silky Touch Trail
      if (trailRef.current.length > 1) {
        ctx.save();
        ctx.beginPath();
        trailRef.current.forEach((pt, idx) => {
          const tx = (pt.x / 100) * w;
          const ty = (1 - pt.y / 100) * h;
          if (idx === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        });
        ctx.strokeStyle = isRecording ? '#f43f5e' : brandAccent;
        ctx.lineWidth = 3 * dpr;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(renderPad);
    };

    animId = requestAnimationFrame(renderPad);
    return () => cancelAnimationFrame(animId);
  }, [padX, minDepthPct, maxDepthPct, isRecording]);

  // Physics-based Momentum Coasting after releasing thumb
  const startInertiaGlide = useCallback(() => {
    if (!inertiaEnabled) return;
    if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);

    const step = () => {
      velocityRef.current.vx *= 0.92;
      velocityRef.current.vy *= 0.92;

      if (
        Math.abs(velocityRef.current.vx) < 0.06 &&
        Math.abs(velocityRef.current.vy) < 0.06
      ) {
        return;
      }

      setPadX((prevX) => {
        const nextX = Math.max(0, Math.min(100, prevX + velocityRef.current.vx));
        if (nextX === 0 || nextX === 100) {
          velocityRef.current.vx *= -0.35;
          sensoryEngine.hapticBoundaryWarning();
        }
        return nextX;
      });

      setPadY((prevY) => {
        const nextY = Math.max(20, Math.min(98, prevY + velocityRef.current.vy));
        if (nextY === 20 || nextY === 98) {
          velocityRef.current.vy *= -0.35;
          sensoryEngine.hapticBoundaryWarning();
        }
        if (!isFlowPlaying || flowMode === 'manual_glide') {
          if (hardwareMode === 'stream_pos') {
            syncHardwarePosition(nextY);
          }
        }
        return nextY;
      });

      momentumAnimRef.current = requestAnimationFrame(step);
    };

    momentumAnimRef.current = requestAnimationFrame(step);
  }, [inertiaEnabled, isFlowPlaying, flowMode, hardwareMode, syncHardwarePosition]);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const el = padContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(20, Math.min(98, (1 - (clientY - rect.top) / rect.height) * 100));

    const now = performance.now();
    const dt = Math.max(8, now - lastPointerRef.current.t);
    velocityRef.current = {
      vx: ((xPct - lastPointerRef.current.x) / dt) * 13,
      vy: ((yPct - lastPointerRef.current.y) / dt) * 13,
    };
    lastPointerRef.current = { x: xPct, y: yPct, t: now };

    setPadX(xPct);
    setPadY(yPct);
    setLivePosPct(yPct);

    // Add silky trail & ripple
    trailRef.current.push({ x: xPct, y: yPct });
    if (trailRef.current.length > 22) trailRef.current.shift();
    if (Math.random() > 0.55) {
      ripplesRef.current.push({ x: xPct / 100, y: yPct / 100, r: 6, alpha: 0.55 });
    }

    if (Math.round(xPct) % 5 === 0) {
      sensoryEngine.playSpeedHarmonic(xPct, 100, activeTurboMultiplier);
      sensoryEngine.hapticIncrement(6);
    }

    const minSpan = 18;
    const nextMin = Math.max(0, Math.min(100 - minSpan, Math.round(yPct - spanPct)));
    const nextMax = Math.max(nextMin + minSpan, Math.min(100, Math.round(yPct)));
    const nextSpm = Math.round(12 + (xPct / 100) * 188);

    // Synchronisiere Ref sofort, damit die 60fps-Schleife ohne Verzögerung die neuen Werte hat
    activeFlowStateRef.current.padX = xPct;
    activeFlowStateRef.current.padY = yPct;
    activeFlowStateRef.current.minDepthPct = nextMin;
    activeFlowStateRef.current.maxDepthPct = nextMax;
    activeFlowStateRef.current.currentSpm = nextSpm;

    // Hardware-Signale übertragen
    if (hardwareMode === 'firmware_cycle' || flowMode === 'hardware_cycle') {
      if (isFlowPlaying) {
        syncHardwareAutoCycle(nextMin, nextMax, xPct, smoothness, false);
      }
    } else {
      if (isFlowPlaying) {
        // Im 0x0A Live-Stream Modus bei X-Änderung Hardware-Geschwindigkeit regeln
        const power = calcServokPower(xPct);
        if (servokBle.connected) {
          servokBle.sendCommand(0x03, power, `2D Pad Dynamic Speed: ${power}%`);
        }
      } else {
        // Manuelle Daumen-Direktführung: Aktor folgt der Daumenhöhe direkt
        syncHardwarePosition(yPct);
      }
    }

    if (isRecording) {
      appendRecordingSample(undefined, nextMin, nextMax, xPct, currentHardnessPct);
    }
  };

  const togglePlayFlow = () => {
    const next = !isFlowPlaying;
    setIsFlowPlaying(next);
    if (next) {
      sensoryEngine.playStartDrop();
      sensoryEngine.startSessionRhythm({
        spm: effectiveSpm,
        minDepth: Math.max(2, padY - spanPct),
        maxDepth: padY,
        hardness: Math.max(5, Math.min(100, Math.round(((10 - smoothness) / 10) * 100))),
      });
      if (servokBle.connected) {
        if (hardwareMode === 'firmware_cycle' || flowMode === 'hardware_cycle') {
          syncHardwareAutoCycle(minDepthPct, maxDepthPct, padX, smoothness, true);
        } else {
          servokBle.applyControlMode('position');
          servokBle.setSmoothness(Math.max(1, Math.min(6, Math.round(smoothness))));
        }
      }
    } else {
      sensoryEngine.playStopDrop();
      sensoryEngine.stopSessionRhythm();
      if (servokBle.connected) {
        servokBle.stop();
        setLastTxInfo('STOP: Halt (0x03 0x00)');
      }
    }
  };

  // Sync rhythmic session audio parameters in real time when flow is active
  useEffect(() => {
    if (isFlowPlaying) {
      sensoryEngine.updateSessionParams(
        effectiveSpm,
        Math.max(2, padY - spanPct),
        padY,
        Math.max(5, Math.min(100, Math.round(((10 - smoothness) / 10) * 100)))
      );
    }
  }, [isFlowPlaying, effectiveSpm, padY, spanPct, smoothness]);

  // Unified Gamepad & Keyboard Action Handler for Einhand-Pad
  const handlePadAction = useCallback(
    (act: ControllerActionId) => {
      switch (act) {
        case 'pad_toggle_flow':
          togglePlayFlow();
          break;

        case 'pad_emergency_stop':
          setIsFlowPlaying(false);
          sensoryEngine.playEmergencyAlert();
          sensoryEngine.hapticEmergencyStop();
          if (servokBle.connected) {
            servokBle.emergencyStop();
            setLastTxInfo('NOT-AUS: Power Off (0xCC 0x02)');
          }
          if (onEmergencyStop) onEmergencyStop();
          break;

        case 'pad_turbo_toggle': {
          const multipliers = [1.0, 1.25, 1.5, 1.75, 2.0];
          let currIdx = multipliers.findIndex((m) => Math.abs(m - turboMultiplier) < 0.05);
          if (currIdx === -1) currIdx = 0;
          const nextIdx = (currIdx + 1) % multipliers.length;
          const nextMul = multipliers[nextIdx];
          setTurboMultiplier(nextMul);
          sensoryEngine.playSpeedHarmonic(padX, 100, nextMul);
          if (nextMul > 1.0) {
            gamepadService.triggerRumble(140, 0.35 * nextMul, 0.45 * nextMul);
          } else {
            sensoryEngine.playTactileClick('secondary');
            gamepadService.triggerRumble(80, 0.15, 0.15);
          }
          break;
        }

        case 'pad_turbo_decrease': {
          const multipliers = [1.0, 1.25, 1.5, 1.75, 2.0];
          let currIdx = multipliers.findIndex((m) => Math.abs(m - turboMultiplier) < 0.05);
          if (currIdx === -1) currIdx = 0;
          const nextIdx = Math.max(0, currIdx - 1);
          const nextMul = multipliers[nextIdx];
          setTurboMultiplier(nextMul);
          sensoryEngine.playSpeedHarmonic(padX, 100, nextMul);
          if (nextMul > 1.0) {
            gamepadService.triggerRumble(120, 0.25 * nextMul, 0.35 * nextMul);
          } else {
            sensoryEngine.playTactileClick('secondary');
            gamepadService.triggerRumble(80, 0.15, 0.15);
          }
          break;
        }

        case 'pad_next_mode':
        case 'pad_prev_mode': {
          const modes: FlowWaveMode[] = [
            'silk_sine',
            'golden_climax',
            'heartbeat_pulse',
            'ocean_swell',
            'butterfly_flutter',
            'hardware_cycle',
            'manual_glide',
          ];
          const curIdx = modes.indexOf(flowMode);
          const nextIdx =
            act === 'pad_next_mode'
              ? (curIdx + 1) % modes.length
              : (curIdx - 1 + modes.length) % modes.length;
          const nextMode = modes[nextIdx];

          sensoryEngine.playPresetChime();
          setFlowMode(nextMode);
          activeFlowStateRef.current.flowMode = nextMode;

          if (nextMode === 'hardware_cycle') {
            setHardwareMode('firmware_cycle');
            if (isFlowPlaying && servokBle.connected) {
              syncHardwareAutoCycle(minDepthPct, maxDepthPct, padX, smoothness, true);
            }
          } else {
            setHardwareMode('stream_pos');
            if (isFlowPlaying && servokBle.connected) {
              servokBle.applyControlMode('position');
              servokBle.setSmoothness(smoothness);
            }
          }
          break;
        }

        case 'pad_trigger_lube':
          if (onTriggerLube) {
            sensoryEngine.playLubeDroplet();
            onTriggerLube(2);
          }
          break;

        case 'pad_record_toggle':
          if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
          break;

        case 'pad_smoothness_increase': {
          setSmoothness((prev) => {
            const next = Math.min(10, prev + 1);
            if (next !== prev) {
              sensoryEngine.playClick(1.1 - next * 0.03);
              sensoryEngine.hapticIncrement(8);
              gamepadService.triggerRumble(0.25, 0.12, 70);
              activeFlowStateRef.current.smoothness = next;
              setDpadSmoothPulse('right');
              if (dpadTimeoutRef.current) clearTimeout(dpadTimeoutRef.current);
              dpadTimeoutRef.current = setTimeout(() => setDpadSmoothPulse(null), 350);

              if (servokBle.connected) {
                servokBle.setSmoothness(next);
              }
              if ((flowMode === 'hardware_cycle' || hardwareMode === 'firmware_cycle') && isFlowPlaying) {
                syncHardwareAutoCycle(
                  activeFlowStateRef.current.minDepthPct,
                  activeFlowStateRef.current.maxDepthPct,
                  activeFlowStateRef.current.padX,
                  next,
                  false
                );
              }
              if (isRecording) {
                const hrd = Math.max(5, Math.min(100, Math.round(((10 - next) / 10) * 100)));
                appendRecordingSample(
                  undefined,
                  activeFlowStateRef.current.minDepthPct,
                  activeFlowStateRef.current.maxDepthPct,
                  activeFlowStateRef.current.padX,
                  hrd
                );
              }
            }
            return next;
          });
          break;
        }

        case 'pad_smoothness_decrease': {
          setSmoothness((prev) => {
            const next = Math.max(0, prev - 1);
            if (next !== prev) {
              sensoryEngine.playClick(1.1 - next * 0.03);
              sensoryEngine.hapticIncrement(8);
              gamepadService.triggerRumble(0.25, 0.12, 70);
              activeFlowStateRef.current.smoothness = next;
              setDpadSmoothPulse('left');
              if (dpadTimeoutRef.current) clearTimeout(dpadTimeoutRef.current);
              dpadTimeoutRef.current = setTimeout(() => setDpadSmoothPulse(null), 350);

              if (servokBle.connected) {
                servokBle.setSmoothness(next);
              }
              if ((flowMode === 'hardware_cycle' || hardwareMode === 'firmware_cycle') && isFlowPlaying) {
                syncHardwareAutoCycle(
                  activeFlowStateRef.current.minDepthPct,
                  activeFlowStateRef.current.maxDepthPct,
                  activeFlowStateRef.current.padX,
                  next,
                  false
                );
              }
              if (isRecording) {
                const hrd = Math.max(5, Math.min(100, Math.round(((10 - next) / 10) * 100)));
                appendRecordingSample(
                  undefined,
                  activeFlowStateRef.current.minDepthPct,
                  activeFlowStateRef.current.maxDepthPct,
                  activeFlowStateRef.current.padX,
                  hrd
                );
              }
            }
            return next;
          });
          break;
        }
      }
    },
    [
      togglePlayFlow,
      turboMultiplier,
      flowMode,
      minDepthPct,
      maxDepthPct,
      padX,
      smoothness,
      isFlowPlaying,
      isRecording,
      onEmergencyStop,
      onTriggerLube,
      syncHardwareAutoCycle,
    ]
  );

  // Xbox Gamepad Stick & Button Polling Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dtSeconds = Math.min(0.08, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // 1. Analog Stick Bewegung für 2D-Pad (padX: Tempo, padY: Hubtiefe)
      const { dx, dy } = gamepadService.getStickDelta(dtSeconds);
      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        setPadX((prevX) => {
          const nextX = Math.max(0, Math.min(100, prevX + dx));
          setPadY((prevY) => {
            const nextY = Math.max(20, Math.min(98, prevY + dy));
            setLivePosPct(nextY);

            // Seidige Schweif- und Wellen-Partikel
            trailRef.current.push({ x: nextX, y: nextY });
            if (trailRef.current.length > 22) trailRef.current.shift();
            if (Math.random() > 0.65) {
              ripplesRef.current.push({ x: nextX / 100, y: nextY / 100, r: 6, alpha: 0.55 });
            }

            if (Math.round(nextX) % 5 === 0) {
              sensoryEngine.playSpeedHarmonic(nextX, 100, activeTurboMultiplier);
            }

            const minSpan = 18;
            const nextMin = Math.max(0, Math.min(100 - minSpan, Math.round(nextY - spanPct)));
            const nextMax = Math.max(nextMin + minSpan, Math.min(100, Math.round(nextY)));
            const nextSpm = Math.round(12 + (nextX / 100) * 188);

            activeFlowStateRef.current.padX = nextX;
            activeFlowStateRef.current.padY = nextY;
            activeFlowStateRef.current.minDepthPct = nextMin;
            activeFlowStateRef.current.maxDepthPct = nextMax;
            activeFlowStateRef.current.currentSpm = nextSpm;

            // Hardware Signale übertragen
            if (hardwareMode === 'firmware_cycle' || flowMode === 'hardware_cycle') {
              if (isFlowPlaying) {
                syncHardwareAutoCycle(nextMin, nextMax, nextX, smoothness, false);
              }
            } else {
              if (!isFlowPlaying || flowMode === 'manual_glide') {
                syncHardwarePosition(nextY);
              }
            }

            return nextY;
          });
          return nextX;
        });
      }

      // 2. Rechter Analogstick (RS):
      // - Rein isolierte Steuerung des Hub-Reglers / Amplitude (Y-Achse, spanPct: 14% bis 90%)
      // - Umkehr-Sanftheit wird 100% isoliert über das D-Pad (Kreuztasten links/rechts) gesteuert
      const { dySpan, isDeflected } = gamepadService.getRightStickDelta(dtSeconds);
      if (isDeflected && Math.abs(dySpan) > 0.0001) {
        setRsDeflection({ active: true, dy: dySpan });
        setSpanPct((prevSpan) => {
          const nextSpan = Math.max(14, Math.min(90, Math.round((prevSpan + dySpan) * 10) / 10));
          if (nextSpan !== prevSpan) {
            const currentPadY = activeFlowStateRef.current.padY;
            const newMin = Math.max(2, currentPadY - nextSpan);
            activeFlowStateRef.current.minDepthPct = newMin;
            activeFlowStateRef.current.maxDepthPct = Math.max(newMin + 12, Math.min(98, Math.round(currentPadY)));

            if ((flowMode === 'hardware_cycle' || hardwareMode === 'firmware_cycle') && isFlowPlaying) {
              syncHardwareAutoCycle(
                newMin,
                currentPadY,
                activeFlowStateRef.current.padX,
                activeFlowStateRef.current.smoothness,
                false
              );
            }
            if (isRecording) {
              appendRecordingSample(
                undefined,
                newMin,
                currentPadY,
                activeFlowStateRef.current.padX,
                currentHardnessPct
              );
            }
          }
          return nextSpan;
        });
      } else {
        setRsDeflection((prev) => (prev.active ? { active: false, dy: 0 } : prev));
      }

      // 3. Controller Action Buttons (A, B, LB, RB, Y, X, etc.)
      const triggered = gamepadService.pollTriggeredActions('pad');
      for (const act of triggered) {
        handlePadAction(act);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    spanPct,
    hardwareMode,
    flowMode,
    isFlowPlaying,
    smoothness,
    syncHardwareAutoCycle,
    syncHardwarePosition,
    handlePadAction,
  ]);

  // Tastatur Hotkey Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const act = gamepadService.matchKeyboardAction(e, 'pad');
      if (act) {
        e.preventDefault();
        handlePadAction(act);
      } else if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        // Fallback Spacebar Toggle / Not-Aus
        e.preventDefault();
        togglePlayFlow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePadAction, togglePlayFlow]);

  // Cleanup session audio und Servok-Stop on unmount
  useEffect(() => {
    return () => {
      sensoryEngine.stopSessionRhythm();
      if (servokBle.connected) {
        servokBle.stop();
      }
    };
  }, []);

  const applyQuickPresetToPad = (presetId: string) => {
    const all = getAllPresets();
    const found = all.find((p) => p.id === presetId) || all[0];
    if (!found) return;
    sensoryEngine.playPresetChime();
    const avgMin =
      found.waypointsMinDepth.reduce((a, b) => a + b.pos, 0) /
      Math.max(1, found.waypointsMinDepth.length);
    const avgMax =
      found.waypointsMaxDepth.reduce((a, b) => a + b.pos, 0) /
      Math.max(1, found.waypointsMaxDepth.length);
    const avgSpm =
      found.waypointsSpm.reduce((a, b) => a + b.pos, 0) /
      Math.max(1, found.waypointsSpm.length);

    setPadY(Math.max(24, Math.min(98, Math.round(avgMax))));
    setSpanPct(Math.max(15, Math.min(85, Math.round(avgMax - avgMin))));
    setPadX(Math.max(10, Math.min(95, Math.round(avgSpm))));
    setSmoothness(found.recommendedSmoothness ?? 8);
    setIsFlowPlaying(true);
  };

  const formatDurationSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatMsShort = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
  };

  const hasRecordedSession = !isRecording && recordedMinDepth.length >= 2 && recordedDurationMs >= 1000;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 relative z-10">
      {/* TOP BAR: Back to Start, Title & Live Connection Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 sensual-glass glass-optics-edge rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sensoryEngine.playClick(1.0);
              onBackToStart();
            }}
            className="p-2 rounded-xl bg-bg-base/60 hover:bg-bg-panel border border-border-dim text-text-dim hover:text-text-bright transition-all cursor-pointer flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">
              {tr(language, 'Startmenü', 'Start Menu', 'Menú Principal')}
            </span>
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-display font-semibold tracking-wide text-text-bright flex items-center gap-2">
              <Compass className="w-5 h-5 text-brand-cyan" />
              <span>
                {tr(
                  language,
                  'Sinnlicher Einhand-Pad Player & Recorder',
                  'Sensual One-Handed Pad & Recorder',
                  'Reproductor y Grabador Pad Monomanual'
                )}
              </span>
            </h1>
            <p className="text-[11px] text-text-dim">
              {tr(
                language,
                'Intuitives Daumen-Gleiten mit Live-Bewegungsaufzeichnung, Vorlagen-Speicherung & Direkt-Download',
                'Intuitive thumb glide with live movement recording, preset saving & session export',
                'Deslizamiento intuitivo del pulgar con grabación en vivo, guardado de plantillas y exportación'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Record Toggle Button in Top Bar */}
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-rose-500/50 bg-rose-500/15 hover:bg-rose-500 hover:text-white text-rose-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <CircleDot className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>{tr(language, 'Aufnahme Starten', 'REC Start', 'Iniciar Grabación')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-rose-400 bg-rose-600 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-lg animate-pulse"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>
                {tr(language, 'Stopp', 'Stop REC', 'Detener')} ({formatMsShort(recordedDurationMs)})
              </span>
            </button>
          )}

          {/* Live Signal Telemetry Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-bg-base/60 text-text-muted border-border-dim'
            }`}
            title={tr(language, 'Aktive Signal-Telemetrie zum Servok', 'Active signal telemetry to Servok', 'Telemetría activa de señal a Servok')}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? Date.now() - lastTxTime < 800
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-emerald-400'
                  : 'bg-amber-400/50'
              }`}
            />
            <span className="text-[11px] font-medium">
              {isConnected ? lastTxInfo : tr(language, 'Servok Getrennt', 'Hardware Offline', 'Servok Desconectado')}
            </span>
          </div>

          {/* Hardware Protocol Mode Selector */}
          <button
            type="button"
            onClick={() => {
              sensoryEngine.playClick(1.0);
              const nextMode = hardwareMode === 'stream_pos' ? 'firmware_cycle' : 'stream_pos';
              setHardwareMode(nextMode);
              if (isFlowPlaying && servokBle.connected) {
                if (nextMode === 'firmware_cycle') {
                  syncHardwareAutoCycle(minDepthPct, maxDepthPct, padX, smoothness, true);
                } else {
                  servokBle.applyControlMode('position');
                  servokBle.setSmoothness(smoothness);
                }
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
              hardwareMode === 'stream_pos'
                ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40'
                : 'bg-brand-orchid/15 text-brand-orchid border-brand-orchid/40'
            }`}
            title={
              hardwareMode === 'stream_pos'
                ? tr(language, '0x0A Live-Stream Modus (Wellen & direkte Daumenführung)', '0x0A Live-Stream Mode (waves & direct thumb guide)', 'Modo Live-Stream 0x0A (ondas y guía táctil)')
                : tr(language, 'Firmware Auto-Cycle Modus (Hardware-Oszillator 0x07/0x08)', 'Firmware Auto-Cycle Mode (hardware oscillator 0x07/0x08)', 'Modo Auto-Ciclo de Firmware (oscilador 0x07/0x08)')
            }
          >
            <Activity className="w-3.5 h-3.5" />
            <span>
              {hardwareMode === 'stream_pos'
                ? '0x0A Stream'
                : 'Auto-Cycle'}
            </span>
          </button>

          {/* Xbox Controller Mapping / Status Button in Top Bar */}
          <button
            type="button"
            onClick={() => {
              sensoryEngine.playTactileClick('primary');
              if (onOpenControllerMapping) {
                onOpenControllerMapping();
              } else {
                setShowLocalControllerModal(true);
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
              isControllerConnected
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-bg-base/70 text-text-dim hover:text-white border-border-dim hover:border-brand-cyan/40'
            }`}
            title={tr(language, 'Xbox Controller Kalibrierung & Sensitivität öffnen', 'Open Xbox Controller calibration & sensitivity', 'Abrir calibración y sensibilidad del mando Xbox')}
            id="pad-controller-btn"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="font-bold">
              {isControllerConnected ? tr(language, 'Xbox Aktiv', 'Xbox Active', 'Xbox Activo') : 'Controller'}
            </span>
            {isControllerConnected && (
              <span className="text-[10px] opacity-80">
                ({gamepadSettings.stickSensitivity.toFixed(1)}x)
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onConnectBle}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40 hover:bg-brand-cyan hover:text-bg-base'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>
              {isConnected
                ? tr(language, 'Servok Verbunden', 'Servok Connected', 'Servok Conectado')
                : tr(language, 'Servok Koppeln', 'Connect Servok', 'Conectar Servok')}
            </span>
          </button>

          {onOpenPresets && (
            <button
              type="button"
              onClick={onOpenPresets}
              className="px-3 py-1.5 rounded-full text-xs bg-bg-base/70 hover:bg-bg-panel border border-border-dim text-text-dim hover:text-text-bright transition-all cursor-pointer"
            >
              {tr(language, 'Vorlagen', 'Presets', 'Plantillas')}
            </button>
          )}

          {onOpenEditor && (
            <button
              type="button"
              onClick={onOpenEditor}
              className="px-3 py-1.5 rounded-full text-xs bg-bg-base/70 hover:bg-bg-panel border border-border-dim text-text-dim hover:text-text-bright transition-all cursor-pointer hidden sm:inline-flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" />
              <span>Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* SAVED / DOWNLOADED CONFIRMATION BANNER */}
      {savedSuccessBanner && (
        <div className="sensual-glass rounded-2xl px-4 py-3 border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedSuccessBanner(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* MAIN PLAYER GRID: 2D TACTILE SILK PAD (LEFT/CENTER) + ERGONOMIC WAVE, RECORDER & THUMB CONTROLS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT 7 COLS: Large Tactile 2D Silk-Glass Pad */}
        <div className="lg:col-span-7 sensual-glass glass-optics-edge rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
          {/* Live Telemetry Strip above Pad */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-bg-base/60 border border-border-dim/80 rounded-2xl p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-text-dim block">
                {tr(language, 'Hub-Korridor', 'Depth Corridor', 'Corredor de Carrera')}
              </span>
              <span className="text-sm sm:text-base font-mono font-semibold text-brand-cyan">
                {toMm(minDepthPct)}–{toMm(maxDepthPct)} mm
              </span>
              <span className="text-[10px] font-mono text-text-muted block">
                ({minDepthPct}% – {maxDepthPct}%)
              </span>
            </div>

            <div className={`border rounded-2xl p-2.5 transition-colors ${
              isTurboActive
                ? 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-bg-base/60 border-border-dim/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-text-dim block">
                  {tr(language, 'Tempo / Taktrate', 'Tempo / Cadence', 'Tempo / Cadencia')}
                </span>
                {isTurboActive && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-extrabold border border-amber-400/40 animate-pulse">
                    TURBO {activeTurboMultiplier.toFixed(2)}x
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className={`text-sm sm:text-base font-mono font-semibold ${isTurboActive ? 'text-amber-300 font-extrabold' : 'text-text-bright'}`}>
                  {effectiveSpm} SPM
                </span>
              </div>
              <span className="text-[10px] font-mono text-text-muted block">
                {Math.round(padX)}% {tr(language, 'Basis', 'Base', 'Base')} {isTurboActive && `• +${Math.round((activeTurboMultiplier - 1) * 100)}% Boost`}
              </span>
            </div>

            <div className="bg-bg-base/60 border border-border-dim/80 rounded-2xl p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-text-dim block">
                {tr(language, 'Sanftheit (0x09)', 'Softness (0x09)', 'Suavidad (0x09)')}
              </span>
              <span className="text-sm sm:text-base font-mono font-semibold text-brand-orchid">
                {smoothness}/10
              </span>
              <span className="text-[10px] font-mono text-text-muted block">
                {smoothness >= 7
                  ? tr(language, 'Seidenweich', 'Silky Smooth', 'Sedoso')
                  : smoothness >= 4
                  ? tr(language, 'Geschmeidig', 'Supple', 'Flexible')
                  : tr(language, 'Direkt & Intensiv', 'Intense', 'Directo e Intenso')}
              </span>
            </div>
          </div>

          {/* Xbox Stick Live Feedback & Sensitivity Strip */}
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-black/45 border border-border-dim/90 rounded-2xl font-mono text-[11px] text-text-dim shadow-inner">
            <div className="flex items-center gap-2 flex-wrap">
              <Gamepad2 className={`w-3.5 h-3.5 ${isControllerConnected ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className={isControllerConnected ? 'text-emerald-300 font-bold' : 'text-zinc-400'}>
                {isControllerConnected
                  ? tr(language, 'XBOX Controller Aktiv', 'XBOX Controller Active', 'Mando XBOX Activo')
                  : tr(language, 'XBOX Controller koppeln für Analogstick-Steuerung', 'Connect XBOX Controller for thumbstick control', 'Conecta mando XBOX para control analógico')}
              </span>
              {isControllerConnected && (
                <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                    LS: 2D-Pad ({tr(language, 'Tempo/Hub', 'Tempo/Stroke', 'Tempo/Carrera')})
                  </span>
                  <span className={`px-1.5 py-0.5 rounded transition-all border ${
                    rsDeflection.active
                      ? 'bg-brand-cyan/30 text-brand-cyan border-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)] font-bold'
                      : 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30'
                  }`}>
                    RS: Y ↕ {tr(language, 'Hub-Amplitude', 'Stroke Amplitude', 'Amplitud de Carrera')}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded transition-all border ${
                    dpadSmoothPulse
                      ? 'bg-brand-orchid/30 text-brand-orchid border-brand-orchid shadow-[0_0_10px_rgba(168,85,247,0.5)] font-bold animate-pulse'
                      : 'bg-brand-orchid/15 text-brand-orchid border-brand-orchid/30'
                  }`}>
                    D-Pad: ◄ ► {tr(language, 'Umkehr-Sanftheit', 'Reversal Softness', 'Suavidad de Inversión')}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded transition-all border ${
                    isTurboActive
                      ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)] font-bold animate-pulse'
                      : 'bg-amber-500/15 text-amber-300/80 border-amber-500/30'
                  }`}>
                    RT ▲ / LT ▼: Turbo ({activeTurboMultiplier.toFixed(2)}x)
                  </span>
                  <span className="text-text-muted hidden md:inline">
                    ({gamepadSettings.stickSensitivity.toFixed(1)}x)
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                sensoryEngine.playTactileClick('secondary');
                if (onOpenControllerMapping) onOpenControllerMapping();
                else setShowLocalControllerModal(true);
              }}
              className="px-2 py-0.5 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/40 text-[10px] font-bold cursor-pointer transition-colors shrink-0"
            >
              {tr(language, 'Sensitivität / Belegung', 'Sensitivity / Mapping', 'Sensibilidad / Mapeo')}
            </button>
          </div>

          {/* 2D Touch & Momentum Glass Surface */}
          <div
            ref={padContainerRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
              isDraggingRef.current = true;
              setIsDragging(true);
              trailRef.current = [];
              sensoryEngine.playClick(1.05);
              updateFromPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!isDraggingRef.current) return;
              updateFromPointer(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              isDraggingRef.current = false;
              setIsDragging(false);
              startInertiaGlide();
            }}
            onPointerCancel={() => {
              isDraggingRef.current = false;
              setIsDragging(false);
            }}
            className={`relative w-full h-80 sm:h-96 rounded-3xl bg-bg-base/85 border overflow-hidden touch-none cursor-crosshair select-none shadow-inner transition-colors ${
              isRecording ? 'border-rose-500/80 ring-2 ring-rose-500/25' : 'border-border-bright/60'
            }`}
          >
            {/* Real-time Fluid Wave & Caustic Ripple Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Subtle Organic Guide Grid */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage:
                  'radial-gradient(circle at center, var(--brand-cyan) 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />

            {/* Live Recording Overlay Badge inside Pad */}
            {isRecording && (
              <div className="absolute top-3 right-4 px-3 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg pointer-events-none animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>REC {formatMsShort(recordedDurationMs)}</span>
                <span className="opacity-80">({recordedMaxDepth.length} Pkt)</span>
              </div>
            )}

            {/* Live Turbo Overlay Badge inside Pad */}
            {isTurboActive && (
              <div className={`absolute top-3 ${isRecording ? 'left-4' : 'right-4'} px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/90 to-rose-600/90 text-white text-[11px] font-mono font-extrabold flex items-center gap-1.5 shadow-[0_0_16px_rgba(245,158,11,0.5)] pointer-events-none animate-pulse z-10`}>
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>⚡ TURBO {activeTurboMultiplier.toFixed(2)}x ({effectiveSpm} SPM)</span>
              </div>
            )}

            {/* Axis Labels */}
            <div className="absolute top-3 left-4 text-[10px] font-mono uppercase tracking-widest text-text-dim pointer-events-none">
              ↑ {tr(language, 'Tiefe Hingabe (170 mm)', 'Deep Immersion (170 mm)', 'Inmersión Profunda (170 mm)')}
            </div>
            <div className="absolute bottom-3 left-4 text-[10px] font-mono uppercase tracking-widest text-text-dim pointer-events-none">
              ↓ {tr(language, 'Sanft & Flach (17 mm)', 'Gentle Shallow (17 mm)', 'Suave y Superficial (17 mm)')}
            </div>
            <div className="absolute bottom-3 right-4 text-[10px] font-mono uppercase tracking-widest text-text-dim pointer-events-none">
              {tr(language, 'Tempo (SPM) →', 'Tempo (SPM) →', 'Ritmo (SPM) →')}
            </div>

            {/* Live Oscillating Actuator Pearl Indicator */}
            {isFlowPlaying && (
              <div
                className="absolute w-5 h-5 -ml-2.5 -mb-2.5 rounded-full pointer-events-none transition-all duration-75"
                style={{
                  left: `${padX}%`,
                  bottom: `${livePosPct}%`,
                  background: 'var(--brand-orchid)',
                  boxShadow: '0 0 24px var(--brand-orchid)',
                  opacity: 0.75,
                }}
              />
            )}

            {/* Main Tactile Glass Orb Puck */}
            <div
              className="absolute w-14 h-14 -ml-7 -mb-7 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-100"
              style={{
                left: `${padX}%`,
                bottom: `${padY}%`,
                background: isTurboActive
                  ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), #f59e0b 45%, #ef4444 80%, #7928ca 100%)'
                  : 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), var(--brand-cyan) 55%, var(--brand-rose) 100%)',
                boxShadow: isTurboActive
                  ? '0 8px 32px rgba(0,0,0,0.5), 0 0 46px #f59e0b, 0 0 20px #ef4444, inset 0 2px 6px rgba(255,255,255,0.9)'
                  : '0 8px 32px rgba(0,0,0,0.4), 0 0 36px var(--brand-cyan), inset 0 2px 6px rgba(255,255,255,0.8)',
                transform: isDragging || isMomentaryTurbo ? 'scale(1.22)' : 'scale(1)',
              }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white/90 shadow-sm flex items-center justify-center">
                {isTurboActive && <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500 animate-pulse" />}
              </div>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* SPM TURBO-BOOST KADENZ-STUFEN & MOMENTARY NITRO PUSH                */}
          {/* ==================================================================== */}
          <div
            className={`p-3 rounded-2xl border transition-all ${
              isTurboActive
                ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border-amber-500/50 shadow-[0_0_24px_rgba(245,158,11,0.2)]'
                : 'bg-bg-base/60 border-border-dim/80'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-xl border ${
                    isTurboActive
                      ? 'bg-amber-500 text-bg-base border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                      : 'bg-bg-panel text-text-dim border-border-dim'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-display font-bold tracking-wider text-text-bright uppercase">
                      {tr(language, 'SPM TURBO-BOOST STUFEN', 'SPM TURBO-BOOST LEVELS', 'NIVELES DE TURBO-BOOST SPM')}
                    </span>
                    {isTurboActive && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-extrabold border border-amber-400/50 animate-pulse">
                        ⚡ {activeTurboMultiplier.toFixed(2)}x ({effectiveSpm} SPM)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-dim">
                    {tr(
                      language,
                      'Direktes Schalten via Schultertasten [RT ▲ hoch / LT ▼ runter]',
                      'Direct trigger shifting [RT ▲ up / LT ▼ down] without moving 2D Pad',
                      'Cambio directo con gatillos [RT ▲ subir / LT ▼ bajar]'
                    )}
                  </p>
                </div>
              </div>

              {/* MOMENTARY NITRO BUTTON (Hold to Surge 2.0x) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setIsMomentaryTurbo(true);
                  sensoryEngine.playTactileClick('primary');
                  gamepadService.triggerRumble(250, 0.7, 0.9);
                }}
                onPointerUp={() => {
                  setIsMomentaryTurbo(false);
                  sensoryEngine.playTactileClick('secondary');
                }}
                onPointerCancel={() => {
                  setIsMomentaryTurbo(false);
                }}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none border ${
                  isMomentaryTurbo
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white border-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.6)] scale-105'
                    : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40 hover:border-rose-400'
                }`}
                title={tr(
                  language,
                  'Gedrückt halten für sofortigen 2.0x Nitro-Schub',
                  'Hold for instant 2.0x Nitro boost',
                  'Mantén presionado para aceleración Nitro 2.0x instantánea'
                )}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isMomentaryTurbo ? 'animate-spin' : 'text-rose-400'}`} />
                <span>
                  {isMomentaryTurbo
                    ? tr(language, '🚀 NITRO MAX (2.0x)!', '🚀 NITRO MAX (2.0x)!', '🚀 ¡NITRO MÁX (2.0x)!')
                    : tr(language, '🔥 HALTEN FÜR NITRO', '🔥 HOLD FOR NITRO', '🔥 MANTENER PARA NITRO')}
                </span>
              </button>
            </div>

            {/* Stufen-Schalter Grid: 1.0x (Standard), 1.25x (+25%), 1.5x (+50%), 1.75x (+75%), 2.0x (+100%) */}
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { mul: 1.0, label: '1.0x', title: tr(language, 'Normal', 'Normal', 'Normal'), boost: tr(language, 'Basis', 'Base', 'Base') },
                { mul: 1.25, label: '1.25x', title: 'Nitro', boost: '+25%' },
                { mul: 1.5, label: '1.5x', title: 'Turbo', boost: '+50%' },
                { mul: 1.75, label: '1.75x', title: 'Overdrive', boost: '+75%' },
                { mul: 2.0, label: '2.0x', title: 'Hyper Max', boost: '+100%' },
              ].map((step) => {
                const isSelected = !isMomentaryTurbo && turboMultiplier === step.mul;
                return (
                  <button
                    key={`turbo-btn-${step.mul}`}
                    type="button"
                    onClick={() => {
                      setTurboMultiplier(step.mul);
                      sensoryEngine.playTactileClick(step.mul > 1.0 ? 'primary' : 'secondary');
                      if (step.mul > 1.0) {
                        gamepadService.triggerRumble(120, 0.3 * step.mul, 0.4 * step.mul);
                      }
                    }}
                    className={`py-2 px-1 rounded-xl text-center border font-mono transition-all cursor-pointer ${
                      isSelected
                        ? step.mul === 1.0
                          ? 'bg-zinc-700/60 text-white border-zinc-400 font-extrabold shadow-sm'
                          : 'bg-gradient-to-b from-amber-500/35 to-rose-600/35 text-amber-200 border-amber-400 font-extrabold shadow-[0_0_14px_rgba(245,158,11,0.35)] scale-[1.02]'
                        : 'bg-bg-base/70 text-text-dim border-border-dim hover:text-text-bright hover:border-border-bright hover:bg-bg-panel'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{step.label}</div>
                    <div className="text-[9px] opacity-80 leading-tight">{step.title}</div>
                    <div className={`text-[8.5px] font-bold ${step.mul > 1.0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                      {step.boost}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Thumb-Zone Sliders: Stroke Span & Softness */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className={`border rounded-2xl p-3 space-y-1.5 transition-all ${
              rsDeflection.active && Math.abs(rsDeflection.dy) > 0.001
                ? 'bg-brand-cyan/20 border-brand-cyan shadow-[0_0_18px_rgba(0,240,255,0.3)] ring-1 ring-brand-cyan/50'
                : 'bg-bg-base/60 border-border-dim'
            }`}>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-text-dim font-medium">
                    {tr(language, 'Hub-Spannweite (Amplitude)', 'Stroke Span (Amplitude)', 'Amplitud de Carrera')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border transition-all flex items-center gap-1 ${
                    rsDeflection.active && Math.abs(rsDeflection.dy) > 0.001
                      ? 'bg-brand-cyan text-bg-base border-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.6)] animate-pulse'
                      : 'bg-brand-cyan/15 border-brand-cyan/35 text-brand-cyan'
                  }`} title={tr(
                    language,
                    'Rechter Analogstick (RS) Y-Achse: Nach oben = Mehr Hub / Amplitude, nach unten = Weniger Hub',
                    'Right Stick (RS) Y-Axis: Up = More Stroke / Amplitude, Down = Less Stroke',
                    'Palanca derecha (RS) Eje Y: Arriba = Más carrera / Amplitud, Abajo = Menos carrera'
                  )}>
                    <span>{tr(language, 'RS ↕ Y-Achse (Hub)', 'RS ↕ Y-Axis (Stroke)', 'RS ↕ Eje Y (Carrera)')}</span>
                  </span>
                </div>
                <span className="font-mono font-semibold text-brand-cyan">
                  {Math.round((spanPct / 100) * 153)} mm ({spanPct}%)
                </span>
              </div>
              <input
                type="range"
                min={14}
                max={90}
                value={spanPct}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSpanPct(val);
                  sensoryEngine.playClick(0.9 + val / 200);
                  sensoryEngine.hapticIncrement(6);
                  const newMin = Math.max(2, padY - val);
                  if ((flowMode === 'hardware_cycle' || hardwareMode === 'firmware_cycle') && isFlowPlaying) {
                    syncHardwareAutoCycle(newMin, padY, padX, smoothness, false);
                  }
                  if (isRecording) {
                    appendRecordingSample(undefined, newMin, padY, padX, currentHardnessPct);
                  }
                }}
                className="w-full h-2 rounded-full accent-[var(--brand-cyan)] cursor-pointer"
              />
            </div>

            <div className={`border rounded-2xl p-3 space-y-1.5 transition-all ${
              dpadSmoothPulse
                ? 'bg-brand-orchid/20 border-brand-orchid shadow-[0_0_18px_rgba(168,85,247,0.35)] ring-1 ring-brand-orchid/60'
                : 'bg-bg-base/60 border-border-dim'
            }`}>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-text-dim font-medium">
                    {tr(language, 'Umkehr-Sanftheit (0x09)', 'Reversal Softness (0x09)', 'Suavidad de Inversión (0x09)')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border transition-all flex items-center gap-1 ${
                    dpadSmoothPulse
                      ? 'bg-brand-orchid text-bg-base border-brand-orchid shadow-[0_0_10px_rgba(168,85,247,0.6)] animate-pulse'
                      : 'bg-brand-orchid/15 border-brand-orchid/35 text-brand-orchid'
                  }`} title={tr(
                    language,
                    'D-Pad Kreuztasten: ◄ Links = Direktere Umkehr (-1), ► Rechts = Sanftere Umkehr (+1)',
                    'D-Pad: ◄ Left = Crisper Reversal (-1), ► Right = Softer Reversal (+1)',
                    'Cruceta D-Pad: ◄ Izquierda = Inversión más directa (-1), ► Derecha = Inversión más suave (+1)'
                  )}>
                    <span>{tr(language, 'D-Pad ◄ ► Kreuztasten', 'D-Pad ◄ ► Buttons', 'Cruceta D-Pad ◄ ►')}</span>
                  </span>
                </div>
                <span className="font-mono font-semibold text-brand-orchid">
                  {smoothness} / 10
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={smoothness}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSmoothness(val);
                  sensoryEngine.playClick(1.1 - val * 0.03);
                  sensoryEngine.hapticIncrement(6);
                  if (servokBle.connected) {
                    servokBle.setSmoothness(val);
                  }
                  if ((flowMode === 'hardware_cycle' || hardwareMode === 'firmware_cycle') && isFlowPlaying) {
                    syncHardwareAutoCycle(minDepthPct, maxDepthPct, padX, val, false);
                  }
                  if (isRecording) {
                    const hrd = Math.max(5, Math.min(100, Math.round(((10 - val) / 10) * 100)));
                    appendRecordingSample(undefined, minDepthPct, maxDepthPct, padX, hrd);
                  }
                }}
                className="w-full h-2 rounded-full accent-[var(--brand-orchid)] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: Live Recorder, Organic Flow Player, Wave Modes & Quick-Controls */}
        <div className="lg:col-span-5 sensual-glass glass-optics-edge rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
          {/* ==================================================================== */}
          {/* 1. EINHAND-BEWEGUNGS-RECORDER (AUFZEICHNEN -> VORLAGE / SESSION)     */}
          {/* ==================================================================== */}
          <div
            className={`rounded-2xl p-3.5 border transition-all space-y-3 ${
              isRecording
                ? 'bg-rose-500/12 border-rose-500/60 shadow-lg'
                : hasRecordedSession
                ? 'bg-brand-cyan/10 border-brand-cyan/50'
                : 'bg-bg-base/65 border-border-dim/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CircleDot
                  className={`w-4 h-4 ${
                    isRecording
                      ? 'text-rose-400 animate-ping'
                      : hasRecordedSession
                      ? 'text-brand-cyan'
                      : 'text-text-muted'
                  }`}
                />
                <div>
                  <h3 className="text-xs sm:text-sm font-display font-semibold text-text-bright">
                    {tr(language, 'Einhand-Bewegungs-Recorder', 'One-Hand Motion Recorder', 'Grabadora de Movimiento con Una Mano')}
                  </h3>
                  <p className="text-[10px] text-text-dim">
                    {isRecording
                      ? tr(
                          language,
                          'Zeichnet alle Pad-Bewegungen, Spanne, Sanftheit & Wellen live auf...',
                          'Recording all pad movements, span, softness & wave flows...',
                          'Grabando movimientos del pad, amplitud, suavidad y ondas en vivo...'
                        )
                      : hasRecordedSession
                      ? tr(
                          language,
                          `Aufnahme bereit: ${formatMsShort(recordedDurationMs)} (${recordedMaxDepth.length} Kurvenpunkte)`,
                          `Recorded ${formatMsShort(recordedDurationMs)} (${recordedMaxDepth.length} waypoints)`,
                          `Grabación lista: ${formatMsShort(recordedDurationMs)} (${recordedMaxDepth.length} puntos)`
                        )
                      : tr(
                          language,
                          'Zeichne deine Bewegungen auf, um sie als Vorlage oder Session zu sichern',
                          'Record your live movements to save as a preset or download',
                          'Graba tus movimientos para guardarlos como plantilla o descargar la sesión'
                        )}
                  </p>
                </div>
              </div>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  <span>{hasRecordedSession ? tr(language, 'Neu', 'New', 'Nuevo') : 'REC'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md animate-pulse shrink-0"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>{tr(language, 'Stopp', 'Stop', 'Detener')} ({formatMsShort(recordedDurationMs)})</span>
                </button>
              )}
            </div>

            {/* Post-Recording Actions: Save as Named/Categorized Preset OR Direct Download */}
            {hasRecordedSession && (
              <div className="pt-2 border-t border-border-dim/60 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Save as Catalog Preset (Requires Name, Description, Category) */}
                  <button
                    type="button"
                    onClick={() => {
                      sensoryEngine.playClick(1.1);
                      setShowSavePresetModal(true);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-brand-cyan text-bg-base font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:opacity-95 transition-all"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>
                      {tr(language, 'Als Vorlage speichern', 'Save as Preset', 'Guardar como plantilla')}
                    </span>
                  </button>

                  {/* Download Direct Session (.json) */}
                  <button
                    type="button"
                    onClick={() => downloadRecordedSession('json')}
                    className="py-2.5 px-3 rounded-xl bg-bg-base hover:bg-bg-panel border border-brand-cyan/50 text-brand-cyan font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {tr(language, 'Session laden (.json)', 'Download Session (.json)', 'Descargar sesión (.json)')}
                    </span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => downloadRecordedSession('fun')}
                    className="px-2.5 py-1.5 rounded-lg bg-bg-base/80 hover:bg-bg-panel border border-border-dim text-[11px] text-text-dim hover:text-text-bright flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown className="w-3 h-3 text-brand-orchid" />
                    <span>{tr(language, 'Skript (.fun)', 'Script (.fun)', 'Guion (.fun)')}</span>
                  </button>

                  {onOpenEditorWithCurve && (
                    <button
                      type="button"
                      onClick={() => {
                        sensoryEngine.playClick(1.1);
                        onOpenEditorWithCurve({
                          title: tr(
                            language,
                            `Einhand-Aufnahme (${formatMsShort(recordedDurationMs)})`,
                            `One-Hand Recording (${formatMsShort(recordedDurationMs)})`,
                            `Grabación con Una Mano (${formatMsShort(recordedDurationMs)})`
                          ),
                          durationMs: Math.max(2000, recordedDurationMs),
                          minDepth: recordedMinDepth,
                          maxDepth: recordedMaxDepth,
                          spm: recordedSpm,
                          hardness: recordedHardness,
                          lubeTriggers: recordedLubes,
                          subsections: recordedSubsections,
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-bg-base/80 hover:bg-bg-panel border border-border-dim text-[11px] text-brand-cyan hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>
                        {tr(language, 'Im 4-Spur-Editor bearbeiten', 'Edit in 4-Track Studio', 'Editar en Estudio de 4 Pistas')}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={clearRecording}
                    className="p-1.5 rounded-lg bg-bg-base/80 hover:bg-rose-500/20 text-text-muted hover:text-rose-400 cursor-pointer"
                    title={tr(language, 'Aufnahme verwerfen', 'Discard recording', 'Descartar grabación')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ==================================================================== */}
          {/* 2. AUTONOMOUS WAVE & RHYTHM PLAYER                                   */}
          {/* ==================================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-display font-semibold text-text-bright">
                  {tr(language, 'Organischer Wellen-Player', 'Autonomous Wave & Rhythm', 'Reproductor Autónomo de Ondas y Ritmo')}
                </h2>
                <p className="text-[11px] text-text-dim">
                  {tr(
                    language,
                    'Schwingt sanft und harmonisch um deinen gewählten Pad-Punkt',
                    'Modulates smoothly around your chosen pad position',
                    'Oscila suave y armónicamente alrededor de tu posición en el pad'
                  )}
                </p>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-bg-base/80 border border-border-dim text-brand-cyan">
                {formatDurationSec(elapsedSec)}
              </span>
            </div>

            {/* Big Thumb-Friendly Play / Pause Button */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={togglePlayFlow}
                className={`flex-1 py-3 px-5 rounded-2xl font-sans font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg ${
                  isFlowPlaying
                    ? 'bg-brand-rose text-bg-base shadow-[0_8px_28px_rgba(217,107,130,0.35)]'
                    : 'bg-brand-cyan text-bg-base hover:opacity-95 shadow-[0_8px_28px_rgba(232,149,165,0.3)]'
                }`}
              >
                {isFlowPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>
                      {tr(language, 'Wellen-Fluss Pausieren', 'Pause FlowWave', 'Pausar Flujo de Ondas')}
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {tr(language, 'Sinnlichen Fluss Starten', 'Start Sensual Flow', 'Iniciar Flujo Sensual')}
                    </span>
                  </>
                )}
              </button>

              {/* Quick Turbo Multiplier Cycle Button */}
              <button
                type="button"
                onClick={() => {
                  const multipliers = [1.0, 1.25, 1.5, 1.75, 2.0];
                  const currIdx = multipliers.findIndex((m) => Math.abs(m - turboMultiplier) < 0.05);
                  const nextMul = multipliers[(currIdx + 1) % multipliers.length];
                  setTurboMultiplier(nextMul);
                  sensoryEngine.playSpeedHarmonic(padX, 100, nextMul);
                  if (nextMul > 1.0) gamepadService.triggerRumble(140, 0.35 * nextMul, 0.45 * nextMul);
                  else sensoryEngine.playTactileClick('secondary');
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const multipliers = [1.0, 1.25, 1.5, 1.75, 2.0];
                  const currIdx = multipliers.findIndex((m) => Math.abs(m - turboMultiplier) < 0.05);
                  const nextIdx = Math.max(0, currIdx - 1);
                  const nextMul = multipliers[nextIdx];
                  setTurboMultiplier(nextMul);
                  sensoryEngine.playSpeedHarmonic(padX, 100, nextMul);
                  if (nextMul > 1.0) gamepadService.triggerRumble(120, 0.25 * nextMul, 0.35 * nextMul);
                  else sensoryEngine.playTactileClick('secondary');
                }}
                className={`py-3 px-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold shrink-0 ${
                  isTurboActive
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)] animate-pulse'
                    : 'bg-bg-base/80 hover:bg-bg-panel border-border-dim text-text-dim hover:text-amber-300 hover:border-amber-500/50'
                }`}
                title={tr(language, 'SPM Turbo-Boost [Xbox: RT hochschalten / LT runterschalten | Tastatur: T / E | Rechtsklick: Runterschalten]', 'SPM Turbo-Boost [Xbox: RT shift up / LT shift down | Keyboard: T / E | Right click: Shift down]', 'Turbo-Boost SPM [Xbox: RT subir / LT bajar | Teclado: T / E | Clic derecho: Bajar]')}
              >
                <Zap className={`w-4 h-4 ${isTurboActive ? 'text-amber-300 fill-amber-300' : 'text-amber-400'}`} />
                <span>{isTurboActive ? `${activeTurboMultiplier.toFixed(2)}x` : 'Turbo'}</span>
              </button>

              {onTriggerLube && (
                <button
                  type="button"
                  onClick={() => {
                    sensoryEngine.playLubeDroplet();
                    onTriggerLube(2);
                    if (isRecording) {
                      const tNow = Math.max(
                        0,
                        Math.round(performance.now() - recordStartPerfRef.current)
                      );
                      setRecordedLubes((prev) => [
                        ...prev,
                        { id: `rlube-${tNow}`, time: tNow, bursts: 2 },
                      ]);
                    }
                  }}
                  title={tr(language, 'Gleitmittel-Impuls (2x)', 'Trigger Lube Dispenser (2x)', 'Impulso de Lubricante (2x)')}
                  className="py-3 px-4 rounded-2xl bg-bg-base/80 hover:bg-bg-panel border border-border-dim hover:border-brand-orchid text-brand-orchid transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                >
                  <Droplets className="w-4 h-4" />
                  <span>Lube</span>
                </button>
              )}
            </div>
          </div>

          {/* 6 Sensual Wave & Climax Curve Modes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-dim">
                {tr(language, 'Bewegungs-Charakteristik:', 'Select Motion Character:', 'Características de Movimiento:')}
              </span>
              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playClick(1.0);
                  setInertiaEnabled(!inertiaEnabled);
                }}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                  inertiaEnabled
                    ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40'
                    : 'bg-bg-base text-text-muted border-border-dim'
                }`}
              >
                {tr(language, 'Seiden-Nachlauf: ', 'Silk Inertia: ', 'Inercia de Seda: ')}
                {inertiaEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: 'silk_sine' as FlowWaveMode,
                  titleDe: 'Seiden-Sinus',
                  titleEn: 'Silk Sine Wave',
                  titleEs: 'Seno de Seda',
                  subDe: 'Harmonisches Gleiten',
                  subEn: 'Harmonic Gliding',
                  subEs: 'Deslizamiento armónico',
                  icon: Waves,
                },
                {
                  id: 'golden_climax' as FlowWaveMode,
                  titleDe: 'Goldene Klimax (Φ)',
                  titleEn: 'Golden Climax (Φ)',
                  titleEs: 'Clímax Dorado (Φ)',
                  subDe: 'Sinnliche Steigerung',
                  subEn: 'Golden Ratio Surge',
                  subEs: 'Crecendo proporción áurea',
                  icon: Sparkles,
                },
                {
                  id: 'heartbeat_pulse' as FlowWaveMode,
                  titleDe: 'Herzschlag-Puls',
                  titleEn: 'Heartbeat Pulse',
                  titleEs: 'Pulso Cardíaco',
                  subDe: 'Organischer Doppelpuls',
                  subEn: 'Organic Double Pulse',
                  subEs: 'Doble pulso orgánico',
                  icon: Heart,
                },
                {
                  id: 'ocean_swell' as FlowWaveMode,
                  titleDe: 'Ozean-Dünung',
                  titleEn: 'Ocean Swell',
                  titleEs: 'Oleaje Oceánico',
                  subDe: 'Sanfte Gezeitenwelle',
                  subEn: 'Gentle Tidal Wave',
                  subEs: 'Suave ola de marea',
                  icon: TrendingUp,
                },
                {
                  id: 'butterfly_flutter' as FlowWaveMode,
                  titleDe: 'Zartes Flattern',
                  titleEn: 'Butterfly Flutter',
                  titleEs: 'Aleteo Suave',
                  subDe: 'Feine Kurzhub-Resonanz',
                  subEn: 'Delicate Micro-Pulse',
                  subEs: 'Microimpulso delicado',
                  icon: Feather,
                },
                {
                  id: 'manual_glide' as FlowWaveMode,
                  titleDe: 'Pur Manuell',
                  titleEn: 'Pure Touch Glide',
                  titleEs: 'Manual Puro',
                  subDe: 'Direkte Fingerführung',
                  subEn: 'Direct Finger Control',
                  subEs: 'Control táctil directo',
                  icon: Activity,
                },
                {
                  id: 'hardware_cycle' as FlowWaveMode,
                  titleDe: 'Hardware Auto-Cycle',
                  titleEn: 'Hardware Auto-Cycle',
                  titleEs: 'Ciclo Auto Hardware',
                  subDe: 'Firmware-Oszillator (0x07/0x08)',
                  subEn: 'Firmware Oscillator (0x07/0x08)',
                  subEs: 'Oscilador firmware (0x07/0x08)',
                  icon: CircleDot,
                },
              ].map((m) => {
                const Icon = m.icon;
                const active = flowMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      sensoryEngine.playPresetChime();
                      setFlowMode(m.id);
                      if (m.id === 'hardware_cycle') {
                        setHardwareMode('firmware_cycle');
                        if (isFlowPlaying && servokBle.connected) {
                          syncHardwareAutoCycle(minDepthPct, maxDepthPct, padX, smoothness, true);
                        }
                      } else {
                        setHardwareMode('stream_pos');
                        if (isFlowPlaying && servokBle.connected) {
                          servokBle.applyControlMode('position');
                          servokBle.setSmoothness(smoothness);
                        }
                      }
                      if (isRecording) {
                        const tNow = Math.max(
                          0,
                          Math.round(performance.now() - recordStartPerfRef.current)
                        );
                        setRecordedSubsections((prev) => {
                          const closed = prev.map((s, idx) =>
                            idx === prev.length - 1 ? { ...s, endTime: tNow } : s
                          );
                          return [
                            ...closed,
                            {
                              id: `rsub-${tNow}`,
                              name: `${closed.length + 1}. ${language === 'es' ? m.titleEs : language === 'en' ? m.titleEn : m.titleDe}`,
                              startTime: tNow,
                              endTime: tNow + 1000,
                            },
                          ];
                        });
                      }
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-brand-cyan/18 border-brand-cyan text-text-bright shadow-sm'
                        : 'bg-bg-base/60 border-border-dim/80 text-text-dim hover:text-text-bright hover:border-border-bright'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <span className="text-xs font-semibold text-text-bright">
                        {language === 'es' ? m.titleEs : language === 'en' ? m.titleEn : m.titleDe}
                      </span>
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          active ? 'text-brand-cyan' : 'text-text-muted'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-text-dim">
                      {language === 'es' ? m.subEs : language === 'en' ? m.subEn : m.subDe}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick-Feel Mood Atmospheres */}
          <div className="space-y-1.5 pt-2 border-t border-border-dim/60">
            <span className="text-xs font-medium text-text-dim block">
              {tr(
                language,
                'Stimmungs-Schnellwahl auf dem Pad:',
                'Instant Mood Calibration:',
                'Calibración Rápida de Ambiente:'
              )}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'sensual_mat_short_soft',
                  labelDe: 'Morgentau',
                  labelEn: 'Morning Dew',
                  labelEs: 'Rocío Matinal',
                  spm: '28 SPM',
                },
                {
                  id: 'waves_mat_med_med',
                  labelDe: 'Seiden-Groove',
                  labelEn: 'Silk Groove',
                  labelEs: 'Ritmo de Seda',
                  spm: '58 SPM',
                },
                {
                  id: 'climax_mat_short_int',
                  labelDe: 'Gipfelsturm',
                  labelEn: 'Peak Surge',
                  labelEs: 'Ascenso Cumbre',
                  spm: '98 SPM',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyQuickPresetToPad(item.id)}
                  className="p-2 rounded-xl bg-bg-base/70 hover:bg-bg-panel border border-border-dim hover:border-brand-cyan/50 text-left transition-all cursor-pointer"
                >
                  <div className="text-xs font-medium text-text-bright truncate">
                    {language === 'es' ? item.labelEs : language === 'en' ? item.labelEn : item.labelDe}
                  </div>
                  <div className="text-[10px] font-mono text-brand-cyan mt-0.5">{item.spm}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Safety & WakeLock Footer Note */}
          <div className="flex items-center justify-between text-[10px] text-text-muted pt-1.5 border-t border-border-dim/50">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-cyan" />
              {tr(
                language,
                'Leertaste oder 3-Finger-Touch = Sofort-Stopp',
                'Spacebar or 3-Finger Tap = Instant Stop',
                'Barra espaciadora o toque con 3 dedos = Parada Inmediata'
              )}
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Wake-Lock
            </span>
          </div>
        </div>
      </div>

      {/* MODAL: SAVE RECORDED PAD SESSION AS NAMED, DESCRIBED & CATEGORIZED PRESET */}
      <SavePresetModal
        isOpen={showSavePresetModal}
        onClose={() => setShowSavePresetModal(false)}
        language={language}
        sourceLabel={tr(
          language,
          'Aufgezeichnete Einhand-Pad-Bewegungen als Vorlage im Katalog speichern',
          'Save recorded One-Handed Pad session to the Preset Catalog',
          'Guardar sesión grabada del Pad como plantilla en el catálogo'
        )}
        durationMs={Math.max(2000, recordedDurationMs)}
        waypointsMinDepth={recordedMinDepth}
        waypointsMaxDepth={recordedMaxDepth}
        waypointsSpm={recordedSpm}
        waypointsHardness={recordedHardness}
        lubeTriggers={recordedLubes}
        subsections={recordedSubsections}
        onSaved={(newPreset) => {
          setSavedSuccessBanner(
            tr(
              language,
              `✓ Vorlage "${newPreset.title}" in Kategorie "${newPreset.category}" gespeichert!`,
              `✓ Saved "${newPreset.title}" under category "${newPreset.category}"!`,
              `✓ ¡Plantilla "${newPreset.title}" guardada en la categoría "${newPreset.category}"!`
            )
          );
          if (onPresetSaved) onPresetSaved(newPreset);
        }}
      />

      {/* MODAL: XBOX CONTROLLER & KEYBOARD MAPPING */}
      <ControllerMappingModal
        isOpen={showLocalControllerModal}
        onClose={() => setShowLocalControllerModal(false)}
        language={language}
      />
    </div>
  );
};
