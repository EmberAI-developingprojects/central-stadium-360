#!/bin/bash
# EC2 user-data worker: remux Wowza 4K CMAF/HLS VOD assets into fragmented MP4s
# streamed straight into s3://360record/wowza/<event>/<cam>/<video_id>.mp4,
# then upsert the matching public.recordings row via Supabase REST.
#
# Fully streaming (no local video storage). -c copy only — no re-encode.
# Progress log is synced to s3://360record/wowza/_remux/log.txt every 60s so it
# can be watched from outside. On completion writes _remux/DONE and powers off
# (instance launched with --instance-initiated-shutdown-behavior terminate).
#
# Required env (injected above this script in the final user-data):
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  – S3 writer
#   SUPABASE_URL / SUPABASE_SERVICE_KEY        – recordings row upsert
#   EVENT_ID                                   – target event uuid
set -u
export AWS_DEFAULT_REGION=ap-northeast-2
BUCKET=360record
LOG=/var/log/remux.log
exec >>"$LOG" 2>&1

echo "=== remux worker start $(date -u) ==="

# --- tooling: static ffmpeg + jq (AL2023 has aws cli v2 preinstalled) ---
dnf install -y jq tar xz >/dev/null 2>&1 || true
if ! command -v ffmpeg >/dev/null; then
  curl -sL -o /tmp/ff.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  tar -xJf /tmp/ff.tar.xz -C /tmp
  cp /tmp/ffmpeg-*-static/ffmpeg /usr/local/bin/ffmpeg
fi
ffmpeg -version | head -1

# --- background log shipper ---
( while true; do aws s3 cp "$LOG" "s3://$BUCKET/wowza/_remux/log.txt" >/dev/null 2>&1; sleep 60; done ) &

# cam|video_id|duration_ms|created_at|hls_url
JOBS='
cam1|82bfe518-a161-4cfe-8116-6e005e9ae6ca|26385099|2026-07-11T09:45:10+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/82bfe518-a161-4cfe-8116-6e005e9ae6ca/playlist_1783763109816.m3u8
cam1|24b6498e-bb7e-48af-bab1-245ea72e9ef1|9624000|2026-07-11T17:01:06+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/24b6498e-bb7e-48af-bab1-245ea72e9ef1/playlist_1783789265800.m3u8
cam1|1bf997e2-cf5f-404c-ad84-32acc5c616a2|28799333|2026-07-12T17:30:41+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/1bf997e2-cf5f-404c-ad84-32acc5c616a2/playlist_1783877440694.m3u8
cam2|cda85274-f8d9-4b06-8f9a-e9df912e5682|25059998|2026-07-11T09:44:55+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/cda85274-f8d9-4b06-8f9a-e9df912e5682/playlist_1783763095111.m3u8
cam2|ce784663-4326-491f-87a8-eb11be248a02|9624000|2026-07-11T17:11:22+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/ce784663-4326-491f-87a8-eb11be248a02/playlist_1783789882437.m3u8
cam2|ff91a19d-6d12-40d4-9b81-3bf957eb02bd|28799966|2026-07-12T17:40:40+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/ff91a19d-6d12-40d4-9b81-3bf957eb02bd/playlist_1783878039776.m3u8
cam3|0111f3e5-7b04-4a23-92de-9fbcf8aff975|26855301|2026-07-11T09:44:53+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/0111f3e5-7b04-4a23-92de-9fbcf8aff975/playlist_1783763093250.m3u8
cam3|192d26e2-a27c-4664-b76b-b58f66b25c4e|6856000|2026-07-12T04:52:28+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/192d26e2-a27c-4664-b76b-b58f66b25c4e/playlist_1783831947906.m3u8
cam3|045635ae-f3f8-4944-b00e-b99f2d667ae4|28801200|2026-07-12T17:40:27+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/045635ae-f3f8-4944-b00e-b99f2d667ae4/playlist_1783878027418.m3u8
cam4|baaeb4b1-bf24-4838-987a-5243ed7af7a5|13294633|2026-07-11T09:44:40+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/baaeb4b1-bf24-4838-987a-5243ed7af7a5/playlist_1783763079716.m3u8
cam4|7beed312-df9b-47dc-b5e1-5951b662b18e|28799133|2026-07-12T17:40:40+0000|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/7beed312-df9b-47dc-b5e1-5951b662b18e/playlist_1783878040464.m3u8
'

FAIL=0
process_job() {
  local cam="$1" vid="$2" dur_ms="$3" created="$4" url="$5"
  local key="wowza/$EVENT_ID/$cam/$vid.mp4"
  local dur_s=$(( dur_ms / 1000 ))
  # ~12.2 Mbps A/V + 20% headroom for the multipart size hint
  local est_bytes=$(( dur_s * 1830000 ))

  local existing
  existing=$(aws s3api head-object --bucket "$BUCKET" --key "$key" --query ContentLength --output text 2>/dev/null || echo 0)
  if [ "$existing" -gt 1000000000 ]; then
    echo "[$cam/$vid] already in S3 ($existing bytes) — skip upload"
  else
    echo "[$cam/$vid] remux start ($dur_s s, est $((est_bytes/1000000000)) GB) $(date -u)"
    if ! ffmpeg -nostdin -loglevel error -i "$url" \
        -map 0:v:0 -map 0:a:0 -c copy \
        -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof - \
      | aws s3 cp - "s3://$BUCKET/$key" --expected-size "$est_bytes"; then
      echo "[$cam/$vid] FAILED"
      return 1
    fi
    echo "[$cam/$vid] upload done $(date -u)"
  fi

  # recording_started_at = created_at - duration
  local created_epoch started_iso ended_iso camnum
  created_epoch=$(date -u -d "${created/+0000/Z}" +%s)
  started_iso=$(date -u -d "@$((created_epoch - dur_s))" +%Y-%m-%dT%H:%M:%SZ)
  ended_iso=$(date -u -d "@$created_epoch" +%Y-%m-%dT%H:%M:%SZ)
  camnum=${cam#cam}

  local code
  code=$(curl -s -o /tmp/upsert_out -w "%{http_code}" -X POST \
    "$SUPABASE_URL/rest/v1/recordings?on_conflict=event_id,channel_arn" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "{
      \"event_id\": \"$EVENT_ID\",
      \"camera_number\": $camnum,
      \"channel_arn\": \"wowza:$cam:$vid\",
      \"s3_bucket\": \"$BUCKET\",
      \"s3_key_prefix\": \"wowza/$EVENT_ID/$cam\",
      \"master_playlist_path\": \"$key\",
      \"duration_seconds\": $dur_s,
      \"recording_started_at\": \"$started_iso\",
      \"recording_ended_at\": \"$ended_iso\",
      \"status\": \"ready\"
    }")
  if [ "$code" -ge 300 ]; then
    echo "[$cam/$vid] ROW UPSERT FAILED http=$code $(cat /tmp/upsert_out)"
    return 1
  fi
  echo "[$cam/$vid] row upserted"
}

# Two parallel workers (network-bound) — odd lines to worker A, even to worker B.
run_queue() {
  local parity="$1"
  local n=0
  while IFS='|' read -r cam vid dur created url; do
    [ -z "$cam" ] && continue
    n=$((n + 1))
    [ $((n % 2)) -ne "$parity" ] && continue
    process_job "$cam" "$vid" "$dur" "$created" "$url" || echo "$cam/$vid" >> /tmp/failures
  done <<< "$JOBS"
}
run_queue 1 & run_queue 0 &
wait

echo "=== all jobs attempted $(date -u) ==="
if [ -s /tmp/failures ]; then
  echo "SOME JOBS FAILED — leaving instance running for inspection"
  aws s3 cp "$LOG" "s3://$BUCKET/wowza/_remux/log.txt"
  exit 1
fi
echo DONE > /tmp/done && aws s3 cp /tmp/done "s3://$BUCKET/wowza/_remux/DONE"
aws s3 cp "$LOG" "s3://$BUCKET/wowza/_remux/log.txt"
poweroff
