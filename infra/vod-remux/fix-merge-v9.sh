#!/bin/bash
# EC2 user-data worker (v9): final salvage + merge.
#
# cam3/0111f3e5 (day-1 morning) has TWO narrow corrupt spots, mapped precisely
# by local byte-probing:
#   spot 1: ~8,738,014,797 (t~5770s)   clean resumes at moof 8,850,990,084 (t=5868)
#   spot 2: ~10.29-10.39 GB (t~6805s)  clean resumes at moof 10,393,945,955 (t=6860)
# Salvage = 3 pieces: A (ffmpeg -t 5700), B1 and B2 (byte-stitched init+range,
# normalize-remuxed). Total footage lost: < 4 minutes of 7.5 h.
# All probes validated locally with zero parse errors, incl. piped stdin reads.
#
# Env (injected by launch-v9.sh): AWS keys, SUPABASE_URL/SERVICE_KEY, EVENT_ID
set -u -o pipefail
export AWS_DEFAULT_REGION=ap-northeast-2
BUCKET=360record
LOG=/var/log/v9.log
exec >>"$LOG" 2>&1
echo "=== v9 final-salvage+merge start $(date -u) ==="

dnf install -y tar xz >/dev/null 2>&1 || true
if ! command -v ffmpeg >/dev/null; then
  curl -sL -o /tmp/ff.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  tar -xJf /tmp/ff.tar.xz -C /tmp
  cp /tmp/ffmpeg-*-static/ffmpeg /usr/local/bin/ffmpeg
fi
( while true; do aws s3 cp "$LOG" "s3://$BUCKET/wowza/_v4/log.txt" >/dev/null 2>&1; sleep 60; done ) &
SHIPPER=$!
finish() { aws s3 cp "$LOG" "s3://$BUCKET/wowza/_v4/log.txt"; kill "$SHIPPER" 2>/dev/null; }

HTTP_OPTS=(-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 15 -rw_timeout 30000000)

scan() { # $1=presigned url -> rc 0 if clean
  timeout 7200 ffmpeg -nostdin -loglevel error "${HTTP_OPTS[@]}" -i "$1" \
    -map 0:v:0 -map 0:a:0 -c copy -f mpegts - >/dev/null 2>/tmp/scan_err
}

VID=0111f3e5-7b04-4a23-92de-9fbcf8aff975
CAM=cam3
KEY="wowza/$EVENT_ID/$CAM/$VID.mp4"
INIT_END=1322
url=$(aws s3 presign "s3://$BUCKET/$KEY" --expires-in 43200)
FAILED=0

part_ok() { # $1=suffix $2=minbytes $3=maxbytes
  local sz purl
  sz=$(aws s3api head-object --bucket "$BUCKET" --key "wowza/$EVENT_ID/$CAM/$VID-$1.mp4" --query ContentLength --output text 2>/dev/null || echo 0)
  { [ "$sz" -lt "$2" ] || [ "$sz" -gt "$3" ]; } && return 1
  purl=$(aws s3 presign "s3://$BUCKET/wowza/$EVENT_ID/$CAM/$VID-$1.mp4" --expires-in 43200)
  scan "$purl"
}

# ---- Part A: 0..5700s (sequential stop before spot 1) ----
if part_ok a 5000000000 10000000000; then
  echo "[A] already verified — keep"
else
  echo "[A] build start $(date -u)"
  timeout 7200 ffmpeg -nostdin -loglevel error "${HTTP_OPTS[@]}" -i "$url" \
      -t 5700 -map 0:v:0 -map 0:a:0 -c copy \
      -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof - \
    | aws s3 cp - "s3://$BUCKET/wowza/$EVENT_ID/$CAM/$VID-a.mp4" --content-type video/mp4 --expected-size 10500000000
  if part_ok a 5000000000 10000000000; then echo "[A] built + verified"; else echo "[A] FAILED"; FAILED=1; fi
fi

# ---- Parts B1/B2: byte-stitched clean spans, timestamps rebased ----
build_span() { # $1=suffix $2=start_byte $3=end_byte("" = EOF) $4=min $5=max
  local sfx="$1" sb="$2" eb="$3" range
  if part_ok "$sfx" "$4" "$5"; then echo "[$sfx] already verified — keep"; return 0; fi
  [ -n "$eb" ] && range="$sb-$(( eb - 1 ))" || range="$sb-"
  echo "[$sfx] build start (bytes $range) $(date -u)"
  { curl -s --retry 4 -r "0-$INIT_END" "$url"; curl -s --retry 4 -r "$range" "$url"; } \
    | timeout 21600 ffmpeg -nostdin -loglevel error -i - \
        -map 0:v:0 -map 0:a:0 -c copy -avoid_negative_ts make_zero \
        -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof - \
    | aws s3 cp - "s3://$BUCKET/wowza/$EVENT_ID/$CAM/$VID-$sfx.mp4" --content-type video/mp4 --expected-size "$5"
  if part_ok "$sfx" "$4" "$5"; then echo "[$sfx] built + verified"; else echo "[$sfx] FAILED"; FAILED=1; fi
}
build_span b1 8850990084 10252574886 1200000000 1600000000
build_span b2 10393945955 "" 26000000000 32000000000

if [ "$FAILED" -ne 0 ]; then
  echo "=== v9 aborting before merge ==="
  finish; exit 1
fi
echo "=== all cam1-3 sources verified clean — merging $(date -u) ==="

# ---- Merge cam1-3 (cam4 already done) ----
# cam|total_dur_s|started_at|ended_at|seg:dur:label|...
CAMS='
cam1|64808|2026-07-11T02:25:25Z|2026-07-12T17:30:41Z|82bfe518-a161-4cfe-8116-6e005e9ae6ca:26385:1-р өдөр · Өглөө|24b6498e-bb7e-48af-bab1-245ea72e9ef1:9624:1-р өдөр · Орой|1bf997e2-cf5f-404c-ad84-32acc5c616a2:28799:2-р өдөр
cam2|63482|2026-07-11T02:47:16Z|2026-07-12T17:40:40Z|cda85274-f8d9-4b06-8f9a-e9df912e5682:25059:1-р өдөр · Өглөө|ce784663-4326-491f-87a8-eb11be248a02:9624:1-р өдөр · Орой|ff91a19d-6d12-40d4-9b81-3bf957eb02bd:28799:2-р өдөр
cam3|62290|2026-07-11T02:17:18Z|2026-07-12T17:40:27Z|0111f3e5-7b04-4a23-92de-9fbcf8aff975-a:5700:1-р өдөр · Өглөө|0111f3e5-7b04-4a23-92de-9fbcf8aff975-b1:936:1-р өдөр · Өглөө (үргэлжлэл)|0111f3e5-7b04-4a23-92de-9fbcf8aff975-b2:19997:1-р өдөр · Өглөө (үргэлжлэл)|192d26e2-a27c-4664-b76b-b58f66b25c4e:6856:2-р өдөр · Өглөө|045635ae-f3f8-4944-b00e-b99f2d667ae4:28801:2-р өдөр · Орой
'

while IFS='|' read -r cam total started ended s1 s2 s3x s4x s5x; do
  [ -z "$cam" ] && continue
  key="wowza/$EVENT_ID/$cam/merged.mp4"
  camnum=${cam#cam}
  src_sum=0
  for seg in "$s1" "$s2" "$s3x" "$s4x" "$s5x"; do
    [ -z "$seg" ] && continue
    vid="${seg%%:*}"
    sz=$(aws s3api head-object --bucket "$BUCKET" --key "wowza/$EVENT_ID/$cam/$vid.mp4" --query ContentLength --output text)
    src_sum=$(( src_sum + sz ))
  done

  merged_sz=$(aws s3api head-object --bucket "$BUCKET" --key "$key" --query ContentLength --output text 2>/dev/null || echo 0)
  if [ "$merged_sz" -ge $(( src_sum * 97 / 100 )) ] && [ "$merged_sz" -le $(( src_sum * 105 / 100 )) ]; then
    echo "[$cam] merged.mp4 already verified — skip concat"
  else
    echo "[$cam] merge start (sources $((src_sum/1000000000)) GB) $(date -u)"
    rm -f "/tmp/$cam.stage1fail"
    (
      off=0
      for seg in "$s1" "$s2" "$s3x" "$s4x" "$s5x"; do
        [ -z "$seg" ] && continue
        vid="${seg%%:*}"; rest="${seg#*:}"; dur="${rest%%:*}"
        surl=$(aws s3 presign "s3://$BUCKET/wowza/$EVENT_ID/$cam/$vid.mp4" --expires-in 43200)
        if ! timeout 14400 ffmpeg -nostdin -loglevel error "${HTTP_OPTS[@]}" -i "$surl" \
            -map 0:v:0 -map 0:a:0 -c copy -f mpegts -output_ts_offset "$off" - ; then
          touch "/tmp/$cam.stage1fail"; exit 1
        fi
        off=$(( off + dur ))
      done
    ) \
    | timeout 28800 ffmpeg -nostdin -loglevel error -f mpegts -i - \
        -map 0:v:0 -map 0:a:0 -c copy -bsf:a aac_adtstoasc \
        -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof - \
    | aws s3 cp - "s3://$BUCKET/$key" --content-type video/mp4 --expected-size $(( src_sum + src_sum / 10 ))
    rc=$?
    if [ "$rc" -ne 0 ] || [ -e "/tmp/$cam.stage1fail" ]; then
      echo "[$cam] MERGE PIPELINE FAILED rc=$rc"; FAILED=1; continue
    fi
    out_sz=$(aws s3api head-object --bucket "$BUCKET" --key "$key" --query ContentLength --output text 2>/dev/null || echo 0)
    if [ "$out_sz" -lt $(( src_sum * 97 / 100 )) ] || [ "$out_sz" -gt $(( src_sum * 105 / 100 )) ]; then
      echo "[$cam] SIZE VERIFY FAILED out=$out_sz expected≈$src_sum"; FAILED=1; continue
    fi
    echo "[$cam] merged verified ($((out_sz/1000000000)) GB) $(date -u)"
  fi

  chapters="["; acc=0; first=1
  for seg in "$s1" "$s2" "$s3x" "$s4x" "$s5x"; do
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

echo "=== v9 end FAILED=$FAILED $(date -u) ==="
finish
if [ "$FAILED" -eq 0 ]; then
  echo DONE > /tmp/done && aws s3 cp /tmp/done "s3://$BUCKET/wowza/_v4/DONE"
  aws s3 cp "$LOG" "s3://$BUCKET/wowza/_v4/log.txt"
  poweroff
fi
echo "leaving instance up for inspection"
