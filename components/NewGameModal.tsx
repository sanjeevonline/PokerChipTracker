
import React, { useState } from 'react';
import { Player, Group, GameSession, Transaction, TransactionType } from '../types';
import { Modal, Button, Input } from './UI';
import { formatCurrency } from '../services/gameService';
import { Plus, AlertCircle, Coins, DollarSign } from 'lucide-react';

interface NewGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroup: Group | undefined;
  groupPlayers: Player[];
  onCreatePlayer: (name: string) => Promise<Player>;
  onStartGame: (game: GameSession) => void;
}

export const NewGameModal: React.FC<NewGameModalProps> = ({
  isOpen,
  onClose,
  currentGroup,
  groupPlayers,
  onCreatePlayer,
  onStartGame
}) => {
  const [gameMode, setGameMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [newGamePlayers, setNewGamePlayers] = useState<string[]>([]);
  const [newGameBuyIns, setNewGameBuyIns] = useState<Record<string, string>>({});
  const [newGameChipValue, setNewGameChipValue] = useState<string>('0.25');
  const [defaultBuyIn, setDefaultBuyIn] = useState<string>('25'); // Default for MULTI mode
  const [defaultChips, setDefaultChips] = useState<string>('100'); // Default for SINGLE mode
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const noArrowsClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const isDuplicateName = groupPlayers.some(
    p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
  );

  const handleGameModeChange = (mode: 'SINGLE' | 'MULTI') => {
    setGameMode(mode);
    const updatedBuyIns = { ...newGameBuyIns };
    newGamePlayers.forEach(id => {
      // If the current buy-in matches the old mode's default, swap it to the new mode's default
      if (mode === 'MULTI' && updatedBuyIns[id] === defaultChips) {
        updatedBuyIns[id] = defaultBuyIn;
      } else if (mode === 'SINGLE' && updatedBuyIns[id] === defaultBuyIn) {
        updatedBuyIns[id] = defaultChips;
      }
    });
    setNewGameBuyIns(updatedBuyIns);
  };

  const togglePlayerSelection = (id: string) => {
    setNewGamePlayers(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      else {
        setNewGameBuyIns(prevBI => {
          if (!prevBI[id]) {
            const initialAmt = gameMode === 'SINGLE' ? defaultChips : defaultBuyIn;
            return { ...prevBI, [id]: initialAmt };
          }
          return prevBI;
        });
        return [...prev, id];
      }
    });
  };

  const handleApplyDefaultToAll = () => {
    const currentDefault = gameMode === 'SINGLE' ? defaultChips : defaultBuyIn;
    const updated = { ...newGameBuyIns };
    newGamePlayers.forEach(id => {
      updated[id] = currentDefault;
    });
    setNewGameBuyIns(updated);
  };

  const handleBuyInChange = (id: string, value: string) => {
    setNewGameBuyIns(prev => ({ ...prev, [id]: value }));
  };

  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim() || isDuplicateName || isCreating) return;
    setIsCreating(true);
    try {
      const player = await onCreatePlayer(newPlayerName);
      setNewPlayerName('');
      setNewGamePlayers(prev => Array.from(new Set([...prev, player.id])));
      const initialAmt = gameMode === 'SINGLE' ? defaultChips : defaultBuyIn;
      setNewGameBuyIns(prev => ({ ...prev, [player.id]: initialAmt }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStart = () => {
    if (newGamePlayers.length < 2 || !currentGroup) return;
    const selectedPlayers = groupPlayers.filter(p => newGamePlayers.includes(p.id));
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
      groupId: currentGroup.id,
      startTime: startTime,
      players: selectedPlayers,
      transactions: initialTransactions,
      playerStates: {},
      isActive: true,
      chipValue: chipValue
    };

    onStartGame(newGame);
    onClose();
    // Reset state for next time
    setNewGamePlayers([]);
    setNewGameBuyIns({});
    setNewGameChipValue('0.25');
    setGameMode('SINGLE');
    setDefaultBuyIn('25');
    setDefaultChips('100');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`New Game: ${currentGroup?.name}`}>
      <div className="space-y-6">
        <div className="flex gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
          <button onClick={() => handleGameModeChange('SINGLE')} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded transition-all ${gameMode === 'SINGLE' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}>Fixed Value</button>
          <button onClick={() => handleGameModeChange('MULTI')} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded transition-all ${gameMode === 'MULTI' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}>Mixed Values</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800/50">
          <div className="space-y-1">
            <Input 
              label={gameMode === 'SINGLE' ? "Default Buy-In (Chips)" : "Default Buy-In ($)"} 
              type="number" 
              value={gameMode === 'SINGLE' ? defaultChips : defaultBuyIn} 
              onChange={(e) => gameMode === 'SINGLE' ? setDefaultChips(e.target.value) : setDefaultBuyIn(e.target.value)} 
              className={noArrowsClass}
              placeholder="0"
            />
            {newGamePlayers.length > 0 && (
              <button 
                onClick={handleApplyDefaultToAll}
                className="text-[9px] font-black uppercase text-red-500 hover:text-red-400 transition-colors tracking-widest pl-1"
              >
                Apply to all selected
              </button>
            )}
          </div>

          {gameMode === 'SINGLE' && (
            <Input 
              label="Individual Chip Value ($)" 
              type="number" 
              step="0.01" 
              value={newGameChipValue} 
              onChange={(e) => setNewGameChipValue(e.target.value)} 
              className={noArrowsClass} 
            />
          )}
        </div>
        
        <div className="space-y-2">
          <div className="max-h-[35vh] overflow-y-auto border border-neutral-800 rounded-lg bg-neutral-900">
            <table className="w-full text-left text-sm table-fixed">
              <thead className="bg-neutral-800 text-neutral-400 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Player</th>
                  <th className="p-3 w-28 text-right">{gameMode === 'SINGLE' ? 'Chips' : '$ Value'}</th>
                  <th className="p-3 w-24 text-right">$ Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {groupPlayers.map(p => {
                  const isSelected = newGamePlayers.includes(p.id);
                  const calculatedValue = gameMode === 'SINGLE' 
                    ? (parseFloat(newGameBuyIns[p.id] || '0') * (parseFloat(newGameChipValue) || 0)) 
                    : parseFloat(newGameBuyIns[p.id] || '0');
                  
                  return (
                    <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-red-950/20' : 'hover:bg-neutral-800/30'}`}>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => togglePlayerSelection(p.id)}
                          className="w-4 h-4 rounded border-neutral-800 bg-neutral-900 text-red-600 focus:ring-red-600 focus:ring-offset-neutral-900"
                        />
                      </td>
                      <td className="p-3 font-medium truncate text-neutral-200">{p.name}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-end">
                           <input 
                             type="number" 
                             disabled={!isSelected} 
                             value={newGameBuyIns[p.id] || ''} 
                             onChange={(e) => handleBuyInChange(p.id, e.target.value)} 
                             className={`w-20 bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-right font-mono text-xs ${noArrowsClass} ${!isSelected ? 'opacity-20' : 'text-white border-neutral-700'}`} 
                           />
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-neutral-500 text-[10px] whitespace-nowrap">
                        {formatCurrency(calculatedValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {groupPlayers.length === 0 && (
            <div className="text-center py-8 text-neutral-600 text-xs italic border border-dashed border-neutral-800 rounded-lg">
              No players found in this group roster.
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-neutral-800 space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input 
                placeholder="Add missing player..." 
                value={newPlayerName} 
                onChange={(e) => setNewPlayerName(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayer()} 
                error={isDuplicateName ? "This player already exists." : undefined}
                className="text-xs py-2"
              />
            </div>
            <Button 
              variant="secondary" 
              onClick={handleCreatePlayer} 
              disabled={!newPlayerName.trim() || isDuplicateName || isCreating}
              className="py-2 h-10"
              icon={<Plus size={16} />}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
           <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              Pot: <span className="text-white font-mono">{formatCurrency(
                newGamePlayers.reduce((sum, id) => {
                  const val = parseFloat(newGameBuyIns[id] || '0');
                  const multiplier = gameMode === 'SINGLE' ? (parseFloat(newGameChipValue) || 0) : 1;
                  return sum + (val * multiplier);
                }, 0)
              )}</span>
           </div>
           <Button className="flex-1" size="lg" onClick={handleStart} disabled={newGamePlayers.length < 2}>
             Start Session ({newGamePlayers.length})
           </Button>
        </div>
      </div>
    </Modal>
  );
};
