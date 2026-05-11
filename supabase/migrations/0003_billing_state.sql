-- Extend profiles with full Stripe subscription state so the billing page,
-- webhook, and in-app cancel/resume all derive UX from the same source.
-- The webhook + billing page write via lib/stripe/subscription.ts →
-- extractSubscriptionState(), which sets these three columns.
alter table public.profiles
  add column if not exists subscription_status text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_end timestamptz;
