import 'server-only'

import { unstable_cache, revalidateTag } from 'next/cache'

// "Durable" here means cross-request/cross-invocation (Next.js's Data
// Cache), not permanent or guaranteed storage — in production this is
// Vercel's Data Cache, which can be evicted, and in dev it's a local
// filesystem cache. It is not a database and is never the source of truth;
// the database is always authoritative, and every value here is either
// short-TTL or explicitly invalidated after the write that changed it.

const GYM_CACHE_KEY_PREFIX = 'gym-cache'

function gymCacheTag(gymId: string, scope: string) {
    return `gym:${gymId}:${scope}`
}

/**
 * Read-through cache for data scoped to a single gym. Every tag/key embeds
 * gymId, so a cache entry can never be returned for a different gym.
 *
 * TTL is a fallback only — callers that mutate the underlying data must call
 * `invalidateGymCache` with the same (gymId, scope) immediately after a
 * successful write. Do not use this for authorization/access-control data
 * unless every write path that can change it is a Server Action or Route
 * Handler that calls `invalidateGymCache` (revalidateTag cannot be called
 * during Server Component rendering — Next.js throws).
 */
export async function readThroughGymCache<T>(
    gymId: string,
    scope: string,
    revalidateSeconds: number,
    loader: () => Promise<T>,
): Promise<T> {
    const read = unstable_cache(loader, [GYM_CACHE_KEY_PREFIX, scope, gymId], {
        tags: [gymCacheTag(gymId, scope)],
        revalidate: revalidateSeconds,
    })
    return read()
}

/**
 * Immediately invalidates a gym-scoped cache entry. Must be called from a
 * Server Action or Route Handler right after the database write that
 * changed the cached value completes successfully.
 *
 * Next.js 16's `revalidateTag(tag, 'max')` — the form its own deprecation
 * warning suggests as a drop-in replacement for the old single-argument
 * call — does NOT invalidate immediately: it marks the entry stale and
 * serves one more stale read via background revalidation before refreshing
 * (verified empirically against this project's installed Next.js version).
 * `{ expire: 0 }` is the form that actually purges the entry so the very
 * next read is fresh, which is what invalidate-after-write correctness
 * requires here.
 */
export function invalidateGymCache(gymId: string, scope: string) {
    revalidateTag(gymCacheTag(gymId, scope), { expire: 0 })
}
