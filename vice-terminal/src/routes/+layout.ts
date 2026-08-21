// The beta gate is enforced in hooks.server.ts before any route or API response.
// Keep the terminal client-rendered because the workspace owns browser state.
export const ssr = false;
