// Probe: is CSSOM style assignment (el.style.x = v) blocked by style-src 'self'?
import { expect } from '@playwright/test';
import { test } from './_fixtures.js';

test('probe CSSOM vs attribute inline styles under CSP', async ({ page }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });
	const errors = [];
	page.on('console', (m) => { if (m.type() === 'error' && /Content Security|inline style/i.test(m.text())) errors.push(m.text()); });

	const r = await page.evaluate(() => {
		const div = document.createElement('div');
		document.body.appendChild(div);
		// 1. CSSOM property assignment
		div.style.transform = 'translateY(100%)';
		const cssomOk = div.style.transform === 'translateY(100%)';
		// 2. setAttribute('style', ...)
		const div2 = document.createElement('div');
		document.body.appendChild(div2);
		div2.setAttribute('style', 'transform: translateY(100%)');
		const attrOk = div2.style.transform === 'translateY(100%)';
		// 3. style attribute parsing in HTML
		const div3 = document.createElement('div');
		div3.setAttribute('style', 'color: red');
		document.body.appendChild(div3);
		const attrColor = div3.style.color === 'red';
		return { cssomOk, attrOk, attrColor };
	});
	console.log('CSSOM_RESULT=' + JSON.stringify(r));
	console.log('CSP_ERRORS=' + errors.length);
});
