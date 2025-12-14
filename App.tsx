import React, { useState, useEffect } from 'react';
import { GameSession, Player, Transaction, TransactionType } from './types';
import { api, formatCurrency } from './services/gameService';
import { ActiveGame } from './components/ActiveGame';
import { SettlementReport } from './components/SettlementReport';
import { History } from './components/History';
import { PlayersList } from './components/PlayersList';
import { PlayerProfile } from './components/PlayerProfile';
import { Button, Modal, Input, Card } from './components/UI';
import { Plus, LayoutDashboard, Settings, Users, Database } from 'lucide-react'; 

enum View {
  DASHBOARD,
  ACTIVE_GAME,
  SETTLEMENT,
  HISTORY,
  PLAYERS,
  PLAYER_PROFILE
}

export default function App() {
  const [games, setGames] = useState<GameSession[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [viewingGameId, setViewingGameId] = useState<string | null>(null);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  
  // New Game Modal State
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [newGamePlayers, setNewGamePlayers] = useState<string[]>([]); // Selected IDs
  const [newGameBuyIns, setNewGameBuyIns] = useState<Record<string, string>>({}); // ID -> Chip Count
  const [newGameChipValue, setNewGameChipValue] = useState<string>('0.25');
  const [newPlayerName, setNewPlayerName] = useState('');

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [fetchedGames, fetchedPlayers] = await Promise.all([
        api.fetchGames(),
        api.fetchPlayers()
      ]);
      setGames(fetchedGames);
      setPlayers(fetchedPlayers);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // --- Actions ---

  const handleStartNewGame = async () => {
    if (newGamePlayers.length < 2) return;

    const selectedPlayers = players.filter(p => newGamePlayers.includes(p.id));
    const startTime = Date.now();
    const chipValue = parseFloat(newGameChipValue) || 0.25;
    
    // Create Initial Transactions
    const initialTransactions: Transaction[] = [];
    selectedPlayers.forEach(p => {
       const chips = parseFloat(newGameBuyIns[p.id] || '100');
       // Calculate actual currency amount based on chip count * chip value
       const amount = chips * chipValue;
       
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
      startTime: startTime,
      players: selectedPlayers,
      transactions: initialTransactions,
      playerStates: {},
      isActive: true,
      chipValue: chipValue
    };

    // Optimistic Update
    setGames([newGame, ...games]);
    setActiveGameId(newGame.id);
    setCurrentView(View.ACTIVE_GAME);
    setIsNewGameModalOpen(false);
    setNewGamePlayers([]);
    setNewGameBuyIns({});
    setNewGameChipValue('0.25');

    // Persist
    await api.saveGame(newGame);
  };

  const handleUpdateGame = async (updatedGame: GameSession) => {
    // Optimistic Update
    setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
    
    // Persist
    await api.saveGame(updatedGame);
  };

  const handleEditGame = (gameId: string) => {
    const gameToEdit = games.find(g => g.id === gameId);
    if (!gameToEdit) return;

    // Reactivate the game locally to allow editing in ActiveGame component
    const updatedGame = { ...gameToEdit, isActive: true };
    handleUpdateGame(updatedGame);
    
    setActiveGameId(gameId);
    setCurrentView(View.ACTIVE_GAME);
  };

  const createPlayer = (name: string): Player => {
    const newPlayer = { id: crypto.randomUUID(), name: name.trim() };
    return newPlayer; // return object for immediate use, persistence happens in handler
  };

  const handleCreatePlayerInModal = async () => {
    if (!newPlayerName.trim()) return;
    
    const newPlayer = createPlayer(newPlayerName);
    
    // Optimistic Update
    const updatedPlayers = [...players, newPlayer].sort((a, b) => a.name.localeCompare(b.name));
    setPlayers(updatedPlayers);
    
    setNewPlayerName('');
    
    // Auto select new player in modal
    if (isNewGameModalOpen) {
       setNewGamePlayers(prev => [...prev, newPlayer.id]);
       // Default to 100 chips
       setNewGameBuyIns(prev => ({ ...prev, [newPlayer.id]: '100' }));
    }

    // Persist
    await api.savePlayer(newPlayer);
    
    return newPlayer;
  };

  // Wrapper for ActiveGame to create players on the fly
  const handleCreatePlayerFromGame = async (name: string) => {
    const newPlayer = createPlayer(name);
    const updatedPlayers = [...players, newPlayer].sort((a, b) => a.name.localeCompare(b.name));
    setPlayers(updatedPlayers);
    await api.savePlayer(newPlayer);
    return newPlayer;
  }

  const togglePlayerSelection = (id: string) => {
    setNewGamePlayers(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        // Set default buy-in to 100 Chips
        setNewGameBuyIns(prevBI => ({ ...prevBI, [id]: '100' }));
        return [...prev, id];
      }
    });
  };

  const handleBuyInChange = (id: string, value: string) => {
    setNewGameBuyIns(prev => ({ ...prev, [id]: value }));
  };

  // --- View Helpers ---

  const activeGame = games.find(g => g.id === activeGameId);
  const viewingGame = games.find(g => g.id === viewingGameId);
  const viewingPlayer = players.find(p => p.id === viewingPlayerId);

  // Resume active game if exists on load
  useEffect(() => {
    if (!isLoading) {
      const active = games.find(g => g.isActive);
      if (active && currentView === View.DASHBOARD && !activeGameId) {
        // Optional: Auto-resume logic could go here
      }
    }
  }, [games, isLoading, currentView, activeGameId]);

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

  const renderContent = () => {
    switch (currentView) {
      case View.ACTIVE_GAME:
        if (!activeGame) return <div>Error: Game not found</div>;
        return (
          <ActiveGame 
            game={activeGame} 
            allPlayers={players}
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
            games={games.filter(g => !g.isActive)} 
            onSelectGame={(g) => {
              setViewingGameId(g.id);
              setCurrentView(View.SETTLEMENT);
            }} 
          />
        );
      case View.PLAYERS:
        return (
          <PlayersList 
            players={players} 
            games={games}
            onSelectPlayer={(id) => {
              setViewingPlayerId(id);
              setCurrentView(View.PLAYER_PROFILE);
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
        const active = games.find(g => g.isActive);
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950 to-neutral-900 p-8 sm:p-12 border border-red-900/30">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-20"></div>
              <div className="relative z-10">
                <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">ChipTracker</h1>
                <p className="text-red-200/80 text-lg max-w-xl mb-8">
                  Professional bankroll and game management for your home poker nights.
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
                games={games.filter(g => !g.isActive).slice(0, 3)} 
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
            onClick={() => setCurrentView(View.DASHBOARD)}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform">
              <span className="font-serif text-lg">♠</span>
            </div>
            <span className="group-hover:text-white transition-colors">ChipTracker</span>
          </div>
          
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
        title="Setup New Game"
      >
        <div className="space-y-6">
          <Input 
             label="Chip Value ($)"
             type="number"
             step="0.01"
             value={newGameChipValue}
             onChange={(e) => {
               setNewGameChipValue(e.target.value);
             }}
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-neutral-300">Select Players & Buy-In</h3>
              <div className="text-xs text-neutral-400">
                {newGamePlayers.length} selected
              </div>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto border border-neutral-800 rounded-lg bg-neutral-900">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-800 text-neutral-400 sticky top-0">
                  <tr>
                    <th className="p-3 w-10"></th>
                    <th className="p-3">Player</th>
                    <th className="p-3 w-32">Buy-In (Chips)</th>
                    <th className="p-3 w-24 text-right">Value ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {players.length === 0 && (
                    <tr>
                       <td colSpan={4} className="p-4 text-center text-neutral-500">No players found.</td>
                    </tr>
                  )}
                  {players.map(p => {
                    const isSelected = newGamePlayers.includes(p.id);
                    const chipCountStr = newGameBuyIns[p.id] || '100';
                    const chipValNum = parseFloat(newGameChipValue) || 0;
                    const chipCountNum = parseFloat(chipCountStr) || 0;
                    const totalVal = chipCountNum * chipValNum;

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
                        <td className="p-3">
                          <input
                            type="number"
                            step="1" 
                            disabled={!isSelected}
                            value={chipCountStr}
                            onChange={(e) => handleBuyInChange(p.id, e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-right disabled:opacity-30 disabled:cursor-not-allowed focus:border-red-600 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-right font-mono text-neutral-300">
                          {isSelected ? formatCurrency(totalVal) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Add Player */}
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