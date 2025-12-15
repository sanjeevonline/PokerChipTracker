import React, { useState, useMemo } from 'react';
import { GameSession, TransactionType, Player, Transaction } from '../types';
import { Button, Card, Modal, Input, Select } from './UI';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Plus, ArrowRightLeft, DollarSign, History, AlertCircle, Save, UserPlus, LogOut } from 'lucide-react';

interface ActiveGameProps {
  game: GameSession;
  allPlayers: Player[];
  onCreatePlayer: (name: string) => Promise<Player>;
  onUpdateGame: (game: GameSession) => void;
  onEndGame: () => void;
}

export const ActiveGame: React.FC<ActiveGameProps> = ({ game, allPlayers, onCreatePlayer, onUpdateGame, onEndGame }) => {
  const [modalType, setModalType] = useState<'BUY_IN' | 'TRANSFER' | 'CASH_OUT' | 'COUNT_CHIPS' | 'ADD_PLAYER' | null>(null);
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
  
  // If chipValue is missing, it's Multi-Denom mode (Values are tracked in dollars directly)
  const isMultiDenom = game.chipValue === undefined || game.chipValue === null;

  // Calculate live discrepancy for the modal logic
  const totalRawCount: number = (Object.values(counts) as string[]).reduce((sum: number, val: string) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const currentChipValue = game.chipValue;
  
  // Logic for End Game calc
  // If single denom, total value = count * chip value
  // If multi denom, total value = raw count (since inputs are dollars)
  const totalValueCalculated: number = (typeof currentChipValue === 'number') 
    ? totalRawCount * currentChipValue 
    : totalRawCount;
  
  // Target in Chips (only used for Single Denom UI)
  const targetChips = (typeof currentChipValue === 'number' && currentChipValue > 0)
    ? report.totalBuyIn / currentChipValue
    : report.totalBuyIn;

  // Handle rounding for discrepancy check
  const totalValueRounded = Math.round(totalValueCalculated * 100) / 100;
  const discrepancy = Math.round((totalValueRounded - report.totalBuyIn) * 100) / 100;

  // Helper for input conversion
  const inputAmount = parseFloat(amount) || 0;
  // If Multi, the input IS the value. If Single, input is chips, need to multiply.
  const txValue = (typeof currentChipValue === 'number') ? inputAmount * currentChipValue : inputAmount;

  const handleTransaction = () => {
    const inputValue = parseFloat(amount);
    if (isNaN(inputValue) || inputValue <= 0) return;

    // Convert chips to value for storage (if applicable)
    const txAmount = (typeof game.chipValue === 'number') ? inputValue * game.chipValue : inputValue;

    let type = TransactionType.TRANSFER;
    let fromId = selectedPlayerId;
    let toId = targetPlayerId;

    if (modalType === 'BUY_IN') {
      type = TransactionType.BUY_IN;
      fromId = 'BANK';
      toId = selectedPlayerId;
    } else if (modalType === 'CASH_OUT') {
      type = TransactionType.CASH_OUT;
      fromId = selectedPlayerId;
      toId = 'BANK';
    }

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      fromId,
      toId,
      amount: txAmount
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
    const inputBuyIn = parseFloat(amount);
    if (!isNaN(inputBuyIn) && inputBuyIn > 0) {
      const buyInVal = (typeof game.chipValue === 'number') ? inputBuyIn * game.chipValue : inputBuyIn;
      updatedGame.transactions = [
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: TransactionType.BUY_IN,
          fromId: 'BANK',
          toId: player.id,
          amount: buyInVal
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
        // If chipValue is set, we convert the count to value here.
        // If multi-denom (chipValue undefined), num IS the value.
        const finalValue = (typeof game.chipValue === 'number') ? num * game.chipValue : num;
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
    // If Multi-denom, we just use the dollar value directly.
    const initialCounts: Record<string, string> = {};
    game.players.forEach(p => {
       const moneyVal = game.playerStates[p.id]?.finalChips || 0;
       if (typeof game.chipValue === 'number' && game.chipValue > 0) {
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 backdrop-blur-md sticky top-4 z-10 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">Active Session</h2>
          <p className="text-neutral-400 text-sm flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            Started {new Date(game.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            <span className="mx-1 text-neutral-600">|</span>
            {game.players.length} Players
            <span className="mx-1 text-neutral-600">|</span>
            Bank: {formatCurrency(report.totalBuyIn)}
            {!isMultiDenom && game.chipValue && (
              <>
                <span className="mx-1 text-neutral-600">|</span>
                <span className="text-red-400 font-medium">Chip Value: {formatCurrency(game.chipValue)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button onClick={() => setModalType('BUY_IN')} icon={<Plus size={18} />}>Buy In</Button>
          <Button onClick={() => setModalType('CASH_OUT')} variant="secondary" icon={<LogOut size={18} />}>Cash Out</Button>
          <Button onClick={() => setModalType('TRANSFER')} variant="secondary" icon={<ArrowRightLeft size={18} />}>Transfer</Button>
          <Button onClick={() => setModalType('ADD_PLAYER')} variant="secondary" icon={<UserPlus size={18} />}>Add Player</Button>
          <Button onClick={openCountModal} variant="danger" icon={<Save size={18} />}>End Game</Button>
        </div>
      </div>

      {/* Players Grid - Optimized for up to 12 players */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {game.players.map(player => {
          const stats = report.players.find(p => p.playerId === player.id);
          if (!stats) return null;

          return (
            <Card key={player.id} className="relative overflow-hidden group hover:border-red-600/50 transition-colors bg-neutral-900 border-neutral-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">{player.name}</h3>
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mt-1">Status</div>
                </div>
                <div className="bg-neutral-950 p-2 rounded-lg text-white font-mono text-xl font-bold border border-neutral-800">
                   {formatCurrency(stats.netInvested)}
                   <span className="text-[10px] text-neutral-500 block text-right font-sans font-normal">INVESTED</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-neutral-800 pt-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Buy-ins</span>
                    <span className="text-neutral-200">{formatCurrency(stats.totalBuyIn)}</span>
                 </div>
                 {stats.transfersIn > 0 && (
                   <div className="flex justify-between text-sm">
                      <span className="text-red-400">Borrowed</span>
                      <span className="text-red-300">+{formatCurrency(stats.transfersIn)}</span>
                   </div>
                 )}
                 {stats.transfersOut > 0 && (
                   <div className="flex justify-between text-sm">
                      <span className="text-green-500">Loaned</span>
                      <span className="text-green-400">-{formatCurrency(stats.transfersOut)}</span>
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
            <div className="text-center text-neutral-500 py-10 flex flex-col items-center">
              <History size={48} className="mb-4 opacity-20" />
              <p>No transactions yet. Buy chips to start.</p>
            </div>
          ) : (
            game.transactions.map(tx => {
              const fromName = tx.fromId === 'BANK' ? 'Bank' : game.players.find(p => p.id === tx.fromId)?.name || 'Unknown';
              const toName = tx.toId === 'BANK' ? 'Bank' : game.players.find(p => p.id === tx.toId)?.name || 'Unknown';
              
              let icon = <ArrowRightLeft size={16} />;
              let colorClass = 'bg-blue-500/10 text-blue-500';
              
              if (tx.type === TransactionType.BUY_IN) {
                icon = <DollarSign size={16} />;
                colorClass = 'bg-green-500/10 text-green-500';
              } else if (tx.type === TransactionType.CASH_OUT) {
                icon = <LogOut size={16} />;
                colorClass = 'bg-yellow-500/10 text-yellow-500';
              }

              return (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-neutral-800/50">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        {icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-200">
                          {tx.type === TransactionType.BUY_IN 
                            ? `${toName} bought in` 
                            : tx.type === TransactionType.CASH_OUT
                              ? `${fromName} cashed out`
                              : `${fromName} ➔ ${toName}`}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                   </div>
                   <div className="font-mono font-bold text-neutral-200">
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
          <div>
            <Input 
              label={isMultiDenom ? "Amount ($)" : "Amount (Chips)"}
              type="number"
              step={isMultiDenom ? "0.01" : "1"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100"
              autoFocus
            />
            {amount && !isMultiDenom && game.chipValue && (
              <div className="text-right text-xs text-neutral-400 mt-1">
                Value: <span className="text-green-500 font-mono">{formatCurrency(txValue)}</span>
              </div>
            )}
          </div>
          <Button className="w-full" onClick={handleTransaction}>Confirm Buy In</Button>
        </div>
      </Modal>

      {/* Cash Out Modal */}
      <Modal 
        isOpen={modalType === 'CASH_OUT'} 
        onClose={closeModal}
        title="Cash Out (Early Exit)"
      >
        <div className="space-y-4">
          <div className="p-3 bg-yellow-900/20 border border-yellow-900/50 rounded-lg text-sm text-yellow-200">
             Use this when a player leaves the game early. They return their chips to the bank.
          </div>
          <Select 
            label="Player"
            options={game.players.map(p => ({ value: p.id, label: p.name }))}
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
          />
          <div>
            <Input 
              label={isMultiDenom ? "Amount ($)" : "Amount (Chips)"}
              type="number"
              step={isMultiDenom ? "0.01" : "1"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50"
              autoFocus
            />
            {amount && !isMultiDenom && game.chipValue && (
              <div className="text-right text-xs text-neutral-400 mt-1">
                Value: <span className="text-green-500 font-mono">{formatCurrency(txValue)}</span>
              </div>
            )}
          </div>
          <Button className="w-full" variant="secondary" onClick={handleTransaction}>Confirm Cash Out</Button>
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
          <div>
            <Input 
              label={isMultiDenom ? "Amount ($)" : "Amount (Chips)"}
              type="number"
              step={isMultiDenom ? "0.01" : "1"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 25"
              autoFocus
            />
             {amount && !isMultiDenom && game.chipValue && (
              <div className="text-right text-xs text-neutral-400 mt-1">
                Value: <span className="text-green-500 font-mono">{formatCurrency(txValue)}</span>
              </div>
            )}
          </div>
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
           <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
             <button 
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${newPlayerMode === 'EXISTING' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-white'}`}
                onClick={() => setNewPlayerMode('EXISTING')}
             >
               Existing Player
             </button>
             <button 
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${newPlayerMode === 'NEW' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-white'}`}
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
                <p className="text-center text-neutral-500 py-2">All existing players are already in the game.</p>
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
           
           <div>
            <Input 
                label={isMultiDenom ? "Initial Buy-In ($) - Optional" : "Initial Buy-In (Chips) - Optional"}
                type="number"
                step={isMultiDenom ? "0.01" : "1"}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            {amount && !isMultiDenom && game.chipValue && parseFloat(amount) > 0 && (
              <div className="text-right text-xs text-neutral-400 mt-1">
                Value: <span className="text-green-500 font-mono">{formatCurrency(txValue)}</span>
              </div>
            )}
           </div>

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
          
          <div className={`grid ${!isMultiDenom ? 'grid-cols-4' : 'grid-cols-2'} gap-2 bg-neutral-900/50 p-4 rounded-lg border border-neutral-800`}>
             <div className="text-center border-r border-neutral-800 px-1">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Bank Total ($)</div>
                <div className="text-lg font-bold text-white font-mono">{formatCurrency(report.totalBuyIn)}</div>
             </div>
             
             {!isMultiDenom && (
               <div className="text-center border-r border-neutral-800 px-1">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Target Chips</div>
                  <div className="text-lg font-bold text-blue-400 font-mono">{targetChips.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
               </div>
             )}

             {!isMultiDenom && (
               <div className="text-center border-r border-neutral-800 px-1">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Actual Chips</div>
                  <div className={`text-lg font-bold font-mono ${Math.round(totalRawCount) === Math.round(targetChips) ? 'text-green-500' : 'text-white'}`}>
                    {totalRawCount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </div>
               </div>
             )}
             
             <div className="text-center px-1">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Actual Value ($)</div>
                <div className={`text-lg font-bold font-mono ${discrepancy === 0 ? 'text-green-500' : 'text-yellow-400'}`}>
                   {formatCurrency(totalValueRounded)}
                </div>
             </div>
          </div>

          <div className="flex justify-between items-center text-sm text-neutral-400 mb-2">
            <span>Player</span>
            <div className="flex gap-4">
              <span>{isMultiDenom ? 'Final Value ($)' : 'Chip Count'}</span>
              {!isMultiDenom && <span className="w-20 text-right">Value ($)</span>}
            </div>
          </div>

          {game.players.map(p => {
            const raw = parseFloat(counts[p.id] || '0');
            const calculatedVal = isNaN(raw) ? 0 : (isMultiDenom ? raw : raw * (game.chipValue || 1));

            return (
              <div key={p.id} className="flex items-center justify-between gap-4 py-1">
                 <label className="text-sm font-medium text-neutral-200">{p.name}</label>
                 <div className="flex items-center gap-4">
                   <Input 
                     type="number" 
                     step={isMultiDenom ? "0.01" : "1"}
                     className={`${isMultiDenom ? 'w-32' : 'w-24'} text-right font-mono py-1.5 h-8 bg-neutral-950`}
                     value={counts[p.id] || '0'}
                     onChange={(e) => handleCountChange(p.id, e.target.value)}
                   />
                   {!isMultiDenom && (
                     <div className="w-20 text-right font-mono text-green-500 text-sm">
                        {formatCurrency(calculatedVal)}
                     </div>
                   )}
                 </div>
              </div>
            );
          })}

          {/* Discrepancy Error Message - Only shown after attempted finish */}
          {showMismatchWarning && discrepancy !== 0 && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
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

          <div className="pt-4 border-t border-neutral-800">
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