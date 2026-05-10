import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl, getProPriceId, getStripe } from "@/lib/billing/stripe"

export async function POST() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let stripe, priceId, appUrl
  try {
    stripe = getStripe()
    priceId = getProPriceId()
    appUrl = getAppUrl()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stripe not configured." },
      { status: 500 },
    )
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, email, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.plan === "pro") {
    return NextResponse.json(
      { error: "You're already on Pro. Use the customer portal to manage your subscription." },
      { status: 400 },
    )
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the customer if we've seen them before, otherwise let Stripe
      // create one keyed on email so the same person doesn't get duplicates.
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email: profile?.stripe_customer_id
        ? undefined
        : (profile?.email ?? user.email ?? undefined),
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${appUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 },
      )
    }
    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed."
    console.error("[stripe/checkout]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
