import { dev } from '$app/environment'
import { json } from '@sveltejs/kit'
import { db, getAdminAuth } from '$lib/firebase-admin'
import { hasReceptsarokAccessFromSubscription, isReceptsarokTrialActive } from '$lib/receptsarokAccess'

export async function requireReceptsarokSubscriber(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false as const, response: json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const token = authHeader.slice(7)
  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return { ok: false as const, response: json({ error: 'Invalid token' }, { status: 401 }) }
  }

  // Dev: any signed-in user. Free trial (PUBLIC_RECEPTSAROK_TRIAL): same in production.
  if (dev || isReceptsarokTrialActive()) {
    return { ok: true as const, uid }
  }

  const userSnap = await db.collection('users').doc(uid).get()
  const subscription = userSnap.data()?.subscription
  if (!hasReceptsarokAccessFromSubscription(subscription)) {
    return { ok: false as const, response: json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, uid }
}
