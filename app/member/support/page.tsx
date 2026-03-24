'use client'

import { Phone, Mail, MapPin, Clock, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { useState } from 'react'

const GYM_INFO = {
    name: 'GymFit',
    phone: '+91 98765 43210',
    email: 'hello@gymfit.in',
    address: '123, Fitness Road, Koramangala, Bengaluru, Karnataka 560034',
    mapUrl: 'https://maps.google.com/?q=Koramangala+Bengaluru',
    hours: [
        { day: 'Monday – Friday', time: '5:00 AM – 11:00 PM' },
        { day: 'Saturday', time: '6:00 AM – 10:00 PM' },
        { day: 'Sunday', time: '7:00 AM – 8:00 PM' },
    ],
    facilities: ['Weight Training', 'Cardio Zone', 'Yoga Studio', 'Locker Rooms', 'Steam Room', 'Personal Training', 'Group Classes'],
}

const FAQS = [
    { q: 'How do I freeze my membership?', a: 'Go to Profile → Membership Requests and submit a freeze request with your preferred duration and reason. Our staff will review and approve it within 24 hours.' },
    { q: 'How do I check my membership expiry date?', a: 'Your membership expiry is shown prominently on your Dashboard in the Digital Membership Card section.' },
    { q: 'What if I forget my email or password?', a: 'Use the "Forgot Password" link on the login page to receive a reset link. If you\'ve also forgotten your email, contact the gym desk with your Member ID.' },
    { q: 'How do I use the referral program?', a: 'Go to the Referrals page, copy your unique referral code, and share it with friends. When they join and make a payment, you\'ll receive your reward automatically.' },
    { q: 'Can I transfer my membership to someone else?', a: 'Membership transfers are not available through the app. Please visit the gym desk for such requests.' },
    { q: 'How are check-in times recorded?', a: 'Check-ins are recorded by the gym staff or via the kiosk at the entrance. Your full history is available on the Check-ins page.' },
    { q: 'What payment methods are accepted?', a: 'We accept Cash, UPI, Debit/Credit Cards, and Net Banking. Payments are processed at the gym desk.' },
]

function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                className="flex w-full items-center justify-between py-3.5 text-left"
                onClick={() => setOpen(o => !o)}
            >
                <span className="text-sm font-medium text-gray-800 pr-4">{question}</span>
                {open ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
            </button>
            {open && (
                <p className="text-sm text-gray-500 pb-4 leading-relaxed">{answer}</p>
            )}
        </div>
    )
}

export default function MemberSupport() {
    return (
        <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Support & Help</h1>
                <p className="text-sm text-gray-500 mt-0.5">Get in touch or find answers to common questions</p>
            </div>

            {/* ── Contact Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                    href={`tel:${GYM_INFO.phone.replace(/\s/g, '')}`}
                    className="group flex flex-col items-center justify-center gap-2 rounded-xl bg-white p-5 shadow-sm border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-center"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 group-hover:bg-emerald-500 transition-colors">
                        <Phone className="h-5 w-5 text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-900">Call Us</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{GYM_INFO.phone}</p>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium">Tap to call →</span>
                </a>

                <a
                    href={`mailto:${GYM_INFO.email}`}
                    className="group flex flex-col items-center justify-center gap-2 rounded-xl bg-white p-5 shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-center"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 group-hover:bg-blue-500 transition-colors">
                        <Mail className="h-5 w-5 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-900">Email Us</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{GYM_INFO.email}</p>
                    </div>
                    <span className="text-[10px] text-blue-600 font-medium">Tap to email →</span>
                </a>

                <a
                    href={GYM_INFO.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center justify-center gap-2 rounded-xl bg-white p-5 shadow-sm border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all text-center"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 group-hover:bg-orange-500 transition-colors">
                        <MapPin className="h-5 w-5 text-orange-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-900">Find Us</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{GYM_INFO.address}</p>
                    </div>
                    <span className="text-[10px] text-orange-500 font-medium">Open maps →</span>
                </a>
            </div>

            {/* ── Opening Hours ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" /> Opening Hours
                </h2>
                <div className="space-y-2.5">
                    {GYM_INFO.hours.map(({ day, time }) => (
                        <div key={day} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">{day}</span>
                            <span className="text-xs font-semibold text-gray-800">{time}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── FAQ ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-gray-400" /> Frequently Asked Questions
                </h2>
                <div>
                    {FAQS.map(faq => (
                        <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
                    ))}
                </div>
            </div>

            {/* ── Gym Info ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Gym Facilities</h2>
                <div className="flex flex-wrap gap-2">
                    {GYM_INFO.facilities.map(f => (
                        <span key={f} className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                            {f}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Gym Rules ── */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Gym Rules & Guidelines</h2>
                <ul className="space-y-2 text-xs text-gray-600">
                    {[
                        'Always carry a valid membership card or show your digital card at entry.',
                        'Wipe equipment after use. Keep the gym clean and hygienic.',
                        'Re-rack weights and put equipment back in place after use.',
                        'No outside food or beverages (except water) inside the gym.',
                        'Proper gym attire (sportswear + closed-toe shoes) is mandatory.',
                        'Follow instructions from gym staff and trainers at all times.',
                        'Be respectful of other members and avoid hogging equipment.',
                        'Report any injuries or concerns to gym staff immediately.',
                    ].map((rule, i) => (
                        <li key={i} className="flex gap-2">
                            <span className="h-4 w-4 shrink-0 rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 flex items-center justify-center mt-0.5">
                                {i + 1}
                            </span>
                            {rule}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
