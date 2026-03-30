'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import { Gift, Users, CheckCircle, Clock, Copy, Share2, Check, ExternalLink } from 'lucide-react'
import { fetchMemberReferrals, ReferralPageData } from './actions'


export default function MemberReferrals() {
    const [data, setData] = useState<ReferralPageData | null>(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        fetchMemberReferrals().then(result => {
            setData(result)
            setLoading(false)
        })
    }, [])

    const handleCopy = async () => {
        const code = data?.referralCode || ''
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleWhatsApp = () => {
        const text = `Join my gym with my referral code *${data?.referralCode}* and get a special discount! 💪`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-36 bg-gray-200 rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}</div>
        </div>
    )

    if (!data) return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <Gift className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Referral data unavailable.</p>
        </div>
    )

    const statusConfig = {
        applied: { label: 'Rewarded', class: 'bg-emerald-100 text-emerald-700' },
        pending: { label: 'Pending', class: 'bg-amber-100 text-amber-700' },
        expired: { label: 'Expired', class: 'bg-gray-100 text-gray-500' },
    }

    return (
        <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Referral Program</h1>
                <p className="text-sm text-gray-500 mt-0.5">Invite friends and earn rewards</p>
            </div>

            {/* ── Referral Code Card ── */}
            <div
                className="relative overflow-hidden rounded-2xl p-6 text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)' }}
            >
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />

                <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                        <Gift className="h-5 w-5 text-orange-200" />
                        <span className="text-sm font-semibold text-orange-100">Your Referral Code</span>
                    </div>

                    <div className="flex items-center justify-between bg-white/15 rounded-xl px-4 py-3 mb-4 backdrop-blur-sm">
                        <span className="text-2xl font-bold font-mono tracking-widest">{data.referralCode}</span>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-3 py-1.5 text-xs font-semibold"
                        >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleWhatsApp}
                            className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-xl py-2.5 text-sm font-semibold"
                        >
                            <Share2 className="h-4 w-4" />
                            Share on WhatsApp
                        </button>
                        <button
                            onClick={handleCopy}
                            className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-4 py-2.5 text-sm font-semibold"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Copy Link
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Total Referred', value: data.stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Successful', value: data.stats.successful, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pending', value: data.stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Rewards Earned', value: formatCurrency(data.stats.totalRewardsEarned), icon: Gift, color: 'text-orange-500', bg: 'bg-orange-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{value}</p>
                            <p className="text-[11px] text-gray-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Rewards Explanation ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-orange-500" /> How It Works
                </h2>
                <div className="space-y-3">
                    {[
                        { step: '1', title: 'Share your code', desc: 'Send your unique referral code to friends and family' },
                        { step: '2', title: 'They join the gym', desc: 'Your friend registers and makes their first payment' },
                        { step: '3', title: 'You earn rewards', desc: 'Receive your reward once their membership is confirmed' },
                    ].map(({ step, title, desc }) => (
                        <div key={step} className="flex gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                                {step}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-800">{title}</p>
                                <p className="text-xs text-gray-500">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-[11px] text-gray-400 border-t border-gray-100 pt-3">
                    * Reward amounts and types are determined by the gym. Contact the gym for current referral offers.
                </p>
            </div>

            {/* ── Referral List ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">My Referrals</h2>
                    <span className="text-xs text-gray-400">{data.referrals.length} total</span>
                </div>

                {data.referrals.length === 0 ? (
                    <div className="py-10 text-center">
                        <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No referrals yet</p>
                        <p className="text-xs text-gray-300 mt-1">Share your code to start earning rewards!</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-4 gap-2 px-2 mb-2">
                            {['Name', 'Date', 'Status', 'Reward'].map(h => (
                                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</span>
                            ))}
                        </div>
                        <div className="space-y-1">
                            {data.referrals.map(r => {
                                const sc = statusConfig[r.status]
                                return (
                                    <div key={r.id} className="grid grid-cols-4 gap-2 items-center rounded-lg px-2 py-2.5 hover:bg-gray-50 transition-colors">
                                        <span className="text-xs font-medium text-gray-800 truncate">{r.referred_name}</span>
                                        <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${sc.class}`}>
                                            {sc.label}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {r.reward_amount ? formatCurrency(r.reward_amount) : '—'}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
