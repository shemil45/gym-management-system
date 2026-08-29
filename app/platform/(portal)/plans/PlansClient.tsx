'use client'

import { useActionState, useCallback, useEffect, useId, useState } from 'react'
import {
    IconAlertTriangle,
    IconCheck,
    IconLoader2,
    IconPencil,
    IconPlus,
    IconUsersGroup,
    IconX,
} from '@tabler/icons-react'
import { Button, Field, PageHeader, StatusPill, formatCurrency } from '@/components/platform/ui'
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
        // which on a long plan table is disorienting.
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
                className="fixed inset-0 bg-black/45"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={headingId}
                className="relative my-auto w-full max-w-[560px] rounded-[var(--p-r-panel)] border border-[var(--p-line)] bg-[var(--p-surface)] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.45)]"
            >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--p-line-soft)] p-4">
                    <div className="min-w-0">
                        <h2
                            id={headingId}
                            className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--p-ink)]"
                        >
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-1 text-[12px] leading-[1.5] text-[var(--p-ink-3)]">
                                {description}
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--p-r-control)] text-[var(--p-ink-3)] transition-colors hover:bg-[var(--p-surface-2)] hover:text-[var(--p-ink)]"
                    >
                        <IconX size={16} stroke={1.8} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

function Alert({ tone, children }: { tone: 'danger' | 'ok'; children: React.ReactNode }) {
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
                    stroke={1.9}
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
                className={`text-[12.5px] leading-[1.5] ${
                    danger ? 'text-[var(--p-danger-ink)]' : 'text-[var(--p-ok-ink)]'
                }`}
            >
                {children}
            </p>
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
        <form action={formAction} className="flex max-h-[calc(100vh-140px)] flex-col">
            <div className="flex flex-col gap-4 overflow-y-auto p-4">
                {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

                {editing ? <input type="hidden" name="planId" value={plan.id} /> : null}

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

                <fieldset className="flex flex-col gap-2">
                    <legend className="text-[12.5px] font-medium text-[var(--p-ink-2)]">
                        Included features
                    </legend>
                    <p className="text-[11.5px] text-[var(--p-ink-3)]">
                        Tick what this tier includes. Tenants already on the plan keep what they were
                        assigned until you apply the change to them.
                    </p>
                    <div className="mt-1 grid gap-px overflow-hidden rounded-[var(--p-r-core)] border border-[var(--p-line)] bg-[var(--p-line-soft)] sm:grid-cols-2">
                        {features.map((feature) => (
                            <label
                                key={feature.key}
                                className="flex cursor-pointer items-start gap-2.5 bg-[var(--p-surface)] px-3 py-2.5 transition-colors hover:bg-[var(--p-surface-2)]"
                            >
                                <input
                                    type="checkbox"
                                    name="features"
                                    value={feature.key}
                                    defaultChecked={selected.has(feature.key)}
                                    disabled={pending}
                                    className="mt-0.5 h-[15px] w-[15px] shrink-0 accent-[var(--p-ink)]"
                                />
                                <span className="min-w-0">
                                    <span className="block text-[12.5px] font-medium leading-tight text-[var(--p-ink)]">
                                        {feature.label}
                                    </span>
                                    {feature.description ? (
                                        <span className="mt-0.5 block text-[11px] leading-[1.45] text-[var(--p-ink-3)]">
                                            {feature.description}
                                        </span>
                                    ) : null}
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="flex flex-col gap-2.5 rounded-[var(--p-r-core)] border border-[var(--p-line)] p-3">
                    <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={plan?.is_active ?? true}
                            disabled={pending}
                            className="mt-0.5 h-[15px] w-[15px] shrink-0 accent-[var(--p-ink)]"
                        />
                        <span>
                            <span className="block text-[12.5px] font-medium text-[var(--p-ink)]">
                                Active
                            </span>
                            <span className="block text-[11px] text-[var(--p-ink-3)]">
                                Available for new assignments. Retiring a plan never affects tenants
                                already on it.
                            </span>
                        </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                            type="checkbox"
                            name="isPublic"
                            defaultChecked={plan?.is_public ?? true}
                            disabled={pending}
                            className="mt-0.5 h-[15px] w-[15px] shrink-0 accent-[var(--p-ink)]"
                        />
                        <span>
                            <span className="block text-[12.5px] font-medium text-[var(--p-ink)]">
                                Self-selectable by tenants
                            </span>
                            <span className="block text-[11px] text-[var(--p-ink-3)]">
                                Untick for plans only a platform admin may assign.
                            </span>
                        </span>
                    </label>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--p-line-soft)] p-4">
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
            <div className="flex flex-col gap-3 p-4">
                {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
                {Object.entries(hidden).map(([key, value]) => (
                    <input key={key} type="hidden" name={key} value={value} />
                ))}
                {body}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--p-line-soft)] p-4">
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
    const labelByKey = new Map(features.map((feature) => [feature.key, feature.label]))

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

    return (
        <>
            <PageHeader
                title="Plans"
                description="The subscription tiers tenants can be put on. Editing a plan changes what it costs and includes from now on - tenants already on it keep the price and entitlements they were assigned."
                action={
                    canWrite ? (
                        <Button tone="primary" size="sm" onClick={() => setDialog({ kind: 'create' })}>
                            <IconPlus size={14} stroke={2} aria-hidden="true" />
                            New plan
                        </Button>
                    ) : null
                }
            />

            {flash ? (
                <div className="mb-4">
                    <Alert tone="ok">{flash}</Alert>
                </div>
            ) : null}

            {plans.length > 0 ? (
            <div className="grid gap-px overflow-hidden rounded-[var(--p-r-panel)] border border-[var(--p-line)] bg-[var(--p-line-soft)] sm:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                    const keys = normalizeFeatureKeys(plan.features)
                    return (
                        <article key={plan.id} className="flex flex-col gap-3 bg-[var(--p-surface)] p-4">
                            <header className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--p-ink)]">
                                        {plan.name}
                                    </h3>
                                    <p className="p-num mt-0.5 text-[11px] text-[var(--p-ink-3)]">
                                        {plan.code}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <StatusPill tone={plan.is_active ? 'ok' : 'idle'}>
                                        {plan.is_active ? 'Active' : 'Retired'}
                                    </StatusPill>
                                    {!plan.is_public ? (
                                        <StatusPill tone="idle">Admin only</StatusPill>
                                    ) : null}
                                </div>
                            </header>

                            <div className="flex items-baseline gap-2">
                                <span className="p-num text-[19px] font-semibold tracking-[-0.02em] text-[var(--p-ink)]">
                                    {Number(plan.price_monthly) === 0
                                        ? 'Free'
                                        : formatCurrency(Number(plan.price_monthly))}
                                </span>
                                {Number(plan.price_monthly) > 0 ? (
                                    <span className="text-[11.5px] text-[var(--p-ink-3)]">
                                        /mo · {formatCurrency(Number(plan.price_annual))}/yr
                                    </span>
                                ) : plan.trial_days > 0 ? (
                                    <span className="text-[11.5px] text-[var(--p-ink-3)]">
                                        for {plan.trial_days} days
                                    </span>
                                ) : null}
                            </div>

                            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
                                <div className="flex justify-between gap-2">
                                    <dt className="text-[var(--p-ink-3)]">Members</dt>
                                    <dd className="p-num text-[var(--p-ink-2)]">
                                        {plan.max_members === null ? 'Unlimited' : plan.max_members}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt className="text-[var(--p-ink-3)]">Staff</dt>
                                    <dd className="p-num text-[var(--p-ink-2)]">
                                        {plan.max_staff === null ? 'Unlimited' : plan.max_staff}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt className="text-[var(--p-ink-3)]">Trial</dt>
                                    <dd className="p-num text-[var(--p-ink-2)]">
                                        {plan.trial_days > 0 ? `${plan.trial_days}d` : '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt className="text-[var(--p-ink-3)]">Tenants</dt>
                                    <dd className="p-num text-[var(--p-ink-2)]">{plan.tenantCount}</dd>
                                </div>
                            </dl>

                            <ul className="flex flex-wrap gap-1">
                                {keys.length === 0 ? (
                                    <li className="text-[11px] text-[var(--p-ink-3)]">
                                        No features included
                                    </li>
                                ) : (
                                    keys.map((key) => (
                                        <li
                                            key={key}
                                            className="rounded-full bg-[var(--p-surface-2)] px-2 py-0.5 text-[10.5px] text-[var(--p-ink-2)]"
                                        >
                                            {labelByKey.get(key) ?? key}
                                        </li>
                                    ))
                                )}
                            </ul>

                            {plan.driftedTenantCount > 0 ? (
                                <p className="flex items-start gap-1.5 text-[11px] leading-[1.45] text-[var(--p-warn-ink)]">
                                    <IconUsersGroup
                                        size={13}
                                        stroke={1.8}
                                        className="mt-px shrink-0"
                                        aria-hidden="true"
                                    />
                                    {plan.driftedTenantCount} of {plan.tenantCount} tenants hold older
                                    entitlements than this plan.
                                </p>
                            ) : null}

                            {canWrite ? (
                                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        onClick={() => setDialog({ kind: 'edit', plan })}
                                    >
                                        <IconPencil size={13} stroke={1.9} aria-hidden="true" />
                                        Edit
                                    </Button>
                                    {plan.driftedTenantCount > 0 ? (
                                        <Button
                                            size="sm"
                                            tone="ghost"
                                            onClick={() => setDialog({ kind: 'apply', plan })}
                                        >
                                            Apply to tenants
                                        </Button>
                                    ) : null}
                                    <Button
                                        size="sm"
                                        tone="ghost"
                                        onClick={() => setDialog({ kind: 'retire', plan })}
                                    >
                                        {plan.is_active ? 'Retire' : 'Restore'}
                                    </Button>
                                </div>
                            ) : null}
                        </article>
                    )
                })}
            </div>
            ) : null}

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
                    <PlanForm
                        plan={dialog.plan}
                        features={features}
                        onDone={closeWithFlash}
                    />
                </Modal>
            ) : null}

            {dialog?.kind === 'retire' ? (
                <Modal
                    title={dialog.plan.is_active ? `Retire ${dialog.plan.name}?` : `Restore ${dialog.plan.name}?`}
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
                            <p className="text-[12.5px] leading-[1.55] text-[var(--p-ink-2)]">
                                {dialog.plan.is_active ? (
                                    <>
                                        {dialog.plan.name} will stop appearing when assigning a plan.
                                        The {dialog.plan.tenantCount}{' '}
                                        {dialog.plan.tenantCount === 1 ? 'tenant' : 'tenants'} on it keep
                                        billing and working exactly as they do now.
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
                <Modal title={`Apply ${dialog.plan.name} entitlements?`} onClose={() => setDialog(null)}>
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
                                <p className="text-[12.5px] leading-[1.55] text-[var(--p-ink-2)]">
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
                                <p className="text-[12px] leading-[1.55] text-[var(--p-ink-3)]">
                                    Pricing is not touched. A tenant whose usage already exceeds the new
                                    limits keeps their records and simply cannot add more.
                                </p>
                            </>
                        }
                    />
                </Modal>
            ) : null}
        </>
    )
}
