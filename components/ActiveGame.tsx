
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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(game.players[0]?.id || '');
  const [targetPlayerId, setTargetPlayerId] = useState<string>(game.players[1]?.id || '');
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
    if (isNaN(inputValue) || inputValue <= 0) return;

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
    if (type === 'TRANSFER') {
      const other = game.players.find(p => p.id !== selectedPlayerId && !game.playerStates[p.id]?.isCashedOut);
      if (other) setTargetPlayerId(other.id);
    }
    setModalType(type);
  };

  const isCashoutDisabled = activePlayers.length <= 2;

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)] overflow-hidden space-y-2">
      {/* Tight Optimized Header */}
      <div className="shrink-0 bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[11px] font-black text-white leading-none mb-1 uppercase tracking-tight">
              {game.endTime ? 'EDIT MODE' : 'TABLE ACTIVE'}
            </h2>
            <div className="flex items-center gap-1.5 text-[9px] text-white/50 font-bold uppercase whitespace-nowrap overflow-hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
              <span>BANK: <span className="text-green-500">{formatCurrency(report.totalBuyIn)}</span></span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <Button onClick={() => setModalType('ADD_PLAYER')} variant="secondary" size="sm" className="py-1 text-[9px] h-7 px-3 uppercase font-black tracking-widest">+ SEAT</Button>
            <Button onClick={openCountModal} variant="danger" size="sm" className="py-1 text-[9px] h-7 px-3 font-black uppercase tracking-widest">
               {game.endTime ? 'SAVE' : 'SETTLE'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-lg border border-neutral-800/50">
          <button 
            onClick={() => openPlayerAction('BUY_IN')} 
            className="flex-1 py-1.5 px-1 rounded-md bg-green-600/10 text-green-400 hover:bg-green-600 hover:text-white transition-all text-[10px] font-black border border-green-600/20 flex flex-col items-center justify-center gap-0.5 shadow-sm"
          >
            <Plus size={14} />
            <span>BUY IN</span>
          </button>
          <button 
            onClick={() => openPlayerAction('TRANSFER')} 
            className="flex-1 py-1.5 px-1 rounded-md bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black border border-blue-600/20 flex flex-col items-center justify-center gap-0.5 shadow-sm"
          >
            <ArrowRightLeft size={14} />
            <span>LOAN</span>
          </button>
          <button 
            onClick={() => openPlayerAction('CASH_OUT')} 
            disabled={isCashoutDisabled}
            className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-black border transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm ${isCashoutDisabled ? 'bg-neutral-800 text-neutral-600 border-neutral-700 cursor-not-allowed' : 'bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600 hover:text-white border-yellow-600/20'}`}
          >
            <LogOut size={14} />
            <span>OUT</span>
          </button>
        </div>
      </div>

      {/* Compact Readable Player Grid - Optimized 50/50 Layout */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 pr-1 custom-scrollbar pb-1">
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
              className={`relative group transition-all rounded-lg border flex flex-col cursor-pointer h-[82px] overflow-hidden ${selectedPlayerId === player.id ? 'bg-neutral-800 border-red-600 ring-1 ring-red-600/20 shadow-md' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 shadow-sm'}`}
            >
              <div className="p-1.5 flex flex-col h-full gap-0.5">
                <div className="flex items-start justify-between min-w-0">
                  <h3 className={`text-[10px] font-black truncate leading-tight w-full tracking-tight ${selectedPlayerId === player.id ? 'text-white' : 'text-neutral-400'}`}>
                    {player.name.toUpperCase()}
                  </h3>
                </div>

                <div className="flex items-center gap-1 flex-1">
                  {/* Left Half: Total Chips & Value */}
                  <div className="flex-1 flex flex-col items-center justify-center h-full bg-black/30 rounded border border-neutral-800/20 px-0.5 overflow-hidden">
                    <span className="text-sm font-mono font-black text-white leading-none tracking-tighter">
                      {chipsCount !== null ? chipsCount.toLocaleString() : formatCurrency(stats.netInvested)}
                    </span>
                    {chipsCount !== null && (
                      <span className="text-[9px] text-white/70 font-mono font-bold leading-none mt-1 truncate w-full text-center">
                        {formatCurrency(stats.netInvested)}
                      </span>
                    )}
                  </div>

                  {/* Right Half: Full LENT / OWES Labels */}
                  <div className="flex-1 flex flex-col justify-around h-full tracking-tighter pl-1">
                    <div className="flex items-center justify-between gap-1 text-green-500 border-b border-neutral-800/30 pb-0.5">
                      <span className="text-[9px] font-black uppercase opacity-60">LENT</span>
                      <span className="text-[11px] font-mono font-black truncate">
                        {stats.transfersOut > 0 ? (game.chipValue ? Math.round(stats.transfersOut / game.chipValue) : formatCurrency(stats.transfersOut)) : '0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-red-500 pt-0.5">
                      <span className="text-[9px] font-black uppercase opacity-60">OWES</span>
                      <span className="text-[11px] font-mono font-black truncate">
                        {stats.transfersIn > 0 ? (game.chipValue ? Math.round(stats.transfersIn / game.chipValue) : formatCurrency(stats.transfersIn)) : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedPlayerId === player.id && (
                <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-red-600"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ledger View */}
      <div className="shrink-0 h-28 bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
        <div className="px-3 py-1 bg-neutral-800/50 border-b border-neutral-800 flex justify-between items-center">
           <span className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
             <History size={10} /> RECENT LOGS
           </span>
           <button 
             onClick={() => setModalType('FULL_LEDGER')}
             className="p-1 text-neutral-500 hover:text-white rounded hover:bg-neutral-800 transition-colors"
           >
             <Maximize2 size={12} />
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-1 custom-scrollbar">
          {game.transactions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-600 text-[10px] italic">Table is quiet...</div>
          ) : (
            game.transactions.slice(0, 15).map(tx => {
              const fromPlayer = game.players.find(p => p.id === tx.fromId);
              const toPlayer = game.players.find(p => p.id === tx.toId);
              const fromName = tx.fromId === 'BANK' ? 'Bank' : fromPlayer?.name || 'Unknown';
              const toName = tx.toId === 'BANK' ? 'Bank' : toPlayer?.name || 'Unknown';
              let colorClass = 'text-blue-400';
              if (tx.type === TransactionType.BUY_IN) colorClass = 'text-green-500';
              else if (tx.type === TransactionType.CASH_OUT) colorClass = 'text-yellow-500';

              return (
                <div key={tx.id} className="flex items-center justify-between px-2 py-0.5 bg-black/20 rounded border border-neutral-800/30 text-[9px] font-bold">
                   <div className="flex items-center gap-2">
                      <span className={`${colorClass} w-6 uppercase text-[8px] font-black`}>{tx.type === TransactionType.BUY_IN ? 'IN' : tx.type === TransactionType.CASH_OUT ? 'OUT' : 'LOAN'}</span>
                      <span className="text-neutral-300 truncate max-w-[120px] uppercase">
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

      {/* Modals */}
      <Modal isOpen={modalType === 'FULL_LEDGER'} onClose={closeModal} title="Session Transaction History" size="xl">
        <div className="space-y-4">
           {game.transactions.length === 0 ? (
             <div className="text-center py-12 text-neutral-600">No transactions recorded yet.</div>
           ) : (
             <div className="space-y-2">
               {[...game.transactions].sort((a,b) => b.timestamp - a.timestamp).map(tx => {
                  const fromPlayer = game.players.find(p => p.id === tx.fromId);
                  const toPlayer = game.players.find(p => p.id === tx.toId);
                  const fromName = tx.fromId === 'BANK' ? 'Bank' : fromPlayer?.name || 'Unknown';
                  const toName = tx.toId === 'BANK' ? 'Bank' : toPlayer?.name || 'Unknown';
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-neutral-900/40 border border-neutral-800/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tx.type === TransactionType.BUY_IN ? 'bg-green-500/10 text-green-500' : tx.type === TransactionType.CASH_OUT ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {tx.type === TransactionType.BUY_IN ? <DollarSign size={16} /> : tx.type === TransactionType.CASH_OUT ? <LogOut size={16} /> : <ArrowRightLeft size={16} />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-200">
                             {tx.type === TransactionType.BUY_IN ? `${toName} bought in from Bank` : tx.type === TransactionType.CASH_OUT ? `${fromName} cashed out to Bank` : `${fromName} sent to ${toName}`}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </div>
                            {tx.note && <span className="text-[9px] text-red-400 bg-red-950/20 px-1.5 py-0.5 rounded border border-red-900/30">{tx.note}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-black text-white">{game.chipValue ? (tx.amount / game.chipValue).toLocaleString() : formatCurrency(tx.amount)} {game.chipValue && <span className="text-[10px] opacity-40 font-normal">chips</span>}</div>
                        {game.chipValue && <div className="text-[10px] text-neutral-500 font-mono">{formatCurrency(tx.amount)}</div>}
                      </div>
                    </div>
                  );
               })}
             </div>
           )}
        </div>
      </Modal>

      <Modal isOpen={modalType === 'BUY_IN'} onClose={closeModal} title="Buy In">
        <div className="space-y-4">
          <Select label="Player" options={activePlayers.map(p => ({ value: p.id, label: p.name }))} value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} />
          <Input label={isMultiDenom ? "Amount ($)" : "Amount (Chips)"} type="number" step={isMultiDenom ? "0.01" : "1"} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus className={noArrowsClass} />
          <Button className="w-full py-2.5" onClick={handleTransaction}>Confirm Buy In</Button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'CASH_OUT'} onClose={closeModal} title="Cash Out">
        <div className="space-y-4">
          <Select label="Player" options={activePlayers.map(p => ({ value: p.id, label: p.name }))} value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} />
          <Input label={isMultiDenom ? "Amount ($)" : "Amount (Chips)"} type="number" step={isMultiDenom ? "0.01" : "1"} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus className={noArrowsClass} />
          <Button className="w-full py-2.5" variant="secondary" onClick={handleTransaction}>Confirm Cash Out</Button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'TRANSFER'} onClose={closeModal} title="Transfer Chips (Loan)">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="From" options={activePlayers.map(p => ({ value: p.id, label: p.name }))} value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} />
            <Select label="To" options={activePlayers.map(p => ({ value: p.id, label: p.name }))} value={targetPlayerId} onChange={(e) => setTargetPlayerId(e.target.value)} />
          </div>
          <Input label={isMultiDenom ? "Amount ($)" : "Amount (Chips)"} type="number" step={isMultiDenom ? "0.01" : "1"} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus className={noArrowsClass} />
          <Button className="w-full py-2.5" onClick={handleTransaction} disabled={selectedPlayerId === targetPlayerId}>Confirm Loan</Button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'ADD_PLAYER'} onClose={closeModal} title="Seat New Player">
        <div className="space-y-4">
           <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
             <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newPlayerMode === 'EXISTING' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500'}`} onClick={() => setNewPlayerMode('EXISTING')}>EXISTING</button>
             <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newPlayerMode === 'NEW' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500'}`} onClick={() => setNewPlayerMode('NEW')}>NEW</button>
           </div>
           {newPlayerMode === 'EXISTING' ? (
             availablePlayers.length > 0 ? (
                <Select label="Select" options={availablePlayers.map(p => ({ value: p.id, label: p.name }))} value={playerToAddId} onChange={(e) => setPlayerToAddId(e.target.value)} />
             ) : (
                <p className="text-center text-neutral-500 py-2 text-xs">No available group members.</p>
             )
           ) : (
             <Input 
               label="Name" 
               placeholder="Enter name" 
               value={newPlayerName} 
               onChange={(e) => setNewPlayerName(e.target.value)} 
               autoFocus 
               error={isDuplicateName ? "This player already exists in the group roster." : undefined}
             />
           )}
           <Input label={isMultiDenom ? "Buy-In ($)" : "Buy-In (Chips)"} type="number" step={isMultiDenom ? "0.01" : "1"} placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={noArrowsClass} />
           <Button className="w-full py-2.5" onClick={handleAddPlayer} disabled={(newPlayerMode === 'EXISTING' && !playerToAddId) || (newPlayerMode === 'NEW' && (!newPlayerName.trim() || isDuplicateName || isCreating))}>Seat Player</Button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'COUNT_CHIPS'} onClose={handleCancelFinish} title={game.endTime ? "Edit Count" : "Count Final Stacks"}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 gap-2 bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
             <div className="text-center border-r border-neutral-800">
                <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1 font-black">Target</div>
                <div className="text-lg font-black text-white font-mono">{isMultiDenom ? formatCurrency(report.totalBuyIn) : targetChips.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
             </div>
             <div className="text-center">
                <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1 font-black">Actual</div>
                <div className={`text-lg font-black font-mono ${discrepancy === 0 ? 'text-green-500' : 'text-yellow-400'}`}>
                   {isMultiDenom ? formatCurrency(totalValueRounded) : totalRawCount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </div>
             </div>
          </div>
          
          <div className="space-y-3">
            {activePlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-900 last:border-0 group">
                 <div className="flex-1 min-w-0">
                    <label className="text-sm font-black text-white truncate block uppercase">
                      {p.name || 'Unknown Player'}
                    </label>
                    <div className="text-[9px] text-neutral-500 font-bold tracking-widest mt-0.5">FINAL STACK</div>
                 </div>
                 <div className="shrink-0">
                   <Input 
                     type="number" 
                     step={isMultiDenom ? "0.01" : "1"}
                     className={`w-32 text-right font-mono py-1.5 h-10 bg-neutral-950 font-black border-neutral-800 focus:border-red-600 ${noArrowsClass}`}
                     placeholder="0"
                     value={counts[p.id] || ''}
                     onChange={(e) => handleCountChange(p.id, e.target.value)}
                   />
                 </div>
              </div>
            ))}
          </div>

          {showMismatchWarning && discrepancy !== 0 && (
            <div className="mt-4 p-3 bg-red-950 border border-red-500/50 rounded-lg flex items-start gap-3">
               <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
               <div className="text-xs">
                  <div className="font-black text-white uppercase tracking-tight text-[10px]">Ledger Mismatch Detected</div>
                  <div className="text-red-200 mt-1 font-bold">Difference: <span className="font-mono text-white underline decoration-red-500 decoration-2">{isMultiDenom ? formatCurrency(discrepancy) : `${chipsDiscrepancy} units`}</span></div>
               </div>
            </div>
          )}
          
          <div className="pt-4 border-t border-neutral-800 flex gap-3 sticky bottom-0 bg-neutral-950 py-2">
             <Button className="flex-1" variant="secondary" onClick={handleCancelFinish}>Cancel</Button>
             <Button className="flex-[2]" variant={showMismatchWarning && discrepancy !== 0 ? 'secondary' : 'danger'} onClick={handleFinishAttempt}>
                {showMismatchWarning && discrepancy !== 0 ? 'FORCE SETTLE' : 'COMPLETE'}
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
