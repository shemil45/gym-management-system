import { setGymFeatureOverride } from '@/app/platform/actions'
import {
    EmptyState,
    PlatformButton,
    PlatformCardHeader,
    PlatformInput,
    PlatformSelect,
    PlatformShellCard,
} from '@/components/platform/PortalUI'
import { getPlatformGyms, getPlatformSettingsData } from '@/lib/platform/server'

export default async function PlatformFeatureFlagsPage() {
    const [settings, gyms] = await Promise.all([
        getPlatformSettingsData(),
        getPlatformGyms(),
    ])

    return (
        <div className="space-y-6">
            <PlatformShellCard>
                <PlatformCardHeader eyebrow="Plan defaults" title="Feature catalog" description="Distinct feature keys discovered from the SaaS plan definitions." />
                <div className="grid gap-3 p-5 md:grid-cols-2">
                    {settings.planFeatures.length ? settings.planFeatures.map((feature) => (
                        <div key={feature.key} className="rounded-lg border border-slate-200 p-4">
                            <p className="font-medium text-slate-950">{feature.key}</p>
                            <p className="mt-1 text-sm text-slate-600">{feature.plans.join(', ')}</p>
                        </div>
                    )) : <EmptyState message="No plan features were found in `saas_plans.features`." />}
                </div>
            </PlatformShellCard>

            <PlatformShellCard>
                <PlatformCardHeader eyebrow="Overrides" title="Per-gym feature flags" description="Temporary or permanent overrides layered on top of plan defaults." />
                <div className="grid gap-4 p-5 lg:grid-cols-2">
                    {gyms.length ? gyms.map((gym) => (
                        <div key={gym.id} className="rounded-lg border border-slate-200 p-4">
                            <p className="font-semibold text-slate-950">{gym.name}</p>
                            <div className="mt-4 space-y-3">
                                {(settings.planFeatures.length ? settings.planFeatures : [{ key: 'custom_flag', plans: [] }]).map((feature) => {
                                    const override = settings.overrides.find((entry) => entry.gym_id === gym.id && entry.flag_key === feature.key)
                                    return (
                                        <form key={feature.key} action={setGymFeatureOverride} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                            <input type="hidden" name="gym_id" value={gym.id} />
                                            <input type="hidden" name="flag_key" value={feature.key} />
                                            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{feature.key}</p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {override ? 'Override saved for this gym.' : 'Using plan default.'}
                                                    </p>
                                                    <PlatformInput name="note" defaultValue={override?.note || ''} placeholder="Optional note for this override" className="mt-3 h-9 text-xs" />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <PlatformSelect name="is_enabled" defaultValue={String(override?.is_enabled ?? true)} className="h-9 text-xs">
                                                        <option value="true">Enabled</option>
                                                        <option value="false">Disabled</option>
                                                    </PlatformSelect>
                                                    <PlatformButton className="h-9">Apply</PlatformButton>
                                                </div>
                                            </div>
                                        </form>
                                    )
                                })}
                            </div>
                        </div>
                    )) : <EmptyState message="No gyms are available for feature overrides." />}
                </div>
            </PlatformShellCard>
        </div>
    )
}
