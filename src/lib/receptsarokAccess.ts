/** Shared server + client logic for Receptsarok premium access (Firestore users/{uid}.subscription). */

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
