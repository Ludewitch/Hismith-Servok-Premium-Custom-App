import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Clock,
  Activity,
  Play,
  Pause,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Droplets,
  Search,
  Check,
  Maximize2,
  X,
  Gauge,
  ShieldCheck,
  HelpCircle,
  Eye,
  RotateCcw,
  Zap,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { PRESET_DEFINITIONS, getAllPresets, deleteCustomPreset, getPresetRealSpmAtTime, MASTER_CATEGORIES } from '../data/presets';
import { PresetDefinition, Waypoint, PresetId } from '../types/servok';
import { Language, translations } from '../i18n/translations';
import { PresetDetailModal } from './PresetDetailModal';
import { sensoryEngine } from '../services/sensoryEngine';
import { TRACK_COLORS } from '../constants/trackColors';

interface PresetCatalogViewProps {
  onLoadPreset: (presetId: string, autoPlay?: boolean) => void;
  onBackToStart: () => void;
  onBackToEditor: () => void;
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

export function getPresetSubcategory(p: PresetDefinition, lang: Language | string = 'de'): string {
  if (p.isCustom) {
    return lang === 'en' ? 'Custom Creations' : lang === 'es' ? 'Creaciones Propias' : 'Eigene Kreationen';
  }
  const t = (p.id + ' ' + p.title + ' ' + p.desc).toLowerCase();
  const cat = p.category;

  if (cat === 'Zart & Sinnlich') {
    if (t.includes('morgen') || t.includes('morning') || t.includes('erwachen')) {
      return lang === 'en' ? 'Dawn & Awakening' : lang === 'es' ? 'Amanecer y Despertar' : 'Morgendämmerung';
    }
    if (t.includes('honig') || t.includes('honey') || t.includes('amber') || t.includes('bernstein') || t.includes('samt')) {
      return lang === 'en' ? 'Honey & Velvet' : lang === 'es' ? 'Miel y Terciopelo' : 'Honig & Samt';
    }
    if (t.includes('tantr') || t.includes('lotus') || t.includes('atem') || t.includes('tempel')) {
      return lang === 'en' ? 'Tantra & Breath' : lang === 'es' ? 'Tantra y Respiración' : 'Tantra & Atem';
    }
    if (t.includes('feder') || t.includes('kiss') || t.includes('rose') || t.includes('petal')) {
      return lang === 'en' ? 'Feather Kiss & Rose' : lang === 'es' ? 'Beso de Pluma y Rosa' : 'Federkuss & Rose';
    }
    return lang === 'en' ? 'Silky Waves' : lang === 'es' ? 'Olas Sedosas' : 'Seidige Wellen';
  }
  if (cat === 'Wellen & Rhythmus') {
    if (t.includes('lagoon') || t.includes('lagune') || t.includes('gezeiten') || t.includes('tide') || t.includes('ozean')) {
      return lang === 'en' ? 'Tides & Lagoon' : lang === 'es' ? 'Mareas y Laguna' : 'Gezeiten & Lagune';
    }
    if (t.includes('waltz') || t.includes('walzer') || t.includes('3/4') || t.includes('wiege')) {
      return lang === 'en' ? 'Waltz Rhythm' : lang === 'es' ? 'Ritmo de Vals' : 'Walzer-Rhythmus';
    }
    if (t.includes('groove') || t.includes('poly') || t.includes('sync') || t.includes('takt')) {
      return lang === 'en' ? 'Groove & Polyrhythm' : lang === 'es' ? 'Groove y Polirritmia' : 'Groove & Polyrhythmus';
    }
    return lang === 'en' ? 'Harmonic Sine Waves' : lang === 'es' ? 'Ondas Sinusoidales' : 'Harmonische Sinuswellen';
  }
  if (cat === 'Tease & Edging') {
    if (t.includes('tiptoe') || t.includes('antasten') || t.includes('vorhof') || t.includes('shy')) {
      return lang === 'en' ? 'Tiptoe & Outer Zone' : lang === 'es' ? 'Sondeo y Zona Exterior' : 'Antasten & Vorhof';
    }
    if (t.includes('pause') || t.includes('schwebe') || t.includes('stop') || t.includes('innehalten')) {
      return lang === 'en' ? 'Hover & Pause' : lang === 'es' ? 'Suspensión y Pausa' : 'Innehalten & Schwebe';
    }
    if (t.includes('denial') || t.includes('reizen') || t.includes('edging') || t.includes('vergeblich')) {
      return lang === 'en' ? 'Edging & Denial' : lang === 'es' ? 'Edging y Negación' : 'Edging & Denial';
    }
    return lang === 'en' ? 'Delay Ramps' : lang === 'es' ? 'Rampas de Retraso' : 'Verzögerungs-Rampen';
  }
  if (cat === 'Tiefen-Exploration') {
    if (t.includes('stretch') || t.includes('dehnung') || t.includes('öffnung') || t.includes('blossom')) {
      return lang === 'en' ? 'Gentle Stretch' : lang === 'es' ? 'Estiramiento Suave' : 'Behutsame Dehnung';
    }
    if (t.includes('sanctuary') || t.includes('heiligtum') || t.includes('warm') || t.includes('verweilen')) {
      return lang === 'en' ? 'Deep Sanctuary' : lang === 'es' ? 'Santuario Profundo' : 'Tiefen-Heiligtum';
    }
    if (t.includes('basis') || t.includes('vollhub') || t.includes('thrust') || t.includes('schub')) {
      return lang === 'en' ? 'Full Stroke Thrusts' : lang === 'es' ? 'Empujes de Carrera Completa' : 'Vollhub-Schübe';
    }
    return lang === 'en' ? 'Deep Anchor' : lang === 'es' ? 'Anclaje Profundo' : 'Tiefe Verankerung';
  }
  if (cat === 'Flutter & Vibration') {
    if (t.includes('kolibri') || t.includes('hummingbird') || t.includes('schmetterling') || t.includes('flatter')) {
      return lang === 'en' ? 'Hummingbird Flutter' : lang === 'es' ? 'Aleteo de Colibrí' : 'Kolibri & Flattern';
    }
    if (t.includes('champagne') || t.includes('champagner') || t.includes('bubbles') || t.includes('perlen')) {
      return lang === 'en' ? 'Sparkling Bubbles' : lang === 'es' ? 'Burbujas Perladas' : 'Perlende Bläschen';
    }
    if (t.includes('puls') || t.includes('pulse') || t.includes('salve') || t.includes('burst')) {
      return lang === 'en' ? 'Micropulse Bursts' : lang === 'es' ? 'Ráfagas de Micropulsos' : 'Mikropuls-Salven';
    }
    return lang === 'en' ? 'High-Frequency Shiver' : lang === 'es' ? 'Vibración Alta Frecuencia' : 'Hochfrequenz-Zittern';
  }
  if (cat === 'Ausdauer & Trance') {
    if (t.includes('cloud') || t.includes('wolke') || t.includes('schwerelos') || t.includes('float')) {
      return lang === 'en' ? 'Weightless Clouds' : lang === 'es' ? 'Nubes Ingrávidas' : 'Schwerelose Wolken';
    }
    if (t.includes('cocoon') || t.includes('kokon') || t.includes('geborgen') || t.includes('journey')) {
      return lang === 'en' ? 'Silk Cocoon Trance' : lang === 'es' ? 'Trance Capullo de Seda' : 'Seidenkokon-Trance';
    }
    if (t.includes('marathon') || t.includes('endurance') || t.includes('langzeit')) {
      return lang === 'en' ? 'Marathon Endurance' : lang === 'es' ? 'Resistencia de Maratón' : 'Marathon-Ausdauer';
    }
    return lang === 'en' ? 'Hypnotic Flow' : lang === 'es' ? 'Flujo Hipnótico' : 'Hypnotischer Flow';
  }
  if (cat === 'Steigerung & Klimax') {
    if (t.includes('rose') || t.includes('bloom') || t.includes('blüte') || t.includes('sanft')) {
      return lang === 'en' ? 'Delicate Bloom' : lang === 'es' ? 'Florecimiento Delicado' : 'Zartes Aufblühen';
    }
    if (t.includes('sunrise') || t.includes('sonnenaufgang') || t.includes('arc') || t.includes('golden')) {
      return lang === 'en' ? 'Golden Sunrise' : lang === 'es' ? 'Amanecer Dorado' : 'Goldener Sonnenaufgang';
    }
    if (t.includes('crescendo') || t.includes('stufen') || t.includes('eskalation')) {
      return lang === 'en' ? 'Step Crescendo' : lang === 'es' ? 'In crescendo Escalonado' : 'Stufen-Crescendo';
    }
    return lang === 'en' ? 'Climax & Finale' : lang === 'es' ? 'Clímax y Final' : 'Klimax & Finale';
  }
  if (cat === 'Kraftvoll & Intensiv') {
    if (t.includes('steamhammer') || t.includes('dampfhammer') || t.includes('industrie') || t.includes('hammer')) {
      return lang === 'en' ? 'Steam Hammer Beats' : lang === 'es' ? 'Golpes de Martillo de Vapor' : 'Dampfhammer-Takte';
    }
    if (t.includes('piston') || t.includes('kolben') || t.includes('wucht') || t.includes('drehmoment')) {
      return lang === 'en' ? 'Piston Force' : lang === 'es' ? 'Fuerza de Pistón' : 'Kolben-Wucht';
    }
    if (t.includes('sturm') || t.includes('surge') || t.includes('heavy')) {
      return lang === 'en' ? 'Deep Storm' : lang === 'es' ? 'Tormenta Profunda' : 'Tiefensturm';
    }
    return lang === 'en' ? 'Powerful Dynamics' : lang === 'es' ? 'Dinámica Potente' : 'Kraftvolle Dynamik';
  }
  if (cat === 'Grenzerfahrungen') {
    if (t.includes('cervix') || t.includes('crush') || t.includes('kompress') || t.includes('limit')) {
      return lang === 'en' ? 'Limit Compression' : lang === 'es' ? 'Compresión Límite' : 'Grenzbereich-Kompression';
    }
    if (t.includes('singularity') || t.includes('singularität') || t.includes('kollaps')) {
      return lang === 'en' ? 'Deep Singularity' : lang === 'es' ? 'Singularidad Profunda' : 'Tiefen-Singularität';
    }
    return lang === 'en' ? 'Extreme Frequencies' : lang === 'es' ? 'Frecuencias Extremas' : 'Extrem-Frequenzen';
  }
  if (cat === 'Spezials & Experimente') {
    if (t.includes('contrast') || t.includes('kontrast') || t.includes('duett')) {
      return lang === 'en' ? 'Contrast Duets' : lang === 'es' ? 'Dúos de Contraste' : 'Kontrast-Duette';
    }
    if (t.includes('fibonacci') || t.includes('spirale') || t.includes('goldener schnitt')) {
      return lang === 'en' ? 'Fibonacci Harmonics' : lang === 'es' ? 'Armónicos de Fibonacci' : 'Fibonacci-Harmonik';
    }
    if (t.includes('heartbeat') || t.includes('herzschlag') || t.includes('puls')) {
      return lang === 'en' ? 'Biometric Heartbeat' : lang === 'es' ? 'Latido Biométrico' : 'Biometrischer Herzschlag';
    }
    return lang === 'en' ? 'Experimental Waves' : lang === 'es' ? 'Ondas Experimentales' : 'Experimentelle Wellen';
  }
  return lang === 'en' ? 'General' : lang === 'es' ? 'General' : 'Allgemein';
}

interface PresetCardPreviewProps {
  preset: PresetDefinition;
  formatHHMMSS: (ms: number) => string;
  formatCm: (posPct: number) => string;
  onLoad: (presetId: string, autoPlay?: boolean) => void;
  onOpenDetails: (preset: PresetDefinition) => void;
  onDeleteCustom?: (presetId: string) => void;
  showLayers: { minMax: boolean; spm: boolean; hardness: boolean };
  language?: Language;
}

const PresetCardPreview: React.FC<PresetCardPreviewProps> = ({
  preset,
  formatHHMMSS,
  formatCm,
  onLoad,
  onOpenDetails,
  onDeleteCustom,
  showLayers,
  language = 'de',
}) => {
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [isPlayingSim, setIsPlayingSim] = useState<boolean>(false);
  const [simRatio, setSimRatio] = useState<number>(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animRef = useRef<number | null>(null);

  // SVG coordinate system
  const VIEW_W = 440;
  const VIEW_H = 120;
  const PAD_T = 14;
  const PAD_B = 16;
  const PAD_L = 8;
  const PAD_R = 8;
  const USABLE_W = VIEW_W - PAD_L - PAD_R;
  const USABLE_H = VIEW_H - PAD_T - PAD_B;

  const timeToX = (t: number) => PAD_L + (Math.max(0, Math.min(preset.durationMs, t)) / preset.durationMs) * USABLE_W;
  const posToY = (pos: number) => PAD_T + USABLE_H - (Math.max(0, Math.min(100, pos)) / 100) * USABLE_H;

  // Build SVG Path strings (All 4 layers are calibrated 0..100% on the vertical axis)
  const minPoints = useMemo(() => {
    return (preset.waypointsMinDepth || []).map((w) => ({ x: timeToX(w.time), y: posToY(w.pos) }));
  }, [preset, USABLE_W, USABLE_H]);

  const maxPoints = useMemo(() => {
    return (preset.waypointsMaxDepth || []).map((w) => ({ x: timeToX(w.time), y: posToY(w.pos) }));
  }, [preset, USABLE_W, USABLE_H]);

  const spmPoints = useMemo(() => {
    return (preset.waypointsSpm || []).map((w) => ({ x: timeToX(w.time), y: posToY(w.pos) }));
  }, [preset, USABLE_W, USABLE_H]);

  const hrdPoints = useMemo(() => {
    return (preset.waypointsHardness || []).map((w) => ({ x: timeToX(w.time), y: posToY(w.pos) }));
  }, [preset, USABLE_W, USABLE_H]);

  const buildLinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
  };

  const minPath = useMemo(() => buildLinePath(minPoints), [minPoints]);
  const maxPath = useMemo(() => buildLinePath(maxPoints), [maxPoints]);
  const spmPath = useMemo(() => buildLinePath(spmPoints), [spmPoints]);
  const hrdPath = useMemo(() => buildLinePath(hrdPoints), [hrdPoints]);

  // Corridor area polygon (Min to Max depth stroke corridor)
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

  // Simulation playback loop
  useEffect(() => {
    if (!isPlayingSim) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const SIM_CYCLE_MS = 14000; // Accelerated 14s loop
    let startTimestamp: number | null = null;

    const step = (ts: number) => {
      if (!startTimestamp) startTimestamp = ts;
      const elapsed = ts - startTimestamp;
      const progress = (elapsed % SIM_CYCLE_MS) / SIM_CYCLE_MS;
      setSimRatio(progress);
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlayingSim]);

  // Handle Mouse Scrubbing
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (x - (PAD_L / VIEW_W) * rect.width) / ((USABLE_W / VIEW_W) * rect.width)));
    setHoverRatio(ratio);
  };

  const handleMouseLeave = () => {
    setHoverRatio(null);
  };

  // Current active cursor ratio (hover overrides simulation)
  const activeRatio = hoverRatio !== null ? hoverRatio : isPlayingSim ? simRatio : null;
  const cursorTimeMs = activeRatio !== null ? Math.round(activeRatio * preset.durationMs) : null;

  const cursorValues = useMemo(() => {
    if (cursorTimeMs === null) return null;
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

  // Min and Max overall limits for summary display
  const minDepthRange = useMemo(() => {
    const mins = preset.waypointsMinDepth.map((w) => w.pos);
    return mins.length > 0 ? Math.min(...mins) : 0;
  }, [preset]);

  const maxDepthRange = useMemo(() => {
    const maxs = preset.waypointsMaxDepth.map((w) => w.pos);
    return maxs.length > 0 ? Math.max(...maxs) : 100;
  }, [preset]);

  const spmRange = useMemo(() => {
    if (!preset.waypointsSpm || preset.waypointsSpm.length === 0) return '–';
    const realSpms = preset.waypointsSpm.map((w) => getPresetRealSpmAtTime(preset, w.time));
    const min = Math.min(...realSpms);
    const max = Math.max(...realSpms);
    return `${min}–${max}`;
  }, [preset]);

  return (
    <div
      className="sensual-glass-interactive glass-optics-edge rounded-2xl p-5 flex flex-col justify-between space-y-4 group relative overflow-hidden"
    >
      {/* HEADER ROW */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-text-dim">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-brand-cyan font-medium">{preset.category}</span>
            <span aria-hidden="true" className="text-border-dim">·</span>
            <span className="text-brand-orchid font-sans font-medium text-[10px]">{getPresetSubcategory(preset, language)}</span>
            <span aria-hidden="true" className="text-border-dim">·</span>
            <span className="text-text-bright font-semibold">{preset.duration}</span>
            {preset.isCustom && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan text-[9px] font-sans font-semibold">
                Eigene
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`font-sans text-[11px] font-medium shrink-0 px-2 py-0.5 rounded-full border ${
                preset.intensity === 'soft'
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : preset.intensity === 'medium'
                  ? 'text-brand-orchid border-brand-orchid/30 bg-brand-orchid/10'
                  : 'text-brand-rose border-brand-rose/30 bg-brand-rose/10'
              }`}
            >
              {preset.intensity === 'soft'
                ? 'Sanft & Sinnlich'
                : preset.intensity === 'medium'
                ? 'Geschmeidig & Dynamisch'
                : 'Kraftvoll & Intensiv'}
            </span>
            {preset.isCustom && onDeleteCustom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCustom(preset.id);
                }}
                className="p-1 rounded-full text-text-dim hover:text-brand-rose hover:bg-brand-rose/10 transition-colors cursor-pointer"
                title="Eigene Vorlage löschen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <h3
          onClick={() => {
            sensoryEngine.playGlassTouch(1.15);
            onOpenDetails(preset);
          }}
          className="text-lg font-semibold text-text-bright font-display group-hover:text-brand-cyan transition-colors leading-snug cursor-pointer flex items-center justify-between gap-1"
          title="Klicken für vollständige Beschreibung & Details"
        >
          <span>{preset.title}</span>
          <Maximize2 className="h-3.5 w-3.5 text-text-dim group-hover:text-brand-cyan opacity-0 group-hover:opacity-100 transition-all shrink-0" />
        </h3>

        {/* Clickable Description Box */}
        <div
          onClick={() => {
            sensoryEngine.playGlassTouch(1.15);
            onOpenDetails(preset);
          }}
          className="cursor-pointer group/desc p-1 -m-1 rounded-lg hover:bg-bg-panel/40 transition-colors"
          title="Klicken für vollständige Beschreibung und Vorlagen-Details"
        >
          <p className="text-xs text-text-dim group-hover/desc:text-text-bright leading-relaxed line-clamp-2 min-h-[34px] transition-colors">
            {preset.desc}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-brand-cyan/80 group-hover/desc:text-brand-cyan font-medium pt-0.5">
            <span>Vollständige Beschreibung &amp; Details anzeigen</span>
            <Maximize2 className="h-2.5 w-2.5 inline" />
          </div>
        </div>
      </div>

      {/* SVG INTERACTIVE PREVIEW - CLICK OPENS FLOATING INSPECTION WINDOW */}
      <div
        onClick={() => {
          sensoryEngine.playGlassTouch(1.2);
          onOpenDetails(preset);
        }}
        className="bg-bg-base/80 hover:bg-bg-base/95 border border-border-dim hover:border-brand-cyan/60 rounded-xl p-2 relative overflow-hidden select-none cursor-pointer group/preview transition-all hover:shadow-[0_0_24px_rgba(0,240,255,0.14)]"
        title="Klicken, um die Vorlage in Großansicht & Detail-Fenster zu inspizieren"
      >
        {/* Floating inspect pill cue on hover */}
        <div className="absolute top-2 right-2 pointer-events-none opacity-0 group-hover/preview:opacity-100 transition-opacity bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-brand-cyan/50 text-[10px] text-brand-cyan font-mono flex items-center gap-1.5 z-20 shadow-lg">
          <Maximize2 className="h-2.5 w-2.5" />
          <span>Vorschau &amp; Details 🔍</span>
        </div>

        {/* Subsection Phase bars along top border */}
        {preset.subsections && preset.subsections.length > 0 && (
          <div className="flex w-full h-1.5 rounded-xs overflow-hidden mb-1 opacity-80 gap-0.5">
            {preset.subsections.map((sub, idx) => {
              const widthPct = Math.max(1, ((sub.endTime - sub.startTime) / preset.durationMs) * 100);
              const color = sub.color || (idx % 2 === 0 ? '#FF55B8' : '#E879F9');
              return (
                <div
                  key={sub.id}
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                  className="h-full"
                  title={`${sub.name} (${formatHHMMSS(sub.startTime)} - ${formatHHMMSS(sub.endTime)})`}
                />
              );
            })}
          </div>
        )}

        {/* SVG Container */}
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full h-24 sm:h-28 block cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={`corridorGrad-${preset.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.10" />
              </linearGradient>
            </defs>

            {/* Grid Guide Lines */}
            <line x1={PAD_L} y1={posToY(0)} x2={VIEW_W - PAD_R} y2={posToY(0)} stroke="var(--border-bright)" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.6" />
            <line x1={PAD_L} y1={posToY(50)} x2={VIEW_W - PAD_R} y2={posToY(50)} stroke="var(--border-bright)" strokeWidth="0.7" strokeDasharray="2 4" opacity="0.4" />
            <line x1={PAD_L} y1={posToY(100)} x2={VIEW_W - PAD_R} y2={posToY(100)} stroke="var(--border-bright)" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.6" />

            {/* Shaded Stroke Corridor (Min Depth to Max Depth) */}
            {showLayers.minMax && corridorPath && (
              <path d={corridorPath} fill={`url(#corridorGrad-${preset.id})`} />
            )}

            {/* Max Depth Line (Vivid Rose/Red) */}
            {showLayers.minMax && maxPath && (
              <path d={maxPath} fill="none" stroke={TRACK_COLORS.maxDepth.hex} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Min Depth Line (Electric Cyan) */}
            {showLayers.minMax && minPath && (
              <path d={minPath} fill="none" stroke={TRACK_COLORS.minDepth.hex} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* SPM Line (Emerald Green) */}
            {showLayers.spm && spmPath && (
              <path d={spmPath} fill="none" stroke={TRACK_COLORS.spm.hex} strokeWidth="1.8" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Hardness Line (Warm Amber Gold) */}
            {showLayers.hardness && hrdPath && (
              <path d={hrdPath} fill="none" stroke={TRACK_COLORS.hardness.hex} strokeWidth="1.6" strokeDasharray="2 2" strokeLinecap="round" opacity="0.95" />
            )}

            {/* Lube Triggers Marker Glyphs */}
            {(preset.lubeTriggers || []).map((trig) => {
              const x = timeToX(trig.time);
              return (
                <g key={trig.id} transform={`translate(${x}, ${VIEW_H - 10})`}>
                  <circle cx="0" cy="0" r="3.5" fill="#00F0FF" opacity="0.9" />
                  <text x="0" y="2.5" fill="#0A0A0E" fontSize="5" fontWeight="bold" textAnchor="middle">
                    {trig.bursts}
                  </text>
                </g>
              );
            })}

            {/* Active Cursor & Playhead Line */}
            {activeRatio !== null && (
              <g>
                <line
                  x1={PAD_L + activeRatio * USABLE_W}
                  y1={PAD_T}
                  x2={PAD_L + activeRatio * USABLE_W}
                  y2={VIEW_H - PAD_B}
                  stroke="#FDF7FA"
                  strokeWidth="1.4"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={PAD_L + activeRatio * USABLE_W}
                  cy={posToY(cursorValues?.max ?? 50)}
                  r="3.5"
                  fill="#F43F5E"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
                <circle
                  cx={PAD_L + activeRatio * USABLE_W}
                  cy={posToY(cursorValues?.min ?? 20)}
                  r="3.5"
                  fill="#00F0FF"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
              </g>
            )}
          </svg>

          {/* Controls overlay: Play Simulation toggle & Expand Inspector */}
          <div className="absolute bottom-1 right-1 flex items-center gap-1 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlayingSim(!isPlayingSim);
              }}
              className={`p-1 rounded text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                isPlayingSim
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-bg-panel/90 text-text-dim hover:text-text-bright border-border-dim hover:border-brand-cyan/40'
              }`}
              title={isPlayingSim ? 'Simulation stoppen' : 'Live-Vorschau simulieren'}
            >
              {isPlayingSim ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 text-brand-cyan" />}
              <span className="hidden sm:inline">{isPlayingSim ? 'Stopp' : 'Demo'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(preset);
              }}
              className="p-1 rounded text-[10px] font-mono bg-bg-panel/90 text-text-dim hover:text-text-bright border border-border-dim hover:border-brand-cyan/40 transition-colors cursor-pointer"
              title="Große Detail-Vorschau & Phasenanalyse"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Live Hover / Scrub values bar */}
        <div className="mt-1 pt-1 border-t border-border-dim/40 flex items-center justify-between text-[9px] font-mono text-text-dim flex-wrap gap-1 min-h-[20px]">
          {cursorValues && cursorTimeMs !== null ? (
            <div className="flex items-center gap-2 text-text-bright w-full justify-between">
              <span className="text-cyan-400 font-bold">{formatHHMMSS(cursorTimeMs)}</span>
              <span className="text-text-dim">
                Hub: <span className="text-cyan-400 font-bold">{formatCm(cursorValues.min)}</span> –{' '}
                <span className="text-rose-400 font-bold">{formatCm(cursorValues.max)}</span>
              </span>
              <span className="text-emerald-400 font-bold">{cursorValues.spm} SPM</span>
              <span className="text-amber-400 font-bold">{cursorValues.hrd}% Härte</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#00F0FF]" /> Min: {formatCm(minDepthRange)}
                </span>
                <span className="flex items-center gap-1 text-rose-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_#F43F5E]" /> Max: {formatCm(maxDepthRange)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">{spmRange} SPM</span>
                {preset.lubeTriggers && preset.lubeTriggers.length > 0 && (
                  <span className="text-cyan-300 flex items-center gap-0.5" title="Gleitmittel Impulse">
                    <Droplets className="h-2.5 w-2.5" />
                    <span>{preset.lubeTriggers.length}x</span>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TELEMETRY STRIP & ACTION BUTTONS */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-dim/40 font-mono text-[10px] text-text-dim">
        <div className="flex items-center gap-3">
          <span>
            BLE: <strong className="text-text-bright">0x02 Pos</strong>
          </span>
          <span className="text-border-bright">·</span>
          <span>
            Rampe: <strong className="text-emerald-400">0x09 ({preset.recommendedSmoothness ?? 5}/10)</strong>
          </span>
          <span className="text-border-bright">·</span>
          <span>
            <strong className="text-brand-cyan">{preset.subsections?.length || 1}</strong> Phasen
          </span>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            sensoryEngine.playTactileClick('primary');
            onLoad(preset.id, false);
          }}
          className="w-full py-2 px-3 bg-bg-base/80 hover:bg-brand-cyan/15 text-text-bright hover:text-brand-cyan font-mono font-bold text-xs uppercase tracking-wider rounded-md border border-border-dim hover:border-brand-cyan/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          id={`load-preset-btn-${preset.id}`}
          title="In den Session-Editor laden"
        >
          <Sliders className="h-3.5 w-3.5 text-brand-cyan" />
          <span>Im Editor öffnen</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sensoryEngine.playTactileClick('primary');
            onLoad(preset.id, true);
          }}
          className="w-full py-2 px-3 bg-brand-cyan/15 hover:bg-brand-cyan text-brand-cyan hover:text-bg-base font-mono font-bold text-xs uppercase tracking-wider rounded-md border border-brand-cyan/40 hover:border-brand-cyan transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
          id={`play-preset-btn-${preset.id}`}
          title="In den Editor laden und sofort abspielen"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Direkt Starten</span>
        </button>
      </div>
    </div>
  );
};

export const PresetCatalogView: React.FC<PresetCatalogViewProps> = ({
  onLoadPreset,
  onBackToStart,
  onBackToEditor,
  formatHHMMSS,
  formatCm,
  language = 'de',
}) => {
  const t = translations[language] || translations.de;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDurationFilter, setActiveDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [activeIntensityFilter, setActiveIntensityFilter] = useState<'all' | 'soft' | 'medium' | 'intense'>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [activeSubcategoryFilter, setActiveSubcategoryFilter] = useState<string>('all');
  const [detailedPreset, setDetailedPreset] = useState<PresetDefinition | null>(null);

  // Layer toggle switches for previews
  const [showLayers, setShowLayers] = useState<{ minMax: boolean; spm: boolean; hardness: boolean }>({
    minMax: true,
    spm: true,
    hardness: true,
  });

  const [onlyCustom, setOnlyCustom] = useState<boolean>(false);
  const [presetList, setPresetList] = useState<PresetDefinition[]>(() => getAllPresets());

  useEffect(() => {
    const refresh = () => setPresetList(getAllPresets());
    window.addEventListener('servok-custom-presets-updated', refresh);
    return () => window.removeEventListener('servok-custom-presets-updated', refresh);
  }, []);

  const handleDeleteCustom = (presetId: string) => {
    deleteCustomPreset(presetId);
    setPresetList(getAllPresets());
  };

  const customCount = useMemo(() => presetList.filter((p) => p.isCustom).length, [presetList]);

  // Geordnete 10 Hauptkategorien
  const categories = useMemo(() => {
    const existing = new Set(presetList.map((p) => p.category));
    return MASTER_CATEGORIES.filter((c) => existing.has(c));
  }, [presetList]);

  const categoryDescriptions: Record<string, string> = {
    'Zart & Sinnlich': 'Sanftes Aufwärmen, zärtliches Verwöhnen, langsame Wellen & geschmeidige Hingabe.',
    'Wellen & Rhythmus': 'Organische Gezeiten, harmonische Sinuskurven, Walzer-, Groove- & Polyrhythmen.',
    'Tease & Edging': 'Neckisches Anheizen, Zonen-Spiel, Stop-and-Go & süße Verzögerung vor dem Gipfel.',
    'Tiefen-Exploration': 'Fokus auf die tiefe Zone (bis 17,0 cm), behutsame Dehnung & tiefe Verankerung.',
    'Flutter & Vibration': 'Feine Kurzhub-Impulse, Schmetterlings-Flattern & hochfrequente Mikropuls-Salven.',
    'Ausdauer & Trance': 'Hypnotische Langzeit-Sessions, gleichmäßiger Flow & ausgedehnte Genuss-Reisen.',
    'Steigerung & Klimax': 'Zielgerichtete Eskalation, mehrstufige Rampen & leidenschaftliches Finale.',
    'Kraftvoll & Intensiv': 'Druckvolle Tiefenschübe, markantes Drehmoment & ausdauernde Hochleistungs-Profile.',
    'Grenzerfahrungen': 'Kompromisslose Intensität an der physischen Leistungs- und Frequenzgrenze.',
    'Spezials & Experimente': 'Kreative Kontrast-Duetts, Herzschlag-Simulationen, Fibonacci-Spiralen & Kuriositäten.',
  };

  // Base filtered presets before applying subcategory filter
  const baseFilteredPresets = useMemo(() => {
    return presetList.filter((p) => {
      if (onlyCustom && !p.isCustom) return false;
      if (activeDurationFilter !== 'all' && p.durationGroup !== activeDurationFilter) return false;
      if (activeIntensityFilter !== 'all' && p.intensity !== activeIntensityFilter) return false;
      if (activeCategoryFilter !== 'all' && p.category !== activeCategoryFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(query);
        const matchDesc = p.desc.toLowerCase().includes(query);
        const matchSpecs = p.specs.toLowerCase().includes(query);
        const matchCat = p.category.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchSpecs && !matchCat) return false;
      }
      return true;
    });
  }, [presetList, onlyCustom, activeDurationFilter, activeIntensityFilter, activeCategoryFilter, searchQuery]);

  // Dynamic subcategories calculation: ONLY subcategories that match current filters with their exact count!
  const subcategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    baseFilteredPresets.forEach((p) => {
      const sub = getPresetSubcategory(p, language);
      counts[sub] = (counts[sub] || 0) + 1;
    });
    return counts;
  }, [baseFilteredPresets, language]);

  const availableSubcategories = useMemo(() => {
    return Object.keys(subcategoryCounts).sort((a, b) => subcategoryCounts[b] - subcategoryCounts[a]);
  }, [subcategoryCounts]);

  // If active subcategory is no longer present in available subcategories, reset to 'all'
  useEffect(() => {
    if (activeSubcategoryFilter !== 'all' && !subcategoryCounts[activeSubcategoryFilter]) {
      setActiveSubcategoryFilter('all');
    }
  }, [activeSubcategoryFilter, subcategoryCounts]);

  // Final filtered presets (applying subcategory if selected)
  const filteredPresets = useMemo(() => {
    if (activeSubcategoryFilter === 'all') return baseFilteredPresets;
    return baseFilteredPresets.filter((p) => getPresetSubcategory(p, language) === activeSubcategoryFilter);
  }, [baseFilteredPresets, activeSubcategoryFilter, language]);

  // Dynamic counts for Categories
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    presetList.forEach((p) => {
      if (onlyCustom && !p.isCustom) return;
      if (activeDurationFilter !== 'all' && p.durationGroup !== activeDurationFilter) return;
      if (activeIntensityFilter !== 'all' && p.intensity !== activeIntensityFilter) return;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (
          !p.title.toLowerCase().includes(query) &&
          !p.desc.toLowerCase().includes(query) &&
          !p.specs.toLowerCase().includes(query) &&
          !p.category.toLowerCase().includes(query)
        )
          return;
      }
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [presetList, onlyCustom, activeDurationFilter, activeIntensityFilter, searchQuery]);

  // Dynamic counts for Duration
  const durationCounts = useMemo(() => {
    const counts = { short: 0, medium: 0, long: 0, total: 0 };
    presetList.forEach((p) => {
      if (onlyCustom && !p.isCustom) return;
      if (activeCategoryFilter !== 'all' && p.category !== activeCategoryFilter) return;
      if (activeIntensityFilter !== 'all' && p.intensity !== activeIntensityFilter) return;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (
          !p.title.toLowerCase().includes(query) &&
          !p.desc.toLowerCase().includes(query) &&
          !p.specs.toLowerCase().includes(query) &&
          !p.category.toLowerCase().includes(query)
        )
          return;
      }
      counts[p.durationGroup] = (counts[p.durationGroup] || 0) + 1;
      counts.total += 1;
    });
    return counts;
  }, [presetList, onlyCustom, activeCategoryFilter, activeIntensityFilter, searchQuery]);

  // Dynamic counts for Intensity
  const intensityCounts = useMemo(() => {
    const counts = { soft: 0, medium: 0, intense: 0, total: 0 };
    presetList.forEach((p) => {
      if (onlyCustom && !p.isCustom) return;
      if (activeCategoryFilter !== 'all' && p.category !== activeCategoryFilter) return;
      if (activeDurationFilter !== 'all' && p.durationGroup !== activeDurationFilter) return;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (
          !p.title.toLowerCase().includes(query) &&
          !p.desc.toLowerCase().includes(query) &&
          !p.specs.toLowerCase().includes(query) &&
          !p.category.toLowerCase().includes(query)
        )
          return;
      }
      counts[p.intensity] = (counts[p.intensity] || 0) + 1;
      counts.total += 1;
    });
    return counts;
  }, [presetList, onlyCustom, activeCategoryFilter, activeDurationFilter, searchQuery]);

  const hasAnyFilter =
    searchQuery.trim() !== '' ||
    activeDurationFilter !== 'all' ||
    activeIntensityFilter !== 'all' ||
    activeCategoryFilter !== 'all' ||
    activeSubcategoryFilter !== 'all' ||
    onlyCustom;

  return (
    <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="preset-catalog-view">
      {/* TOP NAVIGATION BREADCRUMB & HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-dim pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-text-dim">
            <button
              type="button"
              onClick={onBackToStart}
              className="hover:text-brand-cyan transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>{t.backToStartMenu || 'Startmenü'}</span>
            </button>
            <span>/</span>
            <span className="text-brand-cyan font-bold">{t.presetsCatalogTitle || 'Vorlagen-Katalog'}</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display uppercase tracking-wider text-text-bright flex flex-wrap items-center gap-3">
            <Sparkles className="h-6 w-6 text-brand-cyan" />
            <span>{t.presetCatalogHeader || 'Servok Vorlagen-Katalog'}</span>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan font-bold">
              {filteredPresets.length} / {presetList.length} {t.profilesCountLabel || 'Profile'}
            </span>
            {customCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOnlyCustom(!onlyCustom);
                  setActiveSubcategoryFilter('all');
                }}
                className={`text-xs font-sans font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                  onlyCustom
                    ? 'bg-brand-orchid text-bg-base border-brand-orchid'
                    : 'bg-brand-orchid/15 text-brand-orchid border-brand-orchid/40 hover:bg-brand-orchid/25'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>{t.customPresetsTitle || 'Eigene Vorlagen'} ({customCount})</span>
              </button>
            )}
          </h1>

          <p className="text-xs sm:text-sm text-text-dim max-w-3xl leading-relaxed">
            Alle Vorlagen sind exakt auf die Kinematik des Hismith Servok (Hubspanne, reale SPM-Kurve &amp; BLE Register 0x09 Härte-Rampe) abgestimmt.
            Fahre mit der Maus über ein Diagramm zur Live-Inspektion.
          </p>
        </div>

        {/* Back to Editor / Start Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={onBackToStart}
            className="px-3.5 py-2 bg-bg-surface hover:bg-bg-panel text-text-dim hover:text-text-bright border border-border-dim rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.backToStartMenu || 'Startmenü'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToEditor}
            className="px-4 py-2 bg-brand-cyan/15 hover:bg-brand-cyan text-brand-cyan hover:text-bg-base border border-brand-cyan/40 hover:border-brand-cyan rounded-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span>{t.toStudioEditor || 'Zum Studio-Editor'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-bg-surface/90 backdrop-blur-md border border-border-dim rounded-lg p-4 space-y-3.5 shadow-lg">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-text-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveSubcategoryFilter('all');
              }}
              placeholder={t.searchPresetsPlaceholder || 'Vorlagen durchsuchen (z.B. Sanft, Welle, Turbo, Ausdauer)...'}
              className="w-full bg-bg-base border border-border-dim focus:border-brand-cyan text-text-bright text-xs font-mono pl-9 pr-8 py-2 rounded-md outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveSubcategoryFilter('all');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-bright cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Layer Visibility Toggles */}
          <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
            <span className="text-text-dim uppercase font-bold flex items-center gap-1 mr-1">
              <Eye className="h-3 w-3 text-brand-cyan" /> {t.tracksLabel || 'Spuren:'}
            </span>

            <button
              type="button"
              onClick={() => setShowLayers((prev) => ({ ...prev, minMax: !prev.minMax }))}
              className={`px-2.5 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1.5 ${
                showLayers.minMax
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold'
                  : 'bg-bg-base border-border-dim text-text-dim opacity-60'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#00F0FF]" />
              <span>Min/Max Hub</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLayers((prev) => ({ ...prev, spm: !prev.spm }))}
              className={`px-2.5 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1.5 ${
                showLayers.spm
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                  : 'bg-bg-base border-border-dim text-text-dim opacity-60'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10B981]" />
              <span>SPM</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLayers((prev) => ({ ...prev, hardness: !prev.hardness }))}
              className={`px-2.5 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1.5 ${
                showLayers.hardness
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                  : 'bg-bg-base border-border-dim text-text-dim opacity-60'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_#F59E0B]" />
              <span>Härte (0x09)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row: Duration & Intensity */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border-dim/50 text-xs font-mono">
          {/* Duration Segmented Control */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-text-dim text-[11px] mr-1 uppercase font-bold flex items-center gap-1">
              <Clock className="h-3 w-3 text-brand-cyan" /> {t.durationLabel || 'Dauer:'}
            </span>
            <div className="inline-flex bg-bg-base p-0.5 rounded-md border border-border-dim">
              {(['all', 'short', 'medium', 'long'] as const).map((group) => {
                const labels = {
                  all: `${t.allLabel || 'Alle'} (${durationCounts.total})`,
                  short: `${t.shortDurationLabel || 'Kurz <5m'} (${durationCounts.short})`,
                  medium: `${t.mediumDurationLabel || 'Mittel 5–15m'} (${durationCounts.medium})`,
                  long: `${t.longDurationLabel || 'Lang >15m'} (${durationCounts.long})`,
                };
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => {
                      setActiveDurationFilter(group);
                      setActiveSubcategoryFilter('all');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      activeDurationFilter === group
                        ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40'
                        : 'text-text-dim hover:text-text-bright border border-transparent'
                    }`}
                  >
                    {labels[group]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity Segmented Control */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-text-dim text-[11px] mr-1 uppercase font-bold flex items-center gap-1">
              <Gauge className="h-3 w-3 text-brand-cyan" /> {t.characterLabel || 'Charakter:'}
            </span>
            <div className="inline-flex bg-bg-base p-0.5 rounded-full border border-border-dim">
              <button
                type="button"
                onClick={() => {
                  setActiveIntensityFilter('all');
                  setActiveSubcategoryFilter('all');
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeIntensityFilter === 'all'
                    ? 'bg-brand-cyan text-bg-base shadow-xs'
                    : 'text-text-dim hover:text-text-bright'
                }`}
              >
                {t.allLabel || 'Alle'} ({intensityCounts.total})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveIntensityFilter('soft');
                  setActiveSubcategoryFilter('all');
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeIntensityFilter === 'soft'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-text-dim hover:text-emerald-400'
                }`}
              >
                {t.softIntensityLabel || 'Sanft'} ({intensityCounts.soft})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveIntensityFilter('medium');
                  setActiveSubcategoryFilter('all');
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeIntensityFilter === 'medium'
                    ? 'bg-brand-orchid/20 text-brand-orchid border border-brand-orchid/40'
                    : 'text-text-dim hover:text-brand-orchid'
                }`}
              >
                {t.mediumIntensityLabel || 'Geschmeidig'} ({intensityCounts.medium})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveIntensityFilter('intense');
                  setActiveSubcategoryFilter('all');
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeIntensityFilter === 'intense'
                    ? 'bg-brand-rose/20 text-brand-rose border border-brand-rose/40'
                    : 'text-text-dim hover:text-brand-rose'
                }`}
              >
                {t.intenseIntensityLabel || 'Intensiv'} ({intensityCounts.intense})
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Row */}
        <div className="space-y-2 pt-2.5 border-t border-border-dim/50 text-xs font-sans">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-text-dim text-[11px] mr-1 font-semibold flex items-center gap-1 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-brand-cyan" /> {t.categoryLabel || 'Kategorie:'}
            </span>
            <button
              type="button"
              onClick={() => {
                sensoryEngine.playGlassTouch(1.0);
                setActiveCategoryFilter('all');
                setActiveSubcategoryFilter('all');
              }}
              className={`px-3.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                activeCategoryFilter === 'all'
                  ? 'bg-brand-cyan text-bg-base border-brand-cyan shadow-xs'
                  : 'bg-bg-base/80 border-border-dim text-text-dim hover:text-text-bright'
              }`}
            >
              {t.allCategoriesLabel || 'Alle Kategorien'} ({presetList.length})
            </button>
            {categories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    sensoryEngine.playGlassTouch(1.1);
                    setActiveCategoryFilter(cat);
                    setActiveSubcategoryFilter('all');
                  }}
                  title={categoryDescriptions[cat] || cat}
                  className={`px-3.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                    activeCategoryFilter === cat
                      ? 'bg-brand-cyan text-bg-base border-brand-cyan shadow-xs'
                      : count > 0
                      ? 'bg-bg-base/80 border-border-dim text-text-dim hover:text-text-bright'
                      : 'bg-bg-base/40 border-border-dim/50 text-text-dim/40'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
          {activeCategoryFilter !== 'all' && categoryDescriptions[activeCategoryFilter] && (
            <p className="text-xs text-text-dim pl-1 italic">
              {activeCategoryFilter}: {categoryDescriptions[activeCategoryFilter]}
            </p>
          )}
        </div>

        {/* Subcategory Filter Row (Displays ONLY subcategories that match the active filter, with dynamic counts!) */}
        {availableSubcategories.length > 0 && (
          <div className="space-y-1.5 pt-2.5 border-t border-border-dim/50 text-xs font-sans">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-text-dim text-[11px] mr-1 font-semibold flex items-center gap-1 shrink-0">
                <Sliders className="h-3.5 w-3.5 text-brand-orchid" /> {t.subcategoryLabel || 'Unterkategorie:'}
              </span>
              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playGlassTouch(1.0);
                  setActiveSubcategoryFilter('all');
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                  activeSubcategoryFilter === 'all'
                    ? 'bg-brand-orchid text-bg-base border-brand-orchid shadow-xs'
                    : 'bg-bg-base/80 border-border-dim text-text-dim hover:text-text-bright'
                }`}
              >
                {t.allSubcategoriesLabel || 'Alle Unterkategorien'} ({baseFilteredPresets.length})
              </button>
              {availableSubcategories.map((subcat) => {
                const count = subcategoryCounts[subcat] || 0;
                return (
                  <button
                    key={subcat}
                    type="button"
                    onClick={() => {
                      sensoryEngine.playGlassTouch(1.15);
                      setActiveSubcategoryFilter(subcat === activeSubcategoryFilter ? 'all' : subcat);
                    }}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeSubcategoryFilter === subcat
                        ? 'bg-brand-orchid text-bg-base border-brand-orchid shadow-xs font-bold'
                        : 'bg-bg-base/80 border-border-dim text-text-dim hover:text-text-bright hover:border-brand-orchid/50'
                    }`}
                  >
                    <span>{subcat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeSubcategoryFilter === subcat
                          ? 'bg-bg-base/30 text-bg-base font-bold'
                          : 'bg-brand-orchid/15 text-brand-orchid font-semibold'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PRESETS GRID WITH PREVIEW PER CARD */}
      {filteredPresets.length === 0 ? (
        <div className="sensual-glass rounded-2xl p-12 text-center space-y-3 font-sans">
          <Sparkles className="h-8 w-8 text-text-dim mx-auto" />
          <h3 className="text-base font-display font-semibold text-text-bright">{t.noPresetsFound || 'Keine Vorlagen gefunden'}</h3>
          <p className="text-xs text-text-dim">
            {t.noPresetsFoundDesc || 'Für die ausgewählten Filterkriterien wurden keine Vorlagen gefunden.'}
          </p>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveDurationFilter('all');
                setActiveIntensityFilter('all');
                setActiveCategoryFilter('all');
                setActiveSubcategoryFilter('all');
                setOnlyCustom(false);
              }}
              className="px-4 py-1.5 bg-brand-cyan text-bg-base rounded-full text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
            >
              {t.resetFiltersBtn || 'Filter zurücksetzen'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="presets-cards-grid">
          {filteredPresets.map((preset) => (
            <PresetCardPreview
              key={preset.id}
              preset={preset}
              formatHHMMSS={formatHHMMSS}
              formatCm={formatCm}
              onLoad={onLoadPreset}
              onOpenDetails={(p) => setDetailedPreset(p)}
              onDeleteCustom={handleDeleteCustom}
              showLayers={showLayers}
              language={language}
            />
          ))}
        </div>
      )}

      {/* FLOATING WINDOW: FULL DETAILED PREVIEW & INSPECTION */}
      <PresetDetailModal
        preset={detailedPreset}
        onClose={() => setDetailedPreset(null)}
        onLoadPreset={onLoadPreset}
        formatHHMMSS={formatHHMMSS}
        formatCm={formatCm}
        language={language}
      />
    </div>
  );
};
