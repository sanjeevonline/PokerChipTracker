
export interface Player {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  playerIds: string[]; // List of IDs in this group
  createdAt: number;
  ownerId?: string; // ID of the creator
  sharedWithEmails?: string[]; // Emails of collaborators
}

export enum TransactionType {
  BUY_IN = 'BUY_IN', // Bank -> Player
  TRANSFER = 'TRANSFER', // Player -> Player
  CASH_OUT = 'CASH_OUT', // Player -> Bank (during game, rare but possible)
}

export interface Transaction {
  id: string;
  timestamp: number;
  type: TransactionType;
  fromId: string; // 'BANK' or PlayerID
  toId: string; // 'BANK' or PlayerID
  amount: number;
  note?: string;
}

export interface PlayerSessionState {
  playerId: string;
  finalChips: number | null; // Null if not yet counted
  isCashedOut: boolean;
}

export interface GameSession {
  id: string;
  groupId?: string; // Optional for legacy support, but new games should have it
  startTime: number;
  endTime?: number;
  players: Player[]; // Players participating in this session
  transactions: Transaction[];
  playerStates: Record<string, PlayerSessionState>; // Map playerId -> State
  isActive: boolean;
  chipValue?: number; // Value of a single chip unit in currency (default 1 or 0.25)
}

export interface PlayerSettlement {
  playerId: string;
  name: string;
  totalBuyIn: number; // From Bank
  transfersIn: number; // Borrowed from others
  transfersOut: number; // Loaned to others
  netInvested: number; // totalBuyIn + transfersIn - transfersOut
  finalChips: number;
  netProfit: number; // finalChips - netInvested
}

export interface GameSettlementReport {
  players: PlayerSettlement[];
  totalBuyIn: number; // Total money bank put in
  totalChips: number; // Total chips counted
  discrepancy: number; // totalChips - totalBuyIn
  durationMinutes: number;
}

export interface PlayerStats {
  id: string;
  name: string;
  gamesPlayed: number;
  totalBuyIn: number;
  netProfit: number;
  totalBorrowed: number;
  totalLoaned: number;
  wins: number;
  losses: number;
  biggestWin: number;
  biggestLoss: number;
  history: {
    date: number;
    profit: number;
    gameId: string;
  }[];
}