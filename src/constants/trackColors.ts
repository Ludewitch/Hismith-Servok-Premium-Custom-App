/**
 * Track Color Configuration for Hismith Servok Premium Studio
 * Defines 4 distinct, high-contrast, immutable track colors across all UI themes and designs:
 * 
 * Spur 1: Mindesttiefe (Min Depth) -> Electric Cyan (#00F0FF)
 * Spur 2: Maximaltiefe (Max Depth) -> Vivid Rose/Red (#F43F5E)
 * Spur 3: Stöße pro Minute (SPM / Cadence) -> Emerald Green (#10B981)
 * Spur 4: Stoß-Härte & Smoothness (0x09) -> Warm Amber Gold (#F59E0B)
 */

export const TRACK_COLORS = {
  minDepth: {
    key: 'minDepth' as const,
    labelDe: 'Mindesttiefe (Min)',
    labelEn: 'Minimum Depth (Min)',
    shortLabel: 'Min',
    hex: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.45)',
    bgSubtle: 'rgba(0, 240, 255, 0.12)',
    bgFill: 'rgba(0, 240, 255, 0.22)',
    btnActive: 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/30',
    dot: 'bg-cyan-400',
    text: 'text-cyan-400',
    border: 'border-cyan-400',
  },
  maxDepth: {
    key: 'maxDepth' as const,
    labelDe: 'Maximaltiefe (Max)',
    labelEn: 'Maximum Depth (Max)',
    shortLabel: 'Max',
    hex: '#F43F5E',
    glow: 'rgba(244, 63, 94, 0.45)',
    bgSubtle: 'rgba(244, 63, 94, 0.12)',
    bgFill: 'rgba(244, 63, 94, 0.20)',
    btnActive: 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm shadow-rose-950/30',
    dot: 'bg-rose-500',
    text: 'text-rose-400',
    border: 'border-rose-500',
  },
  spm: {
    key: 'spm' as const,
    labelDe: 'Stöße pro Min (SPM)',
    labelEn: 'Strokes Per Min (SPM)',
    shortLabel: 'SpM',
    hex: '#10B981',
    glow: 'rgba(16, 185, 129, 0.45)',
    bgSubtle: 'rgba(16, 185, 129, 0.12)',
    bgFill: 'rgba(16, 185, 129, 0.18)',
    btnActive: 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950/30',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
  },
  hardness: {
    key: 'hardness' as const,
    labelDe: 'Stoß-Härte & Smooth (0x09)',
    labelEn: 'Impact Hardness & Smooth (0x09)',
    shortLabel: 'Härte',
    hex: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
    bgSubtle: 'rgba(245, 158, 11, 0.12)',
    bgFill: 'rgba(245, 158, 11, 0.18)',
    btnActive: 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-950/30 ring-1 ring-amber-400/40',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    border: 'border-amber-500',
  },
} as const;

export type TrackLayerKey = keyof typeof TRACK_COLORS;

export const TRACK_HEX_BY_KEY: Record<string, string> = {
  minDepth: TRACK_COLORS.minDepth.hex,
  maxDepth: TRACK_COLORS.maxDepth.hex,
  spm: TRACK_COLORS.spm.hex,
  hardness: TRACK_COLORS.hardness.hex,
  multi: TRACK_COLORS.minDepth.hex,
};
