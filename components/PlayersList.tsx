
import React, { useState } from 'react';
import { GameSession, Player } from '../types';
import { getPlayerStats, formatCurrency } from '../services/gameService';
import { Card, Button, Modal, Input } from './UI';
import { ChevronRight, User, Plus, Search, AlertCircle } from 'lucide-react';

interface PlayersListProps {
  players: Player[]; // Group Players
  games: GameSession[]; // All games (for stats)
  onSelectPlayer: (playerId: string) => void;
  onCreatePlayerInGroup: (name: string) => void; // Create new
}

export const PlayersList: React.FC<PlayersListProps> = ({ 
  players, 
  games, 
  onSelectPlayer,
  onCreatePlayerInGroup
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const playersWithStats = players.map(p => getPlayerStats(p, games))
    .sort((a, b) => b.netProfit - a.netProfit);

  const isNameInGroup = players.some(p => p.name.toLowerCase() === searchQuery.trim().toLowerCase());

  const handleCreateNew = () => {
    if (searchQuery.trim() && !isNameInGroup) {
      onCreatePlayerInGroup(searchQuery.trim());
      setSearchQuery('');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-red-600">♦</span> Group Roster
        </h2>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus size={18}/>} size="sm">
            Add Player
        </Button>
      </div>
      
      {playersWithStats.length === 0 ? (
        <Card className="text-center py-12">
           <div className="bg-neutral-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-700 shadow-inner">
             <User className="text-neutral-500" size={32} />
           </div>
           <p className="text-neutral-400">No players in this group yet.</p>
           <Button variant="secondary" className="mt-4" onClick={() => setIsModalOpen(true)}>Add First Player</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {playersWithStats.map(stat => (
            <div 
              key={stat.id}
              onClick={() => onSelectPlayer(stat.id)}
              className="group bg-neutral-900 border border-neutral-800 hover:border-red-600/50 hover:bg-neutral-800/80 p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between"
            >
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border border-neutral-700 bg-neutral-800">
                    {stat.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg group-hover:text-red-100 transition-colors">{stat.name}</div>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                       <span>{stat.gamesPlayed} Sessions</span>
                       <span className="text-neutral-700">•</span>
                       <span>Win Rate: {stat.gamesPlayed > 0 ? Math.round((stat.wins / stat.gamesPlayed) * 100) : 0}%</span>
                    </div>
                  </div>
               </div>

               <div className="text-right flex items-center gap-4">
                  <div className="hidden sm:block">
                     <div className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest mb-1">Lifetime Bankroll</div>
                     <div className={`font-mono font-bold text-lg ${stat.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.netProfit > 0 ? '+' : ''}{formatCurrency(stat.netProfit)}
                     </div>
                  </div>
                  <ChevronRight className="text-neutral-600 group-hover:text-white transition-colors" />
               </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Player to Group">
         <div className="space-y-6">
            <div className="relative">
               <Search className="absolute left-3 top-3 text-neutral-500" size={18} />
               <Input 
                  placeholder="Enter new player name..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
               />
            </div>

            {searchQuery && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                 {isNameInGroup && (
                    <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center gap-3 text-red-200 text-xs font-bold animate-pulse">
                        <AlertCircle size={16} className="text-red-500" />
                        This name is already taken within this group roster.
                    </div>
                 )}
                 
                 <Button className="w-full" onClick={handleCreateNew} disabled={isNameInGroup}>
                    {isNameInGroup ? 'Already in Roster' : `Create & Add "${searchQuery}"`}
                 </Button>
              </div>
            )}

            {!searchQuery && (
               <div className="text-center py-12">
                  <User className="mx-auto text-neutral-800 mb-2 opacity-20" size={48} />
                  <p className="text-xs text-neutral-600 italic">Type a name to create a new member for this group.</p>
               </div>
            )}
         </div>
      </Modal>
    </div>
  );
};
