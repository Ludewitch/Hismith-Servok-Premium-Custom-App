import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Eye,
  EyeOff,
  Sliders,
  Droplet,
  Scissors,
  FolderPlus,
  Activity,
  Cpu,
  Bluetooth,
  Terminal,
  Check,
} from 'lucide-react';
import { Language, tr } from '../i18n/translations';

export type SectionId =
  | 'telemetry'
  | 'lube'
  | 'subsections'
  | 'savedGroups'
  | 'strokeMonitor'
  | 'hardware'
  | 'bluetooth'
  | 'logs';

export interface SectionMeta {
  id: SectionId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SECTION_ICONS: Record<SectionId, React.ComponentType<{ className?: string }>> = {
  telemetry: Sliders,
  lube: Droplet,
  subsections: Scissors,
  savedGroups: FolderPlus,
  strokeMonitor: Activity,
  hardware: Cpu,
  bluetooth: Bluetooth,
  logs: Terminal,
};

export const getSectionMeta = (id: SectionId | string, lang: Language | string = 'de'): SectionMeta => {
  const Icon = SECTION_ICONS[id] || Sliders;
  switch (id) {
    case 'telemetry':
      return {
        id,
        name: tr(lang, '3D Motor-Simulation & Telemetrie', '3D Motor Simulation & Telemetry', 'Simulación 3D de motor y telemetría'),
        description: tr(lang, 'Echtzeit-Simulation des Servok Zylinders mit 1-cm Maßstab', 'Real-time simulation of the Servok cylinder with 1-cm scale', 'Simulación en tiempo real del cilindro Servok con escala de 1 cm'),
        icon: Icon,
      };
    case 'lube':
      return {
        id,
        name: tr(lang, 'Lube Launcher Impuls-Steuerung', 'Lube Launcher Pulse Control', 'Control de pulso Lube Launcher'),
        description: tr(lang, 'Automatisierte Schmier-Pumpstöße für das Zweitgerät', 'Automated lubricant pump pulses for secondary device', 'Pulsos de lubricante automatizados para dispositivo secundario'),
        icon: Icon,
      };
    case 'subsections':
      return {
        id,
        name: tr(lang, 'Teilabschnitte & Phasen', 'Subsections & Phases', 'Tramos y fases'),
        description: tr(lang, 'Phasen-Manager für Warmup, Hauptteil, Intervalle und Cooldown', 'Phase manager for warmup, main part, intervals, and cooldown', 'Gestor de fases para calentamiento, parte principal, intervalos y enfriamiento'),
        icon: Icon,
      };
    case 'savedGroups':
      return {
        id,
        name: tr(lang, 'Gespeicherte Gruppen / Schnipsel', 'Saved Groups / Snippets', 'Grupos guardados / fragmentos'),
        description: tr(lang, 'Wiederverwendbare Punktmuster und Session-Snippets', 'Reusable point patterns and session snippets', 'Patrones de puntos reutilizables y fragmentos de sesión'),
        icon: Icon,
      };
    case 'strokeMonitor':
      return {
        id,
        name: tr(lang, 'Physischer Hub-Monitor (0–16.8 cm)', 'Physical Stroke Monitor (0–16.8 cm)', 'Monitor de recorrido físico (0–16.8 cm)'),
        description: tr(lang, 'Visualisierung der exakten mechanischen Wegstrecke', 'Visualization of exact mechanical travel distance', 'Visualización del recorrido mecánico exacto'),
        icon: Icon,
      };
    case 'hardware':
      return {
        id,
        name: tr(lang, 'Hardware-Steuerung & Modi', 'Hardware Control & Modes', 'Control de hardware y modos'),
        description: tr(lang, 'Positions-Modus (0x02) vs Auto-Zyklus (0x03) Direktsteuerung', 'Position mode (0x02) vs Auto-cycle (0x03) direct control', 'Modo de posición (0x02) vs Auto-ciclo (0x03) control directo'),
        icon: Icon,
      };
    case 'bluetooth':
      return {
        id,
        name: tr(lang, 'Hardware-Verbindung (BLE)', 'Hardware Connection (BLE)', 'Conexión de hardware (BLE)'),
        description: tr(lang, 'Web Bluetooth API Verbindung für Servok S2 & Lube Launcher', 'Web Bluetooth API connection for Servok S2 & Lube Launcher', 'Conexión Web Bluetooth API para Servok S2 y Lube Launcher'),
        icon: Icon,
      };
    case 'logs':
      return {
        id,
        name: tr(lang, '4-Byte BLE Protokoll-Monitor', '4-Byte BLE Protocol Monitor', 'Monitor de protocolo BLE de 4 bytes'),
        description: tr(lang, 'Paket-Sniffer für TX/RX Hex-Befehle und Fehlerdiagnose', 'Packet sniffer for TX/RX hex commands and diagnostics', 'Analizador de paquetes para comandos hexadecimales TX/RX y diagnósticos'),
        icon: Icon,
      };
    default:
      return {
        id: id as SectionId,
        name: id,
        description: '',
        icon: Icon,
      };
  }
};

export const SECTION_DEFINITIONS: Record<SectionId, SectionMeta> = {
  telemetry: getSectionMeta('telemetry', 'de'),
  lube: getSectionMeta('lube', 'de'),
  subsections: getSectionMeta('subsections', 'de'),
  savedGroups: getSectionMeta('savedGroups', 'de'),
  strokeMonitor: getSectionMeta('strokeMonitor', 'de'),
  hardware: getSectionMeta('hardware', 'de'),
  bluetooth: getSectionMeta('bluetooth', 'de'),
  logs: getSectionMeta('logs', 'de'),
};

export const DEFAULT_SECTION_ORDER: SectionId[] = [
  'bluetooth',
  'telemetry',
  'hardware',
  'subsections',
  'savedGroups',
  'lube',
  'strokeMonitor',
  'logs',
];

interface LayoutOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionOrder: SectionId[];
  onReorder: (newOrder: SectionId[]) => void;
  hiddenSections: Record<string, boolean>;
  onToggleVisibility: (id: SectionId) => void;
  onResetOrder: () => void;
  language?: Language;
}

export const LayoutOrderModal: React.FC<LayoutOrderModalProps> = ({
  isOpen,
  onClose,
  sectionOrder,
  onReorder,
  hiddenSections,
  onToggleVisibility,
  onResetOrder,
  language = 'de',
}) => {
  if (!isOpen) return null;

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sectionOrder.length) return;

    const updated = [...sectionOrder];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onReorder(updated);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-bg-surface border border-brand-cyan/40 rounded-sm shadow-2xl max-w-lg w-full p-5 space-y-4 text-text-bright"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-border-dim pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-brand-cyan" />
              <div>
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-brand-cyan">
                  {tr(language, 'Dashboard Anordnung anpassen', 'Customize Dashboard Layout', 'Personalizar diseño del panel')}
                </h3>
                <p className="text-[11px] text-text-dim">
                  {tr(
                    language,
                    'Verschiebe die Felder mit den Pfeilen nach deinen Wünschen',
                    'Rearrange sections using the arrows to suit your preferences',
                    'Reorganiza las secciones usando las flechas según tu preferencia'
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-dim hover:text-text-bright p-1 cursor-pointer transition-colors"
              title={tr(language, 'Schließen', 'Close', 'Cerrar')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* NOTE ABOUT EDITOR */}
          <div className="p-2.5 bg-brand-cyan/10 border border-brand-cyan/30 rounded-xs text-xs font-mono text-text-bright flex items-center justify-between">
            <span className="text-brand-cyan font-bold">
              {tr(language, '✨ Zentraler Editor:', '✨ Central Editor:', '✨ Editor central:')}
            </span>
            <span className="text-[10px] text-text-dim">
              {tr(
                language,
                'Der Session-Editor bleibt immer im visuellen Zentrum verankert.',
                'The session editor always stays anchored in the visual center.',
                'El editor de sesión siempre permanece anclado en el centro visual.'
              )}
            </span>
          </div>

          {/* LIST OF SECTIONS */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {sectionOrder.map((secId, index) => {
              const meta = getSectionMeta(secId, language);
              const Icon = meta.icon;
              const isHidden = !!hiddenSections[secId];

              return (
                <div
                  key={secId}
                  className={`p-2.5 rounded-sm border flex items-center justify-between gap-3 transition-colors ${
                    isHidden
                      ? 'bg-bg-base/40 border-border-dim/40 opacity-60'
                      : 'bg-bg-panel border-border-bright hover:border-brand-cyan/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono font-bold text-brand-cyan w-5 text-center shrink-0">
                      #{index + 1}
                    </span>
                    <div className="p-1.5 bg-bg-base border border-border-bright rounded-xs shrink-0">
                      <Icon className="h-4 w-4 text-brand-cyan" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-text-bright truncate font-display">
                        {meta.name}
                      </div>
                      <div className="text-[10px] text-text-dim truncate">
                        {meta.description}
                      </div>
                    </div>
                  </div>

                  {/* CONTROLS */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(secId)}
                      className={`p-1 rounded-xs transition-colors cursor-pointer ${
                        isHidden
                          ? 'text-text-dim hover:text-amber-400 bg-bg-base'
                          : 'text-text-dim hover:text-brand-cyan bg-bg-base'
                      }`}
                      title={
                        isHidden
                          ? tr(language, 'Feld anzeigen', 'Show section', 'Mostrar sección')
                          : tr(language, 'Feld ausblenden', 'Hide section', 'Ocultar sección')
                      }
                    >
                      {isHidden ? (
                        <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveItem(index, 'up')}
                      className={`p-1 rounded-xs transition-colors cursor-pointer ${
                        index === 0
                          ? 'text-text-dim/30 cursor-not-allowed'
                          : 'text-text-dim hover:text-brand-cyan bg-bg-base hover:bg-border-bright'
                      }`}
                      title={tr(language, 'Nach oben', 'Move up', 'Mover arriba')}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={index === sectionOrder.length - 1}
                      onClick={() => moveItem(index, 'down')}
                      className={`p-1 rounded-xs transition-colors cursor-pointer ${
                        index === sectionOrder.length - 1
                          ? 'text-text-dim/30 cursor-not-allowed'
                          : 'text-text-dim hover:text-brand-cyan bg-bg-base hover:bg-border-bright'
                      }`}
                      title={tr(language, 'Nach unten', 'Move down', 'Mover abajo')}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-between border-t border-border-dim pt-3 gap-2">
            <button
              type="button"
              onClick={onResetOrder}
              className="px-3 py-1.5 bg-bg-panel hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright font-mono text-xs font-bold rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{tr(language, 'Standard-Reihenfolge', 'Default Order', 'Orden predeterminado')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-brand-cyan hover:bg-brand-cyan/90 text-bg-base font-mono text-xs font-bold rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{tr(language, 'Fertig & Schließen', 'Done & Close', 'Listo y cerrar')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
