import { formatDate } from '@/lib/utils/date'

type Props = {
    gymName: string
    /** Report area and view, e.g. `Payments — Day book`. */
    title: string
    /** Period the figures cover, already formatted by the caller. */
    period?: string
    /** Comparison basis, when the report shows one. */
    comparison?: string
    /** IST calendar date the report was produced. */
    generatedOn?: string
}

/**
 * Masthead for a printed report: which gym, which report, which period.
 *
 * Screen-hidden, print-only. Every area can adopt this so a printed page is
 * self-describing once it leaves the browser — today only the payments day
 * book prints, and it carries its own inline header.
 *
 * This is deliberately only the shared header. A full PDF pipeline (jspdf is
 * already a dependency, used for receipts) is out of scope here; structuring
 * the print surface first is what that would build on.
 */
export default function PrintHeader({ gymName, title, period, comparison, generatedOn }: Props) {
    return (
        <header className="hidden print:block print:text-black">
            <p className="text-base font-semibold">{gymName} — {title}</p>
            {period ? <p className="text-sm">{period}</p> : null}
            {comparison ? <p className="text-xs">Compared with {comparison}</p> : null}
            {generatedOn ? <p className="text-xs">Generated {formatDate(generatedOn, 'dd MMM yyyy')}</p> : null}
        </header>
    )
}
