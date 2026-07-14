-- Multi-session recordings: a 2-day event produces several Wowza VOD assets
-- per camera (day-1 morning / day-1 evening / day-2), so the one-row-per-camera
-- constraint no longer holds. Import idempotency moves to the Wowza provenance
-- stamp stored in channel_arn ("wowza:<stream_id>:<video_id>").

alter table public.recordings
  drop constraint if exists recordings_event_id_camera_number_key;

-- Plain (non-partial) unique index so PostgREST `on_conflict=event_id,channel_arn`
-- upserts can target it; Postgres treats NULL channel_arn values as distinct,
-- so manually-added rows without provenance are unaffected.
create unique index if not exists recordings_event_channel_arn_key
  on public.recordings (event_id, channel_arn);
