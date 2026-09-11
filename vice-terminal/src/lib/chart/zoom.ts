export interface ChartWheelInput {
	deltaY: number;
	deltaMode: number;
	ctrlKey?: boolean;
}

export interface LogicalRange {
	from: number;
	to: number;
}

/**
 * lightweight-charts caps mouse-wheel zoom at one tenth of the current bar
 * spacing per event. That is barely visible for the small pixel deltas emitted
 * by a trackpad pinch, so amplify those events while keeping ordinary wheel
 * zoom useful too.
 */
const WHEEL_ZOOM_SENSITIVITY = 2;
const PINCH_ZOOM_SENSITIVITY = 6;
const MAX_ZOOM_SCALE = 3;

export function chartWheelZoomScale(event: ChartWheelInput): number {
	if (!Number.isFinite(event.deltaY) || event.deltaY === 0) return 0;

	// Match lightweight-charts' wheel-unit normalization: pixel, line, page.
	const unitAdjustment = event.deltaMode === 2 ? 120 : event.deltaMode === 1 ? 32 : 1;
	const sensitivity = event.ctrlKey ? PINCH_ZOOM_SENSITIVITY : WHEEL_ZOOM_SENSITIVITY;
	const scale = -(unitAdjustment * event.deltaY / 100) * sensitivity;
	return Math.max(-MAX_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, scale));
}

/**
 * Apply the same bar-spacing zoom model as lightweight-charts while keeping
 * the logical bar under the pointer anchored in place.
 */
export function zoomLogicalRange(range: LogicalRange, anchor: number, zoomScale: number): LogicalRange {
	const width = range.to - range.from;
	if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(anchor) || !Number.isFinite(zoomScale)) return range;

	const spacingRatio = Math.max(0.1, 1 + zoomScale / 10);
	const nextWidth = width / spacingRatio;
	const anchorRatio = (anchor - range.from) / width;
	const from = anchor - anchorRatio * nextWidth;
	return { from, to: from + nextWidth };
}
