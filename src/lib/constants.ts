// Shared constants safe to import from both client and server code.

/** A salon counts as "available soon" if its next slot is within this many minutes. */
export const WITHIN_2H_MINUTES = 120;

/** How many days ahead the next-available search scans. */
export const HORIZON_DAYS = 10;

/** Default map center: Bucharest. */
export const BUCHAREST_CENTER: [number, number] = [44.4268, 26.1025];
export const DEFAULT_ZOOM = 12;
