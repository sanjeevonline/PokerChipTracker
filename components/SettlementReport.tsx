
import React, { useMemo } from 'react';
import { GameSession, TransactionType, Player } from '../types';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Button, Card } from './UI';
import { AlertTriangle, ArrowLeft, ArrowRightLeft, DollarSign, History, Edit } from 'lucide-react';
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

  const renderAvatar = (playerId: string) => {
    const player = game.players.find(p => p.id === playerId);
    if (!player) return null;
    if (player.avatar && player.avatar.startsWith('data:')) {
      return <img src={player.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-800" />;
    }
    const bgColor = player.avatar || '#262626';
    return (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white border border-neutral-800 text-xs"
        style={{ backgroundColor: bgColor }}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="secondary" icon={<ArrowLeft size={18}/>}>Back to Dashboard</Button>
          <div>
             <h2 className="text-2xl font-bold text-white">Game Settlement</h2>
             <p className="text-neutral-400 text-sm">
               {new Date(game.startTime).toLocaleDateString()} • {report.durationMinutes} minutes session
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
            <div className="text-3xl font-bold text-green-500 font-mono">{formatCurrency(report.totalChips)}</div>
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

      <Card title="Net Profit/Loss Distribution">
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

      <Card title="Final Results Table" className="overflow-hidden p-0">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-neutral-900 text-neutral-500 text-[10px] uppercase font-bold tracking-[0.1em]">
                 <th className="p-4">Player</th>
                 <th className="p-4 text-right">Bank Buy-In</th>
                 <th className="p-4 text-right">Loans In/Out</th>
                 <th className="p-4 text-right">Net Invested</th>
                 <th className="p-4 text-right">Final Chips</th>
                 <th className="p-4 text-right">Profit/Loss</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-neutral-800/50 text-sm">
               {report.players.map(p => (
                 <tr key={p.playerId} className="hover:bg-neutral-900/50 transition-colors">
                   <td className="p-4">
                     <div className="flex items-center gap-3">
                        {renderAvatar(p.playerId)}
                        <span className="font-bold text-white">{p.name}</span>
                     </div>
                   </td>
                   <td className="p-4 text-right text-neutral-400 font-mono">{formatCurrency(p.totalBuyIn)}</td>
                   <td className="p-4 text-right">
                     {p.transfersIn > 0 && <span className="text-red-500/80 block text-[10px] font-bold">BORROWED {formatCurrency(p.transfersIn)}</span>}
                     {p.transfersOut > 0 && <span className="text-green-500/80 block text-[10px] font-bold">LOANED {formatCurrency(p.transfersOut)}</span>}
                     {p.transfersIn === 0 && p.transfersOut === 0 && <span className="text-neutral-700">-</span>}
                   </td>
                   <td className="p-4 text-right font-medium text-neutral-300 font-mono">{formatCurrency(p.netInvested)}</td>
                   <td className="p-4 text-right font-mono text-neutral-100">{formatCurrency(p.finalChips)}</td>
                   <td className={`p-4 text-right font-bold font-mono ${p.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {p.netProfit > 0 ? '+' : ''}{formatCurrency(p.netProfit)}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </Card>

      <Card title="Ledger History">
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
                      <div className={`p-2 rounded-lg ${tx.type === TransactionType.BUY_IN ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {tx.type === TransactionType.BUY_IN ? <DollarSign size={14} /> : <ArrowRightLeft size={14} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-200">
                          {tx.type === TransactionType.BUY_IN
                            ? `${toName} bought in` 
                            : `${fromName} sent to ${toName}`}
                        </div>
                        <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                   </div>
                   <div className="font-mono font-bold text-sm text-neutral-300">
                      {formatCurrency(tx.amount)}
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
