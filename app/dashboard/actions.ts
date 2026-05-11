"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import { processDocument } from "@/lib/rag/parse"
import { describeLimit, getUserUsage } from "@/lib/billing/limits"

const MAX_BYTES = 25 * 1024 * 1024 // 25MB
const ACCEPTED_MIME = "application/pdf"

const FileSchema = z.instanceof(File).refine(
  (f) => f.size > 0 && f.size <= MAX_BYTES,
  { error: "File must be under 25MB." },
).refine(
  (f) => f.type === ACCEPTED_MIME || f.name.toLowerCase().endsWith(".pdf"),
  { error: "Only PDF files are supported." },
)

export type UploadResult =
  | { ok: true; documentId: string; filename: string }
  | { ok: false; error: string; limitReached?: "document_limit" }

export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const user = await requireUser()

  const file = formData.get("file")
  const parsed = FileSchema.safeParse(file)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file." }
  }

  const safeFile = parsed.data
  const supabase = await createClient()

  // Free-tier check.
  const usage = await getUserUsage(supabase, user.id)
  if (!usage.canUpload) {
    return {
      ok: false,
      error: describeLimit("document_limit", usage),
      limitReached: "document_limit",
    }
  }

  const id = randomUUID()
  const filePath = `${user.id}/${id}.pdf`
  const bytes = new Uint8Array(await safeFile.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, bytes, { contentType: "application/pdf", upsert: false })

  if (uploadError) {
    return { ok: false, error: `Storage upload failed: ${uploadError.message}` }
  }

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      id,
      user_id: user.id,
      filename: safeFile.name,
      file_path: filePath,
      file_size_bytes: safeFile.size,
      status: "pending",
    })
    .select("id, filename")
    .single()

  if (insertError || !doc) {
    // Roll back the storage upload so we don't leave orphaned bytes.
    await supabase.storage.from("documents").remove([filePath])
    return {
      ok: false,
      error: insertError?.message ?? "Failed to create document row.",
    }
  }

  // Kick off parsing AFTER the response is sent. The user gets a fast ACK;
  // the pipeline runs in the background and updates `documents.status`.
  after(async () => {
    await processDocument(doc.id)
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/documents")
  return { ok: true, documentId: doc.id, filename: doc.filename }
}

export async function reprocessDocument(documentId: string): Promise<UploadResult> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, filename, user_id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single()

  if (error || !doc) {
    return { ok: false, error: "Document not found." }
  }

  await supabase
    .from("documents")
    .update({ status: "pending", error_message: null })
    .eq("id", doc.id)

  after(async () => {
    await processDocument(doc.id)
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/documents")
  return { ok: true, documentId: doc.id, filename: doc.filename }
}

export async function deleteDocument(documentId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from("documents")
    .select("id, file_path")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single()

  if (!doc) return { ok: false, error: "Not found." }

  await supabase.storage.from("documents").remove([doc.file_path])
  // Cascade deletes pages/sections via FK.
  const { error } = await supabase.from("documents").delete().eq("id", doc.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/documents")
  return { ok: true }
}
