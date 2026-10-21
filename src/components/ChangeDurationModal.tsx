import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, Check, ArrowRight, Scissors, StretchHorizontal, Info } from 'lucide-react';
import { Language, tr } from '../i18n/translations';

interface ChangeDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDurationMs: number;
  formatHHMMSS: (ms: number) => string;
  onApplyDuration: (newDurationMs: number, mode: 'scale' | 'pad_crop') => void;
  totalWaypointsCount?: number;
  language?: Language;
}

export const ChangeDurationModal: React.FC<ChangeDurationModalProps> = ({
  isOpen,
  onClose,
  currentDurationMs,
  formatHHMMSS,
  onApplyDuration,
  totalWaypointsCount = 0,
  language = 'de',
}) => {
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(5);
  const [seconds, setSeconds] = useState<number>(0);
  const [mode, setMode] = useState<'scale' | 'pad_crop'>('scale');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Initialisiere die Werte aus der aktuellen Dauer beim Öffnen
  useEffect(() => {
    if (isOpen) {
      const totalSec = Math.max(1, Math.round(currentDurationMs / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setHours(h);
      setMinutes(m);
      setSeconds(s);
      setErrorMsg('');
    }
  }, [isOpen, currentDurationMs]);

  if (!isOpen) return null;

  const targetDurationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
  const factor = currentDurationMs > 0 ? targetDurationMs / currentDurationMs : 1;
  const isShorter = targetDurationMs < currentDurationMs;
  const isSame = targetDurationMs === currentDurationMs;

  const handleApply = () => {
    if (targetDurationMs < 5000) {
      setErrorMsg(
        tr(
          language,
          'Die Mindestdauer beträgt 5 Sekunden.',
          'Minimum duration is 5 seconds.',
          'La duración mínima es de 5 segundos.'
        )
      );
      return;
    }
    if (targetDurationMs > 4 * 3600 * 1000) {
      setErrorMsg(
        tr(
          language,
          'Die Maximaldauer beträgt 4 Stunden.',
          'Maximum duration is 4 hours.',
          'La duración máxima es de 4 horas.'
        )
      );
      return;
    }
    setErrorMsg('');
    onApplyDuration(targetDurationMs, mode);
    onClose();
  };

  const setFromMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const minRem = m % 60;
    setHours(h);
    setMinutes(minRem);
    setSeconds(0);
    setErrorMsg('');
  };

  const quickPresets = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-bg-surface border border-brand-rose/40 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl text-text-bright space-y-6 relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-56 h-56 bg-brand-rose/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-dim/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-rose/15 border border-brand-rose/30 rounded-2xl text-brand-rose shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold tracking-tight text-text-bright">
                  {tr(language, 'Session-Dauer anpassen', 'Adjust Session Duration', 'Ajustar duración de la sesión')}
                </h3>
                <p className="text-xs text-text-dim font-sans">
                  {tr(language, 'Aktuelle Gesamtlaufzeit: ', 'Current total duration: ', 'Duración total actual: ')}
                  <span className="text-brand-rose font-semibold">{formatHHMMSS(currentDurationMs)}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-bg-panel text-text-dim hover:text-text-bright rounded-xl cursor-pointer transition-colors"
              title={tr(language, 'Schließen', 'Close', 'Cerrar')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Eingabefelder für Stunden, Minuten, Sekunden */}
          <div className="space-y-4">
            <div className="text-xs font-semibold text-text-dim tracking-wide font-sans">
              {tr(language, 'Neue Dauer einstellen:', 'Set new duration:', 'Configurar nueva duración:')}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Stunden */}
              <div className="bg-bg-panel border border-border-dim rounded-2xl p-3 flex flex-col items-center shadow-inner">
                <span className="text-[11px] font-sans font-medium text-text-dim mb-1">
                  {tr(language, 'Stunden', 'Hours', 'Horas')}
                </span>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={hours}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(4, parseInt(e.target.value) || 0));
                    setHours(val);
                  }}
                  className="w-full bg-bg-surface border border-border-bright text-center font-mono text-xl font-bold text-brand-rose rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand-rose"
                />
              </div>

              {/* Minuten */}
              <div className="bg-bg-panel border border-border-dim rounded-2xl p-3 flex flex-col items-center shadow-inner">
                <span className="text-[11px] font-sans font-medium text-text-dim mb-1">
                  {tr(language, 'Minuten', 'Minutes', 'Minutos')}
                </span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    setMinutes(val);
                  }}
                  className="w-full bg-bg-surface border border-border-bright text-center font-mono text-xl font-bold text-brand-rose rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand-rose"
                />
              </div>

              {/* Sekunden */}
              <div className="bg-bg-panel border border-border-dim rounded-2xl p-3 flex flex-col items-center shadow-inner">
                <span className="text-[11px] font-sans font-medium text-text-dim mb-1">
                  {tr(language, 'Sekunden', 'Seconds', 'Segundos')}
                </span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    setSeconds(val);
                  }}
                  className="w-full bg-bg-surface border border-border-bright text-center font-mono text-xl font-bold text-brand-rose rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand-rose"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-sans text-text-dim block">
                {tr(language, 'Schnellauswahl:', 'Quick presets:', 'Selección rápida:')}
              </span>
              <div className="flex flex-wrap gap-2">
                {quickPresets.map((m) => {
                  const presetMs = m * 60 * 1000;
                  const isActive = targetDurationMs === presetMs;
                  return (
                    <button
                      key={`dur-pill-${m}`}
                      type="button"
                      onClick={() => setFromMinutes(m)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-brand-rose text-bg-base border-brand-rose shadow-md shadow-rose-950/30'
                          : 'bg-bg-panel border-border-dim text-text-dim hover:text-text-bright hover:border-brand-rose/50'
                      }`}
                    >
                      {m}m
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modus-Auswahl (Skalieren vs Pad/Crop) */}
          <div className="space-y-2.5 pt-2 border-t border-border-dim/80">
            <div className="text-xs font-semibold text-text-dim tracking-wide font-sans">
              {tr(language, 'Anpassungs-Methode:', 'Adjustment Method:', 'Método de ajuste:')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Modus 1: Proportional skalieren */}
              <button
                type="button"
                onClick={() => setMode('scale')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  mode === 'scale'
                    ? 'bg-brand-rose/15 border-brand-rose text-text-bright shadow-md ring-2 ring-brand-rose/30'
                    : 'bg-bg-panel border-border-dim text-text-dim hover:border-border-bright hover:text-text-bright'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-rose">
                  <StretchHorizontal className="h-4 w-4 shrink-0" />
                  <span>
                    {tr(
                      language,
                      'Proportional strecken (Empfohlen)',
                      'Scale proportionally (Recommended)',
                      'Estirar proporcionalmente (Recomendado)'
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-text-dim leading-relaxed font-sans">
                  {tr(
                    language,
                    'Alle Kurven, Wegpunkte & Abschnitte passen sich prozentual an. Der Verlauf bleibt perfekt erhalten.',
                    'All curves, waypoints & sections scale proportionally. Progression is perfectly preserved.',
                    'Todas las curvas, waypoints y tramos se escalan proporcionalmente. La progresión se conserva intacta.'
                  )}
                </p>
              </button>

              {/* Modus 2: Pad / Trim */}
              <button
                type="button"
                onClick={() => setMode('pad_crop')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  mode === 'pad_crop'
                    ? 'bg-brand-rose/15 border-brand-rose text-text-bright shadow-md ring-2 ring-brand-rose/30'
                    : 'bg-bg-panel border-border-dim text-text-dim hover:border-border-bright hover:text-text-bright'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Scissors className="h-4 w-4 shrink-0" />
                  <span>
                    {tr(
                      language,
                      'Am Ende verlängern / kürzen',
                      'Extend / crop at end',
                      'Alargar / recortar al final'
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-text-dim leading-relaxed font-sans">
                  {tr(
                    language,
                    'Bestehende Zeitpunkte bleiben unverändert. Zeitleiste wird hinten verlängert oder abgeschnitten.',
                    'Existing timestamps remain unchanged. Timeline is extended or cropped at the end.',
                    'Las marcas de tiempo existentes no se modifican. La línea se extiende o recorta al final.'
                  )}
                </p>
              </button>
            </div>
          </div>

          {/* Auswirkungs-Vorschau */}
          <div className="bg-bg-panel border border-border-dim rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between text-text-bright">
              <span className="text-text-dim">{tr(language, 'Änderung:', 'Change:', 'Cambio:')}</span>
              <div className="flex items-center gap-2 font-mono font-bold">
                <span className="text-text-dim">{formatHHMMSS(currentDurationMs)}</span>
                <ArrowRight className="h-4 w-4 text-brand-rose" />
                <span className="text-brand-rose text-sm">{formatHHMMSS(targetDurationMs)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-text-dim font-sans">
              <span>{tr(language, 'Verhältnis:', 'Ratio:', 'Proporción:')}</span>
              <span className={isSame ? 'text-text-dim' : factor > 1 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {factor.toFixed(2)}x{' '}
                {factor > 1
                  ? tr(language, '(Verlängerung)', '(Extension)', '(Extensión)')
                  : factor < 1
                  ? tr(language, '(Verkürzung)', '(Shortening)', '(Reducción)')
                  : tr(language, '(Unverändert)', '(Unchanged)', '(Sin cambios)')}
              </span>
            </div>

            {totalWaypointsCount > 0 && (
              <div className="flex items-center justify-between text-xs text-text-dim border-t border-border-dim/60 pt-2 font-sans">
                <span>{tr(language, 'Betroffene Wegpunkte:', 'Affected waypoints:', 'Waypoints afectados:')}</span>
                <span className="text-text-bright font-medium">
                  {totalWaypointsCount}{' '}
                  {tr(language, 'Punkte über alle Ebenen', 'points across all layers', 'puntos en todas las capas')}
                </span>
              </div>
            )}

            {mode === 'pad_crop' && isShorter && (
              <div className="flex items-start gap-1.5 text-xs text-amber-300 font-sans mt-1">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  {tr(
                    language,
                    `Achtung: Wegpunkte jenseits von ${formatHHMMSS(targetDurationMs)} werden bei dieser Methode abgeschnitten.`,
                    `Warning: Waypoints beyond ${formatHHMMSS(targetDurationMs)} will be cropped with this method.`,
                    `Atención: Los waypoints más allá de ${formatHHMMSS(targetDurationMs)} se recortarán con este método.`
                  )}
                </span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl font-sans">
              {errorMsg}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-dim">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-bg-panel hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              {tr(language, 'Abbrechen', 'Cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isSame}
              className={`px-5 py-2.5 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer ${
                isSame
                  ? 'bg-border-dim text-text-dim cursor-not-allowed opacity-60'
                  : 'bg-brand-rose hover:bg-brand-rose/90 text-bg-base shadow-lg shadow-rose-950/30 active:scale-95'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>{tr(language, 'Dauer übernehmen', 'Apply Duration', 'Aplicar duración')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
