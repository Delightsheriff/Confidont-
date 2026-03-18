// ─────────────────────────────────────────────
// config/tiers.ts
//
// Free tier limits — single source of truth.
// Change FREE_SESSION_LIMIT here only.
// ─────────────────────────────────────────────

// Sessions 1-N are free. Everything above requires upgrade.
// After 1 free session, users are prompted to create an account.
export const FREE_SESSION_LIMIT = 2

// How many sessions ahead of the user's current position to preview on the journey feed.
// The feed grows dynamically: completed + SESSION_PEEK_AHEAD cards always visible.
export const SESSION_PEEK_AHEAD = 5
