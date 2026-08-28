import { describe, expect, test } from 'bun:test';
import { REQUIRED_STORY_FIELDS, validateStory, validateStoryCatalog } from './user-story-catalog.mjs';

describe('versioned user-story catalog', () => {
	test('rejects a story missing operational evidence fields', () => {
		const result = validateStory('US-999.md', '# US-999: Missing\n\nAs a trader...');
		expect(result.errors).toContain('missing schema v2 marker');
		expect(result.errors).toContain('missing explicit Given/When/Then acceptance criteria IDs');
		expect(result.errors.length).toBeGreaterThan(REQUIRED_STORY_FIELDS.length);
	});

	test('validates every checked-in production story', async () => {
		expect(await validateStoryCatalog()).toEqual([]);
	});
});
