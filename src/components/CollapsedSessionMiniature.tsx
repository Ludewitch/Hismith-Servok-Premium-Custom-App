import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Play, Square, Repeat, RotateCcw, ChevronDown, Clock, Droplets, Sparkles, Layers, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Waypoint, Subsection, LubeTrigger } from '../types/servok';
import { TRACK_COLORS } from '../constants/trackColors';

interface CollapsedSessionMiniatureProps {
  durationMs: number;
  playbackTime: number;
  isPlaying: boolean;
  loopEnabled: boolean;
  waypointsMinDepth: Waypoint[];
  waypointsMaxDepth: Waypoint[];
  waypointsSpm: Waypoint[];
  waypointsHardness: Waypoint[];
  lubeTriggers: LubeTrigger[];
  subsections: Subsection[];
  formatHHMMSS: (ms: number) => string;
  formatCm: (posPct: number) => string;
  onSeek: (timeMs: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onExpandGraph: () => void;
  onOpenChangeDuration: () => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
}

// Schnelle lineare Interpolation für die Miniatur
const interpolatePts = (pts: Waypoint[], t: number): number => {
  if (!pts || pts.length === 0) return 0;
  if (pts.length === 1) return pts[0].pos;
  if (t <= pts[0].time) return pts[0].pos;
  if (t >= pts[pts.length - 1].time) return pts[pts.length - 1].pos;

  let low = 0;
  let high = pts.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (pts[mid].time === t) return pts[mid].pos;
    if (pts[mid].time < t) {
      if (mid < pts.length - 1 && pts[mid + 1].time >= t) {
        const p1 = pts[mid];
        const p2 = pts[mid + 1];
        const tDiff = p2.time - p1.time;
        if (tDiff === 0) return p1.pos;
        const factor = (t - p1.time) / tDiff;
        return p1.pos + factor * (p2.pos - p1.pos);
      }
      low = mid + 1;
    } else {
      if (mid > 0 && pts[mid - 1].time <= t) {
        const p1 = pts[mid - 1];
        const p2 = pts[mid];
        const tDiff = p2.time - p1.time;
        if (tDiff === 0) return p1.pos;
        const factor = (t - p1.time) / tDiff;
        return p1.pos + factor * (p2.pos - p1.pos);
      }
      high = mid - 1;
    }
  }
  return pts[0].pos;
};

export const CollapsedSessionMiniature: React.FC<CollapsedSessionMiniatureProps> = ({
  durationMs,
  playbackTime,
  isPlaying,
  loopEnabled,
  waypointsMinDepth,
  waypointsMaxDepth,
  waypointsSpm,
  waypointsHardness,
  lubeTriggers,
  subsections,
  formatHHMMSS,
  formatCm,
  onSeek,
  onTogglePlay,
  onToggleLoop,
  onExpandGraph,
  onOpenChangeDuration,
  onPrevChapter,
  onNextChapter,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 110;
  const PAD_TOP = 8;
  const PAD_BOTTOM = 8;
  const PLOT_H = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Zeit zu SVG X Koordinate (0 .. SVG_WIDTH)
  const timeToX = useCallback((t: number) => {
    if (durationMs <= 0) return 0;
    return Math.max(0, Math.min(SVG_WIDTH, (t / durationMs) * SVG_WIDTH));
  }, [durationMs]);

  // Prozent (0 .. 100) zu SVG Y Koordinate (unten = 0%, oben = 100%)
  const posToY = useCallback((pos: number) => {
    const clamped = Math.max(0, Math.min(100, pos));
    return PAD_TOP + PLOT_H - (clamped / 100) * PLOT_H;
  }, [PLOT_H]);

  // Aktuelle interpolierte Werte am Abspielzeitpunkt
  const curMin = useMemo(() => interpolatePts(waypointsMinDepth, playbackTime), [waypointsMinDepth, playbackTime]);
  const curMax = useMemo(() => interpolatePts(waypointsMaxDepth, playbackTime), [waypointsMaxDepth, playbackTime]);
  const curSpm = useMemo(() => interpolatePts(waypointsSpm, playbackTime), [waypointsSpm, playbackTime]);
  const curHrd = useMemo(() => interpolatePts(waypointsHardness, playbackTime), [waypointsHardness, playbackTime]);

  // Hover Werte
  const hoverTime = hoverX !== null && durationMs > 0 ? (hoverX / SVG_WIDTH) * durationMs : null;
  const hoverMin = hoverTime !== null ? interpolatePts(waypointsMinDepth, hoverTime) : 0;
  const hoverMax = hoverTime !== null ? interpolatePts(waypointsMaxDepth, hoverTime) : 0;
  const hoverSpm = hoverTime !== null ? interpolatePts(waypointsSpm, hoverTime) : 0;

  // Interaktives Scrubbing per Klick oder Drag
  const handlePointerAction = useCallback((clientX: number) => {
    if (!svgRef.current || durationMs <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = relX / rect.width;
    const targetMs = Math.round(ratio * durationMs);
    onSeek(targetMs);
  }, [durationMs, onSeek]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    handlePointerAction(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const svgX = (relX / rect.width) * SVG_WIDTH;
    setHoverX(svgX);

    if (isDragging) {
      handlePointerAction(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  // SVG Pfade berechnen
  const minPathD = useMemo(() => {
    if (!waypointsMinDepth || waypointsMinDepth.length === 0) return '';
    return waypointsMinDepth
      .map((w, idx) => `${idx === 0 ? 'M' : 'L'} ${timeToX(w.time).toFixed(1)} ${posToY(w.pos).toFixed(1)}`)
      .join(' ');
  }, [waypointsMinDepth, timeToX, posToY]);

  const maxPathD = useMemo(() => {
    if (!waypointsMaxDepth || waypointsMaxDepth.length === 0) return '';
    return waypointsMaxDepth
      .map((w, idx) => `${idx === 0 ? 'M' : 'L'} ${timeToX(w.time).toFixed(1)} ${posToY(w.pos).toFixed(1)}`)
      .join(' ');
  }, [waypointsMaxDepth, timeToX, posToY]);

  const spmPathD = useMemo(() => {
    if (!waypointsSpm || waypointsSpm.length === 0) return '';
    return waypointsSpm
      .map((w, idx) => `${idx === 0 ? 'M' : 'L'} ${timeToX(w.time).toFixed(1)} ${posToY(w.pos).toFixed(1)}`)
      .join(' ');
  }, [waypointsSpm, timeToX, posToY]);

  const hardnessPathD = useMemo(() => {
    if (!waypointsHardness || waypointsHardness.length === 0) return '';
    return waypointsHardness
      .map((w, idx) => `${idx === 0 ? 'M' : 'L'} ${timeToX(w.time).toFixed(1)} ${posToY(w.pos).toFixed(1)}`)
      .join(' ');
  }, [waypointsHardness, timeToX, posToY]);

  // Korridor Polygon (zwischen Min und Max Kurve)
  const corridorD = useMemo(() => {
    if (waypointsMinDepth.length === 0 || waypointsMaxDepth.length === 0) return '';
    const p1 = waypointsMinDepth.map(w => `${timeToX(w.time).toFixed(1)} ${posToY(w.pos).toFixed(1)}`);
    const p2Rev = [...waypointsMaxDepth].reverse().map(w => `${timeToX(w.time).toFixed(1)} ${posToY(w.pos).toFixed(1)}`);
    return `M ${p1[0]} L ${p1.join(' L ')} L ${p2Rev.join(' L ')} Z`;
  }, [waypointsMinDepth, waypointsMaxDepth, timeToX, posToY]);

  const playheadX = timeToX(playbackTime);
  const currentSub = subsections.find(s => playbackTime >= s.startTime && playbackTime <= s.endTime);

  return (
    <div 
      className="bg-bg-panel/90 border border-brand-cyan/30 hover:border-brand-cyan/50 rounded-sm p-3 shadow-md space-y-2.5 transition-all"
      id="session-collapsed-miniature"
    >
      {/* 1. OBERE STEUERLEISTE DES MINIMIERTE GRAPHEN */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-dim/80 pb-2">
        {/* Linke Seite: Schnell-Playback Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-brand-rose/10 border border-brand-rose/30 rounded-full text-brand-rose text-xs font-sans font-semibold">
            <span className="w-2 h-2 rounded-full bg-brand-rose animate-pulse" />
            <span>Miniaturansicht</span>
          </div>

          {/* Play/Stop Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              isPlaying
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-brand-rose text-bg-base hover:bg-brand-rose/90 shadow-md shadow-rose-950/20 active:scale-95'
            }`}
            title={isPlaying ? 'Wiedergabe pausieren' : 'Wiedergabe starten'}
          >
            {isPlaying ? <Square className="h-3.5 w-3.5 fill-rose-400" /> : <Play className="h-3.5 w-3.5 fill-bg-base" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Reset to 00:00 */}
          <button
            type="button"
            onClick={() => onSeek(0)}
            className="p-1.5 bg-bg-panel hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright rounded-xl cursor-pointer transition-colors"
            title="Zurück zum Start (00:00:00)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {/* Vorheriges Kapitel */}
          {onPrevChapter && (
            <button
              type="button"
              onClick={onPrevChapter}
              className="p-1.5 bg-bg-panel hover:bg-border-bright border border-border-dim text-text-dim hover:text-brand-rose rounded-xl cursor-pointer transition-colors"
              title="Vorheriges Kapitel / Marker"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Nächstes Kapitel */}
          {onNextChapter && (
            <button
              type="button"
              onClick={onNextChapter}
              className="p-1.5 bg-bg-panel hover:bg-border-bright border border-border-dim text-text-dim hover:text-brand-rose rounded-xl cursor-pointer transition-colors"
              title="Nächstes Kapitel / Marker"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Loop Toggle */}
          <button
            type="button"
            onClick={onToggleLoop}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors border ${
              loopEnabled
                ? 'bg-brand-rose/20 text-brand-rose border-brand-rose/40 shadow-sm'
                : 'bg-bg-panel text-text-dim border-border-dim hover:text-text-bright'
            }`}
            title="Wiederholungsschleife umschalten"
          >
            <Repeat className="h-3 w-3" />
            <span>Loop</span>
          </button>

          {/* Live Zeitanzeige */}
          <div className="px-3 py-1 bg-bg-panel border border-border-dim rounded-xl font-mono text-xs font-bold text-brand-rose tracking-wider flex items-center gap-1.5 shadow-inner">
            <span>{formatHHMMSS(playbackTime)}</span>
            <span className="text-text-dim font-normal">/</span>
            <span className="text-text-dim">{formatHHMMSS(durationMs)}</span>
          </div>
        </div>

        {/* Rechte Seite: Dauer nachträglich anpassen & Graph ausklappen */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* NACHTRÄGLICHE DAUER-ÄNDERUNG BUTTON */}
          <button
            type="button"
            onClick={onOpenChangeDuration}
            className="px-3 py-1.5 bg-bg-panel hover:bg-brand-rose/15 border border-border-dim hover:border-brand-rose/50 text-brand-rose text-xs font-medium rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm group active:scale-95"
            title="Klicken um die Gesamtdauer dieser Session nachträglich zu verändern (Skalieren oder Verlängern)"
            id="miniature-change-duration-btn"
          >
            <Clock className="h-3.5 w-3.5 text-brand-rose group-hover:scale-110 transition-transform" />
            <span>Dauer ändern: <span className="font-mono text-text-bright font-bold">{formatHHMMSS(durationMs)}</span></span>
          </button>

          {/* GRAPH VOLLSTÄNDIG AUSKLAPPEN BUTTON */}
          <button
            type="button"
            onClick={onExpandGraph}
            className="px-3.5 py-1.5 bg-brand-rose/15 hover:bg-brand-rose/25 text-brand-rose border border-brand-rose/40 hover:border-brand-rose rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
            title="Vollständigen Kurven-Editor &amp; Diagramm ausklappen"
            id="miniature-expand-graph-btn"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Graph ausklappen</span>
            <ChevronDown className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      </div>

      {/* 2. TEILABSCHNITTE PHASENLEISTE (FALLS VORHANDEN) */}
      {subsections.length > 0 && (
        <div className="relative w-full h-6 bg-bg-panel border border-border-dim rounded-xl overflow-hidden flex select-none shadow-inner">
          {subsections.map((sub, idx) => {
            const leftPct = durationMs > 0 ? (sub.startTime / durationMs) * 100 : 0;
            const widthPct = durationMs > 0 ? ((sub.endTime - sub.startTime) / durationMs) * 100 : 0;
            const isCur = playbackTime >= sub.startTime && playbackTime <= sub.endTime;

            const bgColors = [
              'bg-blue-950/40 border-blue-500/30 text-blue-300',
              'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
              'bg-amber-950/40 border-amber-500/30 text-amber-300',
              'bg-purple-950/40 border-purple-500/30 text-purple-300',
              'bg-rose-950/40 border-rose-500/30 text-rose-300',
              'bg-cyan-950/40 border-cyan-500/30 text-cyan-300',
            ];
            const colorClass = bgColors[idx % bgColors.length];

            return (
              <div
                key={sub.id}
                onClick={() => onSeek(sub.startTime)}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                className={`absolute top-0 bottom-0 border-r text-[9px] font-mono font-bold px-1.5 flex items-center justify-between overflow-hidden cursor-pointer hover:brightness-125 transition-all ${colorClass} ${
                  isCur ? 'ring-1 ring-brand-cyan brightness-125 shadow-inner' : ''
                }`}
                title={`Phase "${sub.name}" (${formatHHMMSS(sub.startTime)} - ${formatHHMMSS(sub.endTime)}) - Klicken zum Anspringen`}
              >
                <span className="truncate">{sub.name}</span>
                <span className="text-[8px] opacity-70 ml-1 shrink-0 hidden sm:inline">{formatHHMMSS(sub.startTime)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. INTERAKTIVE MINIATUR-SVG-SESSION MIT ZEITLINIE */}
      <div 
        className="relative w-full bg-bg-surface border border-border-dim hover:border-brand-rose/40 rounded-2xl overflow-hidden select-none cursor-crosshair group shadow-inner transition-colors"
        onMouseLeave={() => setHoverX(null)}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-24 sm:h-28 block touch-none"
          preserveAspectRatio="none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            {/* Gradient für Hub-Korridor (Rot oben zu Cyan unten) */}
            <linearGradient id="miniCorridorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.08" />
            </linearGradient>

            {/* Gradient für Playhead Glow */}
            <linearGradient id="miniPlayheadGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FCE2EC" stopOpacity="1" />
              <stop offset="50%" stopColor="#FDF7FA" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Horizontale Gitter-Linien (0%, 25%, 50%, 75%, 100%) */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = posToY(pct);
            return (
              <line
                key={`grid-y-${pct}`}
                x1="0"
                y1={y}
                x2={SVG_WIDTH}
                y2={y}
                stroke="var(--border-bright)"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity={pct === 0 || pct === 100 ? 0.65 : 0.35}
              />
            );
          })}

          {/* Vertikale Zeitmarken-Gitterlinien (jeweils 10%) */}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => {
            const x = (p / 100) * SVG_WIDTH;
            return (
              <line
                key={`grid-x-${p}`}
                x1={x}
                y1="0"
                x2={x}
                y2={SVG_HEIGHT}
                stroke="var(--border-bright)"
                strokeWidth="1"
                strokeDasharray="2,4"
                opacity="0.28"
              />
            );
          })}

          {/* HUB-KORRIDOR FLÄCHE (Zwischen Min & Max Kurve) */}
          {corridorD && (
            <path d={corridorD} fill="url(#miniCorridorGrad)" />
          )}

          {/* SPM KURVE (Emerald Green #10B981 gestrichelt) */}
          {spmPathD && (
            <path
              d={spmPathD}
              fill="none"
              stroke={TRACK_COLORS.spm.hex}
              strokeWidth="1.8"
              strokeDasharray="4,3"
              opacity="0.9"
            />
          )}

          {/* HÄRTE KURVE (Warm Amber Gold #F59E0B gepunktet) */}
          {hardnessPathD && (
            <path
              d={hardnessPathD}
              fill="none"
              stroke={TRACK_COLORS.hardness.hex}
              strokeWidth="1.6"
              strokeDasharray="2,3"
              opacity="0.9"
            />
          )}

          {/* MAXIMAL-TIEFE KURVE (Vivid Rose/Red #F43F5E) */}
          {maxPathD && (
            <path
              d={maxPathD}
              fill="none"
              stroke={TRACK_COLORS.maxDepth.hex}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* MINDEST-TIEFE KURVE (Electric Cyan #00F0FF) */}
          {minPathD && (
            <path
              d={minPathD}
              fill="none"
              stroke={TRACK_COLORS.minDepth.hex}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* LUBE TRIGGER PUNKTE (Soft Rose Tropfen-Marker) */}
          {lubeTriggers.map((trig) => {
            const x = timeToX(trig.time);
            return (
              <g key={`lube-mini-${trig.id}`} transform={`translate(${x}, ${PAD_TOP + 4})`}>
                <circle r="4.5" fill="#F29BB4" opacity="0.9" />
                <circle r="2" fill="#FDF7FA" />
              </g>
            );
          })}

          {/* HOVER CURSOR LINIE */}
          {hoverX !== null && (
            <line
              x1={hoverX}
              y1="0"
              x2={hoverX}
              y2={SVG_HEIGHT}
              stroke="#FFFFFF"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.6"
              pointerEvents="none"
            />
          )}

          {/* ABGESPIELTER BEREICH OVERLAY */}
          <rect
            x="0"
            y="0"
            width={playheadX}
            height={SVG_HEIGHT}
            fill="#FB7185"
            fillOpacity="0.05"
            pointerEvents="none"
          />

          {/* PLAYHEAD ZEITLINIE */}
          <g transform={`translate(${playheadX}, 0)`} pointerEvents="none">
            {/* Vertikale Abspiellinie mit Glow */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={SVG_HEIGHT}
              stroke="url(#miniPlayheadGlow)"
              strokeWidth="2.5"
            />
            {/* Oberer Playhead Griff */}
            <polygon
              points="-4,0 4,0 0,6"
              fill="#FB7185"
            />
            {/* Aktueller Punkt auf Maximaltiefe (Rot) */}
            <circle
              cx="0"
              cy={posToY(curMax)}
              r="4.5"
              fill="#F43F5E"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            {/* Aktueller Punkt auf Mindesttiefe (Cyan) */}
            <circle
              cx="0"
              cy={posToY(curMin)}
              r="4.5"
              fill="#00F0FF"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </g>
        </svg>

        {/* Hover Tooltip mit Live-Werten an der Maus */}
        {hoverX !== null && hoverTime !== null && (
          <div 
            className="absolute top-1 pointer-events-none -translate-x-1/2 bg-bg-base/95 border border-cyan-400/50 rounded-full px-3 py-0.5 text-[10px] font-mono text-text-bright font-bold shadow-lg z-20 flex items-center gap-2 whitespace-nowrap"
            style={{ left: `${(hoverX / SVG_WIDTH) * 100}%` }}
          >
            <span>{formatHHMMSS(hoverTime)}</span>
            <span className="text-text-dim">|</span>
            <span className="text-cyan-400">Min: {hoverMin.toFixed(0)}%</span>
            <span className="text-rose-400">Max: {hoverMax.toFixed(0)}%</span>
            <span className="text-emerald-400">{hoverSpm.toFixed(0)} SPM</span>
          </div>
        )}

        {/* Legenden-Hinweis in der Miniatur-Ecke */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-2 text-[9px] font-mono text-text-dim bg-bg-base/85 px-2.5 py-0.5 rounded-full border border-border-dim/80 pointer-events-none shadow-sm">
          <span className="flex items-center gap-1 text-cyan-300 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#00F0FF]" />Min</span>
          <span className="flex items-center gap-1 text-rose-300 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_#F43F5E]" />Max</span>
          <span className="flex items-center gap-1 text-emerald-300 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10B981]" />SPM</span>
          <span className="flex items-center gap-1 text-amber-300 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_#F59E0B]" />Härte</span>
          {lubeTriggers.length > 0 && (
            <span className="flex items-center gap-1 text-sky-400"><Droplets className="h-2.5 w-2.5" />{lubeTriggers.length}</span>
          )}
        </div>
      </div>

      {/* 4. ZEITACHSEN-SKALA (TIMELINE RULER UNTER DEM GRAPH) */}
      <div className="flex items-center justify-between text-[11px] font-mono text-text-dim px-1 font-medium">
        <span>00:00:00</span>
        <span>{formatHHMMSS(durationMs * 0.25)}</span>
        <span className="text-text-bright font-semibold">{formatHHMMSS(durationMs * 0.5)} (50%)</span>
        <span>{formatHHMMSS(durationMs * 0.75)}</span>
        <span className="text-brand-rose font-bold">{formatHHMMSS(durationMs)}</span>
      </div>

      {/* 5. LIVE TELEMETRIE STATUS & EXPAND CALL TO ACTION */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-dim/60 text-xs">
        <div className="flex items-center gap-3.5 text-text-dim flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-sans font-medium text-text-dim">Aktueller Hub:</span>
            <span className="font-mono font-bold">
              <span className="text-cyan-400">{formatCm(curMin)}</span>
              <span className="text-text-dim mx-1">–</span>
              <span className="text-rose-400">{formatCm(curMax)}</span>
            </span>
            <span className="text-[11px] text-text-dim font-mono">({Math.round(Math.abs(curMax - curMin))}% Spanne)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-sans font-medium text-text-dim">Kadenz:</span>
            <span className="text-emerald-400 font-mono font-bold">{Math.round(curSpm)} SPM</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-sans font-medium text-text-dim">Härte:</span>
            <span className="text-amber-400 font-mono font-bold">{Math.round(curHrd)}%</span>
          </div>

          {currentSub && (
            <div className="flex items-center gap-1.5 text-brand-rose bg-brand-rose/10 border border-brand-rose/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <span>Phase: {currentSub.name}</span>
            </div>
          )}
        </div>

        <div 
          onClick={onExpandGraph}
          className="text-xs text-brand-rose hover:text-brand-blush hover:underline cursor-pointer flex items-center gap-1.5 font-medium transition-colors"
        >
          <span>Klicken um vollständigen Editor anzuzeigen</span>
          <ChevronDown className="h-3.5 w-3.5 rotate-180" />
        </div>
      </div>
    </div>
  );
};
