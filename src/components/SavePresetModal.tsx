import React, { useState, useEffect } from 'react';
import { Sparkles, X, CheckCircle2, AlertCircle, Bookmark, Clock, Layers } from 'lucide-react';
import { PresetDefinition, Waypoint, Subsection, LubeTrigger } from '../types/servok';
import { MASTER_CATEGORIES, MasterCategory, saveCustomPreset } from '../data/presets';
import { sensoryEngine } from '../services/sensoryEngine';
import { Language, tr } from '../i18n/translations';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (preset: PresetDefinition) => void;
  language?: Language;
  sourceLabel?: string;
  durationMs: number;
  waypointsMinDepth: Waypoint[];
  waypointsMaxDepth: Waypoint[];
  waypointsSpm: Waypoint[];
  waypointsHardness: Waypoint[];
  lubeTriggers?: LubeTrigger[];
  subsections?: Subsection[];
  defaultTitle?: string;
  defaultDesc?: string;
  defaultCategory?: MasterCategory;
}

const PRESET_ICONS = ['🌸', '🌊', '✨', '🔥', '🦋', '💎', '🌙', '⚡', '🌹', '👑', '🕯️', '🌀'];

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  language = 'de',
  sourceLabel,
  durationMs,
  waypointsMinDepth,
  waypointsMaxDepth,
  waypointsSpm,
  waypointsHardness,
  lubeTriggers = [],
  subsections = [],
  defaultTitle = '',
  defaultDesc = '',
  defaultCategory,
}) => {
  const [title, setTitle] = useState<string>(defaultTitle);
  const [desc, setDesc] = useState<string>(defaultDesc);
  const [category, setCategory] = useState<string>(defaultCategory || '');
  const [intensity, setIntensity] = useState<'soft' | 'medium' | 'intense'>('medium');
  const [icon, setIcon] = useState<string>('✨');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-estimate intensity and specs when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setTitle(defaultTitle || '');
    setDesc(defaultDesc || '');
    setCategory(defaultCategory || '');
    setErrorMsg(null);

    const avgHardness =
      waypointsHardness.length > 0
        ? waypointsHardness.reduce((acc, w) => acc + w.pos, 0) / waypointsHardness.length
        : 50;
    const maxSpm =
      waypointsSpm.length > 0 ? Math.max(...waypointsSpm.map((w) => w.pos)) : 50;

    if (avgHardness <= 35 && maxSpm <= 55) {
      setIntensity('soft');
      setIcon('🌸');
    } else if (avgHardness >= 68 || maxSpm >= 85) {
      setIntensity('intense');
      setIcon('🔥');
    } else {
      setIntensity('medium');
      setIcon('✨');
    }
  }, [isOpen, defaultTitle, defaultDesc, defaultCategory, waypointsHardness, waypointsSpm]);

  if (!isOpen) return null;

  const totalSec = Math.max(1, Math.round(durationMs / 1000));
  const durationMin = totalSec / 60;
  const durationGroup: 'short' | 'medium' | 'long' =
    durationMin <= 5.5 ? 'short' : durationMin <= 15.5 ? 'medium' : 'long';

  const formattedDuration =
    totalSec < 90
      ? `${totalSec} Sek`
      : `${Math.max(1, Math.round(totalSec / 60))} Min`;

  const minDepthVal =
    waypointsMinDepth.length > 0
      ? Math.round(Math.min(...waypointsMinDepth.map((w) => w.pos)))
      : 10;
  const maxDepthVal =
    waypointsMaxDepth.length > 0
      ? Math.round(Math.max(...waypointsMaxDepth.map((w) => w.pos)))
      : 85;
  const minSpmVal =
    waypointsSpm.length > 0
      ? Math.max(10, Math.round(Math.min(...waypointsSpm.map((w) => w.pos))))
      : 25;
  const maxSpmVal =
    waypointsSpm.length > 0
      ? Math.max(minSpmVal, Math.round(Math.max(...waypointsSpm.map((w) => w.pos))))
      : 65;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanDesc = desc.trim();
    const cleanCat = category.trim();

    if (!cleanTitle) {
      setErrorMsg(
        tr(
          language,
          'Bitte gib einen Namen für die Vorlage ein (Pflichtfeld).',
          'Please enter a name for the preset.',
          'Introduce un nombre para la plantilla (obligatorio).'
        )
      );
      sensoryEngine.hapticBoundaryWarning();
      return;
    }

    if (!cleanDesc) {
      setErrorMsg(
        tr(
          language,
          'Bitte gib eine Beschreibung für die Vorlage ein (Pflichtfeld).',
          'Please enter a description for the preset.',
          'Introduce una descripción para la plantilla (obligatorio).'
        )
      );
      sensoryEngine.hapticBoundaryWarning();
      return;
    }

    if (!cleanCat || !MASTER_CATEGORIES.includes(cleanCat as MasterCategory)) {
      setErrorMsg(
        tr(
          language,
          'Bitte wähle eine Kategorie für die Vorlage aus (Pflichtfeld).',
          'Please select a category for the preset.',
          'Selecciona una categoría para la plantilla (obligatorio).'
        )
      );
      sensoryEngine.hapticBoundaryWarning();
      return;
    }

    const avgHrd =
      waypointsHardness.length > 0
        ? waypointsHardness.reduce((a, b) => a + b.pos, 0) / waypointsHardness.length
        : 50;
    const recSmooth = Math.max(0, Math.min(10, Math.round(((100 - avgHrd) / 100) * 10)));

    const newPreset: PresetDefinition = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      icon,
      durationGroup,
      duration: formattedDuration,
      category: cleanCat,
      intensity,
      title: cleanTitle,
      desc: cleanDesc,
      specs: `${minSpmVal}–${maxSpmVal}% Tempo | ${minDepthVal}–${maxDepthVal}% Hub`,
      color: intensity === 'soft' ? 'cyan' : intensity === 'medium' ? 'purple' : 'rose',
      durationMs: Math.max(1000, durationMs),
      waypointsMinDepth: waypointsMinDepth.map((w, i) => ({
        id: w.id || `cmin-${i}-${w.time}`,
        time: w.time,
        pos: Math.max(2, Math.min(88, Math.round(w.pos))),
      })),
      waypointsMaxDepth: waypointsMaxDepth.map((w, i) => ({
        id: w.id || `cmax-${i}-${w.time}`,
        time: w.time,
        pos: Math.max(16, Math.min(98, Math.round(w.pos))),
      })),
      waypointsSpm: waypointsSpm.map((w, i) => ({
        id: w.id || `cspm-${i}-${w.time}`,
        time: w.time,
        pos: Math.max(4, Math.min(100, Math.round(w.pos))),
      })),
      waypointsHardness: waypointsHardness.map((w, i) => ({
        id: w.id || `chrd-${i}-${w.time}`,
        time: w.time,
        pos: Math.max(5, Math.min(100, Math.round(w.pos))),
      })),
      lubeTriggers: lubeTriggers.map((l, i) => ({
        id: l.id || `clube-${i}-${l.time}`,
        time: l.time,
        bursts: l.bursts,
      })),
      subsections:
        subsections.length > 0
          ? subsections
          : [
              {
                id: `csub-${Date.now()}`,
                name: cleanTitle,
                startTime: 0,
                endTime: Math.max(1000, durationMs),
              },
            ],
      recommendedSmoothness: recSmooth,
      isCustom: true,
      createdAt: new Date().toLocaleDateString('de-DE'),
    };

    saveCustomPreset(newPreset);
    sensoryEngine.playPresetChime();
    if (onSaved) onSaved(newPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="sensual-glass glass-optics-edge rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 text-text-bright border border-brand-cyan/40 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dim/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-cyan/15 border border-brand-cyan/40 flex items-center justify-center">
              <Bookmark className="w-4 h-4 text-brand-cyan" />
            </div>
            <div>
              <h3 className="text-base font-display font-semibold tracking-wide text-text-bright">
                {tr(language, 'Als Vorlage im Katalog speichern', 'Save as Catalog Preset', 'Guardar como Plantilla en el Catálogo')}
              </h3>
              <p className="text-[11px] text-text-dim">
                {sourceLabel ||
                  tr(
                    language,
                    'Benenne, beschreibe und kategorisiere deine Session für den Vorlagen-Katalog',
                    'Name, describe and categorize your custom session',
                    'Nombra, describe y categoriza tu sesión para el catálogo'
                  )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-bg-base/60 hover:bg-bg-panel text-text-dim hover:text-text-bright cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-2 text-center bg-bg-base/60 border border-border-dim/80 rounded-2xl p-2.5 text-xs">
          <div>
            <span className="text-[10px] text-text-dim uppercase block">
              {tr(language, 'Dauer & Länge', 'Duration & Length', 'Duración y Longitud')}
            </span>
            <span className="font-mono font-semibold text-brand-cyan flex items-center justify-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {formattedDuration} ({durationGroup === 'short' ? tr(language, 'Kurz', 'Short', 'Corta') : durationGroup === 'medium' ? tr(language, 'Mittel', 'Medium', 'Media') : tr(language, 'Lang', 'Long', 'Larga')})
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-dim uppercase block">
              {tr(language, 'Hub-Korridor', 'Depth Corridor', 'Corredor de Carrera')}
            </span>
            <span className="font-mono font-semibold text-text-bright block mt-0.5">
              {minDepthVal}% – {maxDepthVal}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-dim uppercase block">
              {tr(language, 'Kurvenpunkte', 'Waypoints', 'Puntos de Curva')}
            </span>
            <span className="font-mono font-semibold text-brand-orchid flex items-center justify-center gap-1 mt-0.5">
              <Layers className="w-3 h-3" />
              {waypointsMinDepth.length +
                waypointsMaxDepth.length +
                waypointsSpm.length +
                waypointsHardness.length}{' '}
              {tr(language, 'Pkt', 'pts', 'pts')}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* 1. REQUIRED: Name + Icon */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-bright flex items-center justify-between">
              <span>
                1. {tr(language, 'Name der Vorlage', 'Preset Name', 'Nombre de la Plantilla')}{' '}
                <span className="text-brand-rose">*</span>
              </span>
              <span className="text-[10px] text-text-dim">{tr(language, 'Pflichtfeld', 'Required', 'Obligatorio')}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={tr(
                  language,
                  'z. B. Samtene Abend-Welle',
                  'e.g. Velvet Evening Wave',
                  'p. ej. Onda Terciopelo Vespertina'
                )}
                className="flex-1 bg-bg-base/80 border border-border-bright focus:border-brand-cyan rounded-xl px-3.5 py-2 text-sm text-text-bright focus:outline-none"
              />
            </div>
            {/* Icon Quick Picker */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-[10px] text-text-dim mr-1">{tr(language, 'Symbol:', 'Icon:', 'Icono:')}</span>
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer border ${
                    icon === ic
                      ? 'bg-brand-cyan/25 border-brand-cyan scale-110'
                      : 'bg-bg-base/60 border-border-dim hover:border-border-bright'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* 2. REQUIRED: Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-bright flex items-center justify-between">
              <span>
                2. {tr(language, 'Beschreibung der Vorlage', 'Description', 'Descripción de la Plantilla')}{' '}
                <span className="text-brand-rose">*</span>
              </span>
              <span className="text-[10px] text-text-dim">{tr(language, 'Pflichtfeld', 'Required', 'Obligatorio')}</span>
            </label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={tr(
                language,
                'Beschreibe kurz Charakter, Rhythmus und Gefühl dieser Vorlage...',
                'Describe the rhythm, feel and progression of this session...',
                'Describe brevemente el ritmo, sensación y progresión de esta sesión...'
              )}
              className="w-full bg-bg-base/80 border border-border-bright focus:border-brand-cyan rounded-xl px-3.5 py-2 text-xs text-text-bright focus:outline-none resize-none"
            />
          </div>

          {/* 3. REQUIRED: Category (10 Master Categories) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-bright flex items-center justify-between">
              <span>
                3. {tr(language, 'Kategorie auswählen', 'Select Category', 'Seleccionar Categoría')}{' '}
                <span className="text-brand-rose">*</span>
              </span>
              <span className="text-[10px] text-text-dim">{tr(language, 'Pflichtfeld (10 Kategorien)', 'Required (10 Categories)', 'Obligatorio (10 Categorías)')}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5">
              {MASTER_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`px-3 py-2 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                      active
                        ? 'bg-brand-cyan/20 border-brand-cyan text-text-bright shadow-sm'
                        : 'bg-bg-base/60 border-border-dim text-text-dim hover:text-text-bright hover:border-border-bright'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-brand-cyan shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Hardness / Intensity Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-bright block">
              4. {tr(language, 'Härtegrad / Intensität', 'Intensity / Hardness Level', 'Nivel de Intensidad')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'soft' as const,
                  label: tr(language, '🌸 Zart & Sanft', '🌸 Soft & Gentle', '🌸 Suave y Delicado'),
                },
                {
                  id: 'medium' as const,
                  label: tr(language, '✨ Mittel & Dynamisch', '✨ Medium & Supple', '✨ Medio y Flexible'),
                },
                {
                  id: 'intense' as const,
                  label: tr(language, '🔥 Hart & Intensiv', '🔥 Intense & Deep', '🔥 Intenso y Profundo'),
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIntensity(item.id)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ${
                    intensity === item.id
                      ? 'bg-brand-orchid/20 border-brand-orchid text-text-bright'
                      : 'bg-bg-base/60 border-border-dim text-text-dim hover:text-text-bright'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-dim/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-bg-base/70 hover:bg-bg-panel border border-border-dim text-xs text-text-dim hover:text-text-bright cursor-pointer"
            >
              {tr(language, 'Abbrechen', 'Cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-cyan text-bg-base font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg hover:opacity-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {tr(language, 'Vorlage im Katalog speichern', 'Save Preset to Catalog', 'Guardar Plantilla en el Catálogo')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
