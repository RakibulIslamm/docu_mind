import { AppShell } from "@/components/site/app-shell"
import { requireUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import { getUserUsage, type Plan } from "@/lib/billing/limits"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  const supabase = await createClient()

  // Plan changes are infrequent; layouts cache so this stays fresh enough.
  // After a Stripe checkout, Stripe redirects with a full page load which
  // re-runs this.
  let plan: Plan = "free"
  try {
    const usage = await getUserUsage(supabase, user.id)
    plan = usage.plan
  } catch {
    // Treat as free on any failure — UI degrades gracefully.
  }

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <AppShell email={user.email} avatarUrl={avatarUrl} plan={plan}>
      {children}
    </AppShell>
  )
}
