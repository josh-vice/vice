import { describe, expect, test } from 'bun:test';
import {
	PUBLIC_PLANE_MAX_FRAME_BYTES,
	isPublicPlaneFrameWithinLimit,
	publicPlaneFrameByteLength
} from './protocol';

describe('public data-plane frame guard', () => {
	test('counts UTF-8 bytes rather than JavaScript code units', () => {
		expect(publicPlaneFrameByteLength('€')).toBe(3);
		expect(publicPlaneFrameByteLength('😀')).toBe(4);
	});

	test('accepts the boundary and rejects oversized venue frames', () => {
		expect(isPublicPlaneFrameWithinLimit('a'.repeat(PUBLIC_PLANE_MAX_FRAME_BYTES))).toBe(true);
		expect(isPublicPlaneFrameWithinLimit('a'.repeat(PUBLIC_PLANE_MAX_FRAME_BYTES + 1))).toBe(false);
	});
});
