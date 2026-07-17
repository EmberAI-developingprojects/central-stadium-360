#!/bin/bash
# EC2 user-data worker (v4): content-integrity scan of cam1-3 session MP4s,
# re-remux of the corrupt ones from the Wowza origin, then verified merge.
#
# Lessons baked in from v1-v3:
#   * size checks can't catch mid-file bitstream corruption → scan every source
#     with a full `-c copy` parse (fails exactly where a merge would fail)
#   * corrupt sources are re-fetched from Wowza (origin copies are intact) with
#     reconnect + read-timeout options, then re-scanned before use
#   * the background log shipper is killed explicitly — a bare `wait` on it
#     kept v3 from ever reaching poweroff
#   * merged output is size-verified before any recordings row is touched
#
# Env (injected by launch-v4.sh): AWS keys, SUPABASE_URL/SERVICE_KEY, EVENT_ID
set -u -o pipefail
export AWS_DEFAULT_REGION=ap-northeast-2
BUCKET=360record
LOG=/var/log/v4.log
exec >>"$LOG" 2>&1
echo "=== v4 scan-fix-merge start $(date -u) ==="

dnf install -y tar xz >/dev/null 2>&1 || true
if ! command -v ffmpeg >/dev/null; then
  curl -sL -o /tmp/ff.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  tar -xJf /tmp/ff.tar.xz -C /tmp
  cp /tmp/ffmpeg-*-static/ffmpeg /usr/local/bin/ffmpeg
fi
( while true; do aws s3 cp "$LOG" "s3://$BUCKET/wowza/_v4/log.txt" >/dev/null 2>&1; sleep 60; done ) &
SHIPPER=$!

HTTP_OPTS=(-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 15 -rw_timeout 30000000)

# vid|cam|dur_s|wowza_hls_url  (cam1-3 sessions; cam4 already verified+merged)
SESSIONS='
82bfe518-a161-4cfe-8116-6e005e9ae6ca|cam1|26385|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/82bfe518-a161-4cfe-8116-6e005e9ae6ca/playlist_1783763109816.m3u8
24b6498e-bb7e-48af-bab1-245ea72e9ef1|cam1|9624|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/24b6498e-bb7e-48af-bab1-245ea72e9ef1/playlist_1783789265800.m3u8
1bf997e2-cf5f-404c-ad84-32acc5c616a2|cam1|28799|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/1bf997e2-cf5f-404c-ad84-32acc5c616a2/playlist_1783877440694.m3u8
cda85274-f8d9-4b06-8f9a-e9df912e5682|cam2|25059|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/cda85274-f8d9-4b06-8f9a-e9df912e5682/playlist_1783763095111.m3u8
ce784663-4326-491f-87a8-eb11be248a02|cam2|9624|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/ce784663-4326-491f-87a8-eb11be248a02/playlist_1783789882437.m3u8
ff91a19d-6d12-40d4-9b81-3bf957eb02bd|cam2|28799|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/ff91a19d-6d12-40d4-9b81-3bf957eb02bd/playlist_1783878039776.m3u8
0111f3e5-7b04-4a23-92de-9fbcf8aff975|cam3|26855|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/0111f3e5-7b04-4a23-92de-9fbcf8aff975/playlist_1783763093250.m3u8
192d26e2-a27c-4664-b76b-b58f66b25c4e|cam3|6856|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/192d26e2-a27c-4664-b76b-b58f66b25c4e/playlist_1783831947906.m3u8
045635ae-f3f8-4944-b00e-b99f2d667ae4|cam3|28801|https://wv-cdn-00-00.wowza.com/23263631-ec3c-45c9-a51b-f3a0ceb1d064/cmaf/045635ae-f3f8-4944-b00e-b99f2d667ae4/playlist_1783878027418.m3u8
'

scan() { # $1=presigned url → rc 0 if clean
  ffmpeg -nostdin -loglevel error "${HTTP_OPTS[@]}" -i "$1" \
    -map 0:v:0 -map 0:a:0 -c copy -f null - 2>/tmp/scan_err
}

FAILED=0
# ---- Phase 1: scan every cam1-3 source; redo corrupt ones from Wowza ----
while IFS='|' read -r vid cam dur wurl; do
  [ -z "$vid" ] && continue
  key="wowza/$EVENT_ID/$cam/$vid.mp4"
  url=$(aws s3 presign "s3://$BUCKET/$key" --expires-in 43200)
  echo "[$cam/$vid] scan start $(date -u)"
  if scan "$url"; then
    echo "[$cam/$vid] scan CLEAN"
    continue
  fi
  echo "[$cam/$vid] scan CORRUPT ($(head -c 200 /tmp/scan_err | tr '\n' ' ')) — re-remux from Wowza"
  est=$(( dur * 1830000 ))
  if ! ffmpeg -nostdin -loglevel error "${HTTP_OPTS[@]}" -i "$wurl" \
      -map 0:v:0 -map 0:a:0 -c copy \
      -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof - \
    | aws s3 cp - "s3://$BUCKET/$key" --expected-size "$est"; then
    echo "[$cam/$vid] RE-REMUX FAILED"; FAILED=1; continue
  fi
  sz=$(aws s3api head-object --bucket "$BUCKET" --key "$key" --query ContentLength --output text 2>/dev/null || echo 0)
  low=$(( dur * 1470000 )); high=$(( dur * 1570000 ))
  if [ "$sz" -lt "$low" ] || [ "$sz" -gt "$high" ]; then
    echo "[$cam/$vid] RE-REMUX SIZE BAD ($sz not in $low..$high)"; FAILED=1; continue
  fi
  url=$(aws s3 presign "s3://$BUCKET/$key" --expires-in 43200)
  if scan "$url"; then
    echo "[$cam/$vid] re-remux verified CLEAN ($((sz/1000000000)) GB)"
  else
    echo "[$cam/$vid] STILL CORRUPT AFTER REDO — needs investigation"; FAILED=1
  fi
done <<< "$SESSIONS"

if [ "$FAILED" -ne 0 ]; then
  echo "=== v4 aborting before merge: source fixes failed ==="
  aws s3 cp "$LOG" "s3://$BUCKET/wowza/_v4/log.txt"
  kill "$SHIPPER" 2>/dev/null
  exit 1
fi
echo "=== all cam1-3 sources verified clean — merging $(date -u) ==="

# ---- Phase 2: merge cam1-3 (cam4 done in a previous run) ----
CAMS='
cam1|64808|2026-07-11T02:25:25Z|2026-07-12T17:30:41Z|82bfe518-a161-4cfe-8116-6e005e9ae6ca:26385:1-р өдөр · Өглөө|24b6498e-bb7e-48af-bab1-245ea72e9ef1:9624:1-р өдөр · Орой|1bf997e2-cf5f-404c-ad84-32acc5c616a2:28799:2-р өдөр
cam2|63482|2026-07-11T02:47:16Z|2026-07-12T17:40:40Z|cda85274-f8d9-4b06-8f9a-e9df912e5682:25059:1-р өдөр · Өглөө|ce784663-4326-491f-87a8-eb11be248a02:9624:1-р өдөр · Орой|ff91a19d-6d12-40d4-9b81-3bf957eb02bd:28799:2-р өдөр
cam3|62512|2026-07-11T02:17:18Z|2026-07-12T17:40:27Z|0111f3e5-7b04-4a23-92de-9fbcf8aff975:26855:1-р өдөр · Өглөө|192d26e2-a27c-4664-b76b-b58f66b25c4e:6856:2-р өдөр · Өглөө|045635ae-f3f8-4944-b00e-b99f2d667ae4:28801:2-р өдөр · Орой
'

while IFS='|' read -r cam total started ended s1 s2 s3x; do
  [ -z "$cam" ] && continue
  key="wowza/$EVENT_ID/$cam/merged.mp4"
  camnum=${cam#cam}
  src_sum=0
  for seg in "$s1" "$s2" "$s3x"; do
    [ -z "$seg" ] && continue
    vid="${seg%%:*}"
    sz=$(aws s3api head-object --bucket "$BUCKET" --key "wowza/$EVENT_ID/$cam/$vid.mp4" --query ContentLength --output text)
    src_sum=$(( src_sum + sz ))
  done

  echo "[$cam] merge start (sources $((src_sum/1000000000)) GB) $(date -u)"
  rm -f "/tmp/$cam.stage1fail"
  (
    off=0
    for seg in "$s1" "$s2" "$s3x"; do
      [ -z "$seg" ] && continue
      vid="${seg%%:*}"; rest="${seg#*:}"; dur="${rest%%:*}"
      url=$(aws s3 presign "s3://$BUCKET/wowza/$EVENT_ID/$cam/$vid.mp4" --expires-in 43200)
      if ! ffmpeg -nostdin -loglevel error "${HTTP_OPTS[@]}" -i "$url" \
          -map 0:v:0 -map 0:a:0 -c copy -f mpegts -output_ts_offset "$off" - ; then
        touch "/tmp/$cam.stage1fail"; exit 1
      fi
      off=$(( off + dur ))
    done
  ) \
  | ffmpeg -nostdin -loglevel error -f mpegts -i - \
      -map 0:v:0 -map 0:a:0 -c copy -bsf:a aac_adtstoasc \
      -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof - \
  | aws s3 cp - "s3://$BUCKET/$key" --expected-size $(( src_sum + src_sum / 10 ))
  rc=$?
  if [ "$rc" -ne 0 ] || [ -e "/tmp/$cam.stage1fail" ]; then
    echo "[$cam] MERGE PIPELINE FAILED rc=$rc"; FAILED=1; continue
  fi

  out_sz=$(aws s3api head-object --bucket "$BUCKET" --key "$key" --query ContentLength --output text 2>/dev/null || echo 0)
  if [ "$out_sz" -lt $(( src_sum * 97 / 100 )) ] || [ "$out_sz" -gt $(( src_sum * 105 / 100 )) ]; then
    echo "[$cam] SIZE VERIFY FAILED out=$out_sz expected≈$src_sum"; FAILED=1; continue
  fi
  echo "[$cam] merged verified ($((out_sz/1000000000)) GB) $(date -u)"

  chapters="["; acc=0; first=1
  for seg in "$s1" "$s2" "$s3x"; do
    [ -z "$seg" ] && continue
    vid="${seg%%:*}"; rest="${seg#*:}"; dur="${rest%%:*}"; label="${rest#*:}"
    [ $first -eq 0 ] && chapters="$chapters,"
    chapters="$chapters{\"t\":$acc,\"label\":\"$label\"}"
    acc=$(( acc + dur )); first=0
  done
  chapters="$chapters]"

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
    echo "[$cam] ROW UPSERT FAILED http=$code $(cat /tmp/up_out)"; FAILED=1; continue
  fi
  curl -s -o /dev/null -X DELETE \
    "$SUPABASE_URL/rest/v1/recordings?event_id=eq.$EVENT_ID&camera_number=eq.$camnum&channel_arn=like.wowza:$cam:*" \
    -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
  echo "[$cam] merged row upserted, session rows retired"
done <<< "$CAMS"

echo "=== v4 end FAILED=$FAILED $(date -u) ==="
aws s3 cp "$LOG" "s3://$BUCKET/wowza/_v4/log.txt"
kill "$SHIPPER" 2>/dev/null
if [ "$FAILED" -eq 0 ]; then
  echo DONE > /tmp/done && aws s3 cp /tmp/done "s3://$BUCKET/wowza/_v4/DONE"
  aws s3 cp "$LOG" "s3://$BUCKET/wowza/_v4/log.txt"
  poweroff
fi
echo "leaving instance up for inspection"
