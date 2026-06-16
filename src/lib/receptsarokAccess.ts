/** Shared server + client logic for Receptsarok premium access (Firestore users/{uid}.subscription). */

import { env } from '$env/dynamic/public'

/**
 * Free trial period: when PUBLIC_RECEPTSAROK_TRIAL is 'true' or '1' (Netlify env var),
 * any signed-in user gets full Receptsarok access — no subscription required.
 */
export function isReceptsarokTrialActive(): boolean {
  const v = env.PUBLIC_RECEPTSAROK_TRIAL
  return v === 'true' || v === '1'
}

export type ReceptsarokSubscription = {
  status: 'active' | 'expired' | 'none'
  type?: 'lifetime' | 'annual'
  purchasedAt?: string
  expiresAt?: string
}

export function hasReceptsarokAccessFromSubscription(
  subscription?: { receptsarok?: ReceptsarokSubscription }
): boolean {
  if (!subscription?.receptsarok) return false
  const sub = subscription.receptsarok
  if (sub.status !== 'active') return false
  if (sub.type === 'lifetime') return true
  if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) return false
  return true
}
