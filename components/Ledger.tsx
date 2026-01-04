
import React from 'react';
import { Transaction, TransactionType, GameSession } from '../types';
import { formatCurrency } from '../services/gameService';
import { DollarSign, LogOut, ArrowRightLeft } from 'lucide-react';

interface LedgerProps {
  game: GameSession;
  transactions: Transaction[];
  isCompact?: boolean;
}

export const Ledger: React.FC<LedgerProps> = ({ game, transactions, isCompact = false }) => {
  const isFixedValue = typeof game.chipValue === 'number';
  const chipVal = game.chipValue || 1;

  // Helper to determine if a buy-in is initial or extra
  const getBuyInLabel = (tx: Transaction) => {
    if (tx.type !== TransactionType.BUY_IN) return null;
    
    // Filter all buy-ins for this specific player
    const playerBuyIns = game.transactions
      .filter(t => t.type === TransactionType.BUY_IN && t.toId === tx.toId)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // If this transaction is the first one chronologically for this player, it's Initial
    return playerBuyIns[0]?.id === tx.id ? 'INITIAL' : 'EXTRA';
  };

  if (transactions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-600 text-[10px] font-bold uppercase tracking-widest italic opacity-40">
        Waiting for action...
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${isCompact ? 'p-1.5' : 'space-y-2.5'}`}>
      {transactions.map(tx => {
        const fromPlayer = game.players.find(p => p.id === tx.fromId);
        const toPlayer = game.players.find(p => p.id === tx.toId);
        const fromName = tx.fromId === 'BANK' ? 'Bank' : fromPlayer?.name || 'Unknown';
        const toName = tx.toId === 'BANK' ? 'Bank' : toPlayer?.name || 'Unknown';
        
        const buyInType = getBuyInLabel(tx);
        
        let colorClass = 'text-blue-500';
        let typeLabel = 'LOAN';
        let Icon = ArrowRightLeft;

        if (tx.type === TransactionType.BUY_IN) {
          colorClass = 'text-green-500';
          typeLabel = buyInType === 'INITIAL' ? 'INIT' : 'REBUY';
          Icon = DollarSign;
        } else if (tx.type === TransactionType.CASH_OUT) {
          colorClass = 'text-yellow-500';
          typeLabel = 'OUT';
          Icon = LogOut;
        }

        if (isCompact) {
          return (
            <div key={tx.id} className="flex items-center justify-between px-3 py-1.5 bg-black/30 rounded-lg border border-neutral-800/40 text-[10px] font-bold">
               <div className="flex items-center gap-3">
                  <span className={`${colorClass} w-9 uppercase text-[8px] font-black tracking-tighter shrink-0`}>
                    {typeLabel}
                  </span>
                  <span className="text-neutral-400 truncate max-w-[120px] uppercase tracking-tight">
                    {tx.type === TransactionType.BUY_IN ? `${toName}` : tx.type === TransactionType.CASH_OUT ? `${fromName}` : `${fromName} ➔ ${toName}`}
                  </span>
               </div>
               <div className="text-white font-mono font-black shrink-0">
                  {isFixedValue ? Math.round(tx.amount / chipVal).toLocaleString() : formatCurrency(tx.amount)}
               </div>
            </div>
          );
        }

        return (
          <div key={tx.id} className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800/60 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${tx.type === TransactionType.BUY_IN ? 'bg-green-500/10 text-green-500' : tx.type === TransactionType.CASH_OUT ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                <Icon size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-neutral-200">
                   {tx.type === TransactionType.BUY_IN ? (
                     <span>{toName} <span className={`text-[10px] font-black ml-1 ${buyInType === 'EXTRA' ? 'text-red-500' : 'text-green-500 opacity-60'}`}>{buyInType === 'EXTRA' ? 'RE-BUY' : 'ENTRY'}</span></span>
                   ) : tx.type === TransactionType.CASH_OUT ? `${fromName} Out` : `${fromName} to ${toName}`}
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
              <div className="text-base font-mono font-black text-white">
                {isFixedValue ? Math.round(tx.amount / chipVal).toLocaleString() : formatCurrency(tx.amount)}
              </div>
              {isFixedValue && <div className="text-[10px] text-neutral-500 font-mono font-bold mt-0.5">{formatCurrency(tx.amount)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
