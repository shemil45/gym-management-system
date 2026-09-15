import { describe, it, expect } from 'vitest'
import { dayBookCsv, summaryCsv, planCsv, pendingCsv, staffCsv } from '@/lib/reports/payments-csv'
import type { ReportPaymentRow } from '@/lib/reports/payments-aggregate'

const row: ReportPaymentRow = {
    id: 'p1', amount: 1500, admission_fee_amount: 500, referral_coins_used: 50, payment_method: 'upi', payment_status: 'paid',
    payment_date: '2026-09-15', created_at: '2026-09-15T04:05:00Z', receipt_number: 'R-1', invoice_number: null, notes: 'a, note',
    member_name: 'Asha', member_code: 'GYM001', member_phone: '9999999999', plan_name: 'Monthly', processor_name: 'S1', is_demo: false,
}

describe('payments csv builders', () => {
    it('day book has one line per row plus header, raw numbers', () => {
        const csv = dayBookCsv({ rows: [row], totals: { collected: 1500, paidCount: 1, byMethod: { cash: 0, upi: 1500, card: 0, bank_transfer: 0, online: 0 }, pendingCount: 0, pendingAmount: 0, refundedCount: 0, refundedAmount: 0 } })
        const lines = csv.split('\r\n')
        expect(lines[0]).toBe('﻿Date,Time,Receipt,Member,Member ID,Plan,Amount,Admission fee,Coins used,Method,Status,Collected by,Notes')
        expect(lines[1]).toBe('2026-09-15,09:35,R-1,Asha,GYM001,Monthly,1500,500,50,upi,paid,S1,"a, note"')
        expect(lines).toHaveLength(2)
    })
    it('summary emits buckets with method columns', () => {
        const bucket = { start: '2026-09-15', label: '15 Sep', txns: 1, collected: 1500, byMethod: { cash: 0, upi: 1500, card: 0, bank_transfer: 0, online: 0 }, admissionFees: 500, membershipRevenue: 1000, coinsRedeemed: 50, refunded: 0 }
        const csv = summaryCsv({ buckets: [bucket], kpis: { collected: 1500, txns: 1, avgTicket: 1500 }, previous: { collected: 0, txns: 0, avgTicket: 0 } })
        expect(csv.split('\r\n')[1]).toBe('2026-09-15,15 Sep,1,1500,0,1500,0,0,0,500,1000,50,0')
    })
    it('plan, pending, staff', () => {
        expect(planCsv({ rows: [{ plan: 'Monthly', txns: 1, revenue: 1500, share: 100, avgTicket: 1500 }], total: { txns: 1, revenue: 1500 } }).split('\r\n')[1]).toBe('Monthly,1,1500,100,1500')
        expect(pendingCsv({ rows: [{ ...row, payment_status: 'pending' }], totals: { count: 1, amount: 1500 } }).split('\r\n')[1]).toBe('2026-09-15,Asha,GYM001,9999999999,Monthly,1500,upi,pending,"a, note"')
        expect(staffCsv({ rows: [{ staff: 'S1', txns: 1, collected: 1500, cash: 0 }], total: { txns: 1, collected: 1500, cash: 0 } }).split('\r\n')[1]).toBe('S1,1,1500,0')
    })
})
