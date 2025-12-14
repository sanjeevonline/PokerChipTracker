import React from 'react';
import { GameSession, Player } from '../types';
import { getPlayerStats, formatCurrency } from '../services/gameService';
import { Card } from './UI';
import { ChevronRight, User } from 'lucide-react';

interface PlayersListProps {
  players: Player[];
  games: GameSession[];
  onSelectPlayer: (playerId: string) => void;
}

export const PlayersList: React.FC<PlayersListProps> = ({ players, games, onSelectPlayer }) => {
  const playersWithStats = players.map(p => getPlayerStats(p, games))
    .sort((a, b) => b.netProfit - a.netProfit); // Best players first

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-red-600">♦</span> Player Roster
      </h2>
      
      {playersWithStats.length === 0 ? (
        <Card className="text-center py-12">
           <div className="bg-neutral-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <User className="text-neutral-500" size={32} />
           </div>
           <p className="text-neutral-400">No players yet. Start a game to add players.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {playersWithStats.map(stat => (
            <div 
              key={stat.id}
              onClick={() => onSelectPlayer(stat.id)}
              className="group bg-neutral-900 border border-neutral-800 hover:border-red-900 hover:bg-neutral-800/80 p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between"
            >
               <div className="flex items-center gap-4">
                  <div className="bg-neutral-950 w-10 h-10 rounded-full flex items-center justify-center text-neutral-500 group-hover:text-red-500 transition-colors font-bold border border-neutral-800 group-hover:border-red-900/50">
                    {stat.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg group-hover:text-red-100 transition-colors">{stat.name}</div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                       <span>{stat.gamesPlayed} Games</span>
                       <span className="text-neutral-600">•</span>
                       <span>Win Rate: {stat.gamesPlayed > 0 ? Math.round((stat.wins / stat.gamesPlayed) * 100) : 0}%</span>
                    </div>
                  </div>
               </div>

               <div className="text-right flex items-center gap-4">
                  <div className="hidden sm:block">
                     <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Lifetime Net</div>
                     <div className={`font-mono font-bold ${stat.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.netProfit > 0 ? '+' : ''}{formatCurrency(stat.netProfit)}
                     </div>
                  </div>
                  <ChevronRight className="text-neutral-600 group-hover:text-white transition-colors" />
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};