const AVATARS_BUCKET = 'avatars'

export function resolveAvatarUrl(photoUrl: string | null | undefined) {
    const value = photoUrl?.trim()

    if (!value) {
        return undefined
    }

    if (/^https?:\/\//i.test(value)) {
        return value
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')

    if (!supabaseUrl) {
        return value
    }

    return `${supabaseUrl}/storage/v1/object/public/${AVATARS_BUCKET}/${value.replace(/^\/+/, '')}`
}

export function getAvatarStoragePath(photoUrl: string | null | undefined) {
    const value = photoUrl?.trim()

    if (!value) {
        return null
    }

    if (!/^https?:\/\//i.test(value)) {
        return value.replace(/^\/+/, '')
    }

    try {
        const url = new URL(value)
        const match = url.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/i)
        return match?.[1] ? decodeURIComponent(match[1]) : null
    } catch {
        return null
    }
}
