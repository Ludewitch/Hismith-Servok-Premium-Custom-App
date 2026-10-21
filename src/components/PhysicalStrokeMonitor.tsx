import React, { useEffect, useRef } from 'react';
import { Cpu, Gauge, ShieldCheck, Activity, Zap, Flame } from 'lucide-react';
import { ControlMode } from '../types/servok';
import { Language, tr } from '../i18n/translations';

interface PhysicalStrokeMonitorProps {
  currentPosPercent: number;
  minDepthPercent: number;
  maxDepthPercent: number;
  spm: number;
  smoothnessPercent?: number;
  isConnected: boolean;
  isPlaying: boolean;
  controlMode: ControlMode;
  language?: Language;
}

interface KineticParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: 'cyan' | 'uv' | 'crimson';
}

export const PhysicalStrokeMonitor: React.FC<PhysicalStrokeMonitorProps> = ({
  currentPosPercent,
  minDepthPercent,
  maxDepthPercent,
  spm,
  smoothnessPercent = 50,
  isConnected,
  isPlaying,
  language = 'de',
}) => {
  // Hismith Servok Premium H2 Physical Spec: 17 mm to 170 mm
  const MIN_PHYSICAL_MM = 17;
  const MAX_PHYSICAL_MM = 170;
  const STROKE_RANGE_MM = MAX_PHYSICAL_MM - MIN_PHYSICAL_MM; // 153 mm

  const toMm = (pct: number) => Math.round(MIN_PHYSICAL_MM + (pct / 100) * STROKE_RANGE_MM);

  const currentMm = toMm(currentPosPercent);
  const minMm = toMm(minDepthPercent);
  const maxMm = toMm(maxDepthPercent);
  const activeStrokeLengthMm = Math.max(0, maxMm - minMm);

  const velocityMmPerSec = isPlaying
    ? Math.round((activeStrokeLengthMm * 2 * spm) / 60)
    : 0;

  // Refs for 60-120fps Canvas Silk-Wave Oscilloscope & Particle Engine
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telemetryRef = useRef({
    pos: currentPosPercent,
    min: minDepthPercent,
    max: maxDepthPercent,
    spm,
    smoothness: smoothnessPercent,
    isPlaying,
    isConnected,
    velocity: velocityMmPerSec,
  });

  useEffect(() => {
    telemetryRef.current = {
      pos: currentPosPercent,
      min: minDepthPercent,
      max: maxDepthPercent,
      spm,
      smoothness: smoothnessPercent,
      isPlaying,
      isConnected,
      velocity: velocityMmPerSec,
    };
  }, [currentPosPercent, minDepthPercent, maxDepthPercent, spm, smoothnessPercent, isPlaying, isConnected, velocityMmPerSec]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const trailHistory: Array<{ pos: number; min: number; max: number; spm: number }> = [];
    const MAX_TRAIL = 180;

    const particles: KineticParticle[] = Array.from({ length: 30 }, () => ({
      x: Math.random() * 600,
      y: Math.random() * 140,
      vx: (Math.random() - 0.5) * 1.1,
      vy: (Math.random() - 0.5) * 0.7,
      size: Math.random() * 2 + 0.8,
      alpha: Math.random() * 0.5 + 0.15,
      hue: Math.random() > 0.6 ? 'uv' : Math.random() > 0.2 ? 'cyan' : 'crimson',
    }));

    let phase = 0;

    const render = () => {
      const { pos, min, max, spm: curSpm, isPlaying: playing } = telemetryRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
          canvas.width = Math.floor(rect.width * dpr);
          canvas.height = Math.floor(rect.height * dpr);
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      const styles = getComputedStyle(document.documentElement);
      const brandPrimary = styles.getPropertyValue('--brand-cyan').trim() || '#e8a4b8';
      const brandSecondary = styles.getPropertyValue('--brand-orchid').trim() || '#c89fd9';
      const brandAccent = styles.getPropertyValue('--brand-rose').trim() || '#e07a96';
      const bgBase = styles.getPropertyValue('--bg-base').trim() || '#120d14';

      // Push current sample into silk trail buffer
      trailHistory.push({ pos, min, max, spm: curSpm });
      if (trailHistory.length > MAX_TRAIL) {
        trailHistory.shift();
      }

      const spmIntensity = Math.min(1, curSpm / 240);
      phase += 0.025 + spmIntensity * 0.15;

      // Clear background cleanly with theme base color
      ctx.fillStyle = bgBase;
      ctx.fillRect(0, 0, w, h);

      // Subtle precision telemetry grid
      ctx.strokeStyle = 'rgba(160, 150, 165, 0.12)';
      ctx.lineWidth = 1;
      const rows = 4;
      for (let i = 1; i < rows; i++) {
        const y = (h / rows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Active Stroke Corridor (Min to Max Depth Corridor)
      const topY = h - (max / 100) * (h - 24 * dpr) - 12 * dpr;
      const botY = h - (min / 100) * (h - 24 * dpr) - 12 * dpr;
      ctx.save();
      ctx.globalAlpha = 0.14 + spmIntensity * 0.12;
      const corridorGrad = ctx.createLinearGradient(0, topY, 0, botY);
      corridorGrad.addColorStop(0, brandSecondary);
      corridorGrad.addColorStop(0.5, brandPrimary);
      corridorGrad.addColorStop(1, brandAccent);
      ctx.fillStyle = corridorGrad;
      ctx.fillRect(0, topY, w, Math.max(2, botY - topY));
      ctx.restore();

      // Dynamic Particles deformed by SPM frequency
      particles.forEach((pt) => {
        const speedBoost = playing ? 1 + spmIntensity * 4.5 : 0.35;
        pt.x -= Math.abs(pt.vx) * speedBoost * dpr * 1.3;
        pt.y += Math.sin(phase + pt.x * 0.02) * spmIntensity * 1.6 * dpr + pt.vy * 0.3;

        if (pt.x < 0) {
          pt.x = w;
          pt.y = topY + Math.random() * Math.max(16, botY - topY);
        }
        if (pt.y < 4) pt.y = h - 4;
        if (pt.y > h - 4) pt.y = 4;

        ctx.save();
        ctx.globalAlpha = pt.alpha * (0.4 + spmIntensity * 0.5);
        ctx.fillStyle =
          pt.hue === 'cyan' ? brandPrimary : pt.hue === 'uv' ? brandSecondary : brandAccent;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * dpr * (1 + spmIntensity * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Silk Wave Trail
      if (trailHistory.length > 2) {
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < trailHistory.length; i++) {
          const sample = trailHistory[i];
          const x = (i / (MAX_TRAIL - 1)) * (w - 32 * dpr) + 12 * dpr;
          const harmonicRipple = playing
            ? Math.sin(phase * 2.2 + i * 0.22) * (spmIntensity * 1.8 * dpr)
            : 0;
          const y = h - (sample.pos / 100) * (h - 24 * dpr) - 12 * dpr + harmonicRipple;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const waveGrad = ctx.createLinearGradient(0, 0, w, 0);
        waveGrad.addColorStop(0, brandSecondary);
        waveGrad.addColorStop(0.55, brandPrimary);
        waveGrad.addColorStop(1, curSpm > 170 ? brandAccent : brandPrimary);

        ctx.strokeStyle = waveGrad;
        ctx.lineWidth = (2.2 + spmIntensity * 1.4) * dpr;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = brandPrimary;
        ctx.shadowBlur = (8 + spmIntensity * 12) * dpr;
        ctx.stroke();
        ctx.restore();

        // Draw Live Piston Head Pearl at the tip of the wave
        const lastSample = trailHistory[trailHistory.length - 1];
        const tipX = ((trailHistory.length - 1) / (MAX_TRAIL - 1)) * (w - 32 * dpr) + 12 * dpr;
        const tipY = h - (lastSample.pos / 100) * (h - 24 * dpr) - 12 * dpr;

        ctx.save();
        ctx.beginPath();
        ctx.arc(tipX, tipY, (4.5 + spmIntensity * 2.5) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = brandPrimary;
        ctx.shadowColor = brandPrimary;
        ctx.shadowBlur = 14 * dpr;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="sensual-glass glass-optics-edge rounded-2xl p-4 relative overflow-hidden">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border-dim">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-brand-cyan/15 border border-brand-cyan/35">
            <Cpu className="w-3.5 h-3.5 text-brand-cyan" />
            {isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
            )}
          </div>
          <div>
            <span className="text-sm font-display font-semibold tracking-wide text-text-bright block leading-tight">
              {tr(
                language,
                'Sinnliche Aktuator-Telemetrie · 17–170 mm',
                'Sensual Actuator Telemetry · 17–170 mm',
                'Telemetría Sensual del Actuador · 17–170 mm'
              )}
            </span>
            <span className="text-[10px] font-mono text-text-dim">
              {tr(
                language,
                'Echtzeit-Seidenwelle & Physische Hub-Darstellung',
                'Real-Time Silk Wave & Servo Mechanics',
                'Onda de Seda en Tiempo Real y Mecánica del Servo'
              )}
            </span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-semibold border ${
              isConnected
                ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40'
                : 'bg-brand-orchid/15 text-brand-orchid border-brand-orchid/35'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            {isConnected
              ? tr(language, 'Servok Verbunden', 'Servok Connected', 'Servok Conectado')
              : tr(language, 'Virtuelle Simulation', 'Virtual Simulation', 'Simulación Virtual')}
          </div>
        </div>
      </div>

      {/* Dual Telemetry Core: 1) Physical Linear Piston Gauge + 2) Real-Time Silk Wave Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 mb-3.5 items-stretch">
        {/* Left 7 Cols: Linear Rail (17mm - 170mm) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-bg-base/75 border border-border-dim rounded-2xl p-3.5 relative overflow-hidden">
          <div className="flex justify-between items-center text-[10px] font-mono text-text-dim mb-2">
            <span>
              {tr(language, 'Eingefahren (17 mm)', 'Retracted (17 mm)', 'Retraído (17 mm)')}
            </span>
            <span className="text-brand-cyan font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-brand-cyan" />
              {tr(language, 'Aktiver Hub', 'Active Span', 'Carrera Activa')}: {activeStrokeLengthMm} mm (
              {Math.round(maxDepthPercent - minDepthPercent)}%)
            </span>
            <span>
              {tr(language, 'Ausgefahren (170 mm)', 'Extended (170 mm)', 'Extendido (170 mm)')}
            </span>
          </div>

          {/* Mechanical Piston Chamber */}
          <div className="relative h-14 bg-bg-surface/90 border border-border-dim rounded-xl overflow-hidden shadow-inner">
            {/* Millimeter Ruler Ticks */}
            <div className="absolute inset-0 flex justify-between items-end px-2.5 pointer-events-none">
              {Array.from({ length: 19 }).map((_, i) => {
                const pct = (i / 18) * 100;
                const mmVal = toMm(pct);
                const isMajor = i % 3 === 0;
                return (
                  <div key={i} className="flex flex-col items-center">
                    {isMajor && (
                      <span className="text-[8px] font-mono text-text-dim mb-0.5 select-none">
                        {mmVal}
                      </span>
                    )}
                    <div className={`w-px ${isMajor ? 'h-3 bg-border-bright' : 'h-1.5 bg-border-dim'}`} />
                  </div>
                );
              })}
            </div>

            {/* Active Stroke Span Window (MinDepth -> MaxDepth) */}
            <div
              className="absolute top-1.5 bottom-1.5 border-x-2 border-brand-cyan/75 rounded-md transition-all duration-75 bg-brand-cyan/15"
              style={{
                left: `${minDepthPercent}%`,
                width: `${Math.max(1, maxDepthPercent - minDepthPercent)}%`,
              }}
            >
              <div className="absolute -top-0.5 left-1 text-[8px] font-mono text-brand-cyan font-semibold">
                Min {minMm}mm
              </div>
              <div className="absolute -top-0.5 right-1 text-[8px] font-mono text-brand-rose font-semibold">
                Max {maxMm}mm
              </div>
            </div>

            {/* Smooth Brushed Actuator Rod */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-3 rounded-r-full transition-all duration-[35ms] ease-linear bg-gradient-to-r from-brand-orchid/50 to-brand-cyan/80"
              style={{
                width: `${currentPosPercent}%`,
              }}
            />

            {/* Glowing Piston Head Effector */}
            <div
              className="absolute top-1.5 bottom-1.5 w-3.5 -ml-1.5 rounded-full flex items-center justify-center transition-all duration-[35ms] ease-linear z-10 bg-brand-cyan shadow-md"
              style={{
                left: `${currentPosPercent}%`,
              }}
            >
              <div className="w-1 h-5 bg-bg-base rounded-full" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-text-dim">
            <span>
              {tr(language, 'Position:', 'Position:', 'Posición:')} <strong className="text-text-bright">{currentMm} mm</strong> ({Math.round(currentPosPercent)}%)
            </span>
            <span>
              {tr(language, 'Sanftheit (0x09):', 'Softness (0x09):', 'Suavidad (0x09):')} <strong className="text-brand-orchid">{Math.round(smoothnessPercent)}%</strong>
            </span>
          </div>
        </div>

        {/* Right 5 Cols: Real-Time Silk Wave Visualizer Canvas */}
        <div className="lg:col-span-5 bg-bg-base/75 border border-border-dim rounded-2xl p-2.5 flex flex-col justify-between relative overflow-hidden min-h-[115px]">
          <div className="flex items-center justify-between px-1.5 pt-0.5 z-10">
            <span className="text-[10px] font-mono text-brand-cyan flex items-center gap-1 font-semibold">
              <Activity className="w-3 h-3" />
              {tr(language, 'Echtzeit-Seidenkurve', 'Live Silk Wave Trace', 'Curva de Seda en Vivo')}
            </span>
            <span className="text-[10px] font-mono text-text-dim tabular-nums">
              {spm} SPM · {velocityMmPerSec} mm/s
            </span>
          </div>
          <canvas
            ref={canvasRef}
            className="w-full h-24 rounded-xl block mt-1"
          />
        </div>
      </div>

      {/* Bottom 4 Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-bg-base/65 border border-border-dim rounded-xl p-2.5 flex flex-col">
          <span className="text-[10px] font-mono text-text-dim">
            {tr(language, 'Aktuelle Position', 'Live Position', 'Posición Actual')}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-mono font-bold text-brand-cyan tabular-nums">
              {currentMm} mm
            </span>
            <span className="text-[10px] font-mono text-text-dim tabular-nums">
              ({Math.round(currentPosPercent)}%)
            </span>
          </div>
        </div>

        <div className="bg-bg-base/65 border border-border-dim rounded-xl p-2.5 flex flex-col">
          <span className="text-[10px] font-mono text-text-dim">
            {tr(language, 'Hub-Korridor', 'Depth Corridor', 'Corredor de Carrera')}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-mono font-bold text-text-bright tabular-nums">
              {minMm}–{maxMm} mm
            </span>
            <span className="text-[10px] font-mono text-brand-orchid tabular-nums">
              Δ {activeStrokeLengthMm}mm
            </span>
          </div>
        </div>

        <div className="bg-bg-base/65 border border-border-dim rounded-xl p-2.5 flex flex-col">
          <span className="text-[10px] font-mono text-text-dim flex items-center gap-1">
            <Flame className="w-3 h-3 text-brand-rose" />
            {tr(language, 'Taktrate / SPM', 'Cadence / SPM', 'Cadencia / SPM')}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-mono font-bold text-emerald-400 tabular-nums">
              {spm}
            </span>
            <span className="text-[10px] font-mono text-text-dim">
              {tr(language, 'Hübe/Min', 'strokes/min', 'carreras/min')}
            </span>
          </div>
        </div>

        <div className="bg-bg-base/65 border border-border-dim rounded-xl p-2.5 flex flex-col">
          <span className="text-[10px] font-mono text-text-dim flex items-center gap-1">
            <Gauge className="w-3 h-3 text-brand-cyan" />
            {tr(language, 'Geschwindigkeit', 'Piston Velocity', 'Velocidad')}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-mono font-bold text-brand-gold tabular-nums">
              {velocityMmPerSec}
            </span>
            <span className="text-[10px] font-mono text-text-dim">mm/s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
