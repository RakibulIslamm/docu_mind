import { NextResponse } from "next/server"
import type Stripe from "stripe"
import {
  getStripe,
  getWebhookSecret,
  planFromSubscriptionStatus,
} from "@/lib/billing/stripe"
import { createServiceClient } from "@/lib/supabase/server"

// Stripe webhooks must read the raw request body to verify the signature.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  let stripe: Stripe
  let secret: string
  try {
    stripe = getStripe()
    secret = getWebhookSecret()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stripe not configured." },
      { status: 500 },
    )
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bad signature"
    console.error("[stripe/webhook] signature verification failed:", msg)
    return NextResponse.json({ error: `Bad signature: ${msg}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId =
          (session.metadata?.user_id as string | undefined) ??
          (session.client_reference_id as string | undefined)
        if (!userId) {
          console.warn("[stripe/webhook] checkout.session.completed without user_id")
          break
        }
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? null)
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null)

        await supabase
          .from("profiles")
          .update({
            plan: "pro",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", userId)
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription
        const userId = await resolveUserId(supabase, sub)
        if (!userId) break
        await supabase
          .from("profiles")
          .update({
            plan: planFromSubscriptionStatus(sub.status),
            stripe_customer_id:
              typeof sub.customer === "string" ? sub.customer : sub.customer.id,
            stripe_subscription_id: sub.id,
          })
          .eq("id", userId)
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const userId = await resolveUserId(supabase, sub)
        if (!userId) break
        await supabase
          .from("profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
          })
          .eq("id", userId)
        break
      }

      default:
        // Ignore other events.
        break
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Handler failed"
    console.error(`[stripe/webhook] ${event.type} handler failed:`, msg)
    // Returning 500 makes Stripe retry. Only do that for transient errors —
    // for malformed events, prefer to log and 200.
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function resolveUserId(
  supabase: ReturnType<typeof createServiceClient>,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const metaUser = sub.metadata?.user_id
  if (metaUser) return metaUser

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()
  return data?.id ?? null
}
