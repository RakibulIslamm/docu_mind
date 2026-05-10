-- Full-text search across a single document's pages, returning the top-N
-- ranked pages with a highlighted snippet around the match.
--
-- This is the backing function for the `search_document` agent tool.
-- We use ts_rank for relevance and ts_headline for the snippet.
-- security invoker so the call is gated by the document's own RLS policy.

create or replace function public.search_document_pages(
  p_document_id uuid,
  p_query text,
  p_limit int default 5
)
returns table (
  page_number int,
  rank real,
  snippet text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.page_number,
    ts_rank(p.content_tsv, q) as rank,
    ts_headline(
      'english',
      p.content,
      q,
      'StartSel=<<, StopSel=>>, MaxFragments=2, MaxWords=30, MinWords=10'
    ) as snippet
  from public.document_pages p,
       websearch_to_tsquery('english', p_query) as q
  where p.document_id = p_document_id
    and p.content_tsv @@ q
  order by rank desc, p.page_number asc
  limit greatest(1, least(p_limit, 20))
$$;

grant execute on function public.search_document_pages(uuid, text, int)
  to authenticated;
