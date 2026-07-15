-- YouTube-style chapters for merged multi-session recordings:
-- [{"t": 0, "label": "1-р өдөр · Өглөө"}, {"t": 26385, "label": "..."}]
-- t = seconds offset into the recording.
alter table public.recordings
  add column if not exists chapters jsonb;
