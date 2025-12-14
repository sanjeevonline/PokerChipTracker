import React, { useMemo } from 'react';
import { GameSession, TransactionType } from '../types';
import { calculateSettlement, formatCurrency } from '../services/gameService';
import { Button, Card } from './UI';
import { AlertTriangle, ArrowLeft, ArrowRightLeft, DollarSign, History, Edit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  // Sort transactions by time
  const sortedTransactions = [...game.transactions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="secondary" icon={<ArrowLeft size={18}/>}>Back to Dashboard</Button>
          <div>
             <h2 className="text-2xl font-bold text-white">Game Settlement</h2>
             <p className="text-neutral-400 text-sm">
               {new Date(game.startTime).toLocaleDateString()} • {report.durationMinutes} minutes
             </p>
          </div>
        </div>
        <Button onClick={onEdit} variant="ghost" icon={<Edit size={18}/>}>Edit Game</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="flex flex-col items-center justify-center text-center py-8 bg-gradient-to-br from-neutral-800 to-neutral-900 border-neutral-800">
            <div className="text-neutral-400 uppercase text-xs tracking-widest mb-2">Total Buy-In</div>
            <div className="text-4xl font-bold text-white font-mono">{formatCurrency(report.totalBuyIn)}</div>
         </Card>
         <Card className="flex flex-col items-center justify-center text-center py-8 bg-gradient-to-br from-neutral-800 to-neutral-900 border-neutral-800">
            <div className="text-neutral-400 uppercase text-xs tracking-widest mb-2">Total Chips</div>
            <div className="text-4xl font-bold text-green-500 font-mono">{formatCurrency(report.totalChips)}</div>
         </Card>
         <Card className={`flex flex-col items-center justify-center text-center py-8 ${report.discrepancy !== 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-gradient-to-br from-neutral-800 to-neutral-900 border-neutral-800'}`}>
            <div className="text-neutral-400 uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
               {report.discrepancy !== 0 && <AlertTriangle size={14} className="text-red-400" />}
               Discrepancy
            </div>
            <div className={`text-4xl font-bold font-mono ${report.discrepancy === 0 ? 'text-neutral-500' : 'text-red-500'}`}>
               {report.discrepancy > 0 ? '+' : ''}{formatCurrency(report.discrepancy)}
            </div>
         </Card>
      </div>

      {/* Chart */}
      <Card title="Net Profit/Loss">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                cursor={{fill: '#262626'}}
                contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px', color: '#f5f5f5'}}
                formatter={(value: number) => [formatCurrency(value), 'Net Profit']}
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailed Table */}
      <Card title="Player Results" className="overflow-hidden p-0">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-neutral-900/50 text-neutral-400 text-xs uppercase tracking-wider">
                 <th className="p-4 font-medium">Player</th>
                 <th className="p-4 font-medium text-right">Bank Buy-In</th>
                 <th className="p-4 font-medium text-right">Adjustments (Loans)</th>
                 <th className="p-4 font-medium text-right">Total Invested</th>
                 <th className="p-4 font-medium text-right">Final Stack</th>
                 <th className="p-4 font-medium text-right">Net Result</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-neutral-800/50 text-sm">
               {report.players.map(p => (
                 <tr key={p.playerId} className="hover:bg-neutral-800/30 transition-colors">
                   <td className="p-4 font-medium text-white">{p.name}</td>
                   <td className="p-4 text-right text-neutral-300">{formatCurrency(p.totalBuyIn)}</td>
                   <td className="p-4 text-right">
                     {p.transfersIn > 0 && <span className="text-red-400 block text-xs">Borrowed: {formatCurrency(p.transfersIn)}</span>}
                     {p.transfersOut > 0 && <span className="text-green-500 block text-xs">Loaned: {formatCurrency(p.transfersOut)}</span>}
                     {p.transfersIn === 0 && p.transfersOut === 0 && <span className="text-neutral-600">-</span>}
                   </td>
                   <td className="p-4 text-right font-medium text-neutral-200">{formatCurrency(p.netInvested)}</td>
                   <td className="p-4 text-right font-mono text-neutral-200">{formatCurrency(p.finalChips)}</td>
                   <td className={`p-4 text-right font-bold font-mono ${p.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {p.netProfit > 0 ? '+' : ''}{formatCurrency(p.netProfit)}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </Card>

      {/* Transaction Log */}
      <Card title="Transaction Log">
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {sortedTransactions.length === 0 ? (
            <div className="text-center text-neutral-500 py-4">
              <History size={32} className="mx-auto mb-2 opacity-50" />
              <p>No transactions recorded.</p>
            </div>
          ) : (
            sortedTransactions.map(tx => {
              const fromName = tx.fromId === 'BANK' ? 'Bank' : game.players.find(p => p.id === tx.fromId)?.name || 'Unknown';
              const toName = tx.toId === 'BANK' ? 'Bank' : game.players.find(p => p.id === tx.toId)?.name || 'Unknown';
              
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-neutral-900/40 rounded-lg border border-neutral-800/30">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === TransactionType.BUY_IN ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {tx.type === TransactionType.BUY_IN ? <DollarSign size={16} /> : <ArrowRightLeft size={16} />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-200">
                          {tx.type === TransactionType.BUY_IN
                            ? `${toName} bought in` 
                            : `${fromName} ➔ ${toName} (Loan)`}
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
    </div>
  );
};