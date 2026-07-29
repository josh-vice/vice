import { describe, expect, test } from 'bun:test';
import { idsFromWidgetDescriptions, validateCheckedInWidgetCatalog, validateWidgetCatalog } from './widget-catalog.mjs';

describe('ViceSuite widget acceptance catalog', () => {
	test('maps every checked-in widget to US-014', async () => {
		const result = await validateCheckedInWidgetCatalog();
		expect(result.errors).toEqual([]);
		expect(result.actual).toHaveLength(58);
	});

	test('fails when a manifest description is not cataloged', () => {
		const source = "const WIDGET_DESC = {\n    vOne: 'one',\n  };";
		expect(idsFromWidgetDescriptions(source)).toEqual(['vOne']);
		expect(validateWidgetCatalog(source, { schemaVersion: 1, acceptanceStory: 'US-014', expectedCount: 0, widgets: [] }).errors).not.toEqual([]);
	});
});
