
import React, { useMemo } from 'react';
import { GameSession } from '../types';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Card } from './UI';
import { ChevronRight, Calendar, Users, DollarSign, Clock } from 'lucide-react';

interface HistoryProps {
  games: GameSession[];
  onSelectGame: (game: GameSession) => void;
}

export const History: React.FC<HistoryProps> = ({ games, onSelectGame }) => {
  // Always sort by date descending for a clean, consistent feed
  const sortedGames = useMemo(() => {
    const gamesWithData = games.map(game => ({
      game,
      report: calculateSettlement(game)
    }));

    return gamesWithData.sort((a, b) => b.game.startTime - a.game.startTime);
  }, [games]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {sortedGames.length === 0 ? (
        <Card className="text-center py-12">
           <div className="bg-neutral-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-700">
             <Calendar className="text-neutral-500" size={32} />
           </div>
           <p className="text-neutral-400">No session history available yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sortedGames.map(({ game, report }) => {
            const winner = report.players[0];

            return (
              <div 
                key={game.id}
                onClick={() => onSelectGame(game)}
                className="group bg-neutral-900 border border-neutral-800 hover:border-red-900/40 hover:bg-neutral-800/80 p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between shadow-sm"
              >
                 <div className="flex items-center gap-4">
                    <div className="bg-neutral-950 p-2.5 rounded-lg text-neutral-500 group-hover:text-red-500 transition-colors border border-neutral-800 group-hover:border-red-900/20 shadow-inner">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-white mb-0.5 group-hover:text-red-100 transition-colors text-sm sm:text-base">
                        {new Date(game.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-neutral-500 uppercase font-black tracking-widest">
                         <span className="flex items-center gap-1"><Users size={11}/> {game.players.length} Players</span>
                         <span className="text-neutral-700">•</span>
                         <span className="flex items-center gap-1 text-neutral-400"><DollarSign size={11}/> {formatCurrency(report.totalBuyIn)} Pot</span>
                      </div>
                    </div>
                 </div>

                 <div className="text-right hidden sm:block">
                    <div className="text-[9px] text-neutral-600 uppercase font-black tracking-widest mb-1">Top Performer</div>
                    <div className="font-bold text-green-500 truncate max-w-[140px] text-sm">
                      {winner?.name || '-'} <span className="font-mono text-xs opacity-80">(+{formatCurrency(winner?.netProfit || 0)})</span>
                    </div>
                 </div>

                 <ChevronRight className="text-neutral-700 group-hover:text-white transition-colors ml-4" size={20} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
