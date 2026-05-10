"use server"

import { z } from "zod"
import { requireUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"

const StartConversationSchema = z.object({
  documentIds: z.array(z.uuid()).min(1, "Pick at least one document."),
})

export type StartConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string }

export async function startConversation(
  documentIds: string[],
): Promise<StartConversationResult> {
  const parsed = StartConversationSchema.safeParse({ documentIds })
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid documents.",
    }
  }

  const user = await requireUser()
  const supabase = await createClient()

  // Make sure every document belongs to the user AND is ready.
  const { data: docs, error: docsErr } = await supabase
    .from("documents")
    .select("id, filename, status")
    .in("id", parsed.data.documentIds)
    .eq("user_id", user.id)
  if (docsErr) return { ok: false, error: docsErr.message }
  if (!docs || docs.length !== parsed.data.documentIds.length) {
    return { ok: false, error: "One or more documents are unavailable." }
  }
  const notReady = docs.filter((d) => d.status !== "ready")
  if (notReady.length > 0) {
    return {
      ok: false,
      error: `Still processing: ${notReady.map((d) => d.filename).join(", ")}`,
    }
  }

  const title =
    docs.length === 1
      ? docs[0].filename
      : `${docs[0].filename} +${docs.length - 1}`

  const { data: convo, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      document_ids: parsed.data.documentIds,
      title,
    })
    .select("id")
    .single()
  if (error || !convo) {
    return { ok: false, error: error?.message ?? "Failed to start chat." }
  }

  return { ok: true, conversationId: convo.id }
}
