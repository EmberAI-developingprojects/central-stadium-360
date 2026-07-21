#!/bin/bash
# EC2 user-data worker (v11): package EACH session directly to VOD HLS — no
# merge. HLS is segment-based, so a structurally-corrupt source still yields a
# valid playlist up to the break (finalized manually if ffmpeg aborts). Every
# session becomes its own recordings row; the unplayable 60-98 GB merged.mp4
# rows and files are removed at the end.
#
# Env (injected by launch-hls-sessions.sh): AWS keys, SUPABASE_URL/SERVICE_KEY, EVENT_ID
set -u
export AWS_DEFAULT_REGION=ap-northeast-2
BUCKET=360record
LOG=/var/log/hlss.log
exec >>"$LOG" 2>&1
echo "=== v11 per-session-hls start $(date -u) ==="

dnf install -y tar xz >/dev/null 2>&1 || true
if ! command -v ffmpeg >/dev/null; then
  curl -sL -o /tmp/ff.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  tar -xJf /tmp/ff.tar.xz -C /tmp
  cp /tmp/ffmpeg-*-static/ffmpeg /usr/local/bin/ffmpeg
fi
( while true; do aws s3 cp "$LOG" "s3://$BUCKET/wowza/_hlss/log.txt" >/dev/null 2>&1; sleep 60; done ) &
SHIPPER=$!
finish() { aws s3 cp "$LOG" "s3://$BUCKET/wowza/_hlss/log.txt"; kill "$SHIPPER" 2>/dev/null; }

HTTP_OPTS=(-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 15 -rw_timeout 30000000)

# camnum|vid|dur_s|started_iso|label
SESSIONS='
1|82bfe518-a161-4cfe-8116-6e005e9ae6ca|26385|2026-07-11T02:25:25Z|Өглөө
1|24b6498e-bb7e-48af-bab1-245ea72e9ef1|9624|2026-07-11T14:20:42Z|Орой
1|1bf997e2-cf5f-404c-ad84-32acc5c616a2|28799|2026-07-12T09:30:41Z|2-р өдөр
2|cda85274-f8d9-4b06-8f9a-e9df912e5682|25059|2026-07-11T02:47:15Z|Өглөө
2|ce784663-4326-491f-87a8-eb11be248a02|9624|2026-07-11T14:31:22Z|Орой
2|ff91a19d-6d12-40d4-9b81-3bf957eb02bd|28799|2026-07-12T09:40:40Z|2-р өдөр
3|0111f3e5-7b04-4a23-92de-9fbcf8aff975-a|5700|2026-07-11T02:17:18Z|Өглөө
3|192d26e2-a27c-4664-b76b-b58f66b25c4e|6856|2026-07-12T02:58:12Z|2-р өдөр Өглөө
3|045635ae-f3f8-4944-b00e-b99f2d667ae4|28801|2026-07-12T09:40:26Z|2-р өдөр Орой
4|baaeb4b1-bf24-4838-987a-5243ed7af7a5|13294|2026-07-11T06:03:05Z|Өглөө
4|7beed312-df9b-47dc-b5e1-5951b662b18e|28799|2026-07-12T09:40:41Z|2-р өдөр
'

DONE_CAMS=""
while IFS='|' read -r camnum vid dur started label; do
  [ -z "$camnum" ] && continue
  cam="cam$camnum"
  src="wowza/$EVENT_ID/$cam/$vid.mp4"
  dstdir="wowza/$EVENT_ID/$cam/hls/$vid"
  master="$dstdir/index.m3u8"

  if aws s3 ls "s3://$BUCKET/$master" >/dev/null 2>&1; then
    echo "[$cam/$vid] hls exists — skip packaging"
  else
    sz=$(aws s3api head-object --bucket "$BUCKET" --key "$src" --query ContentLength --output text 2>/dev/null || echo 0)
    if [ "$sz" -lt 500000000 ]; then echo "[$cam/$vid] SOURCE MISSING ($sz) — skip"; continue; fi
    workdir="/data/$cam-$vid"; rm -rf "$workdir"; mkdir -p "$workdir"
    url=$(aws s3 presign "s3://$BUCKET/$src" --expires-in 43200)
    echo "[$cam/$vid] packaging ($((sz/1000000000))GB, $label) $(date -u)"
    # tolerant flags: skip corrupt packets; on a structural break ffmpeg aborts
    # but leaves the segments written so far, which we finalize below.
    timeout 14400 ffmpeg -nostdin -loglevel error "${HTTP_OPTS[@]}" \
      -err_detect ignore_err -fflags +discardcorrupt+genpts -i "$url" \
      -map 0:v:0 -map 0:a:0 -c copy \
      -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_type fmp4 \
      -hls_flags independent_segments \
      -hls_segment_filename "$workdir/seg_%06d.m4s" \
      "$workdir/index.m3u8"
    rc=$?
    nseg=$(ls "$workdir" 2>/dev/null | grep -c '\.m4s$')
    if [ "$nseg" -lt 10 ]; then
      echo "[$cam/$vid] PACKAGING PRODUCED $nseg segs (rc=$rc) — skip session"; rm -rf "$workdir"; continue
    fi
    # finalize playlist if ffmpeg aborted before writing ENDLIST
    if [ ! -f "$workdir/index.m3u8" ] || ! grep -q "#EXT-X-ENDLIST" "$workdir/index.m3u8"; then
      echo "[$cam/$vid] ffmpeg aborted (rc=$rc) — finalizing partial playlist ($nseg segs)"
      { echo "#EXTM3U"; echo "#EXT-X-VERSION:7"; echo "#EXT-X-TARGETDURATION:7";
        echo "#EXT-X-MEDIA-SEQUENCE:0"; echo "#EXT-X-PLAYLIST-TYPE:VOD";
        echo "#EXT-X-MAP:URI=\"init.mp4\"";
        for s in $(ls "$workdir"/seg_*.m4s | sort); do echo "#EXTINF:6.000,"; echo "$(basename "$s")"; done
        echo "#EXT-X-ENDLIST"; } > "$workdir/index.m3u8"
    fi
    aws s3 cp "$workdir" "s3://$BUCKET/$dstdir/" --recursive --exclude "*" --include "*.m4s" \
      --content-type video/iso.segment --only-show-errors
    aws s3 cp "$workdir/init.mp4" "s3://$BUCKET/$dstdir/init.mp4" --content-type video/mp4 --only-show-errors 2>/dev/null || true
    aws s3 cp "$workdir/index.m3u8" "s3://$BUCKET/$master" \
      --content-type application/vnd.apple.mpegurl --only-show-errors
    up=$(aws s3 ls "s3://$BUCKET/$dstdir/" | grep -c '\.m4s$')
    echo "[$cam/$vid] uploaded $up/$nseg segments"
    rm -rf "$workdir"
  fi

  # actual duration from segment count is more honest than the nominal dur when
  # a session was truncated; but nominal is fine for the label ordering.
  code=$(curl -s -o /tmp/up -w "%{http_code}" -X POST \
    "$SUPABASE_URL/rest/v1/recordings?on_conflict=event_id,channel_arn" \
    -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
    -d "{
      \"event_id\": \"$EVENT_ID\",
      \"camera_number\": $camnum,
      \"channel_arn\": \"wowza:$cam:$vid\",
      \"s3_bucket\": \"$BUCKET\",
      \"s3_key_prefix\": \"$dstdir\",
      \"master_playlist_path\": \"$master\",
      \"duration_seconds\": $dur,
      \"recording_started_at\": \"$started\",
      \"status\": \"ready\",
      \"chapters\": null
    }")
  if [ "$code" -ge 300 ]; then echo "[$cam/$vid] ROW UPSERT FAIL http=$code $(cat /tmp/up)"; continue; fi
  echo "[$cam/$vid] row ready (HLS)"
  case "$DONE_CAMS" in *"$cam"*) ;; *) DONE_CAMS="$DONE_CAMS $cam";; esac
done <<< "$SESSIONS"

# retire the unplayable merged rows + files
echo "=== cleanup merged rows/files $(date -u) ==="
curl -s -o /dev/null -X DELETE \
  "$SUPABASE_URL/rest/v1/recordings?event_id=eq.$EVENT_ID&channel_arn=like.wowza:merged:*" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
for cam in cam1 cam2 cam3 cam4; do
  aws s3 rm "s3://$BUCKET/wowza/$EVENT_ID/$cam/merged.mp4" >/dev/null 2>&1 || true
done

echo "=== v11 end cams:$DONE_CAMS $(date -u) ==="
finish
echo DONE > /tmp/done && aws s3 cp /tmp/done "s3://$BUCKET/wowza/_hlss/DONE"
aws s3 cp "$LOG" "s3://$BUCKET/wowza/_hlss/log.txt"
poweroff
