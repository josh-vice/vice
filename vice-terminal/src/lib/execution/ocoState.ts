export type OcoObservation = {
	takeProfitOpen: boolean;
	stopLossOpen: boolean;
	takeProfitFilled: boolean;
	stopLossFilled: boolean;
	takeProfitPartiallyFilled?: boolean;
	stopLossPartiallyFilled?: boolean;
	takeProfitUnknown?: boolean;
	stopLossUnknown?: boolean;
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
	const takeProfitPartial = observation.takeProfitPartiallyFilled === true;
	const stopLossPartial = observation.stopLossPartiallyFilled === true;
	if (observation.takeProfitUnknown || observation.stopLossUnknown) {
		return { state: 'paused', reason: 'An OCO child outcome is unknown; reconcile before changing protection' };
	}
	// Both sides can race between the fill stream and sibling cancellation. Do
	// not report completion when both children (or one full and the other
	// partial) traded; the resulting position requires explicit reconciliation.
	if (observation.takeProfitFilled && observation.stopLossFilled) {
		return { state: 'paused', reason: 'Both OCO children report fills; reconcile the resulting position' };
	}
	if ((observation.takeProfitFilled && stopLossPartial) || (observation.stopLossFilled && takeProfitPartial)) {
		return { state: 'paused', reason: 'Both OCO children traded; reconcile the resulting position' };
	}
	if (observation.takeProfitFilled) return { state: 'complete', cancel: 'stopLoss' };
	if (observation.stopLossFilled) return { state: 'complete', cancel: 'takeProfit' };
	if (observation.takeProfitOpen && observation.stopLossOpen) return { state: 'active' };
	return { state: 'paused', reason: takeProfitPartial || stopLossPartial ? 'An OCO child partially filled; reconcile before changing protection' : 'An OCO child disappeared without an authoritative fill' };
}
