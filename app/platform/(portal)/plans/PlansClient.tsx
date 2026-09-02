'use client'

import { useActionState, useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
    IconAlertTriangle,
    IconArchive,
    IconArrowBackUp,
    IconArrowUpRight,
    IconCheck,
    IconInfinity,
    IconLoader2,
    IconPencil,
    IconPlus,
    IconUsersGroup,
    IconX,
} from '@tabler/icons-react'
import {
    Button,
    EmptyState,
    Field,
    MetricTile,
    PageHeader,
    StatusPill,
    formatCurrency,
    formatCurrencyCompact,
} from '@/components/platform/ui'
import type { PlanFeature, PlanWithStats } from '@/lib/platform/data'
import type { ActionState } from '@/app/platform/actions'
import { applyPlanToTenants, createPlan, setPlanActive, updatePlan } from './actions'
import { normalizeFeatureKeys } from '@/lib/platform/types'

const INITIAL: ActionState = { error: null, success: null }

/* ── shared chrome ────────────────────────────────────────────────────── */

/**
 * Modal shell.
 *
 * Matches the sheet already used by the mobile nav rail rather than
 * introducing a dialog system: same scrim, same surface tokens, same radii.
 * The scrim blurs as well as dims, so the page behind stays readable as
 * context while reading unmistakably as out of reach.
 */
function Modal({
    title,
    description,
    onClose,
    children,
}: {
    title: string
    description?: string
    onClose: () => void
    children: React.ReactNode
}) {
    const headingId = useId()

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        // Locking scroll stops the page behind from moving under the modal,
        // which on a long plan catalogue is disorienting.
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = previous
        }
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="p-scrim fixed inset-0 bg-[oklch(0.21_0.008_250/0.45)]"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={headingId}
                className="p-dialog relative my-auto w-full max-w-[580px] overflow-hidden rounded-[var(--p-r-shell)] border border-[var(--p-line)] bg-[var(--p-surface)] shadow-[var(--p-shadow-lift)]"
            >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--p-line-soft)] bg-[var(--p-surface-2)] px-5 py-4">
                    <div className="min-w-0">
                        <h2
                            id={headingId}
                            className="text-[14.5px] font-semibold tracking-[-0.015em] text-[var(--p-ink)]"
                        >
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-1 text-[12px] leading-[1.55] text-[var(--p-ink-3)]">
                                {description}
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--p-r-control)] text-[var(--p-ink-3)] transition-colors duration-150 ease-[var(--p-ease)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-ink)]"
                    >
                        <IconX size={15} stroke={1.7} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

function Alert({
    tone,
    children,
    onDismiss,
}: {
    tone: 'danger' | 'ok'
    children: React.ReactNode
    onDismiss?: () => void
}) {
    const danger = tone === 'danger'
    return (
        <div
            role="alert"
            className={`flex items-start gap-2.5 rounded-[var(--p-r-core)] border px-3.5 py-3 ${
                danger
                    ? 'border-[var(--p-danger)] bg-[var(--p-danger-wash)]'
                    : 'border-[var(--p-ok)] bg-[var(--p-ok-wash)]'
            }`}
        >
            {danger ? (
                <IconAlertTriangle
                    size={15}
                    stroke={1.8}
                    className="mt-px shrink-0 text-[var(--p-danger-ink)]"
                    aria-hidden="true"
                />
            ) : (
                <IconCheck
                    size={15}
                    stroke={2}
                    className="mt-px shrink-0 text-[var(--p-ok-ink)]"
                    aria-hidden="true"
                />
            )}
            <p
                className={`flex-1 text-[12.5px] leading-[1.5] ${
                    danger ? 'text-[var(--p-danger-ink)]' : 'text-[var(--p-ok-ink)]'
                }`}
            >
                {children}
            </p>
            {onDismiss ? (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    className={`-my-0.5 -mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] transition-opacity duration-150 ease-[var(--p-ease)] hover:opacity-70 ${
                        danger ? 'text-[var(--p-danger-ink)]' : 'text-[var(--p-ok-ink)]'
                    }`}
                >
                    <IconX size={13} stroke={1.8} />
                </button>
            ) : null}
        </div>
    )
}

/* ── plan editor ──────────────────────────────────────────────────────── */

function PlanForm({
    plan,
    features,
    onDone,
}: {
    plan: PlanWithStats | null
    features: PlanFeature[]
    onDone: () => void
}) {
    const editing = plan !== null
    const [state, formAction, pending] = useActionState(editing ? updatePlan : createPlan, INITIAL)
    const selected = new Set(normalizeFeatureKeys(plan?.features))

    // A saved plan closes the editor, so the success message lands on the page
    // behind it rather than in a panel the operator has to dismiss twice.
    useEffect(() => {
        if (state.success) onDone()
    }, [state.success, onDone])

    return (
        <form action={formAction} className="flex max-h-[calc(100dvh-160px)] flex-col">
            <div className="flex flex-col gap-5 overflow-y-auto p-5">
                {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

                {editing ? <input type="hidden" name="planId" value={plan.id} /> : null}

                <div className="flex flex-col gap-4">
                    <Field label="Plan name" name="name">
                        <input
                            id="name"
                            name="name"
                            defaultValue={plan?.name ?? ''}
                            required
                            maxLength={60}
                            disabled={pending}
                            className="p-input"
                        />
                    </Field>

                    <Field
                        label="Description"
                        name="description"
                        hint="Shown to tenants choosing a plan. Optional."
                    >
                        <input
                            id="description"
                            name="description"
                            defaultValue={plan?.description ?? ''}
                            maxLength={200}
                            disabled={pending}
                            className="p-input"
                        />
                    </Field>
                </div>

                <FormSection title="Pricing" hint="What the tier costs from the next assignment on.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Monthly price (₹)" name="priceMonthly" hint="0 for a free plan.">
                            <input
                                id="priceMonthly"
                                name="priceMonthly"
                                type="number"
                                min={0}
                                step="1"
                                defaultValue={plan ? Number(plan.price_monthly) : 0}
                                disabled={pending}
                                className="p-input"
                            />
                        </Field>
                        <Field label="Annual price (₹)" name="priceAnnual">
                            <input
                                id="priceAnnual"
                                name="priceAnnual"
                                type="number"
                                min={0}
                                step="1"
                                defaultValue={plan ? Number(plan.price_annual) : 0}
                                disabled={pending}
                                className="p-input"
                            />
                        </Field>
                    </div>
                </FormSection>

                <FormSection title="Limits" hint="Ceilings a tenant on this tier cannot exceed.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Member limit" name="maxMembers" hint="Blank for unlimited.">
                            <input
                                id="maxMembers"
                                name="maxMembers"
                                type="number"
                                min={1}
                                step="1"
                                defaultValue={plan?.max_members ?? ''}
                                disabled={pending}
                                className="p-input"
                            />
                        </Field>
                        <Field label="Staff limit" name="maxStaff" hint="Blank for unlimited.">
                            <input
                                id="maxStaff"
                                name="maxStaff"
                                type="number"
                                min={1}
                                step="1"
                                defaultValue={plan?.max_staff ?? ''}
                                disabled={pending}
                                className="p-input"
                            />
                        </Field>
                    </div>
                </FormSection>

                <FormSection title="Lifecycle" hint="How the tier behaves around trials and failed renewals.">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Trial days" name="trialDays" hint="0 for none.">
                            <input
                                id="trialDays"
                                name="trialDays"
                                type="number"
                                min={0}
                                max={365}
                                step="1"
                                defaultValue={plan?.trial_days ?? 0}
                                disabled={pending}
                                className="p-input"
                            />
                        </Field>
                        <Field label="Grace days" name="gracePeriodDays" hint="After a failed renewal.">
                            <input
                                id="gracePeriodDays"
                                name="gracePeriodDays"
                                type="number"
                                min={0}
                                max={90}
                                step="1"
                                defaultValue={plan?.grace_period_days ?? 7}
                                disabled={pending}
                                className="p-input"
                            />
                        </Field>
                        <Field label="Tier order" name="sortOrder" hint="Decides up vs downgrade.">
                            <input
                                id="sortOrder"
                                name="sortOrder"
                                type="number"
                                min={0}
                                max={999}
                                step="1"
                                defaultValue={plan?.sort_order ?? 0}
                                disabled={pending}
                                className="p-input"
                            />
                        </Field>
                    </div>
                </FormSection>

                <fieldset className="flex min-w-0 flex-col gap-2">
                    <legend className="p-label">Included features</legend>
                    <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--p-ink-3)]">
                        Tick what this tier includes. Tenants already on the plan keep what they were
                        assigned until you apply the change to them.
                    </p>
                    <div className="mt-1.5 grid gap-px overflow-hidden rounded-[var(--p-r-core)] border border-[var(--p-line)] bg-[var(--p-line-soft)] sm:grid-cols-2">
                        {features.map((feature) => (
                            <label key={feature.key} className="p-check">
                                <input
                                    type="checkbox"
                                    name="features"
                                    value={feature.key}
                                    defaultChecked={selected.has(feature.key)}
                                    disabled={pending}
                                    className="mt-0.5 h-[15px] w-[15px] shrink-0 accent-[var(--p-accent)]"
                                />
                                <span className="min-w-0">
                                    <span className="p-check-title block text-[12.5px] font-medium leading-tight text-[var(--p-ink)]">
                                        {feature.label}
                                    </span>
                                    {feature.description ? (
                                        <span className="mt-1 block text-[11px] leading-[1.45] text-[var(--p-ink-3)]">
                                            {feature.description}
                                        </span>
                                    ) : null}
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="flex flex-col gap-px overflow-hidden rounded-[var(--p-r-core)] border border-[var(--p-line)] bg-[var(--p-line-soft)]">
                    <label className="p-check">
                        <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={plan?.is_active ?? true}
                            disabled={pending}
                            className="mt-0.5 h-[15px] w-[15px] shrink-0 accent-[var(--p-accent)]"
                        />
                        <span className="min-w-0">
                            <span className="p-check-title block text-[12.5px] font-medium text-[var(--p-ink)]">
                                Active
                            </span>
                            <span className="mt-1 block text-[11px] leading-[1.45] text-[var(--p-ink-3)]">
                                Available for new assignments. Retiring a plan never affects tenants
                                already on it.
                            </span>
                        </span>
                    </label>
                    <label className="p-check">
                        <input
                            type="checkbox"
                            name="isPublic"
                            defaultChecked={plan?.is_public ?? true}
                            disabled={pending}
                            className="mt-0.5 h-[15px] w-[15px] shrink-0 accent-[var(--p-accent)]"
                        />
                        <span className="min-w-0">
                            <span className="p-check-title block text-[12.5px] font-medium text-[var(--p-ink)]">
                                Self-selectable by tenants
                            </span>
                            <span className="mt-1 block text-[11px] leading-[1.45] text-[var(--p-ink-3)]">
                                Untick for plans only a platform admin may assign.
                            </span>
                        </span>
                    </label>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--p-line-soft)] bg-[var(--p-surface-2)] px-5 py-3.5">
                <Button tone="ghost" onClick={onDone} disabled={pending}>
                    Cancel
                </Button>
                <Button type="submit" tone="primary" disabled={pending}>
                    {pending ? (
                        <>
                            <IconLoader2 size={14} stroke={2} className="animate-spin" aria-hidden="true" />
                            Saving
                        </>
                    ) : editing ? (
                        'Save plan'
                    ) : (
                        'Create plan'
                    )}
                </Button>
            </div>
        </form>
    )
}

/** Groups related fields under a hairline so a long editor reads as sections. */
function FormSection({
    title,
    hint,
    children,
}: {
    title: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <section className="flex flex-col gap-3 border-t border-[var(--p-line-soft)] pt-4">
            <div>
                <h3 className="p-label">{title}</h3>
                {hint ? (
                    <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--p-ink-3)]">{hint}</p>
                ) : null}
            </div>
            {children}
        </section>
    )
}

/* ── confirmations ────────────────────────────────────────────────────── */

function ConfirmForm({
    action,
    hidden,
    confirmLabel,
    tone,
    body,
    onDone,
}: {
    action: (prev: ActionState, formData: FormData) => Promise<ActionState>
    hidden: Record<string, string>
    confirmLabel: string
    tone: 'primary' | 'danger'
    body: React.ReactNode
    onDone: () => void
}) {
    const [state, formAction, pending] = useActionState(action, INITIAL)

    useEffect(() => {
        if (state.success) onDone()
    }, [state.success, onDone])

    return (
        <form action={formAction} className="flex flex-col">
            <div className="flex flex-col gap-3 p-5">
                {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
                {Object.entries(hidden).map(([key, value]) => (
                    <input key={key} type="hidden" name={key} value={value} />
                ))}
                {body}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--p-line-soft)] bg-[var(--p-surface-2)] px-5 py-3.5">
                <Button tone="ghost" onClick={onDone} disabled={pending}>
                    Cancel
                </Button>
                <Button type="submit" tone={tone} disabled={pending}>
                    {pending ? (
                        <>
                            <IconLoader2 size={14} stroke={2} className="animate-spin" aria-hidden="true" />
                            Working
                        </>
                    ) : (
                        confirmLabel
                    )}
                </Button>
            </div>
        </form>
    )
}

/* ── plan card ────────────────────────────────────────────────────────── */

/** A limit reads as a number or as the infinity glyph, never as the word. */
function Limit({ value }: { value: number | null }) {
    if (value === null) {
        return (
            <span
                className="inline-flex items-center text-[var(--p-ink-2)]"
                title="Unlimited"
                aria-label="Unlimited"
            >
                <IconInfinity size={17} stroke={1.7} aria-hidden="true" />
            </span>
        )
    }
    return <span className="p-num">{value}</span>
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="p-label">{label}</p>
            <p className="mt-1.5 text-[13.5px] font-medium leading-none text-[var(--p-ink)]">
                {children}
            </p>
        </div>
    )
}

function PlanCard({
    plan,
    index,
    labelByKey,
    canWrite,
    onEdit,
    onApply,
    onToggle,
}: {
    plan: PlanWithStats
    index: number
    labelByKey: Map<string, string>
    canWrite: boolean
    onEdit: () => void
    onApply: () => void
    onToggle: () => void
}) {
    const keys = normalizeFeatureKeys(plan.features)
    const monthly = Number(plan.price_monthly)
    const annual = Number(plan.price_annual)
    const free = monthly === 0

    return (
        <li className="p-plan-in" style={{ '--p-i': index } as React.CSSProperties}>
            <article className="p-plan" data-retired={plan.is_active ? undefined : 'true'}>
                <div className="p-plan-core">
                    <header className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-semibold tracking-[-0.015em] text-[var(--p-ink)]">
                                {plan.name}
                            </h3>
                            <p className="p-num mt-1 truncate text-[10.5px] uppercase tracking-[0.07em] text-[var(--p-ink-3)]">
                                {plan.code}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <StatusPill tone={plan.is_active ? 'ok' : 'idle'}>
                                {plan.is_active ? 'Active' : 'Retired'}
                            </StatusPill>
                            {!plan.is_public ? <StatusPill tone="idle">Admin only</StatusPill> : null}
                        </div>
                    </header>

                    {/* The price is the thing an operator scans a catalogue for,
                        so it gets the largest type on the card and nothing
                        competes with it on its own line. */}
                    <div>
                        <p className="flex items-baseline gap-1.5">
                            <span className="p-num text-[28px] font-semibold leading-none tracking-[-0.03em] text-[var(--p-ink)]">
                                {free ? 'Free' : formatCurrency(monthly)}
                            </span>
                            {free ? null : (
                                <span className="text-[12.5px] text-[var(--p-ink-3)]">/month</span>
                            )}
                        </p>
                        <p className="mt-2 text-[11.5px] leading-[1.45] text-[var(--p-ink-3)]">
                            {free ? (
                                plan.trial_days > 0 ? (
                                    <>Free for the first {plan.trial_days} days</>
                                ) : (
                                    <>No charge on this tier</>
                                )
                            ) : (
                                <>
                                    <span className="p-num">{formatCurrency(annual)}</span> billed
                                    annually
                                </>
                            )}
                        </p>
                    </div>

                    <dl className="p-spec">
                        <Spec label="Members">
                            <Limit value={plan.max_members} />
                        </Spec>
                        <Spec label="Staff">
                            <Limit value={plan.max_staff} />
                        </Spec>
                        <Spec label="Trial">
                            <span className="p-num">
                                {plan.trial_days > 0 ? `${plan.trial_days}d` : '—'}
                            </span>
                        </Spec>
                        <Spec label="Tenants">
                            <span className="p-num">{plan.tenantCount}</span>
                        </Spec>
                    </dl>

                    <div className="flex flex-1 flex-col">
                        <p className="p-label">Included</p>
                        {keys.length === 0 ? (
                            <p className="mt-2 text-[11.5px] text-[var(--p-ink-3)]">
                                Nothing beyond the platform baseline.
                            </p>
                        ) : (
                            <ul className="mt-2 flex flex-wrap gap-1.5">
                                {keys.map((key) => (
                                    <li key={key} className="p-chip">
                                        <IconCheck
                                            size={11}
                                            stroke={2.2}
                                            className="text-[var(--p-ok)]"
                                            aria-hidden="true"
                                        />
                                        {labelByKey.get(key) ?? key}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {plan.driftedTenantCount > 0 ? (
                        <p className="flex items-start gap-2 rounded-[var(--p-r-control)] bg-[var(--p-warn-wash)] px-2.5 py-2 text-[11px] leading-[1.45] text-[var(--p-warn-ink)]">
                            <IconUsersGroup
                                size={13}
                                stroke={1.7}
                                className="mt-px shrink-0"
                                aria-hidden="true"
                            />
                            <span>
                                <span className="p-num">{plan.driftedTenantCount}</span> of{' '}
                                <span className="p-num">{plan.tenantCount}</span> tenants hold older
                                entitlements than this plan.
                            </span>
                        </p>
                    ) : null}
                </div>

                {/* Actions sit on the tray, not inside the plate: the card reads
                    as a document with a control strip rather than as a box with
                    buttons dropped into the bottom of it. */}
                {canWrite ? (
                    <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1 pt-2.5">
                        <Button size="sm" onClick={onEdit}>
                            <IconPencil size={13} stroke={1.7} aria-hidden="true" />
                            Edit
                        </Button>
                        {plan.driftedTenantCount > 0 ? (
                            <Button size="sm" tone="ghost" onClick={onApply}>
                                Apply to tenants
                            </Button>
                        ) : null}
                        <div className="ml-auto">
                            <Button
                                size="sm"
                                tone="ghost"
                                onClick={onToggle}
                                aria-label={
                                    plan.is_active ? `Retire ${plan.name}` : `Restore ${plan.name}`
                                }
                            >
                                {plan.is_active ? (
                                    <IconArchive size={13} stroke={1.7} aria-hidden="true" />
                                ) : (
                                    <IconArrowBackUp size={13} stroke={1.7} aria-hidden="true" />
                                )}
                                {plan.is_active ? 'Retire' : 'Restore'}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </article>
        </li>
    )
}

/* ── page shell ───────────────────────────────────────────────────────── */

type Dialog =
    | { kind: 'create' }
    | { kind: 'edit'; plan: PlanWithStats }
    | { kind: 'retire'; plan: PlanWithStats }
    | { kind: 'apply'; plan: PlanWithStats }

export default function PlansManager({
    plans,
    features,
    canWrite,
}: {
    plans: PlanWithStats[]
    features: PlanFeature[]
    canWrite: boolean
}) {
    const [dialog, setDialog] = useState<Dialog | null>(null)
    const [flash, setFlash] = useState<string | null>(null)
    const labelByKey = useMemo(
        () => new Map(features.map((feature) => [feature.key, feature.label])),
        [features],
    )

    // The dialog closes itself on success; the page keeps the message so the
    // operator sees what happened after the modal is gone. Identity is tied to
    // the open dialog so the child effect that calls it stays stable per modal.
    const closeWithFlash = useCallback(() => {
        setFlash(
            dialog?.kind === 'create'
                ? 'Plan created.'
                : dialog?.kind === 'edit'
                  ? 'Plan saved. Existing tenants keep their assigned price and entitlements.'
                  : dialog?.kind === 'retire'
                    ? 'Plan availability updated.'
                    : dialog?.kind === 'apply'
                      ? 'Entitlements applied to the tenants on this plan.'
                      : null,
        )
        setDialog(null)
    }, [dialog])

    // Sellable tiers come first. A retired plan is reference material, not
    // something an operator is choosing between, so it stops interrupting the
    // ladder of prices they are actually reading.
    const { sorted, summary } = useMemo(() => {
        const sorted = [...plans].sort((a, b) => {
            if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
            return 0
        })

        return {
            sorted,
            summary: {
                active: plans.filter((plan) => plan.is_active).length,
                tenants: plans.reduce((total, plan) => total + plan.tenantCount, 0),
                mrr: plans.reduce((total, plan) => total + plan.mrr, 0),
                drifted: plans.reduce((total, plan) => total + plan.driftedTenantCount, 0),
            },
        }
    }, [plans])

    const empty = plans.length === 0

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Plans"
                description="The subscription tiers tenants can be put on. Editing a plan changes what it costs and includes from now on — tenants already on it keep the price and entitlements they were assigned."
                action={
                    canWrite ? (
                        /* Nested trailing glyph rather than a bare icon beside
                           the label: the affordance stays legible at 30px. */
                        <Button
                            tone="primary"
                            onClick={() => setDialog({ kind: 'create' })}
                            className="group"
                            style={{ paddingRight: 6 }}
                        >
                            <IconPlus size={14} stroke={2} aria-hidden="true" />
                            New plan
                            {/* color-mix off currentColor, not a fixed white:
                                the accent flips to dark ink in dark mode and a
                                white wash would vanish under it. */}
                            <span className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_oklch,currentColor_18%,transparent)] transition-transform duration-300 ease-[var(--p-ease)] group-hover:-translate-y-px group-hover:translate-x-px">
                                <IconArrowUpRight size={13} stroke={2} aria-hidden="true" />
                            </span>
                        </Button>
                    ) : null
                }
            />

            {flash ? <Alert tone="ok" onDismiss={() => setFlash(null)}>{flash}</Alert> : null}

            {empty ? (
                <div className="p-panel overflow-hidden">
                    <EmptyState
                        title="No plans defined"
                        description="Create a tier to start assigning tenants to it. Until one exists, signups land with no plan and the fallback trial window."
                        action={
                            canWrite ? (
                                <Button tone="primary" onClick={() => setDialog({ kind: 'create' })}>
                                    <IconPlus size={14} stroke={2} aria-hidden="true" />
                                    Create the first plan
                                </Button>
                            ) : null
                        }
                    />
                </div>
            ) : (
                <>
                    {/* What the catalogue as a whole is doing, before the tiers
                        themselves. Hairlines, not six bordered cards. */}
                    <div className="p-panel overflow-hidden">
                        {/* gap-px over a line-coloured bed, not `divide-*`:
                            divide draws `* + *`, which in a wrapping grid puts a
                            top rule on the second tile of the first row. */}
                        <div className="grid grid-cols-2 gap-px bg-[var(--p-line-soft)] sm:grid-cols-4">
                            <div className="bg-[var(--p-surface)]">
                                <MetricTile
                                    label="Tiers"
                                    value={String(summary.active)}
                                    unit={`of ${plans.length}`}
                                    footnote="Assignable right now"
                                />
                            </div>
                            <div className="bg-[var(--p-surface)]">
                                <MetricTile
                                    label="Tenants"
                                    value={String(summary.tenants)}
                                    footnote="Across every tier"
                                />
                            </div>
                            <div className="bg-[var(--p-surface)]">
                                <MetricTile
                                    label="MRR"
                                    value={formatCurrencyCompact(summary.mrr)}
                                    footnote="Billing subscriptions only"
                                />
                            </div>
                            <div className="bg-[var(--p-surface)]">
                                <MetricTile
                                    label="Drifted"
                                    value={String(summary.drifted)}
                                    tone={summary.drifted > 0 ? 'warn' : undefined}
                                    footnote={
                                        summary.drifted > 0
                                            ? 'Holding older entitlements'
                                            : 'Every tenant matches its plan'
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {sorted.map((plan, index) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                index={index}
                                labelByKey={labelByKey}
                                canWrite={canWrite}
                                onEdit={() => setDialog({ kind: 'edit', plan })}
                                onApply={() => setDialog({ kind: 'apply', plan })}
                                onToggle={() => setDialog({ kind: 'retire', plan })}
                            />
                        ))}
                    </ul>
                </>
            )}

            {dialog?.kind === 'create' ? (
                <Modal
                    title="Create plan"
                    description="A new tier. Nothing is assigned to it until you move a tenant onto it."
                    onClose={() => setDialog(null)}
                >
                    <PlanForm plan={null} features={features} onDone={closeWithFlash} />
                </Modal>
            ) : null}

            {dialog?.kind === 'edit' ? (
                <Modal
                    title={`Edit ${dialog.plan.name}`}
                    description="Changes apply to new assignments. Tenants already on this plan keep the price and entitlements they were given."
                    onClose={() => setDialog(null)}
                >
                    <PlanForm plan={dialog.plan} features={features} onDone={closeWithFlash} />
                </Modal>
            ) : null}

            {dialog?.kind === 'retire' ? (
                <Modal
                    title={
                        dialog.plan.is_active
                            ? `Retire ${dialog.plan.name}?`
                            : `Restore ${dialog.plan.name}?`
                    }
                    onClose={() => setDialog(null)}
                >
                    <ConfirmForm
                        action={setPlanActive}
                        hidden={{
                            planId: dialog.plan.id,
                            isActive: dialog.plan.is_active ? 'false' : 'true',
                        }}
                        confirmLabel={dialog.plan.is_active ? 'Retire plan' : 'Restore plan'}
                        tone={dialog.plan.is_active ? 'danger' : 'primary'}
                        onDone={closeWithFlash}
                        body={
                            <p className="text-[12.5px] leading-[1.6] text-[var(--p-ink-2)]">
                                {dialog.plan.is_active ? (
                                    <>
                                        {dialog.plan.name} will stop appearing when assigning a plan.
                                        The {dialog.plan.tenantCount}{' '}
                                        {dialog.plan.tenantCount === 1 ? 'tenant' : 'tenants'} on it
                                        keep billing and working exactly as they do now.
                                    </>
                                ) : (
                                    <>{dialog.plan.name} becomes assignable again.</>
                                )}
                            </p>
                        }
                    />
                </Modal>
            ) : null}

            {dialog?.kind === 'apply' ? (
                <Modal
                    title={`Apply ${dialog.plan.name} entitlements?`}
                    onClose={() => setDialog(null)}
                >
                    <ConfirmForm
                        action={applyPlanToTenants}
                        hidden={{ planId: dialog.plan.id }}
                        confirmLabel={`Apply to ${dialog.plan.tenantCount} ${
                            dialog.plan.tenantCount === 1 ? 'tenant' : 'tenants'
                        }`}
                        tone="primary"
                        onDone={closeWithFlash}
                        body={
                            <>
                                <p className="text-[12.5px] leading-[1.6] text-[var(--p-ink-2)]">
                                    All {dialog.plan.tenantCount}{' '}
                                    {dialog.plan.tenantCount === 1 ? 'tenant' : 'tenants'} on{' '}
                                    {dialog.plan.name} will be moved onto its current limits and
                                    features:{' '}
                                    <span className="p-num">
                                        {dialog.plan.max_members === null
                                            ? 'unlimited'
                                            : dialog.plan.max_members}{' '}
                                        members ·{' '}
                                        {dialog.plan.max_staff === null
                                            ? 'unlimited'
                                            : dialog.plan.max_staff}{' '}
                                        staff
                                    </span>
                                    .
                                </p>
                                <p className="text-[12px] leading-[1.6] text-[var(--p-ink-3)]">
                                    Pricing is not touched. A tenant whose usage already exceeds the
                                    new limits keeps their records and simply cannot add more.
                                </p>
                            </>
                        }
                    />
                </Modal>
            ) : null}
        </div>
    )
}
