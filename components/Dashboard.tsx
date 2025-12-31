
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
      {/* Simplified Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-900/40">
              <Users size={20} className="text-black" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">
              {currentGroup?.name || 'Dashboard'}
            </h1>
          </div>
          <p className="text-neutral-500 text-sm font-bold uppercase tracking-widest">
            {groupPlayers.length} Active Members • {finishedGames.length} Archive Entries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {active ? (
            <Button
              onClick={() => onResumeGame(active.id)}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-red-900/20"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Resume Table
            </Button>
          ) : (
            <Button
              onClick={onStartNewGame}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl shadow-red-900/20"
            >
              <Plus size={16} />
              Start Session
            </Button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => onShowPulse(currentGroup!.id)}
              className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-neutral-800 transition-all shadow-sm flex items-center gap-2 group"
              title="Group Pulse"
            >
              <TrendingUp size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Pulse</span>
            </button>
            {canShare && currentGroup && (
              <button
                onClick={() => onOpenShare(currentGroup)}
                className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all shadow-sm"
                title="Share Group"
              >
                <Share2 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <HistoryIcon size={14} /> RECENT SESSION HISTORY
          </h2>
          <Button variant="ghost" size="sm" onClick={onViewHistory} className="text-[10px] font-black uppercase tracking-widest text-red-500">View Archive</Button>
        </div>
        <History
          games={finishedGames.slice(0, 10)}
          onSelectGame={onSelectGameHistory}
        />
      </div>
    </div>
  );
};
