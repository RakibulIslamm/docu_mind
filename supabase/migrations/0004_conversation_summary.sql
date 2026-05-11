-- Rolling-summary columns for the conversation context optimisation.
-- The server regenerates `rolling_summary` after each assistant turn and
-- prepends it to the system prompt on the next request, so input tokens
-- stay roughly constant instead of growing linearly with turn count.

alter table public.conversations
  add column if not exists rolling_summary text,
  add column if not exists summary_updated_at timestamptz,
  add column if not exists summary_turn_count integer not null default 0;
