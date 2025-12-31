
import React, { useState, useMemo } from 'react';
import { GameSession, Player, TransactionType } from '../types';
import { calculateSettlement, calculatePayouts, formatCurrency, getPlayerStats } from '../services/gameService';
import { TrendingUp, BarChart3, Trophy, History, HandCoins, ArrowRight, Copy, Check, Coins, Calendar, Landmark, Repeat, Zap, History as HistorySubIcon } from 'lucide-react';
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

  // Aggregate highlights across all ledger entries in group history
  const groupHighlights = useMemo(() => {
    if (finishedGames.length === 0) return null;

    const stats: Record<string, { loansOut: number, loansIn: number, buyInCount: number, txCount: number }> = {};
    groupPlayers.forEach(p => {
      stats[p.id] = { loansOut: 0, loansIn: 0, buyInCount: 0, txCount: 0 };
    });

    finishedGames.forEach(game => {
      game.transactions.forEach(t => {
        if (t.fromId !== 'BANK' && stats[t.fromId]) {
          stats[t.fromId].txCount++;
          if (t.type === TransactionType.TRANSFER) stats[t.fromId].loansOut += t.amount;
        }
        if (t.toId !== 'BANK' && stats[t.toId]) {
          stats[t.toId].txCount++;
          if (t.type === TransactionType.TRANSFER) stats[t.toId].loansIn += t.amount;
          if (t.type === TransactionType.BUY_IN) stats[t.toId].buyInCount++;
        }
      });
    });

    const getPlayerName = (id: string) => groupPlayers.find(p => p.id === id)?.name || 'Unknown';

    const financier = Object.entries(stats).sort((a, b) => b[1].loansOut - a[1].loansOut)[0];
    const borrower = Object.entries(stats).sort((a, b) => b[1].loansIn - a[1].loansIn)[0];
    const rebuyer = Object.entries(stats).sort((a, b) => b[1].buyInCount - a[1].buyInCount)[0];
    const actionJunkie = Object.entries(stats).sort((a, b) => b[1].txCount - a[1].txCount)[0];

    return {
      financier: financier && financier[1].loansOut > 0 ? { name: getPlayerName(financier[0]), val: financier[1].loansOut } : null,
      borrower: borrower && borrower[1].loansIn > 0 ? { name: getPlayerName(borrower[0]), val: borrower[1].loansIn } : null,
      rebuyer: rebuyer && rebuyer[1].buyInCount > 0 ? { name: getPlayerName(rebuyer[0]), count: rebuyer[1].buyInCount } : null,
      action: actionJunkie && actionJunkie[1].txCount > 0 ? { name: getPlayerName(actionJunkie[0]), count: actionJunkie[1].txCount } : null
    };
  }, [finishedGames, groupPlayers]);

  const stats = useMemo(() => {
    let totalPot = 0;
    finishedGames.forEach(g => {
        const report = calculateSettlement(g);
        totalPot += report.totalBuyIn;
    });

    const hof = groupPlayers
      .map(p => getPlayerStats(p, finishedGames))
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 5);

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

    const lastWinner = latestFinishedGame ? calculateSettlement(latestFinishedGame).players[0] : null;

    return { totalPot, hof, volumeData, settlementPlan, lastWinner, gameCount: finishedGames.length };
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

  if (finishedGames.length === 0 && !activeGame) return (
     <div className="text-center py-12 text-neutral-500 italic text-sm">Play some games to generate group pulse insights.</div>
  );

  return (
    <div className="space-y-8">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow-sm">
          <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Coins size={10} className="text-red-500" /> Total Volume
          </div>
          <div className="text-xl font-mono font-black text-white leading-none">
            {formatCurrency(stats.totalPot)}
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow-sm">
          <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Trophy size={10} className="text-yellow-500" /> Reigning Champ
          </div>
          <div className="text-xl font-black text-white leading-none truncate pr-1">
            {stats.lastWinner?.name || 'N/A'}
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow-sm hidden sm:block">
          <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Calendar size={10} className="text-blue-500" /> Sessions
          </div>
          <div className="text-xl font-black text-white leading-none">
            {stats.gameCount} Games
          </div>
        </div>
      </div>

      {/* All-Time Group Historical Highlights */}
      {groupHighlights && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] flex items-center gap-3 px-1">
            <TrendingUp size={14} /> ALL-TIME GROUP ACHIEVEMENTS
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {groupHighlights.financier && (
              <div className="bg-blue-600/5 border border-blue-500/10 p-3 rounded-xl flex items-center gap-3">
                <div className="bg-blue-600/10 p-2 rounded-lg text-blue-500/80"><Landmark size={18}/></div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest leading-none mb-1">The Financier</div>
                  <div className="text-sm font-bold text-white truncate">{groupHighlights.financier.name}</div>
                  <div className="text-[10px] text-blue-400/50 font-mono">Lent {formatCurrency(groupHighlights.financier.val)}</div>
                </div>
              </div>
            )}
            {groupHighlights.borrower && (
              <div className="bg-red-600/5 border border-red-500/10 p-3 rounded-xl flex items-center gap-3">
                <div className="bg-red-600/10 p-2 rounded-lg text-red-500/80"><HistorySubIcon size={18}/></div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black text-red-500/60 uppercase tracking-widest leading-none mb-1">The Borrower</div>
                  <div className="text-sm font-bold text-white truncate">{groupHighlights.borrower.name}</div>
                  <div className="text-[10px] text-red-400/50 font-mono">Took {formatCurrency(groupHighlights.borrower.val)}</div>
                </div>
              </div>
            )}
            {groupHighlights.rebuyer && (
              <div className="bg-green-600/5 border border-green-500/10 p-3 rounded-xl flex items-center gap-3">
                <div className="bg-green-600/10 p-2 rounded-lg text-green-500/80"><Repeat size={18}/></div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black text-green-500/60 uppercase tracking-widest leading-none mb-1">Re-Buy King</div>
                  <div className="text-sm font-bold text-white truncate">{groupHighlights.rebuyer.name}</div>
                  <div className="text-[10px] text-green-400/50 font-mono">{groupHighlights.rebuyer.count} Buy-ins</div>
                </div>
              </div>
            )}
            {groupHighlights.action && (
              <div className="bg-amber-600/5 border border-amber-500/10 p-3 rounded-xl flex items-center gap-3">
                <div className="bg-amber-600/10 p-2 rounded-lg text-amber-500/80"><Zap size={18}/></div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest leading-none mb-1">Action Junkie</div>
                  <div className="text-sm font-bold text-white truncate">{groupHighlights.action.name}</div>
                  <div className="text-[10px] text-amber-400/50 font-mono">{groupHighlights.action.count} Entries</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-4 bg-black/40 p-6 border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-red-500" /> Analytical Pulse
                </h3>
                <div className="space-y-4">
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
              <button onClick={() => setInsightTab('VOLUME')} className={`flex-1 py-2 px-1 text-[9px] font-black uppercase rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${insightTab === 'VOLUME' ? 'bg-red-600/10 border-red-600/50 text-red-500' : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}><BarChart3 size={12} /> Volume</button>
              <button onClick={() => setInsightTab('SETTLE')} className={`flex-1 py-2 px-1 text-[9px] font-black uppercase rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${insightTab === 'SETTLE' ? 'bg-green-600/10 border-green-600/50 text-green-500' : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}><HandCoins size={12} /> Settle</button>
              <button onClick={() => setInsightTab('HOF')} className={`flex-1 py-2 px-1 text-[9px] font-black uppercase rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${insightTab === 'HOF' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}><Trophy size={12} /> Rank</button>
            </div>
          </div>
          <div className="lg:col-span-8 p-6 bg-gradient-to-br from-neutral-900/10 to-transparent">
            {insightTab === 'VOLUME' && (
              <div className="h-64 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><History size={16} className="text-red-500" /> Recent Pot Values</h4>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={stats.volumeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                      <XAxis dataKey="name" fontSize={10} stroke="#404040" tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#171717'}} contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px', fontSize: '10px'}} formatter={(val: number) => [formatCurrency(val), 'Total Pot']} />
                      <Bar dataKey="pot" radius={[4, 4, 0, 0]}>{stats.volumeData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === stats.volumeData.length - 1 ? '#dc2626' : '#404040'} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {insightTab === 'SETTLE' && (
              <div className="h-64 animate-in slide-in-from-right-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><HandCoins size={16} className="text-green-500" /> Settlement Suggestion</h4>
                  {stats.settlementPlan.length > 0 && <button onClick={handleCopySettlement} className="flex items-center gap-1.5 text-[9px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 hover:bg-green-500/20">{copied ? <Check size={10} /> : <Copy size={10} />}{copied ? 'Copied' : 'Share Plan'}</button>}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {stats.settlementPlan.length > 0 ? stats.settlementPlan.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-neutral-800/50 group">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-neutral-200">{p.from}</span>
                        <ArrowRight size={14} className="text-neutral-600 group-hover:text-red-500 transition-colors" />
                        <span className="text-sm font-bold text-neutral-200">{p.to}</span>
                      </div>
                      <div className="text-right"><div className="text-sm font-mono font-black text-green-500">{formatCurrency(p.amount)}</div></div>
                    </div>
                  )) : <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-xs italic">No session data available.</div>}
                </div>
              </div>
            )}
            {insightTab === 'HOF' && (
              <div className="h-64 animate-in slide-in-from-right-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Trophy size={16} className="text-yellow-500" /> Top Group Winners</h4>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {stats.hof.filter(s => s.netProfit > 0).length > 0 ? stats.hof.filter(s => s.netProfit > 0).map((stat, idx) => (
                    <div key={stat.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-neutral-800/50 hover:bg-neutral-800/30 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={`text-xs font-black ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-neutral-300' : idx === 2 ? 'text-orange-600' : 'text-neutral-500'}`}>#{idx + 1}</div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white border border-neutral-700 bg-neutral-800 text-xs">{stat.name.charAt(0).toUpperCase()}</div>
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
                  )) : <div className="h-full flex items-center justify-center text-neutral-600 text-xs italic">No profitable players yet. Settle games to rank up!</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
