
import React, { useState } from 'react';
import { Group, GameSession } from '../types';
import { Button, Input, Modal, Card } from './UI';
import { Plus, Users, ChevronRight, PlayCircle, FolderPlus, Share2, ShieldCheck, Lock } from 'lucide-react';

interface GroupSelectionProps {
  groups: Group[];
  activeGames: GameSession[];
  onSelectGroup: (groupId: string) => void;
  onResumeGame: (groupId: string, gameId: string) => void;
  onCreateGroup: (name: string) => void;
  onShareGroup: (group: Group) => void;
  currentUserId?: string;
}

export const GroupSelection: React.FC<GroupSelectionProps> = ({ 
  groups, 
  activeGames,
  onSelectGroup, 
  onResumeGame,
  onCreateGroup,
  onShareGroup,
  currentUserId
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName);
    setNewGroupName('');
    setIsModalOpen(false);
  };

  // Filter active games to only those belonging to accessible groups
  const accessibleGroupIds = new Set(groups.map(g => g.id));
  const filteredActiveGames = activeGames.filter(game => 
    game.groupId && accessibleGroupIds.has(game.groupId)
  );

  const sortedActiveGames = [...filteredActiveGames].sort((a, b) => b.startTime - a.startTime);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center py-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Welcome to ChipTracker</h1>
        <p className="text-neutral-400">Select a group to manage your games.</p>
      </div>

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
            {groups.map(group => {
              const isOwner = group.ownerId === currentUserId;
              const isShared = (group.sharedWithEmails?.length || 0) > 0;
              
              return (
                <Card 
                  key={group.id} 
                  onClick={() => onSelectGroup(group.id)}
                  className="h-44 relative group cursor-pointer hover:border-red-600/50 transition-all flex flex-col justify-between"
                >
                  <div className="relative z-10 h-full flex flex-col justify-between pointer-events-none">
                    <div className="flex justify-between items-start pointer-events-auto">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-red-400 transition-colors line-clamp-1">{group.name}</h3>
                        <div className="flex items-center gap-2 text-neutral-500 text-sm">
                          <Users size={14} />
                          {group.playerIds.length} Members
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {isOwner ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onShareGroup(group); }}
                            className="p-1.5 rounded-lg bg-neutral-950 text-neutral-400 hover:text-white hover:bg-red-600/20 transition-all border border-neutral-800 relative z-20"
                            title="Share Group"
                          >
                            <Share2 size={16} />
                          </button>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-neutral-950 text-blue-500 border border-blue-900/30" title="Shared with you">
                             <Lock size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-2 pointer-events-none">
                      {isOwner && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-900/20 text-red-500 px-2 py-0.5 rounded border border-red-900/30 uppercase tracking-wider">
                           <ShieldCheck size={10} /> Owner
                        </span>
                      )}
                      {!isOwner && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-900/20 text-blue-500 px-2 py-0.5 rounded border border-blue-900/30 uppercase tracking-wider">
                           Collaborator
                        </span>
                      )}
                      {isShared && isOwner && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700 uppercase tracking-wider">
                           Shared ({group.sharedWithEmails?.length})
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex justify-between items-end pointer-events-none">
                      <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">
                        {new Date(group.createdAt).toLocaleDateString()}
                      </span>
                      <div className="bg-neutral-950 p-2 rounded-full text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all border border-neutral-800">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

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
