import React, { useState, useEffect } from 'react';
import { GameSession, Player, Transaction, TransactionType } from './types';
import { api } from './services/gameService';
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
  const [newGameBuyIns, setNewGameBuyIns] = useState<Record<string, string>>({}); // ID -> Amount
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
       const amount = parseFloat(newGameBuyIns[p.id] || (100 * chipValue).toString());
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
       const defaultBuyIn = (parseFloat(newGameChipValue) || 0.25) * 100;
       setNewGameBuyIns(prev => ({ ...prev, [newPlayer.id]: defaultBuyIn.toString() }));
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
        // Set default buy-in to 100 BBs based on chip value
        const defaultBuyIn = (parseFloat(newGameChipValue) || 0.25) * 100;
        setNewGameBuyIns(prevBI => ({ ...prevBI, [id]: defaultBuyIn.toString() }));
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center">
          <Database size={48} className="mb-4 text-emerald-600"/>
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
            <div className="relative overflow-hidden rounded-3xl bg-emerald-900 p-8 sm:p-12 border border-emerald-700/30">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-20"></div>
              <div className="relative z-10">
                <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">ChipTracker</h1>
                <p className="text-emerald-200 text-lg max-w-xl mb-8">
                  Professional bankroll and game management for your home poker nights. Track buy-ins, loans, and settlements with precision.
                </p>
                
                {active ? (
                  <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-xl border border-emerald-500/30 inline-block w-full max-w-md">
                    <p className="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-2">Game in Progress</p>
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-white font-medium">{new Date(active.startTime).toLocaleString()}</span>
                       <span className="text-slate-400 text-sm">{active.players.length} Players</span>
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
                 <h2 className="text-xl font-bold text-white">Recent Games</h2>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 font-bold text-xl cursor-pointer"
            onClick={() => setCurrentView(View.DASHBOARD)}
          >
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <span className="font-serif">♠</span>
            </div>
            <span>ChipTracker</span>
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
               // If user changes chip value, update selected buy-ins to 100x new value?
               // Let's just update the buy-ins that haven't been manually touched, but for simplicity
               // we will just leave them as they are or the user will re-select.
               // Actually, updating the placeholder default logic is enough for new selections.
             }}
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-300">Select Players & Buy-In</h3>
              <div className="text-xs text-slate-400">
                {newGamePlayers.length} selected
              </div>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto border border-slate-700 rounded-lg bg-slate-900/50">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-3 w-10"></th>
                    <th className="p-3">Player</th>
                    <th className="p-3 w-32">Initial Buy-In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {players.length === 0 && (
                    <tr>
                       <td colSpan={3} className="p-4 text-center text-slate-500">No players found.</td>
                    </tr>
                  )}
                  {players.map(p => {
                    const isSelected = newGamePlayers.includes(p.id);
                    return (
                      <tr 
                        key={p.id} 
                        className={`transition-colors ${isSelected ? 'bg-emerald-900/10' : 'hover:bg-slate-800/50'}`}
                      >
                        <td className="p-3">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePlayerSelection(p.id)}
                            className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
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
                            step="0.01" 
                            disabled={!isSelected}
                            value={newGameBuyIns[p.id] || ((parseFloat(newGameChipValue) || 0.25) * 100).toString()}
                            onChange={(e) => handleBuyInChange(p.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right disabled:opacity-30 disabled:cursor-not-allowed focus:border-emerald-500 focus:outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Add Player */}
          <div className="flex gap-2 items-end pt-2 border-t border-slate-800">
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