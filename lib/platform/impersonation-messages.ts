/**
 * Tenant-facing copy for the impersonation sandbox. Split out from
 * impersonation-ledger.ts (which is `server-only`) so client components -
 * e.g. the "Support demo" badge and disabled-control tooltips - can import
 * these strings without pulling a server-only module into the client bundle.
 */

export const IMPERSONATION_READONLY_MESSAGE = 'Existing records are read-only while impersonating.'
export const IMPERSONATION_PAYMENT_MESSAGE =
    'While impersonating you can only record payments for members created in this session.'
export const DEMO_READONLY_MESSAGE =
    'This record was created by GMS Cloud support for a demo and is read-only. It will be removed automatically when their session ends.'
