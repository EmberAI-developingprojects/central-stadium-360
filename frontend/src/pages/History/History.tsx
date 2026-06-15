import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";
import { listHistoryFigures } from "../../data/history";
import type { HistoryFigure } from "../../data/history";

export default function History() {
  useRevealOnScroll();
  const [items, setItems] = useState<HistoryFigure[]>([]);

  useEffect(() => {
    listHistoryFigures().then(setItems);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="relative w-full bg-[linear-gradient(180deg,#0b1130_0%,#131c7a_100%)] text-white pt-24 pb-20 px-6 max-[920px]:pt-20 max-[920px]:pb-14">
        <div className="max-w-screen-page mx-auto text-center">
          <span
            className={`inline-block mb-4 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[11px] tracking-[0.18em] uppercase font-semibold text-white/90 ${REVEAL_UP_CLS}`}
          >
            1958 оноос хойш
          </span>
          <h1
            className={`m-0 text-gold-pale font-extrabold uppercase leading-[1.15] tracking-[0.01em] text-[44px] max-[920px]:text-[32px] max-[640px]:text-[24px] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${REVEAL_UP_CLS}`}
          >
            Түүхэн хэсэг
          </h1>
          <p
            className={`mt-5 mx-auto max-w-[640px] text-white/85 text-[15.5px] leading-[1.7] max-[640px]:text-[13.5px] ${REVEAL_UP_CLS}`}
          >
            Төв Цэнгэлдэх Хүрээлэнгийн түүхийг бүтээж байсан гүйцэтгэх захирлууд,
            үндэслэгчид болон зүтгэлтнүүдийн товч намтрууд.
          </p>
        </div>
      </section>

      <section className="w-full bg-[#fafaf7] py-20 px-6 max-[920px]:py-14 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          {items.length === 0 ? (
            <div className="text-center text-ink-soft text-[14px] py-20">
              Удахгүй мэдээлэл оруулагдана.
            </div>
          ) : (
            <div className="grid gap-8 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[920px]:gap-6 max-[920px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[600px]:[grid-template-columns:1fr]">
              {items.map((f, i) => (
                <Link
                  key={f.id}
                  to={`/history/${f.id}`}
                  data-stagger={i + 1}
                  className={`group relative block text-left bg-white rounded-[20px] overflow-hidden no-underline [transition:transform_.4s_cubic-bezier(.2,.8,.2,1),box-shadow_.4s_ease] shadow-[0_2px_12px_rgba(31,41,55,0.06)] hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-18px_rgba(11,17,48,0.35)] ${REVEAL_UP_CLS}`}
                >
                  <div className="relative w-full aspect-[4/5] bg-[#1a1f3a] overflow-hidden">
                    {f.image ? (
                      <img
                        src={f.image}
                        alt={f.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover object-center [transition:transform_.7s_cubic-bezier(.2,.8,.2,1),filter_.5s_ease] group-hover:scale-[1.06] [filter:saturate(0.9)] group-hover:[filter:saturate(1)]"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-white/20 bg-[linear-gradient(135deg,#1a1f3a_0%,#131c7a_100%)]">
                        <svg
                          width="84"
                          height="84"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21a8 8 0 0 1 16 0" />
                        </svg>
                      </div>
                    )}

                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,48,0)_45%,rgba(11,17,48,0.55)_80%,rgba(11,17,48,0.92)_100%)]"
                    />

                    <div className="absolute top-4 left-4 flex flex-col items-start gap-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-white text-[10px] font-semibold tracking-[0.14em] uppercase">
                        <span className="w-1 h-1 rounded-full bg-gold-pale" />
                        {f.role}
                      </div>
                    </div>

                    <div className="absolute left-5 right-5 bottom-5 max-[640px]:left-4 max-[640px]:right-4 max-[640px]:bottom-4">
                      <div className="font-serif text-gold-pale text-[13px] tracking-[0.18em] mb-1 [font-feature-settings:'lnum']">
                        {f.yearStart}
                        {f.yearEnd ? ` — ${f.yearEnd}` : " — ОДОО"}
                      </div>
                      <h3 className="m-0 text-white text-[22px] font-extrabold leading-[1.18] tracking-[-0.015em] drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] max-[640px]:text-[18px]">
                        {f.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-6 max-[640px]:p-5">
                    {f.bio ? (
                      <p className="m-0 text-ink-soft text-[13.5px] leading-[1.65] line-clamp-3 max-[640px]:text-[12.5px]">
                        {f.bio}
                      </p>
                    ) : (
                      <p className="m-0 text-zinc-400 italic text-[13px] leading-[1.6]">
                        Намтар оруулагдаагүй байна.
                      </p>
                    )}

                    <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-ink [transition:color_.2s_ease,gap_.25s_ease] group-hover:text-brand-blue group-hover:gap-3">
                      Намтар үзэх
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
