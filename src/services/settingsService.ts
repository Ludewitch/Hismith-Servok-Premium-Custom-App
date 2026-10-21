/**
 * ============================================================================
 * HISMITH SERVOK PREMIUM H2 — SETTINGS & ACCENT COLOR ENGINE
 * ============================================================================
 * Handles persistent configuration:
 * 1. Design & Accent Colors (10 Darkmode + 10 Lightmode)
 * 2. Hardware Defaults (Dynamic Smoothness, SPM, Start Mode)
 * 3. Bluetooth Paired Devices & Auto-Reconnect
 * 4. Local File Persistence (servok-settings.json) & LocalStorage Fallback
 * ============================================================================
 */

export interface AccentColor {
  id: string;
  name: string;
  description: string;
  primary: string;   // brand-cyan / main accent
  secondary: string; // brand-rose
  tertiary: string;  // brand-orchid
  blush: string;     // brand-blush
  previewGradient: string;
}

export const DARK_ACCENTS: AccentColor[] = [
  {
    id: 'electric-cyan',
    name: 'Electric Cyan',
    description: 'Kinetisch, hypermodern & leuchtend',
    primary: '#00F0FF',
    secondary: '#FF55B8',
    tertiary: '#7928CA',
    blush: '#E0F7FA',
    previewGradient: 'linear-gradient(135deg, #00F0FF 0%, #7928CA 100%)',
  },
  {
    id: 'sensual-rose',
    name: 'Sensual Velvet Rose',
    description: 'Sinnlich, geschmeidig & warm-feminin',
    primary: '#E895A5',
    secondary: '#D96B82',
    tertiary: '#C88EB2',
    blush: '#FAE0E5',
    previewGradient: 'linear-gradient(135deg, #E895A5 0%, #D96B82 100%)',
  },
  {
    id: 'ultraviolet-neon',
    name: 'Ultraviolet Neon',
    description: 'Erotisch, intensiv & club-inspiriert',
    primary: '#A855F7',
    secondary: '#EC4899',
    tertiary: '#8B5CF6',
    blush: '#F3E8FF',
    previewGradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
  },
  {
    id: 'champagne-amber',
    name: 'Champagne Amber',
    description: 'Luxuriös, golden & warm-schmeichelnd',
    primary: '#F59E0B',
    secondary: '#FB923C',
    tertiary: '#FBBF24',
    blush: '#FEF3C7',
    previewGradient: 'linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)',
  },
  {
    id: 'emerald-silk',
    name: 'Emerald Silk',
    description: 'Beruhigend, organisch & samtig',
    primary: '#10B981',
    secondary: '#34D399',
    tertiary: '#059669',
    blush: '#D1FAE5',
    previewGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  },
  {
    id: 'crimson-passion',
    name: 'Crimson Passion',
    description: 'Feurig, kühn & ungezähmt',
    primary: '#FF0055',
    secondary: '#F43F5E',
    tertiary: '#E11D48',
    blush: '#FFE4E6',
    previewGradient: 'linear-gradient(135deg, #FF0055 0%, #9F1239 100%)',
  },
  {
    id: 'celestial-blue',
    name: 'Celestial Blue',
    description: 'Klar, kühl & raumgreifend',
    primary: '#38BDF8',
    secondary: '#818CF8',
    tertiary: '#60A5FA',
    blush: '#E0F2FE',
    previewGradient: 'linear-gradient(135deg, #38BDF8 0%, #6366F1 100%)',
  },
  {
    id: 'orchid-blush',
    name: 'Orchid Blush',
    description: 'Geschmeidig, zart & verführerisch',
    primary: '#E879F9',
    secondary: '#F472B6',
    tertiary: '#C084FC',
    blush: '#FDF4FF',
    previewGradient: 'linear-gradient(135deg, #E879F9 0%, #C084FC 100%)',
  },
  {
    id: 'cyber-lime',
    name: 'Cyber Lime',
    description: 'Elektrisierend, pulsierend & dynamisch',
    primary: '#84CC16',
    secondary: '#A3E635',
    tertiary: '#4ADE80',
    blush: '#ECFCCB',
    previewGradient: 'linear-gradient(135deg, #84CC16 0%, #22C55E 100%)',
  },
  {
    id: 'titanium-platinum',
    name: 'Titanium Platinum',
    description: 'Präzise, minimalistisch & edles Metall',
    primary: '#E2E8F0',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    blush: '#F8FAFC',
    previewGradient: 'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)',
  },
];

export const LIGHT_ACCENTS: AccentColor[] = [
  {
    id: 'royal-mulberry',
    name: 'Royal Mulberry',
    description: 'Tiefe Samtblüte, edel & erwachsen',
    primary: '#9C27B0',
    secondary: '#C2185B',
    tertiary: '#7B1FA2',
    blush: '#4A148C',
    previewGradient: 'linear-gradient(135deg, #9C27B0 0%, #C2185B 100%)',
  },
  {
    id: 'rose-terracotta',
    name: 'Rose Terracotta',
    description: 'Sanfte Puderrose, harmonisch warm',
    primary: '#B84A62',
    secondary: '#C95F76',
    tertiary: '#9C5678',
    blush: '#6E2537',
    previewGradient: 'linear-gradient(135deg, #B84A62 0%, #9C5678 100%)',
  },
  {
    id: 'sapphire-indigo',
    name: 'Sapphire Indigo',
    description: 'Kristallines Tiefblau, ruhig & elegant',
    primary: '#3F51B5',
    secondary: '#5C6BC0',
    tertiary: '#283593',
    blush: '#1A237E',
    previewGradient: 'linear-gradient(135deg, #3F51B5 0%, #283593 100%)',
  },
  {
    id: 'sunset-peach',
    name: 'Sunset Peach',
    description: 'Sanfter Pfirsichton, warm & leuchtend',
    primary: '#EA580C',
    secondary: '#F97316',
    tertiary: '#C2410C',
    blush: '#7C2D12',
    previewGradient: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
  },
  {
    id: 'imperial-jade',
    name: 'Imperial Jade',
    description: 'Köstlicher Jadestein, frisch & lebendig',
    primary: '#059669',
    secondary: '#10B981',
    tertiary: '#047857',
    blush: '#064E3B',
    previewGradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
  },
  {
    id: 'golden-honey',
    name: 'Golden Honey',
    description: 'Reicher Bernstein, warm & genussvoll',
    primary: '#D97706',
    secondary: '#B45309',
    tertiary: '#92400E',
    blush: '#78350F',
    previewGradient: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
  },
  {
    id: 'lavender-iris',
    name: 'Lavender Iris',
    description: 'Zarte Wisterie, verträumt & fein',
    primary: '#7C3AED',
    secondary: '#8B5CF6',
    tertiary: '#6D28D9',
    blush: '#4C1D95',
    previewGradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
  },
  {
    id: 'ruby-coral',
    name: 'Ruby Coral',
    description: 'Lebendiges Karmesin, warm & leidenschaftlich',
    primary: '#E11D48',
    secondary: '#BE123C',
    tertiary: '#9F1239',
    blush: '#881337',
    previewGradient: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
  },
  {
    id: 'teal-laguna',
    name: 'Teal Laguna',
    description: 'Mediterrane Lagune, tief & reinigend',
    primary: '#0D9488',
    secondary: '#14B8A6',
    tertiary: '#0F766E',
    blush: '#134E4A',
    previewGradient: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
  },
  {
    id: 'espresso-bronze',
    name: 'Espresso Bronze',
    description: 'Erdige Eleganz, gediegen & markant',
    primary: '#78350F',
    secondary: '#92400E',
    tertiary: '#57534E',
    blush: '#292524',
    previewGradient: 'linear-gradient(135deg, #78350F 0%, #57534E 100%)',
  },
];

export interface PairedDevice {
  id: string;
  name: string;
  pairedAt: string;
  lastConnected?: string;
  autoConnect: boolean;
}

export interface AppSettings {
  version: number;
  theme: {
    luminance: 'dark' | 'light';
    temperature: 'warm' | 'cold';
    darkAccentId: string;
    lightAccentId: string;
  };
  defaults: {
    controlMode: 'position' | 'speed';
    smoothness: number; // 1..10 (Register 0x09)
    spm: number;        // Startgeschwindigkeit Kadenz
    minDepthPct: number;
    maxDepthPct: number;
    audioFeedback: boolean;
    hapticsEnabled: boolean;
    wakeLockAuto: boolean;
  };
  bluetooth: {
    autoReconnect: boolean;
    pairedDevices: PairedDevice[];
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: 2,
  theme: {
    luminance: 'dark',
    temperature: 'warm',
    darkAccentId: 'sensual-rose',
    lightAccentId: 'rose-terracotta',
  },
  defaults: {
    controlMode: 'position',
    smoothness: 8, // Sanfte Richtungswechsel (Register 0x09)
    spm: 45,       // Sinnlich sanfter Start
    minDepthPct: 15,
    maxDepthPct: 85,
    audioFeedback: true,
    hapticsEnabled: true,
    wakeLockAuto: true,
  },
  bluetooth: {
    autoReconnect: true,
    pairedDevices: [
      {
        id: 'servok-h2-default',
        name: 'Hismith Servok Premium H2',
        pairedAt: 'Standard-Kopplung',
        autoConnect: true,
      },
    ],
  },
};

const STORAGE_KEY = 'hismith_servok_settings_v2';

class SettingsService {
  private currentSettings: AppSettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<(s: AppSettings) => void> = new Set();
  private isLoaded: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Instant load from localStorage
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        this.currentSettings = this.mergeWithDefaults(JSON.parse(local));
      }
    } catch {
      // Ignore localStorage read errors
    }

    // 2. Fetch from local server file /api/settings if available
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'ok' && json.settings) {
          this.currentSettings = this.mergeWithDefaults(json.settings);
          // Sync to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
        }
      }
    } catch {
      // Server not reachable (offline/remote preview), fallback to localStorage is active
    }

    this.isLoaded = true;
    this.applyCurrentDesign();
    this.notify();
  }

  private mergeWithDefaults(partial: any): AppSettings {
    return {
      version: 2,
      theme: {
        ...DEFAULT_SETTINGS.theme,
        ...(partial.theme || {}),
      },
      defaults: {
        ...DEFAULT_SETTINGS.defaults,
        ...(partial.defaults || {}),
      },
      bluetooth: {
        ...DEFAULT_SETTINGS.bluetooth,
        ...(partial.bluetooth || {}),
        pairedDevices: Array.isArray(partial.bluetooth?.pairedDevices)
          ? partial.bluetooth.pairedDevices
          : DEFAULT_SETTINGS.bluetooth.pairedDevices,
      },
    };
  }

  public getSettings(): AppSettings {
    return { ...this.currentSettings };
  }

  public subscribe(cb: (s: AppSettings) => void): () => void {
    this.listeners.add(cb);
    if (this.isLoaded) {
      cb({ ...this.currentSettings });
    }
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const copy = { ...this.currentSettings };
    this.listeners.forEach((fn) => fn(copy));
    window.dispatchEvent(new CustomEvent('servok-settings-updated', { detail: copy }));
  }

  public async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    this.currentSettings = {
      ...this.currentSettings,
      ...updates,
      theme: {
        ...this.currentSettings.theme,
        ...(updates.theme || {}),
      },
      defaults: {
        ...this.currentSettings.defaults,
        ...(updates.defaults || {}),
      },
      bluetooth: {
        ...this.currentSettings.bluetooth,
        ...(updates.bluetooth || {}),
      },
    };

    // Save to localStorage immediately
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
    } catch {}

    // Save to server-side local file /api/settings
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.currentSettings),
      });
    } catch {
      // Offline/preview environment
    }

    this.applyCurrentDesign();
    this.notify();
    return { ...this.currentSettings };
  }

  /**
   * Applies the selected accent color to CSS root variables dynamically
   */
  public applyCurrentDesign() {
    if (typeof document === 'undefined') return;

    const { luminance, darkAccentId, lightAccentId } = this.currentSettings.theme;
    const isDark = luminance === 'dark';
    const accentList = isDark ? DARK_ACCENTS : LIGHT_ACCENTS;
    const currentAccentId = isDark ? darkAccentId : lightAccentId;

    const accent =
      accentList.find((a) => a.id === currentAccentId) ||
      (isDark ? DARK_ACCENTS[0] : LIGHT_ACCENTS[0]);

    const root = document.documentElement;

    // Apply primary brand accents
    root.style.setProperty('--brand-cyan', accent.primary);
    root.style.setProperty('--brand-rose', accent.secondary);
    root.style.setProperty('--brand-orchid', accent.tertiary);
    root.style.setProperty('--brand-blush', accent.blush);
    root.style.setProperty('--shader-a', accent.primary);
    root.style.setProperty('--shader-b', accent.secondary);
    root.style.setProperty('--shader-c', accent.tertiary);

    // Accent glass border
    root.style.setProperty(
      '--glass-border',
      isDark ? `${accent.primary}38` : `${accent.primary}33`
    );
  }

  /**
   * Bluetooth Paired Device Helper
   */
  public addPairedDevice(device: { id: string; name: string }): void {
    const list = [...this.currentSettings.bluetooth.pairedDevices];
    const existing = list.findIndex((d) => d.id === device.id || d.name === device.name);
    const now = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (existing !== -1) {
      list[existing] = {
        ...list[existing],
        name: device.name || list[existing].name,
        lastConnected: now,
      };
    } else {
      list.push({
        id: device.id || `dev-${Date.now()}`,
        name: device.name || 'Hismith Servok Gerät',
        pairedAt: now,
        lastConnected: now,
        autoConnect: true,
      });
    }

    this.updateSettings({
      bluetooth: {
        ...this.currentSettings.bluetooth,
        pairedDevices: list,
      },
    });
  }

  public removePairedDevice(deviceId: string): void {
    const list = this.currentSettings.bluetooth.pairedDevices.filter((d) => d.id !== deviceId);
    this.updateSettings({
      bluetooth: {
        ...this.currentSettings.bluetooth,
        pairedDevices: list,
      },
    });
  }

  public toggleDeviceAutoConnect(deviceId: string): void {
    const list = this.currentSettings.bluetooth.pairedDevices.map((d) =>
      d.id === deviceId ? { ...d, autoConnect: !d.autoConnect } : d
    );
    this.updateSettings({
      bluetooth: {
        ...this.currentSettings.bluetooth,
        pairedDevices: list,
      },
    });
  }

  /**
   * Export settings as JSON download
   */
  public exportSettingsFile(): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.currentSettings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'servok-settings.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * Import settings from JSON string
   */
  public importSettingsFile(jsonContent: string): boolean {
    try {
      const parsed = JSON.parse(jsonContent);
      const merged = this.mergeWithDefaults(parsed);
      this.updateSettings(merged);
      return true;
    } catch {
      return false;
    }
  }

  public resetToDefaults(): void {
    this.updateSettings(DEFAULT_SETTINGS);
  }
}

export const settingsService = new SettingsService();
