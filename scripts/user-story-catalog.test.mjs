import { describe, expect, test } from 'bun:test';
import { REQUIRED_STORY_FIELDS, validateStory, validateStoryCatalog } from './user-story-catalog.mjs';

describe('versioned user-story catalog', () => {
	test('rejects a story missing operational evidence fields', () => {
		const result = validateStory('US-test.md', '# US-999: Missing\n\nAs a trader...');
		expect(result.errors.length).toBe(REQUIRED_STORY_FIELDS.length + 2);
	});

	test('validates every checked-in production story', async () => {
		expect(await validateStoryCatalog()).toEqual([]);
	});
});
