# Gym Profile Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Gym Profile settings page (`/admin/settings/gym-profile`) as the single source of truth for gym/business information — name, logo, contact details, address, GSTIN — stored at the gym/tenant level.

**Architecture:** Extend the existing `gyms` table with 4 new columns (`website`, `address`, `postal_code`, `gstin`) — the other 7 requested fields already exist on `gyms` but were never editable by gym staff. Add a real settings page/action replacing the Phase 1 placeholder at `/admin/settings/gym-profile`, following the exact structural pattern established by the Membership & Fees settings page. Logo upload reuses the existing `uploadCompressedAvatar`/`avatars`-bucket pipeline already used for member/staff photos — no new storage provider.

**Tech Stack:** Next.js App Router (server actions), Supabase (Postgres + RLS), TypeScript, Tailwind, lucide-react, sonner (toast). No test framework exists in this repo — verification is `npx tsc --noEmit` plus manual smoke testing via the dev server and direct Supabase queries.

**Spec:** `docs/superpowers/specs/2026-08-20-gym-profile-design.md`

## Global Constraints

- Do NOT create a new table — extend `gyms`, consistent with how Membership & Fees settings were added.
- Do NOT introduce a new storage provider or bucket — reuse the existing public `avatars` bucket and `uploadCompressedAvatar`/`removeUploadedAvatar` utilities.
- Do NOT build strict format validation for website/GSTIN — freeform optional text, per explicit user decision. Only `name` is required (non-empty after trimming).
- Do NOT touch `business_name` or any platform-portal gym field — those are a separate, platform-only concern.
- Do NOT implement receipt generation or any other consumer of this data — this task only builds the settings page and persistence.
- Match the existing GMS Cloud dark-theme design system (`useAdminTheme`, `#1c1c1c`/`#2a2a2a` dark tokens) and the card layout established by `components/settings/MembershipFeesSettings.tsx`.
- No new UI library — reuse `Input`, `Label`, `Button`, `LoadingLinkButton`, and the same upload-button pattern already used in `components/forms/AddMemberForm.tsx`.

---

### Task 1: Database migration — Gym Profile columns and grants

**Files:**
- Create: `supabase/migrations/20260820120000_gym_profile_settings.sql`
- Modify: `lib/types/database.types.ts` (targeted hand-edit, not a full regeneration — see rationale below)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `Tables<'gyms'>` gains `website: string | null`, `address: string | null`, `postal_code: string | null`, `gstin: string | null`. The `authenticated` role gains column-scoped UPDATE privilege on `name, logo_url, contact_phone, contact_email, website, address, city, state, postal_code, country, gstin` (in addition to the 3 Membership & Fees columns already granted). Task 2 depends on these columns and types existing.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260820120000_gym_profile_settings.sql`:

```sql
-- UP
ALTER TABLE public.gyms
    ADD COLUMN website text,
    ADD COLUMN address text,
    ADD COLUMN postal_code text,
    ADD COLUMN gstin text;

GRANT UPDATE (name, logo_url, contact_phone, contact_email, website, address, city, state, postal_code, country, gstin)
    ON public.gyms TO authenticated;

-- DOWN / rollback
-- REVOKE UPDATE (name, logo_url, contact_phone, contact_email, website, address, city, state, postal_code, country, gstin) ON public.gyms FROM authenticated;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS gstin;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS postal_code;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS address;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS website;
```

Note: `GRANT UPDATE (...)` is additive — it does not need a preceding `REVOKE`, since the prior migration (`20260819160500_gyms_column_scoped_grant.sql`) already replaced the original table-wide grant with a column-scoped one covering the 3 Membership & Fees columns. This statement adds the 11 Gym Profile columns (7 pre-existing + 4 new) to that same column-scoped grant.

- [ ] **Step 2: Apply the migration to the `gym-management` Supabase project**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with:
- `project_id`: `blskfhoboxonvisoalpa`
- `name`: `gym_profile_settings`
- `query`: the SQL body above from `ALTER TABLE public.gyms` through the `GRANT UPDATE` statement (omit the trailing DOWN/rollback comments — migrations only need the UP)

- [ ] **Step 3: Verify the columns and grant**

Run via `mcp__plugin_supabase_supabase__execute_sql` (project_id `blskfhoboxonvisoalpa`):

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'gyms'
  and column_name in ('website', 'address', 'postal_code', 'gstin');
```

Expected: 4 rows, all `text`, all `is_nullable = 'YES'`.

```sql
select column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'gyms' and privilege_type = 'UPDATE' and grantee = 'authenticated'
order by column_name;
```

Expected: 14 rows total — the 11 Gym Profile columns (`address, city, contact_email, contact_phone, country, gstin, logo_url, name, postal_code, state, website`) plus the 3 pre-existing Membership & Fees columns (`allow_admission_fee_waiver, allow_custom_membership_start_date, default_admission_fee`).

- [ ] **Step 4: Update the TypeScript types**

`lib/types/database.types.ts` in this repo is hand-maintained, not purely machine-generated (a prior task discovered that a full `generate_typescript_types` overwrite drops tables the live schema no longer has and loosens enum types other code relies on — that finding was reviewed and accepted, see the Membership & Fees plan/ledger history). Follow the same targeted approach here: open the file, find the `gyms` table's `Row`, `Insert`, and `Update` type definitions (search for `default_admission_fee` to locate them — the Membership & Fees fields were added right next to the other gym columns), and add 4 new fields alongside them:

```typescript
website: string | null
address: string | null
postal_code: string | null
gstin: string | null
```

Add this to all three of `Row`, `Insert`, and `Update` for the `gyms` table (in `Insert`/`Update` these are already-optional nullable fields, consistent with how the other nullable `gyms` columns like `city`/`state` are typed there — match that exact style, e.g. `city?: string | null` in Insert/Update vs `city: string | null` in Row).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260820120000_gym_profile_settings.sql lib/types/database.types.ts
git commit -m "Add Gym Profile columns and grants to gyms table"
```

---

### Task 2: Gym Profile settings page

**Files:**
- Create: `app/admin/settings/gym-profile/actions.ts`
- Create: `components/settings/GymProfileSettings.tsx`
- Modify: `app/admin/settings/gym-profile/page.tsx` (replace the Phase 1 `SettingsPlaceholderPage` boilerplate)

**Interfaces:**
- Consumes: `getCurrentGymContext` from `@/lib/auth/gym-context`; `getCurrentAdminContext` from `@/lib/auth/admin-server`; `isStaffRole` from `@/lib/auth/roles`; `getSupabaseAdmin` from `@/lib/supabase/admin`; `getAvatarStoragePath` from `@/lib/utils/storage`; `createImagePreviewUrl`, `uploadCompressedAvatar`, `removeUploadedAvatar` from `@/lib/utils/client-image-upload`; `MAX_UPLOAD_SIZE_BYTES`, `MAX_UPLOAD_SIZE_LABEL`, `UPLOAD_FAILURE_MESSAGE` from `@/lib/constants/uploads`; `Tables<'gyms'>` / `UpdateTables<'gyms'>` / `QueryResult` from `@/lib/types` (from Task 1's columns).
- Produces: `updateGymProfile(formData: FormData): Promise<{ error: string } | { success: true }>` exported from `app/admin/settings/gym-profile/actions.ts`. `GymProfileSettings` component with props `{ gym: { name: string; logo_url: string | null; contact_phone: string | null; contact_email: string | null; website: string | null; address: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null; gstin: string | null } }`, default export from `components/settings/GymProfileSettings.tsx`.

- [ ] **Step 1: Write the server action**

Create `app/admin/settings/gym-profile/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getAvatarStoragePath } from '@/lib/utils/storage'

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

function trimmedOrNull(value: FormDataEntryValue | null) {
    const trimmed = (value as string | null)?.trim()
    return trimmed || null
}

export async function updateGymProfile(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }

    const name = (formData.get('name') as string | null)?.trim()
    if (!name) {
        return { error: 'Gym name is required.' }
    }

    const logoUrl = trimmedOrNull(formData.get('logo_url'))
    const previousLogoUrl = trimmedOrNull(formData.get('previous_logo_url'))

    const supabase = await createClient()
    const { data: updated, error } = await supabase
        .from('gyms')
        .update(({
            name,
            logo_url: logoUrl,
            contact_phone: trimmedOrNull(formData.get('contact_phone')),
            contact_email: trimmedOrNull(formData.get('contact_email')),
            website: trimmedOrNull(formData.get('website')),
            address: trimmedOrNull(formData.get('address')),
            city: trimmedOrNull(formData.get('city')),
            state: trimmedOrNull(formData.get('state')),
            postal_code: trimmedOrNull(formData.get('postal_code')),
            country: trimmedOrNull(formData.get('country')),
            gstin: trimmedOrNull(formData.get('gstin')),
        } satisfies UpdateTables<'gyms'>) as never)
        .eq('id', viewer.gym.id)
        .select('id')
        .maybeSingle()

    if (error) return { error: getErrorMessage(error, 'Failed to update gym profile') }
    if (!updated) return { error: 'Gym profile could not be saved — please refresh and try again.' }

    if (previousLogoUrl && previousLogoUrl !== logoUrl) {
        const previousPath = getAvatarStoragePath(previousLogoUrl)
        if (previousPath && previousPath.startsWith('gym-logo-')) {
            const supabaseAdmin = getSupabaseAdmin()
            await supabaseAdmin.storage.from('avatars').remove([previousPath])
        }
    }

    revalidatePath('/admin/settings/gym-profile')
    return { success: true }
}
```

- [ ] **Step 2: Write the settings component**

Create `components/settings/GymProfileSettings.tsx`:

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Building2, Camera, ImageIcon, Loader2, MapPin, Receipt, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { updateGymProfile } from '@/app/admin/settings/gym-profile/actions'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, UPLOAD_FAILURE_MESSAGE } from '@/lib/constants/uploads'
import { createImagePreviewUrl, removeUploadedAvatar, uploadCompressedAvatar } from '@/lib/utils/client-image-upload'

interface GymProfileSettingsProps {
    gym: {
        name: string
        logo_url: string | null
        contact_phone: string | null
        contact_email: string | null
        website: string | null
        address: string | null
        city: string | null
        state: string | null
        postal_code: string | null
        country: string | null
        gstin: string | null
    }
}

export default function GymProfileSettings({ gym }: GymProfileSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const [pending, startTransition] = useTransition()

    const [name, setName] = useState(gym.name)
    const [nameTouched, setNameTouched] = useState(false)
    const [phone, setPhone] = useState(gym.contact_phone ?? '')
    const [email, setEmail] = useState(gym.contact_email ?? '')
    const [website, setWebsite] = useState(gym.website ?? '')
    const [address, setAddress] = useState(gym.address ?? '')
    const [city, setCity] = useState(gym.city ?? '')
    const [state, setState] = useState(gym.state ?? '')
    const [postalCode, setPostalCode] = useState(gym.postal_code ?? '')
    const [country, setCountry] = useState(gym.country ?? '')
    const [gstin, setGstin] = useState(gym.gstin ?? '')

    const [logoPreview, setLogoPreview] = useState<string | null>(gym.logo_url)
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null)
    const [logoError, setLogoError] = useState<string | null>(null)
    const [loadingMessage, setLoadingMessage] = useState('')

    const nameError = nameTouched && name.trim() === '' ? 'Gym name is required' : null

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            const message = `Logo must be under ${MAX_UPLOAD_SIZE_LABEL}.`
            setLogoError(message)
            setSelectedLogo(null)
            e.target.value = ''
            toast.error(message)
            return
        }
        setLogoError(null)
        setSelectedLogo(file)
        void createImagePreviewUrl(file)
            .then((previewUrl) => setLogoPreview(previewUrl))
            .catch(() => {
                setSelectedLogo(null)
                setLogoError('Failed to preview the selected image.')
                toast.error('Failed to preview the selected image.')
            })
    }

    const cardClass = `rounded-xl p-6 ${
        isDark
            ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
            : 'border border-gray-200 bg-white shadow-sm'
    }`
    const inputClass = (hasError: boolean) => `h-10 text-sm ${
        hasError
            ? 'border-red-400 focus:ring-red-400'
            : isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'
    }`
    const labelClass = `text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setNameTouched(true)
        if (name.trim() === '') return
        if (logoError) { toast.error(logoError); return }

        setLoadingMessage('Saving...')
        let uploadedLogoPath: string | null = null

        try {
            let logoUrl = gym.logo_url

            if (selectedLogo) {
                setLoadingMessage('Uploading logo...')
                const uploadedLogo = await uploadCompressedAvatar(selectedLogo, 'gym-logo', {
                    onStatusChange: setLoadingMessage,
                })
                uploadedLogoPath = uploadedLogo.path
                logoUrl = uploadedLogo.publicUrl
                setLoadingMessage('Saving...')
            }

            const fd = new FormData()
            fd.append('name', name)
            fd.append('logo_url', logoUrl ?? '')
            fd.append('previous_logo_url', gym.logo_url ?? '')
            fd.append('contact_phone', phone)
            fd.append('contact_email', email)
            fd.append('website', website)
            fd.append('address', address)
            fd.append('city', city)
            fd.append('state', state)
            fd.append('postal_code', postalCode)
            fd.append('country', country)
            fd.append('gstin', gstin)

            startTransition(async () => {
                const result = await updateGymProfile(fd)
                if ('error' in result) {
                    if (uploadedLogoPath) await removeUploadedAvatar(uploadedLogoPath)
                    toast.error(result.error)
                } else {
                    toast.success('Gym profile saved')
                    router.refresh()
                }
                setLoadingMessage('')
            })
        } catch (error) {
            if (uploadedLogoPath) await removeUploadedAvatar(uploadedLogoPath)
            toast.error(error instanceof Error ? error.message : UPLOAD_FAILURE_MESSAGE)
            setLoadingMessage('')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <LoadingLinkButton
                    href="/admin/settings"
                    loadingText="Going back..."
                    variant="ghost"
                    className={`mb-3 flex h-9 items-center gap-1.5 rounded-xl px-2 ${
                        isDark ? 'text-zinc-300 hover:bg-[#242424] hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                </LoadingLinkButton>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Gym Profile</h1>
                <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Name, logo, address, and contact details for your gym.
                </p>
            </div>

            {/* Basic Information */}
            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Building2 className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Basic Information</h2>
                </div>

                <div className="mb-5">
                    <Label className={`mb-3 block ${labelClass}`}>Gym Logo</Label>
                    <div className="flex items-center gap-4">
                        <div className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dashed flex-shrink-0 ${
                            isDark ? 'bg-[#161616] border-[#2a2a2a]' : 'bg-gray-100 border-gray-300'
                        }`}>
                            {logoPreview ? (
                                <Image src={logoPreview} alt="Gym logo preview" width={64} height={64} className="h-full w-full object-cover" />
                            ) : (
                                <ImageIcon className={`h-6 w-6 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={pending}
                                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                                        isDark
                                            ? 'border border-[#2a2a2a] bg-[#161616] text-gray-200 hover:bg-[#222222] hover:text-white'
                                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    Upload Logo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    disabled={pending}
                                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                                        isDark
                                            ? 'border border-[#2a2a2a] bg-[#161616] text-gray-200 hover:bg-[#222222] hover:text-white'
                                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                    Capture
                                </button>
                            </div>
                            <p className={`mt-1 text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>JPG, PNG or GIF (Max. {MAX_UPLOAD_SIZE_LABEL})</p>
                            {logoError ? <p className="mt-1 text-xs text-red-500">{logoError}</p> : null}
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handleLogoChange} className="hidden" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className={labelClass}>Gym Name <span className="text-red-500">*</span></Label>
                        <Input
                            value={name}
                            onChange={(e) => { setName(e.target.value); setNameTouched(true) }}
                            placeholder="Your gym's name"
                            disabled={pending}
                            className={inputClass(!!nameError)}
                        />
                        {nameError ? <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span> {nameError}</p> : null}
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>Phone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" disabled={pending} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>Email</Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="gym@example.com" disabled={pending} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className={labelClass}>Website</Label>
                        <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" disabled={pending} className={inputClass(false)} />
                    </div>
                </div>
            </div>

            {/* Address */}
            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <MapPin className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Address</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className={labelClass}>Address</Label>
                        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" disabled={pending} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>City</Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={pending} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>State</Label>
                        <Input value={state} onChange={(e) => setState(e.target.value)} disabled={pending} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>PIN/ZIP Code</Label>
                        <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={pending} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>Country</Label>
                        <Input value={country} onChange={(e) => setCountry(e.target.value)} disabled={pending} className={inputClass(false)} />
                    </div>
                </div>
            </div>

            {/* Business */}
            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Receipt className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Business</h2>
                </div>
                <div className="max-w-xs space-y-1.5">
                    <Label className={labelClass}>GSTIN</Label>
                    <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" disabled={pending} className={inputClass(false)} />
                </div>
            </div>

            <div>
                <Button
                    type="submit"
                    disabled={pending}
                    className={`h-10 px-6 font-semibold shadow-sm ${
                        isDark ? 'bg-[#10b981] hover:bg-[#0ea271] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loadingMessage || 'Save Changes'}
                </Button>
            </div>
        </form>
    )
}
```

- [ ] **Step 3: Replace the placeholder page**

Replace the full contents of `app/admin/settings/gym-profile/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'
import GymProfileSettings from '@/components/settings/GymProfileSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type GymProfileFields = Pick<Tables<'gyms'>,
    'name' | 'logo_url' | 'contact_phone' | 'contact_email' | 'website' |
    'address' | 'city' | 'state' | 'postal_code' | 'country' | 'gstin'>

export default async function GymProfileSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member/dashboard')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('name, logo_url, contact_phone, contact_email, website, address, city, state, postal_code, country, gstin')
        .eq('id', gym.id)
        .single()
    const { data: gymProfile } = gymResult as unknown as QueryResult<GymProfileFields | null>

    return (
        <GymProfileSettings
            gym={{
                name: gymProfile?.name ?? gym.name,
                logo_url: gymProfile?.logo_url ?? null,
                contact_phone: gymProfile?.contact_phone ?? null,
                contact_email: gymProfile?.contact_email ?? null,
                website: gymProfile?.website ?? null,
                address: gymProfile?.address ?? null,
                city: gymProfile?.city ?? null,
                state: gymProfile?.state ?? null,
                postal_code: gymProfile?.postal_code ?? null,
                country: gymProfile?.country ?? null,
                gstin: gymProfile?.gstin ?? null,
            }}
        />
    )
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, log in as staff, open `/admin/settings/gym-profile`:
- Confirm the page shows the three cards (Basic Information with logo upload, Address, Business) with the gym's current name pre-filled, instead of the old placeholder.
- Set every field (including uploading a logo image) and save. Expect a success toast.
- Refresh the page (full reload). Expect every field, including the logo, to still show the saved values — confirms persistence.
- Clear the Gym Name field and try to save. Expect inline validation and no toast.
- Check `/admin/dashboard`'s header — since it already reads `gym.name` via `AdminHeader`, confirm it now shows the updated gym name with no code change needed there (this proves single-source-of-truth reuse works end-to-end).

- [ ] **Step 6: Commit**

```bash
git add app/admin/settings/gym-profile/actions.ts app/admin/settings/gym-profile/page.tsx components/settings/GymProfileSettings.tsx
git commit -m "Implement Gym Profile settings page"
```

---

### Task 3: End-to-end regression pass

**Files:** none (verification only; fix forward in the relevant file from Tasks 1-2 if something fails).

**Interfaces:**
- Consumes: everything from Tasks 1-2.
- Produces: confidence that existing admin pages, the Membership & Fees settings page, and the storage/auth model still work, and that Gym Profile persists correctly end-to-end.

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Start the dev server and smoke-test unrelated admin pages**

Run: `npm run dev`, then as staff visit and confirm each loads without error: `/admin/dashboard`, `/admin/members`, `/admin/members/add`, `/admin/settings`, `/admin/settings/membership-fees`, `/admin/settings/account`.

- [ ] **Step 3: Confirm the logo-cleanup path doesn't touch unrelated avatars**

Upload a gym logo, save, then upload a second different logo and save again. Verify via `mcp__plugin_supabase_supabase__execute_sql` (project_id `blskfhoboxonvisoalpa`) that the `avatars` storage bucket no longer contains the first `gym-logo-*` object (it was cleaned up) but still contains any pre-existing member/staff avatar objects (nothing named `gym-logo-*` was deleted that shouldn't have been, and nothing outside that prefix was touched):

```sql
select name from storage.objects where bucket_id = 'avatars' and name like 'gym-logo-%' order by created_at desc;
```

- [ ] **Step 4: Confirm advisories are unaffected**

Run `mcp__plugin_supabase_supabase__get_advisors` with `project_id` `blskfhoboxonvisoalpa` and `type` `security`. Confirm no new advisories beyond the known pre-existing baseline (RLS disabled on `fitness_profiles`/`workout_plans`/`nutrition_plans`/`chat_messages` — unrelated, out of scope).

- [ ] **Step 5: Final commit (only if Steps 1-4 required fixes)**

If any step above required a code fix, stage and commit it with a message describing the specific regression fixed. If everything passed as implemented in Tasks 1-2, no commit is needed here.
