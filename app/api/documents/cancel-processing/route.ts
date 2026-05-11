import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/documents/cancel-processing
 *
 * Called via `navigator.sendBeacon` when the user closes the tab while a
 * document is still being parsed. Flips matching docs from pending/processing
 * to failed so the user can hit "Reprocess" later.
 *
 * Race-safe: the update is gated on `status IN ('pending', 'processing')`, so
 * if the server-side parser actually completes first the row is already
 * "ready" and this becomes a no-op. Conversely, if the parser later writes
 * "ready" after this beacon fires, that "ready" wins — also correct.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const ids =
    body &&
    typeof body === "object" &&
    "ids" in body &&
    Array.isArray((body as { ids: unknown }).ids)
      ? ((body as { ids: unknown[] }).ids.filter(
          (v): v is string => typeof v === "string" && v.length > 0,
        ) as string[])
      : []

  if (ids.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "failed",
      error_message:
        "Processing was interrupted (the page was closed). Click Reprocess to retry.",
    })
    .eq("user_id", user.id)
    .in("id", ids)
    .in("status", ["pending", "processing"])
    .select("id")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updated: data?.length ?? 0 })
}
