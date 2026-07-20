#!/bin/bash
# EC2 user-data worker (v11): package each camera's merged.mp4 into VOD HLS.
#
# Why: CloudFront caps a single response near 30 GB, so the 40-90 GB merged
# MP4s can never play as plain <video> sources. HLS = thousands of ~6 s
# fMP4 segments, each tiny → plays instantly, seeks precisely, and viewers
# only download what they watch (also slashes CDN usage). WatchVOD already
# has the hls.js path with a signed-query loader; the recordings row just
# needs master_playlist_path to point at hls/index.m3u8.
#
# Env (injected by launch-hls.sh): AWS keys, SUPABASE_URL/SERVICE_KEY, EVENT_ID
set -u -o pipefail
export AWS_DEFAULT_REGION=ap-northeast-2
BUCKET=360record
LOG=/var/log/hls.log
exec >>"$LOG" 2>&1
echo "=== v11 hls-package start $(date -u) ==="

dnf install -y tar xz >/dev/null 2>&1 || true
if ! command -v ffmpeg >/dev/null; then
  curl -sL -o /tmp/ff.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  tar -xJf /tmp/ff.tar.xz -C /tmp
  cp /tmp/ffmpeg-*-static/ffmpeg /usr/local/bin/ffmpeg
fi
( while true; do aws s3 cp "$LOG" "s3://$BUCKET/wowza/_hls/log.txt" >/dev/null 2>&1; sleep 60; done ) &
SHIPPER=$!
finish() { aws s3 cp "$LOG" "s3://$BUCKET/wowza/_hls/log.txt"; kill "$SHIPPER" 2>/dev/null; }

HTTP_OPTS=(-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 15 -rw_timeout 30000000)
FAILED=0

for cam in cam1 cam2 cam3 cam4; do
  src="wowza/$EVENT_ID/$cam/merged.mp4"
  dst="wowza/$EVENT_ID/$cam/hls"

  sz=$(aws s3api head-object --bucket "$BUCKET" --key "$src" --query ContentLength --output text 2>/dev/null || echo 0)
  if [ "$sz" -lt 10000000000 ]; then
    echo "[$cam] merged.mp4 missing/small ($sz) — SKIP (merge not done?)"; FAILED=1; continue
  fi

  if aws s3 ls "s3://$BUCKET/$dst/index.m3u8" >/dev/null 2>&1; then
    echo "[$cam] hls already packaged — skip ffmpeg"
  else
    workdir="/data/$cam"; rm -rf "$workdir"; mkdir -p "$workdir"
    url=$(aws s3 presign "s3://$BUCKET/$src" --expires-in 43200)
    echo "[$cam] packaging start ($((sz/1000000000)) GB) $(date -u)"
    if ! timeout 21600 ffmpeg -nostdin -loglevel error "${HTTP_OPTS[@]}" -i "$url" \
        -map 0:v:0 -map 0:a:0 -c copy \
        -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_type fmp4 \
        -hls_flags independent_segments \
        -hls_segment_filename "$workdir/seg_%06d.m4s" \
        "$workdir/index.m3u8"; then
      echo "[$cam] FFMPEG PACKAGING FAILED"; FAILED=1; rm -rf "$workdir"; continue
    fi
    nseg=$(ls "$workdir" | grep -c '\.m4s$')
    echo "[$cam] packaged: $nseg segments $(date -u), uploading..."
    aws s3 cp "$workdir" "s3://$BUCKET/$dst/" --recursive --exclude "*" --include "*.m4s" \
      --content-type video/iso.segment --only-show-errors
    aws s3 cp "$workdir/init.mp4" "s3://$BUCKET/$dst/init.mp4" --content-type video/mp4 --only-show-errors 2>/dev/null || true
    aws s3 cp "$workdir/index.m3u8" "s3://$BUCKET/$dst/index.m3u8" \
      --content-type application/vnd.apple.mpegurl --only-show-errors
    up=$(aws s3 ls "s3://$BUCKET/$dst/" | grep -c '\.m4s$')
    if [ "$up" -ne "$nseg" ]; then
      echo "[$cam] UPLOAD VERIFY FAILED ($up/$nseg segments)"; FAILED=1; rm -rf "$workdir"; continue
    fi
    echo "[$cam] uploaded $up/$nseg segments + playlist"
    rm -rf "$workdir"
  fi

  code=$(curl -s -o /tmp/patch_out -w "%{http_code}" -X PATCH \
    "$SUPABASE_URL/rest/v1/recordings?event_id=eq.$EVENT_ID&channel_arn=eq.wowza:merged:$cam" \
    -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"master_playlist_path\": \"$dst/index.m3u8\"}")
  if [ "$code" -ge 300 ]; then
    echo "[$cam] ROW PATCH FAILED http=$code $(cat /tmp/patch_out)"; FAILED=1; continue
  fi
  echo "[$cam] row now points at HLS"
done

echo "=== v11 end FAILED=$FAILED $(date -u) ==="
finish
if [ "$FAILED" -eq 0 ]; then
  echo DONE > /tmp/done && aws s3 cp /tmp/done "s3://$BUCKET/wowza/_hls/DONE"
  aws s3 cp "$LOG" "s3://$BUCKET/wowza/_hls/log.txt"
  poweroff
fi
echo "leaving instance up for inspection"
