// The beta gate is enforced in hooks.server.ts before any route or API response.
// Keep the terminal browser-hydrated so workspace state remains client-owned;
// the server still renders the stable shell for release smoke and first paint.
