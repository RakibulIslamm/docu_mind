import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export const FREE_DOC_LIMIT = 2
export const PRO_DOC_LIMIT = 10
export const FREE_QUESTIONS_PER_MONTH = 10
export const PRO_QUESTIONS_PER_MONTH = 20

export type Plan = "free" | "pro"

export type Usage = {
  plan: Plan
  documentCount: number
  questionsThisMonth: number
  documentLimit: number
  questionLimit: number
  documentsRemaining: number | null // null = unlimited
  questionsRemaining: number | null
  canUpload: boolean
  canAsk: boolean
}

function proUsage(documentCount: number, questionsThisMonth: number): Usage {
  const documentsRemaining = Math.max(0, PRO_DOC_LIMIT - documentCount)
  const questionsRemaining = Math.max(0, PRO_QUESTIONS_PER_MONTH - questionsThisMonth)
  return {
    plan: "pro",
    documentCount,
    questionsThisMonth,
    documentLimit: PRO_DOC_LIMIT,
    questionLimit: PRO_QUESTIONS_PER_MONTH,
    documentsRemaining,
    questionsRemaining,
    canUpload: documentsRemaining > 0,
    canAsk: questionsRemaining > 0,
  }
}

function startOfMonthISO(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * Compute current usage for a user. Counts documents owned and the number of
 * user-role messages this calendar month (UTC). Tolerant: if a query fails,
 * we assume the limit is hit so we don't accidentally let a user past the
 * paywall (false-positive on free; honest about limits).
 */
export async function getUserUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<Usage> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle()

  const plan: Plan = profile?.plan === "pro" ? "pro" : "free"
  if (plan === "pro") {
    const monthStart = startOfMonthISO()
    const [{ count: docCount }, { count: questionCount }] = await Promise.all([
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("messages")
        .select("id, conversations!inner(user_id)", { count: "exact", head: true })
        .eq("role", "user")
        .gte("created_at", monthStart)
        .eq("conversations.user_id", userId),
    ])
    return proUsage(docCount ?? 0, questionCount ?? 0)
  }

  const monthStart = startOfMonthISO()

  const [{ count: docCount }, { count: questionCount }] = await Promise.all([
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    // Count user messages whose conversation belongs to this user, this month.
    supabase
      .from("messages")
      .select("id, conversations!inner(user_id)", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", monthStart)
      .eq("conversations.user_id", userId),
  ])

  const documentCount = docCount ?? 0
  const questionsThisMonth = questionCount ?? 0
  const documentsRemaining = Math.max(0, FREE_DOC_LIMIT - documentCount)
  const questionsRemaining = Math.max(
    0,
    FREE_QUESTIONS_PER_MONTH - questionsThisMonth,
  )

  return {
    plan,
    documentCount,
    questionsThisMonth,
    documentLimit: FREE_DOC_LIMIT,
    questionLimit: FREE_QUESTIONS_PER_MONTH,
    documentsRemaining,
    questionsRemaining,
    canUpload: documentsRemaining > 0,
    canAsk: questionsRemaining > 0,
  }
}

export type LimitReason = "document_limit" | "question_limit"

export function describeLimit(reason: LimitReason, usage: Usage): string {
  if (reason === "document_limit") {
    if (usage.plan === "pro") {
      return `Pro plan is capped at ${usage.documentLimit} documents. Delete one to upload more.`
    }
    return `Free plan is capped at ${usage.documentLimit} documents. Delete one or upgrade to Pro for up to ${PRO_DOC_LIMIT}.`
  }
  if (usage.plan === "pro") {
    return `Pro plan is capped at ${usage.questionLimit} questions per month (used ${usage.questionsThisMonth}).`
  }
  return `Free plan is capped at ${usage.questionLimit} questions per month (used ${usage.questionsThisMonth}). Upgrade to Pro for up to ${PRO_QUESTIONS_PER_MONTH}.`
}
