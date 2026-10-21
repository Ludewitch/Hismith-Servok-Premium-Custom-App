import React, { useState, useEffect } from 'react';
import { Octagon, Volume2, VolumeX, Lock, Unlock, Radio } from 'lucide-react';
import { sensoryEngine } from '../services/sensoryEngine';
import { servokBle } from '../services/servokBle';
import { Language, tr } from '../i18n/translations';

interface FloatingKillSwitchProps {
  isPlaying: boolean;
  isConnected: boolean;
  onEmergencyStop: () => void;
  language?: Language;
}

export const FloatingKillSwitch: React.FC<FloatingKillSwitchProps> = ({
  isPlaying,
  isConnected,
  onEmergencyStop,
  language = 'de',
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(sensoryEngine.getMuted());
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(sensoryEngine.isWakeLockActive);
  const [rssi, setRssi] = useState<number>(-99);
  const [triggeredFlash, setTriggeredFlash] = useState<boolean>(false);

  useEffect(() => {
    const unsubAudio = sensoryEngine.subscribe((muted) => setIsMuted(muted));
    const unsubRssi = servokBle.onRssiChange((val) => setRssi(val));
    const interval = setInterval(() => {
      setWakeLockActive(sensoryEngine.isWakeLockActive);
    }, 1500);

    return () => {
      unsubAudio();
      unsubRssi();
      clearInterval(interval);
    };
  }, []);

  // Multi-Touch (3-Finger Tap) Mobile Fail-Safe Kill-Switch Listener
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 3) {
        e.preventDefault();
        triggerKillSwitch();
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => window.removeEventListener('touchstart', handleTouchStart);
  });

  const triggerKillSwitch = () => {
    setTriggeredFlash(true);
    sensoryEngine.playEmergencyAlert();
    sensoryEngine.hapticEmergencyStop();
    onEmergencyStop();
    setTimeout(() => setTriggeredFlash(false), 900);
  };

  const handleToggleMute = () => {
    const next = sensoryEngine.toggleMute();
    setIsMuted(next);
    sensoryEngine.hapticIncrement();
  };

  // Signal bars from RSSI (-90 to -40 dBm)
  const signalBars = !isConnected
    ? 0
    : rssi >= -58
    ? 4
    : rssi >= -68
    ? 3
    : rssi >= -78
    ? 2
    : 1;

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-2.5 select-none">
      {/* Compact Sensory & Telemetry Glass Dock (Audio Synth Mute + WakeLock + RSSI) */}
      <div className="sensual-glass glass-optics-edge rounded-2xl px-3 py-2 flex items-center gap-2.5 shadow-xl">
        {/* Web Audio Synth Mute Toggle */}
        <button
          onClick={handleToggleMute}
          title={tr(
            language,
            'Prozedurales Web-Audio-Synthesizer-Feedback umschalten',
            'Toggle Procedural Web Audio Synth Feedback',
            'Alternar retroalimentación del sintetizador de audio'
          )}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
            !isMuted
              ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40'
              : 'bg-bg-base/60 text-text-dim border-border-dim hover:text-text-bright'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {isMuted ? tr(language, 'Stumm', 'Mute', 'Silencio') : tr(language, 'Audio', 'Audio', 'Audio')}
          </span>
        </button>

        {/* Screen Wake Lock Indicator */}
        <div
          title={tr(
            language,
            'Screen Wake Lock API (Verhindert Display-Ruhezustand bei laufender Session)',
            'Screen Wake Lock API (Prevents screen dimming during active sessions)',
            'Screen Wake Lock API (Evita que la pantalla se apague durante la sesión)'
          )}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono uppercase border ${
            wakeLockActive
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
              : 'bg-bg-base/60 text-text-dim border-border-dim'
          }`}
        >
          {wakeLockActive ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          <span className="hidden md:inline">Wake</span>
        </div>

        {/* BLE RSSI Signal Meter */}
        <div
          title={
            isConnected
              ? `BLE GATT Signal: ${rssi} dBm`
              : tr(language, 'Bluetooth getrennt', 'Bluetooth Disconnected', 'Bluetooth Desconectado')
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-bg-base/60 border border-border-dim text-[10px] font-mono text-text-dim"
        >
          <Radio className={`w-3 h-3 ${isConnected ? 'text-brand-cyan' : 'text-text-muted'}`} />
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                style={{ height: `${bar * 25}%` }}
                className={`w-1 rounded-full transition-all ${
                  bar <= signalBars ? 'bg-brand-cyan' : 'bg-border-bright'
                }`}
              />
            ))}
          </div>
          {isConnected && (
            <span className="text-[9px] text-brand-cyan hidden lg:inline">{rssi}dBm</span>
          )}
        </div>
      </div>

      {/* Always-On-Top Floating Kill-Switch with Soft Velvet Crimson Aura */}
      <button
        onClick={triggerKillSwitch}
        aria-label="EMERGENCY STOP / KILL SWITCH"
        className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-sans font-bold uppercase tracking-wider text-xs text-white border transition-all cursor-pointer ${
          isPlaying || triggeredFlash
            ? 'bg-rose-600 border-rose-300/70 kill-switch-aura scale-105'
            : 'bg-rose-600/90 hover:bg-rose-600 border-rose-400/50 shadow-lg'
        }`}
      >
        <Octagon className="w-4 h-4 fill-white/25 animate-pulse" />
        <div className="flex flex-col items-start leading-none">
          <span className="text-[11px] font-bold tracking-widest">
            {tr(language, 'NOT-AUS', 'STOP', 'PARADA')}
          </span>
          <span className="text-[8px] font-mono text-white/80 tracking-wider mt-0.5">
            [SPACE] / 3-TOUCH
          </span>
        </div>
      </button>
    </div>
  );
};
