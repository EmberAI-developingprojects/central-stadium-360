import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

const POLL_WAITING_MS = 30_000;
const POLL_LIVE_MS = 60_000;

export function useStreamLive(enabled: boolean) {
  const [live, setLive] = useState(false);
  const [checked, setChecked] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) {
      setLive(false);
      setChecked(false);
      setStartedAt(null);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (isLive: boolean) => {
      if (!alive) return;
      const next = isLive ? POLL_LIVE_MS : POLL_WAITING_MS;
      timer = setTimeout(tick, next);
    };

    const tick = async () => {
      if (!alive) return;
      const res = await api.getWatchStatus();
      if (!alive) return;
      const isLive = res.ok ? res.data.live : false;
      const newStart = res.ok ? res.data.startedAt : null;
      setLive(isLive);
      setStartedAt(newStart);
      setChecked(true);
      schedule(isLive);
    };

    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
  return {
    streamLive: live,
    streamChecked: checked,
    streamStartedAt: startedAt,
  };
}
