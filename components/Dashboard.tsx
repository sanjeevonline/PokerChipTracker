
import React, { useMemo } from 'react';
import { Group, GameSession, Player } from '../types';
import { Button } from './UI';
import { History } from './History';
import { Plus, Users, History as HistoryIcon, TrendingUp, Share2 } from 'lucide-react';

interface DashboardProps {
  currentGroup: Group | undefined;
  groupPlayers: Player[];
  groupGames: GameSession[];
  canShare: boolean;
  onStartNewGame: () => void;
  onResumeGame: (id: string) => void;
  onShowPulse: (id: string) => void;
  onOpenShare: (group: Group) => void;
  onViewHistory: () => void;
  onSelectGameHistory: (game: GameSession) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentGroup,
  groupPlayers,
  groupGames,
  canShare,
  onStartNewGame,
  onResumeGame,
  onShowPulse,
  onOpenShare,
  onViewHistory,
  onSelectGameHistory
}) => {
  const active = groupGames.find(g => g.isActive);
  const finishedGames = useMemo(() => groupGames.filter(g => !g.isActive), [groupGames]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Dynamic Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2.5 rounded-2xl shadow-xl shadow-red-950/50 transform -rotate-3">
              <Users size={24} className="text-black" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase italic leading-tight">
              {currentGroup?.name || 'Home'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 shadow-inner">
              {groupPlayers.length} Members
            </span>
            <span className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 shadow-inner">
              {finishedGames.length} Sessions
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {active ? (
            <Button
              onClick={() => onResumeGame(active.id)}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 shadow-2xl shadow-red-900/40"
            >
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></span>
              Resume Table
            </Button>
          ) : (
            <Button
              onClick={onStartNewGame}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 shadow-2xl shadow-red-900/40"
            >
              <Plus size={18} />
              Start Session
            </Button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShowPulse(currentGroup!.id)}
              className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-neutral-800 transition-all shadow-xl flex items-center gap-2.5 group"
              title="Group Pulse"
            >
              <TrendingUp size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline">Analytics</span>
            </button>
            {canShare && currentGroup && (
              <button
                onClick={() => onOpenShare(currentGroup)}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all shadow-xl"
                title="Share Group"
              >
                <Share2 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <HistoryIcon size={14} className="text-red-600/50" /> ARCHIVED SESSIONS
          </h2>
          <Button variant="ghost" size="sm" onClick={onViewHistory} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-900/10">Full Archive</Button>
        </div>
        <History
          games={finishedGames.slice(0, 10)}
          onSelectGame={onSelectGameHistory}
        />
      </div>
    </div>
  );
};
