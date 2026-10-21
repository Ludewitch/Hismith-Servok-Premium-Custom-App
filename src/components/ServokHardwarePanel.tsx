import React, { useState, useEffect, useRef } from 'react';
import { ControlMode, WaveformType } from '../types/servok';
import { servokBle, SERVOK_PHYSICAL_STROKE_CM } from '../services/servokBle';
import { sensoryEngine } from '../services/sensoryEngine';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Send,
  Sparkles,
  Power,
  MonitorCheck,
  Terminal,
  Radio,
} from 'lucide-react';

interface ServokHardwarePanelProps {
  currentMode?: ControlMode;
  controlMode?: ControlMode;
  onModeChange?: (mode: ControlMode) => void;
  onControlModeChange?: (mode: ControlMode) => void;
  smoothness?: number;
  onSmoothnessChange?: (s: number) => void;
  speedBoostFactor?: number;
  onSpeedBoostChange?: (factor: number) => void;
  speedCurveMode?: 'linear' | 'torque_boost';
  onSpeedCurveModeChange?: (mode: 'linear' | 'torque_boost') => void;
  onEmergencyStop?: () => void;
  isConnected: boolean;
  onPositionSent?: (posPct: number) => void;
  onStartSimulation?: () => void;
}

export const ServokHardwarePanel: React.FC<ServokHardwarePanelProps> = ({
  currentMode,
  controlMode: propControlMode,
  onModeChange,
  onControlModeChange,
  smoothness: propSmoothness,
  onSmoothnessChange,
  onEmergencyStop,
  isConnected,
  onPositionSent,
  onStartSimulation,
}) => {
  const activeControlMode = currentMode || propControlMode || 'position';
  const effectiveChangeMode = onModeChange || onControlModeChange || (() => {});

  // Position Control State
  const [manualPos, setManualPos] = useState<number>(0);
  const [smoothness, setInternalSmoothness] = useState<number>(
    propSmoothness !== undefined ? propSmoothness : 1
  );
  const [rssi, setRssi] = useState<number>(servokBle.getRssi());

  useEffect(() => {
    if (propSmoothness !== undefined) {
      setInternalSmoothness(propSmoothness);
    }
  }, [propSmoothness]);

  useEffect(() => {
    return servokBle.onRssiChange((val) => setRssi(val));
  }, []);

  // Auto-Cycle State (0x07 Min-Hub, 0x08 Max-Hub, 0x03 Speed)
  const [autoMinDepth, setAutoMinDepth] = useState<number>(15);
  const [autoMaxDepth, setAutoMaxDepth] = useState<number>(85);
  const [autoSpeed, setAutoSpeed] = useState<number>(70);
  const [isAutoRunning, setIsAutoRunning] = useState<boolean>(false);

  // Muster- & Wellengenerator (40Hz High-Speed Streaming im Positionsmodus)
  const [isPatternActive, setIsPatternActive] = useState<boolean>(false);
  const [patternType, setPatternType] = useState<WaveformType>('sine');
  const [patternSpm, setPatternSpm] = useState<number>(90);
  const [patternMin, setPatternMin] = useState<number>(15);
  const [patternMax, setPatternMax] = useState<number>(85);
  const patternAnimRef = useRef<number | null>(null);
  const lastPatternTimeRef = useRef<number>(0);

  // Manuelle Hex-Konsole
  const [customHexInput, setCustomHexInput] = useState<string>('CC 0A 32 3C');

  // Handle Mode Change
  const handleSelectMode = async (mode: ControlMode) => {
    if (isPatternActive) stopPattern();
    if (isAutoRunning) handleStopAuto();
    sensoryEngine.playClick(1.1);
    sensoryEngine.hapticPresetChange();

    effectiveChangeMode(mode);
    if (isConnected) {
      await servokBle.applyControlMode(mode);
    }
  };

  // Jog Command
  const handleJog = async (delta: number) => {
    const nextPos = Math.max(0, Math.min(100, manualPos + delta));
    setManualPos(nextPos);
    sensoryEngine.playClick(1 + nextPos / 150);
    sensoryEngine.hapticIncrement();
    if (onPositionSent) onPositionSent(nextPos);
    if (isConnected) {
      await servokBle.moveToPosition(nextPos);
    }
  };

  const handleSetPosition = async (targetPct: number) => {
    const nextPos = Math.max(0, Math.min(100, Math.round(targetPct)));
    setManualPos(nextPos);
    sensoryEngine.playClick(0.9 + nextPos / 140);
    if (nextPos === 0 || nextPos === 100) sensoryEngine.hapticBoundaryWarning();
    else sensoryEngine.hapticIncrement();

    if (onPositionSent) onPositionSent(nextPos);
    if (isConnected) {
      await servokBle.moveToPosition(nextPos);
    }
  };

  const handleSmoothnessChange = async (val: number) => {
    setInternalSmoothness(val);
    sensoryEngine.playClick(1.2 - val * 0.04);
    sensoryEngine.hapticIncrement();
    if (onSmoothnessChange) onSmoothnessChange(val);
    if (isConnected) {
      await servokBle.setSmoothness(val);
    }
  };

  // Auto-Cycle Start
  const handleStartAuto = async () => {
    setIsAutoRunning(true);
    sensoryEngine.playStartDrop();
    sensoryEngine.hapticPresetChange();
    if (isConnected) {
      await servokBle.sendAutoCycleSettings(
        autoMinDepth,
        autoMaxDepth,
        autoSpeed,
        smoothness,
        true
      );
    }
  };

  // Turbo Overdrive Modus: 100% Geschwindigkeit + Smoothness 0
  const handleTurboOverdrive = async () => {
    setAutoSpeed(100);
    setInternalSmoothness(0);
    sensoryEngine.playStartDrop();
    sensoryEngine.hapticBoundaryWarning();
    if (onSmoothnessChange) onSmoothnessChange(0);
    setIsAutoRunning(true);
    if (isConnected) {
      await servokBle.setSmoothness(0);
      await servokBle.sendAutoCycleSettings(autoMinDepth, autoMaxDepth, 100, 0, true);
    }
  };

  // Auto-Cycle Stop
  const handleStopAuto = async () => {
    setIsAutoRunning(false);
    sensoryEngine.playStopDrop();
    if (isConnected) {
      await servokBle.stop();
    }
  };

  // Wellengenerator Start / Stop (40Hz High-Speed Streaming mit Smart Waveforms)
  const startPattern = () => {
    if (isAutoRunning) handleStopAuto();
    setIsPatternActive(true);
    sensoryEngine.playStartDrop();
    const startTime = performance.now();
    const min = Math.min(patternMin, patternMax - 2);
    const max = Math.max(patternMax, patternMin + 2);
    const span = max - min;
    const mid = min + span / 2;
    const amp = span / 2;
    const PHI = 1.61803398875;

    const tick = (now: number) => {
      if (now - lastPatternTimeRef.current >= 25) {
        lastPatternTimeRef.current = now;
        const elapsedSec = (now - startTime) / 1000;
        const freqHz = patternSpm / 60;
        const phase = (elapsedSec * freqHz) % 1;

        let computed = mid;

        switch (patternType) {
          case 'sine':
            computed = mid + amp * Math.sin(phase * 2 * Math.PI);
            break;
          case 'triangle':
            computed =
              phase < 0.5 ? min + span * (phase * 2) : max - span * ((phase - 0.5) * 2);
            break;
          case 'ramp':
          case 'sawtooth':
            computed = min + span * phase;
            break;
          case 'pulse':
            computed = phase < 0.5 ? max : min;
            break;
          case 'crescendo': {
            const rampEnv = (elapsedSec % 15) / 15;
            computed = min + span * rampEnv * (0.5 + 0.5 * Math.sin(phase * 2 * Math.PI));
            break;
          }
          case 'climax_curve': {
            const goldenCycle = (elapsedSec % 24) / 24;
            const goldenEnv =
              goldenCycle < 0.618
                ? Math.pow(goldenCycle / 0.618, PHI)
                : 0.75 + 0.25 * Math.sin(goldenCycle * Math.PI * 4);
            computed = min + span * goldenEnv * (0.5 + 0.5 * Math.sin(phase * 2 * Math.PI));
            break;
          }
          case 'organic_chaos':
          case 'random':
            computed =
              mid +
              amp *
                (0.55 * Math.sin(elapsedSec * freqHz * 2 * Math.PI) +
                  0.45 * Math.cos(elapsedSec * freqHz * PHI * Math.PI));
            break;
        }

        const clamped = Math.max(0, Math.min(100, Math.round(computed)));
        setManualPos(clamped);
        if (onPositionSent) onPositionSent(clamped);
        if (isConnected) {
          servokBle.streamPosition(clamped);
        }
      }

      patternAnimRef.current = requestAnimationFrame(tick);
    };

    patternAnimRef.current = requestAnimationFrame(tick);
  };

  const stopPattern = () => {
    setIsPatternActive(false);
    sensoryEngine.playStopDrop();
    if (patternAnimRef.current) {
      cancelAnimationFrame(patternAnimRef.current);
      patternAnimRef.current = null;
    }
  };

  // Manuelle Hex-Befehle senden
  const handleSendCustomHex = async () => {
    sensoryEngine.playClick(1.3);
    if (!isConnected) return;
    await servokBle.sendCustomHex(customHexInput);
  };

  const prepareHexForCommand = (cmd: number, val: number) => {
    sensoryEngine.playClick(1.1);
    const chk = servokBle.calculateChecksum(cmd, val);
    const hex = `CC ${cmd.toString(16).padStart(2, '0').toUpperCase()} ${val
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()} ${chk.toString(16).padStart(2, '0').toUpperCase()}`;
    setCustomHexInput(hex);
  };

  useEffect(() => {
    return () => {
      if (patternAnimRef.current) cancelAnimationFrame(patternAnimRef.current);
    };
  }, []);

  return (
    <div className="obsidian-card obsidian-chrome-edge rounded-sm p-4 text-text-main space-y-4">
      {/* Mode Switcher & Verbindungs-Optionen */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#00f0ff]" />
          <span className="font-display font-bold text-xs uppercase tracking-[0.18em] text-white">
            HARDWARE GATT TELEMETRY &amp; CONTROL
          </span>
          {isConnected && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-xs bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[9px] font-mono text-[#00f0ff]">
              <Radio className="w-2.5 h-2.5" /> {rssi} dBm
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isConnected && onStartSimulation && (
            <button
              onClick={() => {
                sensoryEngine.playClick(1.2);
                onStartSimulation();
              }}
              className="px-2.5 py-1 rounded-sm bg-[#7928ca]/20 border border-[#7928ca]/50 hover:bg-[#7928ca]/35 text-[#c084fc] text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Startet virtuellen Servok mit voller Physik ohne Bluetooth"
            >
              <MonitorCheck className="w-3.5 h-3.5" />
              <span>Simulator</span>
            </button>
          )}

          <div className="flex items-center bg-[#050508] p-1 rounded-sm border border-white/10 text-xs">
            <button
              onClick={() => handleSelectMode('position')}
              className={`px-3 py-1 rounded-xs font-mono font-semibold transition-all cursor-pointer ${
                activeControlMode === 'position'
                  ? 'bg-[#00f0ff] text-black shadow-md font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Position (0xA1)
            </button>
            <button
              onClick={() => handleSelectMode('auto_cycle')}
              className={`px-3 py-1 rounded-xs font-mono font-semibold transition-all cursor-pointer ${
                activeControlMode === 'auto_cycle'
                  ? 'bg-amber-400 text-black shadow-md font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Auto-Cycle (0xA0)
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: Position Control Mode */}
      {activeControlMode === 'position' && (
        <div className="space-y-4">
          {/* Direct Manual Slider */}
          <div className="space-y-1.5 bg-[#050508] p-3 rounded-sm border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-mono">Direkte Soll-Hubposition (0x0A):</span>
              <span className="font-mono font-bold text-[#00f0ff] bg-[#00f0ff]/10 px-2 py-0.5 rounded-xs border border-[#00f0ff]/30">
                {manualPos}% ({((manualPos / 100) * SERVOK_PHYSICAL_STROKE_CM).toFixed(1)} cm)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={manualPos}
              onChange={(e) => handleSetPosition(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-sm appearance-none cursor-pointer accent-[#00f0ff]"
            />
          </div>

          {/* Quick Snap Preset Buttons */}
          <div className="flex items-center justify-between gap-1.5">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handleSetPosition(pct)}
                className={`flex-1 py-1.5 rounded-sm text-[11px] font-mono font-semibold border transition-all cursor-pointer ${
                  manualPos === pct
                    ? 'bg-[#00f0ff] text-black border-[#00f0ff] font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'bg-[#050508] border-white/10 text-text-muted hover:text-white hover:border-white/30'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Incremental Jog Controls */}
          <div className="space-y-1">
            <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
              Schrittweise Verstellung (Jog):
            </div>
            <div className="grid grid-cols-6 gap-1">
              {[-10, -5, -1, 1, 5, 10].map((delta) => (
                <button
                  key={delta}
                  onClick={() => handleJog(delta)}
                  className="py-1.5 rounded-sm bg-[#050508] hover:bg-white/10 text-xs font-mono font-semibold text-white border border-white/10 transition-colors cursor-pointer"
                >
                  {delta > 0 ? `+${delta}%` : `${delta}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Smoothness Slider & Presets */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">Umkehr-Rampe / Smoothness (0x09):</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded-xs text-xs border ${
                  smoothness <= 1
                    ? 'text-amber-300 bg-amber-950/80 border-amber-500/50'
                    : 'text-[#00f0ff] bg-[#00f0ff]/10 border-[#00f0ff]/40'
                }`}
              >
                {smoothness}/10 {smoothness === 0 ? '⚡ (Max. Sport)' : smoothness === 1 ? '⚡ (Sport)' : ''}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={smoothness}
              onChange={(e) => handleSmoothnessChange(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-sm appearance-none cursor-pointer accent-[#00f0ff]"
            />
            <div className="flex justify-between gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => handleSmoothnessChange(0)}
                className={`px-2 py-0.5 rounded-xs border transition-colors cursor-pointer ${
                  smoothness === 0
                    ? 'bg-amber-400 text-black font-bold border-amber-300'
                    : 'bg-[#050508] border-white/10 text-text-muted hover:text-white'
                }`}
              >
                ⚡ Sport 0 (0ms Rampe)
              </button>
              <button
                type="button"
                onClick={() => handleSmoothnessChange(2)}
                className={`px-2 py-0.5 rounded-xs border transition-colors cursor-pointer ${
                  smoothness === 2
                    ? 'bg-[#00f0ff] text-black font-bold border-[#00f0ff]'
                    : 'bg-[#050508] border-white/10 text-text-muted hover:text-white'
                }`}
              >
                Dynamisch 2
              </button>
              <button
                type="button"
                onClick={() => handleSmoothnessChange(5)}
                className={`px-2 py-0.5 rounded-xs border transition-colors cursor-pointer ${
                  smoothness === 5
                    ? 'bg-[#00f0ff] text-black font-bold border-[#00f0ff]'
                    : 'bg-[#050508] border-white/10 text-text-muted hover:text-white'
                }`}
              >
                Sanft 5
              </button>
            </div>
          </div>

          {/* Integrierter Muster- & Wellengenerator (40Hz High-Speed Streaming) */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#c084fc]">
                <Sparkles className="w-4 h-4" />
                <span>Live 40 Hz Oszillator &amp; Climax-Stream</span>
              </div>
              <button
                onClick={isPatternActive ? stopPattern : startPattern}
                className={`px-3 py-1 rounded-sm text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  isPatternActive
                    ? 'bg-[#ff003c] hover:brightness-110 text-white animate-pulse'
                    : 'bg-[#00f0ff] hover:brightness-110 text-black shadow-md'
                }`}
              >
                {isPatternActive ? 'Stream Stoppen' : 'Stream Starten'}
              </button>
            </div>

            {/* Wellenformen */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-[10px]">
              {(
                [
                  'sine',
                  'triangle',
                  'sawtooth',
                  'crescendo',
                  'organic_chaos',
                  'climax_curve',
                ] as WaveformType[]
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    sensoryEngine.playClick(1.1);
                    setPatternType(type);
                  }}
                  className={`py-1.5 px-1 rounded-xs border uppercase transition-all cursor-pointer truncate ${
                    patternType === type
                      ? 'bg-[#7928ca]/30 text-[#00f0ff] border-[#00f0ff]/60 font-bold'
                      : 'bg-[#050508] border-white/10 text-text-muted hover:text-white'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Parameter mit Tempo-Presets */}
            <div className="space-y-2 bg-[#050508] p-2.5 rounded-sm border border-white/10 text-xs font-mono">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-text-muted block mb-0.5">Tempo (SPM):</label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={patternSpm}
                    onChange={(e) => setPatternSpm(Number(e.target.value))}
                    className="w-full bg-[#0b0c13] border border-white/15 px-2 py-1 rounded-xs text-[#00f0ff] font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-0.5">Min-Hub (%):</label>
                  <input
                    type="number"
                    min={0}
                    max={patternMax - 5}
                    value={patternMin}
                    onChange={(e) => setPatternMin(Number(e.target.value))}
                    className="w-full bg-[#0b0c13] border border-white/15 px-2 py-1 rounded-xs text-[#00f0ff] font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-0.5">Max-Hub (%):</label>
                  <input
                    type="number"
                    min={patternMin + 5}
                    max={100}
                    value={patternMax}
                    onChange={(e) => setPatternMax(Number(e.target.value))}
                    className="w-full bg-[#0b0c13] border border-white/15 px-2 py-1 rounded-xs text-[#00f0ff] font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: Firmware Auto-Cycle Mode (CC 01 A0 A1) */}
      {activeControlMode === 'auto_cycle' && (
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-sm text-xs font-mono text-amber-200/90 leading-relaxed">
            <strong>Garantierter Hub:</strong> Der Controller oszilliert autonom zwischen{' '}
            <strong>Min-Hub (0x07)</strong> und <strong>Max-Hub (0x08)</strong>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Min-Depth (0x07) */}
            <div className="space-y-1 bg-[#050508] p-2.5 rounded-sm border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Min-Hub (0x07):</span>
                <span className="font-mono font-bold text-amber-300">{autoMinDepth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max={autoMaxDepth - 1}
                value={autoMinDepth}
                onChange={(e) => {
                  setAutoMinDepth(Number(e.target.value));
                  sensoryEngine.playClick(0.95);
                }}
                className="w-full h-1.5 bg-white/10 rounded-sm appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Max-Depth (0x08) */}
            <div className="space-y-1 bg-[#050508] p-2.5 rounded-sm border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Max-Hub (0x08):</span>
                <span className="font-mono font-bold text-amber-300">{autoMaxDepth}%</span>
              </div>
              <input
                type="range"
                min={autoMinDepth + 1}
                max="100"
                value={autoMaxDepth}
                onChange={(e) => {
                  setAutoMaxDepth(Number(e.target.value));
                  sensoryEngine.playClick(1.1);
                }}
                className="w-full h-1.5 bg-white/10 rounded-sm appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          {/* Speed (0x03) */}
          <div className="space-y-2 bg-[#050508] p-2.5 rounded-sm border border-white/10 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Hardware-Geschwindigkeit (0x03):</span>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-xs border text-[#00f0ff] bg-[#00f0ff]/10 border-[#00f0ff]/40">
                {autoSpeed}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={autoSpeed}
              onChange={(e) => {
                const v = Number(e.target.value);
                setAutoSpeed(v);
                sensoryEngine.playSpeedHarmonic(v, 100);
              }}
              className="w-full h-2 bg-white/10 rounded-sm appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Controls + Turbo Overdrive Button */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleStartAuto}
                className="py-2 rounded-sm text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-all bg-emerald-500 hover:bg-emerald-400 text-black shadow-md cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Zyklus Starten
              </button>

              <button
                onClick={handleStopAuto}
                className="py-2 rounded-sm text-xs font-bold font-mono bg-[#ff003c] hover:brightness-110 text-white flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                Zyklus Stoppen
              </button>
            </div>

            <button
              onClick={handleTurboOverdrive}
              className="w-full py-2 px-3 rounded-sm text-xs font-bold font-mono flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-orange-500 to-[#ff003c] text-black shadow-lg cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>⚡ TURBO OVERDRIVE (100% Speed + 0ms Umkehr-Rampe)</span>
            </button>
          </div>
        </div>
      )}

      {/* MANUELLE HEX-KONSOLE */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <div className="text-[11px] font-mono text-text-muted uppercase font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#00f0ff]" />
            Manuelles GATT Hex-Paket:
          </span>
          <span className="text-[10px] text-white/40 font-normal">CRC: (CMD+VAL)&amp;0xFF</span>
        </div>

        <div className="flex gap-2 font-mono text-xs">
          <input
            type="text"
            value={customHexInput}
            onChange={(e) => setCustomHexInput(e.target.value)}
            placeholder="CC 0A 32 3C"
            className="flex-1 bg-[#050508] border border-white/15 px-3 py-1.5 rounded-sm text-[#00f0ff] font-mono text-xs uppercase focus:outline-none focus:border-[#00f0ff]"
          />
          <button
            onClick={handleSendCustomHex}
            disabled={!isConnected}
            className="px-3 py-1.5 bg-[#00f0ff] hover:brightness-110 text-black rounded-sm flex items-center gap-1 cursor-pointer disabled:opacity-40 font-bold"
          >
            <Send className="w-3 h-3" />
            <span>TX</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <button
            onClick={() => prepareHexForCommand(0x01, 0xa1)}
            className="text-[10px] font-mono bg-[#050508] hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-xs text-text-muted hover:text-white cursor-pointer"
          >
            Mode Pos (01 A1)
          </button>
          <button
            onClick={() => prepareHexForCommand(0x01, 0xa0)}
            className="text-[10px] font-mono bg-[#050508] hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-xs text-text-muted hover:text-white cursor-pointer"
          >
            Mode Auto (01 A0)
          </button>
          <button
            onClick={() => prepareHexForCommand(0x07, 20)}
            className="text-[10px] font-mono bg-[#050508] hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-xs text-text-muted hover:text-white cursor-pointer"
          >
            Min 20% (07 14)
          </button>
          <button
            onClick={() => prepareHexForCommand(0x08, 80)}
            className="text-[10px] font-mono bg-[#050508] hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-xs text-text-muted hover:text-white cursor-pointer"
          >
            Max 80% (08 50)
          </button>
          <button
            onClick={() => prepareHexForCommand(0x0a, 50)}
            className="text-[10px] font-mono bg-[#050508] hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-xs text-text-muted hover:text-white cursor-pointer"
          >
            Pos 50% (0A 32)
          </button>
        </div>
      </div>

      {/* EMERGENCY STOP & NOT-AUS */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <button
          onClick={async () => {
            if (isPatternActive) stopPattern();
            if (isAutoRunning) setIsAutoRunning(false);
            sensoryEngine.playStopDrop();
            if (isConnected) await servokBle.applyControlMode('idle');
          }}
          className="py-1.5 rounded-sm text-[11px] font-mono font-bold bg-[#050508] hover:bg-white/10 text-white border border-white/15 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
          Reset/Idle (0x010001)
        </button>

        <button
          onClick={async () => {
            if (isPatternActive) stopPattern();
            if (isAutoRunning) setIsAutoRunning(false);
            sensoryEngine.playEmergencyAlert();
            sensoryEngine.hapticEmergencyStop();
            if (onEmergencyStop) onEmergencyStop();
            if (isConnected) await servokBle.emergencyStop();
          }}
          className="py-1.5 rounded-sm text-[11px] font-mono font-bold bg-[#ff003c] hover:brightness-110 text-white border border-white/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_16px_rgba(255,0,60,0.4)]"
        >
          <Power className="w-3.5 h-3.5 text-white" />
          KILL SWITCH (0x020002)
        </button>
      </div>
    </div>
  );
};
