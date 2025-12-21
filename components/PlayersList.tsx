
import React, { useState, useRef } from 'react';
import { GameSession, Player } from '../types';
import { getPlayerStats, formatCurrency, api } from '../services/gameService';
import { Card, Button, Modal, Input } from './UI';
import { ChevronRight, User, Plus, Search, Image as ImageIcon, Check } from 'lucide-react';

interface PlayersListProps {
  players: Player[]; // Group Players
  allGlobalPlayers: Player[]; // All players in system for searching
  games: GameSession[]; // All games (for global stats)
  onSelectPlayer: (playerId: string) => void;
  onAddPlayerToGroup: (playerId: string) => void; // Add existing
  onCreatePlayerInGroup: (name: string, avatar?: string) => void; // Create new
}

const AVATAR_COLORS = [
  '#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669', 
  '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#db2777', 
  '#4b5563', '#171717'
];

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
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const playersWithStats = players.map(p => getPlayerStats(p, games))
    .sort((a, b) => b.netProfit - a.netProfit);

  const availablePlayers = allGlobalPlayers
    .filter(gp => !players.some(p => p.id === gp.id))
    .filter(gp => gp.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      onCreatePlayerInGroup(searchQuery.trim(), customAvatar || selectedColor);
      setSearchQuery('');
      setCustomAvatar(null);
      setIsModalOpen(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderAvatar = (p: Player | { name: string, avatar?: string }) => {
    if (p.avatar && p.avatar.startsWith('data:')) {
      return <img src={p.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-neutral-800" />;
    }
    const bgColor = p.avatar || '#262626';
    return (
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border border-neutral-700 shadow-inner"
        style={{ backgroundColor: bgColor }}
      >
        {p.name.charAt(0).toUpperCase()}
      </div>
    );
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
                  {renderAvatar(stat)}
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
                  placeholder="Search existing or enter new name..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
               />
            </div>

            {searchQuery && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                 <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Customize New Player</h4>
                 <div className="flex items-center gap-6 p-4 bg-neutral-900 rounded-xl border border-neutral-800">
                    <div className="shrink-0">
                       {customAvatar ? (
                         <div className="relative group">
                           <img src={customAvatar} className="w-16 h-16 rounded-full object-cover border-2 border-red-600 shadow-lg shadow-red-900/20" alt="Preview" />
                           <button 
                             onClick={() => setCustomAvatar(null)}
                             className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <Plus size={12} className="rotate-45" />
                           </button>
                         </div>
                       ) : (
                         <div 
                           className="w-16 h-16 rounded-full border-2 border-neutral-700 flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                           style={{ backgroundColor: selectedColor }}
                         >
                           {searchQuery.charAt(0).toUpperCase()}
                         </div>
                       )}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                       <div className="flex flex-wrap gap-2">
                          {AVATAR_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => { setSelectedColor(color); setCustomAvatar(null); }}
                              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color && !customAvatar ? 'border-white' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-6 h-6 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-600 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white transition-all"
                            title="Upload Photo"
                          >
                             <ImageIcon size={12} />
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                       </div>
                       <p className="text-[10px] text-neutral-500 italic">Select a theme color or upload a player photo.</p>
                    </div>
                 </div>
                 
                 <Button className="w-full" onClick={handleCreateNew}>
                    Create & Add "{searchQuery}"
                 </Button>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-neutral-800/50">
                {availablePlayers.length > 0 && (
                   <div className="pb-2">
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Add Existing Members</h4>
                      {availablePlayers.map(p => (
                         <div key={p.id} className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl border border-neutral-800 mb-2 group">
                            <div className="flex items-center gap-3">
                               {renderAvatar(p)}
                               <div>
                                  <div className="font-bold text-white group-hover:text-red-400 transition-colors">{p.name}</div>
                                  <div className="text-[10px] text-neutral-500 font-mono">ID: {p.id.slice(-8)}</div>
                               </div>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => {
                                onAddPlayerToGroup(p.id);
                                setIsModalOpen(false);
                                setSearchQuery('');
                            }}>Add</Button>
                         </div>
                      ))}
                   </div>
                )}
                
                {searchQuery && availablePlayers.length === 0 && (
                   <div className="text-center py-6">
                      <p className="text-neutral-500 text-sm">Hit the button above to create this player.</p>
                   </div>
                )}

                {!searchQuery && availablePlayers.length === 0 && (
                   <div className="text-center py-8">
                      <User className="mx-auto text-neutral-800 mb-2" size={24} />
                      <p className="text-xs text-neutral-600 italic">Type to search or add new players.</p>
                   </div>
                )}
            </div>
         </div>
      </Modal>
    </div>
  );
};
