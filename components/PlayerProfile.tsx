import React, { useMemo } from 'react';
import { GameSession, Player } from '../types';
import { getPlayerStats, formatCurrency } from '../services/gameService';
import { Button, Card } from './UI';
import { ArrowLeft, Trophy, TrendingDown, TrendingUp, HandCoins, PiggyBank } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PlayerProfileProps {
  player: Player;
  games: GameSession[];
  onBack: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, games, onBack }) => {
  const stats = useMemo(() => getPlayerStats(player, games), [player, games]);

  // Transform history for chart
  const chartData = stats.history.map((h, i) => {
    // Calculate cumulative profit for the line chart
    const cumulative = stats.history.slice(0, i + 1).reduce((acc, curr) => acc + curr.profit, 0);
    return {
      date: new Date(h.date).toLocaleDateString(),
      profit: h.profit,
      cumulative: cumulative
    };
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="secondary" icon={<ArrowLeft size={18}/>}>Back to List</Button>
        <div>
           <h2 className="text-2xl font-bold text-white">{player.name}</h2>
           <p className="text-slate-400 text-sm">Player Profile</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/80 border-slate-700">
           <div className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1">
             <Trophy size={12}/> Net Earnings
           </div>
           <div className={`text-2xl font-bold font-mono ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
             {stats.netProfit > 0 ? '+' : ''}{formatCurrency(stats.netProfit)}
           </div>
        </Card>
        
        <Card className="bg-slate-800/80 border-slate-700">
           <div className="text-slate-400 text-xs uppercase mb-1">Win Rate</div>
           <div className="text-2xl font-bold text-white font-mono">
             {stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}%
           </div>
           <div className="text-xs text-slate-500 mt-1">{stats.wins}W - {stats.losses}L</div>
        </Card>

        <Card className="bg-slate-800/80 border-slate-700">
           <div className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1">
             <TrendingUp size={12}/> Biggest Win
           </div>
           <div className="text-2xl font-bold text-emerald-400 font-mono">
             +{formatCurrency(stats.biggestWin)}
           </div>
        </Card>

        <Card className="bg-slate-800/80 border-slate-700">
           <div className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1">
             <TrendingDown size={12}/> Biggest Loss
           </div>
           <div className="text-2xl font-bold text-red-400 font-mono">
             {formatCurrency(stats.biggestLoss)}
           </div>
        </Card>
      </div>

      {/* Loan Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Card className="flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1">
                 <HandCoins size={14} className="text-red-400"/> Lifetime Borrowed
              </div>
              <div className="text-xl font-bold text-white font-mono">{formatCurrency(stats.totalBorrowed)}</div>
              <div className="text-xs text-slate-500 mt-1">Total value of transfers received</div>
            </div>
         </Card>
         <Card className="flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1">
                 <PiggyBank size={14} className="text-emerald-400"/> Lifetime Loaned
              </div>
              <div className="text-xl font-bold text-white font-mono">{formatCurrency(stats.totalLoaned)}</div>
              <div className="text-xs text-slate-500 mt-1">Total value of transfers sent</div>
            </div>
         </Card>
      </div>

      {/* Performance Chart */}
      {chartData.length > 1 && (
        <Card title="Profit Trend (Cumulative)">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{stroke: '#334155'}}
                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc'}}
                  formatter={(value: number) => [formatCurrency(value), 'Total Profit']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Game History List */}
      <Card title="Game History">
         <div className="space-y-1">
           {stats.history.length === 0 && <p className="text-slate-500 text-sm">No games played.</p>}
           {stats.history.map((h, i) => (
             <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/30 transition-colors border-b border-slate-700/30 last:border-0">
               <div className="text-sm text-slate-300">
                  {new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
               </div>
               <div className={`font-mono font-bold ${h.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                 {h.profit > 0 ? '+' : ''}{formatCurrency(h.profit)}
               </div>
             </div>
           ))}
         </div>
      </Card>
    </div>
  );
};
