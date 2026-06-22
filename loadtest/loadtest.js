import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    live_arrival: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 500 },
        { duration: "1m", target: 2500 },
        { duration: "2m", target: 5000 },
        { duration: "2m", target: 5000 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1200", "p(99)<2500"],
    "http_req_duration{endpoint:health}": ["p(95)<200"],
    "http_req_duration{endpoint:content}": ["p(95)<1500"],
    "http_req_duration{endpoint:events}": ["p(95)<1000"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(95)", "p(99)", "max"],
};

function get(path, tag) {
  const res = http.get(`${BASE}${path}`, {
    tags: { endpoint: tag },
    timeout: "30s",
  });
  check(res, {
    [`${tag}: 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  return res;
}

export default function () {
  group("landing", () => {
    get("/api/health", "health");
    sleep(0.2);
    get("/api/content", "content");
  });

  sleep(1 + Math.random() * 2);

  group("browse_events", () => {
    get("/api/events", "events");
    sleep(0.5 + Math.random());
    get("/api/events/archived", "archived");
  });

  sleep(2 + Math.random() * 3);
}
