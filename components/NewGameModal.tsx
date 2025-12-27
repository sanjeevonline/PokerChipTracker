
import React, { useState } from 'react';
import { Player, Group, GameSession, Transaction, TransactionType } from '../types';
import { Modal, Button, Input } from './UI';
import { formatCurrency } from '../services/gameService';
import { Plus, AlertCircle } from 'lucide-react';

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
      if (updatedBuyIns[id] === '100' && mode === 'MULTI') updatedBuyIns[id] = '25';
      else if (updatedBuyIns[id] === '25' && mode === 'SINGLE') updatedBuyIns[id] = '100';
    });
    setNewGameBuyIns(updatedBuyIns);
  };

  const togglePlayerSelection = (id: string) => {
    setNewGamePlayers(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      else {
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

  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim() || isDuplicateName || isCreating) return;
    setIsCreating(true);
    try {
      const player = await onCreatePlayer(newPlayerName);
      setNewPlayerName('');
      setNewGamePlayers(prev => Array.from(new Set([...prev, player.id])));
      const defaultAmount = gameMode === 'SINGLE' ? '100' : '25';
      setNewGameBuyIns(prev => ({ ...prev, [player.id]: defaultAmount }));
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
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`New Game: ${currentGroup?.name}`}>
      <div className="space-y-6">
        <div className="flex gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
          <button onClick={() => handleGameModeChange('SINGLE')} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded transition-all ${gameMode === 'SINGLE' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}>Fixed Value</button>
          <button onClick={() => handleGameModeChange('MULTI')} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded transition-all ${gameMode === 'MULTI' ? 'bg-neutral-800 text-white shadow shadow-black' : 'text-neutral-500 hover:text-neutral-300'}`}>Mixed Values</button>
        </div>
        {gameMode === 'SINGLE' && <Input label="Chip Value ($)" type="number" step="0.01" value={newGameChipValue} onChange={(e) => setNewGameChipValue(e.target.value)} className={noArrowsClass} />}
        
        <div className="space-y-2">
          <div className="max-h-[35vh] overflow-y-auto border border-neutral-800 rounded-lg bg-neutral-900">
            <table className="w-full text-left text-sm table-fixed">
              <thead className="bg-neutral-800 text-neutral-400 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Player</th>
                  <th className="p-3 w-20 text-right">{gameMode === 'SINGLE' ? 'Chips' : '$ Value'}</th>
                  <th className="p-3 w-20 text-right">$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {groupPlayers.map(p => {
                  const isSelected = newGamePlayers.includes(p.id);
                  const calculatedValue = gameMode === 'SINGLE' ? (parseFloat(newGameBuyIns[p.id] || '0') * (parseFloat(newGameChipValue) || 0)) : parseFloat(newGameBuyIns[p.id] || '0');
                  return (
                    <tr key={p.id} className={`${isSelected ? 'bg-red-900/10' : ''}`}>
                      <td className="p-3"><input type="checkbox" checked={isSelected} onChange={() => togglePlayerSelection(p.id)} /></td>
                      <td className="p-3 font-medium truncate">{p.name}</td>
                      <td className="p-3"><input type="number" disabled={!isSelected} value={newGameBuyIns[p.id] || ''} onChange={(e) => handleBuyInChange(p.id, e.target.value)} className={`w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-right ${noArrowsClass}`} /></td>
                      <td className="p-3 text-right font-mono text-neutral-500 text-[10px]">{formatCurrency(calculatedValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-800 space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input 
                placeholder="New Player Name" 
                value={newPlayerName} 
                onChange={(e) => setNewPlayerName(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayer()} 
                error={isDuplicateName ? "This player already exists in the group." : undefined}
              />
            </div>
            <Button 
              variant="secondary" 
              onClick={handleCreatePlayer} 
              disabled={!newPlayerName.trim() || isDuplicateName || isCreating}
              icon={<Plus size={16} />}
            >
              Add
            </Button>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleStart} disabled={newGamePlayers.length < 2}>
          Start Game ({newGamePlayers.length} Players)
        </Button>
      </div>
    </Modal>
  );
};
