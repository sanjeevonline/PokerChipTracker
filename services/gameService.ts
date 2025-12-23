
import { GameSession, Transaction, TransactionType, Player, GameSettlementReport, PlayerSettlement, PlayerStats, Group } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEY_GAMES = 'chiptracker_games';
const STORAGE_KEY_PLAYERS = 'chiptracker_players';
const STORAGE_KEY_GROUPS = 'chiptracker_groups';

// --- Data Access Layer ---

export const api = {
  /**
   * Fetch all players from DB or LocalStorage
   */
  fetchPlayers: async (): Promise<Player[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');
      
      if (!error && data) {
        return data as Player[];
      }
      if (error) console.error("Supabase error fetching players:", error.message || JSON.stringify(error));
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_PLAYERS);
      if (raw) {
        return JSON.parse(raw).sort((a: Player, b: Player) => a.name.localeCompare(b.name));
      }
      return [];
    } catch (e) {
      console.error("Failed to parse players from local storage", e);
      return [];
    }
  },

  /**
   * Create a new player
   */
  savePlayer: async (player: Player): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('players').insert(player);
      if (error) {
        console.error("Supabase error saving player:", error.message);
        if (error.code === '42501') {
          throw new Error("RLS Policy Error: You don't have permission to add players. Please run the setup SQL.");
        }
      }
      return;
    }

    const players = await api.fetchPlayers();
    const updated = [...players, player].sort((a, b) => a.name.localeCompare(b.name));
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(updated));
  },

  /**
   * Fetch Groups
   */
  fetchGroups: async (): Promise<Group[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('groups')
        .select('*');

      if (!error && data) {
        return data.map((d: any) => ({
           id: d.id,
           name: d.name,
           playerIds: d.player_ids || d.playerIds || [],
           createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
           ownerId: d.owner_id || d.ownerId,
           sharedWithEmails: d.shared_with_emails || d.sharedWithEmails || []
        })).sort((a: Group, b: Group) => a.createdAt - b.createdAt);
      }
      if (error) {
        console.error("Supabase error fetching groups:", error.message || JSON.stringify(error));
        return [];
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_GROUPS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Save Group
   */
  saveGroup: async (group: Group): Promise<void> => {
    if (supabase) {
      // Robust session check to ensure we have a valid owner_id
      const { data: { user } } = await (supabase.auth as any).getUser();
      
      const payload = {
        id: group.id,
        name: group.name,
        player_ids: group.playerIds,
        created_at: new Date(group.createdAt).toISOString(),
        owner_id: group.ownerId || user?.id,
        shared_with_emails: group.sharedWithEmails || []
      };

      const { error } = await supabase.from('groups').upsert(payload);
      
      if (error) {
        console.error("Supabase error saving group:", error.message, error.code);
        if (error.code === '42501') {
           throw new Error(`SECURITY_DENIED: Your Supabase Row Level Security (RLS) is blocking this update. You must configure policies for the 'groups' table to allow INSERT and UPDATE for owners and collaborators.`);
        }
        throw error;
      }
      return;
    }

    const groups = await api.fetchGroups();
    const index = groups.findIndex(g => g.id === group.id);
    let updated;
    if (index >= 0) {
      updated = groups.map(g => g.id === group.id ? group : g);
    } else {
      updated = [...groups, group];
    }
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(updated));
  },

  /**
   * Delete Group
   */
  deleteGroup: async (groupId: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) {
        console.error("Supabase error deleting group:", error.message);
        if (error.code === '42501') {
           throw new Error("SECURITY_DENIED: RLS policy is blocking group deletion.");
        }
        throw error;
      }
      return;
    }

    const groups = await api.fetchGroups();
    const updated = groups.filter(g => g.id !== groupId);
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(updated));
  },

  /**
   * Add Player to Group
   */
  addPlayerToGroup: async (groupId: string, playerId: string): Promise<void> => {
    const groups = await api.fetchGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    if (!group.playerIds.includes(playerId)) {
      const updatedGroup = { ...group, playerIds: [...group.playerIds, playerId] };
      await api.saveGroup(updatedGroup);
    }
  },

  /**
   * Fetch all games
   */
  fetchGames: async (): Promise<GameSession[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('games')
        .select('data')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((row: any) => row.data) as GameSession[];
      }
      if (error) console.error("Supabase error fetching games:", error.message || JSON.stringify(error));
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_GAMES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Save or Update a single game
   */
  saveGame: async (game: GameSession): Promise<void> => {
    if (supabase) {
      const { error } = await supabase
        .from('games')
        .upsert({ 
          id: game.id, 
          data: game,
          created_at: new Date(game.startTime).toISOString()
        });
        
      if (error) {
        console.error("Supabase error saving game:", error.message);
        if (error.code === '42501') {
           throw new Error("SECURITY_DENIED: RLS policy is blocking 'games' table updates.");
        }
      }
      return;
    }

    const games = await api.fetchGames();
    const index = games.findIndex(g => g.id === game.id);
    let updatedGames;
    if (index >= 0) {
      updatedGames = games.map(g => g.id === game.id ? game : g);
    } else {
      updatedGames = [game, ...games];
    }
    localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(updatedGames));
  },

  /**
   * Verify if a user exists by their email via the public profiles table.
   */
  checkUserExistsByEmail: async (email: string): Promise<boolean> => {
    if (!supabase) return true; 
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          throw new Error("TABLE_MISSING: The 'profiles' table does not exist. Please run the setup SQL.");
        }
        throw error;
      }

      return !!data;
    } catch (err: any) {
      console.error("User lookup failed:", err.message);
      throw err;
    }
  }
};

// --- Calculation Logic (Sync) ---
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const calculateSettlement = (game: GameSession): GameSettlementReport => {
  const settlements: PlayerSettlement[] = game.players.map(p => {
    const bankBuyIns = game.transactions
      .filter(t => t.type === TransactionType.BUY_IN && t.toId === p.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const transfersIn = game.transactions
      .filter(t => t.type === TransactionType.TRANSFER && t.toId === p.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const transfersOut = game.transactions
      .filter(t => t.type === TransactionType.TRANSFER && t.fromId === p.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const cashOutsDuringGame = game.transactions
      .filter(t => t.type === TransactionType.CASH_OUT && t.fromId === p.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const netInvested = round((bankBuyIns - cashOutsDuringGame) + (transfersIn - transfersOut));
    const finalChips = game.playerStates[p.id]?.finalChips || 0;

    return {
      playerId: p.id,
      name: p.name,
      totalBuyIn: round(bankBuyIns - cashOutsDuringGame),
      transfersIn: round(transfersIn),
      transfersOut: round(transfersOut),
      netInvested,
      finalChips: round(finalChips),
      netProfit: round(finalChips - netInvested)
    };
  });

  const totalBuyIn = round(settlements.reduce((sum, s) => sum + s.totalBuyIn, 0));
  const totalChips = round(settlements.reduce((sum, s) => sum + s.finalChips, 0));
  
  const endTime = game.endTime || Date.now();
  const durationMinutes = Math.floor((endTime - game.startTime) / (1000 * 60));

  return {
    players: settlements.sort((a, b) => b.netProfit - a.netProfit),
    totalBuyIn,
    totalChips,
    discrepancy: round(totalChips - totalBuyIn),
    durationMinutes
  };
};

/**
 * Minimizes transactions to settle up.
 * Returns a list of who pays how much to whom.
 */
export const calculatePayouts = (report: GameSettlementReport) => {
  const debtors = report.players
    .filter(p => p.netProfit < 0)
    .map(p => ({ ...p, netProfit: Math.abs(p.netProfit) }))
    .sort((a, b) => b.netProfit - a.netProfit);
    
  const creditors = report.players
    .filter(p => p.netProfit > 0)
    .sort((a, b) => b.netProfit - a.netProfit);

  const payouts: { from: string; to: string; amount: number }[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    
    const amount = Math.min(debtor.netProfit, creditor.netProfit);
    if (amount > 0.01) {
      payouts.push({
        from: debtor.name,
        to: creditor.name,
        amount: round(amount)
      });
    }

    debtor.netProfit -= amount;
    creditor.netProfit -= amount;

    if (debtor.netProfit <= 0.01) dIdx++;
    if (creditor.netProfit <= 0.01) cIdx++;
  }

  return payouts;
};

export const getPlayerStats = (player: Player, games: GameSession[]): PlayerStats => {
  const stats: PlayerStats = {
    id: player.id,
    name: player.name,
    gamesPlayed: 0,
    totalBuyIn: 0,
    netProfit: 0,
    totalBorrowed: 0,
    totalLoaned: 0,
    wins: 0,
    losses: 0,
    biggestWin: 0,
    biggestLoss: 0,
    history: []
  };

  games.forEach(game => {
    if (game.isActive) return;
    const isInGame = game.players.some(p => p.id === player.id);
    if (!isInGame) return;

    const report = calculateSettlement(game);
    const result = report.players.find(p => p.playerId === player.id);

    if (result) {
      stats.gamesPlayed++;
      stats.totalBuyIn += result.totalBuyIn;
      stats.netProfit += result.netProfit;
      stats.totalBorrowed += result.transfersIn;
      stats.totalLoaned += result.transfersOut;
      
      if (result.netProfit > 0) stats.wins++;
      if (result.netProfit < 0) stats.losses++;

      if (result.netProfit > stats.biggestWin) stats.biggestWin = result.netProfit;
      if (result.netProfit < stats.biggestLoss) stats.biggestLoss = result.netProfit;

      stats.history.push({
        date: game.startTime,
        profit: result.netProfit,
        gameId: game.id
      });
    }
  });

  stats.history.sort((a, b) => a.date - b.date);
  return stats;
};

export const formatCurrency = (amount: number) => {
  const safeAmount = round(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: safeAmount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safeAmount);
};
