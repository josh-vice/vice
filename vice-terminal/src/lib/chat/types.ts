/** Shared chat types. */
export type ChatBadgeSide = 'Long' | 'Short';
export interface ChatBadge {
	symbol: string;
	side: ChatBadgeSide;
	size: number;
	entry: number;
	pnl: number;
	pnlPct: number;
}
