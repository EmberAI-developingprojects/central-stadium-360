#!/bin/zsh
# Build the kiosk Flutter UI and copy it into kiosk_deploy/web, the bundle the
# box serves. The API base, kiosk key and id are baked in at build time from
# kiosk_deploy/backend/.env (never committed).
#
#   kiosk/build-web.sh                 # uses `flutter` on PATH
#   FLUTTER=~/sdk/flutter/bin/flutter kiosk/build-web.sh
#
# The deployed bundle was built with Flutter 3.44.4 (frontend/.metadata);
# another version builds fine but the output will not match byte for byte.
set -euo pipefail

HERE=${0:A:h}
ROOT=${HERE:h}
APP=$HERE/frontend
ENV_FILE=$ROOT/kiosk_deploy/backend/.env
OUT=$ROOT/kiosk_deploy/web
FLUTTER=${FLUTTER:-flutter}
WANT=3.44.4

[[ -f $ENV_FILE ]] || { print -u2 "missing $ENV_FILE (KIOSK_API_BASE, KIOSK_KEY, KIOSK_ID)"; exit 1; }
have=$($FLUTTER --version 2>/dev/null | awk 'NR==1{print $2}')
[[ $have == $WANT ]] || print -u2 "warning: Flutter $have, the box was built with $WANT"

defines=$(mktemp -t kiosk-defines).json
trap 'rm -f $defines' EXIT
python3 -I - "$ENV_FILE" "$defines" <<'PY'
import json, sys, pathlib
env = {}
for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
    line = line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    k, v = line.split('=', 1)
    env[k.strip()] = v.strip().strip('"').strip("'")
missing = [k for k in ('KIOSK_API_BASE', 'KIOSK_KEY') if not env.get(k)]
if missing:
    sys.exit('missing in .env: ' + ', '.join(missing))
pathlib.Path(sys.argv[2]).write_text(json.dumps({
    'KIOSK_API_BASE': env['KIOSK_API_BASE'],
    'KIOSK_KEY': env['KIOSK_KEY'],
    'KIOSK_ID': env.get('KIOSK_ID', 'gate-1'),
}))
print('api base:', env['KIOSK_API_BASE'], '| kiosk id:', env.get('KIOSK_ID', 'gate-1'))
PY

cd $APP
# web/ is generated (gitignored); recreate it on a fresh checkout.
[[ -f web/index.html ]] || $FLUTTER create . --platforms web --project-name stadium_kiosk >/dev/null
$FLUTTER build web --release --dart-define-from-file=$defines

rsync -a --delete --exclude .DS_Store build/web/ $OUT/
print "built into $OUT"
