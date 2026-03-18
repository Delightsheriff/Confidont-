// ─────────────────────────────────────────────
// config/tiers.ts
//
// Free tier limits — single source of truth.
// Change FREE_SESSION_LIMIT here only.
// ─────────────────────────────────────────────

// Beta mode — disables all paywalls. Flip to false when launching paid tier.
export const BETA_MODE = true

// Sessions 1-N are free. Everything above requires upgrade.
// Set high during beta so the cap is never hit.
export const FREE_SESSION_LIMIT = BETA_MODE ? 999 : 2

// How many sessions ahead of the user's current position to preview on the journey feed.
// The feed grows dynamically: completed + SESSION_PEEK_AHEAD cards always visible.
export const SESSION_PEEK_AHEAD = 5
