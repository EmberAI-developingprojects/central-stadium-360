import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminScannedTicket, KioskEvent } from "@cs360/shared";
import { api } from "../../lib/api";
import { LoadingState } from "../components/Skeleton";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_DESKTOP_ONLY_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_MOBILE_CARD_CLS,
  ADMIN_MOBILE_CARD_HEAD_CLS,
  ADMIN_MOBILE_LABEL_CLS,
  ADMIN_MOBILE_LIST_CLS,
  ADMIN_MOBILE_ROW_CLS,
  ADMIN_MOBILE_VALUE_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
} from "../_adminStyles";

const PAGE_SIZE = 50;

function dateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

function friendlyWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  if (d.getTime() >= startOfToday.getTime()) return `Өнөөдөр ${time}`;
  if (d.getTime() >= startOfToday.getTime() - dayMs) return `Өчигдөр ${time}`;
  return dateTime(iso);
}

function errorText(code: string): string {
  if (code === "not_found") {
    return "Серверийн шинэ хувилбар байршуулаагүй байна — backend-ээ deploy хийсний дараа энэ жагсаалт ажиллана.";
  }
  if (code === "network_error") return "Сүлжээнд холбогдож чадсангүй.";
  if (code === "supabase_not_configured") return "Өгөгдлийн сан тохируулагдаагүй байна.";
  return code;
}

export default function ScannedTickets() {
  const [rows, setRows] = useState<AdminScannedTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [events, setEvents] = useState<KioskEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    api.admin.kiosk.listEvents().then((res) => {
      if (!alive) return;
      if (res.ok && Array.isArray(res.data)) setEvents(res.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    const req = ++reqRef.current;
    setLoading(true);
    setError("");
    const res = await api.admin.kiosk.scannedTickets({
      eventId: eventId || null,
      q: query,
      limit: PAGE_SIZE,
      offset: 0,
    });
    if (req !== reqRef.current) return;
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setRows([]);
      setTotal(0);
      return;
    }
    setRows(res.data.rows);
    setTotal(res.data.total);
  }, [eventId, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    const req = reqRef.current;
    setLoadingMore(true);
    const res = await api.admin.kiosk.scannedTickets({
      eventId: eventId || null,
      q: query,
      limit: PAGE_SIZE,
      offset: rows.length,
    });
    if (req !== reqRef.current) return;
    setLoadingMore(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRows((prev) => [...prev, ...res.data.rows]);
    setTotal(res.data.total);
  };

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Уншуулсан тасалбар</h2>
          <p>
            Хаалган дээр нэвтэрсэн бүх тасалбар — хамгийн сүүлд уншуулсан нь
            эхэндээ.
          </p>
        </div>
        <button
          type="button"
          className={ADMIN_BTN_CLS}
          onClick={() => void load()}
          disabled={loading}
        >
          Сэргээх
        </button>
      </div>

      <div className={ADMIN_FILTERS_CLS}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Тасалбарын кодоор хайх"
          aria-label="Тасалбарын кодоор хайх"
        />
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          aria-label="Арга хэмжээ"
        >
          <option value="">Бүх арга хэмжээ</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
        <span className="text-[12.5px] text-zinc-500 tabular-nums">
          Нийт {total.toLocaleString("en-US")}
        </span>
      </div>

      {error && (
        <div className={`${ADMIN_EMPTY_CLS} !border-red-200 !text-red-700`}>
          <strong>Уншиж чадсангүй</strong>
          {errorText(error)}
        </div>
      )}

      {loading && rows.length === 0 && !error ? (
        <LoadingState label="Уншуулсан тасалбаруудыг уншиж байна…" />
      ) : !error && rows.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Одоогоор уншуулсан тасалбар алга</strong>
          {query || eventId
            ? "Шүүлтүүрээ өөрчилж үзнэ үү."
            : "Хаалган дээр тасалбар уншуулмагц энд бүртгэгдэнэ."}
        </div>
      ) : (
        <>
          <div className={`${ADMIN_TABLE_WRAP_CLS} ${ADMIN_DESKTOP_ONLY_CLS}`}>
            <table className={ADMIN_TABLE_CLS}>
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Арга хэмжээ</th>
                  <th>Бүс</th>
                  <th>Нэвтэрсэн</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <td>
                      <code className="text-[12.5px] tracking-tight">
                        {r.code}
                      </code>
                    </td>
                    <td>{r.event_title ?? "—"}</td>
                    <td>{r.zone_name_mn ?? "—"}</td>
                    <td className="tabular-nums whitespace-nowrap">
                      {dateTime(r.used_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={ADMIN_MOBILE_LIST_CLS}>
            {rows.map((r) => (
              <div key={r.code} className={ADMIN_MOBILE_CARD_CLS}>
                <div className={ADMIN_MOBILE_CARD_HEAD_CLS}>
                  <code className="text-[13px] tracking-tight">{r.code}</code>
                  <span className="text-[12px] text-emerald-700 font-medium">
                    {friendlyWhen(r.used_at)}
                  </span>
                </div>
                <div className={ADMIN_MOBILE_ROW_CLS}>
                  <span className={ADMIN_MOBILE_LABEL_CLS}>Арга хэмжээ</span>
                  <span className={ADMIN_MOBILE_VALUE_CLS}>
                    {r.event_title ?? "—"}
                  </span>
                </div>
                <div className={ADMIN_MOBILE_ROW_CLS}>
                  <span className={ADMIN_MOBILE_LABEL_CLS}>Бүс</span>
                  <span className={ADMIN_MOBILE_VALUE_CLS}>
                    {r.zone_name_mn ?? "—"}
                  </span>
                </div>
                <div className={ADMIN_MOBILE_ROW_CLS}>
                  <span className={ADMIN_MOBILE_LABEL_CLS}>Нэвтэрсэн</span>
                  <span className={`${ADMIN_MOBILE_VALUE_CLS} tabular-nums`}>
                    {dateTime(r.used_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {rows.length < total && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore
                  ? "Уншиж байна…"
                  : `Цааш үзэх (${rows.length}/${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
