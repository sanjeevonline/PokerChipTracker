import React, { useState } from 'react';
import { Group, GameSession } from '../types';
import { Button, Input, Modal, Card } from './UI';
import { Plus, Users, ChevronRight, Database, PlayCircle, FolderPlus } from 'lucide-react';

interface GroupSelectionProps {
  groups: Group[];
  activeGames: GameSession[];
  onSelectGroup: (groupId: string) => void;
  onResumeGame: (groupId: string, gameId: string) => void;
  onCreateGroup: (name: string) => void;
  onSeedData: () => void;
}

export const GroupSelection: React.FC<GroupSelectionProps> = ({ 
  groups, 
  activeGames,
  onSelectGroup, 
  onResumeGame,
  onCreateGroup, 
  onSeedData 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName);
    setNewGroupName('');
    setIsModalOpen(false);
  };

  // Sort active games to show most recent start time first
  const sortedActiveGames = [...activeGames].sort((a, b) => b.startTime - a.startTime);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center py-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Welcome to ChipTracker</h1>
        <p className="text-neutral-400">Select a group to manage your games.</p>
      </div>

      {/* Active Games Section on Home Page */}
      {sortedActiveGames.length > 0 && (
        <div className="space-y-4">
           <h2 className="text-xl font-bold text-white flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              Live Games
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedActiveGames.map(game => {
                 const groupName = groups.find(g => g.id === game.groupId)?.name || 'Unknown Group';
                 return (
                    <div 
                      key={game.id}
                      onClick={() => game.groupId && onResumeGame(game.groupId, game.id)}
                      className="bg-neutral-900 border border-red-900/50 hover:border-red-600 hover:bg-neutral-800 transition-all rounded-xl p-4 cursor-pointer flex items-center justify-between shadow-lg shadow-red-900/10 group"
                    >
                       <div>
                          <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">In Progress</div>
                          <div className="font-bold text-white text-lg mb-1">{groupName}</div>
                          <div className="text-sm text-neutral-400 flex items-center gap-2">
                             <Users size={14}/> {game.players.length} Players
                             <span className="text-neutral-600">•</span>
                             {new Date(game.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                       </div>
                       <div className="bg-red-600/10 p-3 rounded-full text-red-500 group-hover:bg-red-600 group-hover:text-white transition-colors">
                          <PlayCircle size={24} />
                       </div>
                    </div>
                 )
              })}
           </div>
        </div>
      )}

      {/* Groups Header & Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-neutral-400"/>
                Your Groups
             </h2>
             <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)} icon={<Plus size={16}/>}>
                New Group
             </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Existing Groups */}
            {groups.map(group => (
              <Card 
                key={group.id} 
                className="h-40 relative group cursor-pointer hover:border-red-600/50 transition-all flex flex-col justify-between"
              >
                <div onClick={() => onSelectGroup(group.id)} className="absolute inset-0 z-0"></div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-red-400 transition-colors">{group.name}</h3>
                  <div className="flex items-center gap-2 text-neutral-500 text-sm">
                    <Users size={14} />
                    {group.playerIds.length} Members
                  </div>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-xs text-neutral-600">
                     Created {new Date(group.createdAt).toLocaleDateString()}
                   </span>
                   <div className="bg-neutral-950 p-2 rounded-full text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all">
                     <ChevronRight size={16} />
                   </div>
                </div>
              </Card>
            ))}

            {/* Empty State / Add Card (Only shown if 0 groups, or as a very subtle option at end if desired, but here we only show if empty to prioritize existing groups) */}
            {groups.length === 0 && (
                 <button 
                   onClick={() => setIsModalOpen(true)}
                   className="col-span-full flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/30 transition-all group"
                >
                   <div className="bg-neutral-900 p-4 rounded-full mb-3 group-hover:bg-neutral-800 transition-colors">
                     <FolderPlus className="text-neutral-500 group-hover:text-white" size={32} />
                   </div>
                   <h3 className="text-lg font-bold text-neutral-400 group-hover:text-white">No Groups Yet</h3>
                   <p className="text-neutral-600 mt-1">Create your first poker group to get started.</p>
                </button>
            )}
        </div>
      </div>

      {groups.length === 0 && (
         <div className="flex justify-center mt-4">
            <Button variant="ghost" size="sm" onClick={onSeedData} icon={<Database size={14}/>}>
               Load Demo Data (OTV Groups)
            </Button>
         </div>
      )}

      {/* Create Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Create New Group"
      >
        <div className="space-y-4">
          <Input 
            label="Group Name" 
            placeholder="e.g. Friday Night Poker" 
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            autoFocus
          />
          <Button className="w-full" onClick={handleCreate} disabled={!newGroupName.trim()}>
            Create Group
          </Button>
        </div>
      </Modal>
    </div>
  );
};