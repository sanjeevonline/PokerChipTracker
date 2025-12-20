
import React, { useState, useEffect } from 'react';
import { GameSession, Player, Transaction, TransactionType, Group } from './types';
import { api, formatCurrency } from './services/gameService';
import { supabase } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { ActiveGame } from './components/ActiveGame';
import { SettlementReport } from './components/SettlementReport';
import { History } from './components/History';
import { PlayersList } from './components/PlayersList';
import { PlayerProfile } from './components/PlayerProfile';
import { GroupSelection } from './components/GroupSelection';
import { Button, Modal, Input, Card } from './components/UI';
import { Plus, LayoutDashboard, Settings, Users, Database, ChevronLeft, LogOut, Loader2, Coins, Banknote, Share2, Mail, X, AlertCircle, HelpCircle, Terminal, ShieldAlert, Copy, Check } from 'lucide-react'; 

enum View {
  GROUPS,
  DASHBOARD,
  ACTIVE_GAME,
  SETTLEMENT,
  HISTORY,
  PLAYERS,
  PLAYER_PROFILE
}

export default function App() {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isSessionCheckComplete, setIsSessionCheckComplete] = useState(!supabase);

  // Data State
  const [groups, setGroups] = useState<Group[]>([]);
  const [games, setGames] = useState<GameSession[]>([]);
  const [players, setPlayers] = useState<Player[]>([]); 
  
  // View State
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.GROUPS);
  
  // Selection State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [viewingGameId, setViewingGameId] = useState<string | null>(null);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  
  // Modals State
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingGroup, setSharingGroup] = useState<Group | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  // Global Error Helper
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Game Creation State
  const [gameMode, setGameMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [newGamePlayers, setNewGamePlayers] = useState<string[]>([]);
  const [newGameBuyIns, setNewGameBuyIns] = useState<Record<string, string>>({});
  const [newGameChipValue, setNewGameChipValue] = useState<string>('0.25');
  const [newPlayerName, setNewPlayerName] = useState('');

  // Data Loading
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedGroups, fetchedGames, fetchedPlayers] = await Promise.all([
        api.fetchGroups(),
        api.fetchGames(),
        api.fetchPlayers()
      ]);
      setGroups(fetchedGroups);
      setGames(fetchedGames);
      setPlayers(fetchedPlayers);
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      loadData();
      return;
    }

    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setIsSessionCheckComplete(true);
      if (session) {
        loadData();
      }
    });

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
         loadData(); 
      } else {
         setGroups([]);
         setGames([]);
         setPlayers([]);
      }
    });

    return () => {
      if (subscription && (subscription as any).unsubscribe) {
        (subscription as any).unsubscribe();
      }
    };
  }, []);

  // Derived State
  const currentGroup = groups.find(g => g.id === selectedGroupId);
  const groupGames = games.filter(g => {
    if (selectedGroupId) return g.groupId === selectedGroupId;
    return false;
  });
  
  const groupPlayers = currentGroup 
    ? players.filter(p => currentGroup.playerIds.includes(p.id))
    : [];

  const activeGame = games.find(g => g.id === activeGameId);
  const viewingGame = games.find(g => g.id === viewingGameId);
  const viewingPlayer = players.find(p => p.id === viewingPlayerId);

  // --- Helpers ---

  const copyFixToClipboard = (sql: string) => {
     navigator.clipboard.writeText(sql);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
  };

  // --- Group Actions ---

  const handleCreateGroup = async (name: string) => {
    setGlobalError(null);
    const newGroup: Group = {
        id: crypto.randomUUID(),
        name: name.trim(),
        playerIds: [],
        createdAt: Date.now(),
        ownerId: session?.user?.id,
        sharedWithEmails: []
    };
    try {
      await api.saveGroup(newGroup);
      setGroups([...groups, newGroup]);
      setSelectedGroupId(newGroup.id);
      setCurrentView(View.DASHBOARD);
    } catch (e: any) {
      setGlobalError(e.message);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setCurrentView(View.DASHBOARD);
  };

  const handleResumeGame = (groupId: string, gameId: string) => {
    setSelectedGroupId(groupId);
    setActiveGameId(gameId);
    setCurrentView(View.ACTIVE_GAME);
  };

  const handleBackToGroups = () => {
    setSelectedGroupId(null);
    setCurrentView(View.GROUPS);
    setGlobalError(null);
  };

  const handleOpenShare = (group: Group) => {
    setSharingGroup(group);
    setShareError(null);
    setIsShareModalOpen(true);
  };

  const handleAddShareEmail = async () => {
    if (!sharingGroup || !shareEmail.trim()) return;
    
    setShareError(null);
    const emailToAdd = shareEmail.trim().toLowerCase();
    
    if (emailToAdd === session?.user?.email?.toLowerCase()) {
      setShareError("You cannot share a group with yourself.");
      return;
    }

    const currentEmails = sharingGroup.sharedWithEmails || [];
    if (currentEmails.includes(emailToAdd)) {
        setShareEmail('');
        return;
    }

    setIsSharing(true);
    try {
      const exists = await api.checkUserExistsByEmail(emailToAdd);
      
      if (!exists) {
        setShareError(`No ChipTracker user found with "${emailToAdd}".`);
        setIsSharing(false);
        return;
      }

      const updatedGroup = {
          ...sharingGroup,
          sharedWithEmails: [...currentEmails, emailToAdd]
      };

      await api.saveGroup(updatedGroup);
      setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
      setSharingGroup(updatedGroup);
      setShareEmail('');
    } catch (e: any) {
      setShareError(e.message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShareEmail = async (email: string) => {
    if (!sharingGroup) return;
    const updatedGroup = {
        ...sharingGroup,
        sharedWithEmails: (sharingGroup.sharedWithEmails || []).filter(e => e !== email)
    };
    try {
      await api.saveGroup(updatedGroup);
      setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
      setSharingGroup(updatedGroup);
    } catch (e: any) {
      setGlobalError(e.message);
    }
  };

  // --- Player Management ---

  const handleAddExistingPlayerToGroup = async (playerId: string) => {
    if (!selectedGroupId) return;
    try {
      await api.addPlayerToGroup(selectedGroupId, playerId);
      setGroups(prev => prev.map(g => {
          if (g.id === selectedGroupId && !g.playerIds.includes(playerId)) {
              return { ...g, playerIds: [...g.playerIds, playerId] };
          }
          return g;
      }));
    } catch (e: any) {
      setGlobalError(e.message);
    }
  };

  const createPlayer = (name: string): Player => {
    return { id: crypto.randomUUID(), name: name.trim() };
  };

  const handleCreatePlayerInModal = async () => {
    if (!newPlayerName.trim()) return;
    const newPlayer = createPlayer(newPlayerName);
    try {
      await api.savePlayer(newPlayer);
      setPlayers(prev => [...prev, newPlayer].sort((a,b) => a.name.localeCompare(b.name)));
      if (selectedGroupId) {
          await api.addPlayerToGroup(selectedGroupId, newPlayer.id);
          setGroups(prev => prev.map(g => 
              g.id === selectedGroupId ? { ...g, playerIds: [...g.playerIds, newPlayer.id] } : g
          ));
      }
      setNewPlayerName('');
      if (isNewGameModalOpen) {
         setNewGamePlayers(prev => [...prev, newPlayer.id]);
         const defaultAmount = gameMode === 'SINGLE' ? '100' : '25';
         setNewGameBuyIns(prev => ({ ...prev, [newPlayer.id]: defaultAmount }));
      }
    } catch (e: any) {
      setGlobalError(e.message);
    }
  };

  // --- Game Actions ---

  const handleStartNewGame = async () => {
    if (newGamePlayers.length < 2 || !selectedGroupId) return;
    const selectedPlayers = players.filter(p => newGamePlayers.includes(p.id));
    const startTime = Date.now();
    const chipValue = gameMode === 'SINGLE' ? (parseFloat(newGameChipValue) || 0.25) : undefined;
    const initialTransactions: Transaction[] = [];
    selectedPlayers.forEach(p => {
       const inputValue = parseFloat(newGameBuyIns[p.id]);
       const amount = gameMode === 'SINGLE' ? inputValue * (chipValue || 0) : inputValue;
       if (amount > 0) {
         initialTransactions.push({
           id: crypto.randomUUID(),
           timestamp: startTime,
           type: TransactionType.BUY_IN,
           fromId: 'BANK',
           toId: p.id,
           amount: amount
         });
       }
    });
    const newGame: GameSession = {
      id: crypto.randomUUID(),
      groupId: selectedGroupId,
      startTime: startTime,
      players: selectedPlayers,
      transactions: initialTransactions,
      playerStates: {},
      isActive: true,
      chipValue: chipValue
    };
    try {
      await api.saveGame(newGame);
      setGames([newGame, ...games]);
      setActiveGameId(newGame.id);
      setCurrentView(View.ACTIVE_GAME);
      setIsNewGameModalOpen(false);
      setNewGamePlayers([]);
      setNewGameBuyIns({});
      setNewGameChipValue('0.25');
      setGameMode('SINGLE');
    } catch (e: any) {
      setGlobalError(e.message);
    }
  };

  const handleUpdateGame = async (updatedGame: GameSession) => {
    try {
      setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
      await api.saveGame(updatedGame);
    } catch (e: any) {
      setGlobalError(e.message);
    }
  };

  const handleEditGame = (gameId: string) => {
    const gameToEdit = games.find(g => g.id === gameId);
    if (!gameToEdit) return;
    const updatedGame = { ...gameToEdit, isActive: true };
    handleUpdateGame(updatedGame);
    setActiveGameId(gameId);
    setCurrentView(View.ACTIVE_GAME);
  };

  const handleCreatePlayerFromGame = async (name: string) => {
    const newPlayer = createPlayer(name);
    try {
      await api.savePlayer(newPlayer);
      setPlayers(prev => [...prev, newPlayer].sort((a,b) => a.name.localeCompare(b.name)));
      if (selectedGroupId) {
          await api.addPlayerToGroup(selectedGroupId, newPlayer.id);
          setGroups(prev => prev.map(g => 
              g.id === selectedGroupId ? { ...g, playerIds: [...g.playerIds, newPlayer.id] } : g
          ));
      }
      return newPlayer;
    } catch (e: any) {
      setGlobalError(e.message);
      throw e;
    }
  }

  // --- View Helpers ---

  const togglePlayerSelection = (id: string) => {
    setNewGamePlayers(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      else {
        const defaultAmt = gameMode === 'SINGLE' ? '100' : '25';
        setNewGameBuyIns(prevBI => ({ ...prevBI, [id]: defaultAmt }));
        return [...prev, id];
      }
    });
  };

  const handleBuyInChange = (id: string, value: string) => {
    setNewGameBuyIns(prev => ({ ...prev, [id]: value }));
  };

  const handleGameModeChange = (mode: 'SINGLE' | 'MULTI') => {
    setGameMode(mode);
    const updatedBuyIns = { ...newGameBuyIns };
    newGamePlayers.forEach(id => {
        updatedBuyIns[id] = mode === 'SINGLE' ? '100' : '25';
    });
    setNewGameBuyIns(updatedBuyIns);
  };

  // --- Render ---

  if (!isSessionCheckComplete) {
     return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
           <Loader2 size={48} className="animate-spin text-red-600"/>
        </div>
     );
  }

  if (supabase && !session) {
    return <Auth />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        <div className="animate-pulse flex flex-col items-center">
          <Database size={48} className="mb-4 text-red-600"/>
          <div>Loading ChipTracker...</div>
        </div>
      </div>
    );
  }

  const rlsFixSql = `-- Run this in your Supabase SQL Editor to fix Permission Denied (42501) errors:

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Creation Policy
CREATE POLICY "Users can create" ON groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- View Policy
CREATE POLICY "Users can view" ON groups FOR SELECT TO authenticated USING (auth.uid() = owner_id OR (auth.jwt() ->> 'email') = ANY(shared_with_emails));

-- Update Policy (Critical for Sharing)
CREATE POLICY "Users can update" ON groups FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR (auth.jwt() ->> 'email') = ANY(shared_with_emails)) WITH CHECK (auth.uid() = owner_id OR (auth.jwt() ->> 'email') = ANY(shared_with_emails));`;

  const renderContent = () => {
    switch (currentView) {
      case View.GROUPS:
        return (
            <GroupSelection 
                groups={groups} 
                activeGames={games.filter(g => g.isActive)}
                onSelectGroup={handleSelectGroup} 
                onResumeGame={handleResumeGame}
                onCreateGroup={handleCreateGroup} 
                onShareGroup={handleOpenShare}
                currentUserId={session?.user?.id}
            />
        );

      case View.ACTIVE_GAME:
        if (!activeGame) return <div>Error: Game not found</div>;
        return (
          <ActiveGame 
            game={activeGame} 
            allPlayers={groupPlayers} 
            onCreatePlayer={handleCreatePlayerFromGame}
            onUpdateGame={handleUpdateGame} 
            onEndGame={() => {
              setViewingGameId(activeGame.id);
              setActiveGameId(null);
              setCurrentView(View.SETTLEMENT);
            }} 
          />
        );
      case View.SETTLEMENT:
        if (!viewingGame) return <div>Error: Game not found</div>;
        return (
          <SettlementReport 
            game={viewingGame} 
            onBack={() => setCurrentView(View.DASHBOARD)}
            onEdit={() => handleEditGame(viewingGame.id)}
          />
        );
      case View.HISTORY:
        return (
          <History 
            games={groupGames.filter(g => !g.isActive)} 
            onSelectGame={(g) => {
              setViewingGameId(g.id);
              setCurrentView(View.SETTLEMENT);
            }} 
          />
        );
      case View.PLAYERS:
        return (
          <PlayersList 
            players={groupPlayers}
            allGlobalPlayers={players}
            games={games} 
            onSelectPlayer={(id) => {
              setViewingPlayerId(id);
              setCurrentView(View.PLAYER_PROFILE);
            }}
            onAddPlayerToGroup={handleAddExistingPlayerToGroup}
            onCreatePlayerInGroup={async (name) => {
                const newPlayer = createPlayer(name);
                await api.savePlayer(newPlayer);
                setPlayers(prev => [...prev, newPlayer]);
                await handleAddExistingPlayerToGroup(newPlayer.id);
            }}
          />
        );
      case View.PLAYER_PROFILE:
        if (!viewingPlayer) return <div>Error: Player not found</div>;
        return (
          <PlayerProfile 
            player={viewingPlayer} 
            games={games} 
            onBack={() => setCurrentView(View.PLAYERS)}
          />
        );
      case View.DASHBOARD:
      default:
        const active = groupGames.find(g => g.isActive);
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {globalError && (
              <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-2xl animate-in zoom-in duration-300">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-red-500 shrink-0 mt-1" size={24} />
                  <div className="flex-1">
                    <h3 className="text-red-200 font-bold uppercase text-xs tracking-widest mb-1">Security Configuration Error</h3>
                    <p className="text-sm text-red-300/80 leading-relaxed mb-4">
                      {globalError.includes("SECURITY_DENIED") 
                        ? "Your Supabase Row Level Security (RLS) is blocking this action. You must run the fix SQL to continue." 
                        : globalError}
                    </p>
                    
                    {globalError.includes("SECURITY_DENIED") && (
                      <div className="space-y-3">
                        <div className="bg-black/40 rounded-lg p-3 border border-red-900/30">
                           <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-tighter">
                                <Terminal size={12} /> Supabase SQL Editor
                             </div>
                             <button 
                                onClick={() => copyFixToClipboard(rlsFixSql)}
                                className="flex items-center gap-1 text-[10px] bg-red-600/20 hover:bg-red-600/40 text-red-200 px-2 py-1 rounded transition-colors"
                             >
                               {copied ? <Check size={10} /> : <Copy size={10} />}
                               {copied ? 'Copied!' : 'Copy Fix SQL'}
                             </button>
                           </div>
                           <pre className="text-[10px] font-mono text-neutral-400 overflow-x-auto whitespace-pre">
                             {rlsFixSql}
                           </pre>
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setGlobalError(null)} className="p-1 hover:bg-red-500/10 rounded-full text-red-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950 to-neutral-900 p-8 sm:p-12 border border-red-900/30 shadow-2xl">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-20"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                        {currentGroup?.name || 'Dashboard'}
                    </h1>
                    <p className="text-red-200/80 text-lg max-w-xl mb-8">
                      {groupPlayers.length} Members • {groupGames.length} Games Played
                    </p>
                  </div>
                  {currentGroup && currentGroup.ownerId === session?.user?.id && (
                    <Button variant="ghost" size="sm" onClick={() => handleOpenShare(currentGroup)} icon={<Share2 size={16}/>}>
                      Share Group
                    </Button>
                  )}
                </div>
                
                {active ? (
                  <div className="bg-black/50 backdrop-blur-md p-6 rounded-xl border border-red-500/30 inline-block w-full max-w-md shadow-lg shadow-black">
                    <p className="text-red-400 font-bold uppercase text-xs tracking-wider mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      Game in Progress
                    </p>
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-white font-medium">{new Date(active.startTime).toLocaleString()}</span>
                       <span className="text-neutral-400 text-sm">{active.players.length} Players</span>
                    </div>
                    <Button onClick={() => { setActiveGameId(active.id); setCurrentView(View.ACTIVE_GAME); }} className="w-full">
                      Resume Game
                    </Button>
                  </div>
                ) : (
                  <Button size="lg" onClick={() => setIsNewGameModalOpen(true)} icon={<Plus size={20}/>}>
                    Start New Game
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <span className="text-red-600">♦</span> Recent Games
                 </h2>
                 <Button variant="ghost" size="sm" onClick={() => setCurrentView(View.HISTORY)}>View All</Button>
              </div>
              <History 
                games={groupGames.filter(g => !g.isActive).slice(0, 3)} 
                onSelectGame={(g) => { setViewingGameId(g.id); setCurrentView(View.SETTLEMENT); }}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-red-900 selection:text-white">
      <nav className="border-b border-neutral-800 bg-black/50 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer group" onClick={() => handleBackToGroups()}>
            <div className="w-8 h-10 bg-red-600 rounded border border-red-800 flex items-center justify-center text-black shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform">
              <span className="font-serif text-3xl leading-none pb-1">♠</span>
            </div>
            <span className="group-hover:text-white transition-colors">
                ChipTracker
                {currentGroup && <span className="text-neutral-500 font-normal mx-2">/</span>}
                {currentGroup && <span className="text-sm font-normal text-neutral-300">{currentGroup.name}</span>}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedGroupId && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" onClick={() => setCurrentView(View.DASHBOARD)} icon={<LayoutDashboard size={18}/>}>
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                  <Button variant="ghost" onClick={() => setCurrentView(View.PLAYERS)} icon={<Users size={18}/>}>
                    <span className="hidden sm:inline">Players</span>
                  </Button>
                  <Button variant="ghost" onClick={() => setCurrentView(View.HISTORY)} icon={<Settings size={18}/>}>
                    <span className="hidden sm:inline">History</span>
                  </Button>
                  <Button variant="ghost" onClick={handleBackToGroups} icon={<ChevronLeft size={18}/>} className="text-neutral-400">
                      <span className="hidden sm:inline">Switch Group</span>
                  </Button>
                </div>
            )}
            
            {supabase && session && (
               <div className="pl-2 ml-2 border-l border-neutral-800">
                  <Button 
                    variant="ghost" 
                    onClick={async () => { await (supabase.auth as any).signOut(); setSession(null); }} 
                    icon={<LogOut size={18}/>} 
                    className="text-red-500 hover:text-red-400 hover:bg-red-900/10"
                  >
                    <span className="hidden sm:inline">Log Out</span>
                  </Button>
               </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>

      {/* Share Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title={`Share "${sharingGroup?.name}"`}>
         <div className="space-y-6">
            {shareError && (
              <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col gap-3 animate-in fade-in zoom-in duration-200">
                <div className="flex items-start gap-3">
                  {shareError.includes("SECURITY_DENIED") ? <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" /> : <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />}
                  <div className="space-y-1">
                    <p className="text-xs text-red-200 font-bold uppercase tracking-wider">
                      {shareError.includes("SECURITY_DENIED") ? "Database Permission Denied" : "Verification Error"}
                    </p>
                    <p className="text-xs text-red-300/80 leading-relaxed">
                      {shareError.includes("SECURITY_DENIED") ? "Supabase RLS is blocking this share request. You must update your policies." : shareError}
                    </p>
                  </div>
                </div>
                
                {shareError.includes("SECURITY_DENIED") && (
                   <div className="pt-3 border-t border-red-500/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                           <Terminal size={12} /> SQL Setup Required
                        </div>
                        <button onClick={() => copyFixToClipboard(rlsFixSql)} className="text-[10px] bg-red-900/20 text-red-400 px-2 py-0.5 rounded border border-red-900/30">
                           {copied ? 'Copied' : 'Copy Fix'}
                        </button>
                      </div>
                      <div className="bg-black/40 rounded p-2 text-[10px] font-mono text-neutral-400 select-all border border-red-900/20 overflow-x-auto whitespace-nowrap">
                         ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
                      </div>
                   </div>
                )}
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
               <HelpCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
               <p className="text-xs text-neutral-400 leading-relaxed">
                  Enter the email address of the person you want to collaborate with. They must have a ChipTracker account.
               </p>
            </div>
            
            <div className="flex gap-2">
                <Input 
                    placeholder="Collaborator's Email" 
                    type="email"
                    value={shareEmail}
                    onChange={(e) => { setShareEmail(e.target.value); if(shareError) setShareError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddShareEmail()}
                    disabled={isSharing}
                />
                <Button onClick={handleAddShareEmail} icon={isSharing ? <Loader2 size={18} className="animate-spin"/> : <Plus size={18}/>} disabled={isSharing}>
                  {isSharing ? 'Verifying...' : 'Add'}
                </Button>
            </div>

            <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Collaborators</h4>
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 divide-y divide-neutral-800 overflow-hidden shadow-inner">
                    <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center font-bold text-xs border border-red-900/30 shadow-sm">
                                {session?.user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">{session?.user?.email}</div>
                                <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">You (Owner)</div>
                            </div>
                        </div>
                    </div>
                    {sharingGroup?.sharedWithEmails?.map(email => (
                        <div key={email} className="p-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center font-bold text-xs border border-neutral-700">
                                    {email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-neutral-200">{email}</div>
                                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Can edit</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleRemoveShareEmail(email)} 
                                className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Remove Access"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    ))}
                    {(sharingGroup?.sharedWithEmails?.length || 0) === 0 && (
                        <div className="p-8 text-center">
                           <Users size={24} className="mx-auto mb-2 text-neutral-700 opacity-20" />
                           <p className="text-xs text-neutral-600 font-medium italic">No collaborators added yet.</p>
                        </div>
                    )}
                </div>
            </div>
         </div>
      </Modal>

      {/* New Game Modal */}
      <Modal isOpen={isNewGameModalOpen} onClose={() => setIsNewGameModalOpen(false)} title={`New Game: ${currentGroup?.name}`}>
        <div className="space-y-6">
          <div className="flex gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
             <button onClick={() => handleGameModeChange('SINGLE')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded transition-all ${gameMode === 'SINGLE' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}>
                <Coins size={16} /> All Chips Same Value
             </button>
             <button onClick={() => handleGameModeChange('MULTI')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded transition-all ${gameMode === 'MULTI' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}>
                <Banknote size={16} /> Different Values
             </button>
          </div>
          {gameMode === 'SINGLE' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <Input label="Chip Value ($)" type="number" step="0.01" value={newGameChipValue} onChange={(e) => setNewGameChipValue(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium text-neutral-300">
              <h3>Select Players & Starting Stack</h3>
              <div className="text-xs text-neutral-400">{newGamePlayers.length} selected</div>
            </div>
            <div className="max-h-[40vh] overflow-y-auto border border-neutral-800 rounded-lg bg-neutral-900">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-800 text-neutral-400 sticky top-0">
                  <tr>
                    <th className="p-3 w-10"></th>
                    <th className="p-3">Player</th>
                    {gameMode === 'SINGLE' ? (<><th className="p-3 w-32">Buy-In (Chips)</th><th className="p-3 w-24 text-right">Value ($)</th></>) : (<th className="p-3 w-32 text-right">Value ($)</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {groupPlayers.length === 0 && (<tr><td colSpan={4} className="p-4 text-center text-neutral-500">No players in this group yet.</td></tr>)}
                  {groupPlayers.map(p => {
                    const isSelected = newGamePlayers.includes(p.id);
                    const defaultVal = gameMode === 'SINGLE' ? '100' : '25';
                    const inputValueStr = newGameBuyIns[p.id] || defaultVal;
                    const chipValNum = parseFloat(newGameChipValue) || 0;
                    const inputNum = parseFloat(inputValueStr) || 0;
                    const totalVal = gameMode === 'SINGLE' ? inputNum * chipValNum : inputNum;
                    return (
                      <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-red-900/10' : 'hover:bg-neutral-800/50'}`}>
                        <td className="p-3"><input type="checkbox" checked={isSelected} onChange={() => togglePlayerSelection(p.id)} className="rounded border-neutral-600 bg-neutral-800 text-red-600 focus:ring-red-600 accent-red-600" /></td>
                        <td className="p-3 font-medium cursor-pointer" onClick={() => togglePlayerSelection(p.id)}>{p.name}</td>
                        {gameMode === 'SINGLE' ? (
                            <>
                                <td className="p-3"><input type="number" step="1" disabled={!isSelected} value={inputValueStr} onChange={(e) => handleBuyInChange(p.id, e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-right disabled:opacity-30 disabled:cursor-not-allowed focus:border-red-600 focus:outline-none" /></td>
                                <td className="p-3 text-right font-mono text-neutral-300">{isSelected ? formatCurrency(totalVal) : '-'}</td>
                            </>
                        ) : (<td className="p-3"><input type="number" step="1" disabled={!isSelected} value={inputValueStr} onChange={(e) => handleBuyInChange(p.id, e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-right disabled:opacity-30 disabled:cursor-not-allowed focus:border-red-600 focus:outline-none font-mono" /></td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex gap-2 items-end pt-2 border-t border-neutral-800">
             <Input placeholder="New Player Name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayerInModal()} className="py-1.5" />
             <Button variant="secondary" onClick={handleCreatePlayerInModal} icon={<Plus size={16}/>}>Add</Button>
          </div>
          <Button className="w-full" size="lg" onClick={handleStartNewGame} disabled={newGamePlayers.length < 2}>Start Game ({newGamePlayers.length} Players)</Button>
        </div>
      </Modal>
    </div>
  );
}
