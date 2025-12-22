
import React, { useState, useMemo } from 'react';
import { GameSession } from '../types';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Card, Button } from './UI';
import { ChevronRight, Calendar, Users, DollarSign, ArrowUpDown, Clock, Filter } from 'lucide-react';

interface HistoryProps {
  games: GameSession[];
  onSelectGame: (game: GameSession) => void;
}

type SortOption = 'DATE' | 'POT' | 'PLAYERS';

export const History: React.FC<HistoryProps> = ({ games, onSelectGame }) => {
  const [sortBy, setSortBy] = useState<SortOption>('DATE');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const sortedGames = useMemo(() => {
    const gamesWithData = games.map(game => ({
      game,
      report: calculateSettlement(game)
    }));

    return gamesWithData.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'DATE') {
        comparison = a.game.startTime - b.game.startTime;
      } else if (sortBy === 'POT') {
        comparison = a.report.totalBuyIn - b.report.totalBuyIn;
      } else if (sortBy === 'PLAYERS') {
        comparison = a.game.players.length - b.game.players.length;
      }
      return sortOrder === 'DESC' ? -comparison : comparison;
    });
  }, [games, sortBy, sortOrder]);

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(option);
      setSortOrder('DESC');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {games.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pb-2 px-1">
           <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mr-2">
              <Filter size={12} /> Sort By
           </div>
           <button 
             onClick={() => toggleSort('DATE')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${sortBy === 'DATE' ? 'bg-red-600/10 border-red-600 text-red-500' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
           >
             <Clock size={12} /> Date {sortBy === 'DATE' && (sortOrder === 'DESC' ? '↓' : '↑')}
           </button>
           <button 
             onClick={() => toggleSort('POT')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${sortBy === 'POT' ? 'bg-red-600/10 border-red-600 text-red-500' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
           >
             <DollarSign size={12} /> Pot Size {sortBy === 'POT' && (sortOrder === 'DESC' ? '↓' : '↑')}
           </button>
           <button 
             onClick={() => toggleSort('PLAYERS')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${sortBy === 'PLAYERS' ? 'bg-red-600/10 border-red-600 text-red-500' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
           >
             <Users size={12} /> Players {sortBy === 'PLAYERS' && (sortOrder === 'DESC' ? '↓' : '↑')}
           </button>
        </div>
      )}

      {sortedGames.length === 0 ? (
        <Card className="text-center py-12">
           <div className="bg-neutral-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <Calendar className="text-neutral-500" size={32} />
           </div>
           <p className="text-neutral-400">No history available yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedGames.map(({ game, report }) => {
            const winner = report.players[0]; // Already sorted by calc logic

            return (
              <div 
                key={game.id}
                onClick={() => onSelectGame(game)}
                className="group bg-neutral-900 border border-neutral-800 hover:border-red-900 hover:bg-neutral-800/80 p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between shadow-lg shadow-black/20"
              >
                 <div className="flex items-center gap-4">
                    <div className="bg-neutral-950 p-3 rounded-lg text-neutral-400 group-hover:text-red-500 transition-colors border border-neutral-800 group-hover:border-red-900/30 shadow-inner">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1 group-hover:text-red-100 transition-colors">
                        {new Date(game.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                         <span className="flex items-center gap-1"><Users size={12}/> {game.players.length} Players</span>
                         <span className="text-neutral-700">•</span>
                         <span className="flex items-center gap-1"><DollarSign size={12}/> {formatCurrency(report.totalBuyIn)} Pot</span>
                      </div>
                    </div>
                 </div>

                 <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-1">Top Winner</div>
                    <div className="font-medium text-green-500 truncate max-w-[120px]">
                      {winner?.name || '-'} <span className="font-mono ml-1">(+{formatCurrency(winner?.netProfit || 0)})</span>
                    </div>
                 </div>

                 <ChevronRight className="text-neutral-600 group-hover:text-white transition-colors ml-4" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
