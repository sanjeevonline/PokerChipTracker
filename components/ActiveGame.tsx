import React, { useState, useMemo } from 'react';
import { GameSession, TransactionType, Player, Transaction } from '../types';
import { Button, Card, Modal, Input, Select } from './UI';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Plus, ArrowRightLeft, DollarSign, History, AlertCircle, Save, UserPlus } from 'lucide-react';

interface ActiveGameProps {
  game: GameSession;
  allPlayers: Player[];
  onCreatePlayer: (name: string) => Promise<Player>;
  onUpdateGame: (game: GameSession) => void;
  onEndGame: () => void;
}

export const ActiveGame: React.FC<ActiveGameProps> = ({ game, allPlayers, onCreatePlayer, onUpdateGame, onEndGame }) => {
  const [modalType, setModalType] = useState<'BUY_IN' | 'TRANSFER' | 'COUNT_CHIPS' | 'ADD_PLAYER' | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(game.players[0]?.id || '');
  const [targetPlayerId, setTargetPlayerId] = useState<string>(game.players[1]?.id || '');
  const [amount, setAmount] = useState<string>('');
  
  // Add Player State
  const [newPlayerMode, setNewPlayerMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [playerToAddId, setPlayerToAddId] = useState<string>('');
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  
  // For final counting
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [showMismatchWarning, setShowMismatchWarning] = useState(false);

  const report = useMemo(() => calculateSettlement(game), [game]);

  const availablePlayers = allPlayers.filter(p => !game.players.some(gp => gp.id === p.id));

  // Calculate live discrepancy for the modal logic
  const totalRawCount = Object.values(counts).reduce((sum: number, val: unknown) => {
    const num = parseFloat(val as string);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const totalValueCalculated = game.chipValue ? totalRawCount * game.chipValue : totalRawCount;
  
  // Handle rounding for discrepancy check
  const totalValueRounded = Math.round(totalValueCalculated * 100) / 100;
  const discrepancy = Math.round((totalValueRounded - report.totalBuyIn) * 100) / 100;

  const handleTransaction = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: modalType === 'BUY_IN' ? TransactionType.BUY_IN : TransactionType.TRANSFER,
      fromId: modalType === 'BUY_IN' ? 'BANK' : selectedPlayerId,
      toId: modalType === 'BUY_IN' ? selectedPlayerId : targetPlayerId,
      amount: amt
    };

    const updatedGame = {
      ...game,
      transactions: [newTx, ...game.transactions]
    };

    onUpdateGame(updatedGame);
    closeModal();
  };

  const handleAddPlayer = async () => {
    let player: Player | undefined;

    if (newPlayerMode === 'EXISTING') {
      player = allPlayers.find(p => p.id === playerToAddId);
    } else {
      if (!newPlayerName.trim()) return;
      player = await onCreatePlayer(newPlayerName);
    }

    if (!player) return;

    // Create Updated Game
    const updatedGame = {
      ...game,
      players: [...game.players, player]
    };

    // If initial buy in provided
    const buyInAmt = parseFloat(amount);
    if (!isNaN(buyInAmt) && buyInAmt > 0) {
      updatedGame.transactions = [
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: TransactionType.BUY_IN,
          fromId: 'BANK',
          toId: player.id,
          amount: buyInAmt
        },
        ...updatedGame.transactions
      ];
    }

    onUpdateGame(updatedGame);
    closeModal();
    setNewPlayerName('');
    setAmount('');
  };

  const handleFinishAttempt = () => {
    // If there is a discrepancy and we haven't shown the warning yet, show it and stop.
    if (discrepancy !== 0 && !showMismatchWarning) {
      setShowMismatchWarning(true);
      return;
    }

    // Otherwise (no discrepancy OR user is forcing finish), save and close.
    const updatedStates = { ...game.playerStates };
    Object.entries(counts).forEach(([pid, val]) => {
      const num = parseFloat(val as string);
      if (!isNaN(num)) {
        // If chipValue is set, we convert the count to value here
        const finalValue = game.chipValue ? num * game.chipValue : num;
        updatedStates[pid] = {
          ...updatedStates[pid],
          finalChips: finalValue
        };
      }
    });

    const finishedGame = {
      ...game,
      playerStates: updatedStates,
      isActive: false,
      endTime: Date.now()
    };

    onUpdateGame(finishedGame);
    onEndGame();
  };

  const handleCountChange = (pid: string, val: string) => {
    setCounts(prev => ({ ...prev, [pid]: val }));
    // Reset warning if user edits values so they can try again or see if it fixes the issue
    if (showMismatchWarning) setShowMismatchWarning(false);
  };

  const closeModal = () => {
    setModalType(null);
    setAmount('');
    setNewPlayerName('');
    setShowMismatchWarning(false);
  };

  const openCountModal = () => {
    // Pre-fill with existing counts or 0
    // Note: finalChips is stored as DOLLAR VALUE. If chipValue is set, we need to convert back to count for editing.
    const initialCounts: Record<string, string> = {};
    game.players.forEach(p => {
       const moneyVal = game.playerStates[p.id]?.finalChips || 0;
       if (game.chipValue && game.chipValue > 0) {
          initialCounts[p.id] = (moneyVal / game.chipValue).toString();
       } else {
          initialCounts[p.id] = moneyVal.toString();
       }
    });
    setCounts(initialCounts);
    setShowMismatchWarning(false);
    setModalType('COUNT_CHIPS');
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 backdrop-blur-md sticky top-4 z-10 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold text-white">Active Session</h2>
          <p className="text-slate-400 text-sm flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Started {new Date(game.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            <span className="mx-1">•</span>
            {game.players.length} Players
            <span className="mx-1">•</span>
            Bank: {formatCurrency(report.totalBuyIn)}
            {game.chipValue && (
              <>
                <span className="mx-1">•</span>
                <span className="text-emerald-400">Chip Value: {formatCurrency(game.chipValue)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button onClick={() => setModalType('BUY_IN')} icon={<Plus size={18} />}>Buy In</Button>
          <Button onClick={() => setModalType('TRANSFER')} variant="secondary" icon={<ArrowRightLeft size={18} />}>Transfer</Button>
          <Button onClick={() => setModalType('ADD_PLAYER')} variant="secondary" icon={<UserPlus size={18} />}>Add Player</Button>
          <Button onClick={openCountModal} variant="danger" icon={<Save size={18} />}>End Game</Button>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {game.players.map(player => {
          const stats = report.players.find(p => p.playerId === player.id);
          if (!stats) return null;

          return (
            <Card key={player.id} className="relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{player.name}</h3>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Status</div>
                </div>
                <div className="bg-slate-900/50 p-2 rounded-lg text-emerald-400 font-mono text-xl font-bold border border-slate-700/50">
                   {formatCurrency(stats.netInvested)}
                   <span className="text-[10px] text-slate-500 block text-right font-sans font-normal">INVESTED</span>
                </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Buy-ins</span>
                    <span className="text-slate-200">{formatCurrency(stats.totalBuyIn)}</span>
                 </div>
                 {stats.transfersIn > 0 && (
                   <div className="flex justify-between text-sm">
                      <span className="text-red-400">Borrowed</span>
                      <span className="text-red-300">+{formatCurrency(stats.transfersIn)}</span>
                   </div>
                 )}
                 {stats.transfersOut > 0 && (
                   <div className="flex justify-between text-sm">
                      <span className="text-emerald-400">Loaned</span>
                      <span className="text-emerald-300">-{formatCurrency(stats.transfersOut)}</span>
                   </div>
                 )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card title="Ledger" className="h-96 overflow-y-auto">
        <div className="space-y-3">
          {game.transactions.length === 0 ? (
            <div className="text-center text-slate-500 py-10 flex flex-col items-center">
              <History size={48} className="mb-4 opacity-20" />
              <p>No transactions yet. Buy chips to start.</p>
            </div>
          ) : (
            game.transactions.map(tx => {
              const fromName = tx.fromId === 'BANK' ? 'Bank' : game.players.find(p => p.id === tx.fromId)?.name || 'Unknown';
              const toName = tx.toId === 'BANK' ? 'Bank' : game.players.find(p => p.id === tx.toId)?.name || 'Unknown';
              
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-700/30">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === 'BUY_IN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {tx.type === 'BUY_IN' ? <DollarSign size={16} /> : <ArrowRightLeft size={16} />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">
                          {tx.type === 'BUY_IN' 
                            ? `${toName} bought in` 
                            : `${fromName} ➔ ${toName}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                   </div>
                   <div className="font-mono font-bold text-slate-200">
                      {formatCurrency(tx.amount)}
                   </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Buy In Modal */}
      <Modal 
        isOpen={modalType === 'BUY_IN'} 
        onClose={closeModal}
        title="Buy Chips from Bank"
      >
        <div className="space-y-4">
          <Select 
            label="Player"
            options={game.players.map(p => ({ value: p.id, label: p.name }))}
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
          />
          <Input 
            label="Amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500"
            autoFocus
          />
          <Button className="w-full" onClick={handleTransaction}>Confirm Buy In</Button>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal 
        isOpen={modalType === 'TRANSFER'} 
        onClose={closeModal}
        title="Transfer Chips (Loan)"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="From (Lender)"
              options={game.players.map(p => ({ value: p.id, label: p.name }))}
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
            />
             <Select 
              label="To (Borrower)"
              options={game.players.map(p => ({ value: p.id, label: p.name }))}
              value={targetPlayerId}
              onChange={(e) => setTargetPlayerId(e.target.value)}
            />
          </div>
          {selectedPlayerId === targetPlayerId && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={12}/> Cannot transfer to self
            </p>
          )}
          <Input 
            label="Amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            autoFocus
          />
          <Button 
            className="w-full" 
            onClick={handleTransaction}
            disabled={selectedPlayerId === targetPlayerId}
          >
            Confirm Transfer
          </Button>
        </div>
      </Modal>

      {/* Add Player Modal */}
      <Modal
        isOpen={modalType === 'ADD_PLAYER'}
        onClose={closeModal}
        title="Add Player to Table"
      >
        <div className="space-y-4">
           <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
             <button 
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${newPlayerMode === 'EXISTING' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setNewPlayerMode('EXISTING')}
             >
               Existing Player
             </button>
             <button 
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${newPlayerMode === 'NEW' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setNewPlayerMode('NEW')}
             >
               Create New
             </button>
           </div>

           {newPlayerMode === 'EXISTING' ? (
             availablePlayers.length > 0 ? (
                <Select 
                  label="Select Player"
                  options={availablePlayers.map(p => ({ value: p.id, label: p.name }))}
                  value={playerToAddId}
                  onChange={(e) => setPlayerToAddId(e.target.value)}
                />
             ) : (
                <p className="text-center text-slate-500 py-2">All existing players are already in the game.</p>
             )
           ) : (
             <Input 
                label="Player Name"
                placeholder="Enter name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                autoFocus
             />
           )}
           
           <Input 
              label="Initial Buy-In (Optional)"
              type="number"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
           />

           <Button 
              className="w-full" 
              onClick={handleAddPlayer}
              disabled={newPlayerMode === 'EXISTING' && !playerToAddId && availablePlayers.length > 0}
           >
             Add to Game
           </Button>
        </div>
      </Modal>

      {/* End Game Modal */}
      <Modal
        isOpen={modalType === 'COUNT_CHIPS'}
        onClose={closeModal}
        title="Final Chip Count"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          
          <div className={`grid ${game.chipValue ? 'grid-cols-3' : 'grid-cols-2'} gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700`}>
             <div className="text-center border-r border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bank Total</div>
                <div className="text-xl font-bold text-white font-mono">{formatCurrency(report.totalBuyIn)}</div>
             </div>
             {game.chipValue && (
               <div className="text-center border-r border-slate-700">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Chips</div>
                  <div className="text-xl font-bold text-slate-200 font-mono">{totalRawCount}</div>
               </div>
             )}
             <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Value</div>
                <div className={`text-xl font-bold font-mono ${discrepancy === 0 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                   {formatCurrency(totalValueRounded)}
                </div>
             </div>
          </div>

          <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
            <span>Player</span>
            <div className="flex gap-4">
              <span>{game.chipValue ? 'Chip Count' : 'Value ($)'}</span>
              {game.chipValue && <span className="w-20 text-right">Value ($)</span>}
            </div>
          </div>

          {game.players.map(p => {
            const raw = parseFloat(counts[p.id] || '0');
            const calculatedVal = isNaN(raw) ? 0 : raw * (game.chipValue || 1);

            return (
              <div key={p.id} className="flex items-center justify-between gap-4 py-1">
                 <label className="text-sm font-medium text-slate-200">{p.name}</label>
                 <div className="flex items-center gap-4">
                   <Input 
                     type="number" 
                     step={game.chipValue ? "1" : "0.01"}
                     className="w-24 text-right font-mono py-1.5 h-8"
                     value={counts[p.id] || '0'}
                     onChange={(e) => handleCountChange(p.id, e.target.value)}
                   />
                   {game.chipValue && (
                     <div className="w-20 text-right font-mono text-emerald-400 text-sm">
                        {formatCurrency(calculatedVal)}
                     </div>
                   )}
                 </div>
              </div>
            );
          })}

          {/* Discrepancy Error Message - Only shown after attempted finish */}
          {showMismatchWarning && discrepancy !== 0 && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
               <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
               <div className="text-sm">
                  <div className="font-bold text-red-400">Mismatch Detected</div>
                  <div className="text-red-300 mt-1">
                    The total counted value ({formatCurrency(totalValueRounded)}) does not match the total bank buy-in ({formatCurrency(report.totalBuyIn)}).
                  </div>
                  <div className="font-mono font-bold text-red-400 mt-1">
                    Difference: {discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
                  </div>
                  <div className="text-xs text-red-400/70 mt-2">
                    Correct the counts above or click "Force Finish" to proceed anyway.
                  </div>
               </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800">
             <Button 
               className="w-full" 
               variant={showMismatchWarning && discrepancy !== 0 ? 'secondary' : 'danger'} 
               onClick={handleFinishAttempt}
             >
                {showMismatchWarning && discrepancy !== 0 ? 'Force Finish & Save' : 'Finalize Game'}
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};