
import React, { useMemo } from 'react';
import { GameSession, TransactionType, Player } from '../types';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Button, Card } from './UI';
import { AlertTriangle, ArrowLeft, ArrowRightLeft, DollarSign, History, Edit, TrendingUp, TrendingDown, LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface SettlementReportProps {
  game: GameSession;
  onBack: () => void;
  onEdit: () => void;
}

export const SettlementReport: React.FC<SettlementReportProps> = ({ game, onBack, onEdit }) => {
  const report = useMemo(() => calculateSettlement(game), [game]);
  
  const chartData = report.players.map(p => ({
    name: p.name,
    profit: p.netProfit
  }));

  const sortedTransactions = [...game.transactions].sort((a, b) => b.timestamp - a.timestamp);

  const isFixedValue = typeof game.chipValue === 'number';
  const chipVal = game.chipValue || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="secondary" icon={<ArrowLeft size={18}/>}>Back to Dashboard</Button>
          <div>
             <h2 className="text-2xl font-bold text-white">Game Settlement</h2>
             <p className="text-neutral-400 text-sm">
               {new Date(game.startTime).toLocaleDateString()} • {report.durationMinutes} minutes session
               {isFixedValue && game.chipValue && <span className="ml-2 text-red-400">• Chip Value: {formatCurrency(game.chipValue)}</span>}
             </p>
          </div>
        </div>
        <Button onClick={onEdit} variant="ghost" icon={<Edit size={18}/>}>Edit Game</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="flex flex-col items-center justify-center text-center py-6 bg-gradient-to-br from-neutral-900 to-black border-neutral-800 shadow-xl">
            <div className="text-neutral-500 uppercase text-[10px] font-bold tracking-[0.2em] mb-2">Total Buy-In</div>
            <div className="text-3xl font-bold text-white font-mono">{formatCurrency(report.totalBuyIn)}</div>
         </Card>
         <Card className="flex flex-col items-center justify-center text-center py-6 bg-gradient-to-br from-neutral-900 to-black border-neutral-800 shadow-xl">
            <div className="text-neutral-500 uppercase text-[10px] font-bold tracking-[0.2em] mb-2">Total Stack Count</div>
            <div className="text-3xl font-bold text-green-500 font-mono">
              {isFixedValue ? `${Math.round(report.totalChips / chipVal).toLocaleString()} chips` : formatCurrency(report.totalChips)}
            </div>
            {isFixedValue && <div className="text-xs text-neutral-500 font-mono mt-1">{formatCurrency(report.totalChips)}</div>}
         </Card>
         <Card className={`flex flex-col items-center justify-center text-center py-6 shadow-xl ${report.discrepancy !== 0 ? 'bg-red-950/20 border-red-900/40' : 'bg-gradient-to-br from-neutral-900 to-black border-neutral-800'}`}>
            <div className="text-neutral-500 uppercase text-[10px] font-bold tracking-[0.2em] mb-2 flex items-center gap-2">
               {report.discrepancy !== 0 && <AlertTriangle size={14} className="text-red-400" />}
               Bank Discrepancy
            </div>
            <div className={`text-3xl font-bold font-mono ${report.discrepancy === 0 ? 'text-neutral-500' : 'text-red-500'}`}>
               {report.discrepancy > 0 ? '+' : ''}{formatCurrency(report.discrepancy)}
            </div>
         </Card>
      </div>

      <Card title="Profit/Loss Analysis">
        <div className="w-full min-h-[300px] mt-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
              <XAxis dataKey="name" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#525252" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                cursor={{fill: '#262626'}}
                contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px', color: '#f5f5f5', fontSize: '12px', padding: '12px'}}
                itemStyle={{ color: '#f5f5f5' }}
                formatter={(value: number) => [formatCurrency(value), 'Profit']}
              />
              <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
           <span className="w-1 h-5 bg-red-600 rounded-full"></span>
           Individual Results
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
           {report.players.map(p => {
             const isWinner = p.netProfit > 0;
             const isLoser = p.netProfit < 0;
             return (
               <Card key={p.playerId} className={`relative overflow-hidden group border transition-all flex flex-col h-full p-4 ${isWinner ? 'border-green-900/40 hover:border-green-500/50' : isLoser ? 'border-red-900/40 hover:border-red-500/50' : 'border-neutral-800'}`}>
                  <div className={`absolute top-0 right-0 p-1.5 rounded-bl-lg ${isWinner ? 'bg-green-500/10 text-green-500' : isLoser ? 'bg-red-500/10 text-red-500' : 'bg-neutral-800 text-neutral-500'}`}>
                    {isWinner ? <TrendingUp size={12} /> : isLoser ? <TrendingDown size={12} /> : <div className="w-3 h-3" />}
                  </div>
                  <div className="flex justify-between items-start gap-3 mb-4 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border border-neutral-800 bg-neutral-800 text-sm shadow-inner">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate pr-1" title={p.name}>{p.name}</h4>
                        <div className={`text-[9px] font-bold uppercase tracking-wider ${isWinner ? 'text-green-500' : isLoser ? 'text-red-500' : 'text-neutral-500'}`}>
                          {isWinner ? 'Profit' : isLoser ? 'Loss' : 'Even'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <div className={`text-lg font-mono font-black leading-tight ${isWinner ? 'text-green-500' : isLoser ? 'text-red-500' : 'text-white'}`}>
                          {isWinner ? '+' : ''}{formatCurrency(p.netProfit)}
                       </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-neutral-800/50 text-[10px] mt-auto">
                    <div className="space-y-2">
                       <div>
                          <span className="text-neutral-500 font-bold uppercase block tracking-tighter mb-0.5">Bank Buy-In</span>
                          <span className="text-neutral-300 font-mono font-medium block truncate">{isFixedValue ? `${Math.round(p.totalBuyIn / chipVal).toLocaleString()} units` : formatCurrency(p.totalBuyIn)}</span>
                       </div>
                       <div>
                          <span className="text-neutral-500 font-bold uppercase block tracking-tighter mb-0.5">Net Invested</span>
                          <span className="text-neutral-300 font-mono font-medium block truncate">{isFixedValue ? `${Math.round(p.netInvested / chipVal).toLocaleString()} units` : formatCurrency(p.netInvested)}</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div>
                          <span className="text-neutral-500 font-bold uppercase block tracking-tighter mb-0.5">Final Chips</span>
                          <span className="text-neutral-300 font-mono font-medium block truncate">{isFixedValue ? `${Math.round(p.finalChips / chipVal).toLocaleString()} units` : formatCurrency(p.finalChips)}</span>
                       </div>
                       <div>
                          <span className="text-neutral-500 font-bold uppercase block tracking-tighter mb-0.5">Loans</span>
                          <div className="flex flex-col min-w-0">
                             {p.transfersIn > 0 && <span className="text-red-400 truncate leading-tight">-{isFixedValue ? Math.round(p.transfersIn / chipVal) : formatCurrency(p.transfersIn)} (B)</span>}
                             {p.transfersOut > 0 && <span className="text-green-400 truncate leading-tight">+{isFixedValue ? Math.round(p.transfersOut / chipVal) : formatCurrency(p.transfersOut)} (L)</span>}
                             {p.transfersIn === 0 && p.transfersOut === 0 && <span className="text-neutral-600">None</span>}
                          </div>
                       </div>
                    </div>
                  </div>
               </Card>
             );
           })}
        </div>
      </div>

      <Card title="Game Ledger History">
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {sortedTransactions.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">
              <History size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs">No transactions were recorded during this session.</p>
            </div>
          ) : (
            sortedTransactions.map(tx => {
              const fromPlayer = game.players.find(p => p.id === tx.fromId);
              const toPlayer = game.players.find(p => p.id === tx.toId);
              const fromName = tx.fromId === 'BANK' ? 'Bank' : fromPlayer?.name || 'Unknown';
              const toName = tx.toId === 'BANK' ? 'Bank' : toPlayer?.name || 'Unknown';
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-neutral-900/30 rounded-xl border border-neutral-800/40">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.type === TransactionType.BUY_IN ? 'bg-green-500/10 text-green-500' : tx.type === TransactionType.CASH_OUT ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {tx.type === TransactionType.BUY_IN ? <DollarSign size={14} /> : tx.type === TransactionType.CASH_OUT ? <LogOut size={14} /> : <ArrowRightLeft size={14} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-200">
                          {tx.type === TransactionType.BUY_IN ? `${toName} bought in` : tx.type === TransactionType.CASH_OUT ? `${fromName} cashed out` : `${fromName} sent to ${toName}`}
                        </div>
                        <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="font-mono font-bold text-sm text-neutral-300">{isFixedValue ? `${Math.round(tx.amount / chipVal).toLocaleString()} chips` : formatCurrency(tx.amount)}</div>
                      {isFixedValue && <div className="text-[10px] text-neutral-500 font-mono">{formatCurrency(tx.amount)}</div>}
                   </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
