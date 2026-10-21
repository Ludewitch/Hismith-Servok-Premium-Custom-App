import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  Sliders,
  Droplets,
  Clock,
  Activity,
  Sparkles,
  ShieldCheck,
  Layers,
  Volume2,
  VolumeX,
  Bookmark,
  ChevronRight,
  Info,
  RotateCcw,
  Gauge,
  Zap,
} from 'lucide-react';
import { PresetDefinition, Waypoint } from '../types/servok';
import { getPresetRealSpmAtTime } from '../data/presets';
import { sensoryEngine } from '../services/sensoryEngine';
import { TRACK_COLORS } from '../constants/trackColors';
import { tr, Language } from '../i18n/translations';

interface PresetDetailModalProps {
  preset: PresetDefinition | null;
  onClose: () => void;
  onLoadPreset: (presetId: string, autoPlay?: boolean) => void;
  formatHHMMSS: (ms: number) => string;
  formatCm: (posPct: number) => string;
  language?: Language;
}

// Linear interpolation between waypoints
function interpolateAt(waypoints: Waypoint[], timeMs: number, defaultValue: number = 0): number {
  if (!waypoints || waypoints.length === 0) return defaultValue;
  if (waypoints.length === 1) return waypoints[0].pos;

  const sorted = [...waypoints].sort((a, b) => a.time - b.time);
  if (timeMs <= sorted[0].time) return sorted[0].pos;
  if (timeMs >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].pos;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (timeMs >= p1.time && timeMs <= p2.time) {
      const span = p2.time - p1.time;
      if (span === 0) return p1.pos;
      const factor = (timeMs - p1.time) / span;
      return p1.pos + (p2.pos - p1.pos) * factor;
    }
  }
  return defaultValue;
}

export const PresetDetailModal: React.FC<PresetDetailModalProps> = ({
  preset,
  onClose,
  onLoadPreset,
  formatHHMMSS,
  formatCm,
  language = 'de',
}) => {
  const lang = (language || 'de') as Language;
  const [isPlayingSim, setIsPlayingSim] = useState<boolean>(false);
  const [simRatio, setSimRatio] = useState<number>(0);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(!sensoryEngine.isMuted);

  const [activeLayers, setActiveLayers] = useState({
    corridor: true,
    minMax: true,
    spm: true,
    hardness: true,
    subsections: true,
    lube: true,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const animRef = useRef<number | null>(null);
  const lastSoundTickRef = useRef<number>(0);

  // Keyboard navigation: Escape key closes the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Sync audio mute state
  useEffect(() => {
    const unsub = sensoryEngine.subscribe((muted) => {
      setIsAudioEnabled(!muted);
    });
    return unsub;
  }, []);

  // SVG coordinate system for the large inspection view
  const VIEW_W = 800;
  const VIEW_H = 220;
  const PAD_T = 24;
  const PAD_B = 28;
  const PAD_L = 16;
  const PAD_R = 16;
  const USABLE_W = VIEW_W - PAD_L - PAD_R;
  const USABLE_H = VIEW_H - PAD_T - PAD_B;

  const durationMs = preset?.durationMs || 60000;

  const timeToX = (t: number) =>
    PAD_L + (Math.max(0, Math.min(durationMs, t)) / durationMs) * USABLE_W;
  const posToY = (pos: number) =>
    PAD_T + USABLE_H - (Math.max(0, Math.min(100, pos)) / 100) * USABLE_H;

  // Build high-res SVG points
  const minPoints = useMemo(() => {
    if (!preset) return [];
    return (preset.waypointsMinDepth || []).map((w) => ({
      x: timeToX(w.time),
      y: posToY(w.pos),
    }));
  }, [preset, USABLE_W, USABLE_H, durationMs]);

  const maxPoints = useMemo(() => {
    if (!preset) return [];
    return (preset.waypointsMaxDepth || []).map((w) => ({
      x: timeToX(w.time),
      y: posToY(w.pos),
    }));
  }, [preset, USABLE_W, USABLE_H, durationMs]);

  const spmPoints = useMemo(() => {
    if (!preset) return [];
    return (preset.waypointsSpm || []).map((w) => ({
      x: timeToX(w.time),
      y: posToY(w.pos),
    }));
  }, [preset, USABLE_W, USABLE_H, durationMs]);

  const hrdPoints = useMemo(() => {
    if (!preset) return [];
    return (preset.waypointsHardness || []).map((w) => ({
      x: timeToX(w.time),
      y: posToY(w.pos),
    }));
  }, [preset, USABLE_W, USABLE_H, durationMs]);

  const buildLinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
      ''
    );
  };

  const minPath = useMemo(() => buildLinePath(minPoints), [minPoints]);
  const maxPath = useMemo(() => buildLinePath(maxPoints), [maxPoints]);
  const spmPath = useMemo(() => buildLinePath(spmPoints), [spmPoints]);
  const hrdPath = useMemo(() => buildLinePath(hrdPoints), [hrdPoints]);

  // Stroke corridor polygon
  const corridorPath = useMemo(() => {
    if (minPoints.length === 0 || maxPoints.length === 0) return '';
    let d = `M ${minPoints[0].x.toFixed(1)} ${minPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < minPoints.length; i++) {
      d += ` L ${minPoints[i].x.toFixed(1)} ${minPoints[i].y.toFixed(1)}`;
    }
    for (let i = maxPoints.length - 1; i >= 0; i--) {
      d += ` L ${maxPoints[i].x.toFixed(1)} ${maxPoints[i].y.toFixed(1)}`;
    }
    d += ' Z';
    return d;
  }, [minPoints, maxPoints]);

  // Immersive Rhythmic Session Audio for Simulation
  useEffect(() => {
    if (isPlayingSim && isAudioEnabled && preset) {
      sensoryEngine.startSessionRhythm({
        spm: preset.startSpm || 60,
        minDepth: 20,
        maxDepth: 80,
        hardness: 50,
      });
    } else {
      sensoryEngine.stopSessionRhythm();
    }
    return () => {
      sensoryEngine.stopSessionRhythm();
    };
  }, [isPlayingSim, isAudioEnabled, preset]);

  // Simulation loop with real-time audio sync
  useEffect(() => {
    if (!isPlayingSim || !preset) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const SIM_CYCLE_MS = 18000; // 18-second smooth inspection scrub
    let startTimestamp: number | null = null;

    const step = (ts: number) => {
      if (!startTimestamp) startTimestamp = ts;
      const elapsed = ts - startTimestamp;
      const progress = (elapsed % SIM_CYCLE_MS) / SIM_CYCLE_MS;
      setSimRatio(progress);

      // Real-time audio parameter synchronization
      if (isAudioEnabled) {
        const curMs = progress * durationMs;
        const curSpm = getPresetRealSpmAtTime(preset, curMs);
        const curMin = interpolateAt(preset.waypointsMinDepth, curMs, 20);
        const curMax = interpolateAt(preset.waypointsMaxDepth, curMs, 80);
        const curHrd = interpolateAt(preset.waypointsHardness, curMs, 50);
        sensoryEngine.updateSessionParams(curSpm, curMin, curMax, curHrd);
      }

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlayingSim, preset, isAudioEnabled, durationMs]);

  // Mouse scrubbing over large SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(
      0,
      Math.min(1, (x - (PAD_L / VIEW_W) * rect.width) / ((USABLE_W / VIEW_W) * rect.width))
    );
    setHoverRatio(ratio);
  };

  const handleMouseLeave = () => {
    setHoverRatio(null);
  };

  const activeRatio = hoverRatio !== null ? hoverRatio : isPlayingSim ? simRatio : 0;
  const cursorTimeMs = Math.round(activeRatio * durationMs);

  const cursorValues = useMemo(() => {
    if (!preset) return null;
    const curMin = interpolateAt(preset.waypointsMinDepth, cursorTimeMs, 10);
    const curMax = interpolateAt(preset.waypointsMaxDepth, cursorTimeMs, 80);
    const curSpm = getPresetRealSpmAtTime(preset, cursorTimeMs);
    const curHrd = Math.round(interpolateAt(preset.waypointsHardness, cursorTimeMs, 50));
    const curSmooth = Math.max(0, Math.min(10, Math.round(((100 - curHrd) / 100) * 10)));
    return {
      min: curMin,
      max: curMax,
      span: Math.max(0, curMax - curMin),
      spm: curSpm,
      hrd: curHrd,
      smooth: curSmooth,
    };
  }, [cursorTimeMs, preset]);

  // Overall Statistics & Hardware Metrics
  const minDepthOverall = useMemo(() => {
    if (!preset) return 0;
    const mins = (preset.waypointsMinDepth || []).map((w) => w.pos);
    return mins.length > 0 ? Math.min(...mins) : 0;
  }, [preset]);

  const maxDepthOverall = useMemo(() => {
    if (!preset) return 100;
    const maxs = (preset.waypointsMaxDepth || []).map((w) => w.pos);
    return maxs.length > 0 ? Math.max(...maxs) : 100;
  }, [preset]);

  const spmRange = useMemo(() => {
    if (!preset?.waypointsSpm || preset.waypointsSpm.length === 0) return { min: 30, max: 120 };
    const realSpms = preset.waypointsSpm.map((w) => getPresetRealSpmAtTime(preset, w.time));
    return {
      min: Math.min(...realSpms),
      max: Math.max(...realSpms),
    };
  }, [preset]);

  if (!preset) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto"
        onClick={onClose}
        id="preset-detail-modal-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-[#09070D]/95 border border-brand-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.12),0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] my-auto"
        >
          {/* HEADER BAR */}
          <div className="px-6 py-4 border-b border-border-dim/60 bg-gradient-to-r from-bg-panel/90 via-bg-base/70 to-bg-panel/90 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="text-3xl p-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 shrink-0 shadow-inner">
                {preset.icon || '✨'}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-text-bright tracking-wide truncate">
                    {preset.title}
                  </h2>
                  {preset.isCustom && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan text-[10px] font-sans font-semibold">
                      {tr(lang, 'Eigene Vorlage', 'Custom Preset', 'Plantilla Propia')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-text-dim mt-0.5 flex-wrap">
                  <span className="text-brand-cyan font-medium">{preset.category}</span>
                  <span className="text-border-bright">·</span>
                  <span className="text-text-bright font-semibold flex items-center gap-1">
                    <Clock className="w-3 text-text-dim" />
                    {preset.duration} ({formatHHMMSS(preset.durationMs)})
                  </span>
                  <span className="text-border-bright">·</span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] ${
                      preset.intensity === 'soft'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : preset.intensity === 'medium'
                        ? 'text-brand-orchid border-brand-orchid/30 bg-brand-orchid/10'
                        : 'text-brand-rose border-brand-rose/30 bg-brand-rose/10'
                    }`}
                  >
                    {preset.intensity === 'soft'
                      ? tr(lang, 'Sanft & Sinnlich', 'Gentle & Sensual', 'Suave y Sensual')
                      : preset.intensity === 'medium'
                      ? tr(lang, 'Geschmeidig & Dynamisch', 'Smooth & Dynamic', 'Fluido y Dinámico')
                      : tr(lang, 'Kraftvoll & Intensiv', 'Powerful & Intensive', 'Potente e Intensivo')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sensoryEngine.toggleMute();
                  setIsAudioEnabled(!sensoryEngine.isMuted);
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isAudioEnabled
                    ? 'bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan'
                    : 'bg-bg-panel border-border-dim text-text-dim hover:text-text-bright'
                }`}
                title={
                  isAudioEnabled
                    ? tr(lang, 'Klick-Audio stummschalten', 'Mute audio', 'Silenciar audio')
                    : tr(lang, 'Klick-Audio aktivieren', 'Enable audio', 'Activar audio')
                }
              >
                {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-bg-panel hover:bg-border-bright text-text-dim hover:text-text-bright border border-border-dim hover:border-brand-cyan/40 transition-colors cursor-pointer"
                title={tr(lang, 'Schließen (Esc)', 'Close (Esc)', 'Cerrar (Esc)')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* 1. FULL UNTRUNCATED DESCRIPTION & PROFILE INSIGHTS */}
            <div className="sensual-glass-interactive rounded-xl p-4 sm:p-5 border border-border-dim space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border-dim/40 pb-2.5">
                <span className="text-xs font-mono uppercase tracking-wider text-brand-cyan font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-brand-cyan" />
                  {tr(
                    lang,
                    'Vollständige Vorlagen-Beschreibung & Charakteristik',
                    'Full Preset Description & Characteristics',
                    'Descripción Completa de Plantilla y Características'
                  )}
                </span>
                <span className="text-[11px] font-mono text-text-dim">
                  {tr(
                    lang,
                    'Hardware-optimiert für Hismith Servok Premium H2',
                    'Hardware-optimized for Hismith Servok Premium H2',
                    'Optimizado para hardware Hismith Servok Premium H2'
                  )}
                </span>
              </div>

              {/* UNCLIPPED DESCRIPTION TEXT */}
              <p className="text-sm leading-relaxed text-text-bright font-sans whitespace-pre-line font-normal selection:bg-brand-cyan/30">
                {preset.desc}
              </p>

              {/* HARDWARE RECOMMENDATION ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="bg-bg-base/70 border border-border-dim/70 rounded-lg p-2.5 flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-brand-cyan shrink-0" />
                  <div>
                    <span className="text-[10px] text-text-dim block">
                      {tr(lang, 'Empfohlener Modus', 'Recommended Mode', 'Modo Recomendado')}
                    </span>
                    <strong className="text-text-bright">
                      {preset.recommendedMode === 'speed'
                        ? tr(lang, '0x01 Geschwindigkeits-Regelung', '0x01 Speed Control', '0x01 Control de Velocidad')
                        : tr(lang, '0x02 Positions-Wegsteuerung', '0x02 Position Tracking', '0x02 Control de Posición')}
                    </strong>
                  </div>
                </div>

                <div className="bg-bg-base/70 border border-border-dim/70 rounded-lg p-2.5 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-text-dim block">
                      {tr(lang, 'Umkehr-Sanftheit (Reg. 0x09)', 'Reversal Softness (Reg. 0x09)', 'Suavidad de Inversión (Reg. 0x09)')}
                    </span>
                    <strong className="text-emerald-400">
                      {tr(lang, 'Stufe', 'Level', 'Nivel')} {preset.recommendedSmoothness ?? 8} / 10 ({preset.recommendedSmoothness && preset.recommendedSmoothness >= 7
                        ? tr(lang, 'Sanftes Gleiten', 'Smooth Glide', 'Deslizamiento Suave')
                        : tr(lang, 'Präziser Anschlag', 'Crisp Strike', 'Impacto Nítido')})
                    </strong>
                  </div>
                </div>

                <div className="bg-bg-base/70 border border-border-dim/70 rounded-lg p-2.5 flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-text-dim block">
                      {tr(lang, 'Dynamik & Kadenz', 'Dynamics & Cadence', 'Dinámica y Cadencia')}
                    </span>
                    <strong className="text-amber-400">
                      {spmRange.min} – {spmRange.max} {tr(lang, 'SPM (Stöße/Min)', 'SPM (Strokes/min)', 'SPM (Golpes/min)')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. HIGH-RES INTERACTIVE WAVEFORM INSPECTOR */}
            <div className="sensual-glass rounded-xl p-4 sm:p-5 border border-border-dim space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-dim/40 pb-2.5">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-bright font-bold flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-brand-cyan" />
                    {tr(lang, 'Interaktive 4-Spur Wellenform & Telemetrie', 'Interactive 4-Track Waveform & Telemetry', 'Forma de Onda de 4 Pistas y Telemetría')}
                  </h3>
                  <span className="text-[10px] text-text-dim font-mono">
                    {tr(
                      lang,
                      'Bewege die Maus über die Grafik, um genaue Hub- und Tempowerte zu jeder Sekunde einzusehen.',
                      'Hover over graph to inspect stroke depth and speed at any second.',
                      'Pasa el cursor por el gráfico para inspeccionar carrera y ritmo en cada segundo.'
                    )}
                  </span>
                </div>

                {/* SIMULATION & CONTROLS */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      sensoryEngine.playClick(1.2);
                      setIsPlayingSim(!isPlayingSim);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isPlayingSim
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm animate-pulse'
                        : 'bg-bg-panel text-brand-cyan hover:bg-brand-cyan/20 border-brand-cyan/40'
                    }`}
                  >
                    {isPlayingSim ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    <span>{isPlayingSim ? tr(lang, 'Simulation stoppen', 'Stop Simulation', 'Detener Simulación') : tr(lang, 'Simulation abspielen', 'Play Simulation', 'Reproducir Simulación')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHoverRatio(0);
                      setSimRatio(0);
                      sensoryEngine.playClick(0.9);
                    }}
                    className="p-1.5 rounded-lg bg-bg-panel hover:bg-border-bright text-text-dim hover:text-text-bright border border-border-dim transition-colors cursor-pointer"
                    title={tr(lang, 'Playhead auf Start zurücksetzen', 'Reset playhead to start', 'Restablecer cabezal al inicio')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* LAYER TOGGLE PILLS */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                <span className="text-text-dim text-[10px] mr-1">{tr(lang, 'Ebenen:', 'Layers:', 'Capas:')}</span>
                <button
                  type="button"
                  onClick={() => setActiveLayers((p) => ({ ...p, corridor: !p.corridor }))}
                  className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLayers.corridor
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-bg-base text-text-dim border-border-dim opacity-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400/80 shadow-[0_0_5px_#00F0FF]" /> {tr(lang, 'Hub-Korridor', 'Stroke Corridor', 'Corredor de Carrera')}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLayers((p) => ({ ...p, minMax: !p.minMax }))}
                  className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLayers.minMax
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                      : 'bg-bg-base text-text-dim border-border-dim opacity-50'
                  }`}
                >
                  <span className="flex items-center gap-0.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_#00F0FF]" />
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_5px_#F43F5E]" />
                  </span>
                  <span>{tr(lang, 'Min & Max Tiefe', 'Min & Max Depth', 'Profundidad Mín. y Máx.')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLayers((p) => ({ ...p, spm: !p.spm }))}
                  className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLayers.spm
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-bg-base text-text-dim border-border-dim opacity-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_#10B981]" /> {tr(lang, 'SPM Tempo', 'SPM Speed', 'Ritmo SPM')}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLayers((p) => ({ ...p, hardness: !p.hardness }))}
                  className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLayers.hardness
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm ring-1 ring-amber-400/40'
                      : 'bg-bg-base text-text-dim border-border-dim opacity-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_#F59E0B]" /> {tr(lang, 'Härte (0x09)', 'Hardness (0x09)', 'Dureza (0x09)')}
                </button>
              </div>

              {/* LARGE SVG CANVAS */}
              <div className="bg-[var(--plot-bg)] border border-border-dim rounded-xl p-3 relative overflow-hidden select-none transition-colors">
                {/* Subsection phase progress bar on top */}
                {preset.subsections && preset.subsections.length > 0 && activeLayers.subsections && (
                  <div className="flex w-full h-2 rounded-xs overflow-hidden mb-2 opacity-90 gap-1 bg-bg-base">
                    {preset.subsections.map((sub, idx) => {
                      const widthPct = Math.max(
                        1,
                        ((sub.endTime - sub.startTime) / durationMs) * 100
                      );
                      const color = sub.color || (idx % 2 === 0 ? '#FF55B8' : '#00F0FF');
                      return (
                        <div
                          key={sub.id}
                          style={{ width: `${widthPct}%`, backgroundColor: color }}
                          className="h-full transition-opacity hover:opacity-100"
                          title={`${sub.name} (${formatHHMMSS(sub.startTime)} – ${formatHHMMSS(
                            sub.endTime
                          )})`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* SVG Graph */}
                <div className="relative">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                    className="w-full h-44 sm:h-56 block cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <defs>
                      <linearGradient id={`modalCorridorGrad-${preset.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.26" />
                        <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.08" />
                      </linearGradient>
                      <linearGradient id={`spmLineGrad-${preset.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid & Dimension labels */}
                    {[0, 25, 50, 75, 100].map((pct) => (
                      <g key={pct}>
                        <line
                          x1={PAD_L}
                          y1={posToY(pct)}
                          x2={VIEW_W - PAD_R}
                          y2={posToY(pct)}
                          stroke="var(--border-dim)"
                          strokeWidth="0.8"
                          strokeDasharray={pct === 0 || pct === 100 ? '4 4' : '2 4'}
                        />
                        <text
                          x={PAD_L + 4}
                          y={posToY(pct) - 4}
                          fill="var(--text-muted)"
                          fontSize="8"
                          fontFamily="monospace"
                        >
                          {formatCm(pct)} ({pct}%)
                        </text>
                      </g>
                    ))}

                    {/* Vertical Time Guides (quarter marks) */}
                    {[0.25, 0.5, 0.75].map((factor) => {
                      const t = durationMs * factor;
                      const x = timeToX(t);
                      return (
                        <g key={factor}>
                          <line
                            x1={x}
                            y1={PAD_T}
                            x2={x}
                            y2={VIEW_H - PAD_B}
                            stroke="var(--border-dim)"
                            strokeWidth="0.7"
                            strokeDasharray="2 4"
                          />
                          <text
                            x={x}
                            y={VIEW_H - PAD_B + 14}
                            fill="var(--text-muted)"
                            fontSize="8"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {formatHHMMSS(t)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Corridor fill */}
                    {activeLayers.corridor && corridorPath && (
                      <path d={corridorPath} fill={`url(#modalCorridorGrad-${preset.id})`} />
                    )}

                    {/* Max Depth Line (Vivid Rose/Red) */}
                    {activeLayers.minMax && maxPath && (
                      <path
                        d={maxPath}
                        fill="none"
                        stroke={TRACK_COLORS.maxDepth.hex}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Min Depth Line (Electric Cyan) */}
                    {activeLayers.minMax && minPath && (
                      <path
                        d={minPath}
                        fill="none"
                        stroke={TRACK_COLORS.minDepth.hex}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* SPM Curve (Emerald Green) */}
                    {activeLayers.spm && spmPath && (
                      <path
                        d={spmPath}
                        fill="none"
                        stroke={TRACK_COLORS.spm.hex}
                        strokeWidth="2.2"
                        strokeDasharray="5 2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Hardness Line (Warm Amber Gold) */}
                    {activeLayers.hardness && hrdPath && (
                      <path
                        d={hrdPath}
                        fill="none"
                        stroke={TRACK_COLORS.hardness.hex}
                        strokeWidth="2.0"
                        strokeDasharray="2 3"
                        strokeLinecap="round"
                        opacity="0.95"
                      />
                    )}

                    {/* Lube Triggers */}
                    {activeLayers.lube &&
                      (preset.lubeTriggers || []).map((trig) => {
                        const x = timeToX(trig.time);
                        return (
                          <g key={trig.id} transform={`translate(${x}, ${VIEW_H - 12})`}>
                            <circle cx="0" cy="0" r="5" fill="#00F0FF" opacity="0.9" />
                            <text
                              x="0"
                              y="3"
                              fill="#050408"
                              fontSize="7"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {trig.bursts}
                            </text>
                          </g>
                        );
                      })}

                    {/* Active Scrubbing Playhead Line & Cursor Rings */}
                    <g>
                      <line
                        x1={PAD_L + activeRatio * USABLE_W}
                        y1={PAD_T}
                        x2={PAD_L + activeRatio * USABLE_W}
                        y2={VIEW_H - PAD_B}
                        stroke="#00F0FF"
                        strokeWidth="1.8"
                        strokeDasharray="3 2"
                      />
                      <circle
                        cx={PAD_L + activeRatio * USABLE_W}
                        cy={posToY(cursorValues?.max ?? 80)}
                        r="4.5"
                        fill="#F43F5E"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={PAD_L + activeRatio * USABLE_W}
                        cy={posToY(cursorValues?.min ?? 20)}
                        r="4.5"
                        fill="#00F0FF"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    </g>
                  </svg>
                </div>

                {/* REAL-TIME SCRUB VALUES TELEMETRY DOCK */}
                <div className="mt-2 pt-2 border-t border-border-dim/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-bg-panel/80 p-2 rounded-lg border border-border-dim/60">
                    <span className="text-[10px] text-text-dim block">{tr(lang, 'Zeitpunkt', 'Timestamp', 'Momento')}</span>
                    <strong className="text-brand-cyan text-sm">{formatHHMMSS(cursorTimeMs)}</strong>
                    <span className="text-[10px] text-text-dim ml-1">/ {formatHHMMSS(durationMs)}</span>
                  </div>

                  <div className="bg-bg-panel/80 p-2 rounded-lg border border-border-dim/60">
                    <span className="text-[10px] text-text-dim block">{tr(lang, 'Hub-Korridor (Min – Max)', 'Stroke Corridor (Min – Max)', 'Corredor de Carrera (Mín – Máx)')}</span>
                    <strong className="text-cyan-400">
                      {cursorValues ? formatCm(cursorValues.min) : '–'}
                    </strong>{' '}
                    –{' '}
                    <strong className="text-rose-400">
                      {cursorValues ? formatCm(cursorValues.max) : '–'}
                    </strong>
                    <span className="text-[10px] text-text-dim block">
                      {tr(lang, 'Spanne:', 'Span:', 'Amplitud:')} {cursorValues ? formatCm(cursorValues.span) : '–'}
                    </span>
                  </div>

                  <div className="bg-bg-panel/80 p-2 rounded-lg border border-border-dim/60">
                    <span className="text-[10px] text-text-dim block">{tr(lang, 'Geschwindigkeit', 'Speed', 'Velocidad')}</span>
                    <strong className="text-emerald-400 text-sm">
                      {cursorValues ? cursorValues.spm : 0} SPM
                    </strong>
                    <span className="text-[10px] text-text-dim block">
                      {tr(lang, 'Bereich:', 'Range:', 'Rango:')} {spmRange.min}–{spmRange.max} SPM
                    </span>
                  </div>

                  <div className="bg-bg-panel/80 p-2 rounded-lg border border-border-dim/60">
                    <span className="text-[10px] text-text-dim block">{tr(lang, 'Härte & Glätte', 'Hardness & Smoothness', 'Dureza y Suavidad')}</span>
                    <strong className="text-amber-400 text-sm">
                      {cursorValues ? cursorValues.hrd : 50}%
                    </strong>
                    <span className="text-[10px] text-text-dim block">
                      {tr(lang, 'Umkehr:', 'Reversal:', 'Inversión:')} {cursorValues ? cursorValues.smooth : 8}/10
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SUBSECTIONS & PHASEN-AUFBAU */}
            {preset.subsections && preset.subsections.length > 0 && (
              <div className="sensual-glass rounded-xl p-4 sm:p-5 border border-border-dim space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-bright font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-brand-orchid" />
                    {tr(lang, 'Dramaturgische Phasen & Abschnitte', 'Dramaturgical Phases & Sections', 'Fases y Secciones Dramatúrgicas')} ({preset.subsections.length})
                  </span>
                  <span className="text-[10px] text-text-dim font-normal">
                    {tr(lang, 'Klicke eine Phase an, um den Playhead darauf zu setzen', 'Click a phase to jump playhead', 'Haz clic en una fase para saltar el cabezal')}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {preset.subsections.map((sub, i) => {
                    const subDurationSec = Math.round((sub.endTime - sub.startTime) / 1000);
                    const isCurrent =
                      cursorTimeMs >= sub.startTime && cursorTimeMs <= sub.endTime;

                    return (
                      <div
                        key={sub.id}
                        onClick={() => {
                          setHoverRatio(sub.startTime / durationMs);
                          sensoryEngine.playClick(1.05);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer font-mono text-xs space-y-1.5 ${
                          isCurrent
                            ? 'bg-brand-cyan/15 border-brand-cyan text-text-bright shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                            : 'bg-bg-base/70 border-border-dim hover:border-brand-cyan/50 text-text-dim hover:text-text-bright'
                        }`}
                        style={{ borderLeftColor: sub.color || '#FF55B8', borderLeftWidth: '4px' }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold font-sans text-sm text-text-bright truncate">
                            {sub.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg-panel border border-border-dim">
                            {tr(lang, 'Phase', 'Phase', 'Fase')} {i + 1}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-text-dim">
                          <span>
                            {formatHHMMSS(sub.startTime)} – {formatHHMMSS(sub.endTime)}
                          </span>
                          <span className="font-semibold text-brand-cyan">{subDurationSec}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. AUTOMATISIERTE GLEITMITTEL-IMPULSE */}
            {preset.lubeTriggers && preset.lubeTriggers.length > 0 && (
              <div className="sensual-glass rounded-xl p-4 sm:p-5 border border-border-dim space-y-3 font-mono text-xs">
                <h3 className="uppercase font-bold text-cyan-300 flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-brand-cyan" />
                  {tr(lang, 'Automatisierte Gleitmittel-Impulse', 'Automated Lubrication Pulses', 'Impulsos de Lubricación Automatizados')} ({preset.lubeTriggers.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {preset.lubeTriggers.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setHoverRatio(t.time / durationMs);
                        sensoryEngine.playClick(1.1);
                      }}
                      className="px-3 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/40 rounded-xl text-xs text-cyan-200 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{tr(lang, 'Bei', 'At', 'En')} {formatHHMMSS(t.time)}:</span>
                      <strong className="text-brand-cyan font-bold">{t.bursts} {tr(lang, 'Sprühstoß/Stöße', 'pulses', 'impulsos')}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="px-6 py-4 border-t border-border-dim/60 bg-bg-panel/90 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-bg-base hover:bg-border-bright text-text-dim hover:text-text-bright border border-border-dim text-xs font-mono transition-colors cursor-pointer"
            >
              {tr(lang, 'Schließen (Esc)', 'Close (Esc)', 'Cerrar (Esc)')}
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playClick(1.1);
                  const id = preset.id;
                  onClose();
                  onLoadPreset(id, false);
                }}
                className="px-4 py-2.5 rounded-xl bg-bg-base hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 hover:border-brand-cyan text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>{tr(lang, 'Im 4-Spur-Editor öffnen', 'Open in 4-Track Studio', 'Abrir en Estudio de 4 Pistas')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playClick(1.25);
                  const id = preset.id;
                  onClose();
                  onLoadPreset(id, true);
                }}
                className="px-5 py-2.5 rounded-xl bg-brand-cyan text-bg-base hover:bg-brand-cyan/90 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{tr(lang, 'Laden & Sofort Starten', 'Load & Start Immediately', 'Cargar e Iniciar Inmediatamente')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
