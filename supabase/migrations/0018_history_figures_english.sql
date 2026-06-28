-- Optional English-language fields for history figures. Admins fill these in
-- manually when they want a figure to appear in English on the public site;
-- when left blank, the public site falls back to the Mongolian fields.

alter table public.history_figures
  add column if not exists name_en text,
  add column if not exists role_en text,
  add column if not exists bio_en  text;
