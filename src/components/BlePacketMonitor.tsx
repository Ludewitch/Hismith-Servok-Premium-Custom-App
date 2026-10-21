import React, { useState } from 'react';
import { BlePacketLog } from '../types/servok';
import { Terminal, Trash2, ArrowUpRight, ArrowDownLeft, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface BlePacketMonitorProps {
  logs: BlePacketLog[];
  onClearLogs: () => void;
  isConnected: boolean;
}

export const BlePacketMonitor: React.FC<BlePacketMonitorProps> = ({ logs, onClearLogs, isConnected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'TX' | 'RX' | 'SIM' | 'ERR'>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.direction === filter;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg backdrop-blur-md">
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-950/60 hover:bg-slate-800/60 text-left transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-mono">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">BLE PROTOKOLL-MONITOR & PACKET-SNIFFER</span>
          <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
            {logs.length} Pakete
          </span>
          {isConnected && (
            <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ONLINE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px] font-mono hidden sm:inline">
            {isOpen ? 'Einklappen' : 'Details einblenden'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Log Console */}
      {isOpen && (
        <div className="p-3 border-t border-slate-800 space-y-2 text-xs font-mono">
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1">
              {(['ALL', 'TX', 'RX', 'SIM', 'ERR'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    filter === mode
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              onClick={onClearLogs}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Logs leeren
            </button>
          </div>

          {/* Packet Stream */}
          <div className="h-44 overflow-y-auto space-y-1 pr-1 select-text scrollbar-thin scrollbar-thumb-slate-700">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 italic py-6 text-center text-xs">
                Keine Pakete in dieser Ansicht vorhanden.
              </div>
            ) : (
              filteredLogs.slice(-100).map((log) => {
                const isTx = log.direction === 'TX';
                const isRx = log.direction === 'RX';
                const isErr = log.direction === 'ERR';
                const isSim = log.direction === 'SIM';

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-slate-800/40 text-[11px] leading-tight"
                  >
                    <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>

                    <span
                      className={`px-1 rounded text-[9px] font-bold shrink-0 flex items-center gap-0.5 ${
                        isTx
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                          : isRx
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : isErr
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : isSim
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isTx && <ArrowUpRight className="w-2.5 h-2.5" />}
                      {isRx && <ArrowDownLeft className="w-2.5 h-2.5" />}
                      {isErr && <AlertTriangle className="w-2.5 h-2.5" />}
                      {log.direction}
                    </span>

                    {log.hex && (
                      <span className="font-bold text-amber-300 bg-amber-950/40 px-1 rounded text-[10px] shrink-0">
                        {log.hex}
                      </span>
                    )}

                    <span
                      className={`truncate ${
                        isErr ? 'text-rose-300' : isRx ? 'text-emerald-300' : 'text-slate-300'
                      }`}
                    >
                      {log.description}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
