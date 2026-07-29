export type OcoObservation = {
	takeProfitOpen: boolean;
	stopLossOpen: boolean;
	takeProfitFilled: boolean;
	stopLossFilled: boolean;
};

export type OcoDecision =
	| { state: 'active' }
	| { state: 'complete'; cancel: 'takeProfit' | 'stopLoss' }
	| { state: 'paused'; reason: string };

/** TP/SL children always close the originating side. */
export function ocoExitSide(entrySide: 'buy' | 'sell'): 'buy' | 'sell' {
	return entrySide === 'buy' ? 'sell' : 'buy';
}

export function reconcileOcoChildren(observation: OcoObservation): OcoDecision {
	if (observation.takeProfitFilled && !observation.stopLossFilled) return { state: 'complete', cancel: 'stopLoss' };
	if (observation.stopLossFilled && !observation.takeProfitFilled) return { state: 'complete', cancel: 'takeProfit' };
	if (observation.takeProfitFilled && observation.stopLossFilled) return { state: 'complete', cancel: 'takeProfit' };
	if (observation.takeProfitOpen && observation.stopLossOpen) return { state: 'active' };
	return { state: 'paused', reason: 'An OCO child disappeared without an authoritative fill' };
}
