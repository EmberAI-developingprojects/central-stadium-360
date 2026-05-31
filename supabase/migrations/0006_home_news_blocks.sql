-- Add structured content blocks to home_news for the detail page renderer.
-- Each row in `blocks` is one of:
--   { "type": "text",  "value": "<paragraph text>" }
--   { "type": "image", "value": "<image url>" }
-- Order in the array == render order on the detail page.

alter table public.home_news
  add column if not exists blocks jsonb not null default '[]'::jsonb;
