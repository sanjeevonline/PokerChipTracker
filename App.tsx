import React, { useState, useEffect } from 'react';
import { GameSession, Player, Transaction, TransactionType, Group } from './types';
import { api, formatCurrency } from './services/gameService';
import { supabase } from './services/supabaseClient';
import { ActiveGame } from './components/ActiveGame';
import { SettlementReport } from './components/SettlementReport';
import { History } from './components/History';
import { PlayersList } from './components/PlayersList';
import { PlayerProfile } from './components/PlayerProfile';
import { GroupSelection } from './components/GroupSelection';
import { Button, Modal, Input } from './components/UI';
import { Plus, LayoutDashboard, Settings, Users, Database, ChevronLeft, LogOut, Loader2, Coins, Banknote } from 'lucide-react'; 

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
  // Data State
  const [groups, setGroups] = useState<Group[]>([]);
  const [games, setGames] = useState<GameSession[]>([]);
  const [players, setPlayers] = useState<Player[]>([]); // Global players
  
  // View State
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.GROUPS);
  
  // Selection State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [viewingGameId, setViewingGameId] = useState<string | null>(null);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  
  // New Game Modal State
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [gameMode, setGameMode] = useState<'SINGLE' | 'MULTI'>('SINGLE'); // SINGLE = Same Value, MULTI = Different Values
  const [newGamePlayers, setNewGamePlayers] = useState<string[]>([]); // Selected IDs
  const [newGameBuyIns, setNewGameBuyIns] = useState<Record<string, string>>({}); // ID -> Chip Count or Amount
  const [newGameChipValue, setNewGameChipValue] = useState<string>('0.25');
  const [newPlayerName, setNewPlayerName] = useState('');

  // Data Loading
  const loadData = async () => {
    setIsLoading(true);
    const [fetchedGroups, fetchedGames, fetchedPlayers] = await Promise.all([
      api.fetchGroups(),
      api.fetchGames(),
      api.fetchPlayers()
    ]);
    setGroups(fetchedGroups);
    setGames(fetchedGames);
    setPlayers(fetchedPlayers);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
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

  // --- Group Actions ---

  const handleCreateGroup = async (name: string) => {
    const newGroup: Group = {
        id: crypto.randomUUID(),
        name: name.trim(),
        playerIds: [],
        createdAt: Date.now()
    };
    await api.saveGroup(newGroup);
    setGroups([...groups, newGroup]);
    setSelectedGroupId(newGroup.id);
    setCurrentView(View.DASHBOARD);
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
  };

  // --- Player Management in Group ---

  const handleAddExistingPlayerToGroup = async (playerId: string) => {
    if (!selectedGroupId) return;
    await api.addPlayerToGroup(selectedGroupId, playerId);
    
    // Refresh groups state locally
    setGroups(prev => prev.map(g => {
        if (g.id === selectedGroupId && !g.playerIds.includes(playerId)) {
            return { ...g, playerIds: [...g.playerIds, playerId] };
        }
        return g;
    }));
  };

  const createPlayer = (name: string): Player => {
    return { id: crypto.randomUUID(), name: name.trim() };
  };

  const handleCreatePlayerInModal = async () => {
    if (!newPlayerName.trim()) return;
    const newPlayer = createPlayer(newPlayerName);
    
    // Save Global
    await api.savePlayer(newPlayer);
    setPlayers(prev => [...prev, newPlayer].sort((a,b) => a.name.localeCompare(b.name)));
    
    // Add to Group if in setup modal
    if (selectedGroupId) {
        await api.addPlayerToGroup(selectedGroupId, newPlayer.id);
        setGroups(prev => prev.map(g => 
            g.id === selectedGroupId 
            ? { ...g, playerIds: [...g.playerIds, newPlayer.id] } 
            : g
        ));
    }
    
    setNewPlayerName('');
    
    // Auto select in new game modal
    if (isNewGameModalOpen) {
       setNewGamePlayers(prev => [...prev, newPlayer.id]);
       const defaultAmount = gameMode === 'SINGLE' ? '100' : '25';
       setNewGameBuyIns(prev => ({ ...prev, [newPlayer.id]: defaultAmount }));
    }

    return newPlayer;
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
       // If Single mode: value = chips * chipValue
       // If Multi mode: value = input (dollars)
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
      chipValue: chipValue // undefined if MULTI
    };

    setGames([newGame, ...games]);
    setActiveGameId(newGame.id);
    setCurrentView(View.ACTIVE_GAME);
    setIsNewGameModalOpen(false);
    setNewGamePlayers([]);
    setNewGameBuyIns({});
    setNewGameChipValue('0.25');
    setGameMode('SINGLE');

    await api.saveGame(newGame);
  };

  const handleUpdateGame = async (updatedGame: GameSession) => {
    setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
    await api.saveGame(updatedGame);
  };

  const handleEditGame = (gameId: string) => {
    const gameToEdit = games.find(g => g.id === gameId);
    if (!gameToEdit) return;
    const updatedGame = { ...gameToEdit, isActive: true };
    handleUpdateGame(updatedGame);
    setActiveGameId(gameId);
    setCurrentView(View.ACTIVE_GAME);
  };

  // Wrapper for ActiveGame to create players on the fly
  const handleCreatePlayerFromGame = async (name: string) => {
    // 1. Create Player
    const newPlayer = createPlayer(name);
    await api.savePlayer(newPlayer);
    setPlayers(prev => [...prev, newPlayer].sort((a,b) => a.name.localeCompare(b.name)));
    
    // 2. Add to Group
    if (selectedGroupId) {
        await api.addPlayerToGroup(selectedGroupId, newPlayer.id);
        setGroups(prev => prev.map(g => 
            g.id === selectedGroupId 
            ? { ...g, playerIds: [...g.playerIds, newPlayer.id] } 
            : g
        ));
    }
    return newPlayer;
  }

  // --- View Helpers ---

  const togglePlayerSelection = (id: string) => {
    setNewGamePlayers(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      else {
        // Default Buy-in based on mode
        const defaultAmt = gameMode === 'SINGLE' ? '100' : '25';
        setNewGameBuyIns(prevBI => ({ ...prevBI, [id]: defaultAmt }));
        return [...prev, id];
      }
    });
  };

  const handleBuyInChange = (id: string, value: string) => {
    setNewGameBuyIns(prev => ({ ...prev, [id]: value }));
  };

  // When toggling mode, update defaults for currently selected players
  const handleGameModeChange = (mode: 'SINGLE' | 'MULTI') => {
    setGameMode(mode);
    // Update default buy ins for selected players to match context
    const updatedBuyIns = { ...newGameBuyIns };
    newGamePlayers.forEach(id => {
        updatedBuyIns[id] = mode === 'SINGLE' ? '100' : '25';
    });
    setNewGameBuyIns(updatedBuyIns);
  };

  // --- Rendering Logic ---

  // 1. Data Loading Screen
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

  // 2. Main App
  // If no group selected, show group selection (unless we are deep in a game view which implies a group)
  if (!selectedGroupId && currentView !== View.GROUPS) {
     setCurrentView(View.GROUPS);
  }

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
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950 to-neutral-900 p-8 sm:p-12 border border-red-900/30">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-20"></div>
              <div className="relative z-10">
                <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                    {currentGroup?.name || 'Dashboard'}
                </h1>
                <p className="text-red-200/80 text-lg max-w-xl mb-8">
                  {groupPlayers.length} Members • {groupGames.length} Games Played
                </p>
                
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
                    <Button 
                      onClick={() => {
                        setActiveGameId(active.id);
                        setCurrentView(View.ACTIVE_GAME);
                      }}
                      className="w-full"
                    >
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

            {/* Quick History Preview */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <span className="text-red-600">♦</span> Recent Games
                 </h2>
                 <Button variant="ghost" size="sm" onClick={() => setCurrentView(View.HISTORY)}>View All</Button>
              </div>
              <History 
                games={groupGames.filter(g => !g.isActive).slice(0, 3)} 
                onSelectGame={(g) => {
                   setViewingGameId(g.id);
                   setCurrentView(View.SETTLEMENT);
                }}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-red-900 selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-neutral-800 bg-black/50 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 font-bold text-xl cursor-pointer group"
            onClick={() => handleBackToGroups()}
          >
            {/* Spade Card Icon - Red Base, Black Spade */}
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>

      {/* New Game Modal */}
      <Modal 
        isOpen={isNewGameModalOpen} 
        onClose={() => setIsNewGameModalOpen(false)} 
        title={`New Game: ${currentGroup?.name}`}
      >
        <div className="space-y-6">
          {/* Game Type Selection */}
          <div className="flex gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
             <button 
                onClick={() => handleGameModeChange('SINGLE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded transition-all ${gameMode === 'SINGLE' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}
             >
                <Coins size={16} />
                All Chips Same Value
             </button>
             <button 
                onClick={() => handleGameModeChange('MULTI')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded transition-all ${gameMode === 'MULTI' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}
             >
                <Banknote size={16} />
                Different Values
             </button>
          </div>
          
          {gameMode === 'SINGLE' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <Input 
                label="Chip Value ($)"
                type="number"
                step="0.01"
                value={newGameChipValue}
                onChange={(e) => {
                  setNewGameChipValue(e.target.value);
                }}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-neutral-300">Select Players & Starting Stack</h3>
              <div className="text-xs text-neutral-400">
                {newGamePlayers.length} selected
              </div>
            </div>
            
            <div className="max-h-[40vh] overflow-y-auto border border-neutral-800 rounded-lg bg-neutral-900">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-800 text-neutral-400 sticky top-0">
                  <tr>
                    <th className="p-3 w-10"></th>
                    <th className="p-3">Player</th>
                    {gameMode === 'SINGLE' ? (
                       <>
                         <th className="p-3 w-32">Buy-In (Chips)</th>
                         <th className="p-3 w-24 text-right">Value ($)</th>
                       </>
                    ) : (
                       <th className="p-3 w-32 text-right">Value ($)</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {groupPlayers.length === 0 && (
                    <tr>
                       <td colSpan={4} className="p-4 text-center text-neutral-500">No players in this group yet. Go to Players tab to add.</td>
                    </tr>
                  )}
                  {groupPlayers.map(p => {
                    const isSelected = newGamePlayers.includes(p.id);
                    // Default varies by mode
                    const defaultVal = gameMode === 'SINGLE' ? '100' : '25';
                    const inputValueStr = newGameBuyIns[p.id] || defaultVal;
                    
                    const chipValNum = parseFloat(newGameChipValue) || 0;
                    const inputNum = parseFloat(inputValueStr) || 0;
                    const totalVal = gameMode === 'SINGLE' ? inputNum * chipValNum : inputNum;

                    return (
                      <tr 
                        key={p.id} 
                        className={`transition-colors ${isSelected ? 'bg-red-900/10' : 'hover:bg-neutral-800/50'}`}
                      >
                        <td className="p-3">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePlayerSelection(p.id)}
                            className="rounded border-neutral-600 bg-neutral-800 text-red-600 focus:ring-red-600 accent-red-600"
                          />
                        </td>
                        <td 
                          className="p-3 font-medium cursor-pointer"
                          onClick={() => togglePlayerSelection(p.id)}
                        >
                          {p.name}
                        </td>
                        
                        {gameMode === 'SINGLE' ? (
                            <>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    step="1" 
                                    disabled={!isSelected}
                                    value={inputValueStr}
                                    onChange={(e) => handleBuyInChange(p.id, e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-right disabled:opacity-30 disabled:cursor-not-allowed focus:border-red-600 focus:outline-none"
                                  />
                                </td>
                                <td className="p-3 text-right font-mono text-neutral-300">
                                  {isSelected ? formatCurrency(totalVal) : '-'}
                                </td>
                            </>
                        ) : (
                            <td className="p-3">
                                <input
                                type="number"
                                step="1" 
                                disabled={!isSelected}
                                value={inputValueStr}
                                onChange={(e) => handleBuyInChange(p.id, e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-right disabled:opacity-30 disabled:cursor-not-allowed focus:border-red-600 focus:outline-none font-mono"
                                />
                            </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Add Player (Directly into group) */}
          <div className="flex gap-2 items-end pt-2 border-t border-neutral-800">
             <Input 
                placeholder="New Player Name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayerInModal()}
                className="py-1.5"
             />
             <Button variant="secondary" onClick={handleCreatePlayerInModal} icon={<Plus size={16}/>}>Add</Button>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleStartNewGame}
            disabled={newGamePlayers.length < 2}
          >
            Start Game ({newGamePlayers.length} Players)
          </Button>
        </div>
      </Modal>
    </div>
  );
}