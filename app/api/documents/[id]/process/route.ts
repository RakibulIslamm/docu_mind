import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import { processDocument } from "@/lib/rag/parse"

// Manual reprocess endpoint. Authenticated users can re-trigger parsing
// for any of their own documents (e.g. after a 'failed' status).
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const result = await processDocument(id)
  return NextResponse.json(result)
}

// Lightweight status poll. The dashboard can hit this every few seconds
// while a doc is processing — RLS ensures a user only sees their own.
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("documents")
    .select("id, status, total_pages, error_message")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(data)
}
