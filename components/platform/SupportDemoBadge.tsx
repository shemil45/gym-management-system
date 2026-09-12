import { IconTool } from '@tabler/icons-react'
import { DEMO_READONLY_MESSAGE } from '@/lib/platform/impersonation-messages'

/**
 * Marks a row created by a platform operator during a support session. The
 * tenant can look but not touch; the row disappears when the session ends.
 */
export default function SupportDemoBadge({ className = '' }: { className?: string }) {
    return (
        <span
            title={DEMO_READONLY_MESSAGE}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25 ${className}`}
        >
            <IconTool size={10} stroke={2} />
            Support demo
        </span>
    )
}
