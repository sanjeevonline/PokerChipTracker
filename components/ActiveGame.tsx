
import React, { useState, useMemo, useEffect } from 'react';
import { GameSession, TransactionType, Player, Transaction } from '../types';
import { Button, Card, Modal, Input, Select } from './UI';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Plus, ArrowRightLeft, History, AlertCircle, Save, UserPlus, LogOut, Users, X, HandCoins, ArrowUpRight, ArrowDownLeft, Maximize2, DollarSign } from 'lucide-react';

interface ActiveGameProps {
  game: GameSession;
  allPlayers: Player[];
  onCreatePlayer: (name: string, avatar?: string) => Promise<Player>;
  onUpdateGame: (game: GameSession) => void;
  onEndGame: () => void;
  onCancelEdit?: () => void;
}

export const ActiveGame: React.FC<ActiveGameProps> = ({ 
  game, 
  allPlayers, 
  onCreatePlayer, 
  onUpdateGame, 
  onEndGame,
  onCancelEdit 
}) => {
  const [modalType, setModalType] = useState<'BUY_IN' | 'TRANSFER' | 'CASH_OUT' | 'COUNT_CHIPS' | 'ADD_PLAYER' | 'FULL_LEDGER' | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [targetPlayerId, setTargetPlayerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  
  const [newPlayerMode, setNewPlayerMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [playerToAddId, setPlayerToAddId] = useState<string>('');
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [showMismatchWarning, setShowMismatchWarning] = useState(false);

  const report = useMemo(() => calculateSettlement(game), [game]);
  const availablePlayers = allPlayers.filter(p => !game.players.some(gp => gp.id === p.id));

  useEffect(() => {
    if (modalType === 'ADD_PLAYER' && availablePlayers.length > 0 && !playerToAddId) {
      setPlayerToAddId(availablePlayers[0].id);
    }
  }, [modalType, availablePlayers, playerToAddId]);
  
  const isMultiDenom = game.chipValue === undefined || game.chipValue === null;
  const chipVal = game.chipValue || 1;
  const noArrowsClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const isDuplicateName = allPlayers.some(
    p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
  );

  const totalRawCount: number = (Object.values(counts) as string[]).reduce((sum: number, val: string) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const currentChipValue = game.chipValue;
  const totalValueCalculated: number = (typeof currentChipValue === 'number') 
    ? totalRawCount * currentChipValue 
    : totalRawCount;
  
  const targetChips = (typeof currentChipValue === 'number' && currentChipValue > 0)
    ? report.totalBuyIn / currentChipValue
    : report.totalBuyIn;

  const totalValueRounded = Math.round(totalValueCalculated * 100) / 100;
  const discrepancy = Math.round((totalValueRounded - report.totalBuyIn) * 100) / 100;
  const chipsDiscrepancy = (typeof currentChipValue === 'number' && currentChipValue > 0) 
    ? Math.round((totalRawCount - targetChips) * 10) / 10
    : 0;

  const handleTransaction = () => {
    const inputValue = parseFloat(amount);
    if (isNaN(inputValue) || inputValue <= 0 || !selectedPlayerId) return;

    const txAmount = (typeof game.chipValue === 'number') ? inputValue * game.chipValue : inputValue;
    let type = TransactionType.TRANSFER;
    let fromId = selectedPlayerId;
    let toId = targetPlayerId;
    let updatedPlayerStates = { ...game.playerStates };

    if (modalType === 'BUY_IN') {
      type = TransactionType.BUY_IN;
      fromId = 'BANK';
      toId = selectedPlayerId;
    } else if (modalType === 'CASH_OUT') {
      type = TransactionType.CASH_OUT;
      fromId = selectedPlayerId;
      toId = 'BANK';
      updatedPlayerStates[selectedPlayerId] = {
        ...(updatedPlayerStates[selectedPlayerId] || { playerId: selectedPlayerId }),
        isCashedOut: true,
        finalChips: 0
      };
    } else if (modalType === 'TRANSFER') {
      if (!targetPlayerId || fromId === toId) return;
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
      transactions: [newTx, ...game.transactions],
      playerStates: updatedPlayerStates
    };

    onUpdateGame(updatedGame);
    closeModal();
  };

  const handleAddPlayer = async () => {
    let player: Player | undefined;
    if (newPlayerMode === 'EXISTING') {
      player = allPlayers.find(p => p.id === playerToAddId);
    } else {
      if (!newPlayerName.trim() || isDuplicateName || isCreating) return;
      setIsCreating(true);
      try {
        player = await onCreatePlayer(newPlayerName);
      } catch (e) {
        console.error(e);
      } finally {
        setIsCreating(false);
      }
    }

    if (!player) return;

    const updatedGame = {
      ...game,
      players: [...game.players, player]
    };

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
    setPlayerToAddId('');
  };

  const handleFinishAttempt = () => {
    if (discrepancy !== 0 && !showMismatchWarning) {
      setShowMismatchWarning(true);
      return;
    }

    const now = Date.now();
    const updatedStates = { ...game.playerStates };
    const settlementTransactions: Transaction[] = [];

    Object.entries(counts).forEach(([pid, val]) => {
      const num = parseFloat(val as string);
      if (!isNaN(num)) {
        const finalValue = (typeof game.chipValue === 'number') ? num * game.chipValue : num;
        updatedStates[pid] = {
          ...(updatedStates[pid] || { playerId: pid, isCashedOut: false }),
          finalChips: finalValue
        };

        // Log end-game count as a ledger entry
        if (finalValue > 0) {
          settlementTransactions.push({
            id: crypto.randomUUID(),
            timestamp: now,
            type: TransactionType.CASH_OUT,
            fromId: pid,
            toId: 'BANK',
            amount: finalValue,
            note: 'Final Settlement'
          });
        }
      }
    });

    const finishedGame = {
      ...game,
      transactions: [...settlementTransactions, ...game.transactions],
      playerStates: updatedStates,
      isActive: false,
      endTime: game.endTime || now
    };

    onUpdateGame(finishedGame);
    onEndGame();
  };

  const handleCancelFinish = () => {
    if (game.endTime) {
       onCancelEdit?.();
    } else {
       closeModal();
    }
  };

  const handleCountChange = (pid: string, val: string) => {
    setCounts(prev => ({ ...prev, [pid]: val }));
    if (showMismatchWarning) setShowMismatchWarning(false);
  };

  const closeModal = () => {
    setModalType(null);
    setAmount('');
    setNewPlayerName('');
    setSelectedPlayerId('');
    setTargetPlayerId('');
    setShowMismatchWarning(false);
    setIsCreating(false);
  };

  const openCountModal = () => {
    const initialCounts: Record<string, string> = {};
    game.players.forEach(p => {
       if (game.playerStates[p.id]?.isCashedOut) return;
       const existingValue = game.playerStates[p.id]?.finalChips;
       if (existingValue !== null && existingValue !== undefined && game.endTime) {
          const val = (typeof game.chipValue === 'number' && game.chipValue > 0) 
            ? (existingValue / game.chipValue).toString() 
            : existingValue.toString();
          initialCounts[p.id] = val;
       } else {
          initialCounts[p.id] = '';
       }
    });
    setCounts(initialCounts);
    setShowMismatchWarning(false);
    setModalType('COUNT_CHIPS');
  }

  const activePlayers = game.players.filter(p => !game.playerStates[p.id]?.isCashedOut);

  const openPlayerAction = (type: 'BUY_IN' | 'TRANSFER' | 'CASH_OUT') => {
    if (type === 'CASH_OUT' && activePlayers.length <= 2) {
      return;
    }
    // Always clear when opening through general action buttons to ensure user explicitly picks
    setSelectedPlayerId('');
    setTargetPlayerId('');
    setModalType(type);
  };

  const isCashoutDisabled = activePlayers.length <= 2;

  const playerOptions = useMemo(() => [
    { value: '', label: 'CHOOSE PLAYER...' },
    ...activePlayers.map(p => ({ value: p.id, label: p.name.toUpperCase() }))
  ], [activePlayers]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)] overflow-hidden space-y-3">
      {/* Tight Optimized Header */}
      <div className="shrink-0 bg-neutral-900 border border-neutral-800 rounded-2xl p-3 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[10px] font-black text-white/40 leading-none mb-1.5 uppercase tracking-widest">
              {game.endTime ? 'EDIT MODE' : 'LIVE TABLE'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-white/80 font-black uppercase whitespace-nowrap overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span>BANK POT: <span className="text-green-500 font-mono">{formatCurrency(report.totalBuyIn)}</span></span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setModalType('ADD_PLAYER')} variant="secondary" size="sm" className="h-9 px-4 uppercase font-black tracking-widest">+ SEAT</Button>
            <Button onClick={openCountModal} variant="danger" size="sm" className="h-9 px-4 font-black uppercase tracking-widest">
               {game.endTime ? 'SAVE' : 'SETTLE'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-black/40 p-1 rounded-xl border border-neutral-800/50">
          <button 
            onClick={() => openPlayerAction('BUY_IN')} 
            className="flex-1 py-2 px-1 rounded-lg bg-green-600/10 text-green-400 hover:bg-green-600 hover:text-white transition-all text-[11px] font-black border border-green-600/20 flex flex-col items-center justify-center gap-1 shadow-sm"
          >
            <Plus size={16} />
            <span>BUY IN</span>
          </button>
          <button 
            onClick={() => openPlayerAction('TRANSFER')} 
            className="flex-1 py-2 px-1 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[11px] font-black border border-blue-600/20 flex flex-col items-center justify-center gap-1 shadow-sm"
          >
            <ArrowRightLeft size={16} />
            <span>LOAN</span>
          </button>
          <button 
            onClick={() => openPlayerAction('CASH_OUT')} 
            disabled={isCashoutDisabled}
            className={`flex-1 py-2 px-1 rounded-lg text-[11px] font-black border transition-all flex flex-col items-center justify-center gap-1 shadow-sm ${isCashoutDisabled ? 'bg-neutral-800 text-neutral-600 border-neutral-700 cursor-not-allowed' : 'bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600 hover:text-white border-yellow-600/20'}`}
          >
            <LogOut size={16} />
            <span>OUT</span>
          </button>
        </div>
      </div>

      {/* Optimized Player Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 pr-1 custom-scrollbar pb-2">
        {activePlayers.map(player => {
          const stats = report.players.find(p => p.playerId === player.id);
          if (!stats) return null;
          const chipsCount = (typeof game.chipValue === 'number' && game.chipValue > 0) 
            ? Math.round(stats.netInvested / game.chipValue) 
            : null;

          return (
            <div 
              key={player.id} 
              onClick={() => setSelectedPlayerId(player.id)}
              className={`relative group transition-all rounded-xl border flex flex-col cursor-pointer h-[94px] overflow-hidden ${selectedPlayerId === player.id ? 'bg-neutral-800 border-red-600 ring-1 ring-red-600/20 shadow-lg' : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 shadow-sm'}`}
            >
              <div className="p-2.5 flex flex-col h-full gap-1.5">
                <div className="flex items-start justify-between min-w-0">
                  <h3 className={`text-[11px] font-black truncate leading-tight w-full tracking-tight uppercase ${selectedPlayerId === player.id ? 'text-white' : 'text-neutral-400'}`}>
                    {player.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  {/* Left: Total Chips & Value */}
                  <div className="flex-1 flex flex-col items-center justify-center h-full bg-black/40 rounded-lg border border-neutral-800/40 px-1 overflow-hidden">
                    <span className="text-base font-mono font-black text-white leading-none tracking-tighter">
                      {chipsCount !== null ? chipsCount.toLocaleString() : formatCurrency(stats.netInvested)}
                    </span>
                    {chipsCount !== null && (
                      <span className="text-[10px] text-white/40 font-mono font-bold leading-none mt-1.5 truncate w-full text-center">
                        {formatCurrency(stats.netInvested)}
                      </span>
                    )}
                  </div>

                  {/* Right: Loan Summary Labels */}
                  <div className="flex-1 flex flex-col justify-around h-full tracking-tighter pl-1.5 py-0.5">
                    <div className="flex items-center justify-between gap-1 text-green-500/80 border-b border-neutral-800/50 pb-1">
                      <span className="text-[9px] font-black uppercase opacity-50 tracking-widest">LNT</span>
                      <span className="text-xs font-mono font-black truncate">
                        {stats.transfersOut > 0 ? (game.chipValue ? Math.round(stats.transfersOut / game.chipValue) : formatCurrency(stats.transfersOut)) : '0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-red-500/80 pt-1">
                      <span className="text-[9px] font-black uppercase opacity-50 tracking-widest">OWE</span>
                      <span className="text-xs font-mono font-black truncate">
                        {stats.transfersIn > 0 ? (game.chipValue ? Math.round(stats.transfersIn / game.chipValue) : formatCurrency(stats.transfersIn)) : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedPlayerId === player.id && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 shadow-[0_-2px_8px_rgba(220,38,38,0.3)]"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Logs Section */}
      <div className="shrink-0 h-32 bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col shadow-inner backdrop-blur-sm">
        <div className="px-4 py-2 bg-neutral-800/40 border-b border-neutral-800 flex justify-between items-center">
           <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
             <History size={12} className="text-red-600/50" /> RECENT ACTIVITY
           </span>
           <button 
             onClick={() => setModalType('FULL_LEDGER')}
             className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
           >
             <Maximize2 size={14} />
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
          {game.transactions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-600 text-[10px] font-bold uppercase tracking-widest italic opacity-40">Waiting for first move...</div>
          ) : (
            game.transactions.slice(0, 15).map(tx => {
              const fromPlayer = game.players.find(p => p.id === tx.fromId);
              const toPlayer = game.players.find(p => p.id === tx.toId);
              const fromName = tx.fromId === 'BANK' ? 'Bank' : fromPlayer?.name || 'Unknown';
              const toName = tx.toId === 'BANK' ? 'Bank' : toPlayer?.name || 'Unknown';
              let colorClass = 'text-blue-500';
              if (tx.type === TransactionType.BUY_IN) colorClass = 'text-green-500';
              else if (tx.type === TransactionType.CASH_OUT) colorClass = 'text-yellow-500';

              return (
                <div key={tx.id} className="flex items-center justify-between px-3 py-1.5 bg-black/30 rounded-lg border border-neutral-800/40 text-[10px] font-bold">
                   <div className="flex items-center gap-3">
                      <span className={`${colorClass} w-7 uppercase text-[9px] font-black tracking-tighter`}>{tx.type === TransactionType.BUY_IN ? 'IN' : tx.type === TransactionType.CASH_OUT ? 'OUT' : 'LOAN'}</span>
                      <span className="text-neutral-400 truncate max-w-[120px] uppercase tracking-tight">
                        {tx.type === TransactionType.BUY_IN ? `${toName}` : tx.type === TransactionType.CASH_OUT ? `${fromName}` : `${fromName} ➔ ${toName}`}
                      </span>
                   </div>
                   <div className="text-white font-mono font-black">
                      {game.chipValue ? (tx.amount / game.chipValue).toLocaleString() : formatCurrency(tx.amount)}
                   </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ledger Modal */}
      <Modal isOpen={modalType === 'FULL_LEDGER'} onClose={closeModal} title="Session History" size="xl">
        <div className="space-y-4">
           {game.transactions.length === 0 ? (
             <div className="text-center py-16 text-neutral-600 font-bold uppercase tracking-widest">No entries found</div>
           ) : (
             <div className="space-y-2.5">
               {[...game.transactions].sort((a,b) => b.timestamp - a.timestamp).map(tx => {
                  const fromPlayer = game.players.find(p => p.id === tx.fromId);
                  const toPlayer = game.players.find(p => p.id === tx.toId);
                  const fromName = tx.fromId === 'BANK' ? 'Bank' : fromPlayer?.name || 'Unknown';
                  const toName = tx.toId === 'BANK' ? 'Bank' : toPlayer?.name || 'Unknown';
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800/60 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${tx.type === TransactionType.BUY_IN ? 'bg-green-500/10 text-green-500' : tx.type === TransactionType.CASH_OUT ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {tx.type === TransactionType.BUY_IN ? <DollarSign size={18} /> : tx.type === TransactionType.CASH_OUT ? <LogOut size={18} /> : <ArrowRightLeft size={18} />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-neutral-200">
                             {tx.type === TransactionType.BUY_IN ? `${toName} In` : tx.type === TransactionType.CASH_OUT ? `${fromName} Out` : `${fromName} to ${toName}`}
                          </div>
                          <div className="flex items-center gap-2.5 mt-1">
                            <div className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">
                              {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {tx.note && <span className="text-[9px] text-red-500/80 bg-red-950/20 px-2 py-0.5 rounded-lg border border-red-900/20 font-black uppercase tracking-tighter">{tx.note}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-mono font-black text-white">{game.chipValue ? (tx.amount / game.chipValue).toLocaleString() : formatCurrency(tx.amount)}</div>
                        {game.chipValue && <div className="text-[10px] text-neutral-500 font-mono font-bold mt-0.5">{formatCurrency(tx.amount)}</div>}
                      </div>
                    </div>
                  );
               })}
             </div>
           )}
        </div>
      </Modal>

      {/* Transaction Modals */}
      <Modal isOpen={modalType === 'BUY_IN'} onClose={closeModal} title="Buy In">
        <div className="space-y-5">
          <Select label="Seat" options={playerOptions} value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} />
          <Input label={isMultiDenom ? "Amount ($)" : "Amount (Chips)"} type="number" step={isMultiDenom ? "0.01" : "1"} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus className={noArrowsClass} />
          <Button className="w-full py-4" onClick={handleTransaction} disabled={!selectedPlayerId || !amount || parseFloat(amount) <= 0}>Confirm Entry</Button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'CASH_OUT'} onClose={closeModal} title="Mid-Game Out">
        <div className="space-y-5">
          <Select label="Seat" options={playerOptions} value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} />
          <Input label={isMultiDenom ? "Cash Out ($)" : "Chips Out"} type="number" step={isMultiDenom ? "0.01" : "1"} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus className={noArrowsClass} />
          <Button className="w-full py-4" variant="secondary" onClick={handleTransaction} disabled={!selectedPlayerId || !amount || parseFloat(amount) < 0}>Release Chips</Button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'TRANSFER'} onClose={closeModal} title="Player Loan">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Select label="From" options={playerOptions} value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} />
            <Select label="To" options={playerOptions} value={targetPlayerId} onChange={(e) => setTargetPlayerId(e.target.value)} />
          </div>
          <Input label={isMultiDenom ? "Amount ($)" : "Amount (Chips)"} type="number" step={isMultiDenom ? "0.01" : "1"} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus className={noArrowsClass} />
          <Button className="w-full py-4" onClick={handleTransaction} disabled={!selectedPlayerId || !targetPlayerId || selectedPlayerId === targetPlayerId || !amount || parseFloat(amount) <= 0}>Approve Loan</Button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'ADD_PLAYER'} onClose={closeModal} title="Seat New Player">
        <div className="space-y-5">
           <div className="flex bg-neutral-900 rounded-xl p-1.5 border border-neutral-800">
             <button className={`flex-1 py-2 text-xs font-black rounded-lg transition-all tracking-widest ${newPlayerMode === 'EXISTING' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500'}`} onClick={() => setNewPlayerMode('EXISTING')}>GROUP</button>
             <button className={`flex-1 py-2 text-xs font-black rounded-lg transition-all tracking-widest ${newPlayerMode === 'NEW' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500'}`} onClick={() => setNewPlayerMode('NEW')}>GUEST</button>
           </div>
           {newPlayerMode === 'EXISTING' ? (
             availablePlayers.length > 0 ? (
                <Select label="Roster Member" options={[{ value: '', label: 'SELECT MEMBER...' }, ...availablePlayers.map(p => ({ value: p.id, label: p.name.toUpperCase() }))]} value={playerToAddId} onChange={(e) => setPlayerToAddId(e.target.value)} />
             ) : (
                <p className="text-center text-neutral-600 py-6 text-xs font-bold uppercase tracking-widest">Everyone is seated.</p>
             )
           ) : (
             <Input 
               label="Display Name" 
               placeholder="PusherMan" 
               value={newPlayerName} 
               onChange={(e) => setNewPlayerName(e.target.value)} 
               autoFocus 
               error={isDuplicateName ? "Name already in use." : undefined}
             />
           )}
           <Input label={isMultiDenom ? "Buy-In ($)" : "Chips Buy-In"} type="number" step={isMultiDenom ? "0.01" : "1"} placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={noArrowsClass} />
           <Button className="w-full py-4" onClick={handleAddPlayer} disabled={(newPlayerMode === 'EXISTING' && !playerToAddId) || (newPlayerMode === 'NEW' && (!newPlayerName.trim() || isDuplicateName || isCreating))}>Add to Table</Button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'COUNT_CHIPS'} onClose={handleCancelFinish} title={game.endTime ? "Verify Count" : "Final Settlement"}>
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3 bg-neutral-900/80 p-5 rounded-2xl border border-neutral-800/60 shadow-inner">
             <div className="text-center border-r border-neutral-800/50 pr-3">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-black">Target</div>
                <div className="text-xl font-black text-white font-mono">{isMultiDenom ? formatCurrency(report.totalBuyIn) : targetChips.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
             </div>
             <div className="text-center pl-3">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-black">Actual</div>
                <div className={`text-xl font-black font-mono ${discrepancy === 0 ? 'text-green-500' : 'text-red-500'}`}>
                   {isMultiDenom ? formatCurrency(totalValueRounded) : totalRawCount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </div>
             </div>
          </div>
          
          <div className="space-y-3.5 pt-2">
            {activePlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 py-2 group">
                 <div className="flex-1 min-w-0">
                    <label className="text-xs font-black text-white truncate block uppercase tracking-tight">
                      {p.name}
                    </label>
                    <div className="text-[9px] text-neutral-500 font-bold tracking-widest mt-0.5 uppercase">STACK COUNT</div>
                 </div>
                 <div className="shrink-0">
                   <Input 
                     type="number" 
                     step={isMultiDenom ? "0.01" : "1"}
                     className={`w-36 text-right font-mono py-2.5 h-12 bg-neutral-950/80 font-black border-neutral-800 focus:border-red-600 text-base ${noArrowsClass}`}
                     placeholder="0"
                     value={counts[p.id] || ''}
                     onChange={(e) => handleCountChange(p.id, e.target.value)}
                   />
                 </div>
              </div>
            ))}
          </div>

          {showMismatchWarning && discrepancy !== 0 && (
            <div className="mt-4 p-4 bg-red-950/30 border border-red-500/40 rounded-2xl flex items-start gap-3.5 animate-in shake duration-300">
               <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
               <div className="text-xs">
                  <div className="font-black text-white uppercase tracking-tight text-[11px] mb-1">Ledger Conflict Detected</div>
                  <div className="text-red-300 font-bold">Difference: <span className="font-mono text-white underline decoration-red-600 decoration-4 underline-offset-4">{isMultiDenom ? formatCurrency(discrepancy) : `${chipsDiscrepancy}`}</span></div>
                  <div className="mt-2 text-red-400/80 leading-relaxed font-medium italic">Counts must match the ledger to settle cleanly. Force settle only if errors are known.</div>
               </div>
            </div>
          )}
          
          <div className="pt-5 border-t border-neutral-900 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-neutral-950 py-3">
             <Button className="w-full order-2 sm:order-1" variant="secondary" onClick={handleCancelFinish}>Back to Table</Button>
             <Button className="w-full order-1 sm:order-2 py-4" variant={showMismatchWarning && discrepancy !== 0 ? 'secondary' : 'danger'} onClick={handleFinishAttempt}>
                {showMismatchWarning && discrepancy !== 0 ? 'FORCE COMPLETE' : 'SETTLE SESSION'}
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
