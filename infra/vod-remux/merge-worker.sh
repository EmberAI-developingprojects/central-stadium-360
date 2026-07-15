#!/bin/bash
# EC2 user-data worker: concat each camera's session MP4s (already in S3) into
# one merged.mp4 per camera — stream-copy only, fully streaming via presigned
# URLs (no local video storage) — then upsert a single recordings row per cam
# with YouTube-style chapter offsets and delete the per-session rows.
#
# Log ships to s3://360record/wowza/_merge/log.txt; DONE marker on success;
# instance poweroff (launched with terminate-on-shutdown).
#
# Required env (injected by launch-merge.sh):
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
#   SUPABASE_URL / SUPABASE_SERVICE_KEY
#   EVENT_ID
set -u
export AWS_DEFAULT_REGION=ap-northeast-2
BUCKET=360record
LOG=/var/log/merge.log
exec >>"$LOG" 2>&1
echo "=== merge worker start $(date -u) ==="

dnf install -y tar xz >/dev/null 2>&1 || true
if ! command -v ffmpeg >/dev/null; then
  curl -sL -o /tmp/ff.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  tar -xJf /tmp/ff.tar.xz -C /tmp
  cp /tmp/ffmpeg-*-static/ffmpeg /usr/local/bin/ffmpeg
fi
( while true; do aws s3 cp "$LOG" "s3://$BUCKET/wowza/_merge/log.txt" >/dev/null 2>&1; sleep 60; done ) &

# cam|total_dur_s|started_at|ended_at|vid1:dur1:label1|vid2:dur2:label2|...
CAMS='
cam1|64808|2026-07-11T02:25:25Z|2026-07-12T17:30:41Z|82bfe518-a161-4cfe-8116-6e005e9ae6ca:26385:1-р өдөр · Өглөө|24b6498e-bb7e-48af-bab1-245ea72e9ef1:9624:1-р өдөр · Орой|1bf997e2-cf5f-404c-ad84-32acc5c616a2:28799:2-р өдөр
cam2|63482|2026-07-11T02:47:16Z|2026-07-12T17:40:40Z|cda85274-f8d9-4b06-8f9a-e9df912e5682:25059:1-р өдөр · Өглөө|ce784663-4326-491f-87a8-eb11be248a02:9624:1-р өдөр · Орой|ff91a19d-6d12-40d4-9b81-3bf957eb02bd:28799:2-р өдөр
cam3|62512|2026-07-11T02:17:18Z|2026-07-12T17:40:27Z|0111f3e5-7b04-4a23-92de-9fbcf8aff975:26855:1-р өдөр · Өглөө|192d26e2-a27c-4664-b76b-b58f66b25c4e:6856:2-р өдөр · Өглөө|045635ae-f3f8-4944-b00e-b99f2d667ae4:28801:2-р өдөр · Орой
cam4|42093|2026-07-11T06:03:06Z|2026-07-12T17:40:40Z|baaeb4b1-bf24-4838-987a-5243ed7af7a5:13294:1-р өдөр · Өглөө|7beed312-df9b-47dc-b5e1-5951b662b18e:28799:2-р өдөр
'

FAILED=0
while IFS='|' read -r cam total started ended s1 s2 s3x; do
  [ -z "$cam" ] && continue
  key="wowza/$EVENT_ID/$cam/merged.mp4"
  est=$(( total * 1830000 ))

  existing=$(aws s3api head-object --bucket "$BUCKET" --key "$key" --query ContentLength --output text 2>/dev/null || echo 0)
  if [ "$existing" -gt $(( est * 7 / 10 )) ]; then
    echo "[$cam] merged.mp4 already present ($existing bytes) — skip concat"
  else
    listfile="/tmp/$cam.ffconcat"
    echo "ffconcat version 1.0" > "$listfile"
    for seg in "$s1" "$s2" "$s3x"; do
      [ -z "$seg" ] && continue
      vid="${seg%%:*}"
      url=$(aws s3 presign "s3://$BUCKET/wowza/$EVENT_ID/$cam/$vid.mp4" --expires-in 43200)
      printf "file '%s'\n" "$url" >> "$listfile"
    done
    echo "[$cam] concat start ($total s, est $((est/1000000000)) GB) $(date -u)"
    if ! ffmpeg -nostdin -loglevel error -protocol_whitelist file,http,https,tcp,tls \
        -f concat -safe 0 -i "$listfile" -map 0:v:0 -map 0:a:0 -c copy \
        -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof - \
      | aws s3 cp - "s3://$BUCKET/$key" --expected-size "$est"; then
      echo "[$cam] CONCAT FAILED"; FAILED=1; continue
    fi
    echo "[$cam] upload done $(date -u)"
  fi

  # chapters json from cumulative offsets
  chapters="["; acc=0; first=1
  for seg in "$s1" "$s2" "$s3x"; do
    [ -z "$seg" ] && continue
    vid="${seg%%:*}"; rest="${seg#*:}"; dur="${rest%%:*}"; label="${rest#*:}"
    [ $first -eq 0 ] && chapters="$chapters,"
    chapters="$chapters{\"t\":$acc,\"label\":\"$label\"}"
    acc=$(( acc + dur )); first=0
  done
  chapters="$chapters]"
  camnum=${cam#cam}

  code=$(curl -s -o /tmp/up_out -w "%{http_code}" -X POST \
    "$SUPABASE_URL/rest/v1/recordings?on_conflict=event_id,channel_arn" \
    -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
    -d "{
      \"event_id\": \"$EVENT_ID\",
      \"camera_number\": $camnum,
      \"channel_arn\": \"wowza:merged:$cam\",
      \"s3_bucket\": \"$BUCKET\",
      \"s3_key_prefix\": \"wowza/$EVENT_ID/$cam\",
      \"master_playlist_path\": \"$key\",
      \"duration_seconds\": $total,
      \"recording_started_at\": \"$started\",
      \"recording_ended_at\": \"$ended\",
      \"status\": \"ready\",
      \"chapters\": $chapters
    }")
  if [ "$code" -ge 300 ]; then
    echo "[$cam] MERGED ROW UPSERT FAILED http=$code $(cat /tmp/up_out)"; FAILED=1; continue
  fi
  echo "[$cam] merged row upserted"

  # retire the per-session rows (keep only the merged one)
  del=$(curl -s -o /tmp/del_out -w "%{http_code}" -X DELETE \
    "$SUPABASE_URL/rest/v1/recordings?event_id=eq.$EVENT_ID&camera_number=eq.$camnum&channel_arn=like.wowza:$cam:*" \
    -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY")
  echo "[$cam] session rows deleted (http=$del)"
done <<< "$CAMS"

echo "=== merge worker end FAILED=$FAILED $(date -u) ==="
aws s3 cp "$LOG" "s3://$BUCKET/wowza/_merge/log.txt"
if [ "$FAILED" -eq 0 ]; then
  echo DONE > /tmp/done && aws s3 cp /tmp/done "s3://$BUCKET/wowza/_merge/DONE"
  aws s3 cp "$LOG" "s3://$BUCKET/wowza/_merge/log.txt"
  poweroff
fi
echo "leaving instance up for inspection"
