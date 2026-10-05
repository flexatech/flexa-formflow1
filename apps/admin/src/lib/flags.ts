/**
 * Build-time visibility gate for the Library business-model surfaces (the
 * Library nav item, its Dashboard spotlight and quick action, and the
 * Save-to-Library actions in the builders). Held off until each surface was
 * backed by real data so a release build never showed a half-built screen (the
 * WP.org "no coming-soon screens" rule). Phase 1 landed all of them, so this is
 * on; it stays as a single kill-switch to pull the whole surface if needed.
 */
export const SHOW_UPCOMING = true;
