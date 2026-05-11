-- Track whether an assistant message ended because the user pressed Stop
-- mid-stream. The chat route reads this on the next turn so the agent can
-- be instructed to resume rather than restart from its standard PROCESS.

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS stopped BOOLEAN NOT NULL DEFAULT false;
