
import React, { useState, useMemo } from 'react';
import { GameSession, Player } from '../types';
import { Card, Button } from './UI';
import { calculateSettlement, calculatePayouts, formatCurrency, getPlayerStats } from '../services/gameService';
import { TrendingUp, BarChart3, Trophy, History, HandCoins, ArrowRight, Copy, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface GroupInsightsProps {
  groupGames: GameSession[];
  groupPlayers: Player[];
}

export const GroupInsights: React.FC<GroupInsightsProps> = ({ groupGames, groupPlayers }) => {
  const [insightTab, setInsightTab] = useState<'VOLUME' | 'HOF' | 'SETTLE'>('VOLUME');
  const [copied, setCopied] = useState(false);

  const finishedGames = useMemo(() => 
    groupGames.filter(g => !g.isActive).sort((a, b) => b.startTime - a.startTime), 
    [groupGames]
  );
  
  const latestFinishedGame = finishedGames[0];
  const activeGame = groupGames.find(g => g.isActive);

  const stats = useMemo(() => {
    let totalPot = 0;
    finishedGames.forEach(g => {
        const report = calculateSettlement(g);
        totalPot += report.totalBuyIn;
    });

    const hof = groupPlayers
      .map(p => getPlayerStats(p, finishedGames))
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 3);

    const volumeData = [...finishedGames]
      .sort((a, b) => a.startTime - b.startTime)
      .slice(-10)
      .map((g, idx) => ({
        name: `G${finishedGames.length - (Math.min(finishedGames.length, 10) - 1 - idx)}`,
        pot: calculateSettlement(g).totalBuyIn
      }));

    const settlementPlan = latestFinishedGame 
      ? calculatePayouts(calculateSettlement(latestFinishedGame))
      : [];

    return { totalPot, hof, volumeData, settlementPlan };
  }, [finishedGames, groupPlayers, latestFinishedGame]);

  const handleCopySettlement = () => {
    if (!stats.settlementPlan.length) return;
    const text = stats.settlementPlan
      .map(p => `${p.from} pays ${p.to}: ${formatCurrency(p.amount)}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderAvatar = (player: Player) => {
    if (player.avatar && player.avatar.startsWith('data:')) {
      return <img src={player.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-700" />;
    }
    const bgColor = player.avatar || '#262626';
    return (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white border border-neutral-700 shadow-inner text-xs"
        style={{ backgroundColor: bgColor }}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (finishedGames.length === 0 && !activeGame) return (
     <div className="text-center py-12 text-neutral-500 italic text-sm">
        Play some games to generate group pulse insights.
     </div>
  );

  return (
    <div className="bg-neutral-900/40 border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-4 bg-black/40 p-6 border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-red-500" /> Group Pulse
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-neutral-600 font-bold uppercase mb-0.5">Pot Volume Flow</div>
                  <div className="text-2xl font-bold text-white font-mono">{formatCurrency(stats.totalPot)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-600 font-bold uppercase mb-0.5">Average Session Pot</div>
                  <div className="text-xl font-bold text-white font-mono">
                    {finishedGames.length > 0 ? formatCurrency(stats.totalPot / finishedGames.length) : '$0.00'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button 
              onClick={() => setInsightTab('VOLUME')}
              className={`flex-1 py-2 px-1 text-[9px] font-black uppercase rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${insightTab === 'VOLUME' ? 'bg-red-600/10 border-red-600/50 text-red-500' : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}
            >
              <BarChart3 size={12} /> Volume
            </button>
            <button 
              onClick={() => setInsightTab('SETTLE')}
              className={`flex-1 py-2 px-1 text-[9px] font-black uppercase rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${insightTab === 'SETTLE' ? 'bg-green-600/10 border-green-600/50 text-green-500' : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}
            >
              <HandCoins size={12} /> Settle
            </button>
            <button 
              onClick={() => setInsightTab('HOF')}
              className={`flex-1 py-2 px-1 text-[9px] font-black uppercase rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${insightTab === 'HOF' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}
            >
              <Trophy size={12} /> Rank
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 p-6 bg-gradient-to-br from-neutral-900/10 to-transparent">
          {insightTab === 'VOLUME' && (
            <div className="h-64 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <History size={16} className="text-red-500" /> Recent Pot Values
                </h4>
                <span className="text-[10px] text-neutral-500 uppercase font-medium">Trends for {finishedGames.length > 10 ? 'Last 10' : 'All'} Games</span>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.volumeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                    <XAxis dataKey="name" fontSize={10} stroke="#404040" tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: '#171717'}}
                      contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px', fontSize: '10px'}}
                      formatter={(val: number) => [formatCurrency(val), 'Total Pot']}
                    />
                    <Bar dataKey="pot" radius={[4, 4, 0, 0]}>
                      {stats.volumeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === stats.volumeData.length - 1 ? '#dc2626' : '#404040'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {insightTab === 'SETTLE' && (
            <div className="h-64 animate-in slide-in-from-right-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <HandCoins size={16} className="text-green-500" /> Settlement Suggestion
                </h4>
                {stats.settlementPlan.length > 0 && (
                  <button 
                    onClick={handleCopySettlement}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 hover:bg-green-500/20"
                  >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? 'Copied' : 'Share Plan'}
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {activeGame && !latestFinishedGame && (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 animate-pulse">
                      <TrendingUp size={24} />
                    </div>
                    <p className="text-xs text-neutral-500 italic">Game in progress.<br/>Finish session to calculate payouts.</p>
                  </div>
                )}
                
                {stats.settlementPlan.length > 0 ? (
                  stats.settlementPlan.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-neutral-800/50 group">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-neutral-200">{p.from}</span>
                        <ArrowRight size={14} className="text-neutral-600 group-hover:text-red-500 transition-colors" />
                        <span className="text-sm font-bold text-neutral-200">{p.to}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-black text-green-500">{formatCurrency(p.amount)}</div>
                      </div>
                    </div>
                  ))
                ) : !activeGame && (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-xs italic">
                    No session data available.
                  </div>
                )}
              </div>
            </div>
          )}

          {insightTab === 'HOF' && (
            <div className="h-64 animate-in slide-in-from-right-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500" /> Top Group Winners
                </h4>
                <span className="text-[10px] text-neutral-500 uppercase font-medium">Profit Leaderboard</span>
              </div>
              <div className="flex-1 space-y-3">
                {stats.hof.filter(s => s.netProfit > 0).length > 0 ? stats.hof.filter(s => s.netProfit > 0).map((stat, idx) => {
                  const player = groupPlayers.find(p => p.id === stat.id);
                  return (
                    <div key={stat.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-neutral-800/50 hover:bg-neutral-800/30 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={`text-xs font-black ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-neutral-300' : 'text-orange-600'}`}>
                          #{idx + 1}
                        </div>
                        {player && renderAvatar(player)}
                        <div>
                          <div className="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">{stat.name}</div>
                          <div className="text-[10px] text-neutral-600 font-bold uppercase">{stat.gamesPlayed} Sessions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-green-500">+{formatCurrency(stat.netProfit)}</div>
                        <div className="text-[9px] text-neutral-600 font-bold uppercase tracking-tighter">Total Gain</div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="h-full flex items-center justify-center text-neutral-600 text-xs italic">
                    No profitable players yet. Settle games to rank up!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
