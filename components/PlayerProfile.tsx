
import React, { useMemo } from 'react';
import { GameSession, Player } from '../types';
import { getPlayerStats, formatCurrency } from '../services/gameService';
import { Button, Card } from './UI';
import { ArrowLeft, Trophy, TrendingDown, TrendingUp, HandCoins, PiggyBank, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PlayerProfileProps {
  player: Player;
  games: GameSession[];
  onBack: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, games, onBack }) => {
  const stats = useMemo(() => getPlayerStats(player, games), [player, games]);

  const chartData = stats.history.map((h, i) => {
    const cumulative = stats.history.slice(0, i + 1).reduce((acc, curr) => acc + curr.profit, 0);
    return {
      date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      profit: h.profit,
      cumulative: cumulative
    };
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="secondary" icon={<ArrowLeft size={18}/>}>Back to Roster</Button>
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white border-2 border-neutral-700 bg-neutral-800 text-2xl shadow-xl">
               {player.name.charAt(0).toUpperCase()}
             </div>
             <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{player.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-bold bg-red-900/20 text-red-400 px-2 py-0.5 rounded border border-red-900/30 uppercase tracking-widest">Veteran Member</span>
                   <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{stats.gamesPlayed} Total Sessions</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-neutral-900/80 border-neutral-800 shadow-lg group hover:border-green-900/50 transition-colors">
           <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
             <Trophy size={10} className="text-yellow-600"/> Lifetime Profit
           </div>
           <div className={`text-2xl font-bold font-mono ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
             {stats.netProfit > 0 ? '+' : ''}{formatCurrency(stats.netProfit)}
           </div>
        </Card>
        
        <Card className="bg-neutral-900/80 border-neutral-800 shadow-lg group hover:border-red-900/50 transition-colors">
           <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
             <TrendingUp size={10} className="text-green-600"/> Win Rate
           </div>
           <div className="text-2xl font-bold text-white font-mono">
             {stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}%
           </div>
           <div className="text-[10px] text-neutral-600 font-bold uppercase mt-1">{stats.wins} Wins / {stats.losses} Losses</div>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800 shadow-lg group hover:border-blue-900/50 transition-colors">
           <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
             <Trophy size={10} className="text-green-500"/> Biggest Win
           </div>
           <div className="text-2xl font-bold text-green-500 font-mono">+{formatCurrency(stats.biggestWin)}</div>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800 shadow-lg group hover:border-red-900/50 transition-colors">
           <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
             <TrendingDown size={10} className="text-red-500"/> Biggest Loss
           </div>
           <div className="text-2xl font-bold text-red-500 font-mono">{formatCurrency(stats.biggestLoss)}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Card className="flex items-center justify-between shadow-lg">
            <div>
              <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                 <HandCoins size={12} className="text-red-500"/> Total Borrowed (Loans)
              </div>
              <div className="text-xl font-bold text-white font-mono">{formatCurrency(stats.totalBorrowed)}</div>
              <div className="text-[10px] text-neutral-600 font-medium mt-1">Total chips borrowed across all games.</div>
            </div>
         </Card>
         <Card className="flex items-center justify-between shadow-lg">
            <div>
              <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                 <PiggyBank size={12} className="text-green-500"/> Total Loaned Out
              </div>
              <div className="text-xl font-bold text-white font-mono">{formatCurrency(stats.totalLoaned)}</div>
              <div className="text-[10px] text-neutral-600 font-medium mt-1">Total chips lent to other players.</div>
            </div>
         </Card>
      </div>

      <Card title="Performance Trajectory (Cumulative Profits)" className="shadow-xl">
        <div className="w-full min-h-[300px] mt-4">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                <XAxis dataKey="date" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#525252" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{stroke: '#10b981', strokeWidth: 1}}
                  contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px', color: '#f5f5f5', fontSize: '12px', padding: '12px'}}
                  formatter={(value: number) => [formatCurrency(value), 'Bankroll Status']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-600">
               <TrendingUp size={48} className="opacity-10 mb-4" />
               <p className="text-sm italic">Play more games to see your bankroll trajectory.</p>
            </div>
          )}
        </div>
      </Card>

      <Card title="Session History Ledger" className="shadow-xl overflow-hidden p-0">
         <div className="max-h-96 overflow-y-auto custom-scrollbar">
           {stats.history.length === 0 ? (
             <div className="p-8 text-center text-neutral-600 italic text-sm">No historical data recorded for this player.</div>
           ) : (
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-900 text-neutral-500 text-[10px] uppercase font-bold tracking-widest border-b border-neutral-800">
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Session Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {[...stats.history].reverse().map((h, i) => (
                    <tr key={i} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                         <Calendar size={14} className="text-neutral-600" />
                         <span className="text-sm font-medium text-neutral-300">
                           {new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                         </span>
                      </td>
                      <td className={`p-4 text-right font-mono font-bold text-lg ${h.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {h.profit > 0 ? '+' : ''}{formatCurrency(h.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           )}
         </div>
      </Card>
    </div>
  );
};
