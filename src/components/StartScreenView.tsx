import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Sparkles,
  Sliders,
  ChevronDown,
  Upload,
  FolderOpen,
  Settings,
  HelpCircle,
  Bluetooth,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { Language, translations, tr } from '../i18n/translations';
import { PresetId, PresetDefinition } from '../types/servok';
import { getAllPresets } from '../data/presets';
import {
  ThemeLuminance,
  ThemeTemperature,
} from './SensualSilkShader';
import { sensoryEngine } from '../services/sensoryEngine';

interface StartScreenViewProps {
  onSelectManual: () => void;
  onOpenPresets: () => void;
  onOpenPadPlayer: () => void;
  onSessionFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectLoadModal?: () => void;
  onLoadPreset?: (presetType: PresetId) => void;
  onOpenHelp?: () => void;
  onOpenSettings?: () => void;
  language?: Language;
  luminance?: ThemeLuminance;
  temperature?: ThemeTemperature;
  onChangeLuminance?: (lum: ThemeLuminance) => void;
  onChangeTemperature?: (temp: ThemeTemperature) => void;
  isConnected?: boolean;
  onConnectBle?: () => void;
  bleStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
}

/**
 * Interactive 2D Tactile Pad Micro-Visualizer
 * Renders an animated coordinate crosshair with kinetic ripples that react to mouse hover.
 */
const PadMicroVisualizer: React.FC<{ isHovered: boolean }> = ({ isHovered }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRef = useRef(isHovered);
  hoverRef.current = isHovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.035;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Subtle coordinate grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();

      // Expanding ripples
      const rippleCount = 3;
      for (let i = 0; i < rippleCount; i++) {
        const speed = hoverRef.current ? 1.4 : 0.8;
        const progress = ((t * speed + i * 1.5) % 4.5) / 4.5;
        const radius = progress * (w * 0.46);
        const alpha = Math.sin(progress * Math.PI) * (hoverRef.current ? 0.35 : 0.18);

        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.lineWidth = hoverRef.current ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Orbital pulsing touch point
      const orbitRadius = hoverRef.current ? 18 : 12;
      const px = cx + Math.cos(t * 1.2) * orbitRadius;
      const py = cy + Math.sin(t * 0.9) * orbitRadius * 0.65;

      // Glow behind cursor point
      const glow = ctx.createRadialGradient(px, py, 0, px, py, 16);
      glow.addColorStop(0, 'rgba(0, 240, 255, 0.6)');
      glow.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();

      // Center core
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={110}
      className="w-full h-24 rounded-2xl pointer-events-none opacity-90 transition-opacity"
    />
  );
};

/**
 * Harmonic Multi-Wave Micro-Visualizer
 * Renders undulating silk waves representing calibrated motion profiles.
 */
const HarmonicWaveVisualizer: React.FC<{ isHovered: boolean }> = ({ isHovered }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRef = useRef(isHovered);
  hoverRef.current = isHovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += hoverRef.current ? 0.045 : 0.022;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cy = h / 2;

      // Draw two harmonic oscillating waves
      const waves = [
        { freq: 0.035, amp: hoverRef.current ? 24 : 18, color: 'rgba(183, 132, 247, 0.7)', phase: 0 },
        { freq: 0.022, amp: hoverRef.current ? 16 : 12, color: 'rgba(232, 149, 165, 0.45)', phase: Math.PI / 2 },
      ];

      waves.forEach((wave) => {
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = hoverRef.current ? 2 : 1.4;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const y = cy + Math.sin(x * wave.freq + t + wave.phase) * wave.amp * Math.sin((x / w) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={110}
      className="w-full h-24 rounded-2xl pointer-events-none opacity-90 transition-opacity"
    />
  );
};

/**
 * 4-Track Sequencer Timeline Micro-Visualizer
 * Renders miniature multi-track envelopes with scanning playhead.
 */
const SequencerMicroVisualizer: React.FC<{ isHovered: boolean }> = ({ isHovered }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRef = useRef(isHovered);
  hoverRef.current = isHovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += hoverRef.current ? 0.04 : 0.02;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 4 lanes matching canonical TRACK_COLORS (Cyan, Rose/Red, Emerald, Amber)
      const lanes = [
        { y: h * 0.22, color: 'rgba(0, 240, 255, 0.85)', speed: 1.0 },
        { y: h * 0.45, color: 'rgba(244, 63, 94, 0.85)', speed: 1.3 },
        { y: h * 0.68, color: 'rgba(16, 185, 129, 0.85)', speed: 0.8 },
        { y: h * 0.88, color: 'rgba(245, 158, 11, 0.85)', speed: 1.1 },
      ];

      lanes.forEach((lane) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, lane.y);
        ctx.lineTo(w, lane.y);
        ctx.stroke();

        ctx.strokeStyle = lane.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const val = Math.sin(x * 0.04 * lane.speed + t) * (h * 0.09);
          const y = lane.y + val;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Scanning playhead
      const playheadX = ((t * 28) % w);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={110}
      className="w-full h-24 rounded-2xl pointer-events-none opacity-90 transition-opacity"
    />
  );
};

export const StartScreenView: React.FC<StartScreenViewProps> = ({
  onSelectManual,
  onOpenPresets,
  onOpenPadPlayer,
  onSessionFileUpload,
  onSelectLoadModal,
  onOpenHelp,
  onOpenSettings,
  language = 'de',
  isConnected = false,
  onConnectBle,
  bleStatus = 'disconnected',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language] || translations.de;

  const [presetList, setPresetList] = useState<PresetDefinition[]>(() => getAllPresets());
  const [showToolsSubmenu, setShowToolsSubmenu] = useState<boolean>(false);
  const [hoveredCard, setHoveredCard] = useState<'pad' | 'presets' | 'studio' | null>(null);

  useEffect(() => {
    const refresh = () => setPresetList(getAllPresets());
    window.addEventListener('servok-custom-presets-updated', refresh);
    return () => window.removeEventListener('servok-custom-presets-updated', refresh);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSessionFileUpload) {
      onSessionFileUpload(e);
    }
  };

  const isBleActive = isConnected || bleStatus === 'connected';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 relative z-10 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,.csv,.fun,.funscript"
        className="hidden"
      />

      {/* =========================================================================
       * HERO SECTION: OBSIDIAN KINETIC LUXURY CENTERPIECE
       * Focused typography, generative refraction, zero pill button clutter.
       * ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative sensual-glass glass-optics-edge rounded-3xl p-8 sm:p-12 overflow-hidden"
      >
        {/* Generative Fluid Refraction Wave Sculpture Artwork */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
          viewBox="0 0 1200 380"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="startHeroWaveCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--brand-cyan)" stopOpacity="0.5" />
              <stop offset="60%" stopColor="var(--brand-orchid)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="startHeroWaveRose" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--brand-rose)" stopOpacity="0.4" />
              <stop offset="50%" stopColor="var(--brand-cyan)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="startAmbientLight" cx="50%" cy="30%" r="55%">
              <stop offset="0%" stopColor="var(--brand-cyan)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="380" fill="url(#startAmbientLight)" />
          <path
            d="M-40,290 C240,160 480,380 780,210 C980,100 1110,240 1240,150 L1240,400 L-40,400 Z"
            fill="url(#startHeroWaveCyan)"
          />
          <path
            d="M-20,200 C280,340 580,100 890,250 C1050,330 1140,170 1240,210 L1240,400 L-20,400 Z"
            fill="url(#startHeroWaveRose)"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
          {/* Subtle hardware kicker */}
          <div className="text-[11px] font-mono tracking-widest uppercase text-text-dim flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-xs" />
            <span>Hismith Servok Premium Studio</span>
            <span className="text-border-bright">/</span>
            <span>Web Bluetooth GATT</span>
          </div>

          {/* Master Headline */}
          <h1 className="text-3xl sm:text-5xl font-semibold font-display tracking-tight text-text-bright leading-tight text-balance">
            {tr(
              language,
              'Sinnliche Bewegung & Taktile Harmonie',
              'Sensual Motion & Tactile Harmony',
              'Movimiento Sensual y Armonía Táctil'
            )}
          </h1>

          {/* Editorial Subtitle */}
          <p className="text-sm sm:text-base text-text-dim leading-relaxed max-w-2xl text-balance">
            {tr(
              language,
              `Präzisions-Hardware-Steuerung mit intuitivem 2D-Gestenflow, ${presetList.length} kalibrierten Bewegungsprofilen und professionellem 4-Spur-Sequenzer.`,
              `Precision hardware control with intuitive 2D gesture flow, ${presetList.length} calibrated motion profiles, and a high-resolution 4-track sequencer.`,
              `Control de hardware de precisión con flujo de gestos 2D intuitivo, ${presetList.length} perfiles calibrados y secuenciador de 4 pistas.`
            )}
          </p>

          {/* Unboxed Hardware Telemetry Row */}
          <div className="pt-2 flex items-center justify-center gap-3 text-xs text-text-dim flex-wrap font-mono">
            <span>17–170 mm {tr(language, 'Hub', 'Stroke', 'Carrera')}</span>
            <span className="text-border-bright" aria-hidden="true">·</span>
            <span>0–240 SPM</span>
            <span className="text-border-bright" aria-hidden="true">·</span>
            <span>{tr(language, 'Sanftheit 0x09', 'Smoothness 0x09', 'Suavidad 0x09')}</span>
            <span className="text-border-bright" aria-hidden="true">·</span>
            <span className="text-brand-cyan">{presetList.length} {tr(language, 'Vorlagen', 'Presets', 'Plantillas')}</span>
          </div>
        </div>
      </motion.div>

      {/* =========================================================================
       * THE 3 DYNAMIC PRIMARY EXPERIENCE CONSOLES (MINIMALIST BUTTON COUNT)
       * Whole card is the interactive tactile trigger, zero redundant buttons.
       * ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* CONSOLE 01: EINHAND-PAD FLOW */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          onMouseEnter={() => setHoveredCard('pad')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => {
            sensoryEngine.playTactileClick('primary');
            sensoryEngine.hapticPresetSwitch();
            onOpenPadPlayer();
          }}
          className="group sensual-glass-interactive glass-optics-edge p-6 sm:p-7 rounded-3xl cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              sensoryEngine.playTactileClick('primary');
              onOpenPadPlayer();
            }
          }}
          id="mode-card-pad-player"
          aria-label={tr(language, 'Einhand-Pad starten', 'Launch One-Handed Pad', 'Iniciar Pad Monomanual')}
        >
          <div className="space-y-4">
            {/* Header: Micro-index & Icon */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-brand-cyan uppercase">
                {tr(language, '01 / Gesten-Flow', '01 / Gesture Flow', '01 / Flujo de Gestos')}
              </span>
              <div className="w-10 h-10 rounded-2xl bg-brand-cyan/15 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all">
                <Compass className="h-5 w-5" />
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="font-display font-semibold text-2xl text-text-bright group-hover:text-brand-cyan transition-colors flex items-center justify-between">
                <span>{tr(language, 'Einhand-Pad', 'One-Handed Pad', 'Pad Monomanual')}</span>
                <ArrowUpRight className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-brand-cyan" />
              </h2>
              <p className="text-xs sm:text-sm text-text-dim leading-relaxed mt-2">
                {tr(
                  language,
                  'Geschmeidiges 2D-Glas-Touchpad zur blinden Steuerung von Tiefe, Tempo und fließenden Wellen mit einer Hand.',
                  'Intuitive 2D touch surface for blind simultaneous control of depth & tempo with organic wave modulation.',
                  'Superficie táctil 2D intuitiva para control simultáneo de profundidad y tempo con modulación orgánica de ondas.'
                )}
              </p>
            </div>

            {/* Kinetic Micro-Canvas */}
            <div className="pt-2 border-t border-border-dim/60">
              <PadMicroVisualizer isHovered={hoveredCard === 'pad'} />
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-4 border-t border-border-dim/60 text-xs text-text-dim">
            <span className="font-mono text-brand-cyan">{tr(language, '2D X/Y Koordinate', '2D X/Y Coordinates', 'Coordenadas 2D X/Y')}</span>
            <span>{tr(language, 'Live Haptik & Wellen', 'Live Haptics & Waves', 'Háptica y Ondas en Vivo')}</span>
          </div>
        </motion.div>

        {/* CONSOLE 02: VORLAGEN-KATALOG */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          onMouseEnter={() => setHoveredCard('presets')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => {
            sensoryEngine.playGlassTouch(1.15);
            sensoryEngine.hapticPresetSwitch();
            onOpenPresets();
          }}
          className="group sensual-glass-interactive glass-optics-edge p-6 sm:p-7 rounded-3xl cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orchid"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              sensoryEngine.playGlassTouch(1.15);
              onOpenPresets();
            }
          }}
          id="mode-card-presets"
          aria-label={tr(language, 'Vorlagen-Katalog öffnen', 'Open Preset Catalog', 'Abrir Catálogo de Plantillas')}
        >
          <div className="space-y-4">
            {/* Header: Micro-index & Icon */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-brand-orchid uppercase">
                {tr(language, '02 / Bibliothek', '02 / Library', '02 / Biblioteca')}
              </span>
              <div className="w-10 h-10 rounded-2xl bg-brand-orchid/15 border border-brand-orchid/40 flex items-center justify-center text-brand-orchid group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(183,132,247,0.35)] transition-all">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="font-display font-semibold text-2xl text-text-bright group-hover:text-brand-orchid transition-colors flex items-center justify-between">
                <span>{tr(language, 'Vorlagen-Katalog', 'Preset Catalog', 'Catálogo de Plantillas')}</span>
                <ArrowUpRight className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-brand-orchid" />
              </h2>
              <p className="text-xs sm:text-sm text-text-dim leading-relaxed mt-2">
                {tr(
                  language,
                  `${presetList.length} harmonische Profile in 10 Kategorien mit hochauflösender 4-Spur-Inspektion.`,
                  `${presetList.length} calibrated motion profiles in 10 categories with high-res 4-track inspection.`,
                  `${presetList.length} perfiles calibrados en 10 categorías con inspección de 4 pistas en alta resolución.`
                )}
              </p>
            </div>

            {/* Kinetic Micro-Canvas */}
            <div className="pt-2 border-t border-border-dim/60">
              <HarmonicWaveVisualizer isHovered={hoveredCard === 'presets'} />
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-4 border-t border-border-dim/60 text-xs text-text-dim">
            <span className="font-mono text-brand-orchid">{presetList.length} {tr(language, 'Profile', 'Profiles', 'Perfiles')}</span>
            <span>{tr(language, '10 Kategorien · Schnellstart', '10 Categories · Quickstart', '10 Categorías · Inicio Rápido')}</span>
          </div>
        </motion.div>

        {/* CONSOLE 03: 4-SPUR STUDIO EDITOR */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          onMouseEnter={() => setHoveredCard('studio')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => {
            sensoryEngine.playTactileClick('primary');
            sensoryEngine.hapticPresetSwitch();
            onSelectManual();
          }}
          className="group sensual-glass-interactive glass-optics-edge p-6 sm:p-7 rounded-3xl cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-rose"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              sensoryEngine.playTactileClick('primary');
              onSelectManual();
            }
          }}
          id="mode-card-manual"
          aria-label={tr(language, '4-Spur Studio öffnen', 'Open 4-Track Studio', 'Abrir Estudio de 4 Pistas')}
        >
          <div className="space-y-4">
            {/* Header: Micro-index & Icon */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-brand-rose uppercase">
                {tr(language, '03 / Sequenzer', '03 / Sequencer', '03 / Secuenciador')}
              </span>
              <div className="w-10 h-10 rounded-2xl bg-brand-rose/15 border border-brand-rose/40 flex items-center justify-center text-brand-rose group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(232,149,165,0.35)] transition-all">
                <Sliders className="h-5 w-5" />
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="font-display font-semibold text-2xl text-text-bright group-hover:text-brand-rose transition-colors flex items-center justify-between">
                <span>{tr(language, '4-Spur Studio', '4-Track Studio', 'Estudio de 4 Pistas')}</span>
                <ArrowUpRight className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-brand-rose" />
              </h2>
              <p className="text-xs sm:text-sm text-text-dim leading-relaxed mt-2">
                {tr(
                  language,
                  'Präzisions-Editor für Mindest- & Maximalhub, SPM-Kurve und Umkehr-Sanftheit (Register 0x09).',
                  'Precision multi-curve editor for minimum/maximum depth corridors, SPM tempo ramps, and register 0x09 smoothness.',
                  'Editor de precisión de múltiples curvas para corredores de profundidad, rampas SPM y suavidad (registro 0x09).'
                )}
              </p>
            </div>

            {/* Kinetic Micro-Canvas */}
            <div className="pt-2 border-t border-border-dim/60">
              <SequencerMicroVisualizer isHovered={hoveredCard === 'studio'} />
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-4 border-t border-border-dim/60 text-xs text-text-dim">
            <span className="font-mono text-brand-rose">{tr(language, '4 Spuren Synchron', '4 Synchronous Tracks', '4 Pistas Sincrónicas')}</span>
            <span>{tr(language, 'Stützpunkte & Lube-Spur', 'Waypoints & Lube Track', 'Puntos y Pista de Lubricación')}</span>
          </div>
        </motion.div>
      </div>

      {/* =========================================================================
       * INNOVATIVES UNTERMENÜ: "ERWEITERTE WERKZEUGE & ARCHIV"
       * Saubere Faltung nicht direkt relevanter Aktionen (Import, Speicher, Einstellungen, Hilfe)
       * ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="sensual-glass glass-optics-edge rounded-3xl overflow-hidden"
      >
        {/* Untermenü Header Toggle */}
        <button
          type="button"
          onClick={() => {
            sensoryEngine.playGlassTouch(1.0);
            setShowToolsSubmenu((prev) => !prev);
          }}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-bg-panel/40 transition-colors cursor-pointer group"
          aria-expanded={showToolsSubmenu}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-bg-base/70 border border-border-dim text-text-dim group-hover:text-brand-cyan transition-colors">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="font-display font-semibold text-sm sm:text-base text-text-bright block group-hover:text-brand-cyan transition-colors">
                {tr(language, 'Erweiterte Werkzeuge, Import & System', 'Advanced Tools, Import & System', 'Herramientas Avanzadas, Importación y Sistema')}
              </span>
              <span className="text-xs text-text-dim">
                {tr(
                  language,
                  'Session-Dateien (.json, .csv, .funscript), Browser-Archiv, Einstellungen & Anleitung',
                  'Session files (.json, .csv, .funscript), browser archive, settings & guide',
                  'Archivos de sesión (.json, .csv, .funscript), archivo del navegador, ajustes y guía'
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-dim font-mono">
            <span className="hidden sm:inline">
              {showToolsSubmenu
                ? tr(language, 'Untermenü einklappen', 'Collapse submenu', 'Plegar submenú')
                : tr(language, 'Untermenü anzeigen', 'Show submenu', 'Mostrar submenú')}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-brand-cyan transition-transform duration-300 ${
                showToolsSubmenu ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Collapsible Untermenü Drawer */}
        <AnimatePresence>
          {showToolsSubmenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="border-t border-border-dim/60 bg-bg-base/40 p-6 sm:p-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* SUBMENU ITEM 1: DATEI-IMPORT */}
                <div
                  onClick={() => {
                    sensoryEngine.playGlassTouch(1.05);
                    fileInputRef.current?.click();
                  }}
                  className="p-4 rounded-2xl bg-bg-surface/80 hover:bg-bg-panel border border-border-dim hover:border-emerald-500/50 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Upload className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-text-bright group-hover:text-emerald-400 transition-colors">
                      {tr(language, 'Datei importieren', 'Import File', 'Importar Archivo')}
                    </h3>
                    <p className="text-xs text-text-dim leading-relaxed">
                      {tr(
                        language,
                        'Lade Sessions aus JSON-, CSV- oder Funscript-Dateien direkt ein.',
                        'Load sessions directly from JSON, CSV, or Funscript files.',
                        'Carga sesiones directamente desde archivos JSON, CSV o Funscript.'
                      )}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <span>{tr(language, 'Datei wählen', 'Select file', 'Seleccionar archivo')}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>

                {/* SUBMENU ITEM 2: BROWSER-ARCHIV */}
                {onSelectLoadModal && (
                  <div
                    onClick={() => {
                      sensoryEngine.playGlassTouch(1.1);
                      onSelectLoadModal();
                    }}
                    className="p-4 rounded-2xl bg-bg-surface/80 hover:bg-bg-panel border border-border-dim hover:border-brand-cyan/50 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan group-hover:scale-105 transition-transform">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold text-sm text-text-bright group-hover:text-brand-cyan transition-colors">
                        {tr(language, 'Browser-Archiv', 'Browser Archive', 'Archivo del Navegador')}
                      </h3>
                      <p className="text-xs text-text-dim leading-relaxed">
                        {tr(
                          language,
                          'Verwalte und öffne lokal im Browser gespeicherte Kompositionen.',
                          'Manage and open sessions saved locally in the browser.',
                          'Gestiona y abre composiciones guardadas localmente en el navegador.'
                        )}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-brand-cyan flex items-center gap-1">
                      <span>{tr(language, 'Archiv öffnen', 'Open archive', 'Abrir archivo')}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                )}

                {/* SUBMENU ITEM 3: EINSTELLUNGEN & DESIGN */}
                {onOpenSettings && (
                  <div
                    onClick={() => {
                      sensoryEngine.playGlassTouch(1.15);
                      onOpenSettings();
                    }}
                    className="p-4 rounded-2xl bg-bg-surface/80 hover:bg-bg-panel border border-border-dim hover:border-brand-orchid/50 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-orchid/15 border border-brand-orchid/30 flex items-center justify-center text-brand-orchid group-hover:scale-105 transition-transform">
                        <Settings className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold text-sm text-text-bright group-hover:text-brand-orchid transition-colors">
                        {tr(language, 'Einstellungen', 'Settings', 'Ajustes')}
                      </h3>
                      <p className="text-xs text-text-dim leading-relaxed">
                        {tr(
                          language,
                          '10+10 Akzentfarben, Start-Dynamik, SPM-Standardmodus & Bluetooth-Geräte.',
                          '10+10 accent colors, startup dynamics, default SPM mode & Bluetooth devices.',
                          '10+10 colores de acento, dinámica de inicio, modo SPM y dispositivos Bluetooth.'
                        )}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-brand-orchid flex items-center gap-1">
                      <span>{tr(language, 'Konfigurieren', 'Configure', 'Configurar')}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                )}

                {/* SUBMENU ITEM 4: ANLEITUNG & SHORTCUTS */}
                {onOpenHelp && (
                  <div
                    onClick={() => {
                      sensoryEngine.playGlassTouch(1.0);
                      onOpenHelp();
                    }}
                    className="p-4 rounded-2xl bg-bg-surface/80 hover:bg-bg-panel border border-border-dim hover:border-brand-rose/50 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-rose/15 border border-brand-rose/30 flex items-center justify-center text-brand-rose group-hover:scale-105 transition-transform">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold text-sm text-text-bright group-hover:text-brand-rose transition-colors">
                        {t.helpButton}
                      </h3>
                      <p className="text-xs text-text-dim leading-relaxed">
                        {tr(
                          language,
                          'Hardware-Sicherheit, Not-Aus (Spacebar), Tastenkürzel & lokale Ausführung.',
                          'Hardware safety, emergency stop (spacebar), shortcuts & local execution.',
                          'Seguridad de hardware, parada de emergencia (espacio), atajos y ejecución local.'
                        )}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-brand-rose flex items-center gap-1">
                      <span>{tr(language, 'Anleitung lesen', 'Read guide', 'Leer guía')}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* =========================================================================
       * HARDWARE TELEMETRY & SYSTEM READINESS BAR (QUIET MINIMALIST DOCK)
       * ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border-dim/60 text-xs text-text-dim">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isBleActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-600'
            }`}
          />
          <span className="font-mono">
            {isBleActive
              ? tr(
                  language,
                  'Hismith Servok Premium verbunden · 40 Hz GATT Telemetrie aktiv',
                  'Hismith Servok Premium connected · 40 Hz GATT telemetry active',
                  'Hismith Servok Premium conectado · Telemetría GATT 40 Hz activa'
                )
              : tr(
                  language,
                  'Hismith Servok Premium im Standby · Web Bluetooth bereit',
                  'Hismith Servok Premium in standby · Web Bluetooth ready',
                  'Hismith Servok Premium en espera · Web Bluetooth listo'
                )}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {!isBleActive && onConnectBle && (
            <button
              type="button"
              onClick={() => {
                sensoryEngine.playClick(1.1);
                onConnectBle();
              }}
              className="text-xs font-medium text-brand-cyan hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Bluetooth className="h-3.5 w-3.5" />
              <span>{tr(language, 'Jetzt koppeln', 'Pair Now', 'Vincular Ahora')}</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                sensoryEngine.playClick(1.0);
                onOpenSettings();
              }}
              className="text-xs text-text-dim hover:text-text-bright transition-colors cursor-pointer"
            >
              {tr(language, 'Einstellungen & Design', 'Settings & Design', 'Ajustes y Diseño')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
