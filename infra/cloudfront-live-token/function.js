var crypto = require("crypto");

var SECRET = "__STREAM_TOKEN_SECRET__";

var TOKEN_RE = /^\/st\/(\d{10,})\/([0-9a-f]{64})(\/.+)$/;

function deny() {
  return {
    statusCode: 403,
    statusDescription: "Forbidden",
    headers: {
      "content-type": { value: "text/plain" },
      "cache-control": { value: "no-store" },
    },
    body: "Forbidden",
  };
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function handler(event) {
  var request = event.request;
  var match = TOKEN_RE.exec(request.uri);
  if (!match) return deny();

  var exp = parseInt(match[1], 10);
  var nowSeconds = Math.floor(Date.now() / 1000);
  if (!exp || nowSeconds > exp) return deny();

  var expected = crypto
    .createHmac("sha256", SECRET)
    .update(match[1])
    .digest("hex");
  if (!timingSafeEqualHex(expected, match[2])) return deny();

  request.uri = match[3];
  return request;
}
