import { PresetDefinition, Waypoint } from '../types/servok';
import { SENSUAL_PRESETS } from './presets/sensual';
import { TEASE_PRESETS } from './presets/tease';
import { WAVES_PRESETS } from './presets/waves';
import { DEEP_PRESETS } from './presets/deep';
import { SPEED_PRESETS } from './presets/speed';
import { POWER_PRESETS } from './presets/power';
import { HARDCORE_PRESETS } from './presets/hardcore';
import { MARATHON_PRESETS } from './presets/marathon';
import { EXTREME_PRESETS } from './presets/extreme';
import { CURIOSITY_PRESETS } from './presets/curiosities';
import { HYBRID_DEEP_PRESETS } from './presets/hybrid_deep';
import { SILK_DIVERSITY_50_PRESETS } from './presets/silk_diversity_50';
import { COMPREHENSIVE_MATRIX_PRESETS } from './presets/comprehensive_matrix';

/**
 * Die 10 klaren, harmonisch abgestimmten Hauptkategorien des Vorlagen-Katalogs
 */
export const MASTER_CATEGORIES = [
  'Zart & Sinnlich',
  'Wellen & Rhythmus',
  'Tease & Edging',
  'Tiefen-Exploration',
  'Flutter & Vibration',
  'Ausdauer & Trance',
  'Steigerung & Klimax',
  'Kraftvoll & Intensiv',
  'Grenzerfahrungen',
  'Spezials & Experimente',
] as const;

export type MasterCategory = (typeof MASTER_CATEGORIES)[number];

const CUSTOM_PRESETS_STORAGE_KEY = 'hismith_custom_presets_v1';

/**
 * Ordnet jede Vorlage präzise anhand ihrer ID und Roh-Kategorie in die 10 Hauptkategorien ein
 */
export function normalizeCategory(rawCat: string, presetId: string): MasterCategory {
  if (MASTER_CATEGORIES.includes(rawCat as MasterCategory)) {
    return rawCat as MasterCategory;
  }

  const id = presetId.toLowerCase();
  const c = rawCat.trim().toLowerCase();

  // 1. Spezifische ID-Zuordnungen für Hybrid-, Spezial- und Grenz-Serien
  if (id.startsWith('special_') || id.startsWith('curiosity_')) {
    return 'Spezials & Experimente';
  }
  if (id.startsWith('extreme_')) {
    return 'Grenzerfahrungen';
  }
  if (id.startsWith('hardcore_') || id.startsWith('heavy_deep_')) {
    return 'Kraftvoll & Intensiv';
  }
  if (id.startsWith('power_') || id.startsWith('climax_')) {
    return 'Steigerung & Klimax';
  }
  if (id.startsWith('deep_marathon_') || id.startsWith('marathon_') || id.startsWith('trance_')) {
    return 'Ausdauer & Trance';
  }
  if (id.startsWith('deep_flutter_') || id.startsWith('speed_') || id.startsWith('flutter_')) {
    return 'Flutter & Vibration';
  }
  if (id.startsWith('heavy_tease_') || id.startsWith('tease_')) {
    return 'Tease & Edging';
  }
  if (id.startsWith('heavy_poly_') || id.startsWith('waves_') || id.startsWith('wave_')) {
    return 'Wellen & Rhythmus';
  }
  if (id.startsWith('deep_')) {
    return 'Tiefen-Exploration';
  }
  if (id.startsWith('sensual_') || id.startsWith('silk_')) {
    return 'Zart & Sinnlich';
  }

  // 2. Semantische Fallback-Prüfung in korrekter Prioritätsreihenfolge
  if (c.includes('kurios') || c.includes('experiment') || c.includes('spezial')) {
    return 'Spezials & Experimente';
  }
  if (c.includes('grenzerfahrung') || c.includes('tiefensturm') || c.includes('extrem')) {
    return 'Grenzerfahrungen';
  }
  if (c.includes('power · ausdauer') || c.includes('heftig · tiefen') || c.includes('kraftvoll')) {
    return 'Kraftvoll & Intensiv';
  }
  if (c.includes('klimax') || c.includes('steigerung') || c === 'power · klimax') {
    return 'Steigerung & Klimax';
  }
  if (c.includes('trance') || c.includes('marathon') || c.includes('ausdauer')) {
    return 'Ausdauer & Trance';
  }
  if (c.includes('flutter') || c.includes('schnell') || c.includes('vibration')) {
    return 'Flutter & Vibration';
  }
  if (c.includes('tease') || c.includes('edging') || c.includes('denial')) {
    return 'Tease & Edging';
  }
  if (c.includes('polyrhythm') || c.includes('welle') || c.includes('rhythmus')) {
    return 'Wellen & Rhythmus';
  }
  if (c.includes('tiefen') || c.includes('exploration')) {
    return 'Tiefen-Exploration';
  }
  if (c.includes('sinnlich') || c.includes('sanft') || c.includes('zart')) {
    return 'Zart & Sinnlich';
  }

  return 'Spezials & Experimente';
}

/**
 * Physikalische Basis-Maximalfrequenz des Hismith Servok für eine gegebene Hubspanne (in %):
 * Vollhub (100%): 120 SPM | Halbhub (50%): 240 SPM | Kurzhub (<=20%): bis 600 SPM
 */
export const calcServokPhysicalMaxSpm = (spanPct: number): number => {
  const span = Math.max(15, Math.min(100, spanPct));
  return Math.min(600, Math.round(12000 / span));
};

function interpolateWaypoints(waypoints: Waypoint[], timeMs: number, fallback: number): number {
  if (!waypoints || waypoints.length === 0) return fallback;
  if (waypoints.length === 1) return waypoints[0].pos;
  const sorted = [...waypoints].sort((a, b) => a.time - b.time);
  if (timeMs <= sorted[0].time) return sorted[0].pos;
  if (timeMs >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].pos;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (timeMs >= p1.time && timeMs <= p2.time) {
      const dt = p2.time - p1.time;
      if (dt <= 0) return p1.pos;
      return p1.pos + ((timeMs - p1.time) / dt) * (p2.pos - p1.pos);
    }
  }
  return fallback;
}

/**
 * Berechnet die echte physikalische SPM eines Presets zu einem Zeitpunkt t (in ms)
 */
export const getPresetRealSpmAtTime = (preset: PresetDefinition, timeMs: number): number => {
  const minVal = interpolateWaypoints(preset.waypointsMinDepth, timeMs, 10);
  const maxVal = interpolateWaypoints(preset.waypointsMaxDepth, timeMs, 80);
  const span = Math.max(15, Math.abs(maxVal - minVal));
  const baseMax = calcServokPhysicalMaxSpm(span);
  const spmPct = interpolateWaypoints(preset.waypointsSpm, timeMs, 25);
  return Math.round((spmPct / 100) * baseMax);
};

/**
 * Optimiert jedes Preset mechatronisch für den Servok und sorgt für eine harmonische
 * Diversität von Zart (soft) über Geschmeidig (medium) bis Intensiv (intense).
 */
export function optimizePresetForServok(raw: PresetDefinition): PresetDefinition {
  const unifiedCategory = normalizeCategory(raw.category, raw.id);
  const isMatrixOrCustom = raw.id.includes('_mat_') || Boolean(raw.isCustom);

  // 1. Hub-Korridor mechanisch absichern (2%..98% schont Endanschläge des Servok)
  const cleanMin: Waypoint[] = raw.waypointsMinDepth.map((wp) => ({
    ...wp,
    pos: Math.max(2, Math.min(86, Math.round(wp.pos))),
  }));

  const cleanMax: Waypoint[] = raw.waypointsMaxDepth.map((wp) => {
    const minAtT = interpolateWaypoints(cleanMin, wp.time, 10);
    const minSpan =
      unifiedCategory === 'Flutter & Vibration' ||
      unifiedCategory === 'Grenzerfahrungen' ||
      unifiedCategory === 'Spezials & Experimente'
        ? 10
        : 15;
    const safeMax = Math.max(minAtT + minSpan, Math.min(98, Math.round(wp.pos)));
    return {
      ...wp,
      pos: safeMax,
    };
  });

  const rawMaxSpm = Math.max(...raw.waypointsSpm.map((w) => w.pos), 20);
  const rawAvgHardness =
    raw.waypointsHardness.reduce((acc, w) => acc + w.pos, 0) /
    Math.max(1, raw.waypointsHardness.length);

  let refinedIntensity: 'soft' | 'medium' | 'intense' = raw.intensity;
  if (!isMatrixOrCustom) {
    if (rawMaxSpm <= 58 && rawAvgHardness <= 35) {
      refinedIntensity = 'soft';
    } else if (
      raw.intensity === 'intense' &&
      rawMaxSpm <= 92 &&
      rawAvgHardness <= 58 &&
      unifiedCategory !== 'Grenzerfahrungen' &&
      unifiedCategory !== 'Kraftvoll & Intensiv'
    ) {
      refinedIntensity = 'medium';
    }
  }

  // 2. Ziel-SPM der Vorlage in exakte 0-100% Kurvenwerte relativ zur momentanen Hubspanne kalibrieren
  const calibratedSpm: Waypoint[] = raw.waypointsSpm.map((wp) => {
    const targetSpm = wp.pos;
    if (targetSpm <= 0) {
      return { ...wp, pos: 0 };
    }
    const minAtT = interpolateWaypoints(cleanMin, wp.time, 10);
    const maxAtT = interpolateWaypoints(cleanMax, wp.time, 80);
    const span = Math.max(15, Math.abs(maxAtT - minAtT));
    const baseMax = calcServokPhysicalMaxSpm(span);
    const spmPct = Math.max(4, Math.min(98, Math.round((targetSpm / baseMax) * 100)));
    return {
      ...wp,
      pos: spmPct,
    };
  });

  // 3. Härte-Spur (Spur 4 -> BLE 0x09 Smoothness) passend abstimmen
  const calibratedHardness: Waypoint[] = raw.waypointsHardness.map((wp) => {
    const minAtT = interpolateWaypoints(cleanMin, wp.time, 10);
    const maxAtT = interpolateWaypoints(cleanMax, wp.time, 80);
    const span = Math.max(15, Math.abs(maxAtT - minAtT));
    const baseMax = calcServokPhysicalMaxSpm(span);
    const spmPctAtT = interpolateWaypoints(calibratedSpm, wp.time, 30);
    const realSpmAtT = (spmPctAtT / 100) * baseMax;

    const minRequiredHardness =
      realSpmAtT >= 150
        ? 76
        : realSpmAtT >= 115
        ? 60
        : realSpmAtT >= 85
        ? 44
        : refinedIntensity === 'soft'
        ? 10
        : 18;
    const maxAllowedHardness = refinedIntensity === 'soft' && realSpmAtT < 75 ? 42 : 100;
    const clampedHrd = Math.max(
      minRequiredHardness,
      Math.min(maxAllowedHardness, Math.round(wp.pos))
    );
    return {
      ...wp,
      pos: clampedHrd,
    };
  });

  const avgHardness =
    calibratedHardness.reduce((acc, w) => acc + w.pos, 0) / Math.max(1, calibratedHardness.length);
  const syncedSmoothness = Math.max(0, Math.min(10, Math.round(((100 - avgHardness) / 100) * 10)));

  return {
    ...raw,
    category: unifiedCategory,
    intensity: refinedIntensity,
    waypointsMinDepth: cleanMin,
    waypointsMaxDepth: cleanMax,
    waypointsSpm: calibratedSpm,
    waypointsHardness: calibratedHardness,
    recommendedSmoothness: syncedSmoothness,
  };
}

const RAW_PRESETS: PresetDefinition[] = [
  ...SENSUAL_PRESETS,
  ...SILK_DIVERSITY_50_PRESETS,
  ...WAVES_PRESETS,
  ...TEASE_PRESETS,
  ...DEEP_PRESETS,
  ...SPEED_PRESETS,
  ...MARATHON_PRESETS,
  ...POWER_PRESETS,
  ...HARDCORE_PRESETS,
  ...HYBRID_DEEP_PRESETS,
  ...EXTREME_PRESETS,
  ...CURIOSITY_PRESETS,
  ...COMPREHENSIVE_MATRIX_PRESETS,
];

export const PRESET_DEFINITIONS: PresetDefinition[] = RAW_PRESETS.map(optimizePresetForServok);

/**
 * Lädt alle vom Nutzer gespeicherten eigenen Vorlagen aus dem LocalStorage
 */
export const getCustomPresets = (): PresetDefinition[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => ({
      ...p,
      isCustom: true,
    }));
  } catch (err) {
    console.warn('Error loading custom presets:', err);
    return [];
  }
};

/**
 * Speichert eine neue benutzerdefinierte Vorlage im Vorlagen-Katalog (LocalStorage)
 */
export const saveCustomPreset = (preset: PresetDefinition): PresetDefinition[] => {
  const existing = getCustomPresets();
  const normalized: PresetDefinition = {
    ...preset,
    category: normalizeCategory(preset.category, preset.id),
    isCustom: true,
    createdAt: preset.createdAt || new Date().toLocaleDateString('de-DE'),
  };
  const updated = [normalized, ...existing.filter((p) => p.id !== normalized.id)];
  try {
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('servok-custom-presets-updated'));
  } catch (err) {
    console.error('Error saving custom preset:', err);
  }
  return updated;
};

/**
 * Löscht eine benutzerdefinierte Vorlage aus dem Katalog
 */
export const deleteCustomPreset = (id: string): PresetDefinition[] => {
  const existing = getCustomPresets();
  const updated = existing.filter((p) => p.id !== id);
  try {
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('servok-custom-presets-updated'));
  } catch (err) {
    console.error('Error deleting custom preset:', err);
  }
  return updated;
};

/**
 * Gibt alle Vorlagen (Eigene Vorlagen + 227 integrierte Vorlagen) zurück
 */
export const getAllPresets = (): PresetDefinition[] => {
  return [...getCustomPresets(), ...PRESET_DEFINITIONS];
};

export const getPresetById = (id: string): PresetDefinition | undefined => {
  const custom = getCustomPresets().find((p) => p.id === id);
  if (custom) return custom;
  return PRESET_DEFINITIONS.find((p) => p.id === id);
};
