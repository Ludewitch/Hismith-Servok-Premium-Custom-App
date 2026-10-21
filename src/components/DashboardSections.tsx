import React from 'react';
import {
  Sliders,
  Sparkles,
  Droplet,
  Scissors,
  Bookmark,
  Activity,
  Cpu,
  Bluetooth,
  Terminal,
  Plus,
  Zap,
  Trash2,
  FolderPlus,
  Play,
  RotateCcw,
  RefreshCw,
  Clock,
  Settings2,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { CollapsibleSectionCard } from './CollapsibleSectionCard';
import { PhysicalStrokeMonitor } from './PhysicalStrokeMonitor';
import { ServokHardwarePanel } from './ServokHardwarePanel';
import { BlePacketMonitor } from './BlePacketMonitor';
import { SectionId } from './LayoutOrderModal';
import { ControlMode, BlePacketLog, Subsection, LubeTrigger } from '../types/servok';

export interface SavedGroup {
  id: string;
  name: string;
  durationMs?: number;
  layer?: string;
  points?: any[];
  data?: any;
  createdAt?: string;
}

export interface DashboardSectionsProps {
  sectionOrder: SectionId[];
  hiddenSections: Record<string, boolean>;
  foregroundSections: Record<string, boolean>;
  collapsedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  toggleForeground: (id: string) => void;
  moveSection: (id: SectionId, direction: 'up' | 'down') => void;
  onOpenLayoutModal: () => void;

  // Presets (Optional)
  onLoadPreset?: (presetId: string) => void;

  // Formatters
  formatHHMMSS: (ms: number) => string;
  formatCm: (posPct: number) => string;

  // Playback & Session
  playbackTime: number;
  durationMs: number;
  isPlaying: boolean;
  currentSpmVal: number;
  currentMinDepthVal: number;
  currentMaxDepthVal: number;
  currentHardnessVal: number;
  currentServokEffectivePos: number;
  liveSensorPos: number | null;
  servokTelemetry: {
    speedMmS: number;
    speedPct: number;
    accelMms2: number;
    estimatedCurrentMa: number;
    pwmDutyCycle: number;
  };
  telemetryScaleRatio: number;
  setTelemetryScaleRatio: (ratio: number) => void;

  // Lube Launcher
  lubeTriggers: LubeTrigger[];
  selectedLubeTriggerId: string | null;
  addLubeTrigger: (timeMs?: number, bursts?: number) => void;
  deleteLubeTrigger: (id: string) => void;
  setSelectedLubeTriggerId: (id: string | null) => void;
  setPlaybackTime: (timeMs: number) => void;
  sendLubeCommandToBLE: (bursts: number) => void;
  setIsDraggingLubeTrigger: (dragging: boolean) => void;
  setDraggedLubeBursts: (bursts: number | null) => void;
  setLubeTriggers: React.Dispatch<React.SetStateAction<LubeTrigger[]>>;

  // Subsections
  subsections: Subsection[];
  setSubsections: React.Dispatch<React.SetStateAction<Subsection[]>>;
  zoomRange: { start: number; end: number } | null;
  setZoomRange: (range: { start: number; end: number } | null) => void;
  addSubsection: () => void;
  deleteSubsection: (id: string) => void;

  // Saved Groups
  savedGroups: any[];
  setSavedGroups: React.Dispatch<React.SetStateAction<any[]>>;
  setDraggedGroup: (group: any) => void;
  setIsDraggingSnippetOver: (dragging: boolean) => void;
  onSaveCurrentSelectionAsGroup?: () => void;

  // Hardware Panel & Ble
  controlMode: ControlMode;
  setControlMode: (mode: ControlMode) => void;
  hardwareSmoothness: number;
  setHardwareSmoothness: (s: number) => void;
  speedBoostFactor: number;
  setSpeedBoostFactor: (factor: number) => void;
  speedCurveMode: 'linear' | 'torque_boost';
  setSpeedCurveMode: (mode: 'linear' | 'torque_boost') => void;
  handleEmergencyStop: () => void;

  // Bluetooth Connection (Duo BLE)
  bleStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  bleDeviceName: string | null;
  connectBLE: () => void;
  disconnectBLE: () => void;
  isScanning: boolean;
  bleBatteryLevel: number | null;

  lubeBleStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lubeBleDeviceName: string | null;
  connectLubeBLE: () => void;
  disconnectLubeBLE: () => void;
  isLubeScanning: boolean;
  lubeBleBatteryLevel: number | null;
  bluetoothLogs: Array<{ id: string; timestamp: string; direction: string; bytes?: string; description: string }>;

  // Ble Logs
  blePacketLogs: BlePacketLog[];
  setBlePacketLogs: React.Dispatch<React.SetStateAction<BlePacketLog[]>>;
}

export const DashboardSections: React.FC<DashboardSectionsProps> = ({
  sectionOrder,
  hiddenSections,
  foregroundSections,
  collapsedSections,
  toggleSection,
  toggleForeground,
  moveSection,
  onOpenLayoutModal,
  onLoadPreset,
  formatHHMMSS,
  formatCm,
  playbackTime,
  durationMs,
  isPlaying,
  currentSpmVal,
  currentMinDepthVal,
  currentMaxDepthVal,
  currentHardnessVal,
  currentServokEffectivePos,
  liveSensorPos,
  servokTelemetry,
  telemetryScaleRatio,
  setTelemetryScaleRatio,
  lubeTriggers,
  selectedLubeTriggerId,
  addLubeTrigger,
  deleteLubeTrigger,
  setSelectedLubeTriggerId,
  setPlaybackTime,
  sendLubeCommandToBLE,
  setIsDraggingLubeTrigger,
  setDraggedLubeBursts,
  setLubeTriggers,
  subsections,
  setSubsections,
  zoomRange,
  setZoomRange,
  addSubsection,
  deleteSubsection,
  savedGroups,
  setSavedGroups,
  setDraggedGroup,
  setIsDraggingSnippetOver,
  onSaveCurrentSelectionAsGroup,
  controlMode,
  setControlMode,
  hardwareSmoothness,
  setHardwareSmoothness,
  speedBoostFactor,
  setSpeedBoostFactor,
  speedCurveMode,
  setSpeedCurveMode,
  handleEmergencyStop,
  bleStatus,
  bleDeviceName,
  connectBLE,
  disconnectBLE,
  isScanning,
  bleBatteryLevel,
  lubeBleStatus,
  lubeBleDeviceName,
  connectLubeBLE,
  disconnectLubeBLE,
  isLubeScanning,
  lubeBleBatteryLevel,
  bluetoothLogs,
  blePacketLogs,
  setBlePacketLogs,
}) => {
  const activeCount = sectionOrder.filter((id) => !hiddenSections[id]).length;

  return (
    <div className="space-y-4" id="modular-dashboard-sections">
      {/* SECTION HEADER WITH REORDER BUTTON */}
      <div className="flex items-center justify-between px-1 py-1 border-b border-border-dim/60">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-brand-cyan" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-bright">
            Modulare Instrumente &amp; Werkzeuge
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-bg-panel border border-border-dim text-text-dim font-bold">
            {activeCount} von {sectionOrder.length} aktiv
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenLayoutModal}
          className="px-2.5 py-1 bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/40 rounded-sm text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          id="open-layout-order-modal-btn"
          title="Reihenfolge der Instrumente verschieben oder Abschnitte ausblenden"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>Anordnung anpassen</span>
        </button>
      </div>

      {/* DYNAMIC SECTIONS IN ORDER */}
      <div className="space-y-4">
        {sectionOrder.map((sectionId, idx) => {
          if (hiddenSections[sectionId]) return null;
          const isFirst = idx === 0;
          const isLast = idx === sectionOrder.length - 1;
          const isFg = !!foregroundSections[sectionId];
          const isCol = collapsedSections[sectionId] !== undefined ? !!collapsedSections[sectionId] : true;

          switch (sectionId) {
            case 'telemetry':
              return (
                <CollapsibleSectionCard
                  key="sec-telemetry"
                  id="telemetry"
                  title="Servok Motor-Simulation & Telemetrie (Echtzeit)"
                  subtitle="Echtzeit-Berechnung von Hub, Geschwindigkeit, Beschleunigung und Motorstrom"
                  icon={Sliders}
                  accentColor="cyan"
                  badge={
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
                      {isPlaying ? 'Aktiv' : 'Bereit'}
                    </span>
                  }
                  isForeground={isFg}
                  isCollapsed={isCol}
                  onToggleCollapse={() => toggleSection('telemetry')}
                  onToggleForeground={() => toggleForeground('telemetry')}
                  onMoveUp={() => moveSection('telemetry', 'up')}
                  onMoveDown={() => moveSection('telemetry', 'down')}
                  isFirst={isFirst}
                  isLast={isLast}
                  orderIndex={idx + 1}
                  compactSummary={
                    <div className="flex items-center gap-3 text-xs font-mono text-text-dim flex-wrap">
                      <span>Status: <strong className={isPlaying ? 'text-emerald-400 font-bold' : 'text-text-bright'}>{isPlaying ? 'Läuft' : 'Bereit'}</strong></span>
                      <span>Hub: <strong className="text-brand-cyan font-bold">{formatCm(currentServokEffectivePos)}</strong> ({Math.round(currentServokEffectivePos)}%)</span>
                      <span>SPM: <strong className="text-emerald-400 font-bold">{Math.round(currentSpmVal)}</strong></span>
                      <span>Strom: <strong className="text-amber-400 font-bold">{servokTelemetry.estimatedCurrentMa} mA</strong></span>
                    </div>
                  }
                >
                  <div className="p-3 pt-1 space-y-4">
                    {/* SVG 3D-Zylinder Hub Simulation */}
                    <div className="bg-bg-base border border-border-bright/60 rounded-sm p-3 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                      {/* Left side: Motor cylinder simulation */}
                      <div className="flex-1 w-full max-w-xl">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1.5 text-text-dim">
                          <span className="font-bold text-text-bright flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-brand-cyan" />
                            Mechanischer Kolben-Verfahrweg (0 bis 16.8 cm)
                          </span>
                          <span className="text-brand-cyan font-bold">
                            {formatCm(currentServokEffectivePos)} ({Math.round(currentServokEffectivePos)}%)
                          </span>
                        </div>
                        {/* Simulation Bar */}
                        <div className="relative h-9 bg-bg-panel border border-border-bright rounded-sm overflow-hidden flex items-center">
                          {/* Min/Max limits indicator */}
                          <div
                            className="absolute top-0 bottom-0 bg-brand-cyan/15 border-r border-brand-cyan/40"
                            style={{ width: `${currentMinDepthVal}%` }}
                          />
                          <div
                            className="absolute top-0 bottom-0 bg-rose-500/15 border-l border-rose-500/40 right-0"
                            style={{ width: `${100 - currentMaxDepthVal}%` }}
                          />
                          {/* Live Rod Slider */}
                          <div
                            className="absolute top-1 bottom-1 w-3 bg-brand-cyan rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.7)] transition-all duration-75 -ml-1.5 z-10"
                            style={{ left: `${Math.max(0, Math.min(100, currentServokEffectivePos))}%` }}
                          />
                          {/* Live Sensor feedback point */}
                          {liveSensorPos !== null && (
                            <div
                              className="absolute top-2 bottom-2 w-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] -ml-1 z-20"
                              style={{ left: `${Math.max(0, Math.min(100, liveSensorPos))}%` }}
                              title="Live Sensor Position (Hardware)"
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-text-dim mt-1">
                          <span>0 cm (Unten)</span>
                          <span>Min: {formatCm(currentMinDepthVal)}</span>
                          <span>Max: {formatCm(currentMaxDepthVal)}</span>
                          <span>16.8 cm (Oben)</span>
                        </div>
                      </div>

                      {/* Right side: Telemetry gauges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto shrink-0 font-mono">
                        <div className="bg-bg-surface border border-border-dim p-2 rounded-sm text-center">
                          <span className="text-[9px] text-text-dim uppercase block">Kadenz</span>
                          <span className="text-sm font-bold text-emerald-400">{Math.round(currentSpmVal)}</span>
                          <span className="text-[9px] text-text-dim block">SPM</span>
                        </div>
                        <div className="bg-bg-surface border border-border-dim p-2 rounded-sm text-center">
                          <span className="text-[9px] text-text-dim uppercase block">Geschw.</span>
                          <span className="text-sm font-bold text-brand-cyan">{servokTelemetry.speedMmS}</span>
                          <span className="text-[9px] text-text-dim block">mm/s</span>
                        </div>
                        <div className="bg-bg-surface border border-border-dim p-2 rounded-sm text-center">
                          <span className="text-[9px] text-text-dim uppercase block">Beschl.</span>
                          <span className="text-sm font-bold text-purple-300">{servokTelemetry.accelMms2}</span>
                          <span className="text-[9px] text-text-dim block">mm/s²</span>
                        </div>
                        <div className="bg-bg-surface border border-border-dim p-2 rounded-sm text-center">
                          <span className="text-[9px] text-text-dim uppercase block">Motorlast</span>
                          <span className="text-sm font-bold text-amber-400">{servokTelemetry.pwmDutyCycle}%</span>
                          <span className="text-[9px] text-text-dim block">{servokTelemetry.estimatedCurrentMa} mA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleSectionCard>
              );

            case 'lube':
              return (
                <CollapsibleSectionCard
                  key="sec-lube"
                  id="lube"
                  title="Lube Launcher (Zweitgerät Impuls-Steuerung)"
                  subtitle="Gleitmittel-Impulse präzise auf der Zeitachse timen oder manuell auslösen"
                  icon={Droplet}
                  accentColor="purple"
                  badge={
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold">
                      {lubeTriggers.length} {lubeTriggers.length === 1 ? 'Impuls' : 'Impulse'}
                    </span>
                  }
                  isForeground={isFg}
                  isCollapsed={isCol}
                  onToggleCollapse={() => toggleSection('lube')}
                  onToggleForeground={() => toggleForeground('lube')}
                  onMoveUp={() => moveSection('lube', 'up')}
                  onMoveDown={() => moveSection('lube', 'down')}
                  isFirst={isFirst}
                  isLast={isLast}
                  orderIndex={idx + 1}
                  headerActions={
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => addLubeTrigger()}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[10px] rounded-sm flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                        title="An der aktuellen Playhead-Position einen Lube-Impuls hinzufügen"
                        id="lube-persistent-add-impulse-btn"
                      >
                        <Plus className="h-3 w-3" />
                        <span>+ Impuls bei {formatHHMMSS(playbackTime)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => sendLubeCommandToBLE(2)}
                        className="px-2 py-1 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-400/50 text-purple-200 font-mono text-[10px] rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                        title="Sofort 2 Pumpstöße zum Testen abgeben"
                        id="lube-persistent-test-burst-btn"
                      >
                        <Zap className="h-3 w-3 text-purple-300" />
                        <span>Test-Stoß</span>
                      </button>
                    </div>
                  }
                  compactSummary={
                    <div className="flex items-center justify-between gap-2 text-xs font-mono text-purple-300 w-full flex-wrap">
                      <span>{lubeTriggers.length} programmierte Impulse</span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => addLubeTrigger()}
                          className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-sm flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          + Impuls bei {formatHHMMSS(playbackTime)}
                        </button>
                        <button
                          type="button"
                          onClick={() => sendLubeCommandToBLE(2)}
                          className="px-2 py-0.5 bg-purple-900/60 hover:bg-purple-800 border border-purple-400/40 text-purple-200 text-[10px] rounded-sm flex items-center gap-1 cursor-pointer"
                        >
                          <Zap className="h-3 w-3 text-purple-300" />
                          Test-Stoß
                        </button>
                      </div>
                    </div>
                  }
                >
                  <div className="p-3 pt-1 space-y-3">
                    {/* Werkzeugkasten: Pumpstöße per Drag & Drop */}
                    <div className="bg-purple-900/30 border border-purple-500/40 p-2.5 rounded-sm space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-purple-200">
                        <span className="font-bold flex items-center gap-1">
                          <GripVertical className="h-3.5 w-3.5 text-purple-400" />
                          Werkzeugkasten: Pumpstoß per Drag &amp; Drop auf das Diagramm ziehen
                        </span>
                        <span className="text-[10px] text-purple-300/80 hidden sm:inline">
                          Baustein direkt auf den Editor ziehen
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[1, 2, 3, 5, 8].map((bursts) => (
                          <div
                            key={`lube-drag-item-${bursts}`}
                            draggable={true}
                            onDragStart={(e) => {
                              setIsDraggingLubeTrigger(true);
                              setDraggedLubeBursts(bursts);
                              const lubeData = {
                                isLubeTrigger: true,
                                bursts: bursts,
                              };
                              e.dataTransfer.setData('application/json', JSON.stringify(lubeData));
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onDragEnd={() => {
                              setIsDraggingLubeTrigger(false);
                              setDraggedLubeBursts(null);
                            }}
                            className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-400/60 rounded-sm flex items-center gap-1.5 text-xs font-mono font-bold text-purple-200 cursor-grab active:cursor-grabbing shadow-sm hover:border-purple-300 transition-colors select-none"
                            title={`Ziehe diesen ${bursts}x Pumpstoß-Baustein auf eine beliebige Zeitmarke im Diagramm`}
                          >
                            <Droplet className="h-3.5 w-3.5 text-purple-400" />
                            <span>{bursts}x Pumpstoß</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Impuls-Tabelle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-purple-200">
                        <span className="font-bold">Programmierte Pumpstöße ({lubeTriggers.length})</span>
                        {lubeTriggers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setLubeTriggers([])}
                            className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[10px] cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            Alle löschen
                          </button>
                        )}
                      </div>

                      {lubeTriggers.length === 0 ? (
                        <div className="p-4 bg-purple-950/20 border border-dashed border-purple-500/30 rounded-sm text-center text-xs font-mono text-purple-300/70">
                          Keine Lube-Impulse programmiert. Klicke auf &quot;+ Impuls bei...&quot; oder ziehe einen Baustein auf das Diagramm.
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {lubeTriggers
                            .slice()
                            .sort((a, b) => a.time - b.time)
                            .map((trig) => {
                              const isSelected = selectedLubeTriggerId === trig.id;
                              return (
                                <div
                                  key={trig.id}
                                  className={`flex items-center justify-between p-2 rounded-sm border transition-colors ${
                                    isSelected
                                      ? 'bg-purple-900/50 border-purple-400 shadow-sm'
                                      : 'bg-purple-950/30 border-purple-500/30 hover:bg-purple-950/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedLubeTriggerId(trig.id);
                                        setPlaybackTime(trig.time);
                                      }}
                                      className="font-mono text-xs font-bold text-purple-200 hover:text-purple-100 flex items-center gap-1 cursor-pointer"
                                      title="Playhead zu diesem Zeitpunkt springen"
                                    >
                                      <Clock className="h-3 w-3 text-purple-400" />
                                      <span>{formatHHMMSS(trig.time)}</span>
                                    </button>
                                    <span className="text-[11px] font-mono text-purple-300 bg-purple-900/60 px-1.5 py-0.5 rounded-sm border border-purple-500/40">
                                      💧 {trig.bursts}x Pumpstoß
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => sendLubeCommandToBLE(trig.bursts)}
                                      className="p-1 text-purple-300 hover:text-purple-100 hover:bg-purple-800/60 rounded-sm cursor-pointer"
                                      title="Diesen Impuls sofort manuell testen"
                                    >
                                      <Play className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteLubeTrigger(trig.id)}
                                      className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 rounded-sm cursor-pointer"
                                      title="Diesen Impuls entfernen"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleSectionCard>
              );

            case 'subsections':
              return (
                <CollapsibleSectionCard
                  key="sec-subsections"
                  id="subsections"
                  title="Teilabschnitte & Phasen"
                  subtitle="Strukturiere deine Session in Aufwärm-, Trainings- und Peak-Phasen"
                  icon={Scissors}
                  accentColor="cyan"
                  badge={
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
                      {subsections.length} {subsections.length === 1 ? 'Abschnitt' : 'Abschnitte'}
                    </span>
                  }
                  isForeground={isFg}
                  isCollapsed={isCol}
                  onToggleCollapse={() => toggleSection('subsections')}
                  onToggleForeground={() => toggleForeground('subsections')}
                  onMoveUp={() => moveSection('subsections', 'up')}
                  onMoveDown={() => moveSection('subsections', 'down')}
                  isFirst={isFirst}
                  isLast={isLast}
                  orderIndex={idx + 1}
                  compactSummary={
                    <div className="flex items-center gap-2 text-xs font-mono text-text-dim truncate">
                      {subsections.map((s) => s.name).join(' · ')}
                    </div>
                  }
                >
                  <div className="p-3 pt-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-text-bright uppercase">
                        Definierte Trainings-Phasen
                      </span>
                      <button
                        type="button"
                        onClick={addSubsection}
                        className="px-2 py-1 bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/40 text-brand-cyan rounded-sm text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Neuer Teilabschnitt
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {subsections.map((sub) => {
                        const isZoomed = zoomRange && zoomRange.start === sub.startTime && zoomRange.end === sub.endTime;
                        return (
                          <div
                            key={sub.id}
                            className={`p-2.5 rounded-sm border transition-colors flex items-center justify-between gap-2 ${
                              isZoomed
                                ? 'bg-brand-cyan/10 border-brand-cyan shadow-sm'
                                : 'bg-bg-base border-border-bright/50 hover:border-border-bright'
                            }`}
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                type="text"
                                value={sub.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSubsections((prev) =>
                                    prev.map((s) => (s.id === sub.id ? { ...s, name: val } : s))
                                  );
                                }}
                                placeholder="Name der Phase"
                                className="w-full bg-bg-panel border border-border-bright/60 rounded-sm px-2 py-1 text-xs text-text-bright font-bold focus:outline-none focus:border-brand-cyan"
                              />
                              <div className="flex items-center gap-2 text-[10px] font-mono text-text-dim">
                                <span>{formatHHMMSS(sub.startTime)} – {formatHHMMSS(sub.endTime)}</span>
                                <span className="text-brand-cyan font-bold">
                                  ({Math.round((sub.endTime - sub.startTime) / 1000)}s)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isZoomed) {
                                    setZoomRange(null);
                                  } else {
                                    setZoomRange({ start: sub.startTime, end: sub.endTime });
                                  }
                                }}
                                className={`px-2 py-1 rounded-sm text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                  isZoomed
                                    ? 'bg-brand-cyan text-bg-base'
                                    : 'bg-bg-panel border border-border-dim text-text-dim hover:text-brand-cyan'
                                }`}
                                title={isZoomed ? 'Zoom zurücksetzen' : 'In diese Phase zoomen'}
                              >
                                {isZoomed ? 'Fokussiert' : 'Fokus'}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSubsection(sub.id)}
                                className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 rounded-sm cursor-pointer"
                                title="Phase löschen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleSectionCard>
              );

            case 'savedGroups':
              return (
                <CollapsibleSectionCard
                  key="sec-savedGroups"
                  id="savedGroups"
                  title="Gespeicherte Gruppen & Schnipsel"
                  subtitle="Wiederverwendbare Punktmuster und Session-Snippets per Drag & Drop"
                  icon={Bookmark}
                  accentColor="cyan"
                  badge={
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
                      {savedGroups.length} Vorlagen
                    </span>
                  }
                  isForeground={isFg}
                  isCollapsed={isCol}
                  onToggleCollapse={() => toggleSection('savedGroups')}
                  onToggleForeground={() => toggleForeground('savedGroups')}
                  onMoveUp={() => moveSection('savedGroups', 'up')}
                  onMoveDown={() => moveSection('savedGroups', 'down')}
                  isFirst={isFirst}
                  isLast={isLast}
                  orderIndex={idx + 1}
                  compactSummary={
                    <div className="text-xs font-mono text-text-dim">
                      {savedGroups.length} gespeicherte Bausteine in deiner Bibliothek
                    </div>
                  }
                >
                  <div className="p-3 pt-1 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-text-dim">
                        Ziehe gespeicherte Schnipsel direkt auf das interaktive Diagramm.
                      </span>
                      {onSaveCurrentSelectionAsGroup && (
                        <button
                          type="button"
                          onClick={onSaveCurrentSelectionAsGroup}
                          className="px-2 py-1 bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/40 text-brand-cyan rounded-sm font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FolderPlus className="h-3 w-3" />
                          Auswahl als Vorlage
                        </button>
                      )}
                    </div>

                    {savedGroups.length === 0 ? (
                      <div className="p-4 bg-bg-base border border-dashed border-border-dim rounded-sm text-center text-xs font-mono text-text-dim">
                        Noch keine Gruppen gespeichert. Wähle Punkte im Editor aus und speichere sie als Snippet ab.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {savedGroups.map((group) => (
                          <div
                            key={group.id}
                            draggable={true}
                            onDragStart={(e) => {
                              setDraggedGroup(group);
                              setIsDraggingSnippetOver(true);
                              e.dataTransfer.setData('application/json', JSON.stringify({ isGroup: true, group }));
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onDragEnd={() => {
                              setDraggedGroup(null);
                              setIsDraggingSnippetOver(false);
                            }}
                            className="bg-bg-base border border-border-bright/60 hover:border-brand-cyan/60 p-2.5 rounded-sm cursor-grab active:cursor-grabbing space-y-1.5 transition-colors shadow-sm select-none"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-text-bright font-display truncate">
                                {group.name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSavedGroups((prev) => prev.filter((g) => g.id !== group.id));
                                }}
                                className="p-0.5 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 rounded cursor-pointer"
                                title="Schnipsel löschen"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-text-dim">
                              <span>Dauer: {formatHHMMSS(group.durationMs)}</span>
                              <span className="text-brand-cyan font-bold">
                                {group.data.minDepth.length + group.data.maxDepth.length + group.data.spm.length} Punkte
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleSectionCard>
              );

            case 'strokeMonitor':
              return (
                <CollapsibleSectionCard
                  key="sec-strokeMonitor"
                  id="strokeMonitor"
                  title="Physischer Hub-Monitor (0 – 16.8 cm)"
                  subtitle="Echtzeit-Visualisierung der Schlittenposition und mechanischen Grenzen"
                  icon={Activity}
                  accentColor="cyan"
                  badge={
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
                      {bleStatus === 'connected' ? 'LIVE SYNC' : 'SIMULIERT'}
                    </span>
                  }
                  isForeground={isFg}
                  isCollapsed={isCol}
                  onToggleCollapse={() => toggleSection('strokeMonitor')}
                  onToggleForeground={() => toggleForeground('strokeMonitor')}
                  onMoveUp={() => moveSection('strokeMonitor', 'up')}
                  onMoveDown={() => moveSection('strokeMonitor', 'down')}
                  isFirst={isFirst}
                  isLast={isLast}
                  orderIndex={idx + 1}
                  headerActions={
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-bg-base border border-border-bright px-2 py-0.5 rounded-sm">
                      {formatCm(currentServokEffectivePos)} ({Math.round(currentServokEffectivePos)}%)
                    </span>
                  }
                  compactSummary={
                    <div className="flex items-center gap-3 text-xs font-mono text-text-dim">
                      <span>Position: <strong className="text-brand-cyan font-bold">{formatCm(currentServokEffectivePos)}</strong> ({Math.round(currentServokEffectivePos)}%)</span>
                      <span>Status: <strong className="text-text-bright">{bleStatus === 'connected' ? 'Verbunden' : 'Simuliert'}</strong></span>
                    </div>
                  }
                >
                  <div className="p-3 pt-0">
                    <PhysicalStrokeMonitor
                      targetPositionPct={currentServokEffectivePos}
                      livePositionPct={liveSensorPos}
                      minDepthPct={currentMinDepthVal}
                      maxDepthPct={currentMaxDepthVal}
                      currentSpm={currentSpmVal}
                      smoothness={hardwareSmoothness}
                      isConnected={bleStatus === 'connected'}
                    />
                  </div>
                </CollapsibleSectionCard>
              );

            case 'hardware':
              return (
                <CollapsibleSectionCard
                  key="sec-hardware"
                  id="hardware"
                  title="Hardware-Steuerung & Modi"
                  subtitle="Servok S2 Servomotor-Profile, Drehmoment-Kompensation und Bremsdynamik"
                  icon={Cpu}
                  accentColor="purple"
                  badge={
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold uppercase">
                      {controlMode}
                    </span>
                  }
                  isForeground={isFg}
                  isCollapsed={isCol}
                  onToggleCollapse={() => toggleSection('hardware')}
                  onToggleForeground={() => toggleForeground('hardware')}
                  onMoveUp={() => moveSection('hardware', 'up')}
                  onMoveDown={() => moveSection('hardware', 'down')}
                  isFirst={isFirst}
                  isLast={isLast}
                  orderIndex={idx + 1}
                  compactSummary={
                    <div className="flex items-center gap-3 text-xs font-mono text-text-dim">
                      <span>Modus: <strong className="text-purple-300 font-bold uppercase">{controlMode}</strong></span>
                      <span>Bremsdynamik: <strong className="text-brand-cyan font-bold">{hardwareSmoothness === 1 ? 'Sport (1)' : `${hardwareSmoothness}`}</strong></span>
                      <span>Boost: <strong className="text-emerald-400 font-bold">{speedBoostFactor}x</strong></span>
                    </div>
                  }
                >
                  <div className="p-3 pt-0">
                    <ServokHardwarePanel
                      controlMode={controlMode}
                      onControlModeChange={setControlMode}
                      smoothness={hardwareSmoothness}
                      onSmoothnessChange={setHardwareSmoothness}
                      speedBoostFactor={speedBoostFactor}
                      onSpeedBoostChange={setSpeedBoostFactor}
                      speedCurveMode={speedCurveMode}
                      onSpeedCurveModeChange={setSpeedCurveMode}
                      isConnected={bleStatus === 'connected'}
                      onEmergencyStop={handleEmergencyStop}
                    />
                  </div>
                </CollapsibleSectionCard>
              );

            case 'bluetooth':
              return (
                <CollapsibleSectionCard
                  key="sec-bluetooth"
                  id="bluetooth"
                  title="Hardware-Verbindung (Duo-Bluetooth BLE)"
                  subtitle="Drahtlose Web Bluetooth Verbindung für Hismith Servok S2 & Lube Launcher"
                  icon={Bluetooth}
                  accentColor="emerald"
                  badge={
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm font-bold uppercase ${
                      bleStatus === 'connected'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-bg-panel border border-border-dim text-text-dim'
                    }`}>
                      {bleStatus}
                    </span>
                  }
                  isForeground={isFg}
                  isCollapsed={isCol}
                  onToggleCollapse={() => toggleSection('bluetooth')}
                  onToggleForeground={() => toggleForeground('bluetooth')}
                  onMoveUp={() => moveSection('bluetooth', 'up')}
                  onMoveDown={() => moveSection('bluetooth', 'down')}
                  isFirst={isFirst}
                  isLast={isLast}
                  orderIndex={idx + 1}
                  compactSummary={
                    <div className="flex items-center gap-3 text-xs font-mono text-text-dim">
                      <span>Servok S2: <strong className={bleStatus === 'connected' ? 'text-emerald-400 font-bold' : 'text-text-dim'}>{bleStatus}</strong></span>
                      <span>Lube Launcher: <strong className={lubeBleStatus === 'connected' ? 'text-purple-300 font-bold' : 'text-text-dim'}>{lubeBleStatus}</strong></span>
                    </div>
                  }
                >
                  <div className="p-3 pt-0 space-y-4 font-mono text-xs">
                    {/* Device Cards: Servok S2 & Lube Launcher */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Device 1: Servok S2 */}
                      <div className="bg-bg-base border border-border-bright/50 p-3 rounded-sm space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bluetooth className="h-4 w-4 text-brand-cyan" />
                            <span className="font-bold text-text-bright">Hismith Servok S2</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase ${
                              bleStatus === 'connected'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : bleStatus === 'connecting'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-bg-panel text-text-dim border border-border-dim'
                            }`}
                          >
                            {bleStatus}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-dim">
                          {bleDeviceName ? `Verbunden mit: ${bleDeviceName}` : 'Primärgerät für Stoß- & Härteverlauf'}
                        </p>
                        {bleBatteryLevel !== null && (
                          <div className="text-[10px] text-emerald-400">
                            Akkustand: {bleBatteryLevel}%
                          </div>
                        )}
                        <div>
                          {bleStatus === 'connected' ? (
                            <button
                              type="button"
                              onClick={disconnectBLE}
                              className="w-full py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 rounded-sm font-bold cursor-pointer transition-colors"
                            >
                              Trennen
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={connectBLE}
                              disabled={isScanning}
                              className="w-full py-1.5 bg-brand-cyan/20 hover:bg-brand-cyan/30 border border-brand-cyan/50 text-brand-cyan rounded-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Bluetooth className="h-3.5 w-3.5" />
                              {isScanning ? 'Scanne...' : 'Servok S2 Verbinden'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Device 2: Lube Launcher */}
                      <div className="bg-bg-base border border-border-bright/50 p-3 rounded-sm space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Droplet className="h-4 w-4 text-purple-400" />
                            <span className="font-bold text-text-bright">Lube Launcher</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase ${
                              lubeBleStatus === 'connected'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : lubeBleStatus === 'connecting'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-bg-panel text-text-dim border border-border-dim'
                            }`}
                          >
                            {lubeBleStatus}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-dim">
                          {lubeBleDeviceName ? `Verbunden mit: ${lubeBleDeviceName}` : 'Zweitgerät für automatisierte Gleitmittelstöße'}
                        </p>
                        {lubeBleBatteryLevel !== null && (
                          <div className="text-[10px] text-purple-300">
                            Akkustand: {lubeBleBatteryLevel}%
                          </div>
                        )}
                        <div>
                          {lubeBleStatus === 'connected' ? (
                            <button
                              type="button"
                              onClick={disconnectLubeBLE}
                              className="w-full py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 rounded-sm font-bold cursor-pointer transition-colors"
                            >
                              Trennen
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={connectLubeBLE}
                              disabled={isLubeScanning}
                              className="w-full py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 rounded-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Droplet className="h-3.5 w-3.5" />
                              {isLubeScanning ? 'Scanne...' : 'Lube Launcher Verbinden'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleSectionCard>
              );

            case 'logs':
              return (
                <CollapsibleSectionCard
                  key="sec-logs"
                  id="logs"
                  title="4-Byte BLE Protokoll-Monitor & Sniffer"
                  subtitle="Hexadezimaler Datenstrom und Quittungsprotokollierung in Echtzeit"
                  icon={Terminal}
                  accentColor="cyan"
                  badge={
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-bg-panel text-text-dim border border-border-dim font-bold">
                      {blePacketLogs.length} Pakete
                    </span>
                  }
                  isForeground={isFg}
                  isCollapsed={isCol}
                  onToggleCollapse={() => toggleSection('logs')}
                  onToggleForeground={() => toggleForeground('logs')}
                  onMoveUp={() => moveSection('logs', 'up')}
                  onMoveDown={() => moveSection('logs', 'down')}
                  isFirst={isFirst}
                  isLast={isLast}
                  orderIndex={idx + 1}
                  compactSummary={
                    <div className="text-xs font-mono text-text-dim">
                      {blePacketLogs.length} Pakete erfasst {blePacketLogs.length > 0 ? `(Letztes: ${blePacketLogs[0]?.direction} ${blePacketLogs[0]?.bytes || ''})` : ''}
                    </div>
                  }
                >
                  <div className="p-3 pt-0">
                    <BlePacketMonitor
                      logs={blePacketLogs}
                      onClearLogs={() => setBlePacketLogs([])}
                      isConnected={bleStatus === 'connected'}
                    />
                  </div>
                </CollapsibleSectionCard>
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
