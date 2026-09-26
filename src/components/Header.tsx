import React from 'react';
import { Sparkles, ArrowLeft, Clapperboard, CheckCircle2, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { OverallCampaignStatus } from '../types.ts';

interface HeaderProps {
  hasActiveCampaign: boolean;
  overallStatus?: OverallCampaignStatus;
  targetDuration?: number;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasActiveCampaign,
  overallStatus = 'Preparing Campaign',
  targetDuration,
  onReset,
}) => {
  const getOverallBadge = () => {
    switch (overallStatus) {
      case 'Campaign Ready':
        return {
          icon: CheckCircle2,
          color: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300',
          dot: 'bg-emerald-400',
        };
      case 'Campaign Failed':
        return {
          icon: AlertTriangle,
          color: 'bg-red-950/80 border-red-800/60 text-red-300',
          dot: 'bg-red-400',
        };
      case 'Composing Campaign':
        return {
          icon: Loader2,
          color: 'bg-cyan-950/80 border-cyan-800/60 text-cyan-300',
          dot: 'bg-cyan-400 animate-spin',
        };
      case 'Generating Assets':
        return {
          icon: Loader2,
          color: 'bg-indigo-950/80 border-indigo-800/60 text-indigo-300',
          dot: 'bg-indigo-400 animate-spin',
        };
      default:
        return {
          icon: Sparkles,
          color: 'bg-zinc-900 border-zinc-800 text-zinc-300',
          dot: 'bg-cyan-400',
        };
    }
  };

  const badge = getOverallBadge();
  const Icon = badge.icon;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onReset}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-cyan-950/50">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Clapperboard className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-bold tracking-tight text-white">
                CampaignCraft <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                Multimodal Studio
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden md:block">
              Turn one creative idea into a complete multimodal campaign
            </p>
          </div>
        </div>

        {/* Compact Overall Campaign Status */}
        {hasActiveCampaign ? (
          <div className="flex items-center gap-2.5">
            {targetDuration && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{targetDuration}s</span>
              </span>
            )}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${badge.color}`}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{overallStatus}</span>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-zinc-400">Reasoning Engine:</span>
            <span className="font-mono text-xs font-semibold text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/50">
              Gemini 3.8 Flash
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {hasActiveCampaign && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 transition-colors cursor-pointer"
              title="Return to Creative Vision"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
              <span>Back to Brief</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

