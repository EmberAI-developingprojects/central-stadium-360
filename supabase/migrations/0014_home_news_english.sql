-- Optional English-language fields for news articles. Admins fill these in
-- manually when they want an article to appear in English on the public site;
-- when left blank, the public site falls back to the Mongolian fields.

alter table public.home_news
  add column if not exists label_en text,
  add column if not exists title_en text,
  add column if not exists body_en  text;
