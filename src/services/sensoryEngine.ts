/**
 * ============================================================================
 * HISMITH SERVOK PREMIUM H2 — IMMERSIVE SENSORY, RHYTHMIC AUDIO & HAPTIC ENGINE
 * ============================================================================
 * 1. Procedural Web Audio Synthesizer (Silk & Crystal Glass + Tactile Mechatronics)
 * 2. Immersive Rhythmic Session Synthesizer (Cadence/SPM Stroke Synthesis + Ambient Bed)
 * 3. Fluid Liquid Droplet Synthesis for Lubrication Triggers
 * 4. Multi-Stage Haptic Feedback (Vibration API)
 * 5. Screen Wake Lock Persistence (Prevent screen dimming during active sessions)
 * ============================================================================
 */

export interface SessionAudioParams {
  spm: number;
  minDepth: number;
  maxDepth: number;
  hardness: number;
}

type SensoryListener = (muted: boolean) => void;

class SensoryEngine {
  private audioCtx: AudioContext | null = null;
  private _isMuted: boolean = false;
  private _hapticsEnabled: boolean = true;
  private _wakeLockActive: boolean = false;
  private wakeLockSentinel: any = null;
  private shouldHoldWakeLock: boolean = false;
  private lastTickTime: number = 0;
  private lastHarmonicTime: number = 0;
  private listeners: Set<SensoryListener> = new Set();

  // Immersive Rhythmic Session Playback State
  private sessionActive: boolean = false;
  private sessionParams: SessionAudioParams = {
    spm: 60,
    minDepth: 20,
    maxDepth: 80,
    hardness: 50,
  };
  private sessionTimerId: number | null = null;
  private sessionDroneGain: GainNode | null = null;
  private sessionDroneOsc1: OscillatorNode | null = null;
  private sessionDroneOsc2: OscillatorNode | null = null;
  private sessionDroneFilter: BiquadFilterNode | null = null;
  private sessionStrokePhase: 'in' | 'out' = 'in';

  constructor() {
    try {
      const savedMute = localStorage.getItem('servok_audio_muted');
      if (savedMute !== null) {
        this._isMuted = savedMute === 'true';
      }
      const savedHaptics = localStorage.getItem('servok_haptics_enabled');
      if (savedHaptics !== null) {
        this._hapticsEnabled = savedHaptics !== 'false';
      }
    } catch {
      // Ignore storage errors
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.shouldHoldWakeLock) {
          this.acquireWakeLockInternal();
        }
      });
    }
  }

  public subscribe(listener: SensoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this._isMuted));
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public getMuted(): boolean {
    return this._isMuted;
  }

  public get hapticsEnabled(): boolean {
    return this._hapticsEnabled;
  }

  public get isWakeLockActive(): boolean {
    return this._wakeLockActive;
  }

  public hapticPresetChange() {
    this.hapticPresetSwitch();
  }

  public syncWakeLock(active: boolean) {
    this.setSessionWakeLock(active);
  }

  public toggleMute(): boolean {
    return this.setMuted(!this._isMuted);
  }

  public setMuted(muted: boolean): boolean {
    this._isMuted = muted;
    try {
      localStorage.setItem('servok_audio_muted', String(this._isMuted));
    } catch {}
    if (this._isMuted) {
      this.stopSessionRhythm();
    } else {
      this.playGlassTouch(1.1);
    }
    this.notify();
    return this._isMuted;
  }

  public toggleHaptics(): boolean {
    return this.setHapticsEnabled(!this._hapticsEnabled);
  }

  public setHapticsEnabled(enabled: boolean): boolean {
    this._hapticsEnabled = enabled;
    try {
      localStorage.setItem('servok_haptics_enabled', String(this._hapticsEnabled));
    } catch {}
    if (this._hapticsEnabled) {
      this.hapticIncrement();
    }
    this.notify();
    return this._hapticsEnabled;
  }

  private ensureAudioContext(): AudioContext | null {
    if (this._isMuted || typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // ==========================================================================
  // 1. REFINED INTERACTION & BUTTON SOUNDS (CRYSTAL GLASS, TACTILE & LIQUID)
  // ==========================================================================

  /**
   * Kristalliner, seidig-eleganter Glass-Touch für Buttons, Tabs & Menüpunkte
   * Kein dumpfer Klick, sondern ein glockenklares, feines Feedback wie bei B&O / Teenage Engineering.
   */
  public playGlassTouch(pitch: number = 1.0) {
    const nowMs = performance.now();
    if (nowMs - this.lastTickTime < 24) return;
    this.lastTickTime = nowMs;

    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Primärer Glas-Oberton
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const baseHz = Math.max(600, Math.min(3200, 1480 * pitch));
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseHz, now);
      osc1.frequency.exponentialRampToValueAtTime(baseHz * 0.85, now + 0.05);

      // Harmonische Quinte / Glanz
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseHz * 1.5, now);
      osc2.frequency.exponentialRampToValueAtTime(baseHz * 1.2, now + 0.035);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseHz * 1.1, now);
      filter.Q.setValueAtTime(3.2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.065);
      osc2.stop(now + 0.065);
    } catch {}
  }

  /**
   * Universeller Klick für bestehende Aufrufe – jetzt transparent, melodisch und dynamisch variiert!
   * Schluss mit dem dumpfen Thud: Jetzt ein spritziger, luxuriöser Mikroklick mit feinem Obertonglanz.
   */
  public playClick(pitchMultiplier: number = 1.0, variant: 'crystal' | 'tactile' | 'soft' | 'bubble' = 'crystal') {
    const nowMs = performance.now();
    if (nowMs - this.lastTickTime < 18) return;
    this.lastTickTime = nowMs;

    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const clickOsc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      if (variant === 'tactile') {
        // Haptischer Schalter-Klick mit leichtem Magnet-Schnappen
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(1800 * pitchMultiplier, now);
        clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.015);

        osc.type = 'sine';
        const bodyHz = Math.max(160, Math.min(680, 360 * pitchMultiplier));
        osc.frequency.setValueAtTime(bodyHz, now);
        osc.frequency.exponentialRampToValueAtTime(bodyHz * 0.5, now + 0.035);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      } else if (variant === 'bubble') {
        // Feine perlende Blase
        osc.type = 'sine';
        const bubbleHz = 520 * pitchMultiplier;
        osc.frequency.setValueAtTime(bubbleHz, now);
        osc.frequency.exponentialRampToValueAtTime(bubbleHz * 1.8, now + 0.03);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.055);
        return;
      } else {
        // Kristalliner, seidiger Touch (Standard)
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(2800 * pitchMultiplier, now);
        clickOsc.frequency.exponentialRampToValueAtTime(650, now + 0.014);

        osc.type = 'triangle';
        const bodyHz = Math.max(220, Math.min(840, 480 * pitchMultiplier));
        osc.frequency.setValueAtTime(bodyHz, now);
        osc.frequency.exponentialRampToValueAtTime(bodyHz * 0.8, now + 0.028);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.setValueAtTime(1.8, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.095, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      }

      clickOsc.connect(filter);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      clickOsc.start(now);
      osc.start(now);
      clickOsc.stop(now + 0.018);
      osc.stop(now + 0.04);
    } catch {}
  }

  /**
   * Harmonischer Spur-Umschalt-Klang (spezifisch für die 4 Spuren)
   * Spur 1 (Min / Cyan): 1320 Hz Crystalline Tone
   * Spur 2 (Max / Rose): 880 Hz Velvet Tone
   * Spur 3 (SPM / Emerald): 1056 Hz Buoyant Chime
   * Spur 4 (Härte / Amber): 704 Hz Solid Resonance
   */
  public playLayerSwitch(layer: 'minDepth' | 'maxDepth' | 'spm' | 'hardness') {
    this.hapticPresetSwitch();
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const layerFreqs: Record<string, { f1: number; f2: number; type: OscillatorType }> = {
        minDepth: { f1: 1320, f2: 1980, type: 'sine' },      // Cyan
        maxDepth: { f1: 880, f2: 1320, type: 'triangle' },   // Rose
        spm: { f1: 1056, f2: 1584, type: 'sine' },          // Emerald
        hardness: { f1: 704, f2: 1056, type: 'triangle' },   // Amber
      };

      const cfg = layerFreqs[layer] || layerFreqs.minDepth;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = cfg.type;
      osc1.frequency.setValueAtTime(cfg.f1, now);
      osc1.frequency.exponentialRampToValueAtTime(cfg.f1 * 0.95, now + 0.07);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(cfg.f2, now);
      osc2.frequency.exponentialRampToValueAtTime(cfg.f2 * 0.9, now + 0.05);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.085);
      osc2.stop(now + 0.085);
    } catch {}
  }

  /**
   * Harmonisches Feedback bei Bearbeitung von Wegpunkten im Editor
   */
  public playWaypointAction(action: 'add' | 'delete' | 'drag' | 'select', posPct: number = 50) {
    if (action === 'delete') {
      this.playTactileClick('secondary');
      return;
    }
    const freq = 440 + (posPct / 100) * 880; // Tonhöhe spiegelt Hub/Wert wider
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = action === 'add' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      if (action === 'add') {
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.04);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(action === 'add' ? 0.09 : 0.05, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (action === 'add' ? 0.07 : 0.035));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    } catch {}
  }

  /**
   * Taktiler Klick für primäre Aktionen (z. B. Start, Modus-Wechsel, Presets laden)
   */
  public playTactileClick(variant: 'primary' | 'secondary' | 'delicate' = 'primary') {
    if (variant === 'delicate') {
      this.playGlassTouch(1.15);
      return;
    }

    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const sub = ctx.createOscillator();
      const trans = ctx.createOscillator();
      const gain = ctx.createGain();

      const isPrim = variant === 'primary';
      sub.type = 'sine';
      sub.frequency.setValueAtTime(isPrim ? 220 : 280, now);
      sub.frequency.exponentialRampToValueAtTime(90, now + 0.04);

      trans.type = 'triangle';
      trans.frequency.setValueAtTime(isPrim ? 2200 : 2800, now);
      trans.frequency.exponentialRampToValueAtTime(450, now + 0.018);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isPrim ? 0.12 : 0.07, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      sub.connect(gain);
      trans.connect(gain);
      gain.connect(ctx.destination);

      sub.start(now);
      trans.start(now);
      sub.stop(now + 0.05);
      trans.stop(now + 0.05);
    } catch {}
  }

  /**
   * Akustischer Schalter für Toggles (Ein/Aus) mit melodischem 2-Ton-Intervall
   */
  public playToggle(active: boolean) {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const f1 = active ? 659.25 : 880.0; // E5 -> A5 bei ON, A5 -> E5 bei OFF
      const f2 = active ? 880.0 : 659.25;

      [
        { f: f1, t: now },
        { f: f2, t: now + 0.035 },
      ].forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.055);
      });
    } catch {}
  }

  /**
   * Seidiger Gleit-Tick für Schieberegler (Slider)
   */
  public playSliderTick(ratio: number = 0.5) {
    const nowMs = performance.now();
    if (nowMs - this.lastTickTime < 16) return;
    this.lastTickTime = nowMs;

    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const freq = 420 + ratio * 480;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + 0.015);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch {}
  }

  /**
   * Authentischer, flüssiger Wassertropfen- / Gleitmittel-Impuls ("Bloop")
   * Fällt auf und steigt glockig an, passend zur automatisierten Lube-Pumpe.
   */
  public playLubeDroplet() {
    this.hapticPresetSwitch();
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Resonanter Tropfen-Sweep nach oben (Wasser-Blase)
      const osc = ctx.createOscillator();
      const subDrop = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(1420, now + 0.045);
      osc.frequency.exponentialRampToValueAtTime(1150, now + 0.09);

      subDrop.type = 'sine';
      subDrop.frequency.setValueAtTime(320, now);
      subDrop.frequency.exponentialRampToValueAtTime(180, now + 0.07);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      osc.connect(filter);
      subDrop.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      subDrop.start(now);
      osc.stop(now + 0.12);
      subDrop.stop(now + 0.12);
    } catch {}
  }

  // ==========================================================================
  // 2. DAS IMMERSIVE RHYTHMISCHE SESSION-AUDIOERLEBNIS (SYNCHRON ZUM SPM-TEMPO)
  // ==========================================================================

  /**
   * Startet die synchrone, rhythmische Audio-Synthese für aktive Sessions.
   * Generiert ein immersives, audiophiles 3-Schichten-Klangbild:
   * 1. Rhythmischer Aktuator-Schub & Gleit-Atem (Thrust 'in' & Glide 'out')
   * 2. Präziser, taktiler Kadenztakt / Herzschlag synchron zur echten SPM-Frequenz
   * 3. Warmer, atmender 432Hz Ambient-Klangteppich, der im Takt mitschwingt
   */
  public startSessionRhythm(initialParams?: Partial<SessionAudioParams>) {
    if (this._isMuted) return;
    if (initialParams) {
      this.sessionParams = { ...this.sessionParams, ...initialParams };
    }

    this.sessionActive = true;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    this.startAmbientDrone(ctx);
    this.scheduleNextStroke();
  }

  /**
   * Aktualisiert SPM, Tiefe und Härte in Echtzeit während der Wiedergabe
   */
  public updateSessionParams(
    spm: number,
    minDepth: number = 20,
    maxDepth: number = 80,
    hardness: number = 50
  ) {
    this.sessionParams = {
      spm: Math.max(15, Math.min(360, spm || 60)),
      minDepth: Math.max(0, Math.min(100, minDepth)),
      maxDepth: Math.max(0, Math.min(100, maxDepth)),
      hardness: Math.max(0, Math.min(100, hardness)),
    };

    // Filter des Ambient-Pads dynamisch mit der Frequenz & Härte anpassen (ohne Deckelung bei halbem Tempo)
    if (this.sessionDroneFilter && this.audioCtx) {
      const targetCutoff = 260 + (this.sessionParams.spm / 320) * 560 + (this.sessionParams.hardness / 100) * 160;
      this.sessionDroneFilter.frequency.setTargetAtTime(targetCutoff, this.audioCtx.currentTime, 0.08);
    }
  }

  /**
   * Beendet das rhythmische Session-Audio und blendet das Ambient-Pad weich aus
   */
  public stopSessionRhythm() {
    this.sessionActive = false;
    if (this.sessionTimerId !== null) {
      window.clearTimeout(this.sessionTimerId);
      this.sessionTimerId = null;
    }
    this.stopAmbientDrone();
  }

  /**
   * Startet das warme, harmonische Ambient-Pad im Hintergrund (432Hz Stimmung)
   */
  private startAmbientDrone(ctx: AudioContext) {
    if (this.sessionDroneGain) return; // Läuft bereits

    try {
      const now = ctx.currentTime;
      const droneGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      // D2 / A2 harmonische Quinte auf 432 Hz Basis (72 Hz & 108 Hz)
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(108.0, now); // A2

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(162.0, now); // E3 Quinte

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(1.8, now);

      droneGain.gain.setValueAtTime(0.0001, now);
      droneGain.gain.linearRampToValueAtTime(0.055, now + 0.8); // Wohlig warme, hörbare Tiefe

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);

      this.sessionDroneGain = droneGain;
      this.sessionDroneOsc1 = osc1;
      this.sessionDroneOsc2 = osc2;
      this.sessionDroneFilter = filter;
    } catch {}
  }

  private stopAmbientDrone() {
    if (!this.sessionDroneGain || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      this.sessionDroneGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      const osc1 = this.sessionDroneOsc1;
      const osc2 = this.sessionDroneOsc2;
      setTimeout(() => {
        try {
          osc1?.stop();
          osc2?.stop();
          osc1?.disconnect();
          osc2?.disconnect();
        } catch {}
      }, 400);
    } catch {}

    this.sessionDroneGain = null;
    this.sessionDroneOsc1 = null;
    this.sessionDroneOsc2 = null;
    this.sessionDroneFilter = null;
  }

  /**
   * Plant den nächsten Hub-Impuls basierend auf dem aktuellen SPM-Tempo
   */
  private scheduleNextStroke() {
    if (!this.sessionActive || this._isMuted) return;

    const spm = Math.max(15, Math.min(360, this.sessionParams.spm));
    const cycleMs = (60 / spm) * 1000;
    // Halber Zyklus: Vorschub vs. Rückschub (z. B. 60 SPM = 500ms je Halbphase)
    const halfCycleMs = Math.max(60, cycleMs / 2);

    this.playStrokeImpulse();

    this.sessionTimerId = window.setTimeout(() => {
      this.sessionStrokePhase = this.sessionStrokePhase === 'in' ? 'out' : 'in';
      this.scheduleNextStroke();
    }, halfCycleMs);
  }

  /**
   * Erzeugt den organischen, audiophilen Aktuator-Hubklang:
   * 'in'  = Vorschub / Penetration: Runder, wärmender Tieftonschub + pneumatischer Luftstrom + klarer Rhythmus-Impuls
   * 'out' = Rückschub / Gleiten: Weiches, seidiges Ausgleiten mit sanfter Resonanz
   */
  public playStrokeImpulse() {
    if (this._isMuted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const { spm, minDepth, maxDepth, hardness } = this.sessionParams;
      const isIn = this.sessionStrokePhase === 'in';

      const strokeSpan = Math.max(10, maxDepth - minDepth) / 100; // 0.1 bis 1.0
      // Kontinuierliche Tonhöhen-Skalierung über den vollen Bereich ohne vorzeitiges Limit bei 200 SPM:
      const tempoRatio = Math.max(0, Math.min(1.5, spm / 240));

      if (isIn) {
        // ==========================================
        // 1. VORSCHUB (THRUST / PENETRATION)
        // ==========================================

        // a) Runder, satter Körper (steigt dynamisch und kontinuierlich mit höherem SPM)
        const oscBody = ctx.createOscillator();
        const baseHz = 110 + tempoRatio * 105 + (1 - strokeSpan) * 25;
        oscBody.type = 'sine';
        oscBody.frequency.setValueAtTime(baseHz * 1.45, now);
        oscBody.frequency.exponentialRampToValueAtTime(baseHz, now + 0.09);

        // b) Seidiger pneumatischer Luftstrom (gefilterte Oberwellen)
        const airOsc = ctx.createOscillator();
        airOsc.type = 'triangle';
        airOsc.frequency.setValueAtTime(baseHz * 2.8, now);
        airOsc.frequency.exponentialRampToValueAtTime(baseHz * 1.6, now + 0.11);

        // c) Taktiler Rhythmus-Transient (sanft federnder Percussion-Impuls im Takt, skaliert bis in hohe Kadenzen)
        const snapOsc = ctx.createOscillator();
        snapOsc.type = 'sine';
        snapOsc.frequency.setValueAtTime(640 + tempoRatio * 520, now);
        snapOsc.frequency.exponentialRampToValueAtTime(210 + tempoRatio * 90, now + 0.02);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const cutoff = 320 + (hardness / 100) * 380 + strokeSpan * 200 + tempoRatio * 180;
        filter.frequency.setValueAtTime(cutoff, now);
        filter.Q.setValueAtTime(1.4 + tempoRatio * 0.4, now);

        const gain = ctx.createGain();
        const snapGain = ctx.createGain();
        const dur = Math.max(0.075, Math.min(0.28, 0.22 / (tempoRatio * 0.6 + 0.4)));
        const targetGain = 0.16 + strokeSpan * 0.08 + (hardness / 100) * 0.05;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(targetGain, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        snapGain.gain.setValueAtTime(0.0001, now);
        snapGain.gain.linearRampToValueAtTime(0.075 + (hardness / 100) * 0.04, now + 0.002);
        snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

        oscBody.connect(filter);
        airOsc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        snapOsc.connect(snapGain);
        snapGain.connect(ctx.destination);

        oscBody.start(now);
        airOsc.start(now);
        snapOsc.start(now);

        oscBody.stop(now + dur + 0.02);
        airOsc.stop(now + dur + 0.02);
        snapOsc.stop(now + 0.035);

        // Sanfte mobile Haptik im Takt
        if (this._hapticsEnabled && spm <= 150) {
          try {
            navigator.vibrate?.(8);
          } catch {}
        }
      } else {
        // ==========================================
        // 2. RÜCKSCHUB (GLIDE / RETRACTION)
        // ==========================================
        const oscGlide = ctx.createOscillator();
        const baseHz = 135 + tempoRatio * 115;
        oscGlide.type = 'triangle';
        oscGlide.frequency.setValueAtTime(baseHz, now);
        oscGlide.frequency.exponentialRampToValueAtTime(baseHz * 0.85, now + 0.08);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(baseHz * 1.8, now);
        filter.Q.setValueAtTime(1.8, now);

        const gain = ctx.createGain();
        const dur = Math.max(0.065, Math.min(0.24, 0.18 / (tempoRatio * 0.6 + 0.4)));
        const targetGain = 0.09 + strokeSpan * 0.05;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(targetGain, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        oscGlide.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        oscGlide.start(now);
        oscGlide.stop(now + dur + 0.02);
      }
    } catch {}
  }

  // ==========================================================================
  // 3. BESTEHENDE EVENTS & SIGNALKLÄNGE (SUB-BASS DROP, CHIMES, KILL-SWITCH)
  // ==========================================================================

  /**
   * Harmonischer Oberton bei Geschwindigkeits- & SPM-Änderungen.
   * Kontinuierliche exponentielle Frequenzvariation (Tonhöhenanstieg) über das
   * gesamte Spektrum (0-100% bzw. 15-360+ SPM), ohne vorzeitiges Abflachen oder
   * Deckelung auf halber Strecke. Erzeugt ein mitreißendes, immersives
   * Beschleunigungserlebnis mit seidigen Obertönen und dynamischem Filter-Tracking.
   *
   * @param spmOrSpeed SPM-Wert (z. B. 15..360) oder Prozentwert (0..100)
   * @param maxSpm Referenz-Maximum (Standard: 100 bei % bzw. 300 bei SPM).
   *               Sicherheits-Guard: Falls versehentlich eine Y-Koordinate (z. B. padY = 50)
   *               übergeben wurde, wird nicht vorzeitig bei 50% gedeckelt.
   * @param turboMultiplier Optionaler Turbo-Multiplikator (z. B. 1.0x bis 2.0x)
   */
  /**
   * Harmonischer Oberton bei Geschwindigkeits- & SPM-Änderungen.
   * Kontinuierliche, musikalisch-exponentielle Tonhöhen-Progression über das
   * gesamte Spektrum (0-100% bzw. 12-360 SPM) bis hinein in die 2.0x Turbostufen.
   * Verhindert das frühere Abflachen auf halber Strecke: Jede SPM-Erhöhung führt
   * zu einem klaren, lebendigen und immersiven Anstieg der Audiofrequenz!
   *
   * @param spmOrSpeed SPM-Wert (z. B. 12..360) oder Prozentwert (0..100)
   * @param maxSpm Referenz-Maximum (Standard: 100 bei % bzw. 240+ bei SPM)
   * @param turboMultiplier Optionaler Turbo-Multiplikator (z. B. 1.0x bis 2.0x)
   */
  public playSpeedHarmonic(spmOrSpeed: number, maxSpm: number = 100, turboMultiplier: number = 1.0) {
    const nowMs = performance.now();
    if (nowMs - this.lastHarmonicTime < 24) return;
    this.lastHarmonicTime = nowMs;

    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Sichere Normalisierung des Geschwindigkeits-Verhältnisses (0.0 bis 1.0)
      let normRatio: number;
      if (spmOrSpeed <= 100) {
        // Prozentangabe (0..100%)
        const effectiveMax = maxSpm >= 100 ? maxSpm : 100;
        normRatio = Math.max(0, Math.min(1.0, spmOrSpeed / effectiveMax));
      } else {
        // Echter SPM-Wert (z. B. 12..360 SPM)
        const minSpm = 12;
        const maxRef = Math.max(200, maxSpm);
        normRatio = Math.max(0, Math.min(1.0, (spmOrSpeed - minSpm) / (maxRef - minSpm)));
      }

      const turbo = Math.max(1.0, Math.min(2.0, turboMultiplier || 1.0));
      // Kombinierter Geschwindigkeitsfaktor (steigt mit Tempo und Turbo nahtlos weiter)
      const totalSpeedFactor = normRatio + (turbo - 1.0) * 0.65;

      // 2. Musikalisch-exponentielle Tonhöhe über den gesamten Bereich:
      // Bei 0%: baseHz = 145 Hz (warmes D3)
      // Bei 25%: baseHz = 210 Hz
      // Bei 50%: baseHz = 305 Hz (D#4)
      // Bei 75%: baseHz = 440 Hz (Kammerton A4)
      // Bei 100%: baseHz = 640 Hz (kristallines E5)
      // Bei 100% + Turbo 2.0x: baseHz = 980 Hz (B5)
      // Steigt lückenlos über alle SPM-Stufen an – kein Stillstand ab 50%!
      const baseHz = 145 * Math.pow(2, totalSpeedFactor * 2.14);

      const oscFund = ctx.createOscillator();
      const oscHarm = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      // a) Fundamentaler Körper (runder, satter Sinuston)
      oscFund.type = 'sine';
      oscFund.frequency.setValueAtTime(baseHz, now);
      // Dynamischer Vorwärts-Glissando (+2.5%) für haptischen Beschleunigungseffekt
      oscFund.frequency.exponentialRampToValueAtTime(baseHz * 1.025, now + 0.024);

      // b) Harmonische reine Quinte (1.5x Multiplikator für samtigen Glanz & Präsenz)
      oscHarm.type = 'triangle';
      oscHarm.frequency.setValueAtTime(baseHz * 1.5, now);
      oscHarm.frequency.exponentialRampToValueAtTime(baseHz * 1.53, now + 0.024);

      // c) Resonanter Lowpass-Filter: Lässt den warmen Grundton voll durch
      // und öffnet sich bei steigendem Tempo dynamisch für brillantere Obertöne
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(5200, Math.max(850, baseHz * 3.4)), now);
      filter.Q.setValueAtTime(1.2 + normRatio * 0.9, now);

      // d) Dynamische Hüllkurve
      const dur = Math.max(0.045, 0.072 - normRatio * 0.016);
      const targetGain = 0.048 + Math.min(0.045, totalSpeedFactor * 0.038);

      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

      oscFund.connect(filter);
      oscHarm.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      // e) Zusätzlicher Turbinen-Schimmer (Oktave + 2x Obertöne) ab 30% Geschwindigkeit
      if (totalSpeedFactor > 0.3) {
        const shimmerOsc = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmerOsc.type = 'sine';
        shimmerOsc.frequency.setValueAtTime(baseHz * 2.0, now);
        shimmerOsc.frequency.exponentialRampToValueAtTime(baseHz * 2.05, now + 0.024);

        const shimmerLevel = Math.min(0.032, (totalSpeedFactor - 0.3) * 0.03);
        shimmerGain.gain.setValueAtTime(0.0001, now);
        shimmerGain.gain.linearRampToValueAtTime(shimmerLevel, now + 0.006);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        shimmerOsc.connect(filter);
        shimmerGain.connect(ctx.destination);
        shimmerOsc.start(now);
        shimmerOsc.stop(now + dur + 0.01);
      }

      oscFund.start(now);
      oscHarm.start(now);
      oscFund.stop(now + dur + 0.01);
      oscHarm.stop(now + dur + 0.01);
    } catch {}
  }

  /**
   * Satter analoger Sub-Bass-Drop & Aufwärts-Impuls bei Session-Start
   */
  public playStartDrop() {
    this.hapticPresetSwitch();
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const subOsc = ctx.createOscillator();
      const shimmerOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      const shimmerGain = ctx.createGain();

      // Satter Bass-Drop
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(125, now);
      subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.32);

      subGain.gain.setValueAtTime(0.24, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      // Cyan Shimmer
      shimmerOsc.type = 'triangle';
      shimmerOsc.frequency.setValueAtTime(320, now);
      shimmerOsc.frequency.exponentialRampToValueAtTime(640, now + 0.22);

      shimmerGain.gain.setValueAtTime(0.05, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      subOsc.start(now);
      shimmerOsc.start(now);
      subOsc.stop(now + 0.38);
      shimmerOsc.stop(now + 0.26);
    } catch {}
  }

  /**
   * Tiefer gedämpfter Sub-Bass-Drop bei Session-Stopp
   */
  public playStopDrop() {
    this.hapticIncrement(18);
    this.stopSessionRhythm();
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.26);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  /**
   * Edler harmonischer Resonanz-Akkord bei Preset-Aktivierung (C-Dur9 Arpeggio)
   */
  public playPresetChime() {
    this.hapticPresetSwitch();
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [261.63, 329.63, 392.0, 493.88, 587.33]; // C4, E4, G4, B4, D5
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.03);

        gain.gain.setValueAtTime(0.001, now + i * 0.03);
        gain.gain.linearRampToValueAtTime(0.055, now + i * 0.03 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.03 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.03);
        osc.stop(now + i * 0.03 + 0.3);
      });
    } catch {}
  }

  /**
   * Harmonischer Bestätigungsklang bei erfolgreichen Aktionen
   */
  public playSuccessChime() {
    this.playPresetChime();
  }

  /**
   * Akustischer Not-Aus Alarm-Impuls
   */
  public playEmergencyAlert() {
    this.hapticEmergencyStop();
    this.stopSessionRhythm();
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.11].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(195, now + offset);
        osc.frequency.exponentialRampToValueAtTime(50, now + offset + 0.09);

        gain.gain.setValueAtTime(0.24, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.095);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    } catch {}
  }

  // ==========================================================================
  // 4. HAPTIK & WAKE-LOCK
  // ==========================================================================

  public hapticIncrement(durationMs: number = 8) {
    if (!this._hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(durationMs);
    } catch {}
  }

  public hapticBoundaryWarning() {
    if (!this._hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate([28, 40, 35]);
    } catch {}
  }

  public hapticPresetSwitch() {
    if (!this._hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate([35, 25, 85]);
    } catch {}
  }

  public hapticEmergencyStop() {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate([110, 40, 110, 40, 160]);
    } catch {}
  }

  public async setSessionWakeLock(active: boolean) {
    this.shouldHoldWakeLock = active;
    if (active) {
      await this.acquireWakeLockInternal();
    } else {
      await this.releaseWakeLockInternal();
    }
  }

  private async acquireWakeLockInternal() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      this._wakeLockActive = false;
      this.notify();
      return;
    }
    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        this._wakeLockActive = true;
        this.notify();
        return;
      }
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this._wakeLockActive = true;
      this.wakeLockSentinel.addEventListener('release', () => {
        this._wakeLockActive = false;
        this.notify();
      });
      this.notify();
    } catch {
      this._wakeLockActive = false;
      this.notify();
    }
  }

  private async releaseWakeLockInternal() {
    try {
      if (this.wakeLockSentinel) {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
    } catch {}
    this._wakeLockActive = false;
    this.notify();
  }
}

export const sensoryEngine = new SensoryEngine();
