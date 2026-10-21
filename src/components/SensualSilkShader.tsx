import React, { useEffect, useRef } from 'react';
import { Sun, Moon, Flame, Snowflake } from 'lucide-react';
import { sensoryEngine } from '../services/sensoryEngine';

export type ThemeLuminance = 'dark' | 'light';
export type ThemeTemperature = 'warm' | 'cold';
export type SensualThemeId = 'dark-warm' | 'dark-cold' | 'light-warm' | 'light-cold';

export const THEME_META: Record<
  SensualThemeId,
  {
    labelDe: string;
    labelEn: string;
    subDe: string;
    subEn: string;
    orbA: [number, number, number];
    orbB: [number, number, number];
    orbC: [number, number, number];
  }
> = {
  'dark-warm': {
    labelDe: 'Samt-Nacht · Warm',
    labelEn: 'Velvet Noir · Warm',
    subDe: 'Dunkles Roségold & Kaschmir',
    subEn: 'Dark Rose Gold & Cashmere',
    orbA: [232, 149, 165],
    orbB: [212, 163, 115],
    orbC: [185, 110, 155],
  },
  'dark-cold': {
    labelDe: 'Mitternacht · Kühl',
    labelEn: 'Midnight Silk · Cold',
    subDe: 'Mondstein, Saphir & Silber',
    subEn: 'Moonstone, Sapphire & Silver',
    orbA: [148, 168, 255],
    orbB: [125, 211, 252],
    orbC: [183, 132, 247],
  },
  'light-warm': {
    labelDe: 'Alabaster · Warm',
    labelEn: 'Alabaster Silk · Warm',
    subDe: 'Seiden-Creme & Rosenholz',
    subEn: 'Silk Cream & Rosewood',
    orbA: [215, 120, 140],
    orbB: [230, 175, 150],
    orbC: [195, 135, 165],
  },
  'light-cold': {
    labelDe: 'Nordic Opal · Kühl',
    labelEn: 'Nordic Opal · Cold',
    subDe: 'Porzellan-Nebel & Iris',
    subEn: 'Porcelain Mist & Iris',
    orbA: [115, 128, 245],
    orbB: [125, 200, 248],
    orbC: [175, 155, 245],
  },
};

interface SensualSilkShaderProps {
  themeId?: SensualThemeId;
  luminance?: ThemeLuminance;
  temperature?: ThemeTemperature;
  spm?: number;
  isPlaying?: boolean;
}

/**
 * Ambient Generative Silk & Glass Caustics Shader Canvas
 * Renders flowing, organic, supple silk waves in the background
 */
export const SensualSilkShader: React.FC<SensualSilkShaderProps> = ({
  themeId,
  luminance = 'dark',
  temperature = 'warm',
  spm = 30,
  isPlaying = false,
}) => {
  const resolvedThemeId: SensualThemeId =
    themeId || (`${luminance}-${temperature}` as SensualThemeId) || 'dark-warm';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ themeId: resolvedThemeId, spm, isPlaying });

  useEffect(() => {
    stateRef.current = { themeId: resolvedThemeId, spm, isPlaying };
  }, [resolvedThemeId, spm, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      const { themeId: curTheme = 'dark-warm', spm: curSpm = 30, isPlaying: playing = false } =
        stateRef.current || {};
      const safeTheme = typeof curTheme === 'string' ? curTheme : 'dark-warm';
      const meta = THEME_META[safeTheme as SensualThemeId] || THEME_META['dark-warm'];
      const isLight = safeTheme.startsWith('light');

      const w = (canvas.width = Math.min(window.innerWidth, 1440) * 0.5);
      const h = (canvas.height = Math.min(window.innerHeight, 900) * 0.5);

      const speedFactor = playing ? 0.004 + Math.min(0.014, curSpm / 18000) : 0.0022;
      t += speedFactor;

      ctx.clearRect(0, 0, w, h);

      // Draw 3 flowing organic caustic silk ribbons
      const ribbons = [
        { rgb: meta.orbA, phase: 0, amp: h * 0.16, yBase: h * 0.32 },
        { rgb: meta.orbB, phase: 2.1, amp: h * 0.14, yBase: h * 0.55 },
        { rgb: meta.orbC, phase: 4.2, amp: h * 0.18, yBase: h * 0.72 },
      ];

      ribbons.forEach((r, idx) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 24) {
          const nx = x / w;
          const y =
            r.yBase +
            Math.sin(nx * Math.PI * 2.2 + t * (1.2 + idx * 0.3) + r.phase) * r.amp +
            Math.cos(nx * Math.PI * 3.6 - t * 0.8 + r.phase) * (r.amp * 0.45);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, r.yBase - r.amp, 0, h);
        const alphaTop = isLight ? 0.14 : 0.11;
        const alphaMid = isLight ? 0.05 : 0.04;
        grad.addColorStop(0, `rgba(${r.rgb[0]}, ${r.rgb[1]}, ${r.rgb[2]}, ${alphaTop})`);
        grad.addColorStop(0.55, `rgba(${r.rgb[0]}, ${r.rgb[1]}, ${r.rgb[2]}, ${alphaMid})`);
        grad.addColorStop(1, `rgba(${r.rgb[0]}, ${r.rgb[1]}, ${r.rgb[2]}, 0)`);

        ctx.fillStyle = grad;
        ctx.fill();

        // Delicate specular silk crest line
        ctx.beginPath();
        for (let x = 0; x <= w; x += 20) {
          const nx = x / w;
          const y =
            r.yBase +
            Math.sin(nx * Math.PI * 2.2 + t * (1.2 + idx * 0.3) + r.phase) * r.amp +
            Math.cos(nx * Math.PI * 3.6 - t * 0.8 + r.phase) * (r.amp * 0.45);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${r.rgb[0]}, ${r.rgb[1]}, ${r.rgb[2]}, ${isLight ? 0.25 : 0.22})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-90"
      style={{ filter: 'blur(26px)' }}
    />
  );
};

/**
 * 4-Way Theme Selector Control (Dark / Light × Warm / Cold)
 */
interface ThemeSelectorBarProps {
  luminance: ThemeLuminance;
  temperature: ThemeTemperature;
  onChangeLuminance: (lum: ThemeLuminance) => void;
  onChangeTemperature: (temp: ThemeTemperature) => void;
  compact?: boolean;
}

export const ThemeSelectorBar: React.FC<ThemeSelectorBarProps> = ({
  luminance,
  temperature,
  onChangeLuminance,
  onChangeTemperature,
  compact = false,
}) => {
  return (
    <div className="inline-flex items-center gap-1.5 sensual-glass px-2 py-1 rounded-full border border-border-dim text-xs">
      {/* Dark / Light Toggle */}
      <div className="flex items-center bg-bg-base/70 p-0.5 rounded-full border border-border-dim/60">
        <button
          type="button"
          onClick={() => {
            sensoryEngine.playClick(0.95);
            onChangeLuminance('dark');
          }}
          title="Dark Mode"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
            luminance === 'dark'
              ? 'bg-brand-cyan text-bg-base font-semibold shadow-xs'
              : 'text-text-dim hover:text-text-bright'
          }`}
        >
          <Moon className="w-3 h-3" />
          {!compact && <span>Dark</span>}
        </button>
        <button
          type="button"
          onClick={() => {
            sensoryEngine.playClick(1.1);
            onChangeLuminance('light');
          }}
          title="Light Mode"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
            luminance === 'light'
              ? 'bg-brand-cyan text-bg-base font-semibold shadow-xs'
              : 'text-text-dim hover:text-text-bright'
          }`}
        >
          <Sun className="w-3 h-3" />
          {!compact && <span>Light</span>}
        </button>
      </div>

      {/* Warm / Cold Toggle */}
      <div className="flex items-center bg-bg-base/70 p-0.5 rounded-full border border-border-dim/60">
        <button
          type="button"
          onClick={() => {
            sensoryEngine.playClick(1.0);
            onChangeTemperature('warm');
          }}
          title="Warmes Farbdesign (Roségold / Kaschmir)"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
            temperature === 'warm'
              ? 'bg-brand-rose text-bg-base font-semibold shadow-xs'
              : 'text-text-dim hover:text-text-bright'
          }`}
        >
          <Flame className="w-3 h-3" />
          {!compact && <span>Warm</span>}
        </button>
        <button
          type="button"
          onClick={() => {
            sensoryEngine.playClick(1.15);
            onChangeTemperature('cold');
          }}
          title="Kühles Farbdesign (Mondstein / Opal)"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
            temperature === 'cold'
              ? 'bg-brand-orchid text-bg-base font-semibold shadow-xs'
              : 'text-text-dim hover:text-text-bright'
          }`}
        >
          <Snowflake className="w-3 h-3" />
          {!compact && <span>Cold</span>}
        </button>
      </div>
    </div>
  );
};
