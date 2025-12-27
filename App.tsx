
import React, { useState, useEffect, useMemo } from 'react';
import { GameSession, Player, Group } from './types';
import { api } from './services/gameService';
import { supabase } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { ActiveGame } from './components/ActiveGame';
import { SettlementReport } from './components/SettlementReport';
import { History } from './components/History';
import { PlayersList } from './components/PlayersList';
import { PlayerProfile } from './components/PlayerProfile';
import { GroupSelection } from './components/GroupSelection';
import { GroupInsights } from './components/GroupInsights';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { NewGameModal } from './components/NewGameModal';
import { ShareGroupModal } from './components/ShareGroupModal';
// Fix: Import icons from lucide-react instead of components/UI which does not export them
import { Modal, Button } from './components/UI';
import { Terminal, ShieldAlert, Copy, Check, X, Loader2, Database } from 'lucide-react';

enum View {
  GROUPS,
  DASHBOARD,
  ACTIVE_GAME,
  SETTLEMENT,
  HISTORY,
  PLAYERS,
  PLAYER_PROFILE
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isSessionCheckComplete, setIsSessionCheckComplete] = useState(!supabase);
  const [groups, setGroups] = useState<Group[]>([]);
  const [games, setGames] = useState<GameSession[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [viewingGameId, setViewingGameId] = useState<string | null>(null);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPulseModalOpen, setIsPulseModalOpen] = useState(false);
  const [pulseGroupId, setPulseGroupId] = useState<string | null>(null);
  const [sharingGroup, setSharingGroup] = useState<Group | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedGroups, fetchedGames, fetchedPlayers] = await Promise.all([
        api.fetchGroups(),
        api.fetchGames(),
        api.fetchPlayers()
      ]);
      setGroups(fetchedGroups);
      setGames(fetchedGames);
      setPlayers(fetchedPlayers);
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) { loadData(); return; }
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setIsSessionCheckComplete(true);
      if (session) loadData();
    });
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) loadData();
      else { setGroups([]); setGames([]); setPlayers([]); }
    });
    return () => { if (subscription && (subscription as any).unsubscribe) (subscription as any).unsubscribe(); };
  }, []);

  const currentGroup = groups.find(g => g.id === selectedGroupId);
  const groupGames = games.filter(g => selectedGroupId ? g.groupId === selectedGroupId : false);
  const groupPlayers = currentGroup ? players.filter(p => currentGroup.playerIds.includes(p.id)) : [];
  const activeGame = games.find(g => g.id === activeGameId);
  const viewingGame = games.find(g => g.id === viewingGameId);
  const viewingPlayer = players.find(p => p.id === viewingPlayerId);
  const pulseGroup = groups.find(g => g.id === pulseGroupId);
  const pulseGames = games.filter(g => g.groupId === pulseGroupId);
  const pulsePlayers = pulseGroup ? players.filter(p => pulseGroup.playerIds.includes(p.id)) : [];

  const createPlayerInCurrentGroup = async (name: string): Promise<Player> => {
    if (!name.trim() || !selectedGroupId) throw new Error("Missing name or group selection.");
    if (groupPlayers.find(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Player "${name}" is already a member of this group.`);
    }
    const player: Player = { id: crypto.randomUUID(), name: name.trim() };
    
    // Pass selectedGroupId to satisfy mandatory DB constraint
    await api.savePlayer(player, selectedGroupId);
    
    setPlayers(prev => [...prev, { ...player, groupId: selectedGroupId }].sort((a, b) => a.name.localeCompare(b.name)));
    await api.addPlayerToGroup(selectedGroupId, player.id);
    setGroups(prev => prev.map(g => g.id === selectedGroupId ? { ...g, playerIds: Array.from(new Set([...g.playerIds, player.id])) } : g));
    return player;
  };

  const handleUpdateGame = async (updatedGame: GameSession) => {
    try {
      setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
      await api.saveGame(updatedGame);
    } catch (e: any) { setGlobalError(e.message || String(e)); }
  };

  const rlsFixSql = `-- Run this in your Supabase SQL Editor to fix schema and RLS errors:

-- 1. Ensure Table Structure
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY, 
  name text NOT NULL, 
  player_ids jsonb DEFAULT '[]'::jsonb, 
  created_at timestamptz DEFAULT now(), 
  owner_id uuid REFERENCES auth.users(id), 
  shared_with_emails text[] DEFAULT '{}'::text[]
);

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY, 
  name text NOT NULL, 
  group_id uuid REFERENCES groups(id) NOT NULL -- Mandatory group link
);

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY, 
  data jsonb NOT NULL, 
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Users can manage groups" ON groups FOR ALL TO authenticated 
USING (auth.uid() = owner_id OR (auth.jwt() ->> 'email') = ANY(shared_with_emails)) 
WITH CHECK (auth.uid() = owner_id OR (auth.jwt() ->> 'email') = ANY(shared_with_emails));

CREATE POLICY "Users can manage games" ON games FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can manage players" ON players FOR ALL TO authenticated USING (true) WITH CHECK (true);`;

  if (!isSessionCheckComplete) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><Loader2 size={48} className="animate-spin text-red-600" /></div>;
  if (supabase && !session) return <Auth />;
  if (isLoading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400"><div className="animate-pulse flex flex-col items-center"><Database size={48} className="mb-4 text-red-600" /><div>Loading ChipTracker...</div></div></div>;

  const renderContent = () => {
    switch (currentView) {
      case View.GROUPS:
        return <GroupSelection 
          groups={groups} 
          activeGames={games.filter(g => g.isActive)} 
          allGames={games} 
          onSelectGroup={id => { setSelectedGroupId(id); setCurrentView(View.DASHBOARD); }} 
          onResumeGame={(gid, id) => { setSelectedGroupId(gid); setActiveGameId(id); setCurrentView(View.ACTIVE_GAME); }} 
          onCreateGroup={async name => { 
            try {
              const g: Group = { id: crypto.randomUUID(), name: name.trim(), playerIds: [], createdAt: Date.now(), ownerId: session?.user?.id, sharedWithEmails: [] }; 
              await api.saveGroup(g); 
              setGroups([...groups, g]); 
              setSelectedGroupId(g.id); 
              setCurrentView(View.DASHBOARD); 
            } catch (e: any) {
              setGlobalError(e.message || String(e));
              throw e; // Re-throw to let the modal handle its own state if needed
            }
          }} 
          onDeleteGroup={async id => { 
            try {
              await api.deleteGroup(id); 
              setGroups(prev => prev.filter(g => g.id !== id)); 
              if (selectedGroupId === id) setSelectedGroupId(null);
            } catch (e: any) {
              setGlobalError(e.message || String(e));
            }
          }} 
          onShareGroup={g => { setSharingGroup(g); setIsShareModalOpen(true); }} 
          onShowPulse={id => { setPulseGroupId(id); setIsPulseModalOpen(true); }} 
          currentUserId={session?.user?.id} 
          currentUserEmail={session?.user?.email} 
          players={players} 
        />;
      case View.ACTIVE_GAME:
        return activeGame ? <ActiveGame game={activeGame} allPlayers={groupPlayers} onCreatePlayer={createPlayerInCurrentGroup} onUpdateGame={handleUpdateGame} onEndGame={() => { setViewingGameId(activeGame.id); setActiveGameId(null); setCurrentView(View.SETTLEMENT); }} onCancelEdit={() => activeGame.endTime ? handleUpdateGame({ ...activeGame, isActive: false }).then(() => { setViewingGameId(activeGame.id); setCurrentView(View.SETTLEMENT); }) : setCurrentView(View.DASHBOARD)} /> : null;
      case View.SETTLEMENT:
        return viewingGame ? <SettlementReport game={viewingGame} onBack={() => setCurrentView(View.DASHBOARD)} onEdit={() => { handleUpdateGame({ ...viewingGame, isActive: true }); setActiveGameId(viewingGame.id); setCurrentView(View.ACTIVE_GAME); }} /> : null;
      case View.HISTORY:
        return <History games={groupGames.filter(g => !g.isActive)} onSelectGame={g => { setViewingGameId(g.id); setCurrentView(View.SETTLEMENT); }} />;
      case View.PLAYERS:
        return <PlayersList players={groupPlayers} games={games} onSelectPlayer={id => { setViewingPlayerId(id); setCurrentView(View.PLAYER_PROFILE); }} onCreatePlayerInGroup={createPlayerInCurrentGroup} />;
      case View.PLAYER_PROFILE:
        return viewingPlayer ? <PlayerProfile player={viewingPlayer} games={games} onBack={() => setCurrentView(View.PLAYERS)} /> : null;
      case View.DASHBOARD:
      default:
        return (
          <div className="space-y-6">
            {globalError && (
              <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-2xl animate-in zoom-in">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-red-500 shrink-0 mt-1" size={24} />
                  <div className="flex-1">
                    <h3 className="text-red-200 font-bold uppercase text-xs tracking-widest mb-1">Database Error</h3>
                    <p className="text-sm text-red-300/80 mb-4">{globalError}</p>
                    <div className="bg-black/40 rounded-lg p-3 border border-red-900/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">Fix SQL Script</span>
                        <button onClick={() => { navigator.clipboard.writeText(rlsFixSql); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[10px] bg-red-600/20 hover:bg-red-600/40 text-red-200 px-2 py-1 rounded transition-colors">{copied ? 'Copied!' : 'Copy SQL'}</button>
                      </div>
                      <pre className="text-[10px] font-mono text-neutral-400 overflow-x-auto whitespace-pre">{rlsFixSql}</pre>
                    </div>
                  </div>
                  <button onClick={() => setGlobalError(null)} className="p-1 text-red-500"><X size={20} /></button>
                </div>
              </div>
            )}
            <Dashboard currentGroup={currentGroup} groupPlayers={groupPlayers} groupGames={groupGames} canShare={currentGroup?.ownerId === session?.user?.id || currentGroup?.sharedWithEmails?.includes(session?.user?.email)} onStartNewGame={() => setIsNewGameModalOpen(true)} onResumeGame={id => { setActiveGameId(id); setCurrentView(View.ACTIVE_GAME); }} onShowPulse={id => { setPulseGroupId(id); setIsPulseModalOpen(true); }} onOpenShare={g => { setSharingGroup(g); setIsShareModalOpen(true); }} onViewHistory={() => setCurrentView(View.HISTORY)} onSelectGameHistory={g => { setViewingGameId(g.id); setCurrentView(View.SETTLEMENT); }} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans overflow-x-hidden">
      <Navigation currentGroup={currentGroup} selectedGroupId={selectedGroupId} session={session} onBackToGroups={() => { setSelectedGroupId(null); setCurrentView(View.GROUPS); }} onSetView={setCurrentView} onLogout={async () => { await (supabase.auth as any).signOut(); setSession(null); }} />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">{renderContent()}</main>
      <Modal isOpen={isPulseModalOpen} onClose={() => setIsPulseModalOpen(false)} title={`${pulseGroup?.name || 'Group'} Pulse`} size="xl"><GroupInsights groupGames={pulseGames} groupPlayers={pulsePlayers} /></Modal>
      <ShareGroupModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} group={sharingGroup} session={session} onGroupUpdated={updated => setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))} />
      <NewGameModal isOpen={isNewGameModalOpen} onClose={() => setIsNewGameModalOpen(false)} currentGroup={currentGroup} groupPlayers={groupPlayers} onCreatePlayer={createPlayerInCurrentGroup} onStartGame={game => { setGames([game, ...games]); setActiveGameId(game.id); setCurrentView(View.ACTIVE_GAME); }} />
    </div>
  );
}
