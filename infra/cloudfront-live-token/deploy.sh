
set -euo pipefail

FUNCTION_NAME="cs360-live-stream-token"
DISTRIBUTIONS=(E1X9CZCFSW6I21 E1LSNK2AS1BP57 E2OAR07QS17UXP ECPNAVHEAC033) # cam1..cam4
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "${1:-}" == "--from-env" ]]; then
  STREAM_TOKEN_SECRET="$(grep '^STREAM_TOKEN_SECRET=' "$REPO_ROOT/backend/.env" | cut -d= -f2)"
fi
if [[ -z "${STREAM_TOKEN_SECRET:-}" ]]; then
  echo "ERROR: STREAM_TOKEN_SECRET is not set (pass env var or use --from-env)" >&2
  exit 1
fi

RENDERED="$(mktemp)"
trap 'rm -f "$RENDERED"' EXIT
sed "s/__STREAM_TOKEN_SECRET__/${STREAM_TOKEN_SECRET}/" "$SCRIPT_DIR/function.js" > "$RENDERED"

# --- create or update the function ------------------------------------------
if aws cloudfront describe-function --name "$FUNCTION_NAME" >/dev/null 2>&1; then
  ETAG="$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query ETag --output text)"
  aws cloudfront update-function \
    --name "$FUNCTION_NAME" \
    --if-match "$ETAG" \
    --function-config "Comment=Validate /st/<exp>/<sig>/ live HLS tokens,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$RENDERED" >/dev/null
  echo "updated function $FUNCTION_NAME"
else
  aws cloudfront create-function \
    --name "$FUNCTION_NAME" \
    --function-config "Comment=Validate /st/<exp>/<sig>/ live HLS tokens,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$RENDERED" >/dev/null
  echo "created function $FUNCTION_NAME"
fi

ETAG="$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query ETag --output text)"
aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG" >/dev/null
FUNCTION_ARN="$(aws cloudfront describe-function --name "$FUNCTION_NAME" --stage LIVE --query FunctionSummary.FunctionMetadata.FunctionARN --output text)"
echo "published: $FUNCTION_ARN"

# --- associate viewer-request on each live distribution ----------------------
for DIST_ID in "${DISTRIBUTIONS[@]}"; do
  CFG_FILE="$(mktemp)"
  aws cloudfront get-distribution-config --id "$DIST_ID" > "$CFG_FILE"
  DIST_ETAG="$(python3 -c "import json;print(json.load(open('$CFG_FILE'))['ETag'])")"
  python3 - "$CFG_FILE" "$FUNCTION_ARN" <<'PY'
import json, sys
path, arn = sys.argv[1], sys.argv[2]
doc = json.load(open(path))
cfg = doc["DistributionConfig"]
assoc = {"Quantity": 1, "Items": [{"FunctionARN": arn, "EventType": "viewer-request"}]}
# The token gate must cover EVERY behavior — the cam distributions route
# *.m3u8 and *.ts through their own cache behaviors, not the default one.
cfg["DefaultCacheBehavior"]["FunctionAssociations"] = assoc
for behavior in cfg.get("CacheBehaviors", {}).get("Items", []):
    behavior["FunctionAssociations"] = assoc
json.dump(cfg, open(path, "w"))
PY
  aws cloudfront update-distribution \
    --id "$DIST_ID" \
    --if-match "$DIST_ETAG" \
    --distribution-config "file://$CFG_FILE" \
    --query "Distribution.Status" --output text
  rm -f "$CFG_FILE"
  echo "associated on $DIST_ID"
done

echo "done — allow a few minutes for distribution deploys to finish."
