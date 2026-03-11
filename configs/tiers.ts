// ─────────────────────────────────────────────
// config/tiers.ts
//
// Free tier limits — single source of truth.
// Change FREE_SESSION_LIMIT here only.
// ─────────────────────────────────────────────

// Sessions 1-N are free. Everything above requires upgrade.
// After 1 free session, users are prompted to create an account.
export const FREE_SESSION_LIMIT = 2

// Total sessions shown on home page (free + locked preview)
export const TOTAL_VISIBLE_SESSIONS = 8
