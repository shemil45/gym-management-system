import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      process.env[key] = value
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Random helper functions
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomPhone = () => `9${[...Array(9)].map(() => randomInt(0, 9)).join('')}`

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth()

const randomDateThisMonth = () => {
  const maxDay = new Date(currentYear, currentMonth + 1, 0).getDate()
  const day = randomInt(1, maxDay)
  const hour = randomInt(6, 22) // 6 AM to 10 PM
  const min = randomInt(0, 59)
  const date = new Date(currentYear, currentMonth, day, hour, min, 0)
  return date.toISOString()
}

const runSeed = async () => {
  type MemberRow = { id: string }
  type MemberInsert = {
    member_id: string
    full_name: string
    email: string
    phone: string
    status: string
    membership_plan_id: string
    membership_start_date: string
    membership_expiry_date: string
  }
  type CheckInInsert = {
    member_id: string
    check_in_time: string
    check_out_time: string
    entry_method: string
  }
  type PaymentInsert = {
    member_id: string
    amount: number
    payment_method: string
    payment_status: string
    payment_date: string
  }
  type ExpenseInsert = {
    category: string
    amount: number
    description: string
    expense_date: string
  }

  console.log('Starting mock data insertion...')

  // 1. Membership Plans
  const plans = [
    { name: 'Monthly Basic', duration_days: 30, price: 999, is_active: true },
    { name: 'Quarterly Pro', duration_days: 90, price: 2499, is_active: true },
    { name: 'Yearly Elite', duration_days: 365, price: 8999, is_active: true }
  ]
  
  const { data: existingPlans } = await supabase.from('membership_plans').select('id')
  let planIds = existingPlans?.map(p => p.id) || []
  
  if (planIds.length === 0) {
    console.log('Inserting mock membership plans...')
    const { data: newPlans, error: insertPlansError } = await supabase.from('membership_plans').insert(plans).select()
    if (insertPlansError) console.error(insertPlansError)
    planIds = newPlans?.map(p => p.id) || []
  }

  if (planIds.length === 0) {
    console.error('Failed to get membership plans.')
    return
  }

  // 2. Members (15 Mock Members)
  console.log('Inserting 15 mock members...')
  const newMembers: MemberInsert[] = []
  for (let i = 1; i <= 15; i++) {
    const start = new Date(currentYear, currentMonth, randomInt(1, 10))
    const end = new Date(start)
    end.setDate(end.getDate() + 30)

    newMembers.push({
      member_id: `M-MOCK-${Date.now().toString().slice(-4)}${i}`,
      full_name: `Mock Member ${i}`,
      email: `mockmember${i}@example.com`,
      phone: randomPhone(),
      status: 'active',
      membership_plan_id: randomItem(planIds),
      membership_start_date: start.toISOString(),
      membership_expiry_date: end.toISOString()
    })
  }

  const { data: insertedMembers, error: membersError } = await supabase.from('members').insert(newMembers).select()
  if (membersError) console.error(membersError)
  const memberIds = (insertedMembers as MemberRow[] | null)?.map(m => m.id) || []

  if (memberIds.length === 0) return

  // 3. Check-ins (50 mock check-ins this month)
  console.log('Inserting 50 mock check-ins...')
  const newCheckIns: CheckInInsert[] = []
  for (let i = 0; i < 50; i++) {
    const entryMethods = ['manual', 'qr', 'fingerprint']
    const inTime = randomDateThisMonth()
    const outTimeObj = new Date(inTime)
    outTimeObj.setHours(outTimeObj.getHours() + randomInt(1, 2))
    
    newCheckIns.push({
      member_id: randomItem(memberIds),
      check_in_time: inTime,
      check_out_time: outTimeObj.toISOString(),
      entry_method: randomItem(entryMethods)
    })
  }
  const { error: checkInsError } = await supabase.from('check_ins').insert(newCheckIns)
  if (checkInsError) console.error(checkInsError)

  // 4. Payments (20 mock payments this month)
  console.log('Inserting 20 mock payments...')
  const newPayments: PaymentInsert[] = []
  const paymentMethods = ['cash', 'card', 'upi', 'online']
  const paymentStatuses = ['paid', 'paid', 'paid', 'pending', 'failed'] // mostly paid
  
  for (let i = 0; i < 20; i++) {
    newPayments.push({
      member_id: randomItem(memberIds),
      amount: randomInt(500, 5000),
      payment_method: randomItem(paymentMethods),
      payment_status: randomItem(paymentStatuses),
      payment_date: randomDateThisMonth()
    })
  }
  const { error: paymentsError } = await supabase.from('payments').insert(newPayments)
  if (paymentsError) console.error(paymentsError)

  // 5. Expenses (15 mock expenses this month)
  console.log('Inserting 15 mock expenses...')
  const newExpenses: ExpenseInsert[] = []
  const categories = ['utilities', 'salary', 'equipment', 'maintenance', 'marketing', 'rent', 'other']
  
  for (let i = 0; i < 15; i++) {
    newExpenses.push({
      category: randomItem(categories),
      amount: randomInt(100, 10000),
      description: `Mock Expense ${i}`,
      expense_date: randomDateThisMonth()
    })
  }
  const { error: expensesError } = await supabase.from('expenses').insert(newExpenses)
  if (expensesError) console.error(expensesError)

  console.log('Mock data generation complete!')
}

runSeed()
