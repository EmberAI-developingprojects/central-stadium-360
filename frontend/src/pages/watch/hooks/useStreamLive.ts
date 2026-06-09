import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

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
    const tick = async () => {
      const res = await api.getWatchStatus();
      if (!alive) return;
      if (res.ok) {
        setLive(res.data.live);
        setStartedAt(res.data.startedAt);
      } else {
        setLive(false);
        setStartedAt(null);
      }
      setChecked(true);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enabled]);
  return {
    streamLive: live,
    streamChecked: checked,
    streamStartedAt: startedAt,
  };
}
