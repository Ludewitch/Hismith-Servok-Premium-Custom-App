/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Activity, 
  Play, 
  Pause,
  ArrowLeft,
  Square, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Bluetooth, 
  Droplet,
  Droplets,
  RefreshCw, 
  Zap, 
  Sliders, 
  HelpCircle, 
  AlertCircle, 
  AlertTriangle,
  ShieldAlert,
  ArrowUpDown, 
  Grid,
  FileText, 
  CheckCircle2, 
  Maximize2,
  Minimize2,
  Flame,
  Undo2,
  Redo2,
  Copy,
  ShieldCheck,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  Layers,
  Move,
  Sparkles,
  Waves,
  Compass,
  Scissors,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Terminal,
  MousePointer,
  BoxSelect,
  Clock,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FolderPlus,
  GripVertical,
  Pencil,
  Save,
  HardDrive,
  Bot,
  Home,
  ExternalLink,
  Settings2,
  Bookmark,
  Settings,
  X,
  Gamepad2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StartScreenView } from './components/StartScreenView';
import { Language, translations, tr } from './i18n/translations';
import { LOCAL_GUIDE_TEXT } from './data/localGuideContent';
import { servokBle } from './services/servokBle';
import { sensoryEngine } from './services/sensoryEngine';
import { gamepadService, ControllerActionId } from './services/gamepadService';
import { ControllerMappingModal } from './components/ControllerMappingModal';
import { PRESET_DEFINITIONS, getPresetById, getAllPresets } from './data/presets';
import { ServokHardwarePanel } from './components/ServokHardwarePanel';
import { PhysicalStrokeMonitor } from './components/PhysicalStrokeMonitor';
import { BlePacketMonitor } from './components/BlePacketMonitor';
import { ControlMode, BlePacketLog } from './types/servok';
import { CollapsibleSectionCard } from './components/CollapsibleSectionCard';
import { PresetCatalogView } from './components/PresetCatalogView';
import { CollapsedSessionMiniature } from './components/CollapsedSessionMiniature';
import { ChangeDurationModal } from './components/ChangeDurationModal';
import { LayoutOrderModal, SectionId, DEFAULT_SECTION_ORDER, SECTION_DEFINITIONS } from './components/LayoutOrderModal';
import { DashboardSections } from './components/DashboardSections';
import { FloatingKillSwitch } from './components/FloatingKillSwitch';
import { OneHandedPadPlayerView } from './components/OneHandedPadPlayerView';
import { SavePresetModal } from './components/SavePresetModal';
import { SettingsModal } from './components/SettingsModal';
import { settingsService } from './services/settingsService';
import {
  SensualSilkShader,
  ThemeSelectorBar,
  ThemeLuminance,
  ThemeTemperature,
} from './components/SensualSilkShader';
import { TRACK_COLORS, TRACK_HEX_BY_KEY } from './constants/trackColors';

// Zeitformatierungs-Hilfsfunktionen (ms <-> hh:mm:ss)
export const formatMsToHms = (ms: number): string => {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export const parseHmsToMs = (hmsStr: string): number => {
  if (!hmsStr) return 5000;
  const parts = hmsStr.trim().split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  } else if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  } else if (parts.length === 1) {
    return parts[0] * 1000;
  }
  return 5000;
};

// Interfaces für Wegpunkte, Snippets und Log-Einträge
export interface SnippetConfig {
  type: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'exponential' | 'bounce';
  amplitude: number;  // 10 bis 100%
  duration: number;   // 200 bis 5000 ms
  cycles: number;     // 1 bis 10 Oszillationen / Schwingungen
  offset: number;     // 0 bis 100% Mittelpunkt
  targetLayer: 'active' | 'minDepth' | 'maxDepth' | 'spm' | 'hardness' | 'all';
}

interface Waypoint {
  id: string;
  time: number; // Zeit in Millisekunden
  pos: number;  // Position in Prozent (0 bis 100)
}

interface Subsection {
  id: string;
  name: string;
  startTime: number; // Startzeit in Millisekunden
  endTime: number;   // Endzeit in Millisekunden
}

export interface LubeTrigger {
  id: string;
  time: number;   // Zeitstempel in ms
  bursts: number; // Anzahl der Pumpstöße (1 bis 10)
}

const ensureWaypointIds = (pts: Array<{ id?: string; time: number; pos: number }>, prefix = 'wp'): Waypoint[] => {
  const mapped = pts.map((pt, idx) => ({
    id: pt.id || `${prefix}-${pt.time}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    time: pt.time,
    pos: pt.pos,
  }));
  if (mapped.length >= 2) {
    const first = mapped[0];
    const last = mapped[mapped.length - 1];
    if (first.time === 0 && last.pos !== first.pos) {
      mapped[mapped.length - 1] = { ...last, pos: first.pos };
    }
  }
  return mapped;
};

const ensureLubeIds = (trigs: Array<{ id?: string; time: number; bursts: number }>): LubeTrigger[] => {
  return trigs.map((trig, idx) => ({
    id: trig.id || `lube-${trig.time}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    time: trig.time,
    bursts: trig.bursts,
  }));
};

interface BleLog {
  timestamp: string;
  bytes: string;
  direction: 'TX' | 'RX' | 'INFO' | 'ERROR';
  description: string;
}

// SVG-Dimensionen-Konstanten für die Diagramm-Mathematik
const SVG_WIDTH = 1200;
const SVG_HEIGHT = 600;
const MARGIN = { top: 40, right: 40, bottom: 60, left: 70 };
const PLOT_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

// Mini-Vorschau SVG Komponente für gespeicherte Gruppen
function GroupMiniPreview({ group }: { group: { layer: string; points: { relTime: number; pos: number; layer?: string }[] } }) {
  const maxRelTime = group.points.length > 0 ? Math.max(...group.points.map((p) => p.relTime), 50) : 100;
  const layersPresent = Array.from(new Set(group.points.map((p) => (p.layer || group.layer) as string)));

  const layerColors: Record<string, string> = TRACK_HEX_BY_KEY;

  return (
    <div className="w-full h-12 bg-bg-base/90 border border-border-dim/80 rounded-sm relative overflow-hidden my-1">
      <svg className="w-full h-full" viewBox="0 0 300 50" preserveAspectRatio="none">
        {/* Subtle grid lines */}
        <line x1="0" y1="12.5" x2="300" y2="12.5" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="0" y1="25" x2="300" y2="25" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="0" y1="37.5" x2="300" y2="37.5" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="2 2" />

        {(layersPresent as string[]).map((lKey: string) => {
          const lPts = group.points.filter((p) => (p.layer || (group.layer !== 'multi' ? group.layer : 'minDepth')) === lKey);
          if (lPts.length === 0) return null;
          const color = (layerColors as Record<string, string>)[lKey] || '#00F0FF';

          const pathD = lPts
            .map((pt, idx) => {
              const x = maxRelTime > 0 ? (pt.relTime / maxRelTime) * 300 : 0;
              const y = 45 - (pt.pos / 100) * 40;
              return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');

          const areaD = `M 0 45 ${lPts
            .map((pt) => {
              const x = maxRelTime > 0 ? (pt.relTime / maxRelTime) * 300 : 0;
              const y = 45 - (pt.pos / 100) * 40;
              return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ')} L ${maxRelTime > 0 ? ((lPts[lPts.length - 1]?.relTime || 0) / maxRelTime) * 300 : 300} 45 Z`;

          return (
            <g key={`preview-l-${lKey}`}>
              <path d={areaD} fill={color} fillOpacity="0.15" />
              <path d={pathD} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              {lPts.map((pt, i) => {
                const cx = maxRelTime > 0 ? (pt.relTime / maxRelTime) * 300 : 0;
                const cy = 45 - (pt.pos / 100) * 40;
                return <circle key={`p-${i}`} cx={cx} cy={cy} r="2" fill="#0A0A0B" stroke={color} strokeWidth="1.25" />;
              })}
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-0.5 right-1 text-[8px] font-mono text-text-dim bg-bg-base/80 px-1 rounded-sm border border-border-dim/50">
        Dauer: {maxRelTime >= 1000 ? `${(maxRelTime / 1000).toFixed(1)}s` : `${maxRelTime}ms`}
      </div>
    </div>
  );
}

const formatHHMMSS = (ms: number) => {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const formatCm = (pct: number): string => {
  const num = typeof pct === 'number' ? pct : parseFloat(String(pct)) || 0;
  const cm = (num / 100) * 16.8;
  const fixed = cm.toFixed(1);
  return fixed.endsWith('.0') ? `${Math.round(cm)} cm` : `${fixed} cm`;
};

export default function App() {
  // --- STATE ---
  const [durationMs, setDurationMs] = useState<number>(60000); // Standardstart 1 Minute (60,000 ms)
  
  // --- HISMITH SERVOK HARDWARE LIMITS ---
  const [servokMinDepth, setServokMinDepth] = useState<number>(0); // Mindesttiefe in %
  const [servokMaxDepth, setServokMaxDepth] = useState<number>(100); // Maximaltiefe in %

  // Freie Textfeld-Eingaben für Min/Max Hub-Prozentzahlen
  const [servokMinInput, setServokMinInput] = useState<string>('0');
  const [servokMaxInput, setServokMaxInput] = useState<string>('100');

  // Sync bei systemseitiger Änderung von servokMinDepth / servokMaxDepth
  useEffect(() => {
    setServokMinInput(servokMinDepth.toString());
  }, [servokMinDepth]);

  useEffect(() => {
    setServokMaxInput(servokMaxDepth.toString());
  }, [servokMaxDepth]);

  // Prüfen und Übernehmen der Min/Max Hub-Prozentzahlen auf Knopfdruck oder Enter
  const handleApplyHubLimits = useCallback(() => {
    let minNum = parseInt(servokMinInput.trim(), 10);
    let maxNum = parseInt(servokMaxInput.trim(), 10);

    const isMinValid = !isNaN(minNum) && minNum >= 0 && minNum <= 100;
    const isMaxValid = !isNaN(maxNum) && maxNum >= 0 && maxNum <= 100;

    if (!isMinValid) {
      minNum = 0;
    }
    if (!isMaxValid) {
      maxNum = 100;
    }

    // Wenn Min >= Max ist (ungültige/unmögliche Konfiguration), springt Min auf 0% und/oder Max auf 100%
    if (minNum >= maxNum) {
      if (!isMinValid && !isMaxValid) {
        minNum = 0;
        maxNum = 100;
      } else if (!isMinValid) {
        minNum = 0;
        if (minNum >= maxNum) maxNum = 100;
      } else if (!isMaxValid) {
        maxNum = 100;
        if (minNum >= maxNum) minNum = 0;
      } else {
        minNum = 0;
        maxNum = 100;
      }
    }

    setServokMinDepth(minNum);
    setServokMaxDepth(maxNum);
    setServokMinInput(minNum.toString());
    setServokMaxInput(maxNum.toString());

    // Wegpunkte an die neuen Grenzen anpassen
    setWaypointsMinDepth((prev) =>
      prev.map((wp) => ({
        ...wp,
        pos: Math.max(minNum, Math.min(maxNum, wp.pos)),
      }))
    );
    setWaypointsMaxDepth((prev) =>
      prev.map((wp) => ({
        ...wp,
        pos: Math.min(maxNum, Math.max(minNum, wp.pos)),
      }))
    );
  }, [servokMinInput, servokMaxInput]);

  // --- VIER INDIVIDUELL EINSTELLBARE GRAPHENLINIEN (BLANKOMODUS) ---
  // Layer 1: Mindesttiefe (%) [Cyan #00F0FF]
  const [waypointsMinDepth, _setWaypointsMinDepth] = useState<Waypoint[]>([
    { id: 'min-start', time: 0, pos: 0 },
    { id: 'min-end', time: 60000, pos: 0 },
  ]);

  // Layer 2: Maximaltiefe (%) [Rot #F43F5E]
  const [waypointsMaxDepth, _setWaypointsMaxDepth] = useState<Waypoint[]>([
    { id: 'max-start', time: 0, pos: 100 },
    { id: 'max-end', time: 60000, pos: 100 },
  ]);

  // Layer 3: Stöße pro Minute (SPM: 0-300) [Emerald Grün #10B981]
  const [waypointsSpm, _setWaypointsSpm] = useState<Waypoint[]>([
    { id: 'spm-start', time: 0, pos: 30 },
    { id: 'spm-end', time: 60000, pos: 30 },
  ]);

  // Layer 4: Stoß-Härte (%) [Amber Gelb #F59E0B]
  const [waypointsHardness, _setWaypointsHardness] = useState<Waypoint[]>([
    { id: 'hrd-start', time: 0, pos: 50 },
    { id: 'hrd-end', time: 60000, pos: 50 },
  ]);

  // Speichert den Grund des automatischen Killswitch-Halts für das Editor-Warnbanner
  const [editorEmergencyAlert, setEditorEmergencyAlert] = useState<string | null>(null);

  // Aktive Bearbeitungsebene ('minDepth' | 'maxDepth' | 'spm' | 'hardness') & Sichtbarkeit
  const [activeCurveLayer, setActiveCurveLayer] = useState<'minDepth' | 'maxDepth' | 'spm' | 'hardness'>('minDepth');
  const [visibleCurves, setVisibleCurves] = useState<{ minDepth: boolean; maxDepth: boolean; spm: boolean; hardness: boolean }>({
    minDepth: true,
    maxDepth: true,
    spm: true,
    hardness: true,
  });

  // Dynamische Helper für die aktuell aktive Bearbeitungsebene
  const waypoints = activeCurveLayer === 'minDepth' 
    ? waypointsMinDepth 
    : activeCurveLayer === 'maxDepth' 
    ? waypointsMaxDepth 
    : activeCurveLayer === 'spm' 
    ? waypointsSpm 
    : waypointsHardness;

  // Playback & Simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const handleEmergencyStopRef = useRef<(customReason?: string) => void>(() => {});

  /**
   * Hardware-Sicherheit: Automatische Kill-Switch-Auslösung bei Spurbearbeitung während laufendem Betrieb
   * Wird im Editor eine Spur verändert oder will man im Editor etwas bearbeiten während die Wiedergabe aktiv ist,
   * wird ZUERST automatisch der Not-Aus ausgelöst, da sonst die Änderung im Editor direkt live auf die laufende Maschine
   * übertragen werden würde.
   */
  const ensureEditorSafeFromRunning = useCallback((actionDesc?: string): boolean => {
    if (isPlayingRef.current) {
      const actionName = actionDesc || 'Spurbearbeitung';
      const reason = `Wiedergabe vor ${actionName} gestoppt (Schutz vor Live-Signalübertragung an die Maschine)`;
      setEditorEmergencyAlert(reason);
      handleEmergencyStopRef.current(reason);
      return true;
    }
    return false;
  }, []);

  // Sichere Setter: Lösen automatisch zuerst den Not-Aus aus, falls ein Programm aktiv läuft
  const setWaypointsMinDepth = useCallback((action: React.SetStateAction<Waypoint[]>) => {
    ensureEditorSafeFromRunning('Mindesttiefen-Spur (Linie 1)');
    _setWaypointsMinDepth(action);
  }, [ensureEditorSafeFromRunning]);

  const setWaypointsMaxDepth = useCallback((action: React.SetStateAction<Waypoint[]>) => {
    ensureEditorSafeFromRunning('Maximaltiefen-Spur (Linie 2)');
    _setWaypointsMaxDepth(action);
  }, [ensureEditorSafeFromRunning]);

  const setWaypointsSpm = useCallback((action: React.SetStateAction<Waypoint[]>) => {
    ensureEditorSafeFromRunning('Tempo/SPM-Spur (Linie 3)');
    _setWaypointsSpm(action);
  }, [ensureEditorSafeFromRunning]);

  const setWaypointsHardness = useCallback((action: React.SetStateAction<Waypoint[]>) => {
    ensureEditorSafeFromRunning('Stoß-Härte-Spur (Linie 4)');
    _setWaypointsHardness(action);
  }, [ensureEditorSafeFromRunning]);

  const setWaypoints = (update: Waypoint[] | ((prev: Waypoint[]) => Waypoint[])) => {
    ensureEditorSafeFromRunning('Kurven-Aktualisierung');
    if (activeCurveLayer === 'minDepth') setWaypointsMinDepth(update);
    else if (activeCurveLayer === 'maxDepth') setWaypointsMaxDepth(update);
    else if (activeCurveLayer === 'spm') setWaypointsSpm(update);
    else setWaypointsHardness(update);
  };

  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x etc.

  // Layout & Benutzerdefinierte Feld-Anordnung / Vordergrund-Fokus States
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(() => {
    try {
      const saved = localStorage.getItem('hismith_servok_section_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validSaved = parsed.filter((id) => (DEFAULT_SECTION_ORDER as string[]).includes(id));
          const combined = [...validSaved];
          DEFAULT_SECTION_ORDER.forEach((id) => {
            if (!combined.includes(id)) combined.push(id);
          });
          return combined as SectionId[];
        }
      }
    } catch (e) {
      console.warn('Could not parse stored section order:', e);
    }
    return DEFAULT_SECTION_ORDER;
  });

  const [hiddenSections, setHiddenSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('hismith_servok_hidden_sections');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { strokeMonitor: true, logs: true };
  });

  const [foregroundSections, setForegroundSections] = useState<Record<string, boolean>>({});
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('hismith_servok_section_order', JSON.stringify(sectionOrder));
    } catch (e) {}
  }, [sectionOrder]);

  useEffect(() => {
    try {
      localStorage.setItem('hismith_servok_hidden_sections', JSON.stringify(hiddenSections));
    } catch (e) {}
  }, [hiddenSections]);

  const toggleForeground = (id: string) => {
    setForegroundSections((prev) => {
      const isNowFg = !prev[id];
      if (isNowFg) {
        setCollapsedSections((c) => ({ ...c, [id]: false }));
      }
      return { ...prev, [id]: isNowFg };
    });
  };

  const moveSection = (id: SectionId, direction: 'up' | 'down') => {
    setSectionOrder((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  const toggleSectionVisibility = (id: SectionId) => {
    setHiddenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetSectionOrder = () => {
    setSectionOrder(DEFAULT_SECTION_ORDER);
    setHiddenSections({});
    showInAppNotification('Standard-Anordnung der Felder wiederhergestellt.', 'info');
  };

  // --- DROSSELUNG / SPEED LIMITER STATES (STANDARD: OHNE DROSSELUNG / 100% MIN-MAX SPM) ---
  const [throttleLevel, setThrottleLevel] = useState<'none' | 'eco_75' | 'half_50' | 'quiet_30' | 'custom_cap'>('none');
  const [throttleCapMax, setThrottleCapMax] = useState<number>(60);
  const [showThrottlePopover, setShowThrottlePopover] = useState<boolean>(false);
  const loopPhaseOffsetRef = useRef<number>(0);

  // --- TURBO-BUTTON (SPM-MULTIPLIKATOR MIT VERZÖGERUNGSFREIER SOFORT-AUSFÜHRUNG) ---
  const [turboActive, setTurboActive] = useState<boolean>(false);
  const [turboMultiplier, setTurboMultiplier] = useState<number>(1.5); // 1.25x, 1.5x, 1.8x, 2.0x
  const [showTurboMenu, setShowTurboMenu] = useState<boolean>(false);

  // Kompatibilitäts-Aliase
  const spmLimiterEnabled = throttleLevel !== 'none';
  const spmLimiterMax = throttleLevel === 'custom_cap' ? throttleCapMax : throttleLevel === 'eco_75' ? 75 : throttleLevel === 'half_50' ? 50 : throttleLevel === 'quiet_30' ? 30 : 100;
  const spmLimiterMode = throttleLevel === 'custom_cap' ? 'hardCap' : 'aliquot';

  // Snapping & Grid-Optionen
  const [gridSnapTime, setGridSnapTime] = useState<number>(100); // in ms (z.B. 100, 250, 500, oder 0 für stufenlos)
  const [gridSnapPos, setGridSnapPos] = useState<number>(5);     // in % (z.B. 5, 10, oder 0 für stufenlos)
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Editor-Werkzeuge & Multiauswahl (Singulär / Multi-Ebene / Schere)
  const [activeEditorTool, setActiveEditorTool] = useState<'pointer' | 'boxSelectSingular' | 'boxSelectMulti' | 'razorCut'>('pointer');
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);

  // Drag & Drop States für Wegpunkte
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  // Box-Auswahl Rubberband Rechteck States
  const [isBoxSelecting, setIsBoxSelecting] = useState<boolean>(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [boxCurrent, setBoxCurrent] = useState<{ x: number; y: number } | null>(null);

  // Maximierter Schwebender Vollbild-Editor State
  const [isEditorMaximized, setIsEditorMaximized] = useState<boolean>(false);

  // Zuklappbare Bereichs-Sektionen (Accordion/Collapsible)
  // Alle sekundären Bereiche sind standardmäßig eingeklappt & im Hintergrund
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    telemetry: true,
    presets: true,
    lube: true,
    subsections: true,
    savedGroups: true,
    strokeMonitor: true,
    hardware: true,
    bluetooth: true,
    logs: true,
    graph: false,
  });

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAllExceptGraph = () => {
    setCollapsedSections({
      telemetry: true,
      presets: true,
      graph: false,
      lube: true,
      subsections: true,
      savedGroups: true,
      strokeMonitor: true,
      hardware: true,
      bluetooth: true,
      logs: true,
    });
    setIsSavedGroupsOpen(false);
  };

  const expandAllSections = () => {
    setCollapsedSections({
      telemetry: false,
      presets: false,
      graph: false,
      lube: false,
      subsections: false,
      savedGroups: false,
      strokeMonitor: false,
      hardware: false,
      bluetooth: false,
      logs: false,
    });
    setIsSavedGroupsOpen(true);
  };

  // --- HISMITH SERVOK HARDWARE BLE CORE STATES ---
  const [controlMode, setControlMode] = useState<ControlMode>('auto_cycle');
  const [hardwareSmoothness, setHardwareSmoothness] = useState<number>(1); // 1 = Sport: Minimale Bremsrampe für sofortige Umkehr & maximale Kadenz
  const [speedBoostFactor, setSpeedBoostFactor] = useState<number>(1.25); // 1.0x, 1.25x (Boost), 1.5x (Sport), 1.8x (Turbo)
  const [speedCurveMode, setSpeedCurveMode] = useState<'linear' | 'torque_boost'>('torque_boost'); // Drehmoment-Kompensation unter 18% PWM
  const [liveSensorPos, setLiveSensorPos] = useState<number | null>(null);
  const [blePacketLogs, setBlePacketLogs] = useState<BlePacketLog[]>([]);

  // --- DYNAMIK-SCHNELLWAHL (SPORT / DYNAMIC / SLOW) ---
  const [activeDynamicsPreset, setActiveDynamicsPreset] = useState<'sport' | 'dynamic' | 'slow' | 'custom'>('dynamic');

  // Startseite Navigation & Modals
  const [currentView, setCurrentView] = useState<'start' | 'padPlayer' | 'presets' | 'editor'>('start'); // Default: Landing / Startseite
  const [showChangeDurationModal, setShowChangeDurationModal] = useState<boolean>(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showControllerModal, setShowControllerModal] = useState<boolean>(false);
  const [isGamepadConnected, setIsGamepadConnected] = useState<boolean>(() =>
    gamepadService.isGamepadConnected()
  );

  useEffect(() => {
    return gamepadService.subscribe((conn) => {
      setIsGamepadConnected(conn);
    });
  }, []);

  // Dynamischer Vorlagen-Zähler
  const [totalPresetCount, setTotalPresetCount] = useState<number>(() => getAllPresets().length);

  useEffect(() => {
    const updateCount = () => setTotalPresetCount(getAllPresets().length);
    window.addEventListener('servok-custom-presets-updated', updateCount);
    return () => window.removeEventListener('servok-custom-presets-updated', updateCount);
  }, []);

  // 4-Farbdesign-System (Dark/Light × Warm/Cold)
  const [themeLuminance, setThemeLuminance] = useState<ThemeLuminance>(
    () => (localStorage.getItem('servok_theme_lum') as ThemeLuminance) || 'dark'
  );
  const [themeTemperature, setThemeTemperature] = useState<ThemeTemperature>(
    () => (localStorage.getItem('servok_theme_temp') as ThemeTemperature) || 'warm'
  );

  useEffect(() => {
    const themeAttr = `${themeLuminance}-${themeTemperature}`;
    document.documentElement.setAttribute('data-theme', themeAttr);
    localStorage.setItem('servok_theme_lum', themeLuminance);
    localStorage.setItem('servok_theme_temp', themeTemperature);
  }, [themeLuminance, themeTemperature]);

  // Synchronisation mit settingsService & Bluetooth Auto-Reconnect beim Start
  useEffect(() => {
    const s = settingsService.getSettings();
    if (s.theme.luminance !== themeLuminance) setThemeLuminance(s.theme.luminance);
    if (s.theme.temperature !== themeTemperature) setThemeTemperature(s.theme.temperature);

    // Auto-Connect beim Start falls konfiguriert
    if (s.bluetooth.autoReconnect) {
      servokBle.attemptAutoReconnect().then((connected) => {
        if (connected) {
          showInAppNotification(`⚡ Automatisch mit ${servokBle.deviceName} verbunden`, 'success');
        }
      });
    }

    const unsub = settingsService.subscribe((updated) => {
      if (updated.theme.luminance !== themeLuminance) setThemeLuminance(updated.theme.luminance);
      if (updated.theme.temperature !== themeTemperature) setThemeTemperature(updated.theme.temperature);
    });
    return unsub;
  }, []);

  const handleLoadPreset = (presetType: string, autoPlay: boolean = false) => {
    const preset = getPresetById(presetType) || PRESET_DEFINITIONS[0];
    if (!preset) return;

    pushHistory();
    setDurationMs(preset.durationMs);
    setWaypointsMinDepth(ensureWaypointIds(preset.waypointsMinDepth, 'min'));
    setWaypointsMaxDepth(ensureWaypointIds(preset.waypointsMaxDepth, 'max'));
    setWaypointsSpm(ensureWaypointIds(preset.waypointsSpm, 'spm'));
    setWaypointsHardness(ensureWaypointIds(preset.waypointsHardness, 'hrd'));
    setLubeTriggers(ensureLubeIds(preset.lubeTriggers));
    setSubsections(preset.subsections as any);

    // Standard: 100% Min-Max SPM ohne Drosselung, Turbo bereit (kann jederzeit zugeschaltet werden)
    setThrottleLevel('none');
    setTurboActive(false);
    setSpeedBoostFactor(1.0);
    setZoomRange(null);
    setSelectedPointIds([]);
    setSelectedPointId(null);

    // Dynamik-Indikator passend zur Preset-Intensität synchronisieren
    if (preset.intensity === 'intense') {
      setActiveDynamicsPreset('sport');
    } else if (preset.intensity === 'soft') {
      setActiveDynamicsPreset('slow');
    } else {
      setActiveDynamicsPreset('dynamic');
    }

    const syncedSmooth = preset.recommendedSmoothness ?? 3;
    setHardwareSmoothness(syncedSmooth);
    if (servokBle.connected) {
      servokBle.setSmoothness(syncedSmooth);
    } else if (bleCharacteristic) {
      const cmdSmooth = 0x09;
      const payloadSmooth = new Uint8Array([0xCC, cmdSmooth, syncedSmooth, (cmdSmooth + syncedSmooth) & 0xFF]);
      writeToBleCharacteristic(bleCharacteristic, payloadSmooth).catch(() => {});
    }

    setPlaybackTime(0);
    if (autoPlay) {
      setIsPlaying(true);
    }
    showInAppNotification(`✓ ${preset.title} (${preset.duration}) geladen`, 'success');
  };

  // Neues Blankes Projekt Modal Dialog State
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  const [blankDurationHms, setBlankDurationHms] = useState<string>('00:01:00'); // Default 1 Min

  // Gespeicherte Punkt-Gruppen (Persistent in LocalStorage)
  const [savedPointGroups, setSavedPointGroups] = useState<{
    id: string;
    name: string;
    layer: 'minDepth' | 'maxDepth' | 'spm' | 'hardness' | 'multi';
    points: { relTime: number; pos: number; layer?: 'minDepth' | 'maxDepth' | 'spm' | 'hardness' }[];
    createdAt: string;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('hismith_saved_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hismith_saved_groups', JSON.stringify(savedPointGroups));
    } catch (err) {
      console.error('LocalStorage save error:', err);
    }
  }, [savedPointGroups]);

  // Ein-/Ausklappbarer Status für die Gespeicherte Gruppen-Seitenleiste am Editor (Standard: eingeklappt)
  const [isSavedGroupsOpen, setIsSavedGroupsOpen] = useState<boolean>(false);

  // Aktuell gezogene Gruppe für Drag & Drop auf Canvas
  const [draggedGroup, setDraggedGroup] = useState<typeof savedPointGroups[0] | null>(null);

  // Modal State für Gruppe Bearbeiten & Ebenen Anpassen
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    name: string;
    points: { relTime: number; pos: number; layer?: 'minDepth' | 'maxDepth' | 'spm' | 'hardness' }[];
    activeLayers: { minDepth: boolean; maxDepth: boolean; spm: boolean; hardness: boolean };
  } | null>(null);

  // --- IN-APP SAVE & LOAD DIALOG STATES ---
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveSessionName, setSaveSessionName] = useState<string>('');
  const [saveTab, setSaveTab] = useState<'app' | 'json' | 'download'>('app');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);
  const [loadTab, setLoadTab] = useState<'app' | 'paste' | 'file'>('app');
  const [pasteContent, setPasteContent] = useState<string>('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Custom In-App Input Prompt Modal (ersetzt window.prompt in iframe)
  const [promptModal, setPromptModal] = useState<{
    title: string;
    label?: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  } | null>(null);
  const [promptInputVal, setPromptInputVal] = useState<string>('');

  // Custom In-App Confirmation Modal (ersetzt window.confirm in iframe)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  // Live In-App Toast Notification Banner (Direkte visuelle Bestätigung im Editor)
  const [appNotification, setAppNotification] = useState<{
    message: string;
    type?: 'success' | 'info' | 'warning';
  } | null>(null);

  const showInAppNotification = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setAppNotification({ message, type });
    setTimeout(() => {
      setAppNotification(null);
    }, 4500);
  };

  // In-App Saved Sessions Library (LocalStorage)
  const [savedInAppSessions, setSavedInAppSessions] = useState<{
    id: string;
    name: string;
    date: string;
    durationMs: number;
    pointsCount: number;
    data: any;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('hismith_inapp_saved_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hismith_inapp_saved_sessions', JSON.stringify(savedInAppSessions));
    } catch (err) {
      console.error('InApp sessions save error:', err);
    }
  }, [savedInAppSessions]);

  // MULTI-STEP UNDO / REDO HISTORY ENGINE
  interface HistorySnapshot {
    waypointsMinDepth: Waypoint[];
    waypointsMaxDepth: Waypoint[];
    waypointsSpm: Waypoint[];
    waypointsHardness: Waypoint[];
    lubeTriggers: LubeTrigger[];
    subsections: Subsection[];
    durationMs: number;
  }

  const [historyStack, setHistoryStack] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Speichert den aktuellen Stand in der Undo/Redo Historie
  const pushHistory = (
    customMinDepth?: Waypoint[],
    customMaxDepth?: Waypoint[],
    customSpm?: Waypoint[],
    customHardness?: Waypoint[],
    customLube?: LubeTrigger[],
    customSubs?: Subsection[],
    customDur?: number
  ) => {
    ensureEditorSafeFromRunning('Spur-Bearbeitung');
    const snapshot: HistorySnapshot = {
      waypointsMinDepth: JSON.parse(JSON.stringify(customMinDepth || waypointsMinDepth)),
      waypointsMaxDepth: JSON.parse(JSON.stringify(customMaxDepth || waypointsMaxDepth)),
      waypointsSpm: JSON.parse(JSON.stringify(customSpm || waypointsSpm)),
      waypointsHardness: JSON.parse(JSON.stringify(customHardness || waypointsHardness)),
      lubeTriggers: JSON.parse(JSON.stringify(customLube || lubeTriggers)),
      subsections: JSON.parse(JSON.stringify(customSubs || subsections)),
      durationMs: customDur !== undefined ? customDur : durationMs,
    };

    setHistoryStack((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      if (sliced.length >= 40) sliced.shift();
      return [...sliced, snapshot];
    });
    setHistoryIndex((prev) => Math.min(39, prev + 1));
  };

  // VORGEFERTIGTE BEWEGUNGS-SNIPPETS (AMPLITUDE, DAUER, OSZILLATION & DRAG-AND-DROP)
  const [snippetConfig, setSnippetConfig] = useState<SnippetConfig>({
    type: 'sine',
    amplitude: 60,
    duration: 1000,
    cycles: 3,
    offset: 50,
    targetLayer: 'active',
  });
  const [isDraggingSnippetOver, setIsDraggingSnippetOver] = useState<boolean>(false);
  const [dragHoverTimeMs, setDragHoverTimeMs] = useState<number | null>(null);

  // Web Bluetooth (BLE) States
  const [bleStatus, setBleStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [bleError, setBleError] = useState<string | null>(null);
  const [bleDevice, setBleDevice] = useState<any | null>(null);
  const [bleCharacteristic, setBleCharacteristic] = useState<any | null>(null);
  const [bleLogs, setBleLogs] = useState<BleLog[]>([
    { timestamp: new Date().toLocaleTimeString(), bytes: '', direction: 'INFO', description: 'BLE-System bereit. Warte auf Verbindung...' }
  ]);
  const [bleModelName, setBleModelName] = useState<string>('Servok Premium Actuator');

  // Protokoll-Modi & Live Sende-Aktivitätsanzeige für Hauptgerät & Zweitgerät
  const [servokProtocol, setServokProtocol] = useState<'universal' | 'servok' | 'hismith_v2' | 'hismith_v3' | 'raw_byte' | 'ascii'>('universal');
  const [lubeProtocol, setLubeProtocol] = useState<'universal' | 'lube_native' | 'hismith_lube' | 'raw_byte' | 'ascii'>('universal');
  const [lastServokTxHex, setLastServokTxHex] = useState<string | null>(null);
  const [lastServokTxTime, setLastServokTxTime] = useState<number>(0);
  const [lastLubeTxHex, setLastLubeTxHex] = useState<string | null>(null);
  const [lastLubeTxTime, setLastLubeTxTime] = useState<number>(0);
  const [manualServokTestPos, setManualServokTestPos] = useState<number>(50);

  // Bluetooth GATT UUIDs (Hismith / General Actuator Platzhalter)
  const [serviceUuid, setServiceUuid] = useState<string>('0000fff0-0000-1000-8000-00805f9b34fb');
  const [charUuid, setCharUuid] = useState<string>('0000fff1-0000-1000-8000-00805f9b34fb');
  
  // Automatisch erkannte GATT UUID Information
  const [autoDetectedInfo, setAutoDetectedInfo] = useState<{
    serviceUuid: string;
    charUuid: string;
    writeType: string;
    candidatesCount: number;
    label: string;
    isAutoDetected: boolean;
  } | null>(null);

  // Synchronisation mit ServokBleService
  useEffect(() => {
    servokBle.setCallbacks(
      (log) => {
        setBlePacketLogs((prev) => [log, ...prev.slice(0, 199)]);
      },
      (status, errorMsg) => {
        setBleStatus(status);
        if (errorMsg) setBleError(errorMsg);
        if (status === 'connected') {
          setBleModelName(servokBle.deviceName || 'Hismith Servok');
          showInAppNotification(`Servok verbunden: ${servokBle.deviceName}`, 'success');
        } else if (status === 'disconnected') {
          showInAppNotification('Servok getrennt', 'info');
        }
      },
      (posPct) => {
        setLiveSensorPos(posPct);
      }
    );
  }, []);

  // LUBE LAUNCHER (ZWEITGERÄT) STATES
  const [lubeTriggers, setLubeTriggers] = useState<LubeTrigger[]>([]);
  const [selectedLubeTriggerId, setSelectedLubeTriggerId] = useState<string | null>(null);
  const [isDraggingLubeTrigger, setIsDraggingLubeTrigger] = useState<boolean>(false);
  const [draggedLubeBursts, setDraggedLubeBursts] = useState<number | null>(null);
  const [manualLubeUntil, setManualLubeUntil] = useState<number>(0);
  const [manualLubeBursts, setManualLubeBursts] = useState<number>(2);

  const [lubeBleStatus, setLubeBleStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lubeBleError, setLubeBleError] = useState<string | null>(null);
  const [lubeBleDevice, setLubeBleDevice] = useState<any | null>(null);
  const [lubeBleCharacteristic, setLubeBleCharacteristic] = useState<any | null>(null);
  const [lubeBleModelName, setLubeBleModelName] = useState<string>('Lube Launcher Pro');
  const [lubeServiceUuid, setLubeServiceUuid] = useState<string>('0000fff0-0000-1000-8000-00805f9b34fb');
  const [lubeCharUuid, setLubeCharUuid] = useState<string>('0000fff2-0000-1000-8000-00805f9b34fb');
  const [lubeAutoDetectedInfo, setLubeAutoDetectedInfo] = useState<{
    serviceUuid: string;
    charUuid: string;
    writeType: string;
    label: string;
    isAutoDetected: boolean;
  } | null>(null);

  // Tracking der bereits gefeuerten Lube-Triggers während Playback
  const firedLubeTriggerIdsRef = useRef<Set<string>>(new Set());
  const lastLubeCheckTimeRef = useRef<number>(0);

  // Sprachauswahl (Language State DE, EN, ES)
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('hismith_lang') as Language) || 'de');
  useEffect(() => {
    localStorage.setItem('hismith_lang', language);
  }, [language]);
  const t = useMemo(() => translations[language] || translations.de, [language]);

  // Sonstige UI States
  const [importError, setImportError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [helpTab, setHelpTab] = useState<'basics' | 'presets' | 'limits' | 'snippets' | 'ble' | 'storage' | 'local' | 'txtfile'>('basics');

  // Teilabschnitte (Subsections) & Zoom
  const [subsections, setSubsections] = useState<Subsection[]>([
    { id: 'sub-main-1', name: 'Hauptabschnitt (00:00:00 - 00:01:00)', startTime: 0, endTime: 60000 },
  ]);
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);

  // Neuer Teilabschnitt Form-Zustand
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubStart, setNewSubStart] = useState<number>(0);
  const [newSubEnd, setNewSubEnd] = useState<number>(1000);

  // Refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sessionFileInputRef = useRef<HTMLInputElement | null>(null);
  const groupFileInputRef = useRef<HTMLInputElement | null>(null);
  const lastBleWriteTimeRef = useRef<number>(0);
  const lastLoggedPosRef = useRef<number>(-1);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // === NEU: Cache für den Smart-Motor, um Befehls-Staus zu verhindern ===
  const lastSmartStateRef = useRef<{ min: number; max: number; spm: number; smoothness: number }>({
    min: -1,
    max: -1,
    spm: -1,
    smoothness: -1,
  });

  // --- SVG-MATHEMATIK UND KOORDINATEN-MAPPING (DEUTSCH KOMMENTIERT) ---

  // Berechne die sichtbare Zeitspanne für den aktuellen Zoom-Zustand
  const viewStart = zoomRange ? zoomRange.start : 0;
  const viewEnd = zoomRange ? zoomRange.end : durationMs;
  const viewWidth = viewEnd - viewStart;
  
  /**
   * Wandelt die logische Zeit (0 bis durationMs) in die entsprechende X-Koordinate des SVG um.
   * Berücksichtigt den Zoom-Bereich, den linken Rand (MARGIN.left) und skaliert relativ zum Plot-Bereich.
   */
  const toSvgX = (time: number): number => {
    return MARGIN.left + ((time - viewStart) / viewWidth) * PLOT_WIDTH;
  };

  /**
   * Wandelt die logische Position (0% bis 100%) in die entsprechende Y-Koordinate des SVG um.
   * Da im SVG die Y-Koordinate von oben (0) nach unten verläuft, müssen wir das System invertieren:
   * 100% (oben) entspricht MARGIN.top.
   * 0% (unten) entspricht MARGIN.top + PLOT_HEIGHT.
   */
  const toSvgY = (pos: number): number => {
    return MARGIN.top + PLOT_HEIGHT - (pos / 100) * PLOT_HEIGHT;
  };

  /**
   * Wandelt eine rohe SVG-X-Koordinate zurück in die logische Zeit (in Millisekunden).
   * Berücksichtigt den Zoom-Bereich und limitiert auf [0, durationMs].
   */
  const fromSvgX = (x: number): number => {
    const rawTime = viewStart + ((x - MARGIN.left) / PLOT_WIDTH) * viewWidth;
    return Math.max(0, Math.min(durationMs, rawTime));
  };

  /**
   * Wandelt eine rohe SVG-Y-Koordinate zurück in die logische Hub-Position (0% bis 100%).
   * Durch Invertierung wird die Höhe korrekt zurückgewandelt und auf [0, 100] limitiert.
   */
  const fromSvgY = (y: number): number => {
    const rawPos = ((MARGIN.top + PLOT_HEIGHT - y) / PLOT_HEIGHT) * 100;
    return Math.max(0, Math.min(100, rawPos));
  };

  // --- PLAYBACK ENGINE ---
  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
      
      const tick = (now: number) => {
        const delta = now - lastFrameTimeRef.current;
        lastFrameTimeRef.current = now;

        setPlaybackTime((prevTime) => {
          let nextTime = prevTime + delta * playbackSpeed;
          if (nextTime >= durationMs) {
            if (loopEnabled) {
              // Phasen-Kontinuität für perfekten nahtlosen Loop ohne Bewegungssprung
              loopPhaseOffsetRef.current = getIntegratedPhase(durationMs);
              return nextTime % durationMs;
            } else {
              setIsPlaying(false);
              return durationMs;
            }
          }
          return nextTime;
        });

        animationFrameRef.current = requestAnimationFrame(tick);
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, durationMs, loopEnabled, playbackSpeed]);

  // Automatisches Mitziehen des Sichtfensters (Auto-Scroll) während der Wiedergabe bei vergrößertem Zoom
  useEffect(() => {
    if (isPlaying && zoomRange) {
      const viewW = zoomRange.end - zoomRange.start;
      if (playbackTime > zoomRange.end || playbackTime < zoomRange.start) {
        let newStart = playbackTime - viewW * 0.15;
        let newEnd = newStart + viewW;
        if (newStart < 0) {
          newStart = 0;
          newEnd = viewW;
        }
        if (newEnd > durationMs) {
          newEnd = durationMs;
          newStart = Math.max(0, durationMs - viewW);
        }
        setZoomRange({ start: newStart, end: newEnd });
      }
    }
  }, [isPlaying, playbackTime, zoomRange, durationMs]);

  // Performance-optimierte lineare Interpolation ohne Array-Allokationen oder Sortierung im Loop
  const getInterpolatedVal = (pts: Waypoint[], t: number): number => {
    if (!pts || pts.length === 0) return 0;
    if (pts.length === 1) return pts[0].pos;
    if (t <= pts[0].time) return pts[0].pos;
    if (t >= pts[pts.length - 1].time) return pts[pts.length - 1].pos;

    // Binäre Suche im bereits sortierten Array
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

  // Interpolierte Werte für Mindesttiefe (Linie 1) & Maximaltiefe (Linie 2) in %
  const currentMinDepthVal = useMemo(() => {
    const raw = getInterpolatedVal(waypointsMinDepth, playbackTime);
    return Math.round(Math.max(servokMinDepth, Math.min(servokMaxDepth, raw)));
  }, [waypointsMinDepth, playbackTime, servokMinDepth, servokMaxDepth]);

  const currentMaxDepthVal = useMemo(() => {
    const raw = getInterpolatedVal(waypointsMaxDepth, playbackTime);
    return Math.round(Math.min(servokMaxDepth, Math.max(servokMinDepth, raw)));
  }, [waypointsMaxDepth, playbackTime, servokMinDepth, servokMaxDepth]);

  // Aktuelle Hubspanne in % (Differenz zwischen Max- und Min-Tiefe)
  const currentHubSpanPct = useMemo(() => {
    return Math.abs(currentMaxDepthVal - currentMinDepthVal);
  }, [currentMaxDepthVal, currentMinDepthVal]);

  // Basis-Frequenz der Hardware für gegebene Hubspanne (Standard ohne künstliche Verzerrungen):
  // Vollhub (100%): 120 SPM, 50% Hub: 240 SPM, bis max. 600 SPM (10 Hz physikalisches Hardware-Limit)
  const calcBasePhysicalMaxSpm = useCallback((spanPct: number): number => {
    const span = Math.max(15, Math.min(100, spanPct));
    return Math.min(600, Math.round(12000 / span));
  }, []);

  // Für Abwärtskompatibilität:
  const calcMaxSpmForSpan = calcBasePhysicalMaxSpm;

  const maxSpmForHub = useMemo(() => {
    return Math.round(calcBasePhysicalMaxSpm(currentHubSpanPct));
  }, [calcBasePhysicalMaxSpm, currentHubSpanPct]);

  // Maximaler ungedrosselter SPM-Wert des geladenen Skripts (Peak Frequenz im zeitlichen Verlauf)
  const maxScriptSpm = useMemo(() => {
    if (!waypointsSpm || waypointsSpm.length === 0) return 100;
    let maxFound = 0;
    for (const wp of waypointsSpm) {
      const spmPct = wp.pos;
      const minVal = Math.max(servokMinDepth, Math.min(servokMaxDepth, getInterpolatedVal(waypointsMinDepth, wp.time)));
      const maxVal = Math.min(servokMaxDepth, Math.max(servokMinDepth, getInterpolatedVal(waypointsMaxDepth, wp.time)));
      const span = Math.max(15, Math.abs(maxVal - minVal));
      const basePhysicalMax = calcBasePhysicalMaxSpm(span);
      const rawSpm = (spmPct / 100) * basePhysicalMax;
      if (rawSpm > maxFound) maxFound = rawSpm;
    }
    return Math.max(10, Math.round(maxFound));
  }, [waypointsSpm, waypointsMinDepth, waypointsMaxDepth, servokMinDepth, servokMaxDepth, calcBasePhysicalMaxSpm]);

  // KLARE, UNKOMPLIZIERTE SPM-BERECHNUNG:
  // 1. Basis: Min-Max SPM läuft als Standard 100% voll ohne Drosselung
  // 2. Drosselungsschalter (Eco 75%, Halblast 50%, Sanft 30%, oder fester Cap)
  // 3. Turbobutton (SPM-Multiplikator 1.25x - 2.0x bis zum maschinellen Limit 600 SPM)
  const getSpmAtTime = useCallback((t: number): number => {
    if (!waypointsSpm || waypointsSpm.length === 0) return 0;
    const spmPct = getInterpolatedVal(waypointsSpm, t);
    
    const minVal = Math.max(servokMinDepth, Math.min(servokMaxDepth, getInterpolatedVal(waypointsMinDepth, t)));
    const maxVal = Math.min(servokMaxDepth, Math.max(servokMinDepth, getInterpolatedVal(waypointsMaxDepth, t)));
    const span = Math.max(15, Math.abs(maxVal - minVal));
    const basePhysicalMax = calcBasePhysicalMaxSpm(span);

    // 1. Ungedrosselte Basis-Frequenz (Standard ohne Drosselung)
    let spm = (spmPct / 100) * basePhysicalMax;

    // 2. Drosselung (Standard ist 'none' = 100% ungedrosselt)
    if (throttleLevel === 'eco_75') {
      spm *= 0.75;
    } else if (throttleLevel === 'half_50') {
      spm *= 0.50;
    } else if (throttleLevel === 'quiet_30') {
      spm *= 0.30;
    } else if (throttleLevel === 'custom_cap') {
      spm = Math.min(spm, throttleCapMax);
    }

    // 3. Turbo-Multiplikator (erhöht die echten SPM verzögerungsfrei)
    if (turboActive) {
      spm *= turboMultiplier;
    }

    // 4. Maschinelle Grenze: 600 SPM (10 Hz)
    return Math.max(0, Math.min(600, spm));
  }, [waypointsSpm, waypointsMinDepth, waypointsMaxDepth, servokMinDepth, servokMaxDepth, calcBasePhysicalMaxSpm, throttleLevel, throttleCapMax, turboActive, turboMultiplier]);

  // Stöße pro Minute (automatisch skaliert als Prozentsatz von maxSpmForHub):
  const currentSpmVal = useMemo(() => {
    return Math.round(getSpmAtTime(playbackTime));
  }, [getSpmAtTime, playbackTime]);

  // Stoß-Härte (0 - 100 %):
  const currentHardnessVal = useMemo(() => {
    return Math.round(getInterpolatedVal(waypointsHardness, playbackTime));
  }, [waypointsHardness, playbackTime]);

  // Dynamische BLE-Smoothness (Register 0x09: 0 bis 10), nahtlos gekoppelt an die Härte-Linie:
  // 100% Härte -> 0 (Sport: sofortige Umkehr ohne Bremsrampe für maximale Kadenz)
  // 0% Härte   -> 10 (Sanft: maximale S-Kurven-Rampe für weichen Umkehrpunkt)
  const currentDynamicSmoothness = useMemo(() => {
    return Math.max(0, Math.min(10, Math.round(((100 - currentHardnessVal) / 100) * 10)));
  }, [currentHardnessVal]);

  /**
   * Integrierte Phase für die Oszillation der Kolbenbewegung zwischen Mindesttiefe und Maximaltiefe.
   * Kontinuierliche Integration der Frequenz (SPM) über die Zeit verhindert Phasensprünge bei SPM-Änderungen & Nahtlos-Loops!
   */
  const getIntegratedPhase = (t: number): number => {
    if (!waypointsSpm || waypointsSpm.length === 0) return 0;
    let totalPhase = loopPhaseOffsetRef.current;
    const pts = waypointsSpm;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      if (t <= p1.time) break;

      const spm1 = getSpmAtTime(p1.time);
      const endTime = Math.min(t, p2.time);
      const dt = endTime - p1.time;

      if (dt > 0) {
        const spm2 = getSpmAtTime(endTime);
        const avgSpm = (spm1 + spm2) / 2;
        totalPhase += 2 * Math.PI * (avgSpm / 60000) * dt;
      }

      if (t <= p2.time) break;
    }

    const lastPt = pts[pts.length - 1];
    if (t > lastPt.time) {
      const spm = getSpmAtTime(t);
      const dt = t - lastPt.time;
      totalPhase += 2 * Math.PI * (spm / 60000) * dt;
    }

    return totalPhase;
  };

  // Roh-Echtzeit-Position des Kolbens (Oszillation zwischen Mindesttiefe und Maximaltiefe als Rechteck/Trapez)
  const currentRawDepth = useMemo(() => {
    const minD = getInterpolatedVal(waypointsMinDepth, playbackTime);
    const maxD = getInterpolatedVal(waypointsMaxDepth, playbackTime);
    if (currentSpmVal === 0) return minD;

    // Integrierte Phase in Radianten (0 bis 2*PI pro SPM-Zyklus)
    const rawPhase = getIntegratedPhase(playbackTime);
    const phase = ((rawPhase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Härte-Wert (0 bis 100 %):
    // 100 % = Nahezu instantane Rechteckflanke (sehr steiler Anstieg minD -> maxD)
    // 0 % = Dreieckswelle (stetiger linearer Übergang über den gesamten Halbzyklus)
    const hardnessFactor = Math.max(0, Math.min(100, currentHardnessVal)) / 100;
    
    // Anstiegsbreite alpha im Bereich (0, PI] Radianten:
    // Bei Härte=100%: alpha = 0.02 * PI (2% der Halbperiode als Flanke)
    // Bei Härte=0%: alpha = 1.0 * PI (100% der Halbperiode als Dreieck)
    const alpha = Math.PI * (1 - 0.98 * hardnessFactor);

    let normPos = 0; // 0 = minD, 1 = maxD
    if (phase < Math.PI) {
      // Erster Halbzyklus: Bewegung von Min zu Max
      if (phase < alpha) {
        normPos = phase / alpha;
      } else {
        normPos = 1; // Plateausegment bei Max
      }
    } else {
      // Zweiter Halbzyklus: Rückbewegung von Max zu Min
      const phase2 = phase - Math.PI;
      if (phase2 < alpha) {
        normPos = 1 - (phase2 / alpha);
      } else {
        normPos = 0; // Plateausegment bei Min
      }
    }

    // Positionsberechnung zwischen Mindesttiefe und Maximaltiefe
    const rawVal = minD + normPos * (maxD - minD);
    return Math.max(0, Math.min(100, rawVal));
  }, [waypointsMinDepth, waypointsMaxDepth, waypointsSpm, waypointsHardness, playbackTime, currentSpmVal, currentHardnessVal]);

  // Effektiv eingestellte Servok-Tiefe unter Berücksichtigung der Hardware-Schranken (servokMinDepth & servokMaxDepth):
  const currentServokEffectivePos = useMemo(() => {
    return servokMinDepth + (currentRawDepth / 100) * (servokMaxDepth - servokMinDepth);
  }, [currentRawDepth, servokMinDepth, servokMaxDepth]);

  // Abwärtskompatible Referenz für den Kolbensimulator
  const currentInterpolatedPos = currentServokEffectivePos;

  // Aktiver Lube-Auswurf in der Live-Simulation (Spiegelung der Trigger im Editor & Test-Stöße live)
  const activeLubeTrigger = useMemo(() => {
    // 1. Manuell ausgelöster Test-Stoß hat Vorrang
    if (manualLubeUntil > Date.now()) {
      return { isFiring: true, bursts: manualLubeBursts };
    }
    // 2. Während der Wiedergabe / Vorschau: Auslöser aus den Lube-Triggern im Editor spiegeln
    const activeTrig = lubeTriggers.find((trig) => {
      const sprayDuration = Math.max(700, trig.bursts * 350);
      return playbackTime >= trig.time && playbackTime <= trig.time + sprayDuration;
    });

    if (activeTrig) {
      return { isFiring: true, bursts: activeTrig.bursts };
    }

    return { isFiring: false, bursts: 0 };
  }, [playbackTime, lubeTriggers, manualLubeUntil, manualLubeBursts]);

  // Telemetrie-Berechnungen & Mess-Skalierung für Servok S2
  const [telemetryScaleRatio, setTelemetryScaleRatio] = useState<number>(16.8);

  const servokTelemetry = useMemo(() => {
    const strokeSpanPct = Math.max(1, Math.abs(currentMaxDepthVal - currentMinDepthVal));
    const strokeSpanMm = (strokeSpanPct / 100) * (telemetryScaleRatio * 10);
    const strokesPerSec = currentSpmVal / 60;
    const speedMmS = Math.round(2 * strokesPerSec * strokeSpanMm);
    const speedPct = Math.min(100, Math.round((speedMmS / 1000) * 100));
    const accelMms2 = Math.round(speedMmS * (strokesPerSec * 4));
    const pwmDutyCycle = Math.round((currentSpmVal / 300) * 100);
    const estimatedCurrentMa = Math.round(250 + (pwmDutyCycle / 100) * 1800);
    return {
      speedMmS,
      speedPct,
      accelMms2,
      estimatedCurrentMa,
      pwmDutyCycle,
    };
  }, [currentMinDepthVal, currentMaxDepthVal, currentSpmVal, telemetryScaleRatio]);

  // Teilabschnitte erstellen & löschen
  const addSubsection = (startMs?: number, endMs?: number, name?: string) => {
    ensureEditorSafeFromRunning('Abschnitt-Erstellung');
    const s = typeof startMs === 'number' ? startMs : playbackTime;
    const e = typeof endMs === 'number' ? endMs : Math.min(durationMs, s + 10000);
    const newSub: Subsection = {
      id: 'sub-' + Date.now(),
      name: name || `Abschnitt ${subsections.length + 1}`,
      startTime: Math.round(s),
      endTime: Math.round(e),
    };
    setSubsections((prev) => [...prev, newSub].sort((a, b) => a.startTime - b.startTime));
    addLog('INFO', `Neuer Teilabschnitt "${newSub.name}" erstellt.`);
  };

  const deleteSubsection = (id: string) => {
    ensureEditorSafeFromRunning('Abschnitt-Entfernung');
    setSubsections((prev) => prev.filter((s) => s.id !== id));
    addLog('INFO', 'Teilabschnitt entfernt.');
  };

  // Hardware Not-Aus (Kill-Switch: Spacebar Desktop / 3-Finger-Touch Mobile / Floating Button)
  const handleEmergencyStop = useCallback((customReason?: string) => {
    setIsPlaying(false);
    sensoryEngine.playEmergencyAlert();
    sensoryEngine.hapticEmergencyStop();
    gamepadService.triggerRumble(0.8, 0.9, 450);
    if (servokBle.connected) {
      servokBle.emergencyStop();
    }
    if (bleCharacteristic) {
      const killPayload = new Uint8Array([0xCC, 0x02, 0x00, 0x02]);
      const zeroSpeedPayload = new Uint8Array([0xCC, 0x03, 0x00, 0x03]);
      writeToBleCharacteristic(bleCharacteristic, killPayload).catch(() => {});
      writeToBleCharacteristic(bleCharacteristic, zeroSpeedPayload).catch(() => {});
    }
    const msg = customReason 
      ? `🛑 NOT-AUS: ${customReason}`
      : '⚠️ KILL-SWITCH AKTIVIERT: Alle Antriebe sofort gestoppt (0x020002)!';
    showInAppNotification(msg, 'warning');
    addLog('ERROR', customReason ? `🛑 KILL-SWITCH: ${customReason}` : '⚠️ KILL-SWITCH / NOT-AUS ausgeführt (0xCC 0x02 0x00 0x02).');
  }, [bleCharacteristic]);

  useEffect(() => {
    handleEmergencyStopRef.current = handleEmergencyStop;
  }, [handleEmergencyStop]);

  // Screen Wake Lock Persistence & Start/Stop Sub-Bass Audio Feedback + Immersive Rhythmic Synthesis
  const prevIsPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    sensoryEngine.syncWakeLock(isPlaying);
    if (isPlaying && !prevIsPlayingRef.current) {
      sensoryEngine.playStartDrop();
      sensoryEngine.hapticPresetChange();
      sensoryEngine.startSessionRhythm({
        spm: currentSpmVal,
        minDepth: currentMinDepthVal,
        maxDepth: currentMaxDepthVal,
        hardness: currentHardnessVal,
      });
    } else if (!isPlaying && prevIsPlayingRef.current) {
      sensoryEngine.playStopDrop();
      sensoryEngine.stopSessionRhythm();
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Live audio synchronization during playback (both in simulated and Bluetooth mode)
  useEffect(() => {
    if (isPlaying) {
      sensoryEngine.updateSessionParams(
        currentSpmVal,
        currentMinDepthVal,
        currentMaxDepthVal,
        currentHardnessVal
      );
    }
  }, [isPlaying, playbackTime, currentSpmVal, currentMinDepthVal, currentMaxDepthVal, currentHardnessVal]);

  // Global Physical Emergency Stop Listener (Desktop Fail-Safe außerhalb von Editor/Pad)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // In Editor oder Pad greift die konfigurierbare Gamepad/Tastatur-Schnittstelle
      if (currentView === 'editor' || currentView === 'padPlayer') return;
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        handleEmergencyStop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleEmergencyStop, currentView]);

  // --- SCROLLBAR PANNING & DRAGGING (FLIEßENDES SCROLLEN ALTLANG DER ZEITACHSE) ---
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState<boolean>(false);
  const scrollbarTrackRef = useRef<HTMLDivElement | null>(null);

  const panViewRange = (deltaMs: number) => {
    const currentSpan = viewWidth;
    let newStart = viewStart + deltaMs;
    let newEnd = newStart + currentSpan;

    if (newStart < 0) {
      newStart = 0;
      newEnd = Math.min(durationMs, currentSpan);
    }
    if (newEnd > durationMs) {
      newEnd = durationMs;
      newStart = Math.max(0, durationMs - currentSpan);
    }

    setZoomRange(newStart === 0 && newEnd >= durationMs ? null : { start: newStart, end: newEnd });
  };

  const handleScrollbarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const track = scrollbarTrackRef.current;
    if (!track) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }
    setIsDraggingScrollbar(true);

    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetCenterTime = clickRatio * durationMs;

    // Set playhead position directly on scrollbar click/drag
    setPlaybackTime(targetCenterTime);

    if (viewWidth < durationMs) {
      const halfWidth = viewWidth / 2;
      let newStart = targetCenterTime - halfWidth;
      let newEnd = newStart + viewWidth;

      if (newStart < 0) {
        newStart = 0;
        newEnd = Math.min(durationMs, viewWidth);
      }
      if (newEnd > durationMs) {
        newEnd = durationMs;
        newStart = Math.max(0, durationMs - viewWidth);
      }

      setZoomRange(newStart === 0 && newEnd >= durationMs ? null : { start: newStart, end: newEnd });
    }
  };

  const handleScrollbarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrollbar) return;
    const track = scrollbarTrackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetCenterTime = clickRatio * durationMs;

    // Smoothly scrub playhead position while dragging
    setPlaybackTime(targetCenterTime);

    if (viewWidth < durationMs) {
      const halfWidth = viewWidth / 2;
      let newStart = targetCenterTime - halfWidth;
      let newEnd = newStart + viewWidth;

      if (newStart < 0) {
        newStart = 0;
        newEnd = Math.min(durationMs, viewWidth);
      }
      if (newEnd > durationMs) {
        newEnd = durationMs;
        newStart = Math.max(0, durationMs - viewWidth);
      }

      setZoomRange(newStart === 0 && newEnd >= durationMs ? null : { start: newStart, end: newEnd });
    }
  };

  const handleScrollbarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingScrollbar(false);
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  };

  /**
   * Dynamische Formatierung der Zeitachse basierend auf dem sichtbaren Zeitfenster (viewWidth):
   * - Zoom bis max. 10s (<=10000ms): Anzeige in Sekunden mit Dezimalstelle (z.B. 2.5s)
   * - Zoom bis 1 Min (<=60000ms): Anzeige in Sekunden (s)
   * - Zoom ab 1 Min (>60000ms): Anzeige in Minuten (min / m:ss)
   */
  const formatTimeTick = (timeMs: number, viewWidthMs: number): string => {
    const rounded = Math.round(timeMs);
    if (viewWidthMs <= 10000) {
      const sec = rounded / 1000;
      const isWhole = Number.isInteger(sec);
      return isWhole ? `${sec}s` : `${sec.toFixed(1)}s`;
    } else if (viewWidthMs <= 60000) {
      const sec = rounded / 1000;
      const isWhole = Number.isInteger(sec);
      return isWhole ? `${sec}s` : `${sec.toFixed(1)}s`;
    } else {
      const totalSec = Math.round(rounded / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      if (secs === 0) {
        return `${mins} min`;
      }
      return `${mins}:${secs < 10 ? '0' : ''}${secs} min`;
    }
  };

  // Berechne hochauflösende Rasterlinien (Ticks) für das ganze ZWD
  const gridTicks = useMemo(() => {
    // Y-Achse (Hubposition 0% bis 100%): Rasterlinien alle 2%, Major-Linien alle 10%
    const yTicks: number[] = [];
    for (let val = 0; val <= 100; val += 2) {
      yTicks.push(val);
    }

    // X-Achse (Zeitstempel): Dynamisch angepasst an den sichtbaren Bereich (viewWidth)
    let gridTimeStep = 100;
    let minorDivider = 5;

    if (viewWidth <= 10000) {
      // Tier 1: Bis maximal 10 Sekunden (Anzeige in ms)
      if (viewWidth > 5000) { gridTimeStep = 1000; minorDivider = 5; }      // 1000ms Ticks
      else if (viewWidth > 2500) { gridTimeStep = 500; minorDivider = 5; }  // 500ms Ticks
      else if (viewWidth > 1000) { gridTimeStep = 250; minorDivider = 5; }  // 250ms Ticks
      else if (viewWidth > 500) { gridTimeStep = 100; minorDivider = 5; }   // 100ms Ticks
      else if (viewWidth > 200) { gridTimeStep = 50; minorDivider = 5; }    // 50ms Ticks
      else if (viewWidth > 100) { gridTimeStep = 20; minorDivider = 4; }    // 20ms Ticks
      else { gridTimeStep = 10; minorDivider = 5; }                         // 10ms Ticks
    } else if (viewWidth <= 60000) {
      // Tier 2: Bis 1 Minute (Anzeige in Sekunden)
      if (viewWidth > 40000) { gridTimeStep = 10000; minorDivider = 5; }    // 10s Ticks
      else if (viewWidth > 20000) { gridTimeStep = 5000; minorDivider = 5; } // 5s Ticks
      else { gridTimeStep = 2000; minorDivider = 4; }                       // 2s Ticks
    } else {
      // Tier 3: Ab 1 Minute (Anzeige in Minuten)
      if (viewWidth > 3600000) { gridTimeStep = 600000; minorDivider = 5; }   // 10 Min Ticks
      else if (viewWidth > 1800000) { gridTimeStep = 300000; minorDivider = 5; }// 5 Min Ticks
      else if (viewWidth > 600000) { gridTimeStep = 120000; minorDivider = 4; } // 2 Min Ticks
      else if (viewWidth > 300000) { gridTimeStep = 60000; minorDivider = 4; }  // 1 Min Ticks
      else if (viewWidth > 120000) { gridTimeStep = 30000; minorDivider = 3; }  // 30 Sek Ticks (0:30 min)
      else { gridTimeStep = 15000; minorDivider = 3; }                         // 15 Sek Ticks (0:15 min)
    }

    const minorStep = gridTimeStep / minorDivider;

    const majorTicks: number[] = [];
    const startMajor = Math.floor(viewStart / gridTimeStep) * gridTimeStep;
    for (let t = startMajor; t <= viewEnd + gridTimeStep; t += gridTimeStep) {
      if (t >= viewStart - 0.1 && t <= viewEnd + 0.1) {
        majorTicks.push(t);
      }
    }

    const minorTicks: number[] = [];
    const startMinor = Math.floor(viewStart / minorStep) * minorStep;
    for (let t = startMinor; t <= viewEnd + minorStep; t += minorStep) {
      if (t >= viewStart - 0.1 && t <= viewEnd + 0.1) {
        const epsilon = 0.001;
        const isCloseToMajor = majorTicks.some(mt => Math.abs(mt - t) < epsilon);
        if (!isCloseToMajor) {
          minorTicks.push(t);
        }
      }
    }

    return { yTicks, majorTicks, minorTicks, gridTimeStep };
  }, [viewStart, viewEnd, viewWidth]);

   // --- WEGPOINT HANDLING ---

  // Klick / MouseDown auf den SVG-Hintergrund (Werkzeugabhängig: Zeiger, Boxauswahl oder Razor Cut)
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedPointId || e.button !== 0) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;

    // Nur innerhalb des Plotbereichs reagieren
    if (
      clickX < MARGIN.left - 10 || 
      clickX > SVG_WIDTH - MARGIN.right + 10 ||
      clickY < MARGIN.top - 10 || 
      clickY > SVG_HEIGHT - MARGIN.bottom + 10
    ) return;

    // Maschinenschutz: Wenn ein Programm läuft und im Editor auf den Graph geklickt wird, sofort Killswitch auslösen!
    if (isPlayingRef.current) {
      ensureEditorSafeFromRunning('Klick auf Graph-Editor');
      return;
    }

    const timeAtClick = fromSvgX(clickX);

    // 1. WERKZEUG: ABSCHNITT ZERSCHNEIDEN (RAZOR CUT)
    if (activeEditorTool === 'razorCut') {
      ensureEditorSafeFromRunning('Abschnitt-Zerschneidung');
      splitSubsectionAtTime(timeAtClick);
      return;
    }

    // 2. WERKZEUG: BOXAUSWAHL / RUBBERBAND (Singulär oder Multi)
    if (activeEditorTool === 'boxSelectSingular' || activeEditorTool === 'boxSelectMulti' || e.shiftKey) {
      setIsBoxSelecting(true);
      setBoxStart({ x: clickX, y: clickY });
      setBoxCurrent({ x: clickX, y: clickY });
      return;
    }

    // 3. WERKZEUG: PUNKT-ZEIGER (Standard neuen Wegpunkt setzen)
    ensureEditorSafeFromRunning('Hinzufügen neuer Wegpunkte');
    let time = timeAtClick;
    let pos = fromSvgY(clickY);

    if (gridSnapTime > 0) time = Math.round(time / gridSnapTime) * gridSnapTime;
    else time = Math.round(time / 100) * 100;

    if (gridSnapPos > 0) pos = Math.round(pos / gridSnapPos) * gridSnapPos;

    pushHistory();
    const newPoint: Waypoint = {
      id: 'wp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      time: Math.max(0, Math.min(durationMs, Math.round(time))),
      pos: Math.round(pos * 10) / 10,
    };

    setWaypoints((prev) => [...prev, newPoint].sort((a, b) => a.time - b.time));
    setSelectedPointIds([newPoint.id]);
    setSelectedPointId(newPoint.id);
    setPlaybackTime(newPoint.time);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isBoxSelecting || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const currentY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;
    setBoxCurrent({ x: currentX, y: currentY });
  };

  const handleSvgMouseUp = () => {
    if (isBoxSelecting && boxStart && boxCurrent) {
      const minX = Math.min(boxStart.x, boxCurrent.x);
      const maxX = Math.max(boxStart.x, boxCurrent.x);
      const minY = Math.min(boxStart.y, boxCurrent.y);
      const maxY = Math.max(boxStart.y, boxCurrent.y);

      const isMulti = activeEditorTool === 'boxSelectMulti';
      let selectedIds: string[] = [];

      if (isMulti) {
        // Collect points from ALL visible layers
        const layerList: { key: 'minDepth' | 'maxDepth' | 'spm' | 'hardness'; pts: Waypoint[] }[] = [
          { key: 'minDepth', pts: waypointsMinDepth },
          { key: 'maxDepth', pts: waypointsMaxDepth },
          { key: 'spm', pts: waypointsSpm },
          { key: 'hardness', pts: waypointsHardness },
        ];
        layerList.forEach(({ key, pts }) => {
          if (visibleCurves[key]) {
            pts.forEach((wp) => {
              const cx = toSvgX(wp.time);
              const cy = toSvgY(wp.pos);
              if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
                selectedIds.push(wp.id);
              }
            });
          }
        });
      } else {
        // Singulär: select only from current active layer
        waypoints.forEach((wp) => {
          const cx = toSvgX(wp.time);
          const cy = toSvgY(wp.pos);
          if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
            selectedIds.push(wp.id);
          }
        });
      }

      setSelectedPointIds(selectedIds);
      if (selectedIds.length > 0) setSelectedPointId(selectedIds[0]);

      setIsBoxSelecting(false);
      setBoxStart(null);
      setBoxCurrent(null);
      if (selectedIds.length > 0) {
        addLog('INFO', `Boxauswahl (${isMulti ? 'Multi-Ebene' : 'Singulär'}): ${selectedIds.length} Punkte markiert.`);
      }
    }
  };

  // Pointer-Move Handler für Drag & Drop (Unified Mouse/Touch via Pointer Capture)
  const handleWaypointPointerMove = (e: React.PointerEvent<SVGCircleElement>, pointId: string) => {
    if (draggedPointId !== pointId) return;
    ensureEditorSafeFromRunning('Wegpunkt-Verschiebung');

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    // X und Y auf das SVG-Koordinatensystem skalieren
    const svgX = ((clientX - rect.left) / rect.width) * SVG_WIDTH;
    const svgY = ((clientY - rect.top) / rect.height) * SVG_HEIGHT;

    let time = fromSvgX(svgX);
    let pos = fromSvgY(svgY);

    // Snapping anwenden
    if (gridSnapTime > 0) {
      time = Math.round(time / gridSnapTime) * gridSnapTime;
    } else {
      time = Math.round(time / 100) * 100;
    }
    if (gridSnapPos > 0) {
      pos = Math.round(pos / gridSnapPos) * gridSnapPos;
    }

    // Grenzwerte limitieren
    time = Math.max(0, Math.min(durationMs, Math.round(time)));
    pos = Math.max(0, Math.min(100, Math.round(pos * 10) / 10));

    // Verschieben einer kompletten ausgewählten Gruppe / Segments von Wegpunkten
    if (selectedPointIds.length > 1 && selectedPointIds.includes(pointId)) {
      let currentWp: Waypoint | undefined;
      const allLayers = [waypointsMinDepth, waypointsMaxDepth, waypointsSpm, waypointsHardness];
      for (const layer of allLayers) {
        const found = layer.find((w) => w.id === pointId);
        if (found) {
          currentWp = found;
          break;
        }
      }

      if (currentWp) {
        const deltaTime = time - currentWp.time;
        const deltaPos = pos - currentWp.pos;

        if (deltaTime !== 0 || deltaPos !== 0) {
          const shiftPts = (pts: Waypoint[]) =>
            pts.map((wp) => {
              if (selectedPointIds.includes(wp.id)) {
                return {
                  ...wp,
                  time: Math.max(0, Math.min(durationMs, Math.round(wp.time + deltaTime))),
                  pos: Math.max(0, Math.min(100, Math.round((wp.pos + deltaPos) * 10) / 10)),
                };
              }
              return wp;
            }).sort((a, b) => a.time - b.time);

          setWaypointsMinDepth(shiftPts);
          setWaypointsMaxDepth(shiftPts);
          setWaypointsSpm(shiftPts);
          setWaypointsHardness(shiftPts);
        }
      }
    } else {
      // Einzelner Punkt verschieben (in allen Ebenen prüfen für nahtloses Dragging)
      const updateSinglePt = (pts: Waypoint[]) => {
        if (!pts.some((wp) => wp.id === pointId)) return pts;
        const updated = pts.map((wp) => (wp.id === pointId ? { ...wp, time, pos } : wp));
        return [...updated].sort((a, b) => a.time - b.time);
      };
      setWaypointsMinDepth(updateSinglePt);
      setWaypointsMaxDepth(updateSinglePt);
      setWaypointsSpm(updateSinglePt);
      setWaypointsHardness(updateSinglePt);
    }

    // Live-Übertragung/Synchronisierung der Position an die Simulation und das Bluetooth-Modul beim Verschieben
    setPlaybackTime(time);
  };

  // Löscht einen Wegpunkt anhand seiner ID (über alle Ebenen hinweg mit Undo-History)
  const deleteWaypoint = (id: string) => {
    ensureEditorSafeFromRunning('Löschen eines Wegpunkts');
    pushHistory();
    setWaypointsMinDepth((prev) => prev.filter((wp) => wp.id !== id));
    setWaypointsMaxDepth((prev) => prev.filter((wp) => wp.id !== id));
    setWaypointsSpm((prev) => prev.filter((wp) => wp.id !== id));
    setWaypointsHardness((prev) => prev.filter((wp) => wp.id !== id));
    setSelectedPointIds((prev) => prev.filter((pid) => pid !== id));
    if (selectedPointId === id) setSelectedPointId(null);
  };

  // Aktualisiert einen Wert manuell über das Eingabefeld in der Datentabelle
  const handleManualValueChange = (id: string, field: 'time' | 'pos', val: number) => {
    ensureEditorSafeFromRunning('manueller Wertänderung');
    let sanitizedVal = val;
    if (field === 'time') {
      sanitizedVal = Math.max(0, Math.min(durationMs, Math.round(val / 100) * 100));
    } else {
      sanitizedVal = Math.max(0, Math.min(100, Math.round(val * 10) / 10));
    }

    setWaypoints((prev) => {
      const updated = prev.map((wp) => {
        if (wp.id === id) {
          const updatedWp = { ...wp, [field]: sanitizedVal };
          // Setze playbackTime auf die Zeit des geänderten Punkts, damit das Kolbendiagramm und die Live-Übertragung reagieren
          setPlaybackTime(updatedWp.time);
          return updatedWp;
        }
        return wp;
      });
      return [...updated].sort((a, b) => a.time - b.time);
    });
  };

  // --- SNIPPET GENERATOR & DRAG-AND-DROP LOGIK ---

  /**
   * Generiert mathematisch präzise Wegpunkte für ein konfigurierte Snippet
   * (Amplitude %, Dauer ms, Oszillationen/Cycles, Mittelpunkt-Offset %)
   */
  const generateSnippetWaypoints = (config: SnippetConfig, startTimeMs: number): Waypoint[] => {
    const { type, amplitude, duration, cycles, offset } = config;
    const pts: Waypoint[] = [];
    
    // Abtastpunkte pro Oszillation berechnen
    const pointsPerCycle = 12;
    const totalPoints = Math.max(8, Math.min(120, Math.round(cycles * pointsPerCycle)));
    const stepMs = duration / totalPoints;

    for (let i = 0; i <= totalPoints; i++) {
      const relativeTime = i * stepMs;
      const tMs = Math.round(startTimeMs + relativeTime);
      const progress = relativeTime / duration; // 0.0 bis 1.0
      const phase = progress * cycles * 2 * Math.PI;

      let pos = offset;
      const halfAmp = amplitude / 2;

      switch (type) {
        case 'sine':
          pos = offset + halfAmp * Math.sin(phase);
          break;
        case 'triangle': {
          const cycleProgress = (progress * cycles) % 1;
          if (cycleProgress < 0.5) {
            pos = offset - halfAmp + amplitude * (cycleProgress * 2);
          } else {
            pos = offset + halfAmp - amplitude * ((cycleProgress - 0.5) * 2);
          }
          break;
        }
        case 'square': {
          const cycleProgress = (progress * cycles) % 1;
          pos = cycleProgress < 0.5 ? offset + halfAmp : offset - halfAmp;
          break;
        }
        case 'sawtooth': {
          const cycleProgress = (progress * cycles) % 1;
          pos = offset - halfAmp + amplitude * cycleProgress;
          break;
        }
        case 'exponential': {
          // Crescendo Burst: Exponentieller Anstieg der Amplitude über die Dauer
          const ampFactor = Math.pow(progress, 1.4);
          pos = offset + halfAmp * ampFactor * Math.sin(phase);
          break;
        }
        case 'bounce': {
          // Gedämpfter Impuls / Bounce
          const decay = Math.exp(-progress * 2.2);
          pos = offset + halfAmp * decay * Math.abs(Math.cos(phase));
          break;
        }
      }

      // Begrenzung auf 0 - 100 %
      pos = Math.max(0, Math.min(100, Math.round(pos * 10) / 10));

      pts.push({
        id: `snip-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        time: tMs,
        pos,
      });
    }

    return pts;
  };

  /**
   * Fügt ein konfiguriertes Snippet zu einer gegebenen Zeit in die gewählte Linie / Ebene ein
   */
  const insertSnippetAtTime = (config: SnippetConfig, targetTimeMs: number) => {
    ensureEditorSafeFromRunning('Einfügen eines Snippets');
    const newPts = generateSnippetWaypoints(config, targetTimeMs);
    const snippetEndTime = targetTimeMs + config.duration;

    // Zeitachse automatisch erweitern, falls Snippet über das Ende hinausreicht
    if (snippetEndTime > durationMs) {
      setDurationMs(Math.ceil(snippetEndTime / 500) * 500);
    }

    const mergeIntoLayer = (prevPts: Waypoint[]) => {
      // Vorhandene Wegpunkte im exakten Einfüge-Fenster entfernen, um saubere Schnittstellen zu garantieren
      const filtered = prevPts.filter(p => p.time < targetTimeMs || p.time > snippetEndTime);
      const combined = [...filtered, ...newPts];
      return combined.sort((a, b) => a.time - b.time);
    };

    const target = config.targetLayer;
    if (target === 'active') {
      setWaypoints(mergeIntoLayer);
    } else if (target === 'minDepth') {
      setWaypointsMinDepth(mergeIntoLayer);
    } else if (target === 'maxDepth') {
      setWaypointsMaxDepth(mergeIntoLayer);
    } else if (target === 'spm') {
      setWaypointsSpm(mergeIntoLayer);
    } else if (target === 'hardness') {
      setWaypointsHardness(mergeIntoLayer);
    } else if (target === 'all') {
      setWaypointsMinDepth(mergeIntoLayer);
      setWaypointsMaxDepth(mergeIntoLayer);
      setWaypointsSpm(mergeIntoLayer);
      setWaypointsHardness(mergeIntoLayer);
    }

    const layerLabel = target === 'active' 
      ? (activeCurveLayer === 'minDepth' ? 'Linie 1 (Mindesttiefe)' : activeCurveLayer === 'maxDepth' ? 'Linie 2 (Maximaltiefe)' : activeCurveLayer === 'spm' ? 'Linie 3 (SPM)' : 'Linie 4 (Härte)') 
      : target === 'all' ? 'Alle 4 Linien' : target;

    addLog(
      'INFO',
      `Snippet "${config.type.toUpperCase()}" (${config.amplitude}% Amp, ${config.duration}ms, ${config.cycles} Oszillationen) in ${layerLabel} bei ${Math.round(targetTimeMs)}ms platziert.`
    );
  };

  // Drag & Drop Handler für Snippet Drop auf SVG Canvas
  const handleDragSnippetOver = (e: React.DragEvent<HTMLDivElement | SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingSnippetOver(true);

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    let hoverTime = fromSvgX(svgX);

    if (gridSnapTime > 0) {
      hoverTime = Math.round(hoverTime / gridSnapTime) * gridSnapTime;
    } else {
      hoverTime = Math.round(hoverTime / 50) * 50;
    }
    hoverTime = Math.max(0, Math.min(durationMs, Math.round(hoverTime)));
    setDragHoverTimeMs(hoverTime);
  };

  const handleDropSnippet = (e: React.DragEvent<HTMLDivElement | SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSnippetOver(false);

    const dropTime = dragHoverTimeMs !== null ? dragHoverTimeMs : playbackTime;

    // 1. Prüfen, ob ein Lube-Impuls (Pumpstoß) gedroppt wurde
    let isLubeDrop = false;
    let lubeBursts = draggedLubeBursts || 2;

    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (parsed.isLubeTrigger) {
          isLubeDrop = true;
          if (parsed.bursts) lubeBursts = parsed.bursts;
        }
      }
    } catch {
      // Ignoriere JSON Parse Fehler
    }

    if (!isLubeDrop && e.dataTransfer.getData('text/plain')?.startsWith('lube:')) {
      const burstStr = e.dataTransfer.getData('text/plain').replace('lube:', '');
      lubeBursts = parseInt(burstStr, 10) || 2;
      isLubeDrop = true;
    }

    if (isLubeDrop) {
      addLubeTrigger(dropTime, lubeBursts);
      setIsDraggingLubeTrigger(false);
      setDraggedLubeBursts(null);
      setDragHoverTimeMs(null);
      setDraggedGroup(null);
      return;
    }

    // 2. Prüfen, ob eine gespeicherte Punktgruppe gedroppt wurde
    let isGroupDrop = false;
    let targetGroup = draggedGroup;

    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (parsed.isGroup && parsed.group) {
          isGroupDrop = true;
          targetGroup = parsed.group;
        } else if (parsed.groupId) {
          isGroupDrop = true;
          targetGroup = savedPointGroups.find((g) => g.id === parsed.groupId) || null;
        }
      }
    } catch {
      // Ignoriere JSON Parse Fehler
    }

    if (!isGroupDrop && e.dataTransfer.getData('text/plain')?.startsWith('group:')) {
      const grpId = e.dataTransfer.getData('text/plain').replace('group:', '');
      targetGroup = savedPointGroups.find((g) => g.id === grpId) || null;
      if (targetGroup) isGroupDrop = true;
    }

    if (isGroupDrop && targetGroup) {
      insertSavedGroupAtTime(targetGroup, dropTime);
    } else {
      let config: SnippetConfig = snippetConfig;
      try {
        const json = e.dataTransfer.getData('application/json');
        if (json) {
          const parsed = JSON.parse(json);
          if (parsed.type) config = parsed;
        }
      } catch (err) {
        console.warn('Drop JSON error:', err);
      }
      insertSnippetAtTime(config, dropTime);
    }

    setDraggedGroup(null);
    setDragHoverTimeMs(null);
  };

  // --- BULK OPERATORS & PRESETS ---

  // Standardwellen generieren
  const generatePreset = (type: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'flat-up' | 'flat-down') => {
    const pts: Waypoint[] = [];
    const steps = 8; // Anzahl der Kontrollpunkte über die Dauer
    const interval = durationMs / steps;

    for (let i = 0; i <= steps; i++) {
      const t = Math.round((i * interval) / 100) * 100;
      let p = 50;

      if (type === 'sine') {
        // Schöne Sinuswelle von 10% bis 90%
        p = Math.round(50 + 40 * Math.sin((i / steps) * Math.PI * 4));
      } else if (type === 'triangle') {
        // Dreieckswelle hoch und runter
        const cycle = i % 4;
        if (cycle === 0) p = 10;
        else if (cycle === 1) p = 50;
        else if (cycle === 2) p = 90;
        else if (cycle === 3) p = 50;
      } else if (type === 'square') {
        // Rechteck-Pulse
        p = i % 2 === 0 ? 10 : 90;
      } else if (type === 'sawtooth') {
        // Sägezahn (schnelles Hoch, langsames Abfallen)
        p = (i % 2 === 0) ? 90 : 10;
      } else if (type === 'flat-up') {
        p = Math.round((i / steps) * 100);
      } else if (type === 'flat-down') {
        p = Math.round(100 - (i / steps) * 100);
      }

      pts.push({
        id: String(Date.now()) + i + Math.random().toString(36).substr(2, 2),
        time: t,
        pos: p
      });
    }

    setWaypoints(pts.sort((a, b) => a.time - b.time));
    addLog('INFO', `Preset "${type.toUpperCase()}" erfolgreich generiert.`);
  };

  // Alle Punkte horizontal spiegeln (Invertieren der Positionen)
  const invertPositions = () => {
    setWaypoints((prev) => 
      prev.map((wp) => ({ ...wp, pos: Math.round((100 - wp.pos) * 10) / 10 }))
    );
    addLog('INFO', 'Positions-Werte invertiert (0% <-> 100%).');
  };

  // Timeline umdrehen (Rückwärts abspielen)
  const reverseTimeline = () => {
    setWaypoints((prev) => {
      const reversed = prev.map((wp) => ({
        ...wp,
        time: durationMs - wp.time
      }));
      return reversed.sort((a, b) => a.time - b.time);
    });
    addLog('INFO', 'Bewegungs-Skript zeitlich umgekehrt (gespiegelt).');
  };

  // Nachträgliches Ändern der Session-Dauer (Proportional skalieren oder am Ende verlängern/kürzen)
  const handleApplyAdjustDuration = (newDuration: number, mode: 'scale' | 'pad_crop' = 'scale') => {
    if (newDuration < 1000 || newDuration === durationMs) return;
    ensureEditorSafeFromRunning('Dauer-Anpassung / Skalierung');
    pushHistory();
    const oldDuration = durationMs;

    if (mode === 'scale') {
      const factor = oldDuration > 0 ? newDuration / oldDuration : 1;

      const scaleList = (pts: Waypoint[]): Waypoint[] => {
        if (!pts || pts.length === 0) return [];
        return pts.map((wp, idx) => {
          let t = Math.round((wp.time * factor) / 50) * 50;
          if (idx === 0 && wp.time === 0) t = 0;
          if (idx === pts.length - 1 && wp.time >= oldDuration) t = newDuration;
          t = Math.max(0, Math.min(newDuration, t));
          return { ...wp, time: t };
        }).sort((a, b) => a.time - b.time);
      };

      setWaypointsMinDepth(prev => scaleList(prev));
      setWaypointsMaxDepth(prev => scaleList(prev));
      setWaypointsSpm(prev => scaleList(prev));
      setWaypointsHardness(prev => scaleList(prev));
      setWaypoints(prev => scaleList(prev));

      setLubeTriggers(prev =>
        prev.map(trig => ({
          ...trig,
          time: Math.max(0, Math.min(newDuration, Math.round((trig.time * factor) / 50) * 50)),
        })).sort((a, b) => a.time - b.time)
      );

      setSubsections(prev =>
        prev.map(sub => ({
          ...sub,
          startTime: Math.max(0, Math.min(newDuration, Math.round((sub.startTime * factor) / 50) * 50)),
          endTime: Math.max(0, Math.min(newDuration, Math.round((sub.endTime * factor) / 50) * 50)),
        }))
      );
    } else {
      // pad_crop Modus: Bestehende Zeitstempel bleiben exakt unverändert
      const adjustList = (pts: Waypoint[]): Waypoint[] => {
        if (!pts || pts.length === 0) return [];
        if (newDuration < oldDuration) {
          // Verkürzen: Punkte jenseits newDuration abschneiden und Endpunkt anlegen
          const valAtEnd = getInterpolatedVal(pts, newDuration);
          const valid = pts.filter(w => w.time < newDuration);
          valid.push({
            id: `crop-end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            time: newDuration,
            pos: Math.round(valAtEnd),
          });
          return valid.sort((a, b) => a.time - b.time);
        } else {
          // Verlängern: Letzten Wert als Endpunkt an newDuration anhängen, falls noch keiner da ist
          const last = pts[pts.length - 1];
          if (last && last.time < newDuration) {
            return [
              ...pts,
              {
                id: `ext-end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                time: newDuration,
                pos: last.pos,
              },
            ].sort((a, b) => a.time - b.time);
          }
          return pts;
        }
      };

      setWaypointsMinDepth(prev => adjustList(prev));
      setWaypointsMaxDepth(prev => adjustList(prev));
      setWaypointsSpm(prev => adjustList(prev));
      setWaypointsHardness(prev => adjustList(prev));
      setWaypoints(prev => adjustList(prev));

      setLubeTriggers(prev => prev.filter(trig => trig.time <= newDuration));

      setSubsections(prev => {
        if (newDuration < oldDuration) {
          const valid = prev
            .filter(sub => sub.startTime < newDuration)
            .map(sub => ({
              ...sub,
              endTime: Math.min(newDuration, sub.endTime),
            }));
          if (valid.length === 0) {
            return [{ id: `sub-crop-${Date.now()}`, name: 'Hauptabschnitt', startTime: 0, endTime: newDuration }];
          }
          return valid;
        } else {
          return prev.map((sub, idx) => {
            if (idx === prev.length - 1 && sub.endTime >= oldDuration) {
              return { ...sub, endTime: newDuration };
            }
            return sub;
          });
        }
      });
    }

    if (playbackTime > newDuration) {
      setPlaybackTime(newDuration);
    }
    setZoomRange(null);
    setDurationMs(newDuration);
    addLog(
      'INFO',
      `Session-Dauer nachträglich auf ${formatHHMMSS(newDuration)} (${mode === 'scale' ? 'proportional skaliert' : 'angepasst'}) geändert.`
    );
    showInAppNotification(
      `Session-Dauer auf ${formatHHMMSS(newDuration)} ${mode === 'scale' ? 'skaliert' : 'geändert'}!`,
      'success'
    );
  };

  // --- EXPORT & IMPORT ---

  // Exportiert Wegpunkte als .fun oder .csv
  const exportFile = (format: 'fun' | 'csv') => {
    if (waypoints.length === 0) {
      alert('Bitte füge zuerst Wegpunkte hinzu, um ein Skript zu exportieren!');
      return;
    }

    // Sortieren zur Sicherheit
    const sorted = [...waypoints].sort((a, b) => a.time - b.time);

    // Erstelle den Dateiinhalt im geforderten Format "Zeit,Position"
    const fileContent = sorted
      .map((wp) => `${wp.time},${Math.round(wp.pos)}`)
      .join('\n');

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Dateiendung zuweisen (.fun ist Standard für viele Aktuator-Skripte)
    link.download = `hismith_script_${durationMs}ms.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog('INFO', `Skript erfolgreich exportiert als: hismith_script_${durationMs}ms.${format}`);
  };

  // Datei Import (.fun oder .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const lines = content.split('\n');
        const loadedPoints: Waypoint[] = [];
        let maxTime = 0;

        lines.forEach((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return; // Leere Zeilen überspringen

          const parts = trimmed.split(/[,;]/); // Komma oder Semikolon als Trenner
          if (parts.length >= 2) {
            const timeVal = parseInt(parts[0], 10);
            const posVal = parseFloat(parts[1]);

            if (!isNaN(timeVal) && !isNaN(posVal)) {
              const roundedTime = Math.round(timeVal / 100) * 100;
              loadedPoints.push({
                id: String(Date.now()) + idx + Math.random().toString(36).substr(2, 2),
                time: roundedTime,
                pos: Math.max(0, Math.min(100, posVal))
              });
              if (roundedTime > maxTime) maxTime = roundedTime;
            }
          }
        });

        if (loadedPoints.length === 0) {
          throw new Error('Keine gültigen Datenpunkte im Format "Zeit,Position" gefunden.');
        }

        // Wenn die importierte Zeit größer ist als die aktuelle Dauer, passe die Dauer automatisch an
        if (maxTime > durationMs) {
          setDurationMs(maxTime);
        }

        // Sortiert setzen
        setWaypoints(loadedPoints.sort((a, b) => a.time - b.time));
        addLog('INFO', `${loadedPoints.length} Wegpunkte erfolgreich aus "${file.name}" geladen.`);
        showInAppNotification(`📂 Session "${file.name}" mit ${loadedPoints.length} Wegpunkten erfolgreich geöffnet!`, 'success');
        setShowLoadModal(false);
      } catch (err: any) {
        setImportError(err.message || 'Fehler beim Parsen der Datei.');
        addLog('ERROR', `Importfehler: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // --- SESSION EXPORT & IMPORT (GANZE SESSION) ---

  // Hilfsfunktion: Session-Objekt erstellen
  const getSessionDataObject = () => ({
    version: '1.0',
    type: 'hismith_servok_session',
    timestamp: new Date().toISOString(),
    durationMs,
    subsections,
    waypoints: {
      minDepth: waypointsMinDepth,
      maxDepth: waypointsMaxDepth,
      spm: waypointsSpm,
      hardness: waypointsHardness,
    },
    lubeTriggers,
    servokSettings: {
      minDepth: servokMinDepth,
      maxDepth: servokMaxDepth,
    },
    savedPointGroups,
  });

  // Öffnet das In-App Speichern Fenster
  const openSaveModal = () => {
    const defaultName = `Session_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}_${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }).replace(':', 'u')}`;
    setSaveSessionName(defaultName);
    setSaveNotice(null);
    setCopySuccess(false);
    setShowSaveModal(true);
  };

  // Direct In-App Saving in LocalStorage Library
  const saveCurrentSessionToApp = (nameStr: string) => {
    const sessionData = getSessionDataObject();
    const totalPts = waypointsMinDepth.length + waypointsMaxDepth.length + waypointsSpm.length + waypointsHardness.length;
    const cleanName = nameStr.trim() || `Session_${new Date().toLocaleDateString('de-DE')}`;
    
    const newEntry = {
      id: 'sess-' + Date.now(),
      name: cleanName,
      date: new Date().toLocaleString('de-DE'),
      durationMs,
      pointsCount: totalPts,
      data: sessionData,
    };

    setSavedInAppSessions((prev) => [newEntry, ...prev]);
    setSaveNotice(`✓ Session "${cleanName}" wurde direkt in der App gesichert!`);
    addLog('INFO', `💾 Session "${cleanName}" im App-Speicher gesichert (${totalPts} Punkte, ${Math.round(durationMs/1000)}s).`);
  };

  const deleteInAppSession = (id: string) => {
    const sess = savedInAppSessions.find((s) => s.id === id);
    const sessName = sess ? `"${sess.name}"` : 'diese Session';
    setConfirmModal({
      title: 'Session Löschen',
      message: `Möchtest du ${sessName} wirklich unwiderruflich aus der Bibliothek löschen?`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'danger',
      onConfirm: () => {
        setSavedInAppSessions((prev) => prev.filter((s) => s.id !== id));
        showInAppNotification('Session aus Bibliothek gelöscht.', 'info');
        addLog('INFO', `In-App gespeicherte Session ${sessName} gelöscht.`);
      },
    });
  };

  // In-App Laden von Daten-Objekt
  const loadSessionFromData = (data: any, nameStr: string) => {
    try {
      pushHistory();
      if (data.durationMs) setDurationMs(data.durationMs);
      if (Array.isArray(data.subsections) && data.subsections.length > 0) {
        setSubsections(data.subsections);
      }
      if (data.waypoints?.minDepth) setWaypointsMinDepth(data.waypoints.minDepth);
      if (data.waypoints?.maxDepth) setWaypointsMaxDepth(data.waypoints.maxDepth);
      if (data.waypoints?.spm) setWaypointsSpm(data.waypoints.spm);
      if (data.waypoints?.hardness) setWaypointsHardness(data.waypoints.hardness);
      if (data.servokSettings) {
        if (typeof data.servokSettings.minDepth === 'number') setServokMinDepth(data.servokSettings.minDepth);
        if (typeof data.servokSettings.maxDepth === 'number') setServokMaxDepth(data.servokSettings.maxDepth);
      }
      if (Array.isArray(data.savedPointGroups) && data.savedPointGroups.length > 0) {
        setSavedPointGroups((prev) => {
          const existingIds = new Set(prev.map((g) => g.id));
          const newGroups = data.savedPointGroups.filter((g: any) => !existingIds.has(g.id));
          return [...prev, ...newGroups];
        });
      }
      setSelectedPointIds([]);
      setPlaybackTime(0);
      addLog('INFO', `📂 Session "${nameStr}" erfolgreich geladen.`);
      showInAppNotification(`📂 Session "${nameStr}" erfolgreich im Editor geladen!`, 'success');
    } catch (err: any) {
      addLog('ERROR', `Fehler beim Laden der Session: ${err.message}`);
    }
  };

  // Handler für eingefügten Code (Paste) im In-App Laden Modal
  const handlePastedContentImport = () => {
    if (!pasteContent.trim()) return;
    setPasteError(null);
    try {
      const trimmed = pasteContent.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const data = JSON.parse(trimmed);
        if (data.type === 'hismith_servok_session' || data.waypoints) {
          loadSessionFromData(data, 'Eingefügter JSON Code');
          setPasteContent('');
          setShowLoadModal(false);
          return;
        } else if (data.type === 'hismith_servok_group' || data.type === 'hismith_servok_groups_bundle' || data.group || data.groups) {
          importGroupData(data, 'Eingefügter Code');
          setPasteContent('');
          setShowLoadModal(false);
          return;
        }
      }

      // CSV Fallback
      const lines = trimmed.split('\n');
      const loadedPoints: Waypoint[] = [];
      let maxTime = 0;

      lines.forEach((line, idx) => {
        const lineTrim = line.trim();
        if (!lineTrim) return;
        const parts = lineTrim.split(/[,;]/);
        if (parts.length >= 2) {
          const timeVal = parseInt(parts[0], 10);
          const posVal = parseFloat(parts[1]);
          if (!isNaN(timeVal) && !isNaN(posVal)) {
            const roundedTime = Math.round(timeVal / 100) * 100;
            loadedPoints.push({
              id: 'pasted-' + idx + '-' + Math.random().toString(36).substring(2, 4),
              time: roundedTime,
              pos: Math.max(0, Math.min(100, posVal)),
            });
            if (roundedTime > maxTime) maxTime = roundedTime;
          }
        }
      });

      if (loadedPoints.length === 0) {
        throw new Error('Kein gültiges JSON oder CSV-Format ("Zeit,Position") erkannt.');
      }

      pushHistory();
      if (maxTime > durationMs) setDurationMs(maxTime);
      setWaypointsMinDepth(loadedPoints.sort((a, b) => a.time - b.time));
      setPasteContent('');
      setShowLoadModal(false);
      addLog('INFO', `${loadedPoints.length} Wegpunkte aus eingefügtem Text geladen.`);
      showInAppNotification(`📂 ${loadedPoints.length} Wegpunkte aus eingefügtem Text erfolgreich geöffnet!`, 'success');
    } catch (err: any) {
      setPasteError(err.message || 'Syntaxfehler beim Parsen des Codes.');
      addLog('ERROR', `Einfüge-Importfehler: ${err.message}`);
    }
  };

  const exportSessionJSON = () => {
    const sessionData = getSessionDataObject();

    const jsonStr = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servok_session_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addLog('INFO', '💾 Gesamte Session erfolgreich als JSON exportiert.');
  };

  const handleSessionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        if (file.name.endsWith('.json') || content.trim().startsWith('{')) {
          const data = JSON.parse(content);
          if (data.type === 'hismith_servok_session' || data.waypoints) {
            pushHistory();
            if (data.durationMs) setDurationMs(data.durationMs);
            if (Array.isArray(data.subsections) && data.subsections.length > 0) {
              setSubsections(data.subsections);
            }
            if (data.waypoints?.minDepth) setWaypointsMinDepth(data.waypoints.minDepth);
            if (data.waypoints?.maxDepth) setWaypointsMaxDepth(data.waypoints.maxDepth);
            if (data.waypoints?.spm) setWaypointsSpm(data.waypoints.spm);
            if (data.waypoints?.hardness) setWaypointsHardness(data.waypoints.hardness);
            if (Array.isArray(data.lubeTriggers)) setLubeTriggers(data.lubeTriggers);
            if (data.servokSettings) {
              if (typeof data.servokSettings.minDepth === 'number') setServokMinDepth(data.servokSettings.minDepth);
              if (typeof data.servokSettings.maxDepth === 'number') setServokMaxDepth(data.servokSettings.maxDepth);
            }
            if (Array.isArray(data.savedPointGroups) && data.savedPointGroups.length > 0) {
              setSavedPointGroups((prev) => {
                const existingIds = new Set(prev.map((g) => g.id));
                const newGroups = data.savedPointGroups.filter((g: any) => !existingIds.has(g.id));
                return [...prev, ...newGroups];
              });
            }
            setSelectedPointIds([]);
            setPlaybackTime(0);
            addLog('INFO', `📂 Session "${file.name}" erfolgreich geladen.`);
            showInAppNotification(`📂 Session "${file.name}" erfolgreich in der App geöffnet!`, 'success');
            setShowLoadModal(false);
            return;
          } else if (data.type === 'hismith_servok_group' || data.type === 'hismith_servok_groups_bundle' || data.group || data.groups) {
            importGroupData(data, file.name);
            setShowLoadModal(false);
            return;
          }
        }

        // CSV Fallback
        handleFileUpload(e);
      } catch (err: any) {
        setImportError(err.message || 'Fehler beim Laden der Session.');
        addLog('ERROR', `Session-Importfehler: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- GRUPPEN EXPORT & IMPORT (EINZELNE GRUPPEN / PAKETE) ---
  const exportSingleGroupJSON = (group: typeof savedPointGroups[0]) => {
    const groupData = {
      version: '1.0',
      type: 'hismith_servok_group',
      group,
    };
    const jsonStr = JSON.stringify(groupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = group.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `gruppe_${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addLog('INFO', `Gruppe "${group.name}" als JSON exportiert.`);
  };

  const exportAllGroupsJSON = () => {
    if (savedPointGroups.length === 0) return;
    const bundleData = {
      version: '1.0',
      type: 'hismith_servok_groups_bundle',
      timestamp: new Date().toISOString(),
      groups: savedPointGroups,
    };
    const jsonStr = JSON.stringify(bundleData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alle_gruppen_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addLog('INFO', `${savedPointGroups.length} Gruppe(n) erfolgreich als JSON-Paket exportiert.`);
  };

  const importGroupData = (data: any, fileName: string) => {
    try {
      let importedCount = 0;

      if (data.type === 'hismith_servok_group' && data.group) {
        const g = data.group;
        const newId = 'grp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        const newGroup = { ...g, id: newId };
        setSavedPointGroups((prev) => [...prev, newGroup]);
        importedCount = 1;
      } else if (data.type === 'hismith_servok_groups_bundle' && Array.isArray(data.groups)) {
        const newGroups = data.groups.map((g: any) => ({
          ...g,
          id: 'grp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        }));
        setSavedPointGroups((prev) => [...prev, ...newGroups]);
        importedCount = newGroups.length;
      } else if (data.name && Array.isArray(data.points)) {
        const newId = 'grp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        setSavedPointGroups((prev) => [...prev, { ...data, id: newId }]);
        importedCount = 1;
      } else if (Array.isArray(data)) {
        const newGroups = data.map((g: any) => ({
          ...g,
          id: 'grp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        }));
        setSavedPointGroups((prev) => [...prev, ...newGroups]);
        importedCount = newGroups.length;
      } else {
        throw new Error('Ungültiges Gruppen-Format.');
      }

      addLog('INFO', `📥 ${importedCount} Gruppe(n) aus "${fileName}" importiert.`);
      showInAppNotification(`📥 ${importedCount} Gruppe(n) aus "${fileName}" erfolgreich importiert!`, 'success');
    } catch (err: any) {
      addLog('ERROR', `Gruppen-Importfehler: ${err.message}`);
    }
  };

  const handleGroupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      try {
        const data = JSON.parse(content);
        importGroupData(data, file.name);
      } catch (err: any) {
        addLog('ERROR', `Gruppen-Importfehler: Datei ist kein gültiges JSON (${err.message}).`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- WEB BLUETOOTH (BLE) LOGIC (DEUTSCH KOMMENTIERT) ---

  /**
   * Protokoll-Log-Eintrag hinzufügen
   */
  const addLog = (direction: 'TX' | 'RX' | 'INFO' | 'ERROR', description: string, bytes = '') => {
    const newLog: BleLog = {
      timestamp: new Date().toLocaleTimeString(),
      bytes,
      direction,
      description
    };
    setBleLogs((prev) => [newLog, ...prev.slice(0, 49)]); // Max 50 Einträge behalten
  };

  // --- UNDO / REDO AKTIONEN ---
  const undo = () => {
    ensureEditorSafeFromRunning('Rückgängig-Aktion');
    if (historyIndex > 0) {
      const targetState = historyStack[historyIndex - 1];
      setWaypointsMinDepth(targetState.waypointsMinDepth);
      setWaypointsMaxDepth(targetState.waypointsMaxDepth);
      setWaypointsSpm(targetState.waypointsSpm);
      setWaypointsHardness(targetState.waypointsHardness);
      setSubsections(targetState.subsections);
      setDurationMs(targetState.durationMs);
      setHistoryIndex(historyIndex - 1);
      setSelectedPointIds([]);
      addLog('INFO', '⏪ Undo: Letzte Änderung rückgängig gemacht.');
    }
  };

  const redo = () => {
    ensureEditorSafeFromRunning('Wiederherstellen-Aktion');
    if (historyIndex < historyStack.length - 1) {
      const targetState = historyStack[historyIndex + 1];
      setWaypointsMinDepth(targetState.waypointsMinDepth);
      setWaypointsMaxDepth(targetState.waypointsMaxDepth);
      setWaypointsSpm(targetState.waypointsSpm);
      setWaypointsHardness(targetState.waypointsHardness);
      setSubsections(targetState.subsections);
      setDurationMs(targetState.durationMs);
      setHistoryIndex(historyIndex + 1);
      setSelectedPointIds([]);
      addLog('INFO', '⏩ Redo: Änderung wiederhergestellt.');
    }
  };

  // --- TASTATUR SHORTCUTS (STRG+Z, STRG+Y, STRG+A, ENTF, ESC) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPointIds.length > 0) {
          deleteSelectedWaypoints();
          e.preventDefault();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        setSelectedPointIds(waypoints.map((w) => w.id));
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setSelectedPointIds([]);
        setIsBoxSelecting(false);
        setActiveEditorTool('pointer');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyStack, selectedPointIds, waypoints]);

  // --- BLANKES PROJEKT ERSTELLEN (HH:MM:SS) ---
  const handleCreateBlankProject = (hmsStr: string) => {
    pushHistory();
    const totalMs = Math.max(1000, parseHmsToMs(hmsStr));
    setDurationMs(totalMs);

    // Initialer durchgehender Teilabschnitt über die gesamte gewählte Dauer
    const initialSubsection: Subsection = {
      id: 'sub-main-' + Date.now(),
      name: `Hauptabschnitt (00:00:00 - ${formatMsToHms(totalMs)})`,
      startTime: 0,
      endTime: totalMs,
    };
    setSubsections([initialSubsection]);

    // Saubere flache Ausgangspunkte für alle Ebenen (Min 0%, Max 100%)
    setWaypointsMinDepth([
      { id: 'min-start', time: 0, pos: 0 },
      { id: 'min-end', time: totalMs, pos: 0 },
    ]);
    setWaypointsMaxDepth([
      { id: 'max-start', time: 0, pos: 100 },
      { id: 'max-end', time: totalMs, pos: 100 },
    ]);
    setWaypointsSpm([
      { id: 'spm-start', time: 0, pos: 30 },
      { id: 'spm-end', time: totalMs, pos: 30 },
    ]);
    setWaypointsHardness([
      { id: 'hrd-start', time: 0, pos: 50 },
      { id: 'hrd-end', time: totalMs, pos: 50 },
    ]);

    setSelectedPointIds([]);
    setPlaybackTime(0);
    setZoomRange(null);
    setShowNewProjectModal(false);
    setCurrentView('editor');
    showInAppNotification('✨ Neues manuelles Projekt im Editor geöffnet!', 'success');
    addLog('INFO', `✨ Neues blankes Projekt erstellt (${formatMsToHms(totalMs)} = ${totalMs} ms).`);
  };

  const handleOpenManualProjectPrompt = () => {
    const hasWork = waypointsMinDepth.length > 2 || waypointsMaxDepth.length > 2 || waypointsSpm.length > 2;
    if (hasWork) {
      setConfirmModal({
        title: 'Neues manuelles Projekt öffnen?',
        message: 'Möchtest du wirklich ein neues manuelles Projekt erstellen? Ungespeicherte Änderungen an der aktuellen Session gehen dabei verloren.',
        confirmText: 'Ja, neues Projekt erstellen',
        cancelText: 'Abbrechen',
        variant: 'warning',
        onConfirm: () => {
          setShowNewProjectModal(true);
        },
      });
    } else {
      setShowNewProjectModal(true);
    }
  };

  // --- ABSCHNITT ZERSCHNEIDEN (RAZOR CUT) ---
  const splitSubsectionAtTime = (targetTimeMs: number) => {
    pushHistory();
    const roundedTime = Math.round(targetTimeMs);

    // Finde den Teilabschnitt, in dem der Klick liegt
    const targetIndex = subsections.findIndex(
      (s) => s.startTime < roundedTime && s.endTime > roundedTime
    );

    if (targetIndex === -1) {
      addLog('ERROR', `Kein zerschneidbarer Abschnitt an Position ${formatMsToHms(roundedTime)} (${roundedTime}ms) gefunden.`);
      return;
    }

    const existing = subsections[targetIndex];
    const baseName = existing.name.split(' (Teil')[0];

    const subA: Subsection = {
      id: existing.id,
      name: `${baseName} (Teil 1)`,
      startTime: existing.startTime,
      endTime: roundedTime,
    };
    const subB: Subsection = {
      id: 'sub-cut-' + Date.now(),
      name: `${baseName} (Teil 2)`,
      startTime: roundedTime,
      endTime: existing.endTime,
    };

    const updatedSubs = [
      ...subsections.slice(0, targetIndex),
      subA,
      subB,
      ...subsections.slice(targetIndex + 1),
    ].sort((a, b) => a.startTime - b.startTime);

    setSubsections(updatedSubs);
    addLog('INFO', `✂️ Abschnitt "${existing.name}" bei ${formatMsToHms(roundedTime)} zerschnitten!`);
  };

  // --- GRUPPEN- & MULTIAUSWAHL TRANSFORMATIONEN ---
  const deleteSelectedWaypoints = () => {
    if (selectedPointIds.length === 0) return;
    ensureEditorSafeFromRunning('Löschen ausgewählter Wegpunkte');
    pushHistory();
    const idsSet = new Set(selectedPointIds);
    const filterOut = (pts: Waypoint[]) => pts.filter((wp) => !idsSet.has(wp.id));
    setWaypointsMinDepth(filterOut);
    setWaypointsMaxDepth(filterOut);
    setWaypointsSpm(filterOut);
    setWaypointsHardness(filterOut);
    addLog('INFO', `${selectedPointIds.length} Punkte gelöscht.`);
    setSelectedPointIds([]);
    setSelectedPointId(null);
  };

  const scaleSelectedPointsTime = (factor: number) => {
    if (selectedPointIds.length === 0) return;
    pushHistory();

    const allWps = [
      ...waypointsMinDepth,
      ...waypointsMaxDepth,
      ...waypointsSpm,
      ...waypointsHardness,
    ];
    const selectedWps = allWps.filter((wp) => selectedPointIds.includes(wp.id));
    if (selectedWps.length === 0) return;

    const minTime = Math.min(...selectedWps.map((w) => w.time));

    const updatePts = (pts: Waypoint[]) =>
      pts.map((wp) => {
        if (selectedPointIds.includes(wp.id)) {
          const newTime = Math.max(0, Math.min(durationMs, Math.round(minTime + (wp.time - minTime) * factor)));
          return { ...wp, time: newTime };
        }
        return wp;
      }).sort((a, b) => a.time - b.time);

    setWaypointsMinDepth(updatePts);
    setWaypointsMaxDepth(updatePts);
    setWaypointsSpm(updatePts);
    setWaypointsHardness(updatePts);

    addLog('INFO', `Ausgewählte Gruppe zeitlich skaliert (${factor}x).`);
  };

  const scaleSelectedPointsPos = (factor: number) => {
    if (selectedPointIds.length === 0) return;
    pushHistory();

    const allWps = [
      ...waypointsMinDepth,
      ...waypointsMaxDepth,
      ...waypointsSpm,
      ...waypointsHardness,
    ];
    const selectedWps = allWps.filter((wp) => selectedPointIds.includes(wp.id));
    if (selectedWps.length === 0) return;

    const midPos = selectedWps.reduce((acc, w) => acc + w.pos, 0) / selectedWps.length;

    const updatePts = (pts: Waypoint[]) =>
      pts.map((wp) => {
        if (selectedPointIds.includes(wp.id)) {
          const newPos = Math.max(0, Math.min(100, Math.round((midPos + (wp.pos - midPos) * factor) * 10) / 10));
          return { ...wp, pos: newPos };
        }
        return wp;
      });

    setWaypointsMinDepth(updatePts);
    setWaypointsMaxDepth(updatePts);
    setWaypointsSpm(updatePts);
    setWaypointsHardness(updatePts);

    addLog('INFO', `Ausgewählte Gruppe in der Höhe skaliert (${factor}x).`);
  };

  // Verschiebe die Position der ausgewählten Punkte schrittweise in ±1%, ±5%, ±10%
  const shiftSelectedPointsPos = (deltaPercent: number) => {
    if (selectedPointIds.length === 0) return;
    pushHistory();

    const updatePts = (pts: Waypoint[]) =>
      pts.map((wp) => {
        if (selectedPointIds.includes(wp.id)) {
          const newPos = Math.max(0, Math.min(100, Math.round((wp.pos + deltaPercent) * 10) / 10));
          return { ...wp, pos: newPos };
        }
        return wp;
      }).sort((a, b) => a.time - b.time);

    setWaypointsMinDepth(updatePts);
    setWaypointsMaxDepth(updatePts);
    setWaypointsSpm(updatePts);
    setWaypointsHardness(updatePts);

    addLog('INFO', `Ausgewählte Gruppe um ${deltaPercent > 0 ? '+' : ''}${deltaPercent}% verschoben.`);
  };

  // Verschiebe die Zeit der ausgewählten Punkte schrittweise in Millisekunden
  const shiftSelectedPointsTime = (deltaMs: number) => {
    if (selectedPointIds.length === 0) return;
    pushHistory();

    const updatePts = (pts: Waypoint[]) =>
      pts.map((wp) => {
        if (selectedPointIds.includes(wp.id)) {
          const newTime = Math.max(0, Math.min(durationMs, Math.round(wp.time + deltaMs)));
          return { ...wp, time: newTime };
        }
        return wp;
      }).sort((a, b) => a.time - b.time);

    setWaypointsMinDepth(updatePts);
    setWaypointsMaxDepth(updatePts);
    setWaypointsSpm(updatePts);
    setWaypointsHardness(updatePts);

    addLog('INFO', `Ausgewählte Gruppe um ${deltaMs > 0 ? '+' : ''}${deltaMs}ms zeitlich verschoben.`);
  };

  // Konvertiert ausgewählte schräge Linien (lineare Anstiege) in hardware-optimierte Stufenlinien
  const convertSelectedPointsToStepLines = (stepTimeIntervalMs: number = 3000) => {
    if (selectedPointIds.length < 2) return;
    pushHistory();

    const idsSet = new Set(selectedPointIds);

    const processLayerWaypoints = (pts: Waypoint[]) => {
      const selectedWps = pts.filter((w) => idsSet.has(w.id)).sort((a, b) => a.time - b.time);
      if (selectedWps.length < 2) return pts;

      const unselectedWps = pts.filter((w) => !idsSet.has(w.id));
      const newStepWps: Waypoint[] = [];

      for (let i = 0; i < selectedWps.length - 1; i++) {
        const p1 = selectedWps[i];
        const p2 = selectedWps[i + 1];
        newStepWps.push(p1);

        const duration = p2.time - p1.time;
        const posDiff = p2.pos - p1.pos;

        if (duration > stepTimeIntervalMs && Math.abs(posDiff) > 1) {
          const numSteps = Math.min(25, Math.max(2, Math.floor(duration / stepTimeIntervalMs)));
          const stepTime = duration / numSteps;
          const stepPos = posDiff / numSteps;

          for (let step = 1; step < numSteps; step++) {
            const time = Math.round(p1.time + step * stepTime);
            const pos = Math.round((p1.pos + step * stepPos) * 10) / 10;
            newStepWps.push({
              id: `step-${Date.now()}-${i}-${step}-${Math.random().toString(36).substring(2, 4)}`,
              time,
              pos,
            });
          }
        }
      }
      newStepWps.push(selectedWps[selectedWps.length - 1]);

      return [...unselectedWps, ...newStepWps].sort((a, b) => a.time - b.time);
    };

    setWaypointsMinDepth(processLayerWaypoints);
    setWaypointsMaxDepth(processLayerWaypoints);
    setWaypointsSpm(processLayerWaypoints);
    setWaypointsHardness(processLayerWaypoints);

    addLog('INFO', `📉 Ausgewählte schräge Linien in hardware-optimierte Stufenlinien (${stepTimeIntervalMs / 1000}s Intervalle) umgewandelt!`);
    showInAppNotification(`📉 Schräge Linien erfolgreich in Stufenlinien umgewandelt!`, 'success');
  };

  // Gruppe aus den ausgewählten Punkten speichern
  const saveSelectedGroup = () => {
    if (selectedPointIds.length === 0) return;

    const selMin = waypointsMinDepth.filter((wp) => selectedPointIds.includes(wp.id)).map((w) => ({ ...w, layer: 'minDepth' as const }));
    const selMax = waypointsMaxDepth.filter((wp) => selectedPointIds.includes(wp.id)).map((w) => ({ ...w, layer: 'maxDepth' as const }));
    const selSpm = waypointsSpm.filter((wp) => selectedPointIds.includes(wp.id)).map((w) => ({ ...w, layer: 'spm' as const }));
    const selHardness = waypointsHardness.filter((wp) => selectedPointIds.includes(wp.id)).map((w) => ({ ...w, layer: 'hardness' as const }));

    const allSelectedWps = [...selMin, ...selMax, ...selSpm, ...selHardness];
    if (allSelectedWps.length === 0) return;

    const layersPresent = Array.from(new Set(allSelectedWps.map((w) => w.layer)));
    const isMultiLayer = layersPresent.length > 1;
    const groupLayer = isMultiLayer ? 'multi' : layersPresent[0];

    const layerLabel = isMultiLayer 
      ? 'Kombination (Min, Max, SPM, Härte)' 
      : groupLayer === 'minDepth' ? 'Mindesttiefe' 
      : groupLayer === 'maxDepth' ? 'Maximaltiefe' 
      : groupLayer === 'spm' ? 'SPM' 
      : 'Härte';

    const defaultName = isMultiLayer ? `Kombi-Gruppe (${allSelectedWps.length} Pkt)` : `Gruppe (${allSelectedWps.length} Pkt)`;
    
    setPromptInputVal(defaultName);
    setPromptModal({
      title: 'Gruppe Speichern',
      label: `Name für die gespeicherte Gruppe (${layerLabel}, ${allSelectedWps.length} Punkte) eingeben:`,
      defaultValue: defaultName,
      onConfirm: (groupName) => {
        if (!groupName || !groupName.trim()) return;

        const minTime = Math.min(...allSelectedWps.map((w) => w.time));
        const normalizedPoints = allSelectedWps
          .map((w) => ({
            relTime: w.time - minTime,
            pos: w.pos,
            layer: w.layer,
          }))
          .sort((a, b) => a.relTime - b.relTime);

        const newGroup = {
          id: 'grp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          name: groupName.trim(),
          layer: groupLayer,
          points: normalizedPoints,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setSavedPointGroups((prev) => [newGroup, ...prev]);
        addLog('INFO', `💾 Gruppe "${newGroup.name}" mit ${normalizedPoints.length} Punkten (${layerLabel}) gespeichert!`);
      }
    });
  };

  const insertSavedGroupAtTime = (group: typeof savedPointGroups[0], startTimeMs: number) => {
    pushHistory();
    const maxRelTime = group.points.length > 0 ? Math.max(...group.points.map((p) => p.relTime)) : 0;
    const groupEndTime = startTimeMs + maxRelTime;

    if (groupEndTime > durationMs) {
      setDurationMs(Math.ceil(groupEndTime / 500) * 500);
    }

    const newMinPts: Waypoint[] = [];
    const newMaxPts: Waypoint[] = [];
    const newSpmPts: Waypoint[] = [];
    const newHardnessPts: Waypoint[] = [];
    const newIds: string[] = [];

    group.points.forEach((pt, idx) => {
      const targetLayer = pt.layer || (group.layer !== 'multi' ? group.layer : activeCurveLayer);
      const newId = `inserted-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
      const newWp: Waypoint = {
        id: newId,
        time: Math.round(startTimeMs + pt.relTime),
        pos: pt.pos,
      };
      newIds.push(newId);

      if (targetLayer === 'minDepth') newMinPts.push(newWp);
      else if (targetLayer === 'maxDepth') newMaxPts.push(newWp);
      else if (targetLayer === 'spm') newSpmPts.push(newWp);
      else if (targetLayer === 'hardness' || (targetLayer as string) === 'speed') newHardnessPts.push(newWp);
      else {
        if (activeCurveLayer === 'minDepth') newMinPts.push(newWp);
        else if (activeCurveLayer === 'maxDepth') newMaxPts.push(newWp);
        else if (activeCurveLayer === 'spm') newSpmPts.push(newWp);
        else newHardnessPts.push(newWp);
      }
    });

    if (newMinPts.length > 0) setWaypointsMinDepth((prev) => [...prev, ...newMinPts].sort((a, b) => a.time - b.time));
    if (newMaxPts.length > 0) setWaypointsMaxDepth((prev) => [...prev, ...newMaxPts].sort((a, b) => a.time - b.time));
    if (newSpmPts.length > 0) setWaypointsSpm((prev) => [...prev, ...newSpmPts].sort((a, b) => a.time - b.time));
    if (newHardnessPts.length > 0) setWaypointsHardness((prev) => [...prev, ...newHardnessPts].sort((a, b) => a.time - b.time));

    setSelectedPointIds(newIds);
    if (newIds.length > 0) setSelectedPointId(newIds[0]);

    addLog('INFO', `📥 Gespeicherte Gruppe "${group.name}" bei ${startTimeMs}ms eingefügt.`);
  };

  const deleteSavedGroup = (id: string) => {
    setSavedPointGroups((prev) => prev.filter((g) => g.id !== id));
    addLog('INFO', 'Gespeicherte Gruppe gelöscht.');
  };

  const renameSavedGroup = (id: string, currentName: string) => {
    setPromptInputVal(currentName);
    setPromptModal({
      title: 'Gruppe Umbenennen',
      label: 'Neuen Namen für die Gruppe eingeben:',
      defaultValue: currentName,
      onConfirm: (newName) => {
        if (!newName || !newName.trim() || newName.trim() === currentName) return;
        setSavedPointGroups((prev) =>
          prev.map((g) => (g.id === id ? { ...g, name: newName.trim() } : g))
        );
        addLog('INFO', `Gruppe umbenannt in "${newName.trim()}".`);
      }
    });
  };

  // Bearbeiten einer Gruppe (Ebenen-Auswahl / Filterung z.B. nur Min & Max)
  const startEditingGroup = (group: typeof savedPointGroups[0]) => {
    const hasMin = group.points.some((p) => (p.layer || group.layer) === 'minDepth' || group.layer === 'minDepth');
    const hasMax = group.points.some((p) => (p.layer || group.layer) === 'maxDepth' || group.layer === 'maxDepth');
    const hasSpm = group.points.some((p) => (p.layer || group.layer) === 'spm' || group.layer === 'spm');
    const hasHrd = group.points.some((p) => (p.layer || group.layer) === 'hardness' || (group.layer as string) === 'speed' || group.layer === 'hardness');

    setEditingGroup({
      id: group.id,
      name: group.name,
      points: group.points.map((p) => ({
        ...p,
        layer: p.layer || (group.layer !== 'multi' ? (group.layer as any) : 'minDepth'),
      })),
      activeLayers: {
        minDepth: hasMin || (!hasMin && !hasMax && !hasSpm && !hasHrd),
        maxDepth: hasMax,
        spm: hasSpm,
        hardness: hasHrd,
      },
    });
  };

  const saveEditedGroup = () => {
    if (!editingGroup) return;

    const selectedLayers = Object.entries(editingGroup.activeLayers)
      .filter(([_, active]) => active)
      .map(([layer]) => layer as 'minDepth' | 'maxDepth' | 'spm' | 'hardness');

    if (selectedLayers.length === 0) {
      alert('Bitte wähle mindestens eine Ebene für die Gruppe aus.');
      return;
    }

    const filteredPoints = editingGroup.points.filter((p) => {
      const lyr = p.layer || 'minDepth';
      return editingGroup.activeLayers[lyr];
    });

    const isMulti = selectedLayers.length > 1;
    const groupLayer = isMulti ? 'multi' : selectedLayers[0];

    setSavedPointGroups((prev) =>
      prev.map((g) => {
        if (g.id === editingGroup.id) {
          return {
            ...g,
            name: editingGroup.name.trim() || g.name,
            layer: groupLayer,
            points: filteredPoints,
          };
        }
        return g;
      })
    );

    const layerNamesGerman: Record<string, string> = {
      minDepth: 'Min',
      maxDepth: 'Max',
      spm: 'SpM',
      hardness: 'Härte',
    };
    const activeGermanLabels = selectedLayers.map((l) => layerNamesGerman[l] || l).join(', ');

    addLog('INFO', `✏️ Gruppe "${editingGroup.name}" aktualisiert. Gruppierte Ebenen: ${activeGermanLabels} (${filteredPoints.length} Punkte).`);
    setEditingGroup(null);
  };

  // Segment / Teilabschnitt Punkte auswählen
  const selectPointsInSubsection = (sub: Subsection) => {
    const ids: string[] = [];
    [waypointsMinDepth, waypointsMaxDepth, waypointsSpm, waypointsHardness].forEach((layerPts) => {
      layerPts.forEach((wp) => {
        if (wp.time >= sub.startTime && wp.time <= sub.endTime) {
          ids.push(wp.id);
        }
      });
    });
    setSelectedPointIds(ids);
    if (ids.length > 0) setSelectedPointId(ids[0]);
    addLog('INFO', `Alle ${ids.length} Punkte in Abschnitt "${sub.name}" markiert.`);
  };

  // Segment / Teilabschnitt und dessen Punkte zeitlich verschieben
  const shiftSubsection = (subId: string, deltaMs: number) => {
    pushHistory();
    const sub = subsections.find((s) => s.id === subId);
    if (!sub) return;

    const shiftPts = (pts: Waypoint[]) =>
      pts.map((wp) => {
        if (wp.time >= sub.startTime && wp.time <= sub.endTime) {
          return { ...wp, time: Math.max(0, Math.min(durationMs, Math.round(wp.time + deltaMs))) };
        }
        return wp;
      }).sort((a, b) => a.time - b.time);

    setWaypointsMinDepth(shiftPts);
    setWaypointsMaxDepth(shiftPts);
    setWaypointsSpm(shiftPts);
    setWaypointsHardness(shiftPts);

    const newStart = Math.max(0, Math.min(durationMs, sub.startTime + deltaMs));
    const newEnd = Math.max(newStart + 100, Math.min(durationMs, sub.endTime + deltaMs));

    setSubsections((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, startTime: newStart, endTime: newEnd } : s))
    );

    addLog('INFO', `Teilabschnitt "${sub.name}" & Punkte um ${deltaMs > 0 ? '+' : ''}${deltaMs}ms verschoben.`);
  };

  const loadSampleGroups = () => {
    const sample1 = {
      id: 'grp-sample-1',
      name: 'Doppel-Impuls Wave',
      layer: 'multi' as const,
      points: [
        { relTime: 0, pos: 10, layer: 'minDepth' as const },
        { relTime: 200, pos: 80, layer: 'minDepth' as const },
        { relTime: 400, pos: 20, layer: 'minDepth' as const },
        { relTime: 600, pos: 90, layer: 'minDepth' as const },
        { relTime: 800, pos: 10, layer: 'minDepth' as const },
        { relTime: 0, pos: 40, layer: 'spm' as const },
        { relTime: 400, pos: 120, layer: 'spm' as const },
        { relTime: 800, pos: 40, layer: 'spm' as const },
      ],
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const sample2 = {
      id: 'grp-sample-2',
      name: 'Ramp-Up Härte',
      layer: 'hardness' as const,
      points: [
        { relTime: 0, pos: 20, layer: 'hardness' as const },
        { relTime: 300, pos: 50, layer: 'hardness' as const },
        { relTime: 600, pos: 85, layer: 'hardness' as const },
        { relTime: 900, pos: 100, layer: 'hardness' as const },
        { relTime: 1200, pos: 20, layer: 'hardness' as const },
      ],
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setSavedPointGroups((prev) => [...prev, sample1, sample2]);
    addLog('INFO', 'Beispiel-Gruppen geladen.');
  };

  // --- STRG + SCROLL WHEEL ZOOM AUF SVG CANVAS ---
  const handleWheelZoom = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; // Nur mit Strg / Cmd zoomen
    e.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const hoverTime = fromSvgX(mouseX);

    const zoomFactor = e.deltaY < 0 ? 0.8 : 1.25; // Mausrad hoch = Zoom in
    const currentSpan = viewEnd - viewStart;
    const newSpan = Math.max(500, Math.min(durationMs, currentSpan * zoomFactor));

    if (newSpan >= durationMs) {
      setZoomRange(null);
    } else {
      let newStart = hoverTime - (hoverTime - viewStart) * (newSpan / currentSpan);
      let newEnd = newStart + newSpan;

      if (newStart < 0) {
        newStart = 0;
        newEnd = newSpan;
      }
      if (newEnd > durationMs) {
        newEnd = durationMs;
        newStart = durationMs - newSpan;
      }

      setZoomRange({ start: Math.max(0, newStart), end: Math.min(durationMs, newEnd) });
    }
  };

  /**
   * Bekannte optionalServices für automatischen GATT-Scan aller gängigen Aktuator-Protokolle
   */
  const KNOWN_OPTIONAL_SERVICES = [
    '0000fff0-0000-1000-8000-00805f9b34fb', // Standard Hismith Native Protocol
    '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / Standard Serial Port
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
    '0000ffe5-0000-1000-8000-00805f9b34fb', // Custom Actuator Service 2
    '0000fff3-0000-1000-8000-00805f9b34fb', // Custom Actuator Service 3
    '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
    '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
    '0000fd00-0000-1000-8000-00805f9b34fb', // Interactive Actuator Service
    '0000fef5-0000-1000-8000-00805f9b34fb',
  ];

  /**
   * Baut die Bluetooth-Verbindung auf und wählt benötigte UUIDs automatisch ein.
   * Ablauf: requestDevice -> gatt.connect() -> getPrimaryServices() -> Auto-Detect Schreib-UUIDs
   */
  const connectBLE = async () => {
    setBleError(null);
    setBleStatus('connecting');
    addLog('INFO', 'Starte Bluetooth-Suche nach Aktuatoren mit automatischer UUID-Erkennung...');

    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      const msg = 'Web Bluetooth wird von diesem Browser nicht unterstützt. Bitte nutze Chrome, Edge oder Opera über HTTPS oder localhost.';
      setBleError(msg);
      setBleStatus('error');
      addLog('ERROR', msg);
      return;
    }

    try {
      // Liste der anzufordernden optionalServices
      const optionalServicesList = Array.from(new Set([
        serviceUuid.toLowerCase(),
        ...KNOWN_OPTIONAL_SERVICES
      ])).filter(Boolean);

      let device: any = null;
      try {
        // Nutze acceptAllDevices mit erweiterter optionalServices-Liste, damit ALLE Bluetooth-Geräte (Servok, Hismith, etc.)
        // unabhängig vom exakten Werbe-Namen im Browser-Auswahldialog angezeigt werden
        device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: optionalServicesList
        });
      } catch (filterErr: any) {
        if (filterErr.name === 'NotFoundError' || filterErr.message?.includes('User cancelled')) {
          throw filterErr;
        }
        // Fallback-Versuch mit expliziten Namen-Präfixen
        device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { namePrefix: 'Hismith' },
            { namePrefix: 'HISMITH' },
            { namePrefix: 'HS-' },
            { namePrefix: 'Servok' },
            { namePrefix: 'SERVOK' },
            { namePrefix: 'Lube' },
            { namePrefix: 'Launcher' },
            { namePrefix: 'Lelo' },
            { namePrefix: 'Handy' },
            { namePrefix: 'Kiiroo' },
            { namePrefix: 'BLE' },
            { namePrefix: 'UART' },
            { namePrefix: 'Serial' },
          ],
          optionalServices: optionalServicesList
        });
      }

      setBleDevice(device);
      addLog('INFO', `Gerät ausgewählt: ${device.name || 'Unbenannter Aktuator'}. Verbinde mit GATT-Server...`);

      // GATT-Server Verbindung herstellen
      const server = await device.gatt.connect();
      addLog('INFO', 'GATT-Server verbunden. Analysiere Services & wähle UUIDs automatisch aus...');

      let targetService: any = null;
      let targetCharacteristic: any = null;
      let activeServiceUuid = serviceUuid;
      let activeCharUuid = charUuid;
      let writeType = 'writeWithoutResponse';
      let detectedCandidates: {
        serviceUuid: string;
        charUuid: string;
        writeType: string;
        label: string;
        characteristic?: any;
      }[] = [];

      try {
        // Scanne alle freigegebenen primären Services des Geräts
        const primaryServices = await server.getPrimaryServices();
        addLog('INFO', `GATT-Scan erfolgreich: ${primaryServices.length} primäre Services auf dem Gerät analysiert.`);

        for (const s of primaryServices) {
          try {
            const chars = await s.getCharacteristics();
            for (const c of chars) {
              const props = c.properties;
              const canWriteNoResp = props.writeWithoutResponse || props.writeWithoutResponse === true;
              const canWrite = props.write || props.write === true;

              if (canWriteNoResp || canWrite) {
                const sUuid = s.uuid.toLowerCase();
                const cUuid = c.uuid.toLowerCase();
                const wType = canWriteNoResp ? 'writeWithoutResponse' : 'write';

                let label = 'Standard Schreibkanal';
                if (sUuid.includes('fff0') || cUuid.includes('fff1')) label = 'Hismith Native Protocol';
                else if (sUuid.includes('ffe0') || cUuid.includes('ffe1')) label = 'HM-10 Serial Port';
                else if (sUuid.includes('6e40')) label = 'Nordic UART Service (NUS)';

                detectedCandidates.push({
                  serviceUuid: s.uuid,
                  charUuid: c.uuid,
                  writeType: wType,
                  label,
                  characteristic: c
                });

                addLog('INFO', `GATT-Kanal erkannt: ${label} [Service: ${s.uuid} | Char: ${c.uuid} (${wType})]`);
              }
            }
          } catch (cErr) {
            // Manche geschützten System-Services überspringen
          }
        }
      } catch (scanErr) {
        addLog('INFO', 'Direkter Mehrfach-Scan eingeschränkt. Versuche direkte Einwahl über gewählte UUID...');
      }

      if (detectedCandidates.length > 0) {
        // Intelligente Priorisierung & Einwahl:
        // Hismith Native (fff0/fff1) > Serial (ffe0/ffe1) > Nordic (6e40) > Erstes verfeinertes Merkmal
        detectedCandidates.sort((a, b) => {
          const score = (item: typeof a) => {
            let sc = 0;
            const s = item.serviceUuid.toLowerCase();
            const c = item.charUuid.toLowerCase();
            if (s.includes('fff0')) sc += 100;
            if (c.includes('fff1')) sc += 100;
            if (s.includes('ffe0')) sc += 50;
            if (c.includes('ffe1')) sc += 50;
            if (item.writeType === 'writeWithoutResponse') sc += 10;
            return sc;
          };
          return score(b) - score(a);
        });

        const best = detectedCandidates[0];
        targetService = await server.getPrimaryService(best.serviceUuid);
        targetCharacteristic = best.characteristic || await targetService.getCharacteristic(best.charUuid);
        activeServiceUuid = best.serviceUuid;
        activeCharUuid = best.charUuid;
        writeType = best.writeType;

        setServiceUuid(activeServiceUuid);
        setCharUuid(activeCharUuid);
        setAutoDetectedInfo({
          serviceUuid: activeServiceUuid,
          charUuid: activeCharUuid,
          writeType,
          candidatesCount: detectedCandidates.length,
          label: best.label,
          isAutoDetected: true
        });

        addLog('INFO', `✓ Automatische UUID-Einwahl abgeschlossen! Aktiver Kanal: "${best.label}" (${activeServiceUuid} / ${activeCharUuid}). Verbindung gesichert.`);
      } else {
        // Fallback: Manuell konfigurierte UUIDs
        addLog('INFO', `Greife auf konfigurierte UUIDs zurück: Service ${serviceUuid}...`);
        targetService = await server.getPrimaryService(serviceUuid);
        targetCharacteristic = await targetService.getCharacteristic(charUuid);
        activeServiceUuid = serviceUuid;
        activeCharUuid = charUuid;

        setAutoDetectedInfo({
          serviceUuid: activeServiceUuid,
          charUuid: activeCharUuid,
          writeType: 'writeWithoutResponse',
          candidatesCount: 1,
          label: 'Manuell konfigurierter Kanal',
          isAutoDetected: false
        });
        addLog('INFO', `Kanal erfolgreich eingebunden (Service: ${serviceUuid}, Char: ${charUuid}). Verbindung gesichert!`);
      }

      setBleCharacteristic(targetCharacteristic);
      setBleStatus('connected');
      setBleModelName(device.name || 'Servok Premium Actuator');

      // Verbindungstrennungs-Listener registrieren
      device.addEventListener('gattserverdisconnected', onBleDisconnected);

      // Hardware-Kanal nahtlos an ServokBleService anbinden
      servokBle.attachDevice(device, targetCharacteristic);

      // === 1. HANDSHAKE / WAKE-UP CALL (Zuerst wecken!) ===
      try {
        addLog('INFO', 'Sende Wake-up Handshake [0x01, 0x00]...');
        if (targetCharacteristic.properties.notify) {
          await targetCharacteristic.startNotifications();
        }
        const wakeupPayload = new Uint8Array([0x01, 0x00]);
        await writeToBleCharacteristic(targetCharacteristic, wakeupPayload);
        // WICHTIG: 100ms warten, damit der Chip hochfahren kann
        await new Promise(r => setTimeout(r, 100)); 
        addLog('INFO', '✓ Handshake gesendet. Motor ist wach!');
      } catch (wakeErr) {
        console.warn('Wakeup-Call fehlgeschlagen', wakeErr);
      }

      // === 2. RESET & AUTO-START VERHINDERN (Dann stoppen!) ===
      try {
        // 1. Zwingt die Maschine aus dem Offline-Rhythmus in den App-Modus
        const resetModePayload = new Uint8Array([0xCC, 0x01, 0x00, 0x01]);
        await writeToBleCharacteristic(targetCharacteristic, resetModePayload);
        await new Promise(r => setTimeout(r, 50));
        
        // 2. Setzt das Tempo explizit auf 0 (Sicherheits-Nullung)
        const zeroSpeedPayload = new Uint8Array([0xCC, 0x03, 0x00, 0x03]);
        await writeToBleCharacteristic(targetCharacteristic, zeroSpeedPayload);
        
        addLog('INFO', '✓ Motor in Live-Modus versetzt und auf STOP gezwungen.');
      } catch (resetErr) {
        console.warn('Reset-Befehle übersprungen', resetErr);
      }

    } catch (err: any) {
      console.error('BLE Verbindungsfehler:', err);
      setBleStatus('error');
      const isPolicyErr =
        err?.name === 'SecurityError' ||
        err?.message?.includes('disallowed by permissions policy') ||
        err?.message?.includes('Permissions policy') ||
        err?.message?.includes('requestDevice') ||
        err?.message?.includes('bluetooth');

      let errMessage = err?.message || 'Verbindung fehlgeschlagen.';
      if (isPolicyErr || (typeof window !== 'undefined' && window.self !== window.top)) {
        errMessage = 'Web Bluetooth ist in iFrames (Vorschau-Fenster) durch Browser-Sicherheitsrichtlinien gesperrt. Bitte öffne die App in einem neuen Tab!';
      }
      setBleError(errMessage);
      addLog('ERROR', `Verbindung fehlgeschlagen: ${errMessage}`);
    }
  };

  /**
   * Beendet die Bluetooth-Verbindung sauber
   */
  const disconnectBLE = () => {
    if (bleDevice && bleDevice.gatt?.connected) {
      bleDevice.gatt.disconnect();
    }
    servokBle.disconnect();
    onBleDisconnected();
  };

  /**
   * Wird aufgerufen wenn die Verbindung getrennt wird
   */
  const onBleDisconnected = () => {
    setBleStatus('disconnected');
    setBleCharacteristic(null);
    setBleDevice(null);
    setAutoDetectedInfo(null);
    servokBle.disconnect();
    addLog('INFO', 'Bluetooth-Verbindung getrennt.');
  };

  /**
   * Universelle schreibfeste Helferfunktion für Web Bluetooth Charakteristiken
   * Probiert nacheinander writeValueWithoutResponse, writeValueWithResponse und writeValue
   */
  const writeToBleCharacteristic = async (char: any, payload: Uint8Array): Promise<boolean> => {
    if (!char) return false;

    if (char.writeValueWithoutResponse) {
      try {
        await char.writeValueWithoutResponse(payload);
        return true;
      } catch (err1) {
        console.warn('writeValueWithoutResponse fehlgeschlagen, versuche Fallback...', err1);
      }
    }

    if (char.writeValueWithResponse) {
      try {
        await char.writeValueWithResponse(payload);
        return true;
      } catch (err2) {
        console.warn('writeValueWithResponse fehlgeschlagen, versuche Fallback...', err2);
      }
    }

    if (char.writeValue) {
      try {
        await char.writeValue(payload);
        return true;
      } catch (err3) {
        console.warn('writeValue fehlgeschlagen...', err3);
      }
    }

    return false;
  };

  /**
   * TURBO-BUTTON SCHNELLWAHL & SOFORT-AUSFÜHRUNG OHNE VERZÖGERUNG
   * Multipliziert die echten SPM um den gewählten Faktor (1.25x / 1.5x / 1.8x / 2.0x) bis zum maschinellen Limit (600 SPM)
   * Sendet den geänderten Befehl SOFORT ohne Warten auf den nächsten Render-Zyklus an die BLE-Maschine.
   */
  const handleToggleTurbo = async (explicitMultiplier?: number) => {
    const nextActive = explicitMultiplier !== undefined ? true : !turboActive;
    const nextMultiplier = explicitMultiplier || turboMultiplier;

    setTurboActive(nextActive);
    if (explicitMultiplier) setTurboMultiplier(nextMultiplier);
    setSpeedBoostFactor(nextActive ? nextMultiplier : 1.0);

    // 1. Sofortige Echtzeit-Berechnung des neuen realen SPM
    const currentSpan = Math.max(15, Math.abs(currentMaxDepthVal - currentMinDepthVal));
    const basePhysicalMax = calcBasePhysicalMaxSpm(currentSpan);
    const spmPct = getInterpolatedVal(waypointsSpm, playbackTime);
    let calculatedSpm = (spmPct / 100) * basePhysicalMax;

    if (throttleLevel === 'eco_75') calculatedSpm *= 0.75;
    else if (throttleLevel === 'half_50') calculatedSpm *= 0.50;
    else if (throttleLevel === 'quiet_30') calculatedSpm *= 0.30;
    else if (throttleLevel === 'custom_cap') calculatedSpm = Math.min(calculatedSpm, throttleCapMax);

    if (nextActive) {
      calculatedSpm *= nextMultiplier;
    }
    const instantSpm = Math.max(0, Math.min(600, Math.round(calculatedSpm)));
    const rawPower = Math.max(0, Math.min(100, Math.round((instantSpm / basePhysicalMax) * 100)));
    let spmPower = 0;
    if (rawPower > 0) {
      spmPower = speedCurveMode === 'torque_boost'
        ? Math.max(1, Math.min(100, Math.round(18 + (rawPower / 100) * 82)))
        : rawPower;
    }

    // 2. SOFORTIGE AUSFÜHRUNG AN DIE HARDWARE OHNE VERZÖGERUNG:
    if (servokBle.connected) {
      if (controlMode === 'auto_cycle') {
        await servokBle.sendCommand(0x03, spmPower, `⚡ TURBO ${nextActive ? `${nextMultiplier}x` : 'AUS'}: ${instantSpm} SPM (${spmPower}% PWM)`);
      }
    } else if (bleCharacteristic) {
      const cmdSpm = 0x03;
      const payloadSpm = new Uint8Array([0xCC, cmdSpm, spmPower, (cmdSpm + spmPower) & 0xFF]);
      writeToBleCharacteristic(bleCharacteristic, payloadSpm).catch(() => {});
      lastSmartStateRef.current.spm = spmPower;
    }

    showInAppNotification(
      nextActive
        ? `🔥 TURBO AKTIV (${nextMultiplier}x) — SPM sofort auf ${instantSpm} erhöht!`
        : '⚡ Turbo deaktiviert: Standard Min-Max SPM aktiv',
      nextActive ? 'warning' : 'info'
    );
  };

  /**
   * DROSSELUNG SCHALTER-LOGIK
   * Standard: 'none' = 100% Min-Max SPM ungedrosselt
   * Schalter: 'eco_75' (75%), 'half_50' (50%), 'quiet_30' (30%), 'custom_cap' (SPM-Cap)
   */
  const handleSelectThrottle = async (level: 'none' | 'eco_75' | 'half_50' | 'quiet_30' | 'custom_cap', capVal?: number) => {
    setThrottleLevel(level);
    if (capVal) setThrottleCapMax(capVal);

    let desc = '100% Min-Max SPM (Ohne Drosselung)';
    if (level === 'eco_75') desc = 'Eco Drosselung (75% Leistung)';
    else if (level === 'half_50') desc = 'Halblast (50% Leistung)';
    else if (level === 'quiet_30') desc = 'Flüsterbetrieb (30% sanfte Leistung)';
    else if (level === 'custom_cap') desc = `SPM-Deckelung (Max ${capVal || throttleCapMax} SPM)`;

    // Sofortige Ausführung an die Hardware bei aktiver Verbindung:
    const currentSpan = Math.max(15, Math.abs(currentMaxDepthVal - currentMinDepthVal));
    const basePhysicalMax = calcBasePhysicalMaxSpm(currentSpan);
    const spmPct = getInterpolatedVal(waypointsSpm, playbackTime);
    let calculatedSpm = (spmPct / 100) * basePhysicalMax;

    if (level === 'eco_75') calculatedSpm *= 0.75;
    else if (level === 'half_50') calculatedSpm *= 0.50;
    else if (level === 'quiet_30') calculatedSpm *= 0.30;
    else if (level === 'custom_cap') calculatedSpm = Math.min(calculatedSpm, capVal || throttleCapMax);

    if (turboActive) {
      calculatedSpm *= turboMultiplier;
    }
    const instantSpm = Math.max(0, Math.min(600, Math.round(calculatedSpm)));
    const rawPower = Math.max(0, Math.min(100, Math.round((instantSpm / basePhysicalMax) * 100)));
    let spmPower = 0;
    if (rawPower > 0) {
      spmPower = speedCurveMode === 'torque_boost'
        ? Math.max(1, Math.min(100, Math.round(18 + (rawPower / 100) * 82)))
        : rawPower;
    }

    if (servokBle.connected) {
      await servokBle.sendCommand(0x03, spmPower, `⚡ DROSSELUNG: ${desc} -> ${instantSpm} SPM`);
    } else if (bleCharacteristic) {
      const cmdSpm = 0x03;
      const payloadSpm = new Uint8Array([0xCC, cmdSpm, spmPower, (cmdSpm + spmPower) & 0xFF]);
      writeToBleCharacteristic(bleCharacteristic, payloadSpm).catch(() => {});
      lastSmartStateRef.current.spm = spmPower;
    }

    showInAppNotification(`⚡ Drosselung: ${desc}`, level === 'none' ? 'info' : 'warning');
  };

  /**
   * DYNAMIK-PROFIL SCHNELLWAHL (SPORT / DYNAMIC / SLOW)
   * Überträgt Härte (0-100%) in die 4. Graph-Spur, steuert das BLE-Smoothness-Register 0x09
   * und synchronisiert Drosselung und Turbo-Zustand sauber ohne Konflikte.
   */
  const applyDynamicsProfile = (profile: 'sport' | 'dynamic' | 'slow') => {
    setActiveDynamicsPreset(profile);
    pushHistory();

    let targetHardness = 65;
    let targetSmooth = 3;
    let title = 'DYNAMIC';
    let desc = 'Standard Min-Max SPM · 65% Härte (BLE 0x09: 3 Dynamisch)';
    let notificationType: 'info' | 'warning' = 'info';

    if (profile === 'sport') {
      targetHardness = 100;
      targetSmooth = 0;
      title = 'SPORT';
      desc = '🔥 1.5x Turbo sofort aktiv · 100% Härte (BLE 0x09: 0 Sofortige Umkehr)';
      notificationType = 'warning';
      setTurboActive(true);
      setTurboMultiplier(1.5);
      setThrottleLevel('none'); // Ungedrosselt!
      setSpeedBoostFactor(1.5);
    } else if (profile === 'slow') {
      targetHardness = 20;
      targetSmooth = 8;
      title = 'SLOW';
      desc = '🌊 50% Drosselung · 20% Härte (BLE 0x09: 8 Sanfte S-Kurve)';
      notificationType = 'info';
      setTurboActive(false);
      setThrottleLevel('half_50'); // 50% sanfte Drosselung
      setSpeedBoostFactor(1.0);
    } else {
      // Dynamic:
      setTurboActive(false);
      setThrottleLevel('none'); // Standard ohne Drosselung
      setSpeedBoostFactor(1.0);
    }

    setHardwareSmoothness(targetSmooth);

    setWaypointsHardness((prev) => {
      if (prev.length <= 2) {
        return [
          { id: prev[0]?.id || 'hrd-start', time: 0, pos: targetHardness },
          { id: prev[1]?.id || 'hrd-end', time: durationMs, pos: targetHardness },
        ];
      }
      return prev.map((wp) => ({
        ...wp,
        pos: targetHardness,
      }));
    });

    // Sofortige Hardware-Aktualisierung über BLE falls verbunden
    if (servokBle.connected) {
      servokBle.setSmoothness(targetSmooth);
      if (profile === 'sport') {
        servokBle.sendCommand(0x03, 100, '⚡ SPORT: 100% Volllast-Power');
      }
    } else if (bleCharacteristic) {
      const cmdSmooth = 0x09;
      const payloadSmooth = new Uint8Array([0xCC, cmdSmooth, targetSmooth, (cmdSmooth + targetSmooth) & 0xFF]);
      writeToBleCharacteristic(bleCharacteristic, payloadSmooth).catch(() => {});
      lastSmartStateRef.current.smoothness = targetSmooth;
    }

    showInAppNotification(`⚡ ${title}-Modus aktiviert: ${desc}`, notificationType);
  };

  /**
   * Sendet Hub-Tiefe, Stöße/Min (SPM) und Stoß-Geschwindigkeit an den Haupt-Aktuator
   */
  const sendServokStateToBLE = async (depth: number, spm: number, speed: number) => {
    if (servokBle.connected) {
      if (controlMode === 'position') {
        servokBle.streamPosition(depth);
      } else {
        const valMax = Math.max(0, Math.min(100, Math.round(currentMaxDepthVal)));
        const valMin = Math.max(0, Math.min(100, Math.round(currentMinDepthVal)));
        const currentSpanForSpeed = Math.max(15, valMax - valMin);
        const basePhysicalMax = calcBasePhysicalMaxSpm(currentSpanForSpeed);
        
        // Saubere und transparente Leistungs-Berechnung ohne parallele Multiplikator-Verzerrungen:
        const rawPowerPct = Math.max(0, Math.min(100, Math.round((currentSpmVal / basePhysicalMax) * 100)));
        let spmPowerPct = 0;
        if (rawPowerPct > 0) {
          if (speedCurveMode === 'torque_boost') {
            // Drehmoment-Sockel: Skaliert 1-100% in den aktiven Bereich (18-100% PWM), damit der Motor nicht im toten Bereich schleicht
            spmPowerPct = Math.max(1, Math.min(100, Math.round(18 + (rawPowerPct / 100) * 82)));
          } else {
            spmPowerPct = Math.max(1, Math.min(100, Math.round(rawPowerPct)));
          }
        }
        await servokBle.sendAutoCycleSettings(valMin, valMax, spmPowerPct, currentDynamicSmoothness);
      }
      return;
    }

    if (!bleCharacteristic) return;

    try {
      const speedByte = Math.max(0, Math.min(100, Math.round(speed))); // Härte 0-100
      const posByte = Math.max(0, Math.min(100, Math.round(depth)));   // Tiefe 0-100
      
      // Saubere Rückrechnung des physikalischen SPM auf die 0-100% Motor-Power
      const currentSpan = Math.max(15, Math.abs(currentMaxDepthVal - currentMinDepthVal));
      const basePhysicalMax = calcBasePhysicalMaxSpm(currentSpan);
      const rawPowerPct = Math.max(0, Math.min(100, Math.round((spm / basePhysicalMax) * 100))); 
      let spmPowerPct = 0;
      if (rawPowerPct > 0) {
        if (speedCurveMode === 'torque_boost') {
          spmPowerPct = Math.max(1, Math.min(100, Math.round(18 + (rawPowerPct / 100) * 82)));
        } else {
          spmPowerPct = Math.max(1, Math.min(100, Math.round(rawPowerPct)));
        }
      }
      
      // Legacy Byte für alte Protokolle
      const spmByte = Math.max(0, Math.min(255, Math.round((spmPowerPct / 100) * 255)));

      let success = false;
      let primaryHex = '';

      if (servokProtocol === 'servok') {
        const payload = new Uint8Array([0xAA, 0x05, spmPowerPct, posByte, 0x55]);
        primaryHex = Array.from(payload).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        success = await writeToBleCharacteristic(bleCharacteristic, payload);
      } else if (servokProtocol === 'hismith_v2') {
        const payload = new Uint8Array([0xAA, 0x55, 0x03, speedByte, posByte, 0x00]);
        primaryHex = Array.from(payload).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        success = await writeToBleCharacteristic(bleCharacteristic, payload);
      } else if (servokProtocol === 'hismith_v3') {
        const checksum = (0x01 + speedByte) & 0xFF;
        const payload = new Uint8Array([0xAA, 0x55, 0x01, speedByte, checksum]);
        primaryHex = Array.from(payload).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        success = await writeToBleCharacteristic(bleCharacteristic, payload);
      } else if (servokProtocol === 'raw_byte') {
        const payload = new Uint8Array([spmPowerPct]);
        primaryHex = Array.from(payload).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        success = await writeToBleCharacteristic(bleCharacteristic, payload);
      } else if (servokProtocol === 'ascii') {
        const textStr = `POS:${posByte};SPD:${speedByte}\n`;
        const payload = new TextEncoder().encode(textStr);
        primaryHex = textStr.trim();
        success = await writeToBleCharacteristic(bleCharacteristic, payload);
      } else {
        // UNIVERSAL PROTOCOL (Natives Premium Smart-Protokoll mit Delta-Caching)
        let valMax = Math.max(0, Math.min(100, Math.round(currentMaxDepthVal)));
        let valMin = Math.max(0, Math.min(100, Math.round(currentMinDepthVal)));
        
        // --- HARDWARE PROTECTOR: MIKRO-HUB VERHINDERN ---
        const minSpan = 20;
        if (valMax - valMin < minSpan) {
          const center = valMin + (valMax - valMin) / 2;
          valMin = Math.max(0, Math.round(center - minSpan / 2));
          valMax = Math.min(100, Math.round(center + minSpan / 2));
          
          if (valMin === 0) valMax = minSpan;
          if (valMax === 100) valMin = 100 - minSpan;
        }

        const valSpm = spmPowerPct;

        // --- HISMITH SERVOK S2 PROTOKOLL: 0x07 = MIN-HUB, 0x08 = MAX-HUB, 0x09 = SMOOTHNESS ---
        const sendMax = async () => {
          if (valMax !== lastSmartStateRef.current.max) {
            const cmdMax = 0x08;
            const payloadMax = new Uint8Array([0xCC, cmdMax, valMax, (cmdMax + valMax) & 0xFF]);
            await writeToBleCharacteristic(bleCharacteristic, payloadMax);
            lastSmartStateRef.current.max = valMax;
            await new Promise(r => setTimeout(r, 10));
          }
        };

        const sendMin = async () => {
          if (valMin !== lastSmartStateRef.current.min) {
            const cmdMin = 0x07; // 0x07 ist Min-Hub
            const payloadMin = new Uint8Array([0xCC, cmdMin, valMin, (cmdMin + valMin) & 0xFF]);
            await writeToBleCharacteristic(bleCharacteristic, payloadMin);
            lastSmartStateRef.current.min = valMin;
            await new Promise(r => setTimeout(r, 10));
          }
        };

        // --- DER BULLETPROOF FIRMWARE BYPASS ---
        const currMax = lastSmartStateRef.current.max !== -1 ? lastSmartStateRef.current.max : 100;
        const currMin = lastSmartStateRef.current.min !== -1 ? lastSmartStateRef.current.min : 0;

        if (valMax > currMax) {
          await sendMax();
          await sendMin();
        } else if (valMin < currMin) {
          await sendMin();
          await sendMax();
        } else {
          await sendMin();
          await sendMax();
        }

        // --- SMOOTHNESS / BESCHLEUNIGUNGS-RAMPE (0x09) AUS DER HÄRTE-LINIE ---
        // Nahtlose Kopplung an die 4. Graph-Spur (100% Härte -> 0 Sport/Instant, 0% Härte -> 10 Sanft)
        if (currentDynamicSmoothness !== lastSmartStateRef.current.smoothness) {
          const cmdSmooth = 0x09;
          const clampedSmooth = Math.max(0, Math.min(10, Math.round(currentDynamicSmoothness)));
          const payloadSmooth = new Uint8Array([0xCC, cmdSmooth, clampedSmooth, (cmdSmooth + clampedSmooth) & 0xFF]);
          await writeToBleCharacteristic(bleCharacteristic, payloadSmooth);
          lastSmartStateRef.current.smoothness = clampedSmooth;
          setHardwareSmoothness(clampedSmooth);
          await new Promise(r => setTimeout(r, 10));
        }

        // Speed/SPM Kommando (0x03)
        if (valSpm !== lastSmartStateRef.current.spm) {
          const cmdSpm = 0x03;
          const payloadSpm = new Uint8Array([0xCC, cmdSpm, valSpm, (cmdSpm + valSpm) & 0xFF]);
          success = await writeToBleCharacteristic(bleCharacteristic, payloadSpm);
          lastSmartStateRef.current.spm = valSpm;
          primaryHex = Array.from(payloadSpm).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        } else {
          success = true;
        }
      }

      if (success) {
        setLastServokTxHex(primaryHex);
        setLastServokTxTime(Date.now());
      }
    } catch (err: any) {
      console.error('Fehler beim BLE Senden:', err);
    }
  };

  const sendPositionToBLE = (pos: number) => sendServokStateToBLE(pos, currentSpmVal, currentHardnessVal);

  // Live-Übertragung der Servok-Parameter an die Hardware während Playback (nur im Editor-Modus!)
  useEffect(() => {
    if (bleStatus === 'connected' && (bleCharacteristic || servokBle.connected)) {
      if (isPlaying && currentView === 'editor') {
        const now = Date.now();
        // Drosselung auf 25ms (40 Hz) reduziert Latenz massiv und liefert flüssiges High-Speed Tracking!
        if (now - lastBleWriteTimeRef.current >= 25) {
          lastBleWriteTimeRef.current = now;
          sendServokStateToBLE(currentServokEffectivePos, currentSpmVal, currentHardnessVal);
        }
      } else {
        // Wenn Pause gedrückt wird oder Editor verlassen wird: Motor stoppen und Cache leeren!
        if (lastBleWriteTimeRef.current !== -1) {
          lastBleWriteTimeRef.current = -1;
          
          const enforceStop = async () => {
            if (servokBle.connected) {
              await servokBle.stop();
            }
            // 80ms warten, um Race Conditions zu vermeiden
            await new Promise(r => setTimeout(r, 80));
            
            const stopSpeed = new Uint8Array([0xCC, 0x03, 0x00, 0x03]);
            try {
              await writeToBleCharacteristic(bleCharacteristic, stopSpeed);
              await new Promise(r => setTimeout(r, 40));
              await writeToBleCharacteristic(bleCharacteristic, stopSpeed); // Sicherheitsschlag
            } catch (e) {
              console.warn('Fehler beim Stoppen', e);
            }
          };
          enforceStop();
          
          if (lastSmartStateRef.current) {
            lastSmartStateRef.current = { min: -1, max: -1, spm: -1, smoothness: -1 };
          }
        }
      }
    }
  }, [playbackTime, isPlaying, currentView, bleStatus, currentServokEffectivePos, currentSpmVal, currentHardnessVal, currentDynamicSmoothness, currentMinDepthVal, currentMaxDepthVal, hardwareSmoothness, speedBoostFactor, speedCurveMode]);

  // ============================================================================
  // KAPITELWECHSEL & TRANSPORT-STEUERUNG IM EDITOR
  // ============================================================================
  // 1. Zurück zum Start (00:00:00)
  const handleResetToStart = useCallback(() => {
    sensoryEngine.playTactileClick('secondary');
    setPlaybackTime(0);
    showInAppNotification('⏮ Zurück zum Start (00:00:00)', 'info');
  }, []);

  // 2. Vorheriges Kapitel / Marker innerhalb der Vorlage
  const handlePrevChapter = useCallback(() => {
    sensoryEngine.playTactileClick('secondary');
    if (!subsections || subsections.length === 0) {
      setPlaybackTime(0);
      showInAppNotification('⏮ Anfang der Vorlage erreicht', 'info');
      return;
    }
    const sorted = [...subsections].sort((a, b) => a.startTime - b.startTime);
    let targetTime = 0;
    let targetName = 'Start';
    for (let i = sorted.length - 1; i >= 0; i--) {
      const sub = sorted[i];
      if (playbackTime > sub.startTime + 1500) {
        targetTime = sub.startTime;
        targetName = sub.name;
        break;
      } else if (playbackTime > sub.startTime) {
        if (i > 0) {
          targetTime = sorted[i - 1].startTime;
          targetName = sorted[i - 1].name;
        } else {
          targetTime = 0;
          targetName = 'Start';
        }
        break;
      }
    }
    setPlaybackTime(targetTime);
    showInAppNotification(`⏮ Kapitel: ${targetName}`, 'info');
  }, [subsections, playbackTime]);

  // 3. Nächstes Kapitel / Marker innerhalb der Vorlage
  const handleNextChapter = useCallback(() => {
    sensoryEngine.playTactileClick('secondary');
    if (!subsections || subsections.length === 0) {
      showInAppNotification('Keine weiteren Kapitel definiert', 'info');
      return;
    }
    const sorted = [...subsections].sort((a, b) => a.startTime - b.startTime);
    const nextSub = sorted.find((s) => s.startTime > playbackTime + 100);
    if (nextSub) {
      setPlaybackTime(nextSub.startTime);
      showInAppNotification(`⏭ Kapitel: ${nextSub.name}`, 'info');
    } else {
      showInAppNotification('⏭ Letztes Kapitel erreicht', 'info');
    }
  }, [subsections, playbackTime]);

  // 4. Zentraler Action-Dispatcher für Controller-Buttons & Tastatur-Hotkeys im Editor
  const dispatchEditorAction = useCallback(
    (act: ControllerActionId) => {
      switch (act) {
        case 'editor_play_pause':
          setIsPlaying((p) => {
            const next = !p;
            if (next) {
              sensoryEngine.playTactileClick('primary');
              if (playbackTime >= durationMs) setPlaybackTime(0);
            } else {
              sensoryEngine.playTactileClick('secondary');
            }
            return next;
          });
          break;
        case 'editor_emergency_stop':
          handleEmergencyStop();
          break;
        case 'editor_reset_to_start':
          handleResetToStart();
          break;
        case 'editor_prev_chapter':
          handlePrevChapter();
          break;
        case 'editor_next_chapter':
          handleNextChapter();
          break;
        case 'editor_turbo_toggle':
          handleToggleTurbo();
          break;
        case 'editor_loop_toggle':
          setLoopEnabled((l) => {
            const next = !l;
            sensoryEngine.playToggle(next);
            return next;
          });
          break;
        case 'editor_spm_increase':
          setWaypointsSpm((prev) => {
            const next = prev.map((w) => ({ ...w, pos: Math.min(100, w.pos + 5) }));
            const avg = next.reduce((sum, w) => sum + w.pos, 0) / (next.length || 1);
            sensoryEngine.playSpeedHarmonic(avg, 100);
            return next;
          });
          showInAppNotification('⚡ SPM +5% erhöht', 'info');
          break;
        case 'editor_spm_decrease':
          setWaypointsSpm((prev) => {
            const next = prev.map((w) => ({ ...w, pos: Math.max(0, w.pos - 5) }));
            const avg = next.reduce((sum, w) => sum + w.pos, 0) / (next.length || 1);
            sensoryEngine.playSpeedHarmonic(avg, 100);
            return next;
          });
          showInAppNotification('⚡ SPM -5% gesenkt', 'info');
          break;
      }
    },
    [
      playbackTime,
      durationMs,
      handleEmergencyStop,
      handleResetToStart,
      handlePrevChapter,
      handleNextChapter,
      handleToggleTurbo,
    ]
  );

  // 5. Xbox Gamepad Polling Loop im Editor
  useEffect(() => {
    if (currentView !== 'editor') return;

    let animId: number;
    const poll = () => {
      const actions = gamepadService.pollTriggeredActions('editor');
      for (const act of actions) {
        dispatchEditorAction(act);
      }
      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [currentView, dispatchEditorAction]);

  // 6. Tastatur-Hotkey Listener im Editor
  useEffect(() => {
    if (currentView !== 'editor') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const act = gamepadService.matchKeyboardAction(e, 'editor');
      if (act) {
        e.preventDefault();
        dispatchEditorAction(act);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentView, dispatchEditorAction]);

  /**
   * BLE-Verbindung im Simulator-Modus simulieren (inklusive automatischer UUID-Erkennung)
   */
  const simulateBleConnection = () => {
    setBleStatus('connecting');
    addLog('INFO', '[SIMULATION] Starte Bluetooth-Gerätesuche & automatischen GATT-Scan...');
    servokBle.startSimulation();
    
    setTimeout(() => {
      const simService = '0000ffe5-0000-1000-8000-00805f9b34fb';
      const simChar = '0000ffe9-0000-1000-8000-00805f9b34fb';
      
      setServiceUuid(simService);
      setCharUuid(simChar);
      
      setAutoDetectedInfo({
        serviceUuid: simService,
        charUuid: simChar,
        writeType: 'writeWithoutResponse',
        candidatesCount: 2,
        label: 'Hismith Servok Native S2 (Simuliert)',
        isAutoDetected: true
      });

      setBleStatus('connected');
      setBleModelName('Servok S2 (Virtuelle Hardware)');
      
      addLog('INFO', '[SIMULATION] GATT-Scan ergab kompatible Hismith S2 Hardware-Schreib-Services.');
      addLog('INFO', `[SIMULATION] ✓ Automatisch eingewählt auf Service: ${simService}`);
      addLog('INFO', `[SIMULATION] ✓ Automatisch eingewählt auf Charakteristik: ${simChar}`);
      addLog('INFO', '[SIMULATION] Verbindungs-Sicherheit: Verschlüsselte GATT-Sitzung etabliert.');
      
      // Erstelle ein Mock-Objekt für Schreibbefehle
      setBleCharacteristic({
        writeValueWithoutResponse: async (data: Uint8Array) => {
          return new Promise(resolve => setTimeout(resolve, 5));
        },
        writeValue: async (data: Uint8Array) => {
          return new Promise(resolve => setTimeout(resolve, 5));
        }
      });
    }, 800);
  };

  // --- LUBE LAUNCHER (ZWEITGERÄT) BLE CONTROLLER & TRIGGER LOGIK ---

  /**
   * Sendet einen Sprüh/Pump-Befehl an den Lube Launcher (Zweitgerät)
   */
  const sendLubeCommandToBLE = async (bursts: number) => {
    sensoryEngine.playLubeDroplet();
    const count = Math.max(1, Math.min(10, Math.round(bursts)));
    setManualLubeUntil(Date.now() + Math.max(1000, count * 400));
    setManualLubeBursts(count);

    let success = false;
    let primaryHex = '';

    if (lubeBleStatus === 'connected' && lubeBleCharacteristic) {
      try {
        // Hardware-Limit-Bypass: Wir senden den funktionierenden Einzel-Befehl per asynchroner Schleife
        const payload = new Uint8Array([0xCC, 0x0B, 0x01, 0x0C]);
        primaryHex = Array.from(payload).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

        for (let i = 0; i < count; i++) {
          success = await writeToBleCharacteristic(lubeBleCharacteristic, payload);
          
          // WICHTIG: 700ms Pause zwischen den Stößen, damit der Motor den physischen Hub beenden kann
          if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 700));
          }
        }

        if (success) {
          setLastLubeTxHex(primaryHex);
          setLastLubeTxTime(Date.now());
          addLog('TX', `💧 Lube Launcher: ${count} Pumpstoß/stöße (per Schleife) ausgelöst`, primaryHex);
          showInAppNotification(`💧 Lube Launcher: ${count}x gesendet!`, 'success');
        } else {
          addLog('ERROR', `Lube Sende-Fehler: Kanal verweigerte Schreibbefehl.`);
          showInAppNotification('Lube Launcher Sende-Fehler.', 'warning');
        }
      } catch (err: any) {
        console.error('Fehler beim Senden an Lube Launcher:', err);
        addLog('ERROR', `Lube Launcher Sende-Fehler: ${err.message}`);
        showInAppNotification(`Lube Launcher Sende-Fehler: ${err.message}`, 'warning');
      }
    } else if (lubeBleStatus === 'disconnected' || lubeBleStatus === 'error') {
      showInAppNotification('Lube Launcher ist nicht verbunden. Bitte erst koppeln.', 'info');
    }
  };

  /**
   /**
   * Automatische Auslösung des Lube Launchers bei Erreichen der Triggerpunkte während der Session-Wiedergabe
   */
  useEffect(() => {
    if (!isPlaying) {
      firedLubeTriggerIdsRef.current.clear();
      lastLubeCheckTimeRef.current = playbackTime;
      return;
    }

    // --- LOOP- UND REWIND-ERKENNUNG ---
    // Wenn die aktuelle Abspielzeit kleiner ist als beim letzten Check (z.B. Sprung von Minute 3 zurück auf 0 beim Loop),
    // leeren wir den Speicher. Alle Pumpstöße sind für den neuen Durchlauf wieder "scharf".
    if (playbackTime < lastLubeCheckTimeRef.current) {
      firedLubeTriggerIdsRef.current.clear();
    }
    lastLubeCheckTimeRef.current = playbackTime;

    lubeTriggers.forEach((trig) => {
      // Prüfe, ob die aktuelle Abspielzeit den Triggerpunkt erreicht oder knapp passiert hat (300ms Zeitfenster)
      if (
        playbackTime >= trig.time &&
        playbackTime <= trig.time + 300 &&
        !firedLubeTriggerIdsRef.current.has(trig.id)
      ) {
        firedLubeTriggerIdsRef.current.add(trig.id);
        sendLubeCommandToBLE(trig.bursts);
      }
    });
  }, [playbackTime, isPlaying, lubeTriggers, lubeBleStatus, lubeBleCharacteristic]);

  /**
   * Verbindet den Lube Launcher als Zweitgerät über Web Bluetooth mit automatischen GATT-Scan
   */
  const connectLubeBLE = async () => {
    setLubeBleError(null);
    setLubeBleStatus('connecting');
    addLog('INFO', 'Starte Bluetooth-Suche nach Lube Launcher (Zweitgerät)...');

    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      const msg = 'Web Bluetooth wird von diesem Browser nicht unterstützt. Bitte Chrome, Edge oder Opera nutzen.';
      setLubeBleError(msg);
      setLubeBleStatus('error');
      addLog('ERROR', msg);
      return;
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_OPTIONAL_SERVICES,
      });

      addLog('INFO', `Lube Launcher Gerät ausgewählt: "${device.name || 'Gleitmittel-Spender'}". Verbinde mit GATT-Server...`);

      const server = await device.gatt.connect();
      setLubeBleDevice(device);

      let targetCharacteristic: any = null;
      let detectedLabel = 'Standard Lube Channel';
      const candidates: {
        serviceUuid: string;
        charUuid: string;
        writeType: string;
        label: string;
        characteristic: any;
        score: number;
      }[] = [];

      try {
        const services = await server.getPrimaryServices();
        for (const s of services) {
          try {
            const chars = await s.getCharacteristics();
            for (const c of chars) {
              const props = c.properties;
              const canWriteNoResp = props.writeWithoutResponse || props.writeWithoutResponse === true;
              const canWrite = props.write || props.write === true;
              if (canWriteNoResp || canWrite) {
                const sUuid = s.uuid.toLowerCase();
                const cUuid = c.uuid.toLowerCase();
                let score = 0;
                let label = 'Standard Schreibkanal';

                if (sUuid.includes('fff0') || cUuid.includes('fff1') || cUuid.includes('fff2')) {
                  score += 100;
                  label = 'Hismith / Lube Native Protocol';
                } else if (sUuid.includes('ffe0') || cUuid.includes('ffe1')) {
                  score += 50;
                  label = 'HM-10 Serial Port';
                } else if (sUuid.includes('6e40')) {
                  score += 40;
                  label = 'Nordic UART Service (NUS)';
                } else if (sUuid.includes('1800') || sUuid.includes('1801') || sUuid.includes('180a')) {
                  score -= 100; // Vermeide System/Standard-Access GATT-Services
                  label = 'GATT System Info Channel';
                }

                if (canWriteNoResp) score += 10;

                candidates.push({
                  serviceUuid: s.uuid,
                  charUuid: c.uuid,
                  writeType: canWriteNoResp ? 'writeWithoutResponse' : 'write',
                  label,
                  characteristic: c,
                  score,
                });
              }
            }
          } catch {
            // Ignoriere geschützte Systemservices
          }
        }
      } catch {
        addLog('INFO', 'Direkter Service-Scan eingeschränkt. Nutze konfigurierten Lube-Kanal...');
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        targetCharacteristic = best.characteristic;
        detectedLabel = best.label;
      }

      if (!targetCharacteristic) {
        const serv = await server.getPrimaryService(lubeServiceUuid);
        targetCharacteristic = await serv.getCharacteristic(lubeCharUuid);
        detectedLabel = 'Manuell konfiguierter Lube-Kanal';
      }

      setLubeBleCharacteristic(targetCharacteristic);
      setLubeBleStatus('connected');
      setLubeBleModelName(device.name || 'Lube Launcher Pro');
      setLubeAutoDetectedInfo({
        serviceUuid: targetCharacteristic.service?.uuid || lubeServiceUuid,
        charUuid: targetCharacteristic.uuid || lubeCharUuid,
        writeType: targetCharacteristic.properties.writeWithoutResponse ? 'writeWithoutResponse' : 'write',
        label: detectedLabel,
        isAutoDetected: true,
      });

      device.addEventListener('gattserverdisconnected', onLubeBleDisconnected);
      addLog('INFO', `✓ Lube Launcher (Zweitgerät) erfolgreich verbunden! (${device.name || 'Lube Launcher Pro'} auf ${detectedLabel})`);
    } catch (err: any) {
      console.error('Lube Launcher BLE Verbindungsfehler:', err);
      setLubeBleStatus('error');
      const isPolicyErr =
        err?.name === 'SecurityError' ||
        err?.message?.includes('disallowed by permissions policy') ||
        err?.message?.includes('Permissions policy') ||
        err?.message?.includes('requestDevice') ||
        err?.message?.includes('bluetooth');

      let errMessage = err?.message || 'Verbindung zum Lube Launcher fehlgeschlagen.';
      if (isPolicyErr || (typeof window !== 'undefined' && window.self !== window.top)) {
        errMessage = 'Web Bluetooth ist in iFrames (Vorschau-Fenster) durch Browser-Sicherheitsrichtlinien gesperrt. Bitte öffne die App in einem neuen Tab!';
      }
      setLubeBleError(errMessage);
      addLog('ERROR', `Lube Launcher Fehler: ${errMessage}`);
    }
  };

  /**
   * Simuliert die Verbindung zum Lube Launcher (Zweitgerät)
   */
  const simulateLubeBleConnection = () => {
    setLubeBleStatus('connecting');
    addLog('INFO', '[SIMULATION] Verbinde Lube Launcher (Zweitgerät)...');

    setTimeout(() => {
      setLubeBleCharacteristic({
        writeValueWithoutResponse: async () => new Promise(r => setTimeout(r, 5)),
        writeValue: async () => new Promise(r => setTimeout(r, 5)),
      });

      setLubeBleStatus('connected');
      setLubeBleModelName('Lube Launcher Pro (Simuliert)');
      setLubeAutoDetectedInfo({
        serviceUuid: '0000fff0-0000-1000-8000-00805f9b34fb',
        charUuid: '0000fff2-0000-1000-8000-00805f9b34fb',
        writeType: 'writeWithoutResponse',
        label: 'Lube Launcher Protocol (Auto-Erkannt)',
        isAutoDetected: true,
      });

      addLog('INFO', '✓ [SIMULATION] Lube Launcher Zweitgerät einsatzbereit! Automatische Erkennung gesichert.');
    }, 1000);
  };

  const disconnectLubeBLE = () => {
    if (lubeBleDevice && lubeBleDevice.gatt?.connected) {
      lubeBleDevice.gatt.disconnect();
    }
    onLubeBleDisconnected();
  };

  const onLubeBleDisconnected = () => {
    setLubeBleStatus('disconnected');
    setLubeBleCharacteristic(null);
    setLubeBleDevice(null);
    setLubeAutoDetectedInfo(null);
    addLog('INFO', 'Lube Launcher (Zweitgerät) getrennt.');
  };

  // Helper-Funktionen zur Bearbeitung der Lube-Trigger
  const addLubeTrigger = (timeMs?: number, bursts?: number) => {
    pushHistory();
    const targetTime = timeMs !== undefined ? timeMs : Math.round(playbackTime / 50) * 50;
    const clampedTime = Math.max(0, Math.min(durationMs, targetTime));
    const burstCount = bursts ?? 2;

    setLubeTriggers((prev) => {
      // Doppeleinträge an der exakt gleichen Zeitstelle verhindern
      const existing = prev.find((t) => Math.abs(t.time - clampedTime) < 10);
      if (existing) {
        return prev.map((t) => (t.id === existing.id ? { ...t, bursts: burstCount } : t));
      }

      const newTrigger: LubeTrigger = {
        id: 'lube-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        time: clampedTime,
        bursts: burstCount,
      };
      setSelectedLubeTriggerId(newTrigger.id);
      addLog('INFO', `💧 Lube Impuls bei ${formatHHMMSS(newTrigger.time)} (${newTrigger.time}ms) gesetzt: ${newTrigger.bursts} Pumpstoß/stöße.`);
      return [...prev, newTrigger].sort((a, b) => a.time - b.time);
    });
  };

  const updateLubeTrigger = (id: string, timeMs: number, bursts: number) => {
    pushHistory();
    setLubeTriggers((prev) =>
      prev
        .map((t) => (t.id === id ? { ...t, time: Math.max(0, Math.min(durationMs, Math.round(timeMs))), bursts: Math.max(1, Math.min(10, Math.round(bursts))) } : t))
        .sort((a, b) => a.time - b.time)
    );
  };

  const deleteLubeTrigger = (id: string) => {
    pushHistory();
    setLubeTriggers((prev) => prev.filter((t) => t.id !== id));
    if (selectedLubeTriggerId === id) setSelectedLubeTriggerId(null);
    addLog('INFO', '💧 Lube Impuls gelöscht.');
  };

  // --- STATISTIKEN BERECHNEN ---
  const stats = useMemo(() => {
    if (waypoints.length === 0) return { min: 0, max: 0, count: 0, speedEst: 0 };
    
    const positions = waypoints.map(w => w.pos);
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    
    // Berechne die durchschnittliche Steigung (Geschwindigkeit)
    let totalDistance = 0;
    const sorted = [...waypoints].sort((a, b) => a.time - b.time);
    for (let i = 0; i < sorted.length - 1; i++) {
      totalDistance += Math.abs(sorted[i + 1].pos - sorted[i].pos);
    }
    
    // Schätzung Hubbewegungen (Strokes) pro Minute (SPM)
    // Bezogen auf die Dauer und die zurückgelegte Gesamtstrecke
    const cycleCount = totalDistance / 200; // 200% entspricht einer vollen Hin- und Herbewegung (0-100-0)
    const spm = durationMs > 0 ? (cycleCount / (durationMs / 60000)) : 0;
    const clampedSpm = Math.min(Math.round(spm), maxSpmForHub);

    return {
      min,
      max,
      count: waypoints.length,
      totalTravel: Math.round(totalDistance),
      spm: clampedSpm
    };
  }, [waypoints, durationMs, maxSpmForHub]);

  return (
    <div className="min-h-screen bg-bg-base text-text-bright font-sans antialiased pb-12 selection:bg-brand-cyan/20 selection:text-brand-cyan" id="main-container">
      
      {/* IN-APP TOAST NOTIFICATION BANNER (Direkte visuelle Bestätigung im Editor) */}
      <AnimatePresence>
        {appNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md font-mono border ${
              appNotification.type === 'warning'
                ? 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.4)] ring-1 ring-rose-500/60'
                : appNotification.type === 'info'
                ? 'bg-bg-panel/95 border-brand-cyan/80 text-text-bright shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'bg-bg-panel/95 border-emerald-500/80 text-text-bright shadow-[0_0_20px_rgba(16,185,129,0.25)]'
            }`}
          >
            {appNotification.type === 'warning' ? (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 animate-pulse" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 animate-bounce" />
            )}
            <div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${
                appNotification.type === 'warning' ? 'text-rose-400 font-extrabold' : 'text-emerald-400'
              }`}>
                {appNotification.type === 'warning' ? '🛑 NOT-AUS SICHERHEITS-STOPP' : 'In-App Editor Status'}
              </div>
              <div className="text-xs text-text-bright font-medium">
                {appNotification.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAppNotification(null)}
              className="p-1 hover:bg-border-bright rounded text-text-dim hover:text-text-bright cursor-pointer ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prozeduraler Seiden- & Glas-Optik Hintergrund-Shader */}
      <SensualSilkShader
        luminance={themeLuminance}
        temperature={themeTemperature}
        intensity={isPlaying ? Math.min(1, currentSpmVal / 160) : 0.35}
      />

      {/* HEADER SECTION (HAUPT-NAVIGATION) */}
      <header className="border-b border-border-dim/80 bg-bg-surface/85 backdrop-blur-2xl sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3 shadow-sm" id="app-header">
        <div className="w-full max-w-[1850px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Left: Brand Identity + Primary Studio View Switcher */}
          <div className="flex items-center justify-between lg:justify-start gap-4 flex-wrap">
            <div 
              onClick={() => {
                sensoryEngine.playGlassTouch(1.15);
                setCurrentView('start');
              }}
              className="flex items-center gap-3 cursor-pointer group"
              title={tr(language, 'Zur Startseite', 'To Home', 'Al Inicio')}
            >
              <div className="w-10 h-10 flex items-center justify-center bg-brand-cyan/15 border border-brand-cyan/40 rounded-2xl shadow-sm group-hover:border-brand-cyan transition-all">
                <Waves className="h-5 w-5 text-brand-cyan" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-semibold text-text-bright font-display tracking-wide">
                    Hismith Servok Studio
                  </h1>
                  <span className="text-[10px] bg-brand-cyan/15 text-brand-cyan px-2.5 py-0.5 rounded-full font-mono font-bold border border-brand-cyan/35">
                    V0.9
                  </span>
                </div>
                <p className="text-[10px] text-text-dim font-sans flex items-center gap-1.5 flex-wrap">
                  <span>{t.padViewBtn || tr(language, 'Einhand-Pad', 'One-Hand Pad', 'Pad Monomanual')}</span>
                  <span className="text-border-bright">·</span>
                  <span className="text-brand-cyan font-semibold">
                    {totalPresetCount} {tr(language, 'Vorlagen in 10 Kategorien', 'Presets in 10 Categories', 'Plantillas en 10 Categorías')}
                  </span>
                  <span className="text-border-bright">·</span>
                  <span>{tr(language, '4-Spur Kurven-Studio', '4-Track Curve Studio', 'Estudio de Curvas de 4 Pistas')}</span>
                </p>
              </div>
            </div>

            <div className="hidden sm:block w-px h-6 bg-border-dim" />

            {/* Global View Navigation (Start · Einhand-Pad · Vorlagen · Editor · Einstellungen) */}
            <nav className="flex items-center bg-bg-base/80 border border-border-dim p-1 rounded-full gap-1 font-sans text-xs flex-wrap">
              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playGlassTouch(1.0);
                  setCurrentView('start');
                }}
                className={`px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  currentView === 'start'
                    ? 'bg-brand-cyan text-bg-base shadow-xs'
                    : 'text-text-dim hover:text-text-bright hover:bg-bg-panel'
                }`}
                id="nav-start-btn"
              >
                <Home className="h-3.5 w-3.5" />
                <span>{t.startpageBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playGlassTouch(1.1);
                  setIsPlaying(false);
                  setCurrentView('padPlayer');
                }}
                className={`px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  currentView === 'padPlayer'
                    ? 'bg-brand-cyan text-bg-base shadow-xs'
                    : 'text-text-dim hover:text-text-bright hover:bg-bg-panel'
                }`}
                id="nav-pad-player-btn"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>{t.padViewBtn || tr(language, 'Einhand-Pad', 'One-Hand Pad', 'Pad Monomanual')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playGlassTouch(1.2);
                  setCurrentView('presets');
                }}
                className={`px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  currentView === 'presets'
                    ? 'bg-brand-cyan text-bg-base shadow-xs'
                    : 'text-text-dim hover:text-text-bright hover:bg-bg-panel'
                }`}
                id="nav-presets-catalog-btn"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t.presetsBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playGlassTouch(1.05);
                  setCurrentView('editor');
                }}
                className={`px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  currentView === 'editor'
                    ? 'bg-brand-cyan text-bg-base shadow-xs'
                    : 'text-text-dim hover:text-text-bright hover:bg-bg-panel'
                }`}
                id="nav-editor-return-btn"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>{t.editorViewBtn || tr(language, 'Session-Editor', 'Studio Editor', 'Editor de Estudio')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sensoryEngine.playGlassTouch(1.25);
                  setShowSettingsModal(true);
                }}
                className={`px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  showSettingsModal
                    ? 'bg-brand-cyan text-bg-base shadow-xs'
                    : 'text-text-dim hover:text-text-bright hover:bg-bg-panel'
                }`}
                id="nav-settings-btn"
                title={tr(language, 'Einstellungen (Design & 10+10 Akzentfarben, Standard-Werte, Bluetooth-Kopplung)', 'Settings (Design & 10+10 accent colors, defaults, Bluetooth pairing)', 'Ajustes (Diseño y 10+10 colores de acento, valores predeterminados, emparejamiento Bluetooth)')}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>{t.settingsBtn || tr(language, 'Einstellungen', 'Settings', 'Ajustes')}</span>
              </button>
            </nav>
          </div>

          {/* Right: 4-Theme Selector, Hardware BLE Connect, Protocol, Layout, Language & Help */}
          <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
            <ThemeSelectorBar
              luminance={themeLuminance}
              temperature={themeTemperature}
              onChangeLuminance={setThemeLuminance}
              onChangeTemperature={setThemeTemperature}
              compact
            />
            {/* 1-Click Interactive BLE Connect / Status Button */}
            <button
              type="button"
              onClick={() => (bleStatus === 'connected' ? disconnectBLE() : connectBLE())}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                bleStatus === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : bleStatus === 'connecting'
                  ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40 animate-pulse'
                  : bleStatus === 'error'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                  : 'bg-bg-panel hover:bg-brand-cyan/15 text-text-bright hover:text-brand-cyan border-border-bright hover:border-brand-cyan/50'
              }`}
              title={
                bleStatus === 'connected'
                  ? tr(language, 'Klicken zum Trennen der Servok BLE-Verbindung', 'Click to disconnect Servok BLE connection', 'Clic para desconectar la conexión BLE de Servok')
                  : tr(language, 'Klicken zum Koppeln mit Hismith Servok (Web Bluetooth)', 'Click to pair with Hismith Servok (Web Bluetooth)', 'Clic para emparejar con Hismith Servok (Web Bluetooth)')
              }
            >
              <span className={`h-2 w-2 rounded-xs ${
                bleStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 
                bleStatus === 'connecting' ? 'bg-brand-cyan animate-ping' :
                bleStatus === 'error' ? 'bg-rose-500' : 'bg-brand-cyan'
              }`} />
              <Bluetooth className="h-3.5 w-3.5" />
              <span>
                {bleStatus === 'connected'
                  ? tr(language, 'Servok Verbunden', 'Servok Connected', 'Servok Conectado')
                  : bleStatus === 'connecting'
                  ? tr(language, 'Verbinde...', 'Connecting...', 'Conectando...')
                  : bleStatus === 'error'
                  ? tr(language, 'BLE Erneut versuchen', 'Retry BLE', 'Reintentar BLE')
                  : tr(language, 'Servok Verbinden', 'Connect Servok', 'Conectar Servok')}
              </span>
            </button>

            {/* Instant Emergency Stop in Header when playing or BLE connected */}
            {(isPlaying || bleStatus === 'connected') && (
              <button
                type="button"
                onClick={handleEmergencyStop}
                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/50 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title={t.emergencyStopTitle || tr(language, 'NOT-STOPP: Motor und Wiedergabe sofort stoppen (0x04: 0)', 'EMERGENCY STOP: Stop motor and playback immediately (0x04: 0)', 'PARADA DE EMERGENCIA: Detener motor y reproducción de inmediato (0x04: 0)')}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">{t.emergencyStopBtn || tr(language, 'STOP', 'STOP', 'PARADA')}</span>
              </button>
            )}

            {/* Dashboard Layout Reorder Button */}
            {currentView === 'editor' && (
              <button
                type="button"
                onClick={() => setIsLayoutModalOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-bg-panel hover:bg-brand-cyan/15 border border-border-dim hover:border-brand-cyan/40 text-text-dim hover:text-brand-cyan transition-all rounded-lg cursor-pointer flex items-center gap-1.5"
                title={t.modulesOrderTitle || tr(language, 'Dashboard-Anordnung anpassen (Felder verschieben oder ausblenden)', 'Customize dashboard layout (reorder or hide modules)', 'Personalizar diseño del panel (reordenar u ocultar módulos)')}
                id="layout-order-btn"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="text-xs font-mono font-semibold hidden xl:inline">{t.modulesOrderBtn || tr(language, 'Module', 'Modules', 'Módulos')}</span>
              </button>
            )}

            {/* Gamepad Controller Mapping Button */}
            <button
              type="button"
              onClick={() => {
                sensoryEngine.playGlassTouch(1.15);
                setShowControllerModal(true);
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 border transition-all rounded-lg cursor-pointer flex items-center gap-1.5 font-mono text-xs ${
                isGamepadConnected
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-bg-panel hover:bg-border-bright border-border-dim text-text-dim hover:text-text-bright'
              }`}
              title={tr(language, 'Xbox Controller & Tastatur-Belegung konfigurieren', 'Configure Xbox Controller & Keyboard bindings', 'Configurar asignación de mando Xbox y teclado')}
              id="header-gamepad-btn"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-bold">
                {isGamepadConnected ? 'Xbox' : tr(language, 'Controller', 'Controller', 'Mando')}
              </span>
              {isGamepadConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Language Selector (DE / EN / ES) */}
            <div className="flex items-center bg-bg-base border border-border-dim rounded-lg p-0.5 text-xs font-mono">
              {(['de', 'en', 'es'] as const).map((langCode) => (
                <button
                  key={langCode}
                  type="button"
                  onClick={() => setLanguage(langCode)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer font-bold text-[10px] uppercase ${
                    language === langCode ? 'bg-brand-cyan text-bg-base shadow-xs' : 'text-text-dim hover:text-text-bright'
                  }`}
                >
                  {langCode}
                </button>
              ))}
            </div>

            {/* Help Toggle Button */}
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 border transition-colors rounded-lg cursor-pointer flex items-center gap-1.5 font-mono text-xs ${
                showHelp
                  ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold'
                  : 'bg-bg-panel hover:bg-border-bright border-border-dim text-text-dim hover:text-text-bright'
              }`}
              title={t.helpButton}
              id="help-btn"
            >
              <HelpCircle className="h-3.5 w-3.5 text-brand-cyan" />
              <span className="hidden sm:inline">{t.helpButton}</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      {currentView === 'start' ? (
        <main className="w-full px-4 sm:px-6 lg:px-8 mx-auto mt-6" id="app-content">
          <AnimatePresence>
            {showHelp && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full bg-bg-surface border border-brand-cyan/40 rounded-sm p-5 shadow-2xl text-text-bright space-y-5 mb-6"
                id="help-panel-start"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-dim pb-3 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-brand-cyan/10 border border-brand-cyan/30 rounded-sm">
                      <HelpCircle className="h-5 w-5 text-brand-cyan" />
                    </div>
                    <div>
                      <h3 className="text-brand-cyan font-display font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        {t.helpHeaderTitle}
                      </h3>
                      <p className="text-[11px] text-text-dim">{t.helpHeaderSubtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setHelpTab('txtfile')}
                      className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/50 rounded-sm font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title={tr(language, 'Anleitung im Code-Ordner im Browser öffnen', 'Open manual in code folder in browser', 'Abrir manual en la carpeta de código en el navegador')}
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-300" />
                      <span>{tr(language, 'Anleitung .txt Lesen', 'Read .txt Manual', 'Leer manual .txt')}</span>
                    </button>

                    <button 
                      onClick={() => setShowHelp(false)}
                      className="text-text-dim hover:text-text-bright text-[10px] uppercase font-mono tracking-wider px-3 py-1.5 bg-border-bright rounded-sm hover:bg-border-bright/80 cursor-pointer transition-colors border border-border-dim flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>{tr(language, 'Schließen', 'Close', 'Cerrar')}</span>
                    </button>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-1.5 border-b border-border-dim pb-2" id="help-tabs-start">
                  <button
                    onClick={() => setHelpTab('basics')}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                      helpTab === 'basics'
                        ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50 shadow-sm'
                        : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright hover:border-border-dim'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{t.helpTabLayers}</span>
                  </button>

                  <button
                    onClick={() => setHelpTab('presets')}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                      helpTab === 'presets'
                        ? 'bg-brand-rose/20 text-brand-rose border-brand-rose/50 shadow-sm'
                        : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright hover:border-border-dim'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{t.helpTabGenerator}</span>
                  </button>

                  <button
                    onClick={() => setHelpTab('limits')}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                      helpTab === 'limits'
                        ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50 shadow-sm'
                        : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright hover:border-border-dim'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t.helpTabLimits}</span>
                  </button>

                  <button
                    onClick={() => setHelpTab('snippets')}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                      helpTab === 'snippets'
                        ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50 shadow-sm'
                        : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright hover:border-border-dim'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" />
                    <span>{t.helpTabSubsections}</span>
                  </button>

                  <button
                    onClick={() => setHelpTab('ble')}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                      helpTab === 'ble'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                        : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright hover:border-border-dim'
                    }`}
                  >
                    <Bluetooth className="h-3.5 w-3.5" />
                    <span>{t.helpTabBle}</span>
                  </button>

                  <button
                    onClick={() => setHelpTab('storage')}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                      helpTab === 'storage'
                        ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50 shadow-sm'
                        : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright hover:border-border-dim'
                    }`}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{t.helpTabStorage}</span>
                  </button>

                  <button
                    onClick={() => setHelpTab('local')}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                      helpTab === 'local'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright hover:border-border-dim'
                    }`}
                  >
                    <HardDrive className="h-3.5 w-3.5" />
                    <span>{t.helpTabLocalUse}</span>
                  </button>

                  <button
                    onClick={() => setHelpTab('txtfile')}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border transition-all cursor-pointer flex items-center gap-1.5 ${
                      helpTab === 'txtfile'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                        : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright hover:border-border-dim'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Code-Ordner .txt</span>
                  </button>
                </div>

                {/* TAB CONTENT 1: EDITOR & 4 EBENEN */}
                {helpTab === 'basics' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-dim animate-fadeIn">
                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-cyan flex items-center gap-2">
                        <Layers className="h-4 w-4" /> Die 4 unabhängigen Steuerungsebenen
                      </h4>
                      <p className="leading-relaxed">
                        Der Editor arbeitet mit 4 frei kombinierbaren Kurvenebenen. Jede Ebene steuert einen spezifischen Parameter der Bewegung:
                      </p>
                      <ul className="space-y-2 font-mono text-[11px]">
                        <li className="p-2 bg-bg-base border border-brand-cyan/30 rounded-sm">
                          <strong className="text-brand-cyan font-bold block mb-0.5">1. Mindesttiefe (%) [Türkis - #00F0FF]:</strong>
                          Legt die untere Startposition / Ausfahrtiefe des Hubs fest.
                        </li>
                        <li className="p-2 bg-bg-base border border-rose-500/30 rounded-sm">
                          <strong className="text-rose-400 font-bold block mb-0.5">2. Maximaltiefe (%) [Rosa - #F43F5E]:</strong>
                          Legt die obere Endposition / Maximaltiefe der Hubbewegung fest.
                        </li>
                        <li className="p-2 bg-bg-base border border-emerald-500/30 rounded-sm">
                          <strong className="text-emerald-400 font-bold block mb-0.5">3. Stöße pro Minute (SPM) [Grün - #10B981]:</strong>
                          Steuert die Frequenz der Bewegung (dynamisch angepasst an die Hubspanne).
                        </li>
                        <li className="p-2 bg-bg-base border border-amber-500/30 rounded-sm">
                          <strong className="text-amber-400 font-bold block mb-0.5">4. Stoß-Härte (%) [Bernstein - #F59E0B]:</strong>
                          Steuert das Stoßprofil und die Beschleunigungssteilheit des Servomotors.
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-cyan flex items-center gap-2">
                        <MousePointer className="h-4 w-4" /> Interaktion im Diagramm
                      </h4>
                      <div className="bg-bg-base p-3 border border-border-bright rounded-sm space-y-2">
                        <ul className="space-y-1.5 leading-relaxed">
                          <li><strong className="text-text-bright font-medium">Punkt hinzufügen:</strong> Klicke einfach an eine leere Stelle im Diagramm.</li>
                          <li><strong className="text-text-bright font-medium">Punkt verschieben:</strong> Ziehe den Wegpunkt per Drag &amp; Drop.</li>
                          <li><strong className="text-text-bright font-medium">Punkt löschen:</strong> Rechter Mausklick auf einen Wegpunkt oder Löschen-Icon.</li>
                          <li><strong className="text-text-bright font-medium">Mehrfachauswahl:</strong> Ziehe bei gedrückter Maustaste ein Auswahlrechteck.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 2: VORLAGEN-KATALOG & DIREKTUPLOAD */}
                {helpTab === 'presets' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-dim animate-fadeIn">
                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-rose flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Vorlagen-Katalog ({totalPresetCount} Profile in 10 Kategorien)
                      </h4>
                      <p className="leading-relaxed">
                        Die Anwendung bietet genau {totalPresetCount} fein abgestimmte Vorlagen in 10 übersichtlichen Hauptkategorien – jeweils von Zart über Dynamisch bis Intensiv:
                      </p>
                      <ul className="space-y-2 font-mono text-[11px]">
                        <li className="p-2 bg-bg-base border border-brand-rose/30 rounded-sm">
                          <strong className="text-brand-rose font-bold block mb-0.5">Volle Erfahrungs-Vielfalt (Zart · Dynamisch · Hart):</strong>
                          Von federleichten Streichel-Wellen über sinnliches Edging und Tiefen-Exploration bis hin zu kraftvollen Ausdauer- und Klimax-Sessions.
                        </li>
                        <li className="p-2 bg-bg-base border border-brand-rose/30 rounded-sm">
                          <strong className="text-brand-rose font-bold block mb-0.5">Interaktive Kurven-Vorschau:</strong>
                          Jedes Preset kann vor dem Laden mit allen 4 Kurven (Min, Max, SPM, Härte) und Lube-Triggern inspiziert werden.
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-emerald-400 flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Direktupload im Startmenü &amp; Editor
                      </h4>
                      <p className="leading-relaxed">
                        Du kannst bestehende Session-Dateien auf drei einfache Arten in die Anwendung laden:
                      </p>
                      <div className="bg-bg-base p-3 border border-border-bright rounded-sm space-y-2">
                        <ul className="space-y-1.5 leading-relaxed">
                          <li><strong className="text-emerald-400 font-medium">1. Startmenü Mode 3:</strong> Wähle "Session Upload" direkt beim Starten der Anwendung.</li>
                          <li><strong className="text-emerald-400 font-medium">2. Drag &amp; Drop:</strong> Ziehe eine .json, .csv, oder .funscript Datei direkt auf das Diagramm.</li>
                          <li><strong className="text-emerald-400 font-medium">3. In-App Speicher:</strong> Greife auf deine im Browser gespeicherten Sessions zurück.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 7: LOKALE VERWENDUNG & API-KEY */}
                {helpTab === 'local' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-dim animate-fadeIn">
                    <div className="space-y-3">
                      <h4 className="font-bold text-amber-300 uppercase tracking-wider text-xs flex items-center gap-2">
                        <HardDrive className="h-4 w-4" /> {t.localSetupHeading}
                      </h4>
                      <p className="leading-relaxed">
                        {t.localSetupDesc}
                      </p>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-sm space-y-1">
                        <strong className="text-emerald-400 font-bold flex items-center gap-1 text-xs">
                          <CheckCircle2 className="h-4 w-4" /> {t.localCostHeading}
                        </strong>
                        <p className="leading-relaxed text-[11px] text-emerald-200/90">
                          {t.localCostDesc}
                        </p>
                      </div>

                      <div className="p-3 bg-brand-cyan/10 border border-brand-cyan/30 rounded-sm space-y-1">
                        <strong className="text-brand-cyan font-bold flex items-center gap-1 text-xs">
                          <ShieldCheck className="h-4 w-4" /> {t.localSecurityHeading}
                        </strong>
                        <p className="leading-relaxed text-[11px] text-cyan-200/90">
                          {t.localSecurityDesc}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-amber-300 flex items-center gap-2">
                        <Cpu className="h-4 w-4" /> {t.localStepsHeading}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                        <div className="p-3 bg-brand-cyan/10 border border-brand-cyan/30 rounded-sm flex flex-col justify-between space-y-2.5">
                          <div>
                            <span className="font-bold text-brand-cyan block">Desktop_Verknuepfung_erstellen.bat</span>
                            <span className="text-text-dim text-[10px] leading-relaxed">
                              Legt die Start-Verknüpfung auf deinem Windows-Desktop an (startet Server &amp; Standard-Browser).
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/create-desktop-shortcut', { method: 'POST' });
                                  const data = await res.json();
                                  if (data.status === 'ok') {
                                    showInAppNotification(data.message, 'success');
                                    sensoryEngine.playSuccessChime();
                                  } else {
                                    showInAppNotification(data.message || data.error || 'Verknüpfung konnte nicht automatisch erstellt werden', 'warning');
                                  }
                                } catch (_) {
                                  showInAppNotification('Server nicht erreichbar. Lade die .bat-Datei herunter und führe sie im Ordner aus.', 'info');
                                }
                              }}
                              className="px-2.5 py-1 bg-brand-cyan text-bg-base font-bold rounded-xs text-[10px] hover:bg-brand-cyan/90 cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Jetzt am PC anlegen</span>
                            </button>
                            <a
                              href="/api/download/Desktop_Verknuepfung_erstellen.bat"
                              download="Desktop_Verknuepfung_erstellen.bat"
                              className="px-2 py-1 bg-bg-panel hover:bg-white/10 text-brand-cyan border border-brand-cyan/40 font-bold rounded-xs text-[10px] cursor-pointer flex items-center gap-1 transition-all"
                              title="Desktop_Verknuepfung_erstellen.bat herunterladen"
                            >
                              <Download className="w-3 h-3" />
                              <span>.bat Download</span>
                            </a>
                          </div>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm flex flex-col justify-between space-y-2.5">
                          <div>
                            <span className="font-bold text-amber-300 block">start_windows.bat</span>
                            <span className="text-text-dim text-[10px] leading-relaxed">
                              1-Klick Starter für Windows. Startet Node.js im Hintergrund &amp; öffnet direkt deinen Standard-Browser.
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <a
                              href="/api/download/start_windows.bat"
                              download="start_windows.bat"
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold rounded-xs text-[10px] cursor-pointer flex items-center gap-1 transition-all"
                              title="start_windows.bat herunterladen"
                            >
                              <Download className="w-3 h-3" />
                              <span>start_windows.bat Herunterladen</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="bg-bg-base p-3.5 border border-border-bright rounded-sm space-y-2 font-mono text-[11px] leading-relaxed">
                        <p className="text-text-bright">{t.localStep1}</p>
                        <p className="text-amber-300 font-semibold">{t.localStep2}</p>
                        <p className="text-brand-cyan font-semibold">{t.localStep3}</p>
                        <p className="text-emerald-400">{t.localStep4}</p>
                        <p className="text-purple-300">{t.localStep5}</p>
                      </div>

                      <button
                        onClick={() => setHelpTab('txtfile')}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-purple-100 font-mono font-bold text-xs uppercase tracking-wider rounded-sm border border-purple-500/50 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Code-Ordner .txt Datei Öffnen</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 8: VOLLSTÄNDIGE LOKALE ANLEITUNG (CODE-ORDNER .TXT) */}
                {helpTab === 'txtfile' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-purple-950/40 p-3 rounded-sm border border-purple-500/30">
                      <div className="flex items-center gap-2 text-purple-300 font-mono text-xs font-bold">
                        <FileText className="h-4 w-4 text-purple-400 shrink-0" />
                        <span>Datei aus dem Code-Ordner (/LOKALE_ANLEITUNG_LOCAL_GUIDE.txt)</span>
                      </div>
                      <a
                        href="/LOKALE_ANLEITUNG_LOCAL_GUIDE.txt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-purple-800/60 hover:bg-purple-700 text-purple-100 border border-purple-400/50 rounded-sm font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>In neuem Tab öffnen</span>
                      </a>
                    </div>
                    <div className="p-4 bg-bg-base border border-purple-500/30 rounded-sm text-[11px] font-mono text-text-bright leading-relaxed overflow-x-auto max-h-[480px] overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                      {LOCAL_GUIDE_TEXT}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 2: HUB-GRENZEN (MIN/MAX) */}
                {helpTab === 'limits' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-dim animate-fadeIn">
                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-cyan flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-brand-cyan" /> Eingabe &amp; Bestätigung der Hub-Grenzen
                      </h4>
                      <p className="leading-relaxed">
                        Um eine versehentliche Änderung der mechanischen Begrenzung beim Tippen zu verhindern, verwendet das System eine Bestätigungs-Logik:
                      </p>
                      <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                        <li>
                          Trage deine gewünschten Werte für die <strong className="text-text-bright font-semibold">Min %</strong> (z.&nbsp;B. 10%) und <strong className="text-text-bright font-semibold">Max %</strong> (z.&nbsp;B. 80%) in die Textfelder ein.
                        </li>
                        <li>
                          Klicke anschließend auf den Button <strong className="text-brand-cyan font-bold font-mono bg-bg-base px-1.5 py-0.5 rounded border border-brand-cyan/40">Übernehmen</strong> (oder drücke die <kbd className="text-text-bright font-mono bg-bg-base px-1 rounded border border-border-dim">Enter</kbd>-Taste).
                        </li>
                        <li>
                          Das System prüft sofort die Gültigkeit beider Zahlen und aktualisiert alle Parameter, Diagramme und die Begrenzungslinien in der Visualisierung.
                        </li>
                      </ol>

                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm text-amber-200 space-y-1">
                        <strong className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertCircle className="h-4 w-4 shrink-0" /> Automatische Sicherheitskorrektur
                        </strong>
                        <p className="leading-relaxed text-[11px]">
                          Wird eine unvollständige, ungültige oder vertauschte Eingabe gemacht (z.&nbsp;B. Min ≥ Max), setzt das System für die Sicherheit deiner Hardware automatisch das <strong className="font-mono">Min auf 0%</strong> bzw. das <strong className="font-mono">Max auf 100%</strong> zurück.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-cyan flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-brand-cyan" /> Mechanischer Schutz &amp; Dynamik
                      </h4>
                      <p className="leading-relaxed">
                        Die eingestellten Hub-Grenzen definieren den erlaubten Arbeitsbereich des Motors:
                      </p>
                      <ul className="space-y-2 font-mono text-[11px]">
                        <li className="p-2 bg-bg-base border border-brand-cyan/30 rounded-sm">
                          <strong className="text-brand-cyan font-bold block mb-0.5">Absolute Hub-Skalierung:</strong>
                          Alle Kurvenpunkte und KI-generierten Abschnitte bewegen sich ausschließlich innerhalb des aktivierten Min-Max-Korridors.
                        </li>
                        <li className="p-2 bg-bg-base border border-amber-500/30 rounded-sm">
                          <strong className="text-amber-400 font-bold block mb-0.5">Überlastschutz:</strong>
                          Verhindert das Anfahren mechanischer Anschläge und schützt den Servomotor vor thermischer Belastung.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 4: TEILABSCHNITTE (SUBSECTIONS) */}
                {helpTab === 'snippets' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-dim animate-fadeIn">
                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-cyan flex items-center gap-2">
                        <Grid className="h-4 w-4 text-brand-cyan" /> Teilabschnitts-Verwaltung (Subsections)
                      </h4>
                      <p className="leading-relaxed">
                        Teilabschnitte ermöglichen es dir, lange Sessions in übersichtliche Phasen (z.&nbsp;B. Aufwärmen, Plateau, Orgasmus, Cooldown) zu unterteilen:
                      </p>
                      <ul className="space-y-1.5 leading-relaxed">
                        <li><strong className="text-text-bright font-medium">Neuen Abschnitt erstellen:</strong> Klicke auf "+ Teilabschnitt hinzufügen" und lege Name sowie Zeitgrenzen fest.</li>
                        <li><strong className="text-text-bright font-medium">Abschnitt fokussieren / zoomen:</strong> Klicke auf einen Abschnitt, um die Zeitachse genau auf diese Phase zu fokussieren.</li>
                        <li><strong className="text-text-bright font-medium">Farben &amp; Benennung:</strong> Ordne Abschnitten individuelle Farben und Beschreibungen zu.</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-cyan flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-brand-cyan" /> Schnelle Bearbeitung im Diagramm
                      </h4>
                      <p className="leading-relaxed">
                        Du kannst Teilabschnitte auch direkt in der Zeitleiste verschieben oder anpassen:
                      </p>
                      <div className="bg-bg-base p-3 border border-border-bright rounded-sm space-y-2">
                        <p className="text-[11px] leading-relaxed">
                          Verwende das Scheren-Werkzeug oder wähle Wegpunkte innerhalb eines Teilabschnitts aus, um sie gemeinsam zu skalieren oder zu verschieben.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 5: BLE BLUETOOTH & STEUERUNG */}
                {helpTab === 'ble' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-dim animate-fadeIn">
                    <div className="space-y-3">
                      <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-xs flex items-center gap-2">
                        <Bluetooth className="h-4 w-4" /> Bluetooth LE Kopplung (Servok Hardware)
                      </h4>
                      <p className="leading-relaxed">
                        Der Editor kommuniziert direkt über Web Bluetooth mit deinem Servok Premium oder kompatiblen Aktor-Controller:
                      </p>
                      <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                        <li>Klicke in der Kopfzeile auf den <strong className="text-emerald-400 font-bold">Bluetooth Verbinden</strong> Button.</li>
                        <li>Wähle dein Servok Gerät aus der Browser-Auswahlliste.</li>
                        <li>Nach erfolgreicher Kopplung wird der Live-Status in der Telemetrie-Anzeige grün signalisiert.</li>
                      </ol>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-emerald-400 flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Gleitmittel-Pumpe (Lube Pump Control)
                      </h4>
                      <p className="leading-relaxed">
                        Integrierte automatische oder manuelle Gleitmittel-Dosierung:
                      </p>
                      <ul className="space-y-2 font-mono text-[11px]">
                        <li className="p-2 bg-bg-base border border-emerald-500/30 rounded-sm">
                          <strong className="text-emerald-400 font-bold block mb-0.5">Manuelle Stoß-Taste:</strong>
                          Drücke die Lube-Taste für sofortige Dosierung in 0,5ml - 2,0ml Schritten.
                        </li>
                        <li className="p-2 bg-bg-base border border-emerald-500/30 rounded-sm">
                          <strong className="text-emerald-400 font-bold block mb-0.5">Automatischer Intervall:</strong>
                          Stelle automatische Impulsintervalle basierend auf verstrichener Zeit oder Hubanzahl ein.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 6: SPEICHERN & EXPORT */}
                {helpTab === 'storage' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-dim animate-fadeIn">
                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-cyan flex items-center gap-2">
                        <Save className="h-4 w-4" /> Speichern &amp; Browser-Lokaler Speicher
                      </h4>
                      <p className="leading-relaxed">
                        Deine Erstellungen sind absolut privat und verbleiben ausschließlich auf deinem Gerät:
                      </p>
                      <ul className="space-y-2 font-mono text-[11px]">
                        <li className="p-2 bg-bg-base border border-brand-cyan/30 rounded-sm">
                          <strong className="text-brand-cyan font-bold block mb-0.5">In-App Projekt-Speicher:</strong>
                          Speichere beliebig viele Sessions im lokalen Browserspeicher (LocalStorage).
                        </li>
                        <li className="p-2 bg-bg-base border border-brand-cyan/30 rounded-sm">
                          <strong className="text-brand-cyan font-bold block mb-0.5">Auto-Save Protection:</strong>
                          Änderungen an der aktiven Session werden automatisch im Hintergrund gesichert.
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-text-bright uppercase tracking-wider text-xs text-brand-cyan flex items-center gap-2">
                        <Download className="h-4 w-4" /> Datei-Export &amp; Import Formate
                      </h4>
                      <div className="bg-bg-base p-3 border border-border-bright rounded-sm space-y-2 leading-relaxed">
                        <p>
                          <strong className="text-brand-cyan font-bold block mb-0.5">JSON-Dateien (.json):</strong>
                          Speichert das komplette Projekt inklusive aller 4 Kurvenebenen, Teilabschnitte und Notizen.
                        </p>
                        <p>
                          <strong className="text-emerald-400 font-bold block mb-0.5">Skript-Formate (.fun / .csv):</strong>
                          Exportiert zeitcodierte Positionsdaten für die Verwendung mit externen Steuerungs-Softwarelösungen.
                        </p>
                        <p>
                          <strong className="text-amber-400 font-bold block mb-0.5">Code / Zwischenablage:</strong>
                          Sessions können auch als JSON-Text kopiert und über das Import-Fenster direkt eingefügt werden.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <StartScreenView
            onSelectManual={handleOpenManualProjectPrompt}
            onOpenPresets={() => setCurrentView('presets')}
            onOpenPadPlayer={() => {
              setIsPlaying(false);
              setCurrentView('padPlayer');
            }}
            onLoadPreset={(presetId) => {
              handleLoadPreset(presetId, false);
              setCurrentView('editor');
            }}
            onSessionFileUpload={(e) => {
              handleSessionFileUpload(e);
              setCurrentView('editor');
            }}
            onSelectLoadModal={() => {
              setShowLoadModal(true);
            }}
            onOpenHelp={() => setShowHelp(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            language={language}
            luminance={themeLuminance}
            temperature={themeTemperature}
            onChangeLuminance={setThemeLuminance}
            onChangeTemperature={setThemeTemperature}
            isConnected={bleStatus === 'connected' || servokBle.connected}
            onConnectBle={() => (bleStatus === 'connected' ? disconnectBLE() : connectBLE())}
            bleStatus={bleStatus}
          />
        </main>
      ) : currentView === 'padPlayer' ? (
        <main className="w-full mx-auto mt-2 relative z-10" id="pad-player-main">
          <OneHandedPadPlayerView
            language={language}
            isConnected={bleStatus === 'connected' || servokBle.connected}
            onConnectBle={() => (bleStatus === 'connected' ? disconnectBLE() : connectBLE())}
            onTriggerLube={(bursts) => sendLubeCommandToBLE(bursts)}
            lubeConnected={lubeBleStatus === 'connected'}
            onBackToStart={() => setCurrentView('start')}
            onOpenPresets={() => setCurrentView('presets')}
            onOpenEditor={() => setCurrentView('editor')}
            onEmergencyStop={handleEmergencyStop}
            onOpenControllerMapping={() => setShowControllerModal(true)}
            onPresetSaved={(saved) => {
              showInAppNotification(
                `✨ Vorlage "${saved.title}" (${saved.category}) im Katalog gespeichert`,
                'success'
              );
            }}
            onOpenEditorWithCurve={(generated) => {
              pushHistory();
              if (generated.durationMs && generated.durationMs >= 5000) {
                setDurationMs(generated.durationMs);
                if (generated.subsections && generated.subsections.length > 0) {
                  setSubsections(generated.subsections);
                } else {
                  setSubsections([
                    {
                      id: 'sub-flow-' + Date.now(),
                      name: generated.title || 'Sensual Flow',
                      startTime: 0,
                      endTime: generated.durationMs,
                    },
                  ]);
                }
              }
              setWaypointsMinDepth(ensureWaypointIds(generated.minDepth, 'min'));
              setWaypointsMaxDepth(ensureWaypointIds(generated.maxDepth, 'max'));
              setWaypointsSpm(ensureWaypointIds(generated.spm, 'spm'));
              setWaypointsHardness(ensureWaypointIds(generated.hardness, 'hrd'));
              if (generated.lubeTriggers) {
                setLubeTriggers(ensureLubeIds(generated.lubeTriggers));
              }
              setZoomRange(null);
              setCurrentView('editor');
              showInAppNotification(
                `✨ ${generated.title || 'Aufgezeichnete Session'} in den 4-Spur-Editor übertragen`,
                'success'
              );
            }}
          />
        </main>
      ) : currentView === 'presets' ? (
        <main className="w-full px-3 sm:px-6 lg:px-8 mx-auto mt-4 max-w-[1850px] relative z-10" id="presets-catalog-main">
          <PresetCatalogView
            onLoadPreset={(presetId, autoPlay) => {
              handleLoadPreset(presetId, autoPlay);
              setCurrentView('editor');
            }}
            onBackToStart={() => setCurrentView('start')}
            onBackToEditor={() => setCurrentView('editor')}
            formatHHMMSS={formatHHMMSS}
            formatCm={formatCm}
            language={language}
          />
        </main>
      ) : (
        <main className="w-full px-3 sm:px-6 lg:px-8 mx-auto mt-4 max-w-[1850px] flex flex-col gap-5 relative z-10" id="app-content">

        {/* PROMINENTER HAUPT-BEREICH: INTERAKTIVER SESSION-EDITOR */}
        <div 
          className="w-full sensual-glass glass-optics-edge rounded-3xl p-4 sm:p-6 flex flex-col justify-between overflow-hidden transition-all duration-300 relative" 
          id="diagram-card"
        >
            {/* Kill-Switch Maschinenschutz Warn-Banner bei Spurbearbeitung während laufendem Betrieb */}
            {editorEmergencyAlert && (
              <div className="mb-4 p-4 rounded-2xl bg-rose-500/20 border-2 border-rose-500/80 shadow-[0_0_28px_rgba(244,63,94,0.35)] flex items-start justify-between gap-3 text-rose-200 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-600 rounded-xl text-white font-black text-xs shrink-0 flex items-center gap-1.5 shadow-md">
                    <AlertTriangle className="w-4 h-4" />
                    <span>KILLSWITCH</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <span>🛑 Not-Aus automatisch ausgelöst: Maschine im Stillstand geschützt!</span>
                    </div>
                    <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                      {editorEmergencyAlert}. Um zu verhindern, dass geänderte Kurvenpunkte direkt während der Bewegung an den Servok-Aktor übertragen werden, wurde der Hardware-Not-Aus ausgelöst. Die Maschine steht jetzt sicher still – du kannst die Spuren nun gefahrlos im Editor anpassen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditorEmergencyAlert(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold cursor-pointer shrink-0 transition-colors shadow-sm"
                >
                  Bestätigen
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2.5 border-b border-border-dim/60 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity select-none pr-1"
                  onClick={() => toggleSection('graph')}
                  title={collapsedSections.graph ? "Graph & Editor ausklappen" : "Graph & Editor einklappen"}
                >
                  <div className="w-7 h-7 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center">
                    <Grid className="h-3.5 w-3.5 text-brand-cyan" />
                  </div>
                  <h2 className="font-display font-bold text-sm text-text-bright uppercase tracking-wider">
                    Studio Kurven-Editor
                  </h2>
                  <div className="flex items-center text-brand-cyan">
                    {collapsedSections.graph ? (
                      <ChevronDown className="h-4 w-4 text-brand-cyan" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-text-dim hover:text-brand-cyan" />
                    )}
                  </div>
                </div>

                {/* Live Maschinenschutz Status */}
                {isPlaying && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/70 text-amber-300 font-mono text-[11px] font-bold animate-pulse shadow-xs" title="Maschinenschutz aktiv: Jede Bearbeitung oder Spuränderung im Editor stoppt die Maschine sofort per Killswitch">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden md:inline">Maschinenschutz: Bearbeitung löst Not-Aus aus</span>
                    <span className="md:hidden">Not-Aus Schutz aktiv</span>
                  </div>
                )}

                {/* Fokussier-Schalter: Nur Graph vs. Alle Module */}
                <div className="flex items-center gap-0.5 text-[10px] font-mono border border-border-dim rounded-md p-0.5 bg-bg-base">
                  <button
                    type="button"
                    onClick={collapseAllExceptGraph}
                    className="px-2 py-0.5 hover:bg-bg-panel text-text-dim hover:text-brand-cyan rounded-xs transition-colors cursor-pointer"
                    title="Klappt alle Instrumente unter dem Editor ein"
                  >
                    Fokus Graph
                  </button>
                  <span className="text-border-dim">|</span>
                  <button
                    type="button"
                    onClick={expandAllSections}
                    className="px-2 py-0.5 hover:bg-bg-panel text-text-dim hover:text-brand-cyan rounded-xs transition-colors cursor-pointer"
                    title="Klappt alle Instrumente aus"
                  >
                    Alle Module
                  </button>
                </div>

                <div className="w-px h-5 bg-border-dim mx-0.5" />

                {/* Projekt-Aktionen: Neu, Speichern, Laden */}
                <button
                  onClick={handleOpenManualProjectPrompt}
                  className="px-2.5 py-1 bg-bg-base hover:bg-brand-cyan/15 border border-border-dim hover:border-brand-cyan/50 text-text-bright hover:text-brand-cyan text-[11px] font-mono font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Neues leeres Projekt anlegen"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-brand-cyan" />
                  <span>{t.newBtn}</span>
                </button>

                <button
                  onClick={() => {
                    sensoryEngine.playClick(1.05);
                    setShowSavePresetModal(true);
                  }}
                  className="px-2.5 py-1 bg-brand-orchid/15 hover:bg-brand-orchid/25 border border-brand-orchid/50 text-brand-orchid text-[11px] font-mono font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Manuell erstellte Session mit Name, Beschreibung & Kategorie als Vorlage speichern"
                  id="save-as-preset-toolbar-btn"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Als Vorlage speichern</span>
                </button>

                <button
                  onClick={openSaveModal}
                  className="px-2.5 py-1 bg-bg-base hover:bg-emerald-500/15 border border-border-dim hover:border-emerald-400/50 text-emerald-400 text-[11px] font-mono font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Session speichern oder als Datei exportieren"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{t.saveExportBtn}</span>
                </button>

                <button
                  onClick={() => setShowLoadModal(true)}
                  className="px-2.5 py-1 bg-bg-base hover:bg-brand-cyan/15 border border-border-dim hover:border-brand-cyan/50 text-brand-cyan text-[11px] font-mono font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Session aus Speicher laden oder Datei importieren"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{t.loadImportBtn}</span>
                </button>

                <input
                  type="file"
                  ref={sessionFileInputRef}
                  onChange={handleSessionFileUpload}
                  accept=".json,.csv,.fun"
                  className="hidden"
                />

                {/* DROSSELUNG SCHALTER-MENÜ & STATUS-ANZEIGE (STANDARD: 100% MIN-MAX SPM UNGEDROSSELT) */}
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setShowThrottlePopover(!showThrottlePopover)}
                    className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-sm flex items-center gap-1.5 cursor-pointer transition-all border shadow-sm ${
                      throttleLevel === 'none'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                        : 'bg-amber-500/25 text-amber-300 border-amber-400 shadow-amber-500/20 animate-pulse'
                    }`}
                    title="Drosselung & SPM-Schalter: Standard läuft Min-Max SPM ohne Drosselung"
                  >
                    <Zap className={`h-3.5 w-3.5 ${throttleLevel === 'none' ? 'text-emerald-400 fill-emerald-400/30' : 'text-amber-300 fill-amber-300'}`} />
                    <span>
                      {throttleLevel === 'none'
                        ? '⚡ Min-Max SPM (100% Voll)'
                        : throttleLevel === 'eco_75'
                        ? '⚡ Drosselung: 75% Eco'
                        : throttleLevel === 'half_50'
                        ? '⚡ Drosselung: 50% Halblast'
                        : throttleLevel === 'quiet_30'
                        ? '⚡ Drosselung: 30% Flüster'
                        : `⚡ Drosselung: Max ${throttleCapMax} SPM`}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  {/* Popover Einstellungs-Menü für Drosselung */}
                  {showThrottlePopover && (
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 bg-bg-panel border border-border-bright rounded-sm shadow-2xl p-3.5 z-50 font-mono space-y-3 animate-fadeIn backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-border-dim pb-2">
                        <div className="flex items-center gap-1.5 text-text-bright font-bold text-xs">
                          <Zap className="h-4 w-4 text-brand-cyan fill-brand-cyan/20" />
                          <span>DROSSELUNG & SPM-SCHALTER</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowThrottlePopover(false)}
                          className="text-text-dim hover:text-text-bright p-0.5 rounded cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Info-Header: Standard ungedrosselt */}
                      <div className="text-[10px] bg-bg-base p-2 rounded border border-border-bright space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-text-dim">Standard-Modus:</span>
                          <span className="text-emerald-400 font-bold">100% Min-Max SPM</span>
                        </div>
                        <div className="text-[9px] text-text-dim leading-snug">
                          Ohne Drosselung schöpft die Maschine die volle physikalische Kadenz für die Hubspanne aus.
                        </div>
                      </div>

                      {/* 1-Klick Drosselungsschalter */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase text-text-dim font-bold block">
                          Drosselung wählen (Sofort-Umschaltung):
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectThrottle('none')}
                            className={`p-2 rounded border text-left font-mono transition-all cursor-pointer ${
                              throttleLevel === 'none'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 font-extrabold shadow-sm'
                                : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10.5px]">🚀 100% Voll</span>
                              {throttleLevel === 'none' && <span className="text-[9px] text-emerald-400 font-bold">AKTIV</span>}
                            </div>
                            <div className="text-[8px] opacity-75 mt-0.5">Ohne Drosselung (Standard)</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectThrottle('eco_75')}
                            className={`p-2 rounded border text-left font-mono transition-all cursor-pointer ${
                              throttleLevel === 'eco_75'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-extrabold shadow-sm'
                                : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10.5px]">🍃 75% Eco</span>
                              {throttleLevel === 'eco_75' && <span className="text-[9px] text-amber-400 font-bold">AKTIV</span>}
                            </div>
                            <div className="text-[8px] opacity-75 mt-0.5">Sanfte Drosselung</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectThrottle('half_50')}
                            className={`p-2 rounded border text-left font-mono transition-all cursor-pointer ${
                              throttleLevel === 'half_50'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-extrabold shadow-sm'
                                : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10.5px]">⚖️ 50% Halblast</span>
                              {throttleLevel === 'half_50' && <span className="text-[9px] text-amber-400 font-bold">AKTIV</span>}
                            </div>
                            <div className="text-[8px] opacity-75 mt-0.5">Halbe Frequenz</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectThrottle('quiet_30')}
                            className={`p-2 rounded border text-left font-mono transition-all cursor-pointer ${
                              throttleLevel === 'quiet_30'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-extrabold shadow-sm'
                                : 'bg-bg-base text-text-dim border-border-bright hover:text-text-bright'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10.5px]">🌙 30% Flüster</span>
                              {throttleLevel === 'quiet_30' && <span className="text-[9px] text-amber-400 font-bold">AKTIV</span>}
                            </div>
                            <div className="text-[8px] opacity-75 mt-0.5">Extrem leise &amp; sanft</div>
                          </button>
                        </div>
                      </div>

                      {/* Fester SPM-Deckel (Cap) */}
                      <div className="space-y-1.5 bg-bg-base p-2 rounded border border-border-bright">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-text-dim uppercase font-bold">Fester SPM-Deckel (Cap):</span>
                          <span className="text-amber-300 font-bold">{throttleCapMax} SPM</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {[30, 45, 60, 80, 100].map((presetVal) => (
                            <button
                              key={`spm-cap-${presetVal}`}
                              type="button"
                              onClick={() => handleSelectThrottle('custom_cap', presetVal)}
                              className={`py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                throttleLevel === 'custom_cap' && throttleCapMax === presetVal
                                  ? 'bg-amber-500/30 text-amber-300 border-amber-400 font-extrabold'
                                  : 'bg-bg-surface text-text-dim border-border-bright hover:border-amber-500/50 hover:text-amber-200'
                              }`}
                            >
                              {presetVal}
                            </button>
                          ))}
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={150}
                          step={5}
                          value={throttleCapMax}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setThrottleCapMax(val);
                            handleSelectThrottle('custom_cap', val);
                          }}
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-border-bright rounded mt-1"
                        />
                      </div>

                      {/* Motor Tuning Optionen */}
                      <div className="pt-2 border-t border-border-dim space-y-2">
                        {/* Drehmoment-Kompensation */}
                        <div className="flex items-center justify-between bg-bg-base p-1.5 rounded border border-border-bright text-[9.5px]">
                          <div>
                            <span className="text-text-bright font-bold block">Drehmoment-Kompensation:</span>
                            <span className="text-[8px] text-text-dim">Sockel bei 18% PWM verhindert Totband</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextMode = speedCurveMode === 'torque_boost' ? 'linear' : 'torque_boost';
                              setSpeedCurveMode(nextMode);
                              showInAppNotification(
                                nextMode === 'torque_boost'
                                  ? '⚡ Drehmoment-Kompensation (18-100% PWM) aktiviert'
                                  : '⚡ Lineare Geschwindigkeitskurve aktiviert',
                                'info'
                              );
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                              speedCurveMode === 'torque_boost'
                                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                                : 'bg-border-bright text-text-dim hover:text-text-bright'
                            }`}
                          >
                            {speedCurveMode === 'torque_boost' ? 'AKTIV' : 'LINEAR'}
                          </button>
                        </div>

                        {/* Umkehr-Rampe / Smoothness (0x09) */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-text-dim uppercase font-bold">Umkehr-Rampe (0x09):</span>
                            <span className="text-amber-300 font-bold">{hardwareSmoothness} ({hardwareSmoothness === 0 ? 'Sport/Instant' : hardwareSmoothness <= 2 ? 'Dynamisch' : 'Sanft'})</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { val: 0, label: '⚡ Sport (0)', desc: 'Sofortige Umkehr' },
                              { val: 2, label: 'Dynamisch (2)', desc: 'Ausgewogen' },
                              { val: 5, label: 'Sanft (5)', desc: 'Weiche Wende' },
                            ].map((s) => (
                              <button
                                key={`smooth-${s.val}`}
                                type="button"
                                onClick={() => {
                                  setHardwareSmoothness(s.val);
                                  if (servokBle.connected) {
                                    servokBle.setSmoothness(s.val);
                                  }
                                  showInAppNotification(`⚡ Motor-Rampe auf ${s.label} gesetzt`, 'info');
                                }}
                                className={`py-1 px-1 rounded text-[9px] font-bold border transition-colors cursor-pointer text-center ${
                                  hardwareSmoothness === s.val
                                    ? 'bg-amber-500/30 text-amber-300 border-amber-400 font-extrabold'
                                    : 'bg-bg-base text-text-dim border-border-bright hover:border-amber-500/50 hover:text-amber-200'
                                }`}
                              >
                                <div>{s.label}</div>
                                <div className="text-[7.5px] opacity-75 font-normal">{s.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Playback & Chapter Navigation Controls */}
                <div className="flex items-center gap-1 bg-bg-base px-2 py-1 rounded-sm border border-border-bright">
                  {/* Zurück zum Start (00:00:00) */}
                  <button
                    type="button"
                    onClick={handleResetToStart}
                    className="p-1.5 rounded-sm text-xs cursor-pointer bg-bg-panel hover:bg-brand-cyan/20 text-text-dim hover:text-brand-cyan border border-border-dim hover:border-brand-cyan transition-colors"
                    title="Zurück zum Start (00:00:00) [Tastatur: Pos 1 / Xbox: View]"
                    id="rewind-start-btn"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  {/* Vorheriges Kapitel */}
                  <button
                    type="button"
                    onClick={handlePrevChapter}
                    className="p-1.5 rounded-sm text-xs cursor-pointer bg-bg-panel hover:bg-brand-cyan/20 text-text-dim hover:text-brand-cyan border border-border-dim hover:border-brand-cyan transition-colors"
                    title="Vorheriges Kapitel / Marker [Tastatur: Bild Auf / Xbox: LB]"
                    id="prev-chapter-btn"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Play / Stop Simulation */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isPlaying) {
                        sensoryEngine.playTactileClick('secondary');
                        setIsPlaying(false);
                      } else {
                        sensoryEngine.playTactileClick('primary');
                        if (playbackTime >= durationMs) setPlaybackTime(0);
                        setIsPlaying(true);
                      }
                    }}
                    className={`p-1.5 rounded-sm text-xs cursor-pointer transition-all ${
                      isPlaying 
                        ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-rose-500/40' 
                        : 'bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30'
                    }`}
                    title={isPlaying ? 'Wiedergabe stoppen [Tastatur: Leertaste / Xbox: A]' : 'Wiedergabe starten [Tastatur: Leertaste / Xbox: A]'}
                    id="play-simulation-btn"
                  >
                    {isPlaying ? <Square className="h-4 w-4 fill-rose-400" /> : <Play className="h-4 w-4 fill-brand-cyan" />}
                  </button>

                  {/* Nächstes Kapitel */}
                  <button
                    type="button"
                    onClick={handleNextChapter}
                    className="p-1.5 rounded-sm text-xs cursor-pointer bg-bg-panel hover:bg-brand-cyan/20 text-text-dim hover:text-brand-cyan border border-border-dim hover:border-brand-cyan transition-colors"
                    title="Nächstes Kapitel / Marker [Tastatur: Bild Ab / Xbox: RB]"
                    id="next-chapter-btn"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  
                  <div className="w-px h-5 bg-border-bright mx-0.5" />

                  {/* Playback Loop Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      sensoryEngine.playToggle(!loopEnabled);
                      setLoopEnabled(!loopEnabled);
                    }}
                    className={`px-2 py-1 rounded-sm text-[10px] uppercase font-mono font-bold tracking-wider cursor-pointer transition-colors ${
                      loopEnabled 
                        ? 'bg-border-bright text-brand-cyan' 
                        : 'bg-transparent text-text-dim hover:text-text-bright'
                    }`}
                    title="Loop-Playback aktivieren/deaktivieren [Tastatur: L / Xbox: X]"
                    id="loop-toggle-btn"
                  >
                    Loop
                  </button>
 
                  <div className="w-px h-5 bg-border-bright" />
 
                  {/* Playback Speed dropdown */}
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-transparent text-text-bright text-[10px] font-mono font-bold focus:outline-none cursor-pointer"
                    title="Simulations-Geschwindigkeit"
                  >
                    <option value="0.25" className="bg-bg-surface">0.25x</option>
                    <option value="0.5" className="bg-bg-surface">0.5x</option>
                    <option value="1" className="bg-bg-surface">1.0x</option>
                    <option value="1.5" className="bg-bg-surface">1.5x</option>
                    <option value="2" className="bg-bg-surface">2.0x</option>
                  </select>
                </div>

                {/* XBOX CONTROLLER & KEYBOARD SCHNITTSTELLE BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    sensoryEngine.playTactileClick('secondary');
                    setShowControllerModal(true);
                  }}
                  className={`px-2.5 py-1.5 rounded-sm border text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                    isGamepadConnected
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 shadow-sm shadow-emerald-950/20'
                      : 'bg-bg-base border-border-bright text-text-dim hover:text-white hover:border-brand-cyan/50'
                  }`}
                  title="Xbox Controller & Tastatur-Belegung konfigurieren"
                  id="editor-gamepad-shortcut-btn"
                >
                  <Gamepad2 className="h-3.5 w-3.5 text-brand-cyan" />
                  <span className="font-bold hidden md:inline">
                    {isGamepadConnected ? 'Xbox' : 'Controller'}
                  </span>
                  {isGamepadConnected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* PROMINENTER TURBO-BUTTON (VERZÖGERUNGSFREIER SPM-MULTIPLIKATOR) */}
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => handleToggleTurbo()}
                    className={`px-3 py-1.5 rounded-l-sm text-[11px] font-mono font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                      turboActive
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-black font-black border border-amber-300 shadow-lg shadow-orange-500/40 ring-1 ring-amber-300 animate-pulse'
                        : 'bg-bg-base text-amber-300/90 border border-amber-500/50 hover:border-amber-400 hover:text-amber-200 hover:bg-amber-500/10'
                    }`}
                    title="⚡ TURBO-BUTTON: Sofortige Erhöhung der echten SPM ohne Verzögerung!"
                    id="turbo-multiplier-btn"
                  >
                    <Zap className={`h-4 w-4 ${turboActive ? 'fill-black text-black' : 'text-amber-400 fill-amber-400/40'}`} />
                    <span>{turboActive ? `🔥 TURBO ${turboMultiplier}x` : `⚡ TURBO (${turboMultiplier}x)`}</span>
                    {turboActive && (
                      <span className="text-[8.5px] bg-black/40 text-amber-200 px-1 py-0.2 rounded font-sans font-bold">
                        AKTIV
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTurboMenu(!showTurboMenu)}
                    className={`px-1.5 py-1.5 rounded-r-sm border-y border-r text-xs transition-colors cursor-pointer ${
                      turboActive
                        ? 'bg-orange-600 text-black border-amber-300 font-bold hover:bg-orange-500'
                        : 'bg-bg-base text-amber-300/80 border-amber-500/50 hover:border-amber-400 hover:text-amber-200'
                    }`}
                    title="Turbo-Multiplikator auswählen"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {/* Turbo Factor Popover */}
                  {showTurboMenu && (
                    <div className="absolute left-0 top-full mt-1.5 w-52 bg-bg-panel border border-amber-500/70 rounded-sm shadow-2xl p-2 z-50 font-mono space-y-1 backdrop-blur-md">
                      <div className="text-[9.5px] uppercase font-bold text-amber-300 px-1 pb-1 border-b border-border-dim">
                        Turbo-Multiplikator:
                      </div>
                      {[
                        { factor: 1.25, label: '1.25x (+25%)', desc: 'Leichter Boost' },
                        { factor: 1.5, label: '1.5x (+50%)', desc: 'Kraftvoller Turbo' },
                        { factor: 1.8, label: '1.8x (+80%)', desc: 'Extremer Schub' },
                        { factor: 2.0, label: '2.0x (+100%)', desc: 'Doppelte SPM (Maschinen-Max)' },
                      ].map((item) => (
                        <button
                          key={`turbo-mult-${item.factor}`}
                          type="button"
                          onClick={() => {
                            handleToggleTurbo(item.factor);
                            setShowTurboMenu(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                            turboActive && turboMultiplier === item.factor
                              ? 'bg-amber-500 text-black font-extrabold'
                              : 'text-text-bright hover:bg-amber-500/20 hover:text-amber-200'
                          }`}
                        >
                          <div>
                            <div>{item.label}</div>
                            <div className="text-[8px] opacity-75 font-normal">{item.desc}</div>
                          </div>
                          {turboMultiplier === item.factor && <span className="text-[9px]">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* PROMINENTE DYNAMIK & TEMPO SCHNELLWAHL (SPORT · DYNAMIC · SLOW) */}
                <div className="flex items-center gap-1 bg-bg-base px-2 py-1 rounded-sm border border-border-bright shadow-sm">
                  <span className="text-[9px] uppercase font-mono font-bold text-text-dim mr-1 hidden xl:inline">
                    Dynamik:
                  </span>

                  {/* SPORT BUTTON */}
                  <button
                    type="button"
                    onClick={() => applyDynamicsProfile('sport')}
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-mono font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                      activeDynamicsPreset === 'sport'
                        ? 'bg-rose-500 text-white border border-rose-400 shadow-md shadow-rose-500/40 ring-1 ring-rose-300'
                        : 'bg-bg-panel text-rose-300/80 border border-border-dim hover:border-rose-400 hover:text-rose-200'
                    }`}
                    title="⚡ SPORT: 1.5x Turbo-Boost · Härte 100% (BLE 0x09: 0 Instant-Umkehr für max. Kadenz)"
                    id="profile-sport-btn"
                  >
                    <Zap className="h-3.5 w-3.5 fill-rose-300 text-rose-300" />
                    <span>SPORT</span>
                    <span className="text-[8.5px] opacity-80 hidden md:inline font-normal">(Turbo · 100%)</span>
                  </button>

                  {/* DYNAMIC BUTTON */}
                  <button
                    type="button"
                    onClick={() => applyDynamicsProfile('dynamic')}
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-mono font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                      activeDynamicsPreset === 'dynamic'
                        ? 'bg-amber-500 text-black border border-amber-300 shadow-md shadow-amber-500/40 ring-1 ring-amber-300'
                        : 'bg-bg-panel text-amber-300/80 border border-border-dim hover:border-amber-400 hover:text-amber-200'
                    }`}
                    title="⚖️ DYNAMIC: Standard Min-Max SPM · Härte 65% (BLE 0x09: 3 Dynamische Motor-Rampe)"
                    id="profile-dynamic-btn"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>DYNAMIC</span>
                    <span className="text-[8.5px] opacity-80 hidden md:inline font-normal">(100% · 65%)</span>
                  </button>

                  {/* SLOW BUTTON */}
                  <button
                    type="button"
                    onClick={() => applyDynamicsProfile('slow')}
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-mono font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                      activeDynamicsPreset === 'slow'
                        ? 'bg-emerald-500 text-black border border-emerald-300 shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300'
                        : 'bg-bg-panel text-emerald-300/80 border border-border-dim hover:border-emerald-400 hover:text-emerald-200'
                    }`}
                    title="🌊 SLOW: 50% Drosselung · Härte 20% (BLE 0x09: 8 Weiche, sanfte S-Kurven-Rampe)"
                    id="profile-slow-btn"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>SLOW</span>
                    <span className="text-[8.5px] opacity-80 hidden md:inline font-normal">(50% · 20%)</span>
                  </button>
                </div>

                {/* LIVE ECHTE SPM ANZEIGE */}
                <div className="hidden lg:flex items-center gap-1.5 bg-bg-base px-2.5 py-1 rounded-sm border border-border-bright text-xs font-mono">
                  <span className="text-text-dim text-[10px]">Kadenz:</span>
                  <span className={`font-bold font-mono ${turboActive ? 'text-rose-400' : throttleLevel !== 'none' ? 'text-amber-300' : 'text-emerald-400'}`}>
                    {currentSpmVal} SPM
                  </span>
                  {turboActive && (
                    <span className="text-[8px] bg-rose-500/20 text-rose-300 border border-rose-400/40 px-1 rounded font-bold">
                      +{Math.round((turboMultiplier - 1) * 100)}%
                    </span>
                  )}
                  {throttleLevel !== 'none' && !turboActive && (
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-1 rounded">
                      Gedrosselt
                    </span>
                  )}
                </div>
                
                {/* Playback Progress Bar Indicator */}
                {(() => {
                  const progressPct = durationMs > 0 ? Math.min(100, Math.max(0, (playbackTime / durationMs) * 100)) : 0;
                  return (
                    <div 
                      className="relative w-48 sm:w-60 h-7 bg-bg-base border border-border-bright rounded-sm overflow-hidden flex items-center justify-center cursor-pointer select-none group shadow-inner"
                      title="Fortschritts-Leiste (Klicken zum Abspiel-Zeitpunkt Springen)"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                        setPlaybackTime(ratio * durationMs);
                      }}
                    >
                      {/* Filling Progress Bar */}
                      <div 
                        className="absolute top-0 left-0 bottom-0 bg-brand-cyan/25 border-r-2 border-brand-cyan pointer-events-none"
                        style={{ width: `${progressPct}%` }}
                      />
                      {/* Centered Time Format: hh:mm:ss / hh:mm:ss */}
                      <span className="relative z-10 font-mono text-xs font-bold text-brand-cyan tracking-wider drop-shadow-sm px-2">
                        {formatHHMMSS(playbackTime)} / {formatHHMMSS(durationMs)}
                      </span>
                    </div>
                  );
                })()}

                {/* Nachträgliche Dauer-Änderung Button im Editor */}
                <button
                  type="button"
                  onClick={() => setShowChangeDurationModal(true)}
                  className="px-2.5 py-1 bg-bg-base hover:bg-brand-cyan/15 border border-border-bright hover:border-brand-cyan text-brand-cyan text-xs font-mono font-bold rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  title="Gesamtdauer der Session nachträglich ändern (Skalieren oder Verlängern/Kürzen)"
                  id="editor-change-duration-btn"
                >
                  <Clock className="h-3.5 w-3.5 text-brand-cyan" />
                  <span>Dauer: <span className="text-text-bright">{formatHHMMSS(durationMs)}</span> (Ändern)</span>
                </button>
              </div>
            </div>

            {!collapsedSections.graph ? (
              <>
            {/* VEREINIGTE TOOLBAR FÜR EBENEN, WERKZEUGE, GRID-SNAP & UNDO/REDO */}
            <div className="bg-bg-panel border border-border-dim rounded-sm p-2.5 mb-3 space-y-2.5 text-xs">
              {/* REIHE 1: EBENEN & HUB-GRENZEN */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-dim/60 pb-2">
                {/* Ebenen Umschalter */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-wrap">
                  <span className="text-[10px] uppercase font-mono font-bold text-text-dim flex items-center gap-1 mr-1 shrink-0">
                    <Layers className="h-3.5 w-3.5 text-brand-cyan" />
                    Ebenen:
                  </span>

                  {/* LAYER 1: MINDESTTIEFE (%) - CYAN */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActiveCurveLayer('minDepth');
                        sensoryEngine.playLayerSwitch('minDepth');
                      }}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        activeCurveLayer === 'minDepth'
                          ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/30 ring-1 ring-cyan-400/40'
                          : 'bg-bg-base border border-border-dim text-text-dim hover:text-cyan-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00F0FF]" />
                      <span>Min ({Math.round(currentMinDepthVal * 10) / 10}%)</span>
                    </button>
                    <button
                      onClick={() => {
                        sensoryEngine.playToggle(!visibleCurves.minDepth);
                        setVisibleCurves(v => ({ ...v, minDepth: !v.minDepth }));
                      }}
                      className="p-1 text-text-dim hover:text-cyan-400 cursor-pointer rounded-sm"
                      title="Min (Mindesttiefe in Cyan) ein-/ausblenden"
                    >
                      {visibleCurves.minDepth ? <Eye className="h-3.5 w-3.5 text-cyan-400" /> : <EyeOff className="h-3.5 w-3.5 text-text-dim opacity-50" />}
                    </button>
                  </div>

                  {/* LAYER 2: MAXIMALTIEFE (%) - ROT/ROSE */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActiveCurveLayer('maxDepth');
                        sensoryEngine.playLayerSwitch('maxDepth');
                      }}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        activeCurveLayer === 'maxDepth'
                          ? 'bg-rose-500/20 border border-rose-500 text-rose-300 shadow-sm shadow-rose-950/30 ring-1 ring-rose-400/40'
                          : 'bg-bg-base border border-border-dim text-text-dim hover:text-rose-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#F43F5E]" />
                      <span>Max ({currentMaxDepthVal}%)</span>
                    </button>
                    <button
                      onClick={() => {
                        sensoryEngine.playToggle(!visibleCurves.maxDepth);
                        setVisibleCurves(v => ({ ...v, maxDepth: !v.maxDepth }));
                      }}
                      className="p-1 text-text-dim hover:text-rose-400 cursor-pointer rounded-sm"
                      title="Max (Maximaltiefe in Rot) ein-/ausblenden"
                    >
                      {visibleCurves.maxDepth ? <Eye className="h-3.5 w-3.5 text-rose-400" /> : <EyeOff className="h-3.5 w-3.5 text-text-dim opacity-50" />}
                    </button>
                  </div>

                  {/* LAYER 3: STÖSSE PRO MINUTE (SPM) - SMARAGD-GRÜN */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActiveCurveLayer('spm');
                        sensoryEngine.playLayerSwitch('spm');
                      }}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        activeCurveLayer === 'spm'
                          ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950/30 ring-1 ring-emerald-400/40'
                          : 'bg-bg-base border border-border-dim text-text-dim hover:text-emerald-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
                      <span>SpM ({currentSpmVal})</span>
                    </button>
                    <button
                      onClick={() => {
                        sensoryEngine.playToggle(!visibleCurves.spm);
                        setVisibleCurves(v => ({ ...v, spm: !v.spm }));
                      }}
                      className="p-1 text-text-dim hover:text-emerald-400 cursor-pointer rounded-sm"
                      title="SpM (Stöße/Min in Grün) ein-/ausblenden"
                    >
                      {visibleCurves.spm ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-text-dim opacity-50" />}
                    </button>
                  </div>

                  {/* LAYER 4: STOSS-HÄRTE & SMOOTHNESS (0x09) - BERNSTEIN-GOLD */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActiveCurveLayer('hardness');
                        sensoryEngine.playLayerSwitch('hardness');
                      }}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        activeCurveLayer === 'hardness'
                          ? 'bg-amber-500/20 border border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-400/50'
                          : 'bg-bg-base border border-border-dim text-text-dim hover:text-amber-300'
                      }`}
                      title="Ebene 4: Härte & BLE-Smoothness (0x09). 100% = Sport/Instant, 0% = Sanfte Motor-Rampe."
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#F59E0B]" />
                      <span>Härte / Smooth ({currentHardnessVal}% · BLE 0x09: {currentDynamicSmoothness})</span>
                    </button>
                    <button
                      onClick={() => {
                        sensoryEngine.playToggle(!visibleCurves.hardness);
                        setVisibleCurves(v => ({ ...v, hardness: !v.hardness }));
                      }}
                      className="p-1 text-text-dim hover:text-amber-400 cursor-pointer rounded-sm"
                      title="Härte (Stoß-Härte / Smoothness in Bernstein) ein-/ausblenden"
                    >
                      {visibleCurves.hardness ? <Eye className="h-3.5 w-3.5 text-amber-400" /> : <EyeOff className="h-3.5 w-3.5 text-text-dim opacity-50" />}
                    </button>
                  </div>
                </div>

                {/* HUB-GRENZEN EINSTELLUNG (MIN & MAX HUB) */}
                <div className="flex items-center gap-2 text-[10px] font-mono bg-bg-base px-2.5 py-1 border border-brand-cyan/30 rounded-sm shrink-0">
                  <span className="text-text-dim font-bold uppercase tracking-wider">Hub:</span>
                  
                  {/* Min Hub Input */}
                  <div className="flex items-center gap-1 bg-bg-panel border border-border-bright rounded-sm px-1.5 py-0.5">
                    <span className="text-text-dim text-[9px]">Min:</span>
                    <input
                      type="text"
                      value={servokMinInput}
                      onChange={(e) => setServokMinInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleApplyHubLimits(); }}
                      className="w-10 bg-transparent text-brand-cyan font-bold text-[11px] focus:outline-none text-right"
                      title="Mindesttiefe des Hubs in % (Freie Eingabe)"
                      placeholder="0"
                    />
                    <span className="text-brand-cyan font-bold">%</span>
                    <span className="text-[9px] text-brand-cyan/70 font-semibold">({formatCm(servokMinDepth)})</span>
                  </div>

                  <span className="text-text-dim text-[9px]">bis</span>

                  {/* Max Hub Input */}
                  <div className="flex items-center gap-1 bg-bg-panel border border-border-bright rounded-sm px-1.5 py-0.5">
                    <span className="text-text-dim text-[9px]">Max:</span>
                    <input
                      type="text"
                      value={servokMaxInput}
                      onChange={(e) => setServokMaxInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleApplyHubLimits(); }}
                      className="w-10 bg-transparent text-brand-cyan font-bold text-[11px] focus:outline-none text-right"
                      title="Maximaltiefe des Hubs in % (Freie Eingabe)"
                      placeholder="100"
                    />
                    <span className="text-brand-cyan font-bold">%</span>
                    <span className="text-[9px] text-brand-cyan/70 font-semibold">({formatCm(servokMaxDepth)})</span>
                  </div>

                  {/* Bestätigungsbutton */}
                  <button
                    onClick={handleApplyHubLimits}
                    className="bg-brand-cyan hover:bg-brand-cyan/90 text-black font-bold px-2 py-0.5 rounded-sm text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-sm uppercase tracking-wider ml-1"
                    title="Hub-Grenzen (Min & Max %) prüfen und übernehmen"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Übernehmen</span>
                  </button>
                </div>
              </div>

              {/* REIHE 3 (GANZ UNTEN): EDITOR-WERKZEUGE, GRID-SNAP ZEIT & HUB, UNDO/REDO & ZOOM */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Left: Werkzeugleiste & Grid-Snap */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-mono font-bold text-text-dim shrink-0">Werkzeuge:</span>
                  
                  {/* Pointer / Single Add Tool */}
                  <button
                    onClick={() => {
                      if (isPlayingRef.current) ensureEditorSafeFromRunning('Werkzeugwechsel auf Zeiger');
                      setActiveEditorTool('pointer');
                      setSelectedPointIds([]);
                    }}
                    className={`px-2 py-1 rounded-sm text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      activeEditorTool === 'pointer'
                        ? 'bg-brand-cyan/20 border border-brand-cyan text-brand-cyan shadow-sm'
                        : 'bg-bg-base border border-border-dim text-text-dim hover:text-text-bright'
                    }`}
                    title="Einzelpunkte zeichnen / auswählen"
                  >
                    <MousePointer className="h-3.5 w-3.5" />
                    <span>Zeiger</span>
                  </button>

                  {/* Box Selection Singular Tool */}
                  <button
                    onClick={() => {
                      if (isPlayingRef.current) ensureEditorSafeFromRunning('Werkzeugwechsel auf Box (Singulär)');
                      setActiveEditorTool('boxSelectSingular');
                    }}
                    className={`px-2 py-1 rounded-sm text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      activeEditorTool === 'boxSelectSingular'
                        ? 'bg-brand-cyan/20 border border-brand-cyan text-brand-cyan shadow-sm'
                        : 'bg-bg-base border border-border-dim text-text-dim hover:text-text-bright'
                    }`}
                    title="Ausschließlich Punkte der AKTIVEN Ebene auswählen"
                  >
                    <BoxSelect className="h-3.5 w-3.5" />
                    <span>Box (Singulär)</span>
                  </button>

                  {/* Box Selection Multi Tool */}
                  <button
                    onClick={() => {
                      if (isPlayingRef.current) ensureEditorSafeFromRunning('Werkzeugwechsel auf Box (Multi)');
                      setActiveEditorTool('boxSelectMulti');
                    }}
                    className={`px-2 py-1 rounded-sm text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      activeEditorTool === 'boxSelectMulti'
                        ? 'bg-brand-cyan/20 border border-brand-cyan text-brand-cyan shadow-sm font-black'
                        : 'bg-bg-base border border-border-dim text-text-dim hover:text-text-bright'
                    }`}
                    title="Punkte MEHRERER Ebenen (Min, Max, SPM, Tempo) gemeinsam auswählen"
                  >
                    <Layers className="h-3.5 w-3.5 text-brand-cyan" />
                    <span>Box (Multi)</span>
                  </button>

                  {/* Razor Cut Tool */}
                  <button
                    onClick={() => {
                      if (isPlayingRef.current) ensureEditorSafeFromRunning('Werkzeugwechsel auf Schere (Abschnitt zerschneiden)');
                      setActiveEditorTool('razorCut');
                    }}
                    className={`px-2 py-1 rounded-sm text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      activeEditorTool === 'razorCut'
                        ? 'bg-amber-500/20 border border-amber-500 text-amber-400 shadow-sm'
                        : 'bg-bg-base border border-border-dim text-text-dim hover:text-text-bright'
                    }`}
                    title="Klicke auf den Graph, um Teilabschnitte dort zu zerschneiden"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    <span>Schere</span>
                  </button>

                  <div className="w-px h-5 bg-border-dim mx-0.5" />

                  {/* INTEGRATED GRID-SNAP CONTROLS */}
                  <div className="flex items-center gap-1.5 bg-bg-base border border-border-dim px-2 py-0.5 rounded-sm">
                    {/* Grid Snap Zeit */}
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <span className="text-[10px] text-text-dim">Snap Zeit:</span>
                      <select
                        value={gridSnapTime}
                        onChange={(e) => setGridSnapTime(parseInt(e.target.value, 10))}
                        className="bg-bg-panel border border-border-bright text-brand-cyan rounded-sm px-1 py-0.5 text-[10px] font-bold focus:outline-none cursor-pointer"
                        title="Einrastung der Zeit beim Setzen/Ziehen von Punkten"
                      >
                        <option value={0}>Frei (0ms)</option>
                        <option value={50}>50 ms</option>
                        <option value={100}>100 ms</option>
                        <option value={250}>250 ms</option>
                        <option value={500}>500 ms</option>
                        <option value={1000}>1 sec</option>
                      </select>
                    </div>

                    <div className="w-px h-3.5 bg-border-dim" />

                    {/* Hub Position Snap */}
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <span className="text-[10px] text-text-dim">Snap Hub:</span>
                      <select
                        value={gridSnapPos}
                        onChange={(e) => setGridSnapPos(parseInt(e.target.value, 10))}
                        className="bg-bg-panel border border-border-bright text-brand-cyan rounded-sm px-1 py-0.5 text-[10px] font-bold focus:outline-none cursor-pointer"
                        title="Einrastung der Hubhöhe (%) beim Setzen/Ziehen von Punkten"
                      >
                        <option value={0}>Frei (0%)</option>
                        <option value={1}>1 %</option>
                        <option value={2}>2 %</option>
                        <option value={5}>5 %</option>
                        <option value={10}>10 %</option>
                      </select>
                    </div>

                    <div className="w-px h-3.5 bg-border-dim" />

                    {/* Raster Lines Toggle */}
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded-sm font-bold border cursor-pointer ${
                        showGrid
                          ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                          : 'bg-bg-panel border-border-dim text-text-dim'
                      }`}
                      title="Rasterlinien anzeigen"
                    >
                      Grid: {showGrid ? 'AN' : 'AUS'}
                    </button>
                  </div>
                </div>

                {/* Right: Undo / Redo & Zoom */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="px-2 py-1 bg-bg-base border border-border-dim disabled:opacity-30 hover:border-brand-cyan text-text-bright text-[11px] font-mono rounded-sm flex items-center gap-1 cursor-pointer"
                    title="Rückgängig machen (Strg+Z)"
                  >
                    <Undo2 className="h-3.5 w-3.5 text-brand-cyan" />
                    <span>Undo</span>
                  </button>

                  <button
                    onClick={redo}
                    disabled={historyIndex >= historyStack.length - 1}
                    className="px-2 py-1 bg-bg-base border border-border-dim disabled:opacity-30 hover:border-brand-cyan text-text-bright text-[11px] font-mono rounded-sm flex items-center gap-1 cursor-pointer"
                    title="Wiederherstellen (Strg+Y)"
                  >
                    <Redo2 className="h-3.5 w-3.5 text-brand-cyan" />
                    <span>Redo</span>
                  </button>

                  <div className="w-px h-5 bg-border-dim mx-0.5" />

                  {/* Zoom Controls */}
                  <button
                    onClick={() => setZoomRange(z => {
                      const curSpan = z ? (z.end - z.start) : durationMs;
                      const newSpan = Math.max(500, curSpan * 0.7);
                      const center = playbackTime;
                      let start = center - newSpan / 2;
                      let end = center + newSpan / 2;
                      if (start < 0) { start = 0; end = newSpan; }
                      if (end > durationMs) { end = durationMs; start = Math.max(0, durationMs - newSpan); }
                      return { start, end };
                    })}
                    className="p-1 bg-bg-base hover:bg-border-bright border border-border-dim text-text-bright rounded-sm cursor-pointer"
                    title="Heranzeomen (Strg + Mausrad hoch)"
                  >
                    <ZoomIn className="h-3.5 w-3.5 text-brand-cyan" />
                  </button>

                  <button
                    onClick={() => setZoomRange(z => {
                      if (!z) return null;
                      const curSpan = z.end - z.start;
                      const newSpan = Math.min(durationMs, curSpan * 1.4);
                      if (newSpan >= durationMs) return null;
                      let start = z.start - (newSpan - curSpan) / 2;
                      let end = start + newSpan;
                      if (start < 0) { start = 0; end = newSpan; }
                      if (end > durationMs) { end = durationMs; start = durationMs - newSpan; }
                      return { start, end };
                    })}
                    className="p-1 bg-bg-base hover:bg-border-bright border border-border-dim text-text-bright rounded-sm cursor-pointer"
                    title="Herauszoomen (Strg + Mausrad runter)"
                  >
                    <ZoomOut className="h-3.5 w-3.5 text-brand-cyan" />
                  </button>

                  {zoomRange && (
                    <button
                      onClick={() => setZoomRange(null)}
                      className="px-1.5 py-0.5 bg-brand-cyan/20 text-brand-cyan border border-brand-cyan text-[10px] font-mono rounded-sm cursor-pointer"
                      title="Zoom auf 100% zurücksetzen"
                    >
                      100%
                    </button>
                  )}
                </div>
              </div>
            </div>

          {/* GRUPPEN-BEARBEITUNGS-LEISTE (Falls Punkte ausgewählt sind) */}
            {selectedPointIds.length > 0 && (
              <div className="bg-brand-cyan/10 border border-brand-cyan/40 rounded-sm p-2.5 mb-2 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-brand-cyan text-bg-base font-mono font-bold text-[11px] rounded-sm shadow-sm">
                    {selectedPointIds.length} Punkte ausgewählt
                  </span>
                  {(() => {
                    const cntMin = waypointsMinDepth.filter((w) => selectedPointIds.includes(w.id)).length;
                    const cntMax = waypointsMaxDepth.filter((w) => selectedPointIds.includes(w.id)).length;
                    const cntSpm = waypointsSpm.filter((w) => selectedPointIds.includes(w.id)).length;
                    const cntHrd = waypointsHardness.filter((w) => selectedPointIds.includes(w.id)).length;
                    const activeTypes = [
                      cntMin > 0 ? `${cntMin}x Min` : null,
                      cntMax > 0 ? `${cntMax}x Max` : null,
                      cntSpm > 0 ? `${cntSpm}x SPM` : null,
                      cntHrd > 0 ? `${cntHrd}x Härte` : null,
                    ].filter(Boolean);

                    const isMulti = activeTypes.length > 1;

                    return (
                      <span className="text-[10px] font-mono text-text-dim flex items-center gap-1.5 flex-wrap">
                        <span>Typ:</span>
                        {isMulti ? (
                          <span className="px-1.5 py-0.5 bg-gradient-to-r from-cyan-500/20 via-rose-500/20 to-amber-500/20 text-brand-cyan font-bold rounded-sm border border-brand-cyan/40 uppercase">
                            Multi-Kombination ({activeTypes.join(', ')})
                          </span>
                        ) : (
                          <strong className="text-brand-cyan uppercase">
                            {activeCurveLayer === 'minDepth' ? 'Mindesttiefe' : activeCurveLayer === 'maxDepth' ? 'Maximaltiefe' : activeCurveLayer === 'spm' ? 'SPM' : 'Härte'}
                          </strong>
                        )}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* HUB/POS SCHRITTE (1%, 5%, 10% in MINUS & PLUS) */}
                  <div className="flex items-center gap-1 bg-bg-panel border border-border-bright p-1 rounded-sm">
                    <span className="text-[10px] font-mono text-text-bright font-bold px-1">Hub (±1%, ±5%, ±10%):</span>
                    <button
                      onClick={() => shiftSelectedPointsPos(-10)}
                      className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-mono text-[10px] font-bold rounded-sm cursor-pointer"
                      title="Ausgewählte Gruppe um -10% nach unten verschieben"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => shiftSelectedPointsPos(-5)}
                      className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-mono text-[10px] font-bold rounded-sm cursor-pointer"
                      title="Ausgewählte Gruppe um -5% nach unten verschieben"
                    >
                      -5%
                    </button>
                    <button
                      onClick={() => shiftSelectedPointsPos(-1)}
                      className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-mono text-[10px] font-bold rounded-sm cursor-pointer"
                      title="Ausgewählte Gruppe um -1% nach unten verschieben"
                    >
                      -1%
                    </button>

                    <div className="w-px h-3.5 bg-border-dim mx-0.5" />

                    <button
                      onClick={() => shiftSelectedPointsPos(1)}
                      className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-bold rounded-sm cursor-pointer"
                      title="Ausgewählte Gruppe um +1% nach oben verschieben"
                    >
                      +1%
                    </button>
                    <button
                      onClick={() => shiftSelectedPointsPos(5)}
                      className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-bold rounded-sm cursor-pointer"
                      title="Ausgewählte Gruppe um +5% nach oben verschieben"
                    >
                      +5%
                    </button>
                    <button
                      onClick={() => shiftSelectedPointsPos(10)}
                      className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-bold rounded-sm cursor-pointer"
                      title="Ausgewählte Gruppe um +10% nach oben verschieben"
                    >
                      +10%
                    </button>
                  </div>

                  {/* ZEIT SCHRITTE & DEHNUNG */}
                  <div className="flex items-center gap-1 bg-bg-panel border border-border-bright p-1 rounded-sm">
                    <span className="text-[10px] font-mono text-text-bright font-bold px-1">Zeit:</span>
                    <button
                      onClick={() => shiftSelectedPointsTime(-100)}
                      className="px-1.5 py-0.5 bg-bg-base hover:bg-brand-cyan/20 border border-border-dim hover:border-brand-cyan/50 text-brand-cyan font-mono text-[10px] rounded-sm cursor-pointer"
                      title="Gruppe 100ms nach links schieben"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => shiftSelectedPointsTime(100)}
                      className="px-1.5 py-0.5 bg-bg-base hover:bg-brand-cyan/20 border border-border-dim hover:border-brand-cyan/50 text-brand-cyan font-mono text-[10px] rounded-sm cursor-pointer"
                      title="Gruppe 100ms nach rechts schieben"
                    >
                      +100ms
                    </button>
                    <div className="w-px h-3.5 bg-border-dim mx-0.5" />
                    <button
                      onClick={() => scaleSelectedPointsTime(0.8)}
                      className="px-1.5 py-0.5 bg-bg-base hover:bg-brand-cyan/20 border border-border-dim hover:border-brand-cyan/50 text-brand-cyan font-mono text-[10px] rounded-sm cursor-pointer"
                      title="Zeit der Gruppe stauchen (0.8x)"
                    >
                      0.8x
                    </button>
                    <button
                      onClick={() => scaleSelectedPointsTime(1.25)}
                      className="px-1.5 py-0.5 bg-bg-base hover:bg-brand-cyan/20 border border-border-dim hover:border-brand-cyan/50 text-brand-cyan font-mono text-[10px] rounded-sm cursor-pointer"
                      title="Zeit der Gruppe dehnen (1.25x)"
                    >
                      1.25x
                    </button>
                  </div>

                  {/* SCHRÄGE LINIEN IN STUFENLINIEN UMANDELN */}
                  <button
                    onClick={() => convertSelectedPointsToStepLines(3000)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-mono font-bold text-[10px] rounded-sm flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                    title="Wandelt schräge Linien (lineare Anstiege) in hardware-optimierte Stufenlinien (3s Stufen) um"
                  >
                    <Sliders className="h-3.5 w-3.5 text-amber-400" />
                    <span>In Stufenlinien (Hardware)</span>
                  </button>

                  {/* GRUPPE SPEICHERN BUTTON */}
                  <button
                    onClick={saveSelectedGroup}
                    className="px-2.5 py-1 bg-brand-cyan hover:bg-brand-cyan/80 text-bg-base font-mono font-bold text-[10px] rounded-sm flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                    title="Diese ausgewählte Punktgruppe als wiederverwendbares Preset speichern"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span>Gruppe Speichern</span>
                  </button>

                  {/* GRUPPE LÖSCHEN */}
                  <button
                    onClick={deleteSelectedWaypoints}
                    className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/50 text-[10px] font-mono font-bold rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                    title="Alle ausgewählten Punkte löschen"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Löschen</span>
                  </button>
                </div>
              </div>
            )}

            {/* SVG STAGE */}
            <div 
              className={`relative w-full overflow-hidden bg-bg-panel rounded-sm border transition-all select-none ${
                isDraggingSnippetOver 
                  ? 'border-brand-cyan ring-2 ring-brand-cyan/30 shadow-xl shadow-brand-cyan/10' 
                  : 'border-border-dim'
              }`}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingSnippetOver(false);
                setDragHoverTimeMs(null);
              }}
            >
              
              {/* Infotext overlay */}
              {waypoints.length === 0 && !isDraggingSnippetOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-text-dim z-10 p-6 text-center">
                  <Activity className="h-8 w-8 text-text-muted mb-2 animate-bounce" />
                  <p className="text-xs font-bold uppercase tracking-widest text-text-bright mb-1">Diagramm ist leer</p>
                  <p className="text-[11px] text-text-dim max-w-sm leading-relaxed">
                    Klicke in diese Rasterfläche oder ziehe oben ein <span className="text-brand-cyan font-bold">Bewegungs-Snippet per Drag &amp; Drop</span> hierhin!
                  </p>
                </div>
              )}

              {/* Raster SVG Canvas */}
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="w-full h-auto cursor-crosshair"
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onWheel={handleWheelZoom}
                onContextMenu={(e) => e.preventDefault()}
                onDragOver={handleDragSnippetOver}
                onDrop={handleDropSnippet}
                id="svg-motion-canvas"
              >
                {/* SVG DEF GRADIENTS & CLIP PATHS */}
                <defs>
                  {/* Linien-Verlauf 1: Mindesttiefe (Electric Cyan #00F0FF) */}
                  <linearGradient id="areaGradMinDepth" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Linien-Verlauf 2: Maximaltiefe (Vivid Rose/Red #F43F5E) */}
                  <linearGradient id="areaGradMaxDepth" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Linien-Verlauf 3: Stöße pro Min (Emerald Green #10B981) */}
                  <linearGradient id="areaGradSpm" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Linien-Verlauf 4: Stoß-Härte (Warm Amber Gold #F59E0B) */}
                  <linearGradient id="areaGradSpeed" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Clip-Path für den Plot-Bereich */}
                  <clipPath id="plotClip">
                    <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_WIDTH} height={PLOT_HEIGHT} rx="12" />
                  </clipPath>
                </defs>

                {/* SOFT SILK CASHMERE PLOT BACKGROUND - ADAPTS TO DARK & LIGHT THEMES */}
                <rect 
                  x={MARGIN.left} 
                  y={MARGIN.top} 
                  width={PLOT_WIDTH} 
                  height={PLOT_HEIGHT} 
                  rx="12"
                  fill="var(--plot-bg)" 
                />

                {/* SERVOK SPERRBEREICHE (MINDESTTIEFE & MAXIMALTIEFE SCHRANKEN) */}
                <g clipPath="url(#plotClip)" id="servok-limit-bands" className="pointer-events-none">
                  {/* Unterer Sperrbereich (Unter Mindesttiefe in Cyan) */}
                  {servokMinDepth > 0 && (
                    <>
                      <rect
                        x={MARGIN.left}
                        y={toSvgY(servokMinDepth)}
                        width={PLOT_WIDTH}
                        height={toSvgY(0) - toSvgY(servokMinDepth)}
                        fill="rgba(0, 240, 255, 0.08)"
                      />
                      <line
                        x1={MARGIN.left}
                        y1={toSvgY(servokMinDepth)}
                        x2={MARGIN.left + PLOT_WIDTH}
                        y2={toSvgY(servokMinDepth)}
                        stroke="#00F0FF"
                        strokeWidth="1.25"
                        strokeDasharray="6 4"
                        strokeOpacity="0.8"
                      />
                      <text
                        x={MARGIN.left + 10}
                        y={toSvgY(servokMinDepth) - 6}
                        fill="#00F0FF"
                        className="font-mono text-[10px] font-semibold"
                      >
                        Mindesttiefe ({Math.round(servokMinDepth * 10) / 10}%)
                      </text>
                    </>
                  )}

                  {/* Oberer Sperrbereich (Über Maximaltiefe in Rot) */}
                  {servokMaxDepth < 100 && (
                    <>
                      <rect
                        x={MARGIN.left}
                        y={MARGIN.top}
                        width={PLOT_WIDTH}
                        height={toSvgY(servokMaxDepth) - MARGIN.top}
                        fill="rgba(244, 63, 94, 0.08)"
                      />
                      <line
                        x1={MARGIN.left}
                        y1={toSvgY(servokMaxDepth)}
                        x2={MARGIN.left + PLOT_WIDTH}
                        y2={toSvgY(servokMaxDepth)}
                        stroke="#F43F5E"
                        strokeWidth="1.25"
                        strokeDasharray="6 4"
                        strokeOpacity="0.8"
                      />
                      <text
                        x={MARGIN.left + 10}
                        y={toSvgY(servokMaxDepth) + 14}
                        fill="#F43F5E"
                        className="font-mono text-[10px] font-semibold"
                      >
                        Maximaltiefe ({Math.round(servokMaxDepth * 10) / 10}%)
                      </text>
                    </>
                  )}

                  {/* DYNAMISCHE DURCHGEHENDE DROSSELUNGS-ANZEIGE-LINIE (WENN AKTIVIERT) */}
                  {throttleLevel !== 'none' && (
                    <>
                      {(() => {
                        const targetLimit = throttleLevel === 'eco_75' ? maxScriptSpm * 0.75 : throttleLevel === 'half_50' ? maxScriptSpm * 0.5 : throttleLevel === 'quiet_30' ? maxScriptSpm * 0.3 : throttleCapMax;
                        const limiterRatio = Math.min(1, Math.max(0, targetLimit / Math.max(1, maxScriptSpm)));
                        const limiterY = toSvgY(limiterRatio * 100);
                        return (
                          <>
                            <line
                              x1={MARGIN.left}
                              y1={limiterY}
                              x2={MARGIN.left + PLOT_WIDTH}
                              y2={limiterY}
                              stroke="#F59E0B"
                              strokeWidth="1.75"
                              strokeDasharray="5 3"
                              strokeOpacity="0.9"
                            />
                            <text
                              x={MARGIN.left + PLOT_WIDTH - 8}
                              y={limiterY - 5}
                              textAnchor="end"
                              fill="#F59E0B"
                              className="font-mono text-[10px] font-bold"
                            >
                              ⚡ DROSSELUNG: {throttleLevel === 'eco_75' ? '75% Eco' : throttleLevel === 'half_50' ? '50% Halblast' : throttleLevel === 'quiet_30' ? '30% Flüster' : `Max ${throttleCapMax} SPM`}
                            </text>
                          </>
                        );
                      })()}
                    </>
                  )}

                  {/* DYNAMISCHE TURBO-BOOST ANZEIGE IM GRAPHEN */}
                  {turboActive && (
                    <g className="pointer-events-none">
                      <rect
                        x={MARGIN.left + PLOT_WIDTH - 210}
                        y={MARGIN.top + 8}
                        width={200}
                        height={24}
                        rx={4}
                        fill="rgba(244, 63, 94, 0.25)"
                        stroke="#F43F5E"
                        strokeWidth="1"
                      />
                      <text
                        x={MARGIN.left + PLOT_WIDTH - 110}
                        y={MARGIN.top + 24}
                        textAnchor="middle"
                        fill="#FDA4AF"
                        className="font-mono text-[10px] font-black uppercase tracking-wider"
                      >
                        🔥 TURBO AKTIV ({turboMultiplier}x): {currentSpmVal} SPM
                      </text>
                    </g>
                  )}
                </g>

                {/* SUBSECTION BACKGROUND REGIONS & NAMES (EMBEDDED IN GRAPH BACKGROUND) */}
                <g clipPath="url(#plotClip)" id="svg-subsection-regions" className="pointer-events-none">
                  {subsections.map((sub, idx) => {
                    const xStart = toSvgX(sub.startTime);
                    const xEnd = toSvgX(sub.endTime);
                    const width = xEnd - xStart;
                    if (width <= 0) return null;
                    
                    // Alternierende, dezenteste Hintergrund-Nuancen (hohe Qualität)
                    const bgColors = [
                      'rgba(0, 240, 255, 0.02)', // Neon Cyan Hauch
                      'rgba(168, 85, 247, 0.02)',  // Violett Hauch
                      'rgba(244, 63, 94, 0.02)',   // Rose Hauch
                    ];
                    const bgColor = bgColors[idx % bgColors.length];
                    
                    return (
                      <g key={`svg-sub-${sub.id}`}>
                        {/* Shaded Area */}
                        <rect
                          x={xStart}
                          y={MARGIN.top}
                          width={width}
                          height={PLOT_HEIGHT}
                          fill={bgColor}
                        />
                        
                        {/* Vertikale Trennlinie am Ende jedes Teilabschnitts */}
                        {sub.endTime < durationMs && (
                          <line
                            x1={xEnd}
                            y1={MARGIN.top}
                            x2={xEnd}
                            y2={MARGIN.top + PLOT_HEIGHT}
                            stroke="#832E7B"
                            strokeWidth="1"
                            strokeDasharray="4 6"
                            strokeOpacity="0.45"
                          />
                        )}
                        
                        {/* Beschriftung des Teilabschnitts dezent am oberen Rand */}
                        <text
                          x={xStart + 12}
                          y={MARGIN.top + 18}
                          fill="#FF85C8"
                          fillOpacity="0.6"
                          className="font-sans text-[10px] font-bold uppercase tracking-wider select-none"
                        >
                          {sub.name}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* DYNAMISCHES HINTERGRUND-RASTER (VOLLSTÄNDIG CLIPPED IM GRAPH) */}
                <g clipPath="url(#plotClip)" id="dynamic-grid" className="pointer-events-none">
                  {/* Y-Achsen Rasterlinien (Horizontal) */}
                  {gridTicks.yTicks.map((tick) => {
                    const y = toSvgY(tick);
                    const isMajor = tick % 10 === 0;
                    if (tick === 0 || tick === 100) return null;
                    return (
                      <line 
                        key={`y-line-${tick}`}
                        x1={MARGIN.left} 
                        y1={y} 
                        x2={SVG_WIDTH - MARGIN.right} 
                        y2={y} 
                        stroke={isMajor ? "var(--border-bright)" : "var(--border-dim)"} 
                        strokeWidth={isMajor ? "0.7" : "0.4"} 
                        strokeDasharray={isMajor ? "none" : "2 4"}
                        strokeOpacity={isMajor ? "0.6" : "0.35"}
                      />
                    );
                  })}

                  {/* X-Achsen Rasterlinien (Vertikal Minor) */}
                  {gridTicks.minorTicks.map((t) => {
                    const x = toSvgX(t);
                    return (
                      <line
                        key={`x-minor-line-${t}`}
                        x1={x}
                        y1={MARGIN.top}
                        x2={x}
                        y2={MARGIN.top + PLOT_HEIGHT}
                        stroke="var(--border-dim)"
                        strokeWidth="0.4"
                        strokeDasharray="2 4"
                        strokeOpacity="0.35"
                      />
                    );
                  })}

                  {/* X-Achsen Rasterlinien (Vertikal Major) */}
                  {gridTicks.majorTicks.map((t) => {
                    const x = toSvgX(t);
                    if (t <= viewStart || t >= viewEnd) return null;
                    return (
                      <line
                        key={`x-major-line-${t}`}
                        x1={x}
                        y1={MARGIN.top}
                        x2={x}
                        y2={MARGIN.top + PLOT_HEIGHT}
                        stroke="var(--border-bright)"
                        strokeWidth="0.7"
                        strokeOpacity="0.6"
                      />
                    );
                  })}
                </g>

                {/* SUBTILE PROJEKTIONEN FÜR JEDEN WEGPUNKT (AUSRICHTUNGSHILFE) */}
                <g clipPath="url(#plotClip)" id="waypoint-guidelines" className="pointer-events-none" opacity="0.3">
                  {waypoints.map((wp, idx) => {
                    if (wp.time < viewStart || wp.time > viewEnd) return null;
                    const cx = toSvgX(wp.time);
                    const cy = toSvgY(wp.pos);
                    return (
                      <g key={`wp-guideline-${wp.id || `${idx}-${wp.time}`}`}>
                        {/* Vertikal zur Achse */}
                        <line
                          x1={cx}
                          y1={cy}
                          x2={cx}
                          y2={MARGIN.top + PLOT_HEIGHT}
                          stroke={TRACK_COLORS[activeCurveLayer]?.hex || '#00F0FF'}
                          strokeWidth="0.75"
                          strokeDasharray="1 3"
                          strokeOpacity="0.45"
                        />
                        {/* Horizontal zur Achse */}
                        <line
                          x1={MARGIN.left}
                          y1={cy}
                          x2={cx}
                          y2={cy}
                          stroke={TRACK_COLORS[activeCurveLayer]?.hex || '#00F0FF'}
                          strokeWidth="0.75"
                          strokeDasharray="1 3"
                          strokeOpacity="0.45"
                        />
                      </g>
                    );
                  })}
                </g>

                {/* STATISCHE ACHSEN-BESCHRIFTUNGEN (OUTSIDE CLIP) */}
                <g id="grid-labels" className="pointer-events-none select-none">
                  {/* Y-Achsen Labels */}
                  {gridTicks.yTicks.map((tick) => {
                    const y = toSvgY(tick);
                    const isLabel = tick % 20 === 0;
                    if (!isLabel) return null;
                    return (
                      <text 
                        key={`y-label-${tick}`}
                        x={MARGIN.left - 12} 
                        y={y + 4} 
                        textAnchor="end" 
                        fill="var(--text-dim)"
                        className="font-mono text-[11px] font-semibold"
                      >
                        {tick}%
                      </text>
                    );
                  })}

                  {/* X-Achsen Labels */}
                  {gridTicks.majorTicks.map((t) => {
                    const x = toSvgX(t);
                    return (
                      <text
                        key={`x-label-${t}`}
                        x={x}
                        y={MARGIN.top + PLOT_HEIGHT + 22}
                        textAnchor="middle"
                        fill="var(--text-dim)"
                        className="font-mono text-[11px] font-semibold"
                      >
                        {formatTimeTick(t, viewWidth)}
                      </text>
                    );
                  })}
                </g>

                {/* VIER PARALLELE GRAPHENLINIEN UND WEGPUNKTE */}
                
                {/* HUBBEREICH-SCHATTEN (KORRIDOR ZWISCHEN MIN UND MAX TIEFE) */}
                {visibleCurves.minDepth && visibleCurves.maxDepth && waypointsMinDepth.length > 0 && waypointsMaxDepth.length > 0 && (
                  <g id="hub-corridor-band" clipPath="url(#plotClip)" className="pointer-events-none">
                    <path
                      d={`
                        M ${toSvgX(waypointsMinDepth[0].time)} ${toSvgY(waypointsMinDepth[0].pos)}
                        ${waypointsMinDepth.map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        ${[...waypointsMaxDepth].reverse().map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        Z
                      `}
                      fill="rgba(0, 240, 255, 0.08)"
                    />
                  </g>
                )}

                {/* 1. LINIE 1: MINDESTTIEFE (ELECTRIC CYAN) */}
                {visibleCurves.minDepth && waypointsMinDepth.length > 0 && (
                  <g id="curve-layer-minDepth">
                    <path
                      d={`
                        M ${toSvgX(waypointsMinDepth[0].time)} ${MARGIN.top + PLOT_HEIGHT}
                        ${waypointsMinDepth.map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        ${[...waypointsMinDepth].reverse().map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        L ${toSvgX(waypointsMinDepth[waypointsMinDepth.length - 1].time)} ${MARGIN.top + PLOT_HEIGHT}
                        Z
                      `}
                      fill="url(#areaGradMinDepth)"
                      clipPath="url(#plotClip)"
                    />
                    <path
                      d={waypointsMinDepth.map((wp, idx) => 
                        `${idx === 0 ? 'M' : 'L'} ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`
                      ).join(' ')}
                      fill="none"
                      stroke={TRACK_COLORS.minDepth.hex}
                      strokeWidth={activeCurveLayer === 'minDepth' ? "3.5" : "2.2"}
                      strokeOpacity={activeCurveLayer === 'minDepth' ? "1.0" : "0.75"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      clipPath="url(#plotClip)"
                    />
                  </g>
                )}

                {/* 2. LINIE 2: MAXIMALTIEFE (VIVID ROSE/RED) */}
                {visibleCurves.maxDepth && waypointsMaxDepth.length > 0 && (
                  <g id="curve-layer-maxDepth">
                    <path
                      d={`
                        M ${toSvgX(waypointsMaxDepth[0].time)} ${MARGIN.top + PLOT_HEIGHT}
                        ${waypointsMaxDepth.map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        ${[...waypointsMaxDepth].reverse().map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        L ${toSvgX(waypointsMaxDepth[waypointsMaxDepth.length - 1].time)} ${MARGIN.top + PLOT_HEIGHT}
                        Z
                      `}
                      fill="url(#areaGradMaxDepth)"
                      clipPath="url(#plotClip)"
                    />
                    <path
                      d={waypointsMaxDepth.map((wp, idx) => 
                        `${idx === 0 ? 'M' : 'L'} ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`
                      ).join(' ')}
                      fill="none"
                      stroke={TRACK_COLORS.maxDepth.hex}
                      strokeWidth={activeCurveLayer === 'maxDepth' ? "3.5" : "2.2"}
                      strokeOpacity={activeCurveLayer === 'maxDepth' ? "1.0" : "0.75"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      clipPath="url(#plotClip)"
                    />
                  </g>
                )}

                {/* 3. LINIE 3: STÖSSE PRO MINUTE (EMERALD GREEN) */}
                {visibleCurves.spm && waypointsSpm.length > 0 && (
                  <g id="curve-layer-spm">
                    <path
                      d={`
                        M ${toSvgX(waypointsSpm[0].time)} ${MARGIN.top + PLOT_HEIGHT}
                        ${waypointsSpm.map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        ${[...waypointsSpm].reverse().map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        L ${toSvgX(waypointsSpm[waypointsSpm.length - 1].time)} ${MARGIN.top + PLOT_HEIGHT}
                        Z
                      `}
                      fill="url(#areaGradSpm)"
                      clipPath="url(#plotClip)"
                    />
                    <path
                      d={waypointsSpm.map((wp, idx) => 
                        `${idx === 0 ? 'M' : 'L'} ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`
                      ).join(' ')}
                      fill="none"
                      stroke={TRACK_COLORS.spm.hex}
                      strokeWidth={activeCurveLayer === 'spm' ? "3.5" : "2.2"}
                      strokeOpacity={activeCurveLayer === 'spm' ? "1.0" : "0.75"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      clipPath="url(#plotClip)"
                    />
                  </g>
                )}

                {/* 4. LINIE 4: STOSS-HÄRTE (WARM AMBER GOLD) */}
                {visibleCurves.hardness && waypointsHardness.length > 0 && (
                  <g id="curve-layer-hardness">
                    <path
                      d={`
                        M ${toSvgX(waypointsHardness[0].time)} ${MARGIN.top + PLOT_HEIGHT}
                        ${waypointsHardness.map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        ${[...waypointsHardness].reverse().map(wp => `L ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`).join(' ')}
                        L ${toSvgX(waypointsHardness[waypointsHardness.length - 1].time)} ${MARGIN.top + PLOT_HEIGHT}
                        Z
                      `}
                      fill="url(#areaGradSpeed)"
                      clipPath="url(#plotClip)"
                    />
                    <path
                      d={waypointsHardness.map((wp, idx) => 
                        `${idx === 0 ? 'M' : 'L'} ${toSvgX(wp.time)} ${toSvgY(wp.pos)}`
                      ).join(' ')}
                      fill="none"
                      stroke={TRACK_COLORS.hardness.hex}
                      strokeWidth={activeCurveLayer === 'hardness' ? "3.5" : "2.2"}
                      strokeOpacity={activeCurveLayer === 'hardness' ? "1.0" : "0.75"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      clipPath="url(#plotClip)"
                    />
                  </g>
                )}

                {/* AKTIVER PLAYBACK TRACKER (CURSOR) - HOCH-KONTRAST FÜR DARK & LIGHT MODE */}
                <g>
                  {/* Weicher Kontrast-Schatten für Lightmode */}
                  <line
                    x1={toSvgX(playbackTime)}
                    y1={MARGIN.top}
                    x2={toSvgX(playbackTime)}
                    y2={MARGIN.top + PLOT_HEIGHT}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="3.5"
                    className="pointer-events-none"
                    clipPath="url(#plotClip)"
                  />
                  {/* Primäre Playhead-Linie */}
                  <line
                    x1={toSvgX(playbackTime)}
                    y1={MARGIN.top}
                    x2={toSvgX(playbackTime)}
                    y2={MARGIN.top + PLOT_HEIGHT}
                    stroke="#F43F5E"
                    strokeWidth="2"
                    strokeOpacity="0.95"
                    className="pointer-events-none"
                    clipPath="url(#plotClip)"
                  />
                  {/* Cursor Glowing Indicator - Nur anzeigen wenn im sichtbaren Zoom-Bereich */}
                  {playbackTime >= viewStart && playbackTime <= viewEnd && (
                    <circle
                      cx={toSvgX(playbackTime)}
                      cy={toSvgY(currentRawDepth)}
                      r="6.5"
                      fill="#00F0FF"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      className="pointer-events-none shadow-md"
                    />
                  )}
                </g>

                {/* INTERAKTIVE WEGPUNKTE DER AKTIVEN & WEITEREN EBENEN (AKTIVE EBENE WIRD ZULETZT GERENDERT FÜR AUSWAHL-PRIORITÄT) */}
                {[
                  { layerKey: 'minDepth' as const, pts: waypointsMinDepth, color: TRACK_COLORS.minDepth.hex, label: 'Mindesttiefe' },
                  { layerKey: 'maxDepth' as const, pts: waypointsMaxDepth, color: TRACK_COLORS.maxDepth.hex, label: 'Maximaltiefe' },
                  { layerKey: 'spm' as const, pts: waypointsSpm, color: TRACK_COLORS.spm.hex, label: 'SPM' },
                  { layerKey: 'hardness' as const, pts: waypointsHardness, color: TRACK_COLORS.hardness.hex, label: 'Härte' },
                ]
                .sort((a, b) => {
                  if (a.layerKey === activeCurveLayer) return 1;
                  if (b.layerKey === activeCurveLayer) return -1;
                  return 0;
                })
                .map(({ layerKey, pts, color, label }) => {
                  if (!visibleCurves[layerKey as keyof typeof visibleCurves]) return null;
                  const isActiveLayer = activeCurveLayer === layerKey;

                  return (
                    <g key={`layer-pts-${layerKey}`}>
                      {pts
                        .filter(point => (point.time >= viewStart && point.time <= viewEnd) || (isActiveLayer && point.id === draggedPointId))
                        .map((point, idx) => {
                          const cx = toSvgX(point.time);
                          const cy = toSvgY(point.pos);
                          const isSelected = isActiveLayer && (selectedPointId === point.id || selectedPointIds.includes(point.id));
                          const isHovered = hoveredPointId === point.id;

                          return (
                            <g key={`wp-g-${layerKey}-${point.id || `${idx}-${point.time}`}`}>
                              {/* Interaktiver, unsichtbarer Hover-Kreis (Aktive Ebene erhält größeres Hit-Target für bevorzugte Auswahl) */}
                              <circle
                                cx={cx}
                                cy={cy}
                                r={isActiveLayer ? "20" : "13"}
                                fill="transparent"
                                className="cursor-grab active:cursor-grabbing"
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  if (ensureEditorSafeFromRunning('Wegpunkt-Bearbeitung')) {
                                    return;
                                  }
                                  e.currentTarget.setPointerCapture(e.pointerId);
                                  setActiveCurveLayer(layerKey as any);
                                  setDraggedPointId(point.id);
                                  setSelectedPointId(point.id);
                                  setPlaybackTime(point.time);
                                  sensoryEngine.playWaypointAction('select', point.pos);

                                  if (e.shiftKey) {
                                    setSelectedPointIds((prev) => 
                                      prev.includes(point.id) ? prev.filter(id => id !== point.id) : [...prev, point.id]
                                    );
                                  } else if (!selectedPointIds.includes(point.id)) {
                                    setSelectedPointIds([point.id]);
                                  }
                                }}
                                onPointerUp={(e) => {
                                  e.stopPropagation();
                                  e.currentTarget.releasePointerCapture(e.pointerId);
                                  setDraggedPointId(null);
                                }}
                                onPointerMove={(e) => {
                                  handleWaypointPointerMove(e, point.id);
                                }}
                                onMouseEnter={() => setHoveredPointId(point.id)}
                                onMouseLeave={() => setHoveredPointId(null)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  sensoryEngine.playWaypointAction('delete');
                                  deleteWaypoint(point.id);
                                }}
                              />

                              {/* Pulsierender / Hervorgehobener Außenring bei aktiver Ebene */}
                              {isActiveLayer && (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isSelected ? 14 : isHovered ? 12 : 9}
                                  fill="none"
                                  stroke={color}
                                  strokeWidth="1.2"
                                  strokeOpacity={isSelected ? "0.9" : isHovered ? "0.65" : "0.35"}
                                  strokeDasharray={isSelected ? "3 3" : "none"}
                                />
                              )}

                                {/* Visueller Knotenkreis */}
                              <circle
                                cx={cx}
                                cy={cy}
                                r={isSelected ? 9.5 : isHovered ? 8 : isActiveLayer ? 6.5 : 4}
                                fill={isSelected ? color : isHovered ? color : 'var(--bg-surface)'}
                                stroke={color}
                                strokeWidth={isSelected ? 3.5 : isActiveLayer ? 2.5 : 1.25}
                                strokeOpacity={isActiveLayer ? 1.0 : 0.65}
                                className="transition-all duration-150 pointer-events-none"
                              />

                              {/* Detail-Tooltip bei Hover */}
                              {(isHovered || isSelected) && (
                                <g className="pointer-events-none">
                                  <rect
                                    x={cx - (layerKey === 'hardness' ? 95 : 70)}
                                    y={cy - 38}
                                    width={layerKey === 'hardness' ? 190 : 140}
                                    height="22"
                                    rx="6"
                                    fill="var(--bg-panel)"
                                    stroke={color}
                                    strokeWidth="1.5"
                                    fillOpacity="0.95"
                                  />
                                  <text
                                    x={cx}
                                    y={cy - 23}
                                    textAnchor="middle"
                                    fill="var(--text-bright)"
                                    className="font-mono text-[9.5px] font-bold"
                                  >
                                    {layerKey === 'hardness'
                                      ? `Härte: ${Math.round(point.pos)}% (Rampe 0x09: ${Math.max(0, Math.min(10, Math.round(((100 - point.pos) / 100) * 10)))}/10)`
                                      : `${label}: ${formatHHMMSS(point.time)} · ${Math.round(point.pos)}% (${formatCm(point.pos)})`}
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                    </g>
                  );
                })}

                    {/* ACTIVE WAYPOINT PROJECTION CROSSHAIR (FADENKREUZ MIT FLIEGENDEN BADGES) */}
                    {(() => {
                      const activeWp = waypoints.find(wp => wp.id === selectedPointId || wp.id === hoveredPointId || wp.id === draggedPointId);
                      if (!activeWp) return null;
                      if (activeWp.time < viewStart || activeWp.time > viewEnd) return null;
                      
                      const cx = toSvgX(activeWp.time);
                      const cy = toSvgY(activeWp.pos);
                      const activeColor = TRACK_COLORS[activeCurveLayer]?.hex || '#00F0FF';
                      
                      return (
                        <g key="active-crosshair" className="pointer-events-none">
                          {/* Clipped guide lines */}
                          <g clipPath="url(#plotClip)">
                            <line
                              x1={cx}
                              y1={MARGIN.top}
                              x2={cx}
                              y2={MARGIN.top + PLOT_HEIGHT}
                              stroke={activeColor}
                              strokeWidth="1.25"
                              strokeDasharray="4 4"
                              strokeOpacity="0.8"
                            />
                            <line
                              x1={MARGIN.left}
                              y1={cy}
                              x2={SVG_WIDTH - MARGIN.right}
                              y2={cy}
                              stroke={activeColor}
                              strokeWidth="1.25"
                              strokeDasharray="4 4"
                              strokeOpacity="0.8"
                            />
                          </g>

                          {/* Floating Badge on Y-Axis (Position in % and cm) */}
                          <g>
                            <rect
                              x={MARGIN.left - 70}
                              y={cy - 9}
                              width="62"
                              height="18"
                              rx="6"
                              fill={activeColor}
                              className="shadow-lg"
                            />
                            <text
                              x={MARGIN.left - 39}
                              y={cy + 4}
                              textAnchor="middle"
                              fill="#0A0A0E"
                              className="font-mono text-[9px] font-bold"
                            >
                              {activeWp.pos}% ({formatCm(activeWp.pos)})
                            </text>
                          </g>

                          {/* Floating Badge on X-Axis (Time in ms / formatted) */}
                          <g>
                            <rect
                              x={cx - 44}
                              y={MARGIN.top + PLOT_HEIGHT + 4}
                              width="88"
                              height="18"
                              rx="6"
                              fill={activeColor}
                              className="shadow-lg"
                            />
                            <text
                              x={cx}
                              y={MARGIN.top + PLOT_HEIGHT + 17}
                              textAnchor="middle"
                              fill="#0A0A0E"
                              className="font-mono text-[10px] font-bold"
                            >
                              {formatTimeTick(activeWp.time, viewWidth)}
                            </text>
                          </g>
                        </g>
                      );
                    })()}

                {/* DRAG AND DROP SNIPPET, LUBE TRIGGER & GROUP PREVIEW OVERLAY */}
                {(isDraggingSnippetOver || dragHoverTimeMs !== null) && dragHoverTimeMs !== null && (() => {
                  if (isDraggingLubeTrigger || draggedLubeBursts !== null) {
                    const dropsSvgX = toSvgX(dragHoverTimeMs);
                    const burstsToDisplay = draggedLubeBursts || 2;
                    return (
                      <g id="lube-drag-preview" className="pointer-events-none">
                        <line
                          x1={dropsSvgX}
                          y1={MARGIN.top}
                          x2={dropsSvgX}
                          y2={MARGIN.top + PLOT_HEIGHT}
                          stroke="#C084FC"
                          strokeWidth="3"
                          strokeDasharray="6 4"
                          clipPath="url(#plotClip)"
                          className="animate-pulse"
                        />
                        <g>
                          <rect
                            x={Math.max(MARGIN.left, Math.min(SVG_WIDTH - MARGIN.right - 270, dropsSvgX - 135))}
                            y={MARGIN.top + 8}
                            width="270"
                            height="26"
                            rx="6"
                            fill="#A855F7"
                            stroke="#C084FC"
                            strokeWidth="1.5"
                            className="shadow-2xl"
                          />
                          <text
                            x={Math.max(MARGIN.left + 135, Math.min(SVG_WIDTH - MARGIN.right - 135, dropsSvgX))}
                            y={MARGIN.top + 25}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            className="font-mono text-[11px] font-bold uppercase tracking-wider"
                          >
                            💧 Pumpstoß ({burstsToDisplay}x) hier ablegen ({formatHHMMSS(dragHoverTimeMs)})
                          </text>
                        </g>
                      </g>
                    );
                  }

                  if (draggedGroup) {
                    const grpPts = draggedGroup.points;
                    const maxRelTime = grpPts.length > 0 ? Math.max(...grpPts.map(p => p.relTime), 100) : 1000;
                    const startSvgX = toSvgX(dragHoverTimeMs);
                    const endSvgX = toSvgX(dragHoverTimeMs + maxRelTime);
                    const snipWidth = Math.max(12, endSvgX - startSvgX);

                    const groupLayers = Array.from(new Set(grpPts.map(p => (p.layer || (draggedGroup.layer !== 'multi' ? draggedGroup.layer : 'minDepth')) as string)));

                    const layerColors: Record<string, string> = TRACK_HEX_BY_KEY;

                    return (
                      <g id="group-drag-preview" className="pointer-events-none">
                        {/* Highlighted drop region rectangle */}
                        <rect
                          x={startSvgX}
                          y={MARGIN.top}
                          width={snipWidth}
                          height={PLOT_HEIGHT}
                          fill="rgba(255, 85, 184, 0.14)"
                          stroke="#FF55B8"
                          strokeWidth="2"
                          strokeDasharray="6 4"
                          clipPath="url(#plotClip)"
                        />

                        {/* Group preview curves */}
                        {(groupLayers as string[]).map((lKey: string) => {
                          const lPts = grpPts.filter(p => (p.layer || (draggedGroup.layer !== 'multi' ? draggedGroup.layer : activeCurveLayer)) === lKey);
                          if (lPts.length === 0) return null;
                          const color = (layerColors as Record<string, string>)[lKey] || '#FF55B8';

                          const pathD = lPts.map((p, idx) => {
                            const time = dragHoverTimeMs + p.relTime;
                            return `${idx === 0 ? 'M' : 'L'} ${toSvgX(time)} ${toSvgY(p.pos)}`;
                          }).join(' ');

                          return (
                            <g key={`drag-preview-${lKey}`}>
                              <path
                                d={pathD}
                                fill="none"
                                stroke={color}
                                strokeWidth="3.5"
                                strokeDasharray="6 4"
                                strokeLinecap="round"
                                clipPath="url(#plotClip)"
                                className="animate-pulse"
                              />
                              {lPts.map((p, idx) => (
                                <circle
                                  key={`drag-pt-${lKey}-${idx}`}
                                  cx={toSvgX(dragHoverTimeMs + p.relTime)}
                                  cy={toSvgY(p.pos)}
                                  r="4.5"
                                  fill="#190618"
                                  stroke={color}
                                  strokeWidth="2"
                                  clipPath="url(#plotClip)"
                                />
                              ))}
                            </g>
                          );
                        })}

                        {/* Drop Location Badge */}
                        <g>
                          <rect
                            x={Math.max(MARGIN.left, Math.min(SVG_WIDTH - MARGIN.right - 260, startSvgX - 20))}
                            y={MARGIN.top + 8}
                            width="260"
                            height="24"
                            rx="6"
                            fill="#FF55B8"
                            className="shadow-xl"
                          />
                          <text
                            x={Math.max(MARGIN.left + 130, Math.min(SVG_WIDTH - MARGIN.right - 130, startSvgX + 110))}
                            y={MARGIN.top + 24}
                            textAnchor="middle"
                            fill="#190618"
                            className="font-mono text-[11px] font-bold uppercase tracking-wider"
                          >
                            📥 Gruppe "{draggedGroup.name}" hier ablegen ({Math.round(dragHoverTimeMs)} ms)
                          </text>
                        </g>
                      </g>
                    );
                  }

                  // Snippet Preview
                  const previewPts = generateSnippetWaypoints(snippetConfig, dragHoverTimeMs);
                  const snipStartSvgX = toSvgX(dragHoverTimeMs);
                  const snipEndSvgX = toSvgX(dragHoverTimeMs + snippetConfig.duration);
                  const snipWidth = Math.max(12, snipEndSvgX - snipStartSvgX);

                  return (
                    <g id="snippet-drag-preview" className="pointer-events-none">
                      {/* Highlighted drop region rectangle */}
                      <rect
                        x={snipStartSvgX}
                        y={MARGIN.top}
                        width={snipWidth}
                        height={PLOT_HEIGHT}
                        fill="rgba(255, 85, 184, 0.16)"
                        stroke="#FF55B8"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        clipPath="url(#plotClip)"
                      />

                      {/* Preview curve of the snippet */}
                      <path
                        d={previewPts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toSvgX(p.time)} ${toSvgY(p.pos)}`).join(' ')}
                        fill="none"
                        stroke="#FF55B8"
                        strokeWidth="3.5"
                        strokeDasharray="8 4"
                        strokeLinecap="round"
                        clipPath="url(#plotClip)"
                        className="animate-pulse"
                      />

                      {/* Drop Location Badge */}
                      <g>
                        <rect
                          x={Math.max(MARGIN.left, Math.min(SVG_WIDTH - MARGIN.right - 210, snipStartSvgX - 20))}
                          y={MARGIN.top + 8}
                          width="210"
                          height="24"
                          rx="6"
                          fill="#FF55B8"
                          className="shadow-xl"
                        />
                        <text
                          x={Math.max(MARGIN.left + 105, Math.min(SVG_WIDTH - MARGIN.right - 105, snipStartSvgX + 85))}
                          y={MARGIN.top + 24}
                          textAnchor="middle"
                          fill="#190618"
                          className="font-mono text-[11px] font-bold uppercase tracking-wider"
                        >
                          ⚡ Snippet hier ablegen ({Math.round(dragHoverTimeMs)} ms)
                        </text>
                      </g>
                    </g>
                  );
                })()}

                {/* UMRANDUNGSRAHMEN (AXENSTREBEN) */}
                <rect 
                  x={MARGIN.left} 
                  y={MARGIN.top} 
                  width={PLOT_WIDTH} 
                  height={PLOT_HEIGHT} 
                  rx="12"
                  fill="none" 
                  stroke="var(--border-bright)" 
                  strokeWidth="1.2"
                />

                {/* RUBBERBAND BOXAUSWAHL OVERLAY */}
                {isBoxSelecting && boxStart && boxCurrent && (
                  <g className="pointer-events-none">
                    <rect
                      x={Math.min(boxStart.x, boxCurrent.x)}
                      y={Math.min(boxStart.y, boxCurrent.y)}
                      width={Math.abs(boxCurrent.x - boxStart.x)}
                      height={Math.abs(boxCurrent.y - boxStart.y)}
                      fill="rgba(255, 85, 184, 0.16)"
                      stroke="#FF55B8"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  </g>
                )}

                {/* LUBE LAUNCHER TRIGGER MARKER (ZWEITGERÄT IMPULSE) */}
                {lubeTriggers
                  .filter((trig) => trig.time >= viewStart && trig.time <= viewEnd)
                  .map((trig, idx) => {
                    const cx = toSvgX(trig.time);
                    const isSelected = selectedLubeTriggerId === trig.id;

                    return (
                      <g key={`lube-trig-${trig.id || `${idx}-${trig.time}`}`} className="cursor-pointer group">
                        {/* Vertikale Kennlinie für Lube Impuls */}
                        <line
                          x1={cx}
                          y1={MARGIN.top}
                          x2={cx}
                          y2={MARGIN.top + PLOT_HEIGHT}
                          stroke="#C084FC"
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          strokeDasharray="4 3"
                          strokeOpacity={isSelected ? "0.9" : "0.65"}
                        />
                        {/* Droplet Badge am oberen Rand des Diagramms */}
                        <g
                          transform={`translate(${cx}, ${MARGIN.top - 12})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLubeTriggerId(trig.id);
                            setPlaybackTime(trig.time);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteLubeTrigger(trig.id);
                          }}
                        >
                          <rect
                            x="-32"
                            y="-10"
                            width="64"
                            height="20"
                            rx="10"
                            fill={isSelected ? '#A855F7' : '#1E1B4B'}
                            stroke="#C084FC"
                            strokeWidth="1.5"
                            className="transition-colors shadow-lg"
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fill="#FFFFFF"
                            className="font-mono text-[9.5px] font-bold select-none pointer-events-none"
                          >
                            💧 {trig.bursts}x
                          </text>
                        </g>
                      </g>
                    );
                  })}
              </svg>

            </div>

            {/* FLIEßENDE SCROLLEISTE UNTER DEM DIAGRAMM FÜR DIE ZEITACHSE */}
            <div className="mt-2.5 bg-bg-panel border border-border-dim p-1.5 rounded-sm flex items-center gap-2 select-none shadow-sm" id="timeline-scrollbar-container">
              {/* Pan Links Button */}
              <button
                onClick={() => panViewRange(-viewWidth * 0.25)}
                className="p-1 bg-bg-base hover:bg-brand-cyan/20 border border-border-dim hover:border-brand-cyan text-brand-cyan rounded-sm cursor-pointer transition-colors shrink-0"
                title="Zeitfenster nach links scrollen (25%)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Interaktive Scrollbar-Schiene (Track) */}
              <div
                ref={scrollbarTrackRef}
                onPointerDown={handleScrollbarPointerDown}
                onPointerMove={handleScrollbarPointerMove}
                onPointerUp={handleScrollbarPointerUp}
                onPointerCancel={handleScrollbarPointerUp}
                className="relative flex-1 h-7 bg-bg-base border border-border-bright rounded-sm overflow-hidden cursor-pointer group touch-none select-none"
                title="Klicken oder Ziehen, um fließend entlang der Zeitachse zu scrollen"
              >
                {/* Mini Subsection Region Visualizer in Scrollbar Track */}
                <div className="absolute inset-0 flex pointer-events-none opacity-30">
                  {subsections.map((sub, idx) => {
                    const leftPct = (sub.startTime / durationMs) * 100;
                    const widthPct = ((sub.endTime - sub.startTime) / durationMs) * 100;
                    const bgColors = ['bg-brand-cyan', 'bg-purple-500', 'bg-rose-500'];
                    return (
                      <div
                        key={`sb-sub-${sub.id}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        className={`absolute top-0 bottom-0 ${bgColors[idx % bgColors.length]} opacity-20 border-r border-border-dim`}
                      />
                    );
                  })}
                </div>

                {/* Overall Progress Fill in Scrollbar Track */}
                <div
                  style={{ width: `${(playbackTime / durationMs) * 100}%` }}
                  className="absolute top-0 bottom-0 left-0 bg-brand-cyan/20 border-r border-brand-cyan/50 pointer-events-none"
                />

                {/* Current Playhead Indicator in Scrollbar */}
                <div
                  style={{ left: `${(playbackTime / durationMs) * 100}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                />

                {/* Draggable Scroll Thumb (Schieberegler / Sichtfenster) */}
                {(() => {
                  const thumbLeftPct = (viewStart / durationMs) * 100;
                  const thumbWidthPct = Math.max(2, (viewWidth / durationMs) * 100);
                  const isZoomed = viewWidth < durationMs;

                  return (
                    <div
                      style={{
                        left: `${thumbLeftPct}%`,
                        width: `${thumbWidthPct}%`,
                      }}
                      className={`absolute top-0.5 bottom-0.5 rounded-sm transition-colors border flex items-center justify-center ${
                        isZoomed
                          ? 'bg-brand-cyan/25 border-brand-cyan text-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.25)] group-hover:bg-brand-cyan/35'
                          : 'bg-border-bright/40 border-border-dim text-text-dim'
                      }`}
                    >
                      <div className="flex items-center gap-1 px-1 overflow-hidden pointer-events-none">
                        <GripVertical className="h-3 w-3 shrink-0 opacity-70" />
                        {thumbWidthPct > 12 && (
                          <span className="text-[9.5px] font-mono font-bold tracking-tight whitespace-nowrap">
                            {formatTimeTick(viewStart, viewWidth)} - {formatTimeTick(viewEnd, viewWidth)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Pan Rechts Button */}
              <button
                onClick={() => panViewRange(viewWidth * 0.25)}
                className="p-1 bg-bg-base hover:bg-brand-cyan/20 border border-border-dim hover:border-brand-cyan text-brand-cyan rounded-sm cursor-pointer transition-colors shrink-0"
                title="Zeitfenster nach rechts scrollen (25%)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Zoom Status Info & Reset */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-border-dim text-[10px] font-mono">
                <span className="text-text-dim font-bold hidden sm:inline">
                  {viewWidth < durationMs ? `Zoom: ${(durationMs / viewWidth).toFixed(1)}x` : '100% Sicht'}
                </span>
                {viewWidth < durationMs && (
                  <button
                    onClick={() => setZoomRange(null)}
                    className="px-1.5 py-0.5 bg-brand-cyan/15 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/40 rounded-sm font-bold cursor-pointer transition-colors"
                    title="Zoom zurücksetzen (Gesamte Session anzeigen)"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* KOMPAKTE TEILABSCHNITTE-SCHNELLWAHL & BEDIENHINWEISE */}
            <div className="mt-2.5 pt-2.5 border-t border-border-dim/60 flex flex-wrap items-center justify-between gap-3">
              {/* Proportionale Abschnitts-Chips zum direkten Fokus-Zoom */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim font-bold flex items-center gap-1 mr-1">
                  <Grid className="h-3.5 w-3.5 text-brand-cyan" />
                  Abschnitt-Fokus:
                </span>
                {subsections.map((sub) => {
                  const isCurrentlyZoomed = Boolean(zoomRange && zoomRange.start === sub.startTime && zoomRange.end === sub.endTime);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        if (isCurrentlyZoomed) {
                          setZoomRange(null);
                        } else {
                          setZoomRange({ start: sub.startTime, end: sub.endTime });
                        }
                      }}
                      className={`px-2 py-1 rounded-sm text-[10px] font-mono font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        isCurrentlyZoomed
                          ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-sm'
                          : 'bg-bg-base border-border-dim text-text-dim hover:text-text-bright hover:border-border-bright'
                      }`}
                      title={`Klicken um in "${sub.name}" (${formatHHMMSS(sub.startTime)} - ${formatHHMMSS(sub.endTime)}) zu zoomen`}
                    >
                      <span>{sub.name}</span>
                      <span className="text-[8.5px] opacity-65">({formatHHMMSS(sub.startTime)})</span>
                    </button>
                  );
                })}
                {zoomRange && (
                  <button
                    type="button"
                    onClick={() => setZoomRange(null)}
                    className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 rounded-sm text-[10px] font-mono font-bold text-rose-300 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <Minimize2 className="h-3 w-3" />
                    <span>100%</span>
                  </button>
                )}
              </div>

              {/* Bedienhinweise & Aktive Punktanzahl */}
              <div className="flex items-center gap-4 text-[10.5px] text-text-dim font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-brand-cyan" />
                  Klick: Punkt setzen
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-rose-500" />
                  Rechtsklick: Punkt löschen
                </span>
                <span className="hidden sm:flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-amber-400" />
                  Strg + Mausrad: Zoom
                </span>
                <span className="px-2 py-0.5 bg-bg-base border border-border-dim rounded-sm text-brand-cyan font-bold">
                  PUNKTE: {waypoints.length}
                </span>
              </div>
            </div>
            </>
            ) : (
              <CollapsedSessionMiniature
                durationMs={durationMs}
                playbackTime={playbackTime}
                isPlaying={isPlaying}
                loopEnabled={loopEnabled}
                waypointsMinDepth={waypointsMinDepth}
                waypointsMaxDepth={waypointsMaxDepth}
                waypointsSpm={waypointsSpm}
                waypointsHardness={waypointsHardness}
                lubeTriggers={lubeTriggers}
                subsections={subsections}
                formatHHMMSS={formatHHMMSS}
                formatCm={formatCm}
                onSeek={(t) => setPlaybackTime(t)}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onToggleLoop={() => setLoopEnabled(!loopEnabled)}
                onExpandGraph={() => toggleSection('graph')}
                onOpenChangeDuration={() => setShowChangeDurationModal(true)}
                onPrevChapter={handlePrevChapter}
                onNextChapter={handleNextChapter}
              />
            )}

          </div>

        {/* MODULARE INSTRUMENTE & WEITERE FELDER (DASHBOARD-BEREICHE) */}
        <DashboardSections
          sectionOrder={sectionOrder}
          hiddenSections={hiddenSections}
          foregroundSections={foregroundSections}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          toggleForeground={toggleForeground}
          moveSection={moveSection}
          onOpenLayoutModal={() => setIsLayoutModalOpen(true)}
          formatHHMMSS={formatHHMMSS}
          formatCm={formatCm}
          playbackTime={playbackTime}
          durationMs={durationMs}
          isPlaying={isPlaying}
          currentSpmVal={currentSpmVal}
          currentMinDepthVal={currentMinDepthVal}
          currentMaxDepthVal={currentMaxDepthVal}
          currentHardnessVal={currentHardnessVal}
          currentServokEffectivePos={currentServokEffectivePos}
          liveSensorPos={liveSensorPos}
          servokTelemetry={servokTelemetry}
          telemetryScaleRatio={telemetryScaleRatio}
          setTelemetryScaleRatio={setTelemetryScaleRatio}
          lubeTriggers={lubeTriggers}
          selectedLubeTriggerId={selectedLubeTriggerId}
          addLubeTrigger={addLubeTrigger}
          deleteLubeTrigger={deleteLubeTrigger}
          setSelectedLubeTriggerId={setSelectedLubeTriggerId}
          setPlaybackTime={setPlaybackTime}
          sendLubeCommandToBLE={sendLubeCommandToBLE}
          setIsDraggingLubeTrigger={setIsDraggingLubeTrigger}
          setDraggedLubeBursts={setDraggedLubeBursts}
          setLubeTriggers={setLubeTriggers}
          subsections={subsections}
          setSubsections={setSubsections}
          zoomRange={zoomRange}
          setZoomRange={setZoomRange}
          addSubsection={addSubsection}
          deleteSubsection={deleteSubsection}
          savedGroups={savedPointGroups}
          setSavedGroups={setSavedPointGroups}
          setDraggedGroup={setDraggedGroup}
          setIsDraggingSnippetOver={setIsDraggingSnippetOver}
          onSaveCurrentSelectionAsGroup={saveSelectedGroup}
          controlMode={controlMode}
          setControlMode={setControlMode}
          hardwareSmoothness={hardwareSmoothness}
          setHardwareSmoothness={setHardwareSmoothness}
          speedBoostFactor={speedBoostFactor}
          setSpeedBoostFactor={setSpeedBoostFactor}
          speedCurveMode={speedCurveMode}
          setSpeedCurveMode={setSpeedCurveMode}
          handleEmergencyStop={handleEmergencyStop}
          bleStatus={bleStatus}
          bleDeviceName={bleModelName || servokBle.deviceName || 'Hismith Servok'}
          connectBLE={connectBLE}
          disconnectBLE={disconnectBLE}
          isScanning={bleStatus === 'connecting'}
          bleBatteryLevel={null}
          lubeBleStatus={lubeBleStatus}
          lubeBleDeviceName={lubeBleModelName || 'Lube Launcher'}
          connectLubeBLE={connectLubeBLE}
          disconnectLubeBLE={disconnectLubeBLE}
          isLubeScanning={lubeBleStatus === 'connecting'}
          lubeBleBatteryLevel={null}
          bluetoothLogs={bleLogs.map((l, i) => ({ id: 'log-' + i, timestamp: l.timestamp, bytes: l.bytes, direction: l.direction, description: l.description }))}
          blePacketLogs={blePacketLogs}
          setBlePacketLogs={setBlePacketLogs}
        />

      </main>
      )}

      {/* FOOTER */}
      <footer className="w-full px-4 sm:px-6 lg:px-8 mx-auto mt-12 text-center text-[11px] text-text-dim border-t border-border-dim pt-6 pb-8 font-mono space-y-1.5">
        <p>© 2026 {t.footerTitle}.</p>
        <p className="text-amber-300/90 font-bold max-w-3xl mx-auto">{t.footerDisclaimerNotice}</p>
        <p className="text-[10px] text-text-dim opacity-80 max-w-2xl mx-auto">{t.footerHardwareNote}</p>
      </footer>

      {/* NEUES BLANKES PROJEKT MODAL DIALOG */}
      <AnimatePresence>
        {showNewProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-brand-cyan/40 rounded-sm p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border-dim pb-3">
                <div className="flex items-center gap-2">
                  <FolderPlus className="h-5 w-5 text-brand-cyan" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-bright font-display">
                    {tr(language, 'Neues Blankes Projekt', 'New Blank Project', 'Nuevo proyecto en blanco')}
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-1 hover:bg-border-bright rounded-sm text-text-dim hover:text-text-bright cursor-pointer"
                  title={tr(language, 'Schließen', 'Close', 'Cerrar')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-text-dim leading-relaxed">
                {tr(
                  language,
                  'Erstellt einen leeren Editor ohne vorgegebene Punkte. Die Gesamtdauer wird als einzelner Start-Abschnitt definiert und kann danach mit dem Scheren-Werkzeug frei zerschnitten werden.',
                  'Creates an empty editor without predefined points. Total duration is defined as an initial section and can then be cut freely with the scissors tool.',
                  'Crea un editor vacío sin puntos predefinidos. La duración total se define como una sección inicial y se puede recortar libremente con las tijeras.'
                )}
              </p>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-text-dim block">
                  {tr(language, 'Gesamtdauer (Format hh:mm:ss):', 'Total Duration (Format hh:mm:ss):', 'Duración total (formato hh:mm:ss):')}
                </label>
                <input
                  type="text"
                  value={blankDurationHms}
                  onChange={(e) => setBlankDurationHms(e.target.value)}
                  placeholder="00:01:30"
                  className="w-full bg-bg-base border border-border-bright focus:border-brand-cyan rounded-sm px-3 py-2 text-sm font-mono text-brand-cyan focus:outline-none"
                />
                <span className="text-[10px] text-text-dim font-mono block">
                  {tr(language, 'Beispiel:', 'Example:', 'Ejemplo:')} <span className="text-brand-cyan">00:02:00</span> = {tr(language, '2 Minuten', '2 minutes', '2 minutos')} ({parseHmsToMs(blankDurationHms)} ms)
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dim">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 bg-bg-base hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  {tr(language, 'Abbrechen', 'Cancel', 'Cancelar')}
                </button>
                <button
                  onClick={() => {
                    handleCreateBlankProject(blankDurationHms);
                    setShowNewProjectModal(false);
                  }}
                  className="px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-bg-base font-bold rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer shadow-lg shadow-brand-cyan/20"
                >
                  {tr(language, 'Projekt Erstellen', 'Create Project', 'Crear proyecto')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SESSION-DAUER NACHTRÄGLICH ANPASSEN MODAL DIALOG */}
      <ChangeDurationModal
        isOpen={showChangeDurationModal}
        onClose={() => setShowChangeDurationModal(false)}
        currentDurationMs={durationMs}
        formatHHMMSS={formatHHMMSS}
        onApplyDuration={handleApplyAdjustDuration}
        language={language}
        totalWaypointsCount={
          waypointsMinDepth.length +
          waypointsMaxDepth.length +
          waypointsSpm.length +
          waypointsHardness.length
        }
      />

      {/* GRUPPEN-BEARBEITEN MODAL DIALOG */}
      <AnimatePresence>
        {editingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-brand-cyan/40 rounded-sm p-6 max-w-lg w-full shadow-2xl space-y-5 text-text-bright"
            >
              <div className="flex items-center justify-between border-b border-border-dim pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-brand-cyan" />
                  <h3 className="text-sm font-bold uppercase tracking-wider font-display">
                    {tr(language, 'Gruppe Bearbeiten & Ebenen Anpassen', 'Edit Group & Adjust Layers', 'Editar grupo y ajustar capas')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="p-1 hover:bg-border-bright rounded-sm text-text-dim hover:text-text-bright cursor-pointer"
                  title={tr(language, 'Schließen', 'Close', 'Cerrar')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-text-dim block">
                  {tr(language, 'Gruppen-Name:', 'Group Name:', 'Nombre del grupo:')}
                </label>
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="w-full bg-bg-base border border-border-bright focus:border-brand-cyan rounded-sm px-3 py-2 text-sm font-bold text-brand-cyan focus:outline-none"
                />
              </div>

              {/* Ebenen-Auswahl Checkboxes */}
              <div className="space-y-2.5 bg-bg-panel p-3.5 rounded-sm border border-border-bright">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs font-mono uppercase font-bold text-brand-cyan">
                    {tr(language, 'Gruppierte Ebenen auswählen:', 'Select grouped layers:', 'Seleccionar capas agrupadas:')}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingGroup({
                          ...editingGroup,
                          activeLayers: { minDepth: true, maxDepth: true, spm: true, hardness: true }
                        })
                      }
                      className="px-2 py-0.5 bg-border-bright hover:bg-border-bright/80 text-[10px] font-mono rounded-sm cursor-pointer"
                    >
                      {tr(language, 'Alle 4', 'All 4', 'Las 4')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingGroup({
                          ...editingGroup,
                          activeLayers: { minDepth: true, maxDepth: true, spm: false, hardness: false }
                        })
                      }
                      className="px-2 py-0.5 bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/40 text-[10px] font-mono font-bold rounded-sm cursor-pointer"
                    >
                      {tr(language, 'Nur Min & Max', 'Min & Max only', 'Solo mín. y máx.')}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-text-dim leading-relaxed">
                  {tr(
                    language,
                    'Wähle aus, welche Ebenen in dieser Gruppe zusammengeschlossen bleiben sollen. Deaktivierte Ebenen werden aus dieser Gruppe gefiltert:',
                    'Select which layers should remain linked in this group. Disabled layers will be filtered out:',
                    'Selecciona qué capas deben permanecer unidas en este grupo. Las capas desactivadas se filtrarán de este grupo:'
                  )}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  {/* Min Depth Checkbox */}
                  <label className={`flex items-center gap-2.5 p-2 rounded-sm border cursor-pointer transition-colors ${
                    editingGroup.activeLayers.minDepth ? 'bg-brand-cyan/10 border-brand-cyan/50 text-brand-cyan font-bold' : 'bg-bg-base border-border-bright text-text-dim'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingGroup.activeLayers.minDepth}
                      onChange={(e) => setEditingGroup({
                        ...editingGroup,
                        activeLayers: { ...editingGroup.activeLayers, minDepth: e.target.checked }
                      })}
                      className="accent-brand-cyan h-4 w-4 rounded cursor-pointer"
                    />
                    <span>1. {tr(language, 'Min (Mindesttiefe)', 'Min (Minimum Depth)', 'Mín. (Profundidad mínima)')}</span>
                  </label>

                  {/* Max Depth Checkbox */}
                  <label className={`flex items-center gap-2.5 p-2 rounded-sm border cursor-pointer transition-colors ${
                    editingGroup.activeLayers.maxDepth ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 font-bold' : 'bg-bg-base border-border-bright text-text-dim'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingGroup.activeLayers.maxDepth}
                      onChange={(e) => setEditingGroup({
                        ...editingGroup,
                        activeLayers: { ...editingGroup.activeLayers, maxDepth: e.target.checked }
                      })}
                      className="accent-rose-500 h-4 w-4 rounded cursor-pointer"
                    />
                    <span>2. {tr(language, 'Max (Maximaltiefe)', 'Max (Maximum Depth)', 'Máx. (Profundidad máxima)')}</span>
                  </label>

                  {/* SPM Checkbox */}
                  <label className={`flex items-center gap-2.5 p-2 rounded-sm border cursor-pointer transition-colors ${
                    editingGroup.activeLayers.spm ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold' : 'bg-bg-base border-border-bright text-text-dim'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingGroup.activeLayers.spm}
                      onChange={(e) => setEditingGroup({
                        ...editingGroup,
                        activeLayers: { ...editingGroup.activeLayers, spm: e.target.checked }
                      })}
                      className="accent-emerald-500 h-4 w-4 rounded cursor-pointer"
                    />
                    <span>3. {tr(language, 'SpM (Hubfrequenz)', 'SPM (Stroke Speed)', 'SPM (Velocidad de carrera)')}</span>
                  </label>

                  {/* Hardness Checkbox */}
                  <label className={`flex items-center gap-2.5 p-2 rounded-sm border cursor-pointer transition-colors ${
                    editingGroup.activeLayers.hardness ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 font-bold' : 'bg-bg-base border-border-bright text-text-dim'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingGroup.activeLayers.hardness}
                      onChange={(e) => setEditingGroup({
                        ...editingGroup,
                        activeLayers: { ...editingGroup.activeLayers, hardness: e.target.checked }
                      })}
                      className="accent-amber-500 h-4 w-4 rounded cursor-pointer"
                    />
                    <span>4. {tr(language, 'Härte (Stoßprofil)', 'Hardness (Impact Profile)', 'Dureza (Perfil de impacto)')}</span>
                  </label>
                </div>
              </div>

              {/* Mini Preview of Filtered Group */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-text-dim uppercase block">
                  {tr(language, 'Vorschau der angepassten Gruppe:', 'Preview of adjusted group:', 'Vista previa del grupo ajustado:')}
                </span>
                <GroupMiniPreview group={{
                  layer: (Object.values(editingGroup.activeLayers).filter(Boolean).length > 1 ? 'multi' : 'minDepth') as any,
                  points: editingGroup.points.filter(p => editingGroup.activeLayers[p.layer || 'minDepth'])
                }} />
                <span className="text-[10px] font-mono text-text-dim block text-right">
                  {tr(
                    language,
                    `Enthält ${editingGroup.points.filter(p => editingGroup.activeLayers[p.layer || 'minDepth']).length} Wegpunkte`,
                    `Contains ${editingGroup.points.filter(p => editingGroup.activeLayers[p.layer || 'minDepth']).length} waypoints`,
                    `Contiene ${editingGroup.points.filter(p => editingGroup.activeLayers[p.layer || 'minDepth']).length} waypoints`
                  )}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dim">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 bg-bg-base hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  {tr(language, 'Abbrechen', 'Cancel', 'Cancelar')}
                </button>
                <button
                  type="button"
                  onClick={saveEditedGroup}
                  className="px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-bg-base font-bold rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer shadow-lg shadow-brand-cyan/20"
                >
                  {tr(language, 'Gruppe Speichern', 'Save Group', 'Guardar grupo')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IN-APP SESSION SPEICHERN MODAL */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-emerald-500/40 rounded-sm p-6 max-w-xl w-full shadow-2xl space-y-5 text-text-bright"
            >
              <div className="flex items-center justify-between border-b border-border-dim pb-3">
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider font-display text-emerald-400">
                    {tr(language, 'Session & Skript Speichern', 'Save Session & Script', 'Guardar sesión y script')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="p-1 hover:bg-border-bright rounded-sm text-text-dim hover:text-text-bright cursor-pointer"
                  title={tr(language, 'Schließen', 'Close', 'Cerrar')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Notice banner if saved */}
              {saveNotice && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 p-3 rounded-sm text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{saveNotice}</span>
                </div>
              )}

              {/* Direct Shortcut to Save as Categorized Preset */}
              <div className="p-3 rounded-xl bg-brand-orchid/10 border border-brand-orchid/35 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-text-bright">
                  <span className="font-semibold text-brand-orchid block">
                    {tr(language, 'Als Katalog-Vorlage veröffentlichen?', 'Publish as Catalog Preset?', '¿Publicar como plantilla de catálogo?')}
                  </span>
                  <span className="text-[11px] text-text-dim">
                    {tr(
                      language,
                      'Mit Titel, Beschreibung & Kategorie dauerhaft in den Vorlagen-Katalog aufnehmen.',
                      'Permanently add to preset catalog with title, description & category.',
                      'Añadir de forma permanente al catálogo de plantillas con título, descripción y categoría.'
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setShowSavePresetModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-brand-orchid text-bg-base font-sans font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{tr(language, 'Als Vorlage speichern', 'Save as Preset', 'Guardar como plantilla')}</span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border-dim font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setSaveTab('app')}
                  className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    saveTab === 'app'
                      ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                      : 'border-transparent text-text-dim hover:text-text-bright'
                  }`}
                >
                  <HardDrive className="h-3.5 w-3.5" />
                  <span>{tr(language, '1. In App-Speicher (Direkt)', '1. In App Storage (Direct)', '1. Memoria de la app (Directo)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSaveTab('json')}
                  className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    saveTab === 'json'
                      ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                      : 'border-transparent text-text-dim hover:text-text-bright'
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{tr(language, '2. Code Anzeigen / Kopieren', '2. View / Copy Code', '2. Ver / Copiar código')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSaveTab('download')}
                  className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    saveTab === 'download'
                      ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                      : 'border-transparent text-text-dim hover:text-text-bright'
                  }`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{tr(language, '3. Datei Herunterladen', '3. Download File', '3. Descargar archivo')}</span>
                </button>
              </div>

              {/* TAB 1: IN APP SPEICHER */}
              {saveTab === 'app' && (
                <div className="space-y-4">
                  <p className="text-xs text-text-dim leading-relaxed">
                    {tr(
                      language,
                      'Sichere deine gesamte Session direkt im Browser-Speicher der App. So musst du keine externen Dateien verwalten und kannst deine Arbeit jederzeit im "Laden"-Menü fortsetzen.',
                      'Save your entire session directly in the app browser storage. No need to manage external files; resume anytime via the "Load" menu.',
                      'Guarda tu sesión directamente en el almacenamiento de la app en el navegador. No necesitas gestionar archivos externos y puedes continuar cuando quieras desde el menú "Cargar".'
                    )}
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-text-dim block">
                      {tr(language, 'Session Name:', 'Session Name:', 'Nombre de la sesión:')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={saveSessionName}
                        onChange={(e) => setSaveSessionName(e.target.value)}
                        placeholder={tr(language, 'Meine Session', 'My Session', 'Mi sesión')}
                        className="flex-1 bg-bg-base border border-border-bright focus:border-emerald-400 rounded-sm px-3 py-2 text-sm font-bold text-emerald-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveCurrentSessionToApp(saveSessionName)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-bg-base font-bold rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
                      >
                        <Save className="h-4 w-4" />
                        <span>{tr(language, 'In App Sichern', 'Save to App', 'Guardar en la app')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Show stored library in modal */}
                  <div className="space-y-2 pt-2 border-t border-border-dim/60">
                    <span className="text-xs font-mono uppercase font-bold text-text-dim block">
                      {tr(
                        language,
                        `Bereits in App gesicherte Sessions (${savedInAppSessions.length}):`,
                        `Sessions stored in app (${savedInAppSessions.length}):`,
                        `Sesiones guardadas en la app (${savedInAppSessions.length}):`
                      )}
                    </span>
                    {savedInAppSessions.length === 0 ? (
                      <div className="p-4 bg-bg-base rounded-sm border border-border-dim text-center text-xs text-text-dim font-mono">
                        {tr(
                          language,
                          'Noch keine Sessions im App-Speicher gesichert.',
                          'No sessions saved in app storage yet.',
                          'Aún no hay sesiones guardadas en el almacenamiento de la app.'
                        )}
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {savedInAppSessions.map((sess) => (
                          <div
                            key={sess.id}
                            className="bg-bg-base p-2.5 rounded-sm border border-border-bright flex items-center justify-between text-xs font-mono"
                          >
                            <div>
                              <div className="font-bold text-emerald-400">{sess.name}</div>
                              <div className="text-[10px] text-text-dim">
                                {sess.date} • {sess.pointsCount} {tr(language, 'Punkte', 'points', 'puntos')} • {Math.round(sess.durationMs / 1000)}s {tr(language, 'Dauer', 'duration', 'duración')}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteInAppSession(sess.id)}
                              className="p-1 hover:bg-rose-500/20 text-text-dim hover:text-rose-400 rounded cursor-pointer"
                              title={tr(language, 'Aus App-Speicher löschen', 'Delete from app storage', 'Eliminar de la app')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: JSON CODE KOPIEREN */}
              {saveTab === 'json' && (
                <div className="space-y-3">
                  <p className="text-xs text-text-dim leading-relaxed">
                    {tr(
                      language,
                      'Kopiere diesen JSON-Code direkt in deine Zwischenablage, um deine Session zu sichern oder mit anderen zu teilen:',
                      'Copy this JSON code directly to your clipboard to back up or share your session:',
                      'Copia este código JSON al portapapeles para guardar o compartir tu sesión:'
                    )}
                  </p>

                  <textarea
                    readOnly
                    rows={8}
                    value={JSON.stringify(getSessionDataObject(), null, 2)}
                    className="w-full bg-bg-base border border-border-bright p-3 rounded-sm text-[10px] font-mono text-emerald-300 focus:outline-none select-all"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(getSessionDataObject(), null, 2));
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2500);
                      }}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 font-bold rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                    >
                      {copySuccess ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>
                        {copySuccess
                          ? tr(language, 'In Zwischenablage Kopiert!', 'Copied to Clipboard!', '¡Copiado al portapapeles!')
                          : tr(language, 'Code Kopieren', 'Copy Code', 'Copiar código')}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DATEI DOWNLOAD */}
              {saveTab === 'download' && (
                <div className="space-y-4">
                  <p className="text-xs text-text-dim leading-relaxed">
                    {tr(
                      language,
                      'Exportiere die Session als klassische Datei auf deine Festplatte:',
                      'Export the session as a traditional file to your drive:',
                      'Exporta la sesión como un archivo tradicional a tu disco:'
                    )}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        exportSessionJSON();
                        setShowSaveModal(false);
                      }}
                      className="p-3 bg-bg-base hover:bg-emerald-500/10 border border-emerald-500/40 hover:border-emerald-400 text-emerald-400 rounded-sm text-left cursor-pointer space-y-1"
                    >
                      <div className="font-bold font-mono text-xs flex items-center gap-1.5">
                        <Download className="h-4 w-4" />
                        <span>{tr(language, 'Ganze Session (.json)', 'Full Session (.json)', 'Sesión completa (.json)')}</span>
                      </div>
                      <div className="text-[10px] text-text-dim leading-tight">
                        {tr(
                          language,
                          'Enthält alle 4 Ebenen, Teilabschnitte und gespeicherte Gruppen.',
                          'Contains all 4 layers, subsections, and saved groups.',
                          'Contiene las 4 capas, tramos y grupos guardados.'
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportFile('fun');
                        setShowSaveModal(false);
                      }}
                      className="p-3 bg-bg-base hover:bg-brand-cyan/10 border border-brand-cyan/40 hover:border-brand-cyan text-brand-cyan rounded-sm text-left cursor-pointer space-y-1"
                    >
                      <div className="font-bold font-mono text-xs flex items-center gap-1.5">
                        <Download className="h-4 w-4" />
                        <span>{tr(language, 'Skript-Datei (.fun / .csv)', 'Script File (.fun / .csv)', 'Archivo de script (.fun / .csv)')}</span>
                      </div>
                      <div className="text-[10px] text-text-dim leading-tight">
                        {tr(
                          language,
                          'Exporte der aktiven Kurve als Zeit/Positions-Tabelle.',
                          'Export active curve as a time/position table.',
                          'Exporta la curva activa como tabla de tiempo/posición.'
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dim">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 bg-bg-base hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  {tr(language, 'Schließen', 'Close', 'Cerrar')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IN-APP SESSION LADEN MODAL */}
      <AnimatePresence>
        {showLoadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-brand-cyan/40 rounded-sm p-6 max-w-xl w-full shadow-2xl space-y-5 text-text-bright"
            >
              <div className="flex items-center justify-between border-b border-border-dim pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-brand-cyan" />
                  <h3 className="text-sm font-bold uppercase tracking-wider font-display text-brand-cyan">
                    {tr(language, 'Session & Skript Laden', 'Load Session & Script', 'Cargar sesión y script')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoadModal(false)}
                  className="p-1 hover:bg-border-bright rounded-sm text-text-dim hover:text-text-bright cursor-pointer"
                  title={tr(language, 'Schließen', 'Close', 'Cerrar')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border-dim font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setLoadTab('app')}
                  className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    loadTab === 'app'
                      ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10'
                      : 'border-transparent text-text-dim hover:text-text-bright'
                  }`}
                >
                  <HardDrive className="h-3.5 w-3.5" />
                  <span>{tr(language, '1. Aus App-Speicher', '1. From App Storage', '1. Desde memoria de la app')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoadTab('paste')}
                  className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    loadTab === 'paste'
                      ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10'
                      : 'border-transparent text-text-dim hover:text-text-bright'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{tr(language, '2. Code / Text Einfügen', '2. Paste Code / Text', '2. Pegar código / texto')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoadTab('file')}
                  className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    loadTab === 'file'
                      ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10'
                      : 'border-transparent text-text-dim hover:text-text-bright'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{tr(language, '3. Datei Wählen', '3. Choose File', '3. Seleccionar archivo')}</span>
                </button>
              </div>

              {/* TAB 1: AUS APP SPEICHER */}
              {loadTab === 'app' && (
                <div className="space-y-3">
                  <p className="text-xs text-text-dim leading-relaxed">
                    {tr(
                      language,
                      'Wähle eine im Browser-Speicher gesicherte Session aus, um sie direkt im Editor zu öffnen:',
                      'Select a session saved in browser storage to open directly in the editor:',
                      'Selecciona una sesión guardada en el almacenamiento del navegador para abrirla en el editor:'
                    )}
                  </p>

                  {savedInAppSessions.length === 0 ? (
                    <div className="p-6 bg-bg-base rounded-sm border border-border-dim text-center text-xs text-text-dim font-mono space-y-1">
                      <div>{tr(language, 'Keine gesicherten Sessions im App-Speicher vorhanden.', 'No saved sessions found in app storage.', 'No hay sesiones guardadas en el almacenamiento de la app.')}</div>
                      <div className="text-[10px]">
                        {tr(
                          language,
                          'Nutze den "Speichern"-Button, um deine aktuellen Sessions hier abzulegen.',
                          'Use the "Save" button to store your current sessions here.',
                          'Usa el botón "Guardar" para almacenar aquí tus sesiones actuales.'
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {savedInAppSessions.map((sess) => (
                        <div
                          key={sess.id}
                          className="bg-bg-base p-3 rounded-sm border border-border-bright hover:border-brand-cyan/60 flex items-center justify-between transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-xs text-brand-cyan font-mono">{sess.name}</div>
                            <div className="text-[10px] text-text-dim font-mono">
                              {sess.date} • {sess.pointsCount} {tr(language, 'Punkte', 'points', 'puntos')} • {Math.round(sess.durationMs / 1000)}s {tr(language, 'Gesamtdauer', 'total duration', 'duración total')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                loadSessionFromData(sess.data, sess.name);
                                setShowLoadModal(false);
                              }}
                              className="px-3 py-1 bg-brand-cyan hover:bg-brand-cyan/80 text-bg-base font-bold text-xs font-mono uppercase rounded-sm cursor-pointer shadow-sm"
                            >
                              {tr(language, 'Laden', 'Load', 'Cargar')}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteInAppSession(sess.id)}
                              className="p-1.5 hover:bg-rose-500/20 text-text-dim hover:text-rose-400 rounded cursor-pointer"
                              title={tr(language, 'Löschen', 'Delete', 'Eliminar')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CODE EINFÜGEN */}
              {loadTab === 'paste' && (
                <div className="space-y-3">
                  <p className="text-xs text-text-dim leading-relaxed">
                    {tr(
                      language,
                      'Füge hier deinen JSON-Session-Code, Gruppen-JSON oder CSV-Daten (Format: Zeit,Position) ein:',
                      'Paste your JSON session code, group JSON, or CSV data (format: time,position) here:',
                      'Pega aquí tu código JSON de sesión, JSON de grupo o datos CSV (formato: tiempo,posición):'
                    )}
                  </p>

                  <textarea
                    rows={6}
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder={tr(
                      language,
                      'Füge hier JSON oder CSV ein, z.B. {"type":"hismith_servok_session", ...}',
                      'Paste JSON or CSV here, e.g. {"type":"hismith_servok_session", ...}',
                      'Pega JSON o CSV aquí, ej. {"type":"hismith_servok_session", ...}'
                    )}
                    className="w-full bg-bg-base border border-border-bright focus:border-brand-cyan p-3 rounded-sm text-xs font-mono text-brand-cyan focus:outline-none"
                  />

                  {pasteError && (
                    <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 text-rose-400 rounded-sm text-xs font-mono flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{pasteError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handlePastedContentImport}
                      className="px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-bg-base font-bold rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{tr(language, 'Inhalt Importieren', 'Import Content', 'Importar contenido')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DATEI WÄHLEN */}
              {loadTab === 'file' && (
                <div className="space-y-4">
                  <p className="text-xs text-text-dim leading-relaxed">
                    {tr(
                      language,
                      'Wähle eine Session- oder Skript-Datei von deinem Computer aus (.json, .csv, .fun):',
                      'Select a session or script file from your computer (.json, .csv, .fun):',
                      'Selecciona un archivo de sesión o script de tu ordenador (.json, .csv, .fun):'
                    )}
                  </p>

                  <div
                    onClick={() => sessionFileInputRef.current?.click()}
                    className="border-2 border-dashed border-brand-cyan/40 hover:border-brand-cyan p-8 rounded-sm bg-bg-base/60 text-center cursor-pointer transition-colors space-y-2"
                  >
                    <Upload className="h-8 w-8 text-brand-cyan mx-auto animate-bounce" />
                    <div className="text-xs font-mono text-brand-cyan font-bold uppercase">
                      {tr(language, 'Klicke hier, um eine Datei auszuwählen', 'Click here to select a file', 'Haz clic aquí para seleccionar un archivo')}
                    </div>
                    <div className="text-[10px] text-text-dim font-mono">
                      {tr(
                        language,
                        'Unterstützt .json (Session & Gruppen) sowie .fun / .csv (Zeit/Position Tabelle)',
                        'Supports .json (session & groups) and .fun / .csv (time/position table)',
                        'Compatible con .json (sesión y grupos) y .fun / .csv (tabla tiempo/posición)'
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dim">
                <button
                  type="button"
                  onClick={() => setShowLoadModal(false)}
                  className="px-4 py-2 bg-bg-base hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright rounded-sm text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  {tr(language, 'Schließen', 'Close', 'Cerrar')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM IN-APP INPUT PROMPT MODAL */}
      <AnimatePresence>
        {promptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-brand-cyan/50 rounded-sm p-5 max-w-md w-full shadow-2xl space-y-4 text-text-bright"
            >
              <div className="flex items-center justify-between border-b border-border-dim pb-2.5">
                <h3 className="text-sm font-bold uppercase tracking-wider font-display text-brand-cyan">
                  {promptModal.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setPromptModal(null)}
                  className="p-1 hover:bg-border-bright rounded-sm text-text-dim hover:text-text-bright cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {promptModal.label && (
                  <label className="text-xs font-mono text-text-dim block leading-relaxed">
                    {promptModal.label}
                  </label>
                )}
                <input
                  type="text"
                  autoFocus
                  value={promptInputVal}
                  onChange={(e) => setPromptInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      promptModal.onConfirm(promptInputVal);
                      setPromptModal(null);
                    }
                  }}
                  className="w-full bg-bg-base border border-border-bright focus:border-brand-cyan rounded-sm px-3 py-2 text-sm font-mono text-brand-cyan font-bold focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dim">
                <button
                  type="button"
                  onClick={() => setPromptModal(null)}
                  className="px-3 py-1.5 bg-bg-base hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright rounded-sm text-xs font-mono uppercase cursor-pointer"
                >
                  {tr(language, 'Abbrechen', 'Cancel', 'Cancelar')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    promptModal.onConfirm(promptInputVal);
                    setPromptModal(null);
                  }}
                  className="px-4 py-1.5 bg-brand-cyan hover:bg-brand-cyan/80 text-bg-base font-bold rounded-sm text-xs font-mono uppercase cursor-pointer shadow-md"
                >
                  {tr(language, 'Bestätigen', 'Confirm', 'Confirmar')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM IN-APP CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-brand-cyan/50 rounded-sm p-5 max-w-md w-full shadow-2xl space-y-4 text-text-bright"
            >
              <div className="flex items-center justify-between border-b border-border-dim pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-5 w-5 ${confirmModal.variant === 'danger' ? 'text-rose-400' : 'text-amber-400'}`} />
                  <h3 className="text-sm font-bold uppercase tracking-wider font-display text-text-bright">
                    {confirmModal.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="p-1 hover:bg-border-bright rounded-sm text-text-dim hover:text-text-bright cursor-pointer"
                  title={tr(language, 'Schließen', 'Close', 'Cerrar')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-text-dim leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dim">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-1.5 bg-bg-base hover:bg-border-bright border border-border-dim text-text-dim hover:text-text-bright rounded-sm text-xs font-mono uppercase cursor-pointer"
                >
                  {confirmModal.cancelText || tr(language, 'Abbrechen', 'Cancel', 'Cancelar')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal(null);
                    action();
                  }}
                  className={`px-4 py-1.5 font-bold rounded-sm text-xs font-mono uppercase cursor-pointer shadow-md ${
                    confirmModal.variant === 'danger'
                      ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : 'bg-brand-cyan hover:bg-brand-cyan/80 text-bg-base'
                  }`}
                >
                  {confirmModal.confirmText || tr(language, 'Bestätigen', 'Confirm', 'Confirmar')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DASHBOARD LAYOUT ANORDNUNG & SICHTBARKEIT MODAL */}
      <LayoutOrderModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        sectionOrder={sectionOrder}
        onReorder={setSectionOrder}
        hiddenSections={hiddenSections}
        onToggleVisibility={toggleSectionVisibility}
        onResetOrder={resetSectionOrder}
        language={language}
      />

      {/* SAVE AS CATEGORIZED PRESET MODAL (FROM STUDIO EDITOR) */}
      <SavePresetModal
        isOpen={showSavePresetModal}
        onClose={() => setShowSavePresetModal(false)}
        sourceLabel="4-Spur Studio Session"
        durationMs={durationMs}
        waypointsMinDepth={waypointsMinDepth}
        waypointsMaxDepth={waypointsMaxDepth}
        waypointsSpm={waypointsSpm}
        waypointsHardness={waypointsHardness}
        subsections={subsections}
        lubeTriggers={lubeTriggers}
        defaultTitle={saveSessionName !== 'Meine Servok Session' ? saveSessionName : ''}
        onSaved={(saved) => {
          addLog('INFO', `Vorlage "${saved.title}" (${saved.category}) im Vorlagen-Katalog gespeichert.`);
        }}
        language={language}
      />

      {/* SYSTEM-EINSTELLUNGEN MODAL (DESIGN 10+10, WERTE, BLUETOOTH & DATEI) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentLuminance={themeLuminance}
        currentTemperature={themeTemperature}
        onChangeLuminance={setThemeLuminance}
        onChangeTemperature={setThemeTemperature}
        formatCm={formatCm}
        language={language}
      />

      {/* XBOX CONTROLLER & TASTATUR BELEGUNGS-SCHNITTSTELLE MODAL */}
      <ControllerMappingModal
        isOpen={showControllerModal}
        onClose={() => setShowControllerModal(false)}
        language={language}
      />

      {/* ALWAYS-ON-TOP FLOATING KILL-SWITCH & SENSORY TELEMETRY DOCK */}
      <FloatingKillSwitch
        isPlaying={isPlaying}
        isConnected={bleStatus === 'connected' || servokBle.connected}
        onEmergencyStop={handleEmergencyStop}
        language={language}
      />

    </div>
  );
}
