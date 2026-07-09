import { browser } from "$app/environment";

/**
 * Fires a Simple Analytics custom event (homepage redesign 2026, F6.1).
 * No-op during SSR and if the script hasn't loaded (ad-blockers, script errors) —
 * funnel instrumentation must never throw or block the UI it's attached to.
 */
export function trackEvent(
  name: string,
  metadata?: Record<string, string>,
): void {
  if (!browser) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).sa_event?.(name, metadata);
  } catch {
    /* analytics must never break the page */
  }
}
