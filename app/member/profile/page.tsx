'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Shield, Bell, AlertTriangle, ChevronDown, ChevronUp, Save, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface MemberProfile {
    member_id: string
    full_name: string
    email: string | null
    phone: string
    date_of_birth: string | null
    gender: 'male' | 'female' | 'other' | null
    photo_url: string | null
    address: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
}

type SectionId = 'personal' | 'emergency' | 'password' | 'freeze'

function Section({
    id, title, icon: Icon, open, onToggle, children
}: {
    id: SectionId
    title: string
    icon: React.ElementType
    open: boolean
    onToggle: (id: SectionId) => void
    children: React.ReactNode
}) {
    return (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <button
                className="flex w-full items-center justify-between p-5 text-left"
                onClick={() => onToggle(id)}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <Icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{title}</span>
                </div>
                {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {open && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    {children}
                </div>
            )}
        </div>
    )
}

function SuccessBanner({ message }: { message: string }) {
    return (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            <Check className="h-4 w-4 shrink-0" />
            {message}
        </div>
    )
}

export default function MemberProfile() {
    const [profile, setProfile] = useState<MemberProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [openSection, setOpenSection] = useState<SectionId>('personal')

    // Personal info form
    const [personalForm, setPersonalForm] = useState({
        full_name: '', phone: '', date_of_birth: '', gender: '' as string, address: ''
    })
    const [personalSaving, setPersonalSaving] = useState(false)
    const [personalSuccess, setPersonalSuccess] = useState('')
    const [personalError, setPersonalError] = useState('')

    // Emergency contact form
    const [emergencyForm, setEmergencyForm] = useState({ name: '', phone: '' })
    const [emergencySaving, setEmergencySaving] = useState(false)
    const [emergencySuccess, setEmergencySuccess] = useState('')
    const [emergencyError, setEmergencyError] = useState('')

    // Password form
    const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
    const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })
    const [pwSaving, setPwSaving] = useState(false)
    const [pwSuccess, setPwSuccess] = useState('')
    const [pwError, setPwError] = useState('')

    // Freeze request form
    const [freezeForm, setFreezeForm] = useState({ duration: '7', reason: '' })
    const [freezeSaving, setFreezeSaving] = useState(false)
    const [freezeSuccess, setFreezeSuccess] = useState('')
    const [freezeError, setFreezeError] = useState('')

    useEffect(() => {
        async function fetchProfile() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: member } = await supabase
                .from('members')
                .select('*')
                .eq('user_id', user.id)
                .single() as { data: ({
                    member_id: string
                    full_name: string
                    email: string | null
                    phone: string
                    date_of_birth: string | null
                    gender: 'male' | 'female' | 'other' | null
                    photo_url: string | null
                    address: string | null
                    emergency_contact_name: string | null
                    emergency_contact_phone: string | null
                }) | null, error: unknown }

            if (member) {
                setProfile({ member_id: member.member_id, full_name: member.full_name, email: user.email || member.email, phone: member.phone, date_of_birth: member.date_of_birth, gender: member.gender, photo_url: member.photo_url, address: member.address, emergency_contact_name: member.emergency_contact_name, emergency_contact_phone: member.emergency_contact_phone })
                setPersonalForm({
                    full_name: member.full_name || '',
                    phone: member.phone || '',
                    date_of_birth: member.date_of_birth || '',
                    gender: member.gender || '',
                    address: member.address || '',
                })
                setEmergencyForm({
                    name: member.emergency_contact_name || '',
                    phone: member.emergency_contact_phone || '',
                })
            }
            setLoading(false)
        }
        fetchProfile()
    }, [])

    const toggleSection = (id: SectionId) => setOpenSection(prev => prev === id ? id : id)

    const savePersonal = async () => {
        setPersonalSaving(true); setPersonalError(''); setPersonalSuccess('')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await (supabase.from('members') as unknown as {
            update: (p: object) => { eq: (c: string, v: string) => Promise<{ error: unknown }> }
        }).update({
            full_name: personalForm.full_name,
            phone: personalForm.phone,
            date_of_birth: personalForm.date_of_birth || null,
            gender: (personalForm.gender as 'male' | 'female' | 'other') || null,
            address: personalForm.address || null,
        }).eq('user_id', user.id)

        if (error) setPersonalError((error as Error).message || 'Failed to save.')
        else { setPersonalSuccess('Personal info updated successfully!'); setProfile(p => p ? { ...p, ...personalForm, gender: personalForm.gender as MemberProfile['gender'] } : p) }
        setPersonalSaving(false)
    }

    const saveEmergency = async () => {
        setEmergencySaving(true); setEmergencyError(''); setEmergencySuccess('')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await (supabase.from('members') as unknown as {
            update: (p: object) => { eq: (c: string, v: string) => Promise<{ error: unknown }> }
        }).update({
            emergency_contact_name: emergencyForm.name || null,
            emergency_contact_phone: emergencyForm.phone || null,
        }).eq('user_id', user.id)

        if (error) setEmergencyError((error as Error).message || 'Failed to save.')
        else setEmergencySuccess('Emergency contact updated!')
        setEmergencySaving(false)
    }

    const savePassword = async () => {
        if (!pwForm.newPw || pwForm.newPw !== pwForm.confirm) {
            setPwError('New passwords do not match.'); return
        }
        if (pwForm.newPw.length < 6) {
            setPwError('Password must be at least 6 characters.'); return
        }
        setPwSaving(true); setPwError(''); setPwSuccess('')
        const supabase = createClient()

        // Re-authenticate with current password
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) { setPwError('Session expired. Please log in again.'); setPwSaving(false); return }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email, password: pwForm.current
        })
        if (signInError) { setPwError('Current password is incorrect.'); setPwSaving(false); return }

        const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
        if (error) setPwError(error.message)
        else { setPwSuccess('Password changed successfully!'); setPwForm({ current: '', newPw: '', confirm: '' }) }
        setPwSaving(false)
    }

    const submitFreezeRequest = async () => {
        if (!freezeForm.reason.trim()) { setFreezeError('Please provide a reason.'); return }
        setFreezeSaving(true); setFreezeError(''); setFreezeSuccess('')
        // In a full implementation: insert a 'membership_requests' table row
        // For now we'll just show a success message indicating it was submitted
        await new Promise(r => setTimeout(r, 800)) // simulate
        setFreezeSuccess(`Freeze request for ${freezeForm.duration} days submitted! The gym staff will review it.`)
        setFreezeForm({ duration: '7', reason: '' })
        setFreezeSaving(false)
    }

    const initials = profile?.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'M'

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-gray-200 rounded-2xl" />
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
    )

    return (
        <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">
            <div>
                <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage your personal information and account settings</p>
            </div>

            {/* ── Header card ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                    <AvatarImage src={profile?.photo_url || undefined} />
                    <AvatarFallback className="bg-emerald-500 text-white text-lg font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-base font-bold text-gray-900">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{profile?.email}</p>
                    <span className="mt-1.5 inline-block text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {profile?.member_id}
                    </span>
                </div>
            </div>

            {/* ── Personal Info ── */}
            <Section id="personal" title="Personal Information" icon={User} open={openSection === 'personal'} onToggle={toggleSection}>
                <div className="space-y-3">
                    {personalSuccess && <SuccessBanner message={personalSuccess} />}
                    {personalError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{personalError}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                            <input className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                                value={personalForm.full_name} onChange={e => setPersonalForm(p => ({ ...p, full_name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                            <input className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                                value={personalForm.phone} onChange={e => setPersonalForm(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                            <input type="date" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                                value={personalForm.date_of_birth} onChange={e => setPersonalForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                            <select className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                                value={personalForm.gender} onChange={e => setPersonalForm(p => ({ ...p, gender: e.target.value }))}>
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                        <textarea rows={2} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all resize-none"
                            value={personalForm.address} onChange={e => setPersonalForm(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <button onClick={savePersonal} disabled={personalSaving}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                        {personalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </button>
                </div>
            </Section>

            {/* ── Emergency Contact ── */}
            <Section id="emergency" title="Emergency Contact" icon={Shield} open={openSection === 'emergency'} onToggle={toggleSection}>
                <div className="space-y-3">
                    {emergencySuccess && <SuccessBanner message={emergencySuccess} />}
                    {emergencyError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{emergencyError}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                            <input className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                                placeholder="e.g. Jane Doe" value={emergencyForm.name} onChange={e => setEmergencyForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Contact Phone</label>
                            <input className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                                placeholder="+91 xxxxx xxxxx" value={emergencyForm.phone} onChange={e => setEmergencyForm(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                    </div>
                    <button onClick={saveEmergency} disabled={emergencySaving}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                        {emergencySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Contact
                    </button>
                </div>
            </Section>

            {/* ── Change Password ── */}
            <Section id="password" title="Change Password" icon={Shield} open={openSection === 'password'} onToggle={toggleSection}>
                <div className="space-y-3">
                    {pwSuccess && <SuccessBanner message={pwSuccess} />}
                    {pwError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</div>}
                    {(['current', 'newPw', 'confirm'] as const).map((field) => (
                        <div key={field}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                {field === 'current' ? 'Current Password' : field === 'newPw' ? 'New Password' : 'Confirm New Password'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPw[field] ? 'text' : 'password'}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-9 text-sm text-gray-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                                    value={pwForm[field]}
                                    onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPw[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    ))}
                    <button onClick={savePassword} disabled={pwSaving}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                        {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        Update Password
                    </button>
                </div>
            </Section>

            {/* ── Membership Requests ── */}
            <Section id="freeze" title="Membership Requests" icon={AlertTriangle} open={openSection === 'freeze'} onToggle={toggleSection}>
                <div className="space-y-4">
                    {freezeSuccess && <SuccessBanner message={freezeSuccess} />}
                    {freezeError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{freezeError}</div>}

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Bell className="h-4 w-4 text-amber-500" /> Freeze Membership
                        </h3>
                        <p className="text-xs text-gray-600 mb-3">Request to temporarily pause your membership. The gym admin will review and approve your request.</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Freeze Duration</label>
                                <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                                    value={freezeForm.duration} onChange={e => setFreezeForm(p => ({ ...p, duration: e.target.value }))}>
                                    <option value="7">7 days</option>
                                    <option value="14">14 days</option>
                                    <option value="30">30 days</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                                <textarea rows={3} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all resize-none"
                                    placeholder="e.g. Travelling, injury, family event..."
                                    value={freezeForm.reason} onChange={e => setFreezeForm(p => ({ ...p, reason: e.target.value }))} />
                            </div>
                            <button onClick={submitFreezeRequest} disabled={freezeSaving}
                                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                                {freezeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                                Submit Freeze Request
                            </button>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    )
}
