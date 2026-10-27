#!/bin/zsh
# Supabase → Cloud SQL cutover, one step at a time. Run the steps in order
# and check each one's output before moving on (see README.md):
#
#   CUTOVER_STAMP=2026-11-03 ./cutover.sh <step>
#
#   preflight  tools, auth, proxy and secrets are in place; records the
#              serving revision for rollback
#   freeze     MAINTENANCE_MODE=1 on the current (Supabase) backend
#   backup     final Supabase dump + storage, copied to GCS, row counts
#   restore    recreate the cs360 database from that dump and verify it
#              row for row, then add own-auth tables and GCS image URLs
#   deploy     new backend on Cloud SQL as a tagged, no-traffic revision
#   smoke      check the tagged revision against the frozen old one
#   go-live    send all traffic to the new revision
#   rollback   send traffic back to the revision recorded by preflight
#   unfreeze   (only if aborting before go-live) lift maintenance mode
set -euo pipefail

PROJECT=stadium360
REGION=asia-northeast1
SERVICE=cs360-backend
INSTANCE=stadium360:asia-northeast1:cs360-db
DB=cs360
BACKUP_BUCKET=gs://stadium360-db-backups
IMAGE_REPO=asia-northeast1-docker.pkg.dev/stadium360/cs360-backend/server
PROXY_PORT=6543
TAG=cutover

HERE=${0:A:h}
ROOT=${HERE:h:h}
STAMP=${CUTOVER_STAMP:?set CUTOVER_STAMP, e.g. CUTOVER_STAMP=2026-11-03}
WORK=$HOME/Documents/cs360-backups/cutover-$STAMP
export PATH=/opt/homebrew/opt/libpq/bin:$PATH

say() { print -P "%F{cyan}==>%f $*"; }
die() { print -P "%F{red}ERROR:%f $*" >&2; exit 1; }
secret() { gcloud secrets versions access latest --secret="$1" --project=$PROJECT; }
run_gcloud() { gcloud "$@" --project=$PROJECT; }
pgsql() {
  local db=$1; shift
  PGPASSWORD=$(secret cs360-db-postgres-password) \
    psql "host=127.0.0.1 port=$PROXY_PORT user=postgres dbname=$db sslmode=disable" -v ON_ERROR_STOP=1 "$@"
}
service_url() { run_gcloud run services describe $SERVICE --region=$REGION --format='value(status.url)'; }
tag_url() {
  run_gcloud run services describe $SERVICE --region=$REGION --format=json |
    python3 -I -c "import json,sys; t=[x for x in json.load(sys.stdin)['status'].get('traffic',[]) if x.get('tag')=='$TAG']; print(t[0]['url'] if t else '')"
}
# Rows of every public/auth COPY block in a dump, as "table<TAB>row", sorted.
# Supabase quotes table names ("auth"."users"), newer pg_dump does not.
dump_rows() {
  awk '/^COPY "?(public|auth)"?\./{t=$2; gsub(/"/,"",t); f=1; next} f&&/^\\\.$/{f=0; next} f{print t"\t"$0}' "$1" | sort
}

step_preflight() {
  for cmd in gcloud supabase psql pg_dump docker cloud-sql-proxy python3; do
    command -v $cmd >/dev/null || die "$cmd not found"
  done
  gcloud auth print-access-token >/dev/null 2>&1 || die "run: gcloud auth login me@ember.mn"
  docker info >/dev/null 2>&1 || die "start Docker (supabase db dump needs it)"
  pg_isready -h 127.0.0.1 -p $PROXY_PORT -q ||
    die "start the proxy: cloud-sql-proxy $INSTANCE --port $PROXY_PORT --gcloud-auth"
  for s in cs360-db-postgres-password auth-jwt-secret internal-api-secret; do
    secret $s >/dev/null || die "secret $s missing"
  done
  [[ $(git -C $ROOT rev-parse --abbrev-ref HEAD) == gcloud-migration ]] || die "check out the gcloud-migration branch"
  [[ -z $(git -C $ROOT status --porcelain -- backend shared) ]] || die "backend/shared have uncommitted changes"

  mkdir -p $WORK
  local serving
  serving=$(run_gcloud run services describe $SERVICE --region=$REGION --format='value(status.traffic[0].revisionName)')
  [[ -f $WORK/previous_revision ]] || print -r -- $serving > $WORK/previous_revision
  say "serving revision: $serving (rollback target: $(<$WORK/previous_revision))"
  local image
  image=$(run_gcloud run revisions describe $serving --region=$REGION --format='value(spec.containers[0].image)')
  say "serving image: $image"
  say "that image must already contain maintenance mode (branch cutover-freeze); see README step 0"
  say "preflight ok — work dir $WORK"
}

step_freeze() {
  [[ -f $WORK/previous_revision ]] || die "run preflight first"
  say "turning on MAINTENANCE_MODE on the current backend"
  run_gcloud run services update $SERVICE --region=$REGION --update-env-vars=MAINTENANCE_MODE=1 --quiet
  local url code
  url=$(service_url)
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$url/api/auth/login" -H 'content-type: application/json' -d '{}')
  [[ $code == 503 ]] || die "expected 503 from a write while frozen, got $code — is the maintenance code deployed?"
  say "frozen: writes now return 503. Wait ~10 minutes for in-flight QPay payments before backup."
}

step_backup() {
  mkdir -p $WORK/storage
  cd $ROOT
  say "dumping Supabase (schema, auth schema, data)"
  supabase db dump --linked -f $WORK/schema.sql
  supabase db dump --linked --schema auth -f $WORK/auth_schema.sql
  supabase db dump --linked --data-only --use-copy -f $WORK/data.sql
  say "downloading Supabase storage"
  supabase storage cp -r ss:///event-images $WORK/storage --linked --experimental >/dev/null
  say "copying any image GCS does not have yet"
  gcloud storage rsync $WORK/storage/event-images gs://stadium360-event-images \
    --cache-control="public, max-age=31536000, immutable" --project=$PROJECT
  (cd $WORK && shasum -a 256 *.sql > SHA256SUMS)
  dump_rows $WORK/data.sql | cut -f1 | uniq -c | awk '{print $2"\t"$1}' > $WORK/row_counts.txt
  say "uploading backup to $BACKUP_BUCKET/cutover-$STAMP"
  gcloud storage cp -r $WORK $BACKUP_BUCKET/cutover-$STAMP --project=$PROJECT >/dev/null
  say "backup done:"
  grep -E '^public\.' $WORK/row_counts.txt
}

step_restore() {
  [[ -f $WORK/data.sql ]] || die "run backup first"
  python3 -I $HERE/prep_restore.py $WORK
  print -n "This DROPS and recreates database $DB on Cloud SQL. Type the database name to continue: "
  read -r answer
  [[ "$answer" == "$DB" ]] || die "aborted"
  run_gcloud sql databases delete $DB --instance=${INSTANCE##*:} --quiet
  run_gcloud sql databases create $DB --instance=${INSTANCE##*:}
  say "restoring (one transaction)"
  local r=$WORK/restore
  pgsql $DB -q -1 -f $r/00_bootstrap.sql -f $r/01_auth_schema.sql -f $r/02_public_schema.sql \
    -f $r/03_data.sql -f $r/04_post_data.sql

  say "verifying every row against the dump"
  PGPASSWORD=$(secret cs360-db-postgres-password) pg_dump \
    "host=127.0.0.1 port=$PROXY_PORT user=postgres dbname=$DB sslmode=disable" \
    --data-only -n public -n auth > $WORK/cloudsql_data.sql
  if cmp -s <(dump_rows $r/03_data.sql) <(dump_rows $WORK/cloudsql_data.sql); then
    say "all $(dump_rows $r/03_data.sql | wc -l | tr -d ' ') rows identical"
  else
    die "row mismatch between dump and Cloud SQL — do not continue"
  fi

  say "own-auth tables and GCS image URLs"
  pgsql $DB -q -f $ROOT/supabase/migrations/0033_own_auth.sql
  pgsql $DB -f $HERE/rewrite_image_urls.sql
  local left
  left=$(PGPASSWORD=$(secret cs360-db-postgres-password) pg_dump \
    "host=127.0.0.1 port=$PROXY_PORT user=postgres dbname=$DB sslmode=disable" --data-only -n public |
    grep -c 'supabase.co/storage' || true)
  [[ $left == 0 ]] || die "$left Supabase storage URLs left"
  say "restore verified"
}

step_deploy() {
  cd $ROOT
  local sha image
  sha=$(git rev-parse --short HEAD)
  image=$IMAGE_REPO:$sha
  say "building $image"
  gcloud builds submit --config cloudbuild.yaml --substitutions=_TAG=$sha --project=$PROJECT
  say "deploying as tagged revision '$TAG' with no traffic"
  run_gcloud run deploy $SERVICE --region=$REGION --image=$image \
    --no-traffic --tag=$TAG \
    --add-cloudsql-instances=$INSTANCE \
    --max-instances=6 \
    --update-env-vars=PGHOST=/cloudsql/$INSTANCE,PGUSER=postgres,PGDATABASE=$DB,PG_POOL_MAX=3 \
    --remove-env-vars=MAINTENANCE_MODE \
    --update-secrets=PGPASSWORD=cs360-db-postgres-password:latest,AUTH_JWT_SECRET=auth-jwt-secret:latest,INTERNAL_API_SECRET=internal-api-secret:latest
  say "tagged URL: $(tag_url)"
}

step_smoke() {
  local new old
  new=$(tag_url)
  old=$(service_url)
  [[ -n $new ]] || die "no '$TAG' revision; run deploy"
  say "health"
  curl -sf $new/api/health >/dev/null || die "health failed"
  say "comparing public reads, new (Cloud SQL) vs old (frozen Supabase)"
  local p a b
  for p in /api/events /api/content /api/history; do
    a=$(curl -sf $old$p | sed 's#https://kbtjblklzurzgddflnaa.supabase.co/storage/v1/object/public/event-images/#IMG/#g; s#https:\\/\\/kbtjblklzurzgddflnaa.supabase.co\\/storage\\/v1\\/object\\/public\\/event-images\\/#IMG/#g')
    b=$(curl -sf $new$p | sed 's#https://storage.googleapis.com/stadium360-event-images/#IMG/#g; s#https:\\/\\/storage.googleapis.com\\/stadium360-event-images\\/#IMG/#g')
    [[ "$a" == "$b" ]] && say "  identical $p" || die "  $p differs"
  done
  say "auth wiring (expect 401s, not 5xx)"
  for p in /api/auth/me /api/tickets/my; do
    code=$(curl -s -o /dev/null -w '%{http_code}' $new$p)
    [[ $code == 401 ]] || die "$p returned $code"
  done
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST $new/api/auth/login -H 'content-type: application/json' \
    -d '{"identifier":"99999999","password":"not-a-real-password"}')
  [[ $code == 401 ]] || die "login with bad password returned $code"
  say "smoke ok. Now log in as an admin on $new from the frontend, or via curl, before go-live."
}

step_go_live() {
  local rev
  rev=$(run_gcloud run services describe $SERVICE --region=$REGION --format=json |
    python3 -I -c "import json,sys; t=[x for x in json.load(sys.stdin)['status']['traffic'] if x.get('tag')=='$TAG']; print(t[0]['revisionName'])")
  say "sending 100% of traffic to $rev"
  run_gcloud run services update-traffic $SERVICE --region=$REGION --to-revisions=$rev=100
  say "backend live on Cloud SQL. Next: merge gcloud-migration into main and push (Vercel deploys the frontend)."
}

step_rollback() {
  local prev
  prev=$(<$WORK/previous_revision)
  say "sending 100% of traffic back to $prev (Supabase)"
  run_gcloud run services update-traffic $SERVICE --region=$REGION --to-revisions=$prev=100
  say "backend back on Supabase. Revert the frontend too (Vercel: promote the previous deployment)."
  say "anything written on Cloud SQL after go-live is NOT in Supabase — copy it over by hand if needed."
}

step_unfreeze() {
  say "lifting MAINTENANCE_MODE on the current backend"
  run_gcloud run services update $SERVICE --region=$REGION --remove-env-vars=MAINTENANCE_MODE --quiet
}

case ${1:-} in
  preflight|freeze|backup|restore|deploy|smoke|rollback|unfreeze) step_$1 ;;
  go-live) step_go_live ;;
  *) sed -n '2,20p' $0; exit 1 ;;
esac
