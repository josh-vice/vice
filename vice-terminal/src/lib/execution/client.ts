/** Canonical local execution intent and acknowledgement wire shapes. */
export interface NativeOrderIntent {
	coin: string;
	isBuy: boolean;
	size: number;
	limitPrice: number;
	reduceOnly?: boolean;
	tif?: 'Alo' | 'Ioc' | 'Gtc';
	orderType?: string;
	triggerPrice?: number;
	triggerKind?: 'stop' | 'takeProfit';
	takeProfit?: number;
	stopLoss?: number;
	/** Local journal ID supplied by a persisted strategy before a child is signed. */
	commandId?: string;
}

export interface ExecutionAck {
	commandId: string;
	sessionId: string;
	sessionSequence: number;
	idempotencyKey: string;
	accepted: boolean;
	uncertain?: boolean;
	reconciled?: boolean;
	error?: string;
	venueOrderIds: string[];
	gatewayReceiveUs: number;
	venueSendUs: number;
	completedUs: number;
	/** Absolute Hyperliquid action expiry used for this command, in ms since epoch. */
	expiresAfter?: number;
}
