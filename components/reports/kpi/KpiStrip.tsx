import KpiCard, { type KpiCardProps } from '@/components/reports/kpi/KpiCard'

/**
 * Column counts in use across the report areas. Written out in full rather
 * than interpolated so Tailwind's source scan can see every class.
 */
const COLUMNS: Record<2 | 3 | 4 | 5 | 6, string> = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

type Props = {
    columns?: keyof typeof COLUMNS
    /** Cards to render. Pass `children` instead when a card needs custom content. */
    items?: (KpiCardProps & { key?: string })[]
    children?: React.ReactNode
}

/** The `<dl>` row that holds a report's KPI cards. */
export default function KpiStrip({ columns = 3, items, children }: Props) {
    return (
        <dl className={`grid gap-3 ${COLUMNS[columns]}`}>
            {items?.map((item) => <KpiCard key={item.key ?? item.label} {...item} />)}
            {children}
        </dl>
    )
}
