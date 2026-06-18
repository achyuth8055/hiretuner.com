import { destroyCurrentSession } from "@/lib/auth"
import { jsonOk } from "@/lib/http"

export const runtime = "nodejs"

export async function POST() {
  await destroyCurrentSession()
  return jsonOk({ signedOut: true })
}
