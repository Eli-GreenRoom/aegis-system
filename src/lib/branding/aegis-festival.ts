/**
 * Aegis Festival tenant brand values.
 * These apply ONLY to customer-facing export templates (PDFs, roadsheet links,
 * contracts, marketing collateral). Never import this into app chrome.
 * See docs/BRAND.md - Tenant brand: Aegis Festival.
 */

export const AEGIS_PALETTE = {
  /** Deep indigo - marketing canvas (poster backgrounds, PDF covers) */
  indigo: "#1B0E5C",
  /** Cream - inverse surfaces, print, light-on-dark exports */
  cream: "#FAF3EC",
  /** Warm gold - primary accent, Main Stage chip color */
  gold: "#E5B85A",
  /** Coral - tension, destructive state in exports */
  coral: "#E73E54",
  /** Mint - success, confirmed state in exports */
  mint: "#16D060",
  /** Near-black - was the ops background pre-rebrand */
  nearBlack: "#0E0E10",
} as const;

export const AEGIS_STAGE_COLORS = {
  mainStage: "#E5B85A",
  alternativeStage: "#7C9EFF",
  selectPool: "#A78BFA",
  collectives: "#F472B6",
} as const;

/** Display name for use in export templates and PDF footers */
export const AEGIS_FESTIVAL_NAME = "Aegis Festival";
export const AEGIS_FESTIVAL_YEAR = 2026;
export const AEGIS_FESTIVAL_LOCATION = "Aranoon Village, Batroun, Lebanon";
