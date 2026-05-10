import "server-only"

import Stripe from "stripe"

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Stripe routes are unavailable.",
    )
  }
  cached = new Stripe(secret, { typescript: true })
  return cached
}

export function getProPriceId(): string {
  const id = process.env.STRIPE_PRO_PRICE_ID
  if (!id) {
    throw new Error(
      "STRIPE_PRO_PRICE_ID is not configured. Create a recurring price in the Stripe dashboard and add it to .env.local.",
    )
  }
  return id
}

export function getWebhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET
  if (!s) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not configured. Run `stripe listen` and copy the whsec_… value.",
    )
  }
  return s
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

/**
 * Map a Stripe subscription status to our internal plan.
 * Active / trialing keep the user on Pro; anything else (past_due, canceled,
 * unpaid, incomplete_expired, incomplete) drops them back to Free so we
 * don't grant Pro features without payment.
 */
export function planFromSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "free" | "pro" {
  return status === "active" || status === "trialing" ? "pro" : "free"
}
