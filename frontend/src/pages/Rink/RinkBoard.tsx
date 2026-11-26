import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RinkBoardRow } from "@cs360/shared";
import { api } from "../../lib/api";
import { minutesLabel, minutesLeft, ubClock } from "./format";

// Full-screen board for the rink's LED screen: every skater on the ice with
// their masked phone and the minutes left. Data refreshes every 10s; the
// minutes tick locally every second against the server's clock.

const REFRESH_MS = 10_000;
const WARNING_MINUTES = 5;

function rowTone(left: number): string {
  if (left < 0) return "bg-red-600 text-white";
  if (left <= WARNING_MINUTES) return "bg-amber-400 text-black";
  return "bg-white/[0.06] text-white";
}

export default function RinkBoard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RinkBoardRow[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [denied, setDenied] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [now, setNow] = useState(Date.now());
  const skewRef = useRef(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await api.scanner.board();
      if (!alive) return;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setDenied(true);
        else setOffline(true);
        return;
      }
      skewRef.current = new Date(res.data.server_time).getTime() - Date.now();
      setRows(res.data.rows);
      setOffline(false);
      setDenied(false);
    };
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearInterval(t);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  const serverNow = now + skewRef.current;
  const live = (rows ?? [])
    .map((r) => ({ ...r, left: minutesLeft(r.ends_at, serverNow) }))
    .sort((a, b) => a.left - b.left);
  const cols = live.length > 16 ? "grid-cols-3" : live.length > 6 ? "grid-cols-2" : "grid-cols-1";

  if (denied) {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center text-center p-8">
        <div>
          <p className="text-[28px] font-bold mb-6">Нэвтрэх шаардлагатай</p>
          <button type="button" onClick={() => navigate("/login?next=/scanner")} className="rounded-xl bg-white text-black font-semibold px-6 py-4 text-[18px]">
            Нэвтрэх
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col cursor-none select-none overflow-hidden">
      <header className="flex items-center gap-6 px-[3vw] py-[2vh]">
        <img src="/assets/images/brand/logo-white.png" alt="" className="h-[6vh] w-auto" />
        <h1 className="m-0 text-[4.5vh] font-extrabold tracking-tight">МӨСӨН ГУЛГУУР</h1>
        <div className="flex-1" />
        {offline && <span className="text-[2.2vh] text-amber-300">Холболт тасарсан — сүүлийн мэдээлэл</span>}
        <span className="text-[5vh] font-bold tabular-nums">{ubClock(new Date(serverNow).toISOString())}</span>
      </header>

      {rows === null ? (
        <div className="flex-1 grid place-items-center text-[3vh] text-white/40">Ачаалж байна…</div>
      ) : live.length === 0 ? (
        <div className="flex-1 grid place-items-center text-center">
          <div>
            <p className="m-0 text-[7vh] font-extrabold">Тавтай морилно уу</p>
            <p className="m-0 mt-[2vh] text-[3vh] text-white/50">Одоогоор гулгаж буй хүн алга</p>
          </div>
        </div>
      ) : (
        <main className={`flex-1 grid ${cols} gap-[1.2vh] px-[3vw] pb-[3vh] content-start`}>
          {live.map((r) => (
            <div
              key={`${r.phone_masked}-${r.ends_at}-${r.size}`}
              className={`${rowTone(r.left)} rounded-[1.2vh] px-[2vw] py-[1.4vh] flex items-center gap-[2vw]`}
            >
              <span className="text-[4.2vh] font-bold tabular-nums tracking-wide flex-1 whitespace-nowrap">
                {r.phone_masked}
              </span>
              <span className="text-[4.6vh] font-extrabold tabular-nums whitespace-nowrap">
                {minutesLabel(r.left)}
              </span>
            </div>
          ))}
        </main>
      )}

      <footer className="px-[3vw] pb-[2vh] flex items-center gap-[3vw] text-[2.2vh] text-white/50">
        <span><span className="inline-block w-[1.6vh] h-[1.6vh] rounded-sm bg-amber-400 mr-2 align-middle" />5 минутаас бага үлдсэн</span>
        <span><span className="inline-block w-[1.6vh] h-[1.6vh] rounded-sm bg-red-600 mr-2 align-middle" />Цаг хэтэрсэн — минут бүрт нэмэлт төлбөртэй</span>
        <div className="flex-1" />
        {!fullscreen && (
          <button
            type="button"
            onClick={() => void document.documentElement.requestFullscreen?.()}
            className="cursor-pointer rounded-lg bg-transparent border border-solid border-white/20 px-4 py-2 text-white/70"
          >
            Бүтэн дэлгэц
          </button>
        )}
      </footer>
    </div>
  );
}
