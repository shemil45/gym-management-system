import { Suspense } from 'react'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { membersSearchParams, parseMembersParams, type MembersReportQuery, type RawParams } from '@/lib/reports/members-params'
import { getInactive, getJoins, getRenewals, getRetention, getRoster } from '@/lib/reports/members'
import MembersReport from '@/components/reports/members/MembersReport'
import JoinsTable from '@/components/reports/members/JoinsTable'
import JoinsKpis from '@/components/reports/members/JoinsKpis'
import RenewalsTable from '@/components/reports/members/RenewalsTable'
import RenewalsControls from '@/components/reports/members/RenewalsControls'
import RetentionTable from '@/components/reports/members/RetentionTable'
import RetentionKpis from '@/components/reports/members/RetentionKpis'
import ChurnedTable from '@/components/reports/members/ChurnedTable'
import RosterCards from '@/components/reports/members/RosterCards'
import PlanDistributionTable from '@/components/reports/members/PlanDistributionTable'
import InactiveTable from '@/components/reports/members/InactiveTable'
import DaysChips from '@/components/reports/members/DaysChips'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import { MembersTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/members'

async function TabBody({ gymId, query }: { gymId: string; query: MembersReportQuery }) {
    switch (query.tab) {
        case 'joins': {
            const report = await getJoins(gymId, query)
            return <><JoinsKpis current={report.kpis} previous={report.previous} /><JoinsTable report={report} /></>
        }
        case 'renewals':
            return <RenewalsTable report={await getRenewals(gymId, query)} />
        case 'retention': {
            const report = await getRetention(gymId, query)
            return <><RetentionKpis current={report.totals} previous={report.previous} /><RetentionTable report={report} /><ChurnedTable rows={report.churned} /></>
        }
        case 'roster': {
            const report = await getRoster(gymId, query.today)
            return <><RosterCards report={report} /><PlanDistributionTable plans={report.plans} /></>
        }
        case 'inactive':
            return <InactiveTable report={await getInactive(gymId, query)} />
    }
}

function controlsFor(query: MembersReportQuery, search: string) {
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`
    switch (query.tab) {
        case 'joins':
        case 'retention':
            return <><PeriodPicker key={periodKey} query={query} basePath={BASE} /><ExportCsvButton search={search} basePath={BASE} /></>
        case 'renewals':
            return (
                <>
                    <RenewalsControls query={query} />
                    {query.lapsed && <PeriodPicker key={periodKey} query={query} basePath={BASE} />}
                    <ExportCsvButton search={search} basePath={BASE} />
                </>
            )
        case 'roster':
            return <ExportCsvButton search={search} basePath={BASE} />
        case 'inactive':
            return <><DaysChips query={query} /><ExportCsvButton search={search} basePath={BASE} /></>
    }
}

export default async function MembersReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const query = parseMembersParams(await searchParams, todayInKolkata())
    const search = membersSearchParams(query).toString()

    return (
        <MembersReport query={query} controls={controlsFor(query, search)}>
            {/* Keyed on the full query so a tab, horizon, days, or period change
                swaps the body for its skeleton instead of holding stale data. */}
            <Suspense key={search} fallback={<div className="space-y-5 animate-pulse"><MembersTabSkeleton tab={query.tab} /></div>}>
                <TabBody gymId={gym.id} query={query} />
            </Suspense>
        </MembersReport>
    )
}
