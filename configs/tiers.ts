// ─────────────────────────────────────────────
// config/tiers.ts
//
// Free tier limits — single source of truth.
// Change FREE_SESSION_LIMIT here only.
// ─────────────────────────────────────────────

// Sessions 1-N are free. Everything above is locked.
// Beta: 2 unlocked for testing, bump to 3 before launch.
export const FREE_SESSION_LIMIT = 5

// Total sessions shown on home page (free + locked preview)
export const TOTAL_VISIBLE_SESSIONS = 8
