import { describe, expect, test } from 'bun:test';
import { chartWheelZoomScale, zoomLogicalRange } from './zoom';

describe('chart zoom responsiveness', () => {
	test('amplifies precision trackpad pinch deltas', () => {
		expect(chartWheelZoomScale({ deltaY: 1, deltaMode: 0 })).toBeCloseTo(-0.02);
		expect(chartWheelZoomScale({ deltaY: 1, deltaMode: 0, ctrlKey: true })).toBeCloseTo(-0.06);
		expect(chartWheelZoomScale({ deltaY: -1, deltaMode: 0, ctrlKey: true })).toBeCloseTo(0.06);
	});

	test('normalizes line and page wheel units and caps extreme steps', () => {
		expect(chartWheelZoomScale({ deltaY: 1, deltaMode: 1 })).toBeCloseTo(-0.64);
		expect(chartWheelZoomScale({ deltaY: 1, deltaMode: 2, ctrlKey: true })).toBe(-3);
	});

	test('keeps the pointer anchor fixed while changing the logical range', () => {
		const next = zoomLogicalRange({ from: 0, to: 100 }, 40, 1);
		expect(next.to - next.from).toBeCloseTo(100 / 1.1);
		expect(next.from + (next.to - next.from) * 0.4).toBeCloseTo(40);
	});
});
