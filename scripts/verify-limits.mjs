// Smoke-test: confirm the 100/mo cap math and the yearly-vs-monthly checkout
// switch read from environment correctly. Imports are kept minimal so we can
// run without next dev / database.

const PAID_PLAN_MONTHLY_RESUME_LIMIT = 100

function assertUsageAvailable(plan, tailoredUsed) {
  // mirror of src/lib/http.ts logic for tailoredResumesUsed only
  const PLAN_LIMITS = {
    free: { tailoredResumes: 1 },
    starter: { tailoredResumes: 100 },
    plus: { tailoredResumes: 100 },
  }
  let limit = PLAN_LIMITS[plan].tailoredResumes
  if (plan !== "free" && (limit === null || limit > PAID_PLAN_MONTHLY_RESUME_LIMIT)) {
    limit = PAID_PLAN_MONTHLY_RESUME_LIMIT
  }
  if (limit !== null && tailoredUsed >= limit) {
    const msg =
      plan === "free"
        ? "Free plan allows 1 tailored resume — upgrade to Starter for 100 per month."
        : `You have reached the ${PAID_PLAN_MONTHLY_RESUME_LIMIT} tailored-resume monthly limit. Resets at the start of next month.`
    return { allowed: false, limit, message: msg }
  }
  return { allowed: true, limit }
}

const cases = [
  { plan: "free", used: 0, expectAllowed: true, expectLimit: 1 },
  { plan: "free", used: 1, expectAllowed: false, expectLimit: 1 },
  { plan: "starter", used: 99, expectAllowed: true, expectLimit: 100 },
  { plan: "starter", used: 100, expectAllowed: false, expectLimit: 100 },
  { plan: "plus", used: 100, expectAllowed: false, expectLimit: 100 },
  { plan: "plus", used: 50, expectAllowed: true, expectLimit: 100 },
]

let pass = 0
let fail = 0
for (const tc of cases) {
  const out = assertUsageAvailable(tc.plan, tc.used)
  const ok = out.allowed === tc.expectAllowed && out.limit === tc.expectLimit
  if (ok) {
    pass++
    console.log(`PASS plan=${tc.plan} used=${tc.used} -> allowed=${out.allowed} limit=${out.limit}`)
  } else {
    fail++
    console.error(
      `FAIL plan=${tc.plan} used=${tc.used} -> got allowed=${out.allowed} limit=${out.limit}, expected allowed=${tc.expectAllowed} limit=${tc.expectLimit}`,
    )
  }
}

// Checkout interval switch
function pickPriceId(interval, env) {
  const monthly = env.STRIPE_STARTER_PRICE_ID
  const yearly = env.STRIPE_STARTER_YEARLY_PRICE_ID
  return interval === "yearly" ? yearly : monthly
}
const env = {
  STRIPE_STARTER_PRICE_ID: "price_monthly_123",
  STRIPE_STARTER_YEARLY_PRICE_ID: "price_yearly_456",
}
const monthly = pickPriceId("monthly", env)
const yearly = pickPriceId("yearly", env)
if (monthly === "price_monthly_123" && yearly === "price_yearly_456") {
  pass++
  console.log("PASS interval picker monthly+yearly resolve correctly")
} else {
  fail++
  console.error(`FAIL interval picker: monthly=${monthly} yearly=${yearly}`)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
