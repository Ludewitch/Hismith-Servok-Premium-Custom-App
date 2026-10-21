import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Palette,
  Sliders,
  Bluetooth,
  HardDrive,
  Check,
  RotateCcw,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Smartphone,
  Eye,
  ShieldCheck,
  Gauge,
  Sparkles,
  Zap,
  Info,
  Trash2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import {
  settingsService,
  AppSettings,
  DARK_ACCENTS,
  LIGHT_ACCENTS,
  AccentColor,
} from '../services/settingsService';
import { servokBle } from '../services/servokBle';
import { sensoryEngine } from '../services/sensoryEngine';
import { Language, tr } from '../i18n/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLuminance: 'dark' | 'light';
  currentTemperature: 'warm' | 'cold';
  onChangeLuminance: (lum: 'dark' | 'light') => void;
  onChangeTemperature: (temp: 'warm' | 'cold') => void;
  formatCm: (posPct: number) => string;
  language?: Language;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentLuminance,
  currentTemperature,
  onChangeLuminance,
  onChangeTemperature,
  formatCm,
  language = 'de',
}) => {
  const [activeTab, setActiveTab] = useState<'design' | 'defaults' | 'bluetooth' | 'file'>('design');
  const [settings, setSettings] = useState<AppSettings>(() => settingsService.getSettings());
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    const unsub = settingsService.subscribe((s) => {
      setSettings(s);
    });
    return unsub;
  }, []);

  // Keyboard navigation: Escape key closes the modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const triggerSaveNotice = (msg: string = 'In servok-settings.json gespeichert') => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleSelectAccent = (accentId: string) => {
    sensoryEngine.playClick(1.1);
    const isDark = currentLuminance === 'dark';
    if (isDark) {
      settingsService.updateSettings({
        theme: {
          ...settings.theme,
          luminance: currentLuminance,
          temperature: currentTemperature,
          darkAccentId: accentId,
        },
      });
    } else {
      settingsService.updateSettings({
        theme: {
          ...settings.theme,
          luminance: currentLuminance,
          temperature: currentTemperature,
          lightAccentId: accentId,
        },
      });
    }
    triggerSaveNotice('Akzentfarbe angewendet & gespeichert');
  };

  const handleUpdateDefaults = (partialDefaults: Partial<AppSettings['defaults']>) => {
    settingsService.updateSettings({
      defaults: {
        ...settings.defaults,
        ...partialDefaults,
      },
    });
    triggerSaveNotice();
  };

  const handleUpdateBluetooth = (partialBle: Partial<AppSettings['bluetooth']>) => {
    settingsService.updateSettings({
      bluetooth: {
        ...settings.bluetooth,
        ...partialBle,
      },
    });
    triggerSaveNotice();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = settingsService.importSettingsFile(content);
      if (success) {
        sensoryEngine.playClick(1.2);
        triggerSaveNotice('✓ Einstellungen aus Datei importiert');
      } else {
        alert('Fehler beim Lesen der Einstellungsdatei.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  const isDark = currentLuminance === 'dark';
  const accentList: AccentColor[] = isDark ? DARK_ACCENTS : LIGHT_ACCENTS;
  const currentAccentId = isDark ? settings.theme.darkAccentId : settings.theme.lightAccentId;
  const currentAccent = accentList.find((a) => a.id === currentAccentId) || accentList[0];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto"
        onClick={onClose}
        id="settings-modal-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-[#0A0710]/95 border border-brand-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.12),0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] my-auto"
        >
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-border-dim/60 bg-gradient-to-r from-bg-panel/90 via-bg-base/70 to-bg-panel/90 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan">
                <Palette className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold font-display text-text-bright tracking-wide flex items-center gap-2">
                  <span>{tr(language, 'Einstellungen & Systemkonfiguration', 'Settings & System Configuration', 'Ajustes y Configuración del Sistema')}</span>
                </h2>
                <p className="text-xs font-mono text-text-dim">
                  {tr(language, 'Persönliche Farbdesigns, Standard-Dynamik & Bluetooth-Kopplung', 'Personal color themes, default dynamics & Bluetooth pairing', 'Temas de color personales, dinámica predeterminada y emparejamiento Bluetooth')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full animate-fade-in flex items-center gap-1.5">
                  <Check className="h-3 w-3" />
                  {saveStatus}
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-bg-panel hover:bg-border-bright text-text-dim hover:text-text-bright border border-border-dim hover:border-brand-cyan/40 transition-colors cursor-pointer"
                title={tr(language, 'Schließen (Esc)', 'Close (Esc)', 'Cerrar (Esc)')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* TAB BAR */}
          <div className="flex items-center gap-1.5 px-6 pt-3 border-b border-border-dim/50 bg-bg-panel/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                sensoryEngine.playClick(1.0);
                setActiveTab('design');
              }}
              className={`px-4 py-2.5 border-b-2 text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'design'
                  ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10 font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>{tr(language, 'Design & Akzentfarben (10+10)', 'Design & Accent Colors (10+10)', 'Diseño y Colores de Acento (10+10)')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sensoryEngine.playClick(1.0);
                setActiveTab('defaults');
              }}
              className={`px-4 py-2.5 border-b-2 text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'defaults'
                  ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10 font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{tr(language, 'Werte & Standard-Dynamik', 'Values & Default Dynamics', 'Valores y Dinámica Predeterminada')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sensoryEngine.playClick(1.0);
                setActiveTab('bluetooth');
              }}
              className={`px-4 py-2.5 border-b-2 text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'bluetooth'
                  ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10 font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright'
              }`}
            >
              <Bluetooth className="h-3.5 w-3.5" />
              <span>{tr(language, 'Geräte & Auto-Connect', 'Devices & Auto-Connect', 'Dispositivos y Auto-Conexión')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sensoryEngine.playClick(1.0);
                setActiveTab('file');
              }}
              className={`px-4 py-2.5 border-b-2 text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'file'
                  ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/10 font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright'
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span>{tr(language, 'Datei & Lokale Synchronisation', 'File & Local Sync', 'Archivo y Sincronización Local')}</span>
            </button>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* ===============================================================
                TAB 1: DESIGN & AKZENTFARBEN (10 DARKMODE + 10 LIGHTMODE)
               =============================================================== */}
            {activeTab === 'design' && (
              <div className="space-y-6">
                {/* 1. Base Mode & Nuance Toggles */}
                <div className="sensual-glass rounded-xl p-5 border border-border-dim space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border-dim/40 pb-2.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-brand-cyan font-bold flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-brand-cyan" />
                      Grund-Erscheinungsbild
                    </span>
                    <span className="text-[11px] font-mono text-text-dim">
                      Wird dauerhaft in deiner Einstellungsdatei gesichert
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dark vs Light */}
                    <div>
                      <label className="text-xs font-mono text-text-dim block mb-1.5">
                        {tr(language, 'Luminanz-Modus:', 'Luminance Mode:', 'Modo de Luminancia:')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sensoryEngine.playClick(1.0);
                            onChangeLuminance('dark');
                            settingsService.updateSettings({
                              theme: { ...settings.theme, luminance: 'dark' },
                            });
                          }}
                          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            currentLuminance === 'dark'
                              ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-bold shadow-sm'
                              : 'bg-bg-panel border-border-dim text-text-dim hover:text-text-bright'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full bg-[#120B0F] border border-border-bright" />
                          <span>OLED Dark</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            sensoryEngine.playClick(1.0);
                            onChangeLuminance('light');
                            settingsService.updateSettings({
                              theme: { ...settings.theme, luminance: 'light' },
                            });
                          }}
                          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            currentLuminance === 'light'
                              ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-bold shadow-sm'
                              : 'bg-bg-panel border-border-dim text-text-dim hover:text-text-bright'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full bg-[#FAF4F0] border border-border-dim" />
                          <span>Soft Light</span>
                        </button>
                      </div>
                    </div>

                    {/* Warm vs Cold */}
                    <div>
                      <label className="text-xs font-mono text-text-dim block mb-1.5">
                        {tr(language, 'Farb-Temperatur:', 'Color Temperature:', 'Temperatura de Color:')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sensoryEngine.playClick(1.0);
                            onChangeTemperature('warm');
                            settingsService.updateSettings({
                              theme: { ...settings.theme, temperature: 'warm' },
                            });
                          }}
                          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            currentTemperature === 'warm'
                              ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-bold shadow-sm'
                              : 'bg-bg-panel border-border-dim text-text-dim hover:text-text-bright'
                          }`}
                        >
                          <span>{tr(language, '🌸 Warm & Sinnlich', '🌸 Warm & Sensual', '🌸 Cálido y Sensual')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            sensoryEngine.playClick(1.0);
                            onChangeTemperature('cold');
                            settingsService.updateSettings({
                              theme: { ...settings.theme, temperature: 'cold' },
                            });
                          }}
                          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            currentTemperature === 'cold'
                              ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-bold shadow-sm'
                              : 'bg-bg-panel border-border-dim text-text-dim hover:text-text-bright'
                          }`}
                        >
                          <span>{tr(language, '❄️ Kühl & Ätherisch', '❄️ Cool & Ethereal', '❄️ Fresco y Etéreo')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 10 Accent Colors for Current Mode */}
                <div className="sensual-glass rounded-xl p-5 border border-border-dim space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border-dim/40 pb-2.5">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-text-bright font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                        {tr(
                          language,
                          `10 Kuratierte Akzentfarben für ${isDark ? 'Darkmode' : 'Lightmode'}`,
                          `10 Curated Accent Colors for ${isDark ? 'Dark Mode' : 'Light Mode'}`,
                          `10 Colores de Acento Curados para ${isDark ? 'Modo Oscuro' : 'Modo Claro'}`
                        )}
                      </h3>
                      <p className="text-[11px] font-mono text-text-dim">
                        {tr(
                          language,
                          'Klicke auf eine Farbe, um sie sofort auf Buttons, Kurven, Shader und Glass-Optiken anzuwenden.',
                          'Click a color to immediately apply it to buttons, curves, shaders, and glass optics.',
                          'Haz clic en un color para aplicarlo inmediatamente a botones, curvas, shaders y efectos de cristal.'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-bg-panel border border-border-dim text-[11px] font-mono text-text-bright shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: currentAccent.primary }}
                      />
                      <span>{tr(language, 'Aktiv: ', 'Active: ', 'Activo: ')}{currentAccent.name}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {accentList.map((accent) => {
                      const isSelected = accent.id === currentAccentId;
                      return (
                        <button
                          key={accent.id}
                          type="button"
                          onClick={() => handleSelectAccent(accent.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer group flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-brand-cyan/15 border-brand-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                              : 'bg-bg-base/70 hover:bg-bg-panel border-border-dim hover:border-brand-cyan/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <div
                              className="w-8 h-8 rounded-lg shadow-sm flex items-center justify-center shrink-0 border border-white/20"
                              style={{ background: accent.previewGradient }}
                            >
                              {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                            </div>

                            <span className="text-[10px] font-mono text-text-dim uppercase tracking-wider">
                              {accent.primary}
                            </span>
                          </div>

                          <div>
                            <div className="font-semibold text-xs text-text-bright group-hover:text-brand-cyan transition-colors truncate">
                              {accent.name}
                            </div>
                            <div className="text-[10px] text-text-dim line-clamp-2 mt-0.5 leading-snug">
                              {accent.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Live Preview Card */}
                <div className="sensual-glass-interactive rounded-xl p-5 border border-brand-cyan/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-text-dim">
                    <span className="text-brand-cyan font-bold uppercase tracking-wider">
                      {tr(language, 'Live-Vorschau der gewählten Akzentfarbe', 'Live Preview of Selected Accent Color', 'Vista Previa en Vivo del Color de Acento')}
                    </span>
                    <span>{currentAccent.name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-brand-cyan text-bg-base font-mono font-bold text-xs uppercase tracking-wider shadow-md"
                    >
                      {tr(language, 'Primärer Button', 'Primary Button', 'Botón Primario')}
                    </button>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/40 font-mono text-xs font-semibold"
                    >
                      {tr(language, 'Sekundärer Button', 'Secondary Button', 'Botón Secundario')}
                    </button>

                    <div className="px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-xs font-mono text-brand-cyan flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Akzent-Pill & Glow', 'Accent Pill & Glow', 'Píldora de Acento y Resplandor')}</span>
                    </div>

                    <div className="h-2 w-32 rounded-full overflow-hidden bg-bg-panel border border-border-dim">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: '75%',
                          backgroundColor: currentAccent.primary,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                TAB 2: WERTE & STANDARD-DYNAMIK
               =============================================================== */}
            {activeTab === 'defaults' && (
              <div className="space-y-6">
                <div className="sensual-glass rounded-xl p-5 border border-border-dim space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border-dim/40 pb-2.5">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-brand-cyan font-bold flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-brand-cyan" />
                      {tr(
                        language,
                        'Standard-Startparameter für Sessions & Einhand-Pad',
                        'Default Startup Parameters for Sessions & One-Handed Pad',
                        'Parámetros de Inicio Predeterminados para Sesiones y Pad Monomanual'
                      )}
                    </h3>
                    <span className="text-[11px] font-mono text-text-dim">
                      {tr(
                        language,
                        'Bestimmt, mit welchen Werten die Servok-Hardware startet',
                        'Determines the startup parameters of the Servok hardware',
                        'Determina con qué valores inicia el hardware Servok'
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* 1. Standard-Modus */}
                    <div className="bg-bg-base/70 border border-border-dim p-4 rounded-xl space-y-2.5">
                      <label className="text-xs font-mono text-text-bright font-bold block">
                        {tr(
                          language,
                          'Standard-Steuerungsmodus (BLE Register 0x01):',
                          'Default Control Mode (BLE Register 0x01):',
                          'Modo de Control Predeterminado (Registro BLE 0x01):'
                        )}
                      </label>
                      <p className="text-[11px] text-text-dim leading-relaxed">
                        {tr(
                          language,
                          'Legt fest, ob der Servok bei Start bevorzugt im Weg- oder Geschwindigkeitsmodus arbeitet.',
                          'Defines whether the Servok starts in position or speed mode.',
                          'Define si Servok opera preferentemente en modo de posición o velocidad al iniciar.'
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateDefaults({ controlMode: 'position' })}
                          className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            settings.defaults.controlMode === 'position'
                              ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-bold'
                              : 'bg-bg-panel border-border-dim text-text-dim hover:text-text-bright'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>0x02 Position</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateDefaults({ controlMode: 'speed' })}
                          className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            settings.defaults.controlMode === 'speed'
                              ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-bold'
                              : 'bg-bg-panel border-border-dim text-text-dim hover:text-text-bright'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>0x01 Speed</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Standard-Dynamik (Register 0x09) */}
                    <div className="bg-bg-base/70 border border-border-dim p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono text-text-bright font-bold">
                          {tr(
                            language,
                            'Umkehr-Sanftheit (Register 0x09):',
                            'Reversal Softness (Register 0x09):',
                            'Suavidad de Inversión (Registro 0x09):'
                          )}
                        </label>
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          {tr(language, 'Stufe', 'Level', 'Nivel')} {settings.defaults.smoothness} / 10
                        </span>
                      </div>
                      <p className="text-[11px] text-text-dim leading-relaxed">
                        {tr(
                          language,
                          'Höhere Werte bremsen den Schlitten vor den Umkehrpunkten sanft ab (flüsterleiser Betrieb).',
                          'Higher values gently decelerate the carriage at turning points for whisper-quiet motion.',
                          'Valores más altos deceleran suavemente el pistón antes de los puntos de inversión (operación ultra silenciosa).'
                        )}
                      </p>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={settings.defaults.smoothness}
                        onChange={(e) =>
                          handleUpdateDefaults({ smoothness: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-brand-cyan cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-text-dim">
                        <span>{tr(language, '1: Direkt / Straff', '1: Direct / Firm', '1: Directo / Firme')}</span>
                        <span>{tr(language, '5: Ausgewogen', '5: Balanced', '5: Equilibrado')}</span>
                        <span>{tr(language, '10: Maximal Samtig', '10: Maximum Velvet', '10: Máximo Aterciopelado')}</span>
                      </div>
                    </div>

                    {/* 3. Standard-Start-SPM */}
                    <div className="bg-bg-base/70 border border-border-dim p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono text-text-bright font-bold">
                          {tr(
                            language,
                            'Standard-Startgeschwindigkeit (SPM):',
                            'Default Startup Cadence (SPM):',
                            'Cadencia Inicial Predeterminada (SPM):'
                          )}
                        </label>
                        <span className="text-sm font-mono font-bold text-brand-cyan">
                          {settings.defaults.spm} SPM
                        </span>
                      </div>
                      <p className="text-[11px] text-text-dim leading-relaxed">
                        {tr(
                          language,
                          'Die Anfangs-Kadenz beim Laden oder Starten einer neuen Sitzung.',
                          'The initial cadence when loading or starting a session.',
                          'La cadencia inicial al cargar o iniciar una nueva sesión.'
                        )}
                      </p>
                      <input
                        type="range"
                        min="15"
                        max="240"
                        step="5"
                        value={settings.defaults.spm}
                        onChange={(e) =>
                          handleUpdateDefaults({ spm: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-brand-cyan cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-text-dim">
                        <span>{tr(language, '15 SPM (Zart)', '15 SPM (Gentle)', '15 SPM (Suave)')}</span>
                        <span>{tr(language, '80 SPM (Moderat)', '80 SPM (Moderate)', '80 SPM (Moderado)')}</span>
                        <span>{tr(language, '240 SPM (Intensiv)', '240 SPM (Intense)', '240 SPM (Intenso)')}</span>
                      </div>
                    </div>

                    {/* 4. Standard-Hubkorridor */}
                    <div className="bg-bg-base/70 border border-border-dim p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono text-text-bright font-bold">
                          {tr(language, 'Standard-Hubbereich:', 'Default Stroke Corridor:', 'Rango de Carrera Predeterminado:')}
                        </label>
                        <span className="text-xs font-mono text-text-bright">
                          {formatCm(settings.defaults.minDepthPct)} –{' '}
                          {formatCm(settings.defaults.maxDepthPct)}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-dim leading-relaxed">
                        {tr(
                          language,
                          'Standard-Bewegungskorridor zwischen minimaler und maximaler Hubtiefe.',
                          'Default motion corridor between minimum and maximum stroke depth.',
                          'Corredor de movimiento predeterminado entre la profundidad mínima y máxima.'
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="text-[10px] font-mono text-text-dim block mb-1">
                            Min: {settings.defaults.minDepthPct}% ({formatCm(settings.defaults.minDepthPct)})
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="60"
                            value={settings.defaults.minDepthPct}
                            onChange={(e) =>
                              handleUpdateDefaults({ minDepthPct: parseInt(e.target.value, 10) })
                            }
                            className="w-full accent-brand-cyan cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-text-dim block mb-1">
                            Max: {settings.defaults.maxDepthPct}% ({formatCm(settings.defaults.maxDepthPct)})
                          </span>
                          <input
                            type="range"
                            min="40"
                            max="100"
                            value={settings.defaults.maxDepthPct}
                            onChange={(e) =>
                              handleUpdateDefaults({ maxDepthPct: parseInt(e.target.value, 10) })
                            }
                            className="w-full accent-brand-cyan cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Toggles */}
                <div className="sensual-glass rounded-xl p-5 border border-border-dim space-y-3 font-mono text-xs">
                  <h4 className="text-text-bright font-bold uppercase tracking-wider">
                    {tr(
                      language,
                      'Sensorische Rückmeldung & Display-Verhalten',
                      'Sensory Feedback & Display Behavior',
                      'Retroalimentación Sensorial y Pantalla'
                    )}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const val = !settings.defaults.audioFeedback;
                        handleUpdateDefaults({ audioFeedback: val });
                        sensoryEngine.setMuted(!val);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        settings.defaults.audioFeedback
                          ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan'
                          : 'bg-bg-panel border-border-dim text-text-dim'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {settings.defaults.audioFeedback ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                        <span>{tr(language, 'Klick-Synthesizer', 'Click Synthesizer', 'Sintetizador de Clics')}</span>
                      </span>
                      <span>{settings.defaults.audioFeedback ? tr(language, 'AN', 'ON', 'ON') : tr(language, 'AUS', 'OFF', 'OFF')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const val = !settings.defaults.hapticsEnabled;
                        handleUpdateDefaults({ hapticsEnabled: val });
                        sensoryEngine.setHapticsEnabled(val);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        settings.defaults.hapticsEnabled
                          ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan'
                          : 'bg-bg-panel border-border-dim text-text-dim'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span>{tr(language, 'Mobil-Vibration', 'Haptic Vibration', 'Vibración Háptica')}</span>
                      </span>
                      <span>{settings.defaults.hapticsEnabled ? tr(language, 'AN', 'ON', 'ON') : tr(language, 'AUS', 'OFF', 'OFF')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const val = !settings.defaults.wakeLockAuto;
                        handleUpdateDefaults({ wakeLockAuto: val });
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        settings.defaults.wakeLockAuto
                          ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan'
                          : 'bg-bg-panel border-border-dim text-text-dim'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>{tr(language, 'Screen Wake Lock', 'Screen Wake Lock', 'Bloqueo de Suspensión')}</span>
                      </span>
                      <span>{settings.defaults.wakeLockAuto ? tr(language, 'AN', 'ON', 'ON') : tr(language, 'AUS', 'OFF', 'OFF')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                TAB 3: GERÄTE & BLUETOOTH AUTO-RECONNECT
               =============================================================== */}
            {activeTab === 'bluetooth' && (
              <div className="space-y-6">
                <div className="sensual-glass rounded-xl p-5 border border-border-dim space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border-dim/40 pb-2.5">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-brand-cyan font-bold flex items-center gap-1.5">
                        <Bluetooth className="w-4 h-4 text-brand-cyan" />
                        {tr(
                          language,
                          'Gekoppelte Bluetooth-Geräte & Auto-Connect',
                          'Paired Bluetooth Devices & Auto-Connect',
                          'Dispositivos Bluetooth Vinculados y Auto-Conexión'
                        )}
                      </h3>
                      <p className="text-[11px] font-mono text-text-dim">
                        {tr(
                          language,
                          'Hier hinterlegte Geräte werden beim App-Start automatisch gesucht und verbunden.',
                          'Stored devices are automatically searched and connected on application startup.',
                          'Los dispositivos guardados se buscarán y conectarán automáticamente al iniciar la app.'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const val = !settings.bluetooth.autoReconnect;
                          handleUpdateBluetooth({ autoReconnect: val });
                        }}
                        className={`px-3 py-1.5 rounded-full border text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                          settings.bluetooth.autoReconnect
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                            : 'bg-bg-panel text-text-dim border-border-dim'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            settings.bluetooth.autoReconnect ? 'bg-emerald-400' : 'bg-text-dim'
                          }`}
                        />
                        <span>
                          {tr(language, 'Auto-Connect: ', 'Auto-Connect: ', 'Auto-Conexión: ')}
                          {settings.bluetooth.autoReconnect
                            ? tr(language, 'Aktiv', 'Active', 'Activo')
                            : tr(language, 'Deaktiviert', 'Disabled', 'Desactivado')}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Device List */}
                  <div className="space-y-2.5">
                    {settings.bluetooth.pairedDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className="p-3.5 bg-bg-base/80 border border-border-dim hover:border-brand-cyan/40 rounded-xl flex items-center justify-between gap-3 font-mono text-xs transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan shrink-0">
                            <Bluetooth className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-text-bright text-sm truncate">{dev.name}</div>
                            <div className="text-[10px] text-text-dim flex items-center gap-2 flex-wrap">
                              <span>{tr(language, 'Gekoppelt: ', 'Paired: ', 'Vinculado: ')}{dev.pairedAt}</span>
                              {dev.lastConnected && (
                                <>
                                  <span className="text-border-bright">·</span>
                                  <span>{tr(language, 'Zuletzt aktiv: ', 'Last active: ', 'Última actividad: ')}{dev.lastConnected}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => settingsService.toggleDeviceAutoConnect(dev.id)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
                              dev.autoConnect
                                ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-semibold'
                                : 'bg-bg-panel border-border-dim text-text-dim'
                            }`}
                            title={tr(language, 'Auto-Connect für dieses Gerät umschalten', 'Toggle auto-connect for this device', 'Alternar auto-conexión para este dispositivo')}
                          >
                            {dev.autoConnect ? tr(language, '✓ Auto-Connect', '✓ Auto-Connect', '✓ Auto-Conexión') : tr(language, 'Manuell', 'Manual', 'Manual')}
                          </button>

                          <button
                            type="button"
                            onClick={() => settingsService.removePairedDevice(dev.id)}
                            className="p-1.5 rounded-lg bg-bg-panel hover:bg-rose-500/20 text-text-dim hover:text-rose-300 border border-border-dim hover:border-rose-500/40 transition-colors cursor-pointer"
                            title={tr(language, 'Kopplung entfernen', 'Remove paired device', 'Eliminar emparejamiento')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manual Pair Button */}
                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={async () => {
                        sensoryEngine.playClick(1.1);
                        const ok = await servokBle.connect();
                        if (ok && servokBle.deviceName) {
                          settingsService.addPairedDevice({
                            id: `dev-${Date.now()}`,
                            name: servokBle.deviceName,
                          });
                          triggerSaveNotice(
                            tr(
                              language,
                              `✓ ${servokBle.deviceName} als gekoppelt gespeichert`,
                              `✓ ${servokBle.deviceName} saved as paired`,
                              `✓ ${servokBle.deviceName} guardado como vinculado`
                            )
                          );
                        }
                      }}
                      className="px-4 py-2 bg-brand-cyan/15 hover:bg-brand-cyan text-brand-cyan hover:text-bg-base border border-brand-cyan/40 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Neues Bluetooth-Gerät koppeln', 'Pair New Bluetooth Device', 'Vincular Nuevo Dispositivo Bluetooth')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        servokBle.startSimulation();
                        triggerSaveNotice(
                          tr(language, 'Virtuelle Hardware aktiv', 'Virtual Hardware Active', 'Hardware Virtual Activo')
                        );
                      }}
                      className="px-4 py-2 bg-bg-base hover:bg-bg-panel text-text-dim hover:text-text-bright border border-border-dim rounded-xl text-xs font-mono transition-colors cursor-pointer"
                    >
                      {tr(language, 'Virtuellen Simulator starten', 'Launch Virtual Simulator', 'Iniciar Simulador Virtual')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                TAB 4: DATEI & PERSISTENZ (servok-settings.json)
               =============================================================== */}
            {activeTab === 'file' && (
              <div className="space-y-6">
                <div className="sensual-glass rounded-xl p-5 border border-border-dim space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-border-dim/40 pb-2.5">
                    <h3 className="text-xs uppercase tracking-wider text-brand-cyan font-bold flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-brand-cyan" />
                      {tr(
                        language,
                        'Lokale Datei-Synchronisation (servok-settings.json)',
                        'Local File Synchronization (servok-settings.json)',
                        'Sincronización Local de Archivo (servok-settings.json)'
                      )}
                    </h3>
                    <span className="text-[11px] text-text-dim">
                      {tr(language, 'Direkter Dateizugriff auf dem PC', 'Direct file access on PC', 'Acceso directo a archivos en PC')}
                    </span>
                  </div>

                  <p className="text-text-dim text-xs leading-relaxed font-sans">
                    {tr(
                      language,
                      'Wenn du die App lokal auf deinem PC ausführst (z. B. via Hismith_Servok_Studio.bat oder node start_local.js), werden alle Einstellungen automatisch in der Datei servok-settings.json im Programmordner abgelegt. Beim nächsten Start lädt die App genau diese Konfiguration.',
                      'When running the app locally on your PC (e.g. via Hismith_Servok_Studio.bat or node start_local.js), all settings are automatically saved in the servok-settings.json file in the application directory. On the next startup, the app restores this exact configuration.',
                      'Al ejecutar la aplicación localmente en tu PC (p. ej. mediante Hismith_Servok_Studio.bat o node start_local.js), todos los ajustes se guardan automáticamente en servok-settings.json en el directorio de la aplicación. En el siguiente inicio, la app restaura esta configuración exacta.'
                    )}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {/* Export */}
                    <button
                      type="button"
                      onClick={() => {
                        sensoryEngine.playClick(1.1);
                        settingsService.exportSettingsFile();
                        triggerSaveNotice(tr(language, 'Download gestartet', 'Download started', 'Descarga iniciada'));
                      }}
                      className="p-3 bg-bg-base hover:bg-brand-cyan/15 text-text-bright hover:text-brand-cyan border border-border-dim hover:border-brand-cyan/40 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-brand-cyan" />
                      <span>{tr(language, 'Als Datei herunterladen', 'Download as file', 'Descargar como archivo')}</span>
                    </button>

                    {/* Import */}
                    <label className="p-3 bg-bg-base hover:bg-brand-cyan/15 text-text-bright hover:text-brand-cyan border border-border-dim hover:border-brand-cyan/40 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4 text-brand-cyan" />
                      <span>{tr(language, 'Datei importieren (.json)', 'Import file (.json)', 'Importar archivo (.json)')}</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="hidden"
                      />
                    </label>

                    {/* Reset */}
                    <button
                      type="button"
                      onClick={() => {
                        const confirmMsg = tr(
                          language,
                          'Möchtest du alle Einstellungen auf die Standardwerte zurücksetzen?',
                          'Do you want to reset all settings to defaults?',
                          '¿Deseas restablecer todos los ajustes a los valores predeterminados?'
                        );
                        if (confirm(confirmMsg)) {
                          sensoryEngine.playClick(0.9);
                          settingsService.resetToDefaults();
                          triggerSaveNotice(
                            tr(
                              language,
                              '✓ Auf Standardwerte zurückgesetzt',
                              '✓ Reset to defaults',
                              '✓ Restablecido a valores predeterminados'
                            )
                          );
                        }
                      }}
                      className="p-3 bg-bg-base hover:bg-rose-500/15 text-text-dim hover:text-rose-300 border border-border-dim hover:border-rose-500/40 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{tr(language, 'Werkseinstellungen', 'Factory Reset', 'Ajustes de Fábrica')}</span>
                    </button>
                  </div>

                  {/* Inconspicuous Test & Developer Tools */}
                  <div className="pt-4 mt-2 border-t border-border-dim/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-text-dim/80 text-[11px] font-mono">
                        {tr(language, 'Entwickler- & Test-Werkzeuge', 'Developer & Testing Tools', 'Herramientas de Desarrollo y Prueba')}
                      </div>
                      <div className="text-[10px] text-text-dim/60 font-sans">
                        {tr(
                          language,
                          'Für Testzwecke & Web Bluetooth iframe-Isolation',
                          'For testing purposes & Web Bluetooth iframe isolation',
                          'Para pruebas y aislamiento de iframe de Web Bluetooth'
                        )}
                      </div>
                    </div>
                    <a
                      href={typeof window !== 'undefined' ? window.location.href : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-bg-base hover:bg-brand-cyan/15 border border-border-dim hover:border-brand-cyan/40 text-text-dim hover:text-brand-cyan transition-all rounded-lg cursor-pointer inline-flex items-center gap-1.5 font-mono text-[11px]"
                      title={tr(
                        language,
                        'App in separatem Browser-Tab öffnen (empfohlen für Web Bluetooth)',
                        'Open app in separate browser tab (recommended for Web Bluetooth)',
                        'Abrir app en pestaña separada del navegador (recomendado para Web Bluetooth)'
                      )}
                      id="open-new-tab-settings-btn"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>{tr(language, 'Im neuen Tab öffnen', 'Open in New Tab', 'Abrir en Nueva Pestaña')}</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-border-dim/60 bg-bg-panel/90 flex items-center justify-between gap-3 shrink-0 flex-wrap font-mono text-xs">
            <span className="text-text-dim flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{tr(language, 'Automatische Echtzeit-Sicherung aktiv', 'Automatic real-time sync active', 'Sincronización en tiempo real activa')}</span>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-brand-cyan text-bg-base hover:bg-brand-cyan/90 font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)] active:scale-[0.98]"
            >
              {tr(language, 'Fertig & Schließen', 'Done & Close', 'Listo y Cerrar')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
