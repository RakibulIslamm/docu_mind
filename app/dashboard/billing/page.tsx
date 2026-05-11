import type { Metadata } from "next"
import { Check, Crown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ManageSubscriptionButton,
  StartCheckoutButton,
} from "@/components/dashboard/billing-actions"
import { requireUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import { getUserUsage } from "@/lib/billing/limits"

export const metadata: Metadata = { title: "Billing" }

const PRO_PERKS = [
  "Unlimited documents",
  "Unlimited questions per month",
  "Multi-document conversations",
  "Priority model latency",
  "Cancel anytime",
]

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const user = await requireUser()
  const supabase = await createClient()
  const usage = await getUserUsage(supabase, user.id)
  const sp = await searchParams
  const justSubscribed = sp.checkout === "success"
  const cancelled = sp.checkout === "cancelled"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Billing
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your DocuMind subscription.
        </p>

        {justSubscribed && (
          <div className="mt-6 flex items-start gap-3 border border-foreground/30 bg-foreground/5 px-4 py-3 text-sm">
            <Check className="mt-0.5 size-4 shrink-0" />
            <p>
              You&rsquo;re on Pro. Your subscription is active — refresh in a
              few seconds if your plan badge hasn&rsquo;t updated.
            </p>
          </div>
        )}
        {cancelled && (
          <div className="mt-6 border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            Checkout cancelled. No charges were made.
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-semibold tracking-tight">
                  $0
                </span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>
              <CardDescription className="mt-2">
                Try the agent on a few documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3 text-sm">
                <li className="flex items-center gap-3">
                  <Check className="size-4" />3 documents
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-4" />
                  50 questions per month
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-4" />
                  Single &amp; multi-document chats
                </li>
              </ul>
              {usage.plan === "free" && (
                <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <span className="size-1.5 bg-foreground" />
                  Current plan
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="ring-2 ring-foreground">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pro</CardTitle>
                <Badge>
                  <Crown className="size-3" />
                  Recommended
                </Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-semibold tracking-tight">
                  $29
                </span>
                <span className="text-sm text-muted-foreground">per month</span>
              </div>
              <CardDescription className="mt-2">
                For serious research and writing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3 text-sm">
                {PRO_PERKS.map((p) => (
                  <li key={p} className="flex items-center gap-3">
                    <Check className="size-4" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {usage.plan === "pro" ? (
                  <ManageSubscriptionButton className="w-full" />
                ) : (
                  <StartCheckoutButton size="lg" className="w-full" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Payments are processed securely by Stripe. We never see or store your
          card details.
        </p>
      </div>
    </div>
  )
}
