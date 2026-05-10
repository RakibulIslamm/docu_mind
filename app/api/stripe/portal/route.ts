import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl, getStripe } from "@/lib/billing/stripe"

export async function POST() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let stripe, appUrl
  try {
    stripe = getStripe()
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
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Subscribe first." },
      { status: 400 },
    )
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Portal failed."
    console.error("[stripe/portal]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
