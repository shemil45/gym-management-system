import { describe, it, expect } from 'vitest'
import { pnlCsv, categoryCsv, ledgerCsv } from '@/lib/reports/expenses-csv'

describe('expenses csv', () => {
    it('pnl has bucket start, income lines, categories, totals', () => {
        const bucket = { start: '2026-09-01', label: 'Sep 2026', membershipRevenue: 1000, admissionFees: 500, refunded: 200, netIncome: 1300, byCategory: { utilities: 100, salary: 0, equipment: 0, maintenance: 0, marketing: 0, rent: 300, other: 0 }, totalExpenses: 400, net: 900, margin: 69.23 }
        const csv = pnlCsv({ buckets: [bucket], totals: { ...bucket }, kpis: { netIncome: 1300, totalExpenses: 400, net: 900 }, previous: { netIncome: 0, totalExpenses: 0, net: 0 } })
        const lines = csv.split('\r\n')
        expect(lines[0]).toBe('﻿Bucket start,Period,Membership revenue,Admission fees,Refunds,Net income,Utilities,Salary,Equipment,Maintenance,Marketing,Rent,Other,Total expenses,Net,Margin %')
        expect(lines[1]).toBe('2026-09-01,Sep 2026,1000,500,200,1300,100,0,0,0,0,300,0,400,900,69.23')
    })
    it('category and ledger rows', () => {
        expect(categoryCsv({ rows: [{ category: 'rent', label: 'Rent', entries: 2, total: 1000, share: 50, avg: 500, previous: 500, delta: 100 }], total: 2000, previousTotal: 500 }).split('\r\n')[1]).toBe('Rent,2,1000,50,500,500,100')
        expect(ledgerCsv({ rows: [{ id: 'e', amount: 300, category: 'rent', description: 'Sept, rent', expense_date: '2026-09-01', created_at: '', receipt_url: 'https://x/r.pdf', adder_name: 'S1', is_demo: false }], totals: { count: 1, amount: 300 } }).split('\r\n')[1]).toBe('2026-09-01,Rent,"Sept, rent",300,S1,https://x/r.pdf')
    })
})
