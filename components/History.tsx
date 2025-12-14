import React from 'react';
import { GameSession } from '../types';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Card } from './UI';
import { ChevronRight, Calendar, Users, DollarSign } from 'lucide-react';

interface HistoryProps {
  games: GameSession[];
  onSelectGame: (game: GameSession) => void;
}

export const History: React.FC<HistoryProps> = ({ games, onSelectGame }) => {
  const sortedGames = [...games].sort((a, b) => b.startTime - a.startTime);

  return (
    <div className="space-y-6">
      
      {sortedGames.length === 0 ? (
        <Card className="text-center py-12">
           <div className="bg-neutral-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <Calendar className="text-neutral-500" size={32} />
           </div>
           <p className="text-neutral-400">No history available yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedGames.map(game => {
            const report = calculateSettlement(game);
            const winner = report.players[0]; // Already sorted by calc logic

            return (
              <div 
                key={game.id}
                onClick={() => onSelectGame(game)}
                className="group bg-neutral-900 border border-neutral-800 hover:border-red-900 hover:bg-neutral-800/80 p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between"
              >
                 <div className="flex items-center gap-4">
                    <div className="bg-neutral-950 p-3 rounded-lg text-neutral-400 group-hover:text-red-500 transition-colors border border-neutral-800 group-hover:border-red-900/30">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">
                        {new Date(game.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                         <span className="flex items-center gap-1"><Users size={12}/> {game.players.length} Players</span>
                         <span className="flex items-center gap-1"><DollarSign size={12}/> {formatCurrency(report.totalBuyIn)} Pot</span>
                      </div>
                    </div>
                 </div>

                 <div className="text-right hidden sm:block">
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Top Winner</div>
                    <div className="font-medium text-green-500">{winner?.name || '-'} (+{formatCurrency(winner?.netProfit || 0)})</div>
                 </div>

                 <ChevronRight className="text-neutral-600 group-hover:text-white transition-colors" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};