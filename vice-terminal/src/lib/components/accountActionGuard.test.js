import { expect, test } from 'bun:test';

const panel = await Bun.file(new URL('./BottomPanel.svelte', import.meta.url)).text();

test('disables broad cancellation until the authoritative account state is live', () => {
  expect(panel).toContain("$: privateStateLive = $isConnected && $accountSyncStatus === 'live' && !$privacyMode;");
  expect(panel.match(/disabled=\{cancelAllBusy \|\| !privateStateLive\}/g)).toHaveLength(3);
});
