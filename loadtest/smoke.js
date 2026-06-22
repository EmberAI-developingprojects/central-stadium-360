import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  for (const path of [
    "/api/health",
    "/api/content",
    "/api/events",
    "/api/events/archived",
  ]) {
    const r = http.get(`${BASE}${path}`);
    check(r, { [`${path} 2xx`]: (x) => x.status >= 200 && x.status < 300 });
    sleep(0.5);
  }
}
