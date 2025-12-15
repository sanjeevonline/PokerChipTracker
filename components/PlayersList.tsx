import React, { useState } from 'react';
import { GameSession, Player } from '../types';
import { getPlayerStats, formatCurrency } from '../services/gameService';
import { Card, Button, Modal, Input } from './UI';
import { ChevronRight, User, Plus, Search } from 'lucide-react';

interface PlayersListProps {
  players: Player[]; // Group Players
  allGlobalPlayers: Player[]; // All players in system for searching
  games: GameSession[]; // All games (for global stats)
  onSelectPlayer: (playerId: string) => void;
  onAddPlayerToGroup: (playerId: string) => void; // Add existing
  onCreatePlayerInGroup: (name: string) => void; // Create new
}

export const PlayersList: React.FC<PlayersListProps> = ({ 
  players, 
  allGlobalPlayers,
  games, 
  onSelectPlayer,
  onAddPlayerToGroup,
  onCreatePlayerInGroup
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Stats are calculated globally for the player, covering all groups
  const playersWithStats = players.map(p => getPlayerStats(p, games))
    .sort((a, b) => b.netProfit - a.netProfit);

  // Filter global players to find ones NOT in the current group matching search
  const availablePlayers = allGlobalPlayers
    .filter(gp => !players.some(p => p.id === gp.id))
    .filter(gp => gp.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
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
           <div className="bg-neutral-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
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
              className="group bg-neutral-900 border border-neutral-800 hover:border-red-900 hover:bg-neutral-800/80 p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between"
            >
               <div className="flex items-center gap-4">
                  <div className="bg-neutral-950 w-10 h-10 rounded-full flex items-center justify-center text-neutral-500 group-hover:text-red-500 transition-colors font-bold border border-neutral-800 group-hover:border-red-900/50">
                    {stat.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg group-hover:text-red-100 transition-colors">{stat.name}</div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                       <span>{stat.gamesPlayed} Games (Total)</span>
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

      {/* Add Player Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Player to Group">
         <div className="space-y-4">
            <div className="relative">
               <Search className="absolute left-3 top-3 text-neutral-500" size={18} />
               <Input 
                  placeholder="Search existing or enter new name..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
               />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
                {searchQuery && availablePlayers.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-neutral-400 text-sm mb-2">No existing player found named "{searchQuery}"</p>
                        <Button className="w-full" onClick={handleCreateNew}>
                            Create New Player "{searchQuery}"
                        </Button>
                    </div>
                )}

                {availablePlayers.map(p => (
                   <div key={p.id} className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                            {p.name.charAt(0)}
                         </div>
                         <div>
                            <div className="font-bold text-white">{p.name}</div>
                            <div className="text-xs text-neutral-500">ID: ...{p.id.slice(-4)}</div>
                         </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => {
                          onAddPlayerToGroup(p.id);
                          setIsModalOpen(false);
                          setSearchQuery('');
                      }}>Add</Button>
                   </div>
                ))}
                
                {searchQuery && availablePlayers.length > 0 && (
                     <div className="pt-2 border-t border-neutral-800 mt-2">
                        <p className="text-xs text-neutral-500 mb-2 text-center">Or create a new person with this name</p>
                        <Button variant="danger" className="w-full" onClick={handleCreateNew}>
                            Create New "{searchQuery}"
                        </Button>
                     </div>
                )}
            </div>
         </div>
      </Modal>
    </div>
  );
};
