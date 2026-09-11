/**
 * Shared between the server page (which builds pager links) and the client
 * filter bar (which navigates). Lives apart from both so neither has to
 * import the other's module boundary.
 */
export type AuditFilterValues = {
    q: string
    action: string
    tenant: string
    from: string
    to: string
}

/** Query string for a set of filters; empty values are left out so the URL stays short. */
export function auditSearch(values: AuditFilterValues, page = 1): string {
    const params = new URLSearchParams()
    if (values.q.trim()) params.set('q', values.q.trim())
    if (values.action) params.set('action', values.action)
    if (values.tenant) params.set('tenant', values.tenant)
    if (values.from) params.set('from', values.from)
    if (values.to) params.set('to', values.to)
    if (page > 1) params.set('page', String(page))
    const search = params.toString()
    return search ? `?${search}` : ''
}
