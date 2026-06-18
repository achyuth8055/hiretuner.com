// Pull the constants out of the live source file to confirm
// PAID_PLAN_MONTHLY_RESUME_LIMIT === 100 and PLAN_LIMITS line up.
import fs from "node:fs"
import path from "node:path"

const src = fs.readFileSync(
  path.join(process.cwd(), "src/lib/rolefit-types.ts"),
  "utf8",
)

const constMatch = src.match(/PAID_PLAN_MONTHLY_RESUME_LIMIT\s*=\s*(\d+)/)
if (!constMatch || constMatch[1] !== "100") {
  console.error("FAIL PAID_PLAN_MONTHLY_RESUME_LIMIT is not 100")
  process.exit(1)
}
console.log("PASS PAID_PLAN_MONTHLY_RESUME_LIMIT = 100")

const starterMatch = src.match(/starter:\s*{[^}]*tailoredResumes:\s*(\d+)/s)
const plusMatch = src.match(/plus:\s*{[^}]*tailoredResumes:\s*(\d+)/s)
if (!starterMatch || starterMatch[1] !== "100") {
  console.error("FAIL starter.tailoredResumes !== 100")
  process.exit(1)
}
if (!plusMatch || plusMatch[1] !== "100") {
  console.error("FAIL plus.tailoredResumes !== 100")
  process.exit(1)
}
console.log("PASS starter.tailoredResumes = 100")
console.log("PASS plus.tailoredResumes = 100")

// Check checkout reads STRIPE_STARTER_YEARLY_PRICE_ID
const checkoutSrc = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/billing/checkout/route.ts"),
  "utf8",
)
if (!checkoutSrc.includes("STRIPE_STARTER_YEARLY_PRICE_ID")) {
  console.error("FAIL checkout missing STRIPE_STARTER_YEARLY_PRICE_ID")
  process.exit(1)
}
if (!/interval[^}]*===\s*"yearly"/.test(checkoutSrc)) {
  console.error("FAIL checkout does not branch on interval=yearly")
  process.exit(1)
}
console.log("PASS checkout route picks yearly price id when interval=yearly")

// Pricing UI has yearly card
const homeSrc = fs.readFileSync(
  path.join(process.cwd(), "src/app/(marketing)/page.tsx"),
  "utf8",
)
if (!/Starter\s*[—\-(]+\s*Yearly/.test(homeSrc) || !homeSrc.includes("Upgrade Yearly")) {
  console.error("FAIL pricing UI missing yearly card")
  process.exit(1)
}
console.log("PASS pricing UI has yearly card")

// global-error.tsx exists
if (!fs.existsSync("src/app/global-error.tsx")) {
  console.error("FAIL global-error.tsx missing")
  process.exit(1)
}
console.log("PASS global-error.tsx exists")

console.log("\nAll checks passed.")
