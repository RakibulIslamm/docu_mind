import { redirect } from "next/navigation"
import { startConversation } from "../actions"
import { requireUser } from "@/lib/auth/dal"

type SearchParams = {
  documentId?: string | string[]
}

// Convenience entry: hitting /dashboard/chat/new?documentId=X starts a
// single-document chat and redirects to its conversation page.
export default async function NewChatRedirect({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireUser()
  const sp = await searchParams

  const documentIds = Array.isArray(sp.documentId)
    ? sp.documentId
    : sp.documentId
      ? [sp.documentId]
      : []

  if (documentIds.length === 0) {
    redirect("/dashboard")
  }

  const result = await startConversation(documentIds)
  if (!result.ok) {
    redirect(`/dashboard?error=${encodeURIComponent(result.error)}`)
  }
  redirect(`/dashboard/chat/${result.conversationId}`)
}
