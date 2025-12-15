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
    // 1. Try Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');
      
      if (!error && data) {
        return data as Player[];
      }
      console.error("Supabase error fetching players:", error);
    }

    // 2. Fallback to LocalStorage
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
      if (error) console.error("Supabase error saving player:", error);
      return;
    }

    // LocalStorage Fallback
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
        .select('*')
        .order('created_at');

      if (!error && data) {
        return data.map((d: any) => ({
           id: d.id,
           name: d.name,
           playerIds: d.player_ids || [],
           createdAt: new Date(d.created_at).getTime()
        })) as Group[];
      }
    }

    // LocalStorage Fallback
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
      const { error } = await supabase.from('groups').upsert({
        id: group.id,
        name: group.name,
        player_ids: group.playerIds,
        created_at: new Date(group.createdAt).toISOString()
      });
      if(error) console.error("Supabase error saving group:", error);
      return;
    }

    // LocalStorage
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
      // We store the full GameSession object in the 'data' JSONB column
      const { data, error } = await supabase
        .from('games')
        .select('data')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((row: any) => row.data) as GameSession[];
      }
      console.error("Supabase error fetching games:", error);
    }

    // LocalStorage Fallback
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
          created_at: new Date(game.startTime).toISOString() // Ensure ordering
        });
        
      if (error) console.error("Supabase error saving game:", error);
      return;
    }

    // LocalStorage Fallback (Warning: O(N) but fine for small arrays)
    const games = await api.fetchGames();
    const index = games.findIndex(g => g.id === game.id);
    let updatedGames;
    if (index >= 0) {
      updatedGames = games.map(g => g.id === game.id ? game : g);
    } else {
      updatedGames = [game, ...games];
    }
    localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(updatedGames));
  }
};

// --- Calculation Logic (Sync) ---
// These remain synchronous as they operate on in-memory objects

// Helper to round currency to 2 decimal places to avoid float errors
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const calculateSettlement = (game: GameSession): GameSettlementReport => {
  const settlements: PlayerSettlement[] = game.players.map(p => {
    // 1. Calculate Bank Buy Ins
    const bankBuyIns = game.transactions
      .filter(t => t.type === TransactionType.BUY_IN && t.toId === p.id)
      .reduce((sum, t) => sum + t.amount, 0);

    // 2. Calculate Transfers (Loans)
    // Money received from another player is treated as an additional "Buy In" (liability) for the receiver
    const transfersIn = game.transactions
      .filter(t => t.type === TransactionType.TRANSFER && t.toId === p.id)
      .reduce((sum, t) => sum + t.amount, 0);

    // Money sent to another player reduces the sender's "Invested" amount (they gave away value)
    const transfersOut = game.transactions
      .filter(t => t.type === TransactionType.TRANSFER && t.fromId === p.id)
      .reduce((sum, t) => sum + t.amount, 0);

    // 3. Cash Outs during game (Reverse Buy In)
    const cashOutsDuringGame = game.transactions
      .filter(t => t.type === TransactionType.CASH_OUT && t.fromId === p.id)
      .reduce((sum, t) => sum + t.amount, 0);

    // Net Invested = (BankBuyIns - CashOutsToBank) + (BorrowedFromPlayers - LoanedToPlayers)
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

  const totalBuyIn = round(settlements.reduce((sum, s) => sum + s.totalBuyIn, 0)); // Net chips from bank
  const totalChips = round(settlements.reduce((sum, s) => sum + s.finalChips, 0));
  
  // Duration
  const endTime = game.endTime || Date.now();
  const durationMinutes = Math.floor((endTime - game.startTime) / (1000 * 60));

  return {
    players: settlements.sort((a, b) => b.netProfit - a.netProfit), // Winner first
    totalBuyIn,
    totalChips,
    discrepancy: round(totalChips - totalBuyIn),
    durationMinutes
  };
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
    // Only count finished games
    if (game.isActive) return;

    // Check if player participated
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
    // Show cents if amount is not an integer, otherwise show no fraction digits for cleaner UI
    minimumFractionDigits: safeAmount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safeAmount);
};
