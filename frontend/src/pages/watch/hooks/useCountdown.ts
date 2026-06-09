import { useEffect, useState } from "react";

export function useCountdown(startTime: string | undefined) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const startMs = startTime ? new Date(startTime).getTime() : null;
  const isLive = startMs !== null ? now >= startMs : false;
  const totalSec =
    startMs !== null ? Math.max(0, Math.floor((startMs - now) / 1000)) : 0;
  return {
    now,
    isLive,
    hasTime: startMs !== null,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}
