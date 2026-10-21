import React, { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, ArrowUp, ArrowDown } from 'lucide-react';

export interface CollapsibleSectionCardProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: ReactNode;
  accentColor?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose';
  isForeground: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleForeground: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  orderIndex?: number;
  headerActions?: ReactNode;
  compactSummary?: ReactNode;
  children: ReactNode;
}

export const CollapsibleSectionCard: React.FC<CollapsibleSectionCardProps> = ({
  id,
  title,
  subtitle,
  icon: Icon,
  badge,
  accentColor = 'cyan',
  isForeground,
  isCollapsed,
  onToggleCollapse,
  onToggleForeground,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  headerActions,
  compactSummary,
  children,
}) => {
  const accentBorderColors = {
    cyan: isForeground ? 'border-brand-cyan/60 ring-1 ring-brand-cyan/20 shadow-xl' : 'border-border-dim',
    purple: isForeground ? 'border-purple-400/60 ring-1 ring-purple-400/20 shadow-xl' : 'border-border-dim',
    emerald: isForeground ? 'border-emerald-400/60 ring-1 ring-emerald-400/20 shadow-xl' : 'border-border-dim',
    amber: isForeground ? 'border-amber-400/60 ring-1 ring-amber-400/20 shadow-xl' : 'border-border-dim',
    rose: isForeground ? 'border-brand-rose/60 ring-1 ring-brand-rose/20 shadow-xl' : 'border-border-dim',
  };

  const iconColors = {
    cyan: 'text-brand-cyan',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-brand-rose',
  };

  return (
    <div
      id={`${id}-section-card`}
      className={`rounded-xl transition-all duration-200 overflow-hidden ${
        isForeground
          ? `bg-bg-surface/95 backdrop-blur-md border ${accentBorderColors[accentColor]} relative z-10`
          : 'bg-bg-surface/80 hover:bg-bg-surface border border-border-dim hover:border-border-bright shadow-md'
      }`}
    >
      {/* HEADER BAR */}
      <div
        className={`flex items-center justify-between px-4 py-3 gap-2 select-none cursor-pointer transition-colors ${
          isForeground ? 'bg-bg-panel/80 border-b border-border-dim/70' : 'hover:bg-bg-panel/40'
        }`}
        onClick={onToggleCollapse}
      >
        {/* TITLE & ICON */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isForeground
                ? 'bg-bg-base border border-border-bright shadow-xs'
                : 'bg-bg-base/80 border border-border-dim'
            }`}
          >
            <Icon className={`h-4 w-4 ${iconColors[accentColor]}`} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-xs sm:text-sm uppercase tracking-wider text-text-bright truncate">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle && (
              <p className="text-[11px] text-text-dim truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* RIGHT CONTROLS */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {headerActions}

          {(onMoveUp || onMoveDown) && (
            <div className="hidden sm:flex items-center bg-bg-base/90 border border-border-dim rounded-md p-0.5">
              {onMoveUp && (
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={onMoveUp}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isFirst
                      ? 'text-text-dim/25 cursor-not-allowed'
                      : 'text-text-dim hover:text-brand-cyan hover:bg-bg-panel'
                  }`}
                  title="Sektion nach oben verschieben"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
              )}
              {onMoveDown && (
                <button
                  type="button"
                  disabled={isLast}
                  onClick={onMoveDown}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isLast
                      ? 'text-text-dim/25 cursor-not-allowed'
                      : 'text-text-dim hover:text-brand-cyan hover:bg-bg-panel'
                  }`}
                  title="Sektion nach unten verschieben"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleForeground}
            className={`p-1.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
              isForeground
                ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/40'
                : 'bg-bg-base hover:bg-bg-panel text-text-dim hover:text-text-bright border border-border-dim'
            }`}
            title={isForeground ? 'Standardansicht' : 'Sektion hervorheben'}
          >
            {isForeground ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md bg-bg-base hover:bg-bg-panel text-text-dim hover:text-brand-cyan border border-border-dim transition-colors cursor-pointer"
            title={isCollapsed ? 'Ausklappen' : 'Einklappen'}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* COMPACT SUMMARY */}
      {isCollapsed && compactSummary && (
        <div className="px-4 py-2 bg-bg-panel/40 border-t border-border-dim/40 text-xs font-mono text-text-dim flex items-center justify-between gap-3">
          {compactSummary}
        </div>
      )}

      {/* EXPANDED CONTENT BODY */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 border-t border-border-dim/50 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

