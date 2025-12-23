
import React, { useState, useEffect, useMemo } from 'react';
import { GameSession, Player, Transaction, TransactionType, Group } from './types';
import { api, formatCurrency, calculateSettlement } from './services/gameService';
import { supabase } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { ActiveGame } from './components/ActiveGame';
import { SettlementReport } from './components/SettlementReport';
import { History } from './components/History';
import { PlayersList } from './components/PlayersList';
import { PlayerProfile } from './components/PlayerProfile';
import { GroupSelection } from './components/GroupSelection';
import { GroupInsights } from './components/GroupInsights';
import { Button, Modal, Input, Card } from './components/UI';
import { Plus, LayoutDashboard, Database, LogOut, Loader2, Coins, Banknote, Share2, X, AlertCircle, HelpCircle, Terminal, ShieldAlert, Copy, Check, User, Users, TrendingUp, Trophy, ArrowRight, History as HistoryIcon } from 'lucide-react'; 

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
  const [isPulseModalOpen, setIsPulseModalOpen] = useState(false);
  const [pulseGroupId, setPulseGroupId] = useState<string | null>(null);
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

  // Numerical input classes to hide arrows
  const noArrowsClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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

  // Pulse data helper
  const pulseGroup = groups.find(g => g.id === pulseGroupId);
  const pulseGames = games.filter(g => g.groupId === pulseGroupId);
  const pulsePlayers = pulseGroup ? players.filter(p => pulseGroup.playerIds.includes(p.id)) : [];

  // Group Dashboard Stats Calculation
  const groupDashboardStats = useMemo(() => {
    if (!selectedGroupId) return null;
    const finished = groupGames.filter(g => !g.isActive).sort((a,b) => b.startTime - a.startTime);
    let totalPot = 0;
    finished.forEach(g => {
        const report = calculateSettlement(g);
        totalPot += report.totalBuyIn;
    });

    const lastGame = finished[0];
    let lastWinner = null;
    if (lastGame) {
        const report = calculateSettlement(lastGame);
        if (report.players.length > 0) {
            lastWinner = report.players[0]; // report.players is sorted by profit
        }
    }

    return {
        totalPot,
        lastWinner,
        gameCount: finished.length
    };
  }, [selectedGroupId, groupGames]);

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

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await api.deleteGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        setCurrentView(View.GROUPS);
      }
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

  const handleShowPulse = (groupId: string) => {
    setPulseGroupId(groupId);
    setIsPulseModalOpen(true);
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

  const createPlayer = (name: string, avatar?: string): Player => {
    return { id: crypto.randomUUID(), name: name.trim(), avatar };
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
       if (!isNaN(inputValue) && inputValue > 0) {
         const amount = gameMode === 'SINGLE' ? inputValue * (chipValue || 0) : inputValue;
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

  const handleCreatePlayerFromGame = async (name: string, avatar?: string) => {
    const newPlayer = createPlayer(name, avatar);
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
        // Only set default if it's currently empty
        setNewGameBuyIns(prevBI => {
          if (!prevBI[id]) {
            const defaultAmt = gameMode === 'SINGLE' ? '100' : '25';
            return { ...prevBI, [id]: defaultAmt };
          }
          return prevBI;
        });
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
        // If it's a known default, swap it. If custom, leave it.
        if (updatedBuyIns[id] === '100' && mode === 'MULTI') updatedBuyIns[id] = '25';
        else if (updatedBuyIns[id] === '25' && mode === 'SINGLE') updatedBuyIns[id] = '100';
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

-- 1. GROUPS TABLE
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create groups" ON groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can view groups" ON groups FOR SELECT TO authenticated USING (auth.uid() = owner_id OR (auth.jwt() ->> 'email') = ANY(shared_with_emails));
CREATE POLICY "Users can update groups" ON groups FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR (auth.jwt() ->> 'email') = ANY(shared_with_emails)) WITH CHECK (auth.uid() = owner_id OR (auth.jwt() ->> 'email') = ANY(shared_with_emails));
CREATE POLICY "Users can delete groups" ON groups FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 2. GAMES TABLE
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage games" ON games FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. PLAYERS TABLE
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage players" ON players FOR ALL TO authenticated USING (true) WITH CHECK (true);`;

  const renderContent = () => {
    const isOwnerOfCurrent = currentGroup?.ownerId === session?.user?.id;
    const isCollaboratorOfCurrent = currentGroup?.sharedWithEmails?.includes(session?.user?.email);
    const canShareCurrent = isOwnerOfCurrent || isCollaboratorOfCurrent;

    switch (currentView) {
      case View.GROUPS:
        return (
            <GroupSelection 
                groups={groups} 
                activeGames={games.filter(g => g.isActive)}
                allGames={games}
                onSelectGroup={handleSelectGroup} 
                onResumeGame={handleResumeGame}
                onShowPulse={handleShowPulse}
                onCreateGroup={handleCreateGroup} 
                onDeleteGroup={handleDeleteGroup}
                onShareGroup={handleOpenShare}
                currentUserId={session?.user?.id}
                currentUserEmail={session?.user?.email}
                players={players}
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
            onCancelEdit={() => {
              // If we were editing (has endTime), set back to inactive and show report
              if (activeGame.endTime) {
                const revertedGame = { ...activeGame, isActive: false };
                handleUpdateGame(revertedGame);
                setViewingGameId(activeGame.id);
                setCurrentView(View.SETTLEMENT);
              } else {
                // If it was just an active game, dashboard
                setCurrentView(View.DASHBOARD);
              }
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
            onCreatePlayerInGroup={async (name, avatar) => {
                const newPlayer = createPlayer(name, avatar);
                await api.savePlayer(newPlayer);
                setPlayers(prev => [...prev, newPlayer].sort((a,b) => a.name.localeCompare(b.name)));
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
          <div className="space-y-6 animate-in fade-in duration-300">
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

            {/* Enhanced Group Hero Card */}
            <div className="relative overflow-hidden rounded-[2rem] bg-neutral-900 border border-neutral-800 shadow-2xl p-6 sm:p-10">
              <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-red-600 rounded-full blur-[100px] opacity-10"></div>
              <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 bg-neutral-800 rounded-full blur-[100px] opacity-20"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex-1 space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-900/40">
                            <Users size={20} className="text-black" />
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">
                            {currentGroup?.name || 'Dashboard'}
                        </h1>
                    </div>
                    <p className="text-neutral-400 text-sm sm:text-lg max-w-xl font-medium tracking-tight">
                      <span className="text-white font-bold">{groupPlayers.length}</span> Members connected • 
                      <span className="text-white font-bold ml-1">{groupDashboardStats?.gameCount || 0}</span> Total Sessions
                    </p>
                  </div>

                  {/* Quick Stats Grid inside Hero */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-black/40 border border-neutral-800/50 p-3 rounded-2xl">
                          <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Coins size={10} className="text-red-500" /> Pot Volume
                          </div>
                          <div className="text-lg font-mono font-black text-white leading-none">
                              {formatCurrency(groupDashboardStats?.totalPot || 0)}
                          </div>
                      </div>
                      <div className="bg-black/40 border border-neutral-800/50 p-3 rounded-2xl">
                          <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Trophy size={10} className="text-yellow-500" /> Reigning Champ
                          </div>
                          <div className="text-lg font-black text-white leading-none truncate pr-1">
                              {groupDashboardStats?.lastWinner?.name || 'N/A'}
                          </div>
                      </div>
                      <div className="bg-black/40 border border-neutral-800/50 p-3 rounded-2xl hidden sm:block">
                          <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <HistoryIcon size={10} className="text-blue-500" /> Frequency
                          </div>
                          <div className="text-lg font-black text-white leading-none">
                              {groupDashboardStats?.gameCount || 0} Games
                          </div>
                      </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                      {active ? (
                        <Button 
                            onClick={() => { setActiveGameId(active.id); setCurrentView(View.ACTIVE_GAME); }} 
                            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-red-900/20"
                        >
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            Resume Live Table
                        </Button>
                      ) : (
                        <Button 
                            onClick={() => setIsNewGameModalOpen(true)} 
                            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl shadow-red-900/20"
                        >
                            <Plus size={16} />
                            Start New Game
                        </Button>
                      )}
                      
                      <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleShowPulse(currentGroup!.id)}
                            className="p-3 rounded-xl bg-neutral-800/50 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all shadow-sm"
                            title="Group Pulse"
                          >
                            <TrendingUp size={20} />
                          </button>
                          {canShareCurrent && (
                            <button 
                              onClick={() => handleOpenShare(currentGroup!)}
                              className="p-3 rounded-xl bg-neutral-800/50 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all shadow-sm"
                              title="Share Group"
                            >
                              <Share2 size={20} />
                            </button>
                          )}
                      </div>
                  </div>
                </div>

                {/* Right side teaser for last game */}
                {groupDashboardStats?.lastWinner && (
                    <div className="lg:w-72 bg-black/40 border border-neutral-800/50 rounded-3xl p-5 flex flex-col justify-between h-full min-h-[140px] animate-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Latest Result</span>
                            <span className="text-[9px] font-bold text-neutral-600 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                {new Date(groupGames.filter(g => !g.isActive)[0].startTime).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Trophy size={10} /> Biggest Winner
                            </div>
                            <div className="text-xl font-black text-white truncate">{groupDashboardStats.lastWinner.name}</div>
                            <div className="text-2xl font-mono font-black text-green-500">
                                +{formatCurrency(groupDashboardStats.lastWinner.netProfit)}
                            </div>
                        </div>
                    </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                 <h2 className="text-sm font-black text-neutral-400 uppercase tracking-[0.3em] flex items-center gap-3">
                   <HistoryIcon size={14} /> RECENT SESSION HISTORY
                 </h2>
                 <Button variant="ghost" size="sm" onClick={() => setCurrentView(View.HISTORY)} className="text-[10px] font-black uppercase tracking-widest text-red-500">View All Archive</Button>
              </div>
              <History 
                games={groupGames.filter(g => !g.isActive).slice(0, 10)} 
                onSelectGame={(g) => { setViewingGameId(g.id); setCurrentView(View.SETTLEMENT); }}
              />
            </div>
          </div>
        );
    }
  };

  const isOwnerOfSharing = sharingGroup?.ownerId === session?.user?.id;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-red-900 selection:text-white overflow-x-hidden">
      <nav className="border-b border-neutral-800 bg-black/50 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 font-bold text-lg sm:text-xl cursor-pointer group min-w-0" onClick={() => handleBackToGroups()}>
            <div className="w-7 h-9 sm:w-8 sm:h-10 bg-red-600 rounded border border-red-800 flex items-center justify-center text-black shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform shrink-0">
              <span className="font-serif text-2xl sm:text-3xl leading-none pb-1">♠</span>
            </div>
            <span className="group-hover:text-white transition-colors flex items-center min-w-0 truncate">
                <span className="hidden xs:inline uppercase tracking-tighter">ChipTracker</span>
                <span className="xs:hidden uppercase tracking-tighter">CT</span>
                {currentGroup && <span className="text-neutral-500 font-normal mx-1 sm:mx-2 shrink-0">/</span>}
                {currentGroup && <span className="text-xs sm:text-sm font-black text-neutral-300 truncate uppercase italic">{currentGroup.name}</span>}
            </span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {selectedGroupId && (
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentView(View.DASHBOARD)} icon={<LayoutDashboard size={18}/>} className="px-2 sm:px-3 text-[10px] font-black uppercase tracking-widest">
                    <span className="hidden lg:inline">Table</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentView(View.PLAYERS)} icon={<Users size={18}/>} className="px-2 sm:px-3 text-[10px] font-black uppercase tracking-widest">
                    <span className="hidden lg:inline">Roster</span>
                  </Button>
                </div>
            )}
            
            {supabase && session && (
               <div className="pl-1 sm:pl-2 ml-1 sm:ml-2 border-l border-neutral-800 flex items-center gap-1 sm:gap-2">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">Signed in as</span>
                    <span className="text-[11px] text-neutral-300 font-bold max-w-[150px] truncate">{session.user.email}</span>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-900/20 border border-red-900/50 flex items-center justify-center text-red-500 md:hidden">
                    <User size={14} />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={async () => { await (supabase.auth as any).signOut(); setSession(null); }} 
                    icon={<LogOut size={16}/>} 
                    className="text-red-500 hover:text-red-400 hover:bg-red-900/10 px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline text-[10px] font-black uppercase">Out</span>
                  </Button>
               </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>

      {/* Group Pulse Modal */}
      <Modal 
        isOpen={isPulseModalOpen} 
        onClose={() => setIsPulseModalOpen(false)} 
        title={`${pulseGroup?.name || 'Group'} Pulse`}
        size="xl"
      >
        <div className="animate-in fade-in duration-300">
           <GroupInsights groupGames={pulseGames} groupPlayers={pulsePlayers} />
        </div>
      </Modal>

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
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
               <HelpCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
               <p className="text-xs text-neutral-400 leading-relaxed">
                  Enter the email address of the person you want to collaborate with. {isOwnerOfSharing ? 'As the owner, you can manage all members.' : 'As a collaborator, you can invite others to join.'}
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
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Members</h4>
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 divide-y divide-neutral-800 overflow-hidden shadow-inner">
                    <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center font-bold text-xs border border-red-900/30 shadow-sm">
                                {isOwnerOfSharing ? session?.user?.email?.charAt(0).toUpperCase() : sharingGroup?.ownerId?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Group Owner</div>
                                <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{isOwnerOfSharing ? session?.user?.email : 'Primary Manager'}</div>
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
                                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Collaborator</div>
                                </div>
                            </div>
                            {isOwnerOfSharing && (
                                <button 
                                    onClick={() => handleRemoveShareEmail(email)} 
                                    className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove Access"
                                >
                                    <X size={16}/>
                                </button>
                            )}
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
             <button onClick={() => handleGameModeChange('SINGLE')} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded transition-all ${gameMode === 'SINGLE' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}>
                Fixed Value
             </button>
             <button onClick={() => handleGameModeChange('MULTI')} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded transition-all ${gameMode === 'MULTI' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}>
                Mixed Values
             </button>
          </div>
          {gameMode === 'SINGLE' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <Input label="Chip Value ($)" type="number" step="0.01" value={newGameChipValue} onChange={(e) => setNewGameChipValue(e.target.value)} className={noArrowsClass} />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium text-neutral-300">
              <h3>Select Players & Stacks</h3>
              <div className="text-xs text-neutral-400">{newGamePlayers.length} selected</div>
            </div>
            <div className="max-h-[40vh] overflow-y-auto border border-neutral-800 rounded-lg bg-neutral-900">
              <table className="w-full text-left text-sm table-fixed">
                <thead className="bg-neutral-800 text-neutral-400 sticky top-0_z-10">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Player</th>
                    <th className="p-3 w-20 text-right">{gameMode === 'SINGLE' ? 'Chips' : '$ Value'}</th>
                    <th className="p-3 w-20 text-right">$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {groupPlayers.length === 0 && (<tr><td colSpan={4} className="p-4 text-center text-neutral-500">No players in this group yet.</td></tr>)}
                  {groupPlayers.map(p => {
                    const isSelected = newGamePlayers.includes(p.id);
                    const inputValueStr = newGameBuyIns[p.id] || '';
                    
                    const chipValNum = parseFloat(newGameChipValue) || 0;
                    const inputNum = parseFloat(inputValueStr) || 0;
                    const calculatedValue = gameMode === 'SINGLE' ? (inputNum * chipValNum) : inputNum;

                    return (
                      <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-red-900/10' : 'hover:bg-neutral-800/50'}`}>
                        <td className="p-3"><input type="checkbox" checked={isSelected} onChange={() => togglePlayerSelection(p.id)} className="rounded border-neutral-600 bg-neutral-800 text-red-600 focus:ring-red-600 accent-red-600" /></td>
                        <td className="p-3 font-medium cursor-pointer" onClick={() => togglePlayerSelection(p.id)}>
                           <div className="flex items-center overflow-hidden">
                              <span className="truncate">{p.name}</span>
                           </div>
                        </td>
                        <td className="p-3">
                            <input 
                                type="number" 
                                step="1" 
                                disabled={!isSelected} 
                                value={inputValueStr} 
                                onChange={(e) => handleBuyInChange(p.id, e.target.value)} 
                                placeholder="0"
                                className={`w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-right disabled:opacity-30 disabled:cursor-not-allowed focus:border-red-600 focus:outline-none ${noArrowsClass}`} 
                            />
                        </td>
                        <td className="p-3 text-right font-mono text-neutral-500 text-[10px]">
                           {formatCurrency(calculatedValue)}
                        </td>
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
