import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";
import { listHistoryFigures } from "../../data/history";
import type { HistoryFigure } from "../../data/history";

export default function HistoryDetail() {
  useRevealOnScroll();
  const { id } = useParams<{ id: string }>();
  const [all, setAll] = useState<HistoryFigure[] | null>(null);

  useEffect(() => {
    listHistoryFigures().then(setAll);
  }, []);

  if (!all) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="py-24 text-center text-ink-soft">Уншиж байна…</div>
        <SiteFooter />
      </div>
    );
  }

  const figure = all.find((f) => f.id === id);

  if (!figure) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="max-w-screen-page mx-auto py-24 px-6 text-center">
          <h1 className="text-[28px] font-extrabold text-ink m-0 mb-3">
            Олдсонгүй
          </h1>
          <p className="text-ink-soft mb-6">
            Хүсэлт оруулсан түүхэн хүний мэдээлэл олдсонгүй.
          </p>
          <Link
            to="/history"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue text-white text-[13px] font-semibold no-underline hover:bg-brand-blue-soft transition-colors"
          >
            ← Түүхэн хэсэг рүү буцах
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const idx = all.findIndex((f) => f.id === figure.id);
  const others = all.filter((f) => f.id !== figure.id).slice(0, 3);
  const yearText = `${figure.yearStart}${
    figure.yearEnd ? ` — ${figure.yearEnd}` : " — одоо"
  }`;
  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <SiteHeader />

      <section className="relative w-full overflow-hidden bg-[#0b1130] text-white -mt-[64px] max-[920px]:-mt-[56px]">
        {figure.image && (
          <>
            <img
              src={figure.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center [filter:blur(48px)_saturate(1.3)_brightness(0.45)] scale-110"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,48,0.35)_0%,rgba(11,17,48,0.7)_100%)]" />
          </>
        )}

        <div className="relative max-w-screen-page mx-auto px-6 pt-32 pb-12 max-[920px]:pt-24 max-[920px]:pb-10 max-[640px]:px-5">
          <Link
            to="/history"
            className={`inline-flex items-center gap-2 text-white/85 text-[12.5px] font-semibold tracking-[0.12em] uppercase no-underline hover:text-white transition-colors mb-6 ${REVEAL_UP_CLS}`}
          >
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Түүхэн хэсэг
          </Link>

          <div
            className={`inline-flex items-center gap-2.5 mb-4 ${REVEAL_UP_CLS}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold-pale" />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-pale">
              {figure.role}
            </span>
          </div>

          <h1
            className={`m-0 text-white font-extrabold leading-[1.06] tracking-[-0.025em] text-[56px] max-[920px]:text-[40px] max-[640px]:text-[28px] max-w-[820px] drop-shadow-[0_2px_14px_rgba(0,0,0,0.4)] ${REVEAL_UP_CLS}`}
          >
            {figure.name}
          </h1>

          <div
            className={`mt-6 flex items-center gap-4 flex-wrap ${REVEAL_UP_CLS}`}
          >
            <div className="inline-flex items-center gap-3">
              <span className="w-8 h-px bg-gold-pale" />
              <span className="font-serif text-gold-pale text-[15px] tracking-[0.18em] [font-feature-settings:'lnum']">
                {yearText}
              </span>
            </div>
            {
              <>
                <span className="w-px h-4 bg-white/25 max-[640px]:hidden" />
              </>
            }
          </div>
        </div>
      </section>

      <section className="w-full bg-[#fafaf7] py-20 px-6 max-[920px]:py-12 max-[640px]:px-5">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid gap-16 [grid-template-columns:minmax(0,400px)_1fr] items-start max-[920px]:gap-10 max-[920px]:[grid-template-columns:1fr] max-[920px]:max-w-[640px] max-[920px]:mx-auto">
            <aside
              className={`max-[920px]:max-w-[420px] max-[920px]:mx-auto ${REVEAL_UP_CLS}`}
            >
              <div className="relative w-full bg-white rounded-[20px] overflow-hidden shadow-[0_18px_50px_-22px_rgba(11,17,48,0.32)] ring-1 ring-[#ecece5]">
                {figure.image ? (
                  <img
                    src={figure.image}
                    alt={figure.name}
                    className="block w-full h-auto object-contain"
                  />
                ) : (
                  <div className="aspect-[3/4] grid place-items-center text-zinc-300 bg-[linear-gradient(135deg,#f6f7f9_0%,#e6e8ee_100%)]">
                    <svg
                      width="100"
                      height="100"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="mt-7 px-1">
                <div className="grid grid-cols-2 gap-5 max-[640px]:gap-4">
                  <FactRow label="Албан тушаал" value={figure.role} />
                  <FactRow label="Удирдсан хугацаа" value={yearText} />
                </div>
              </div>
            </aside>

            <article
              className={`relative max-[920px]:px-0 ${REVEAL_UP_CLS}`}
              data-stagger="2"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-px bg-gold-from" />
                <span className="font-serif italic text-gold-from text-[14px] tracking-[0.04em]">
                  Намтар
                </span>
                <span className="flex-1 h-px bg-[#ecece5]" />
              </div>

              {figure.bio ? (
                <div className="text-ink text-[17px] leading-[1.8] tracking-[-0.005em] whitespace-pre-line max-[640px]:text-[15px] max-[640px]:leading-[1.72] [&_p]:m-0 [&_p+p]:mt-5 [&_p:first-child::first-letter]:text-[58px] [&_p:first-child::first-letter]:font-serif [&_p:first-child::first-letter]:font-bold [&_p:first-child::first-letter]:float-left [&_p:first-child::first-letter]:leading-[0.95] [&_p:first-child::first-letter]:mr-2.5 [&_p:first-child::first-letter]:mt-1 [&_p:first-child::first-letter]:text-brand-blue-darker max-[640px]:[&_p:first-child::first-letter]:text-[44px]">
                  {figure.bio.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 italic m-0 text-[15px]">
                  Намтрын мэдээлэл оруулагдаагүй байна.
                </p>
              )}

              <div
                className="mt-12 flex items-center justify-center gap-3 text-gold-from"
                aria-hidden="true"
              >
                <span className="h-px w-16 bg-gold-from/40" />
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="currentColor"
                >
                  <circle cx="5" cy="5" r="2" />
                </svg>
                <span className="h-px w-16 bg-gold-from/40" />
              </div>
            </article>
          </div>

          {others.length > 0 && (
            <div className="mt-24 max-[920px]:mt-16">
              <div className={`flex items-center gap-4 mb-8 ${REVEAL_UP_CLS}`}>
                <span className="w-10 h-px bg-ink/30" />
                <h2 className="m-0 font-serif italic text-ink text-[22px] tracking-[-0.01em] max-[640px]:text-[18px]">
                  Бусад түүхэн хүмүүс
                </h2>
                <span className="flex-1 h-px bg-[#ecece5]" />
              </div>

              <div className="grid gap-5 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[920px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[600px]:[grid-template-columns:1fr]">
                {others.map((o, i) => (
                  <OtherFigureCard key={o.id} figure={o} stagger={i + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold tracking-[0.16em] uppercase text-ink-soft mb-1.5">
        {label}
      </div>
      <div className="text-ink text-[14.5px] font-semibold">{value}</div>
    </div>
  );
}

function OtherFigureCard({
  figure,
  stagger,
}: {
  figure: HistoryFigure;
  stagger: number;
}) {
  const years = `${figure.yearStart}${
    figure.yearEnd ? ` — ${figure.yearEnd}` : " — одоо"
  }`;
  return (
    <Link
      to={`/history/${figure.id}`}
      data-stagger={stagger}
      className={`group relative block bg-white rounded-2xl overflow-hidden no-underline shadow-[0_2px_10px_rgba(31,41,55,0.05)] [transition:transform_.35s_cubic-bezier(.2,.8,.2,1),box-shadow_.35s_ease] hover:-translate-y-1 hover:shadow-[0_20px_44px_-20px_rgba(11,17,48,0.3)] ${REVEAL_UP_CLS}`}
    >
      <div className="relative w-full aspect-[4/5] bg-[#1a1f3a] overflow-hidden">
        {figure.image ? (
          <img
            src={figure.image}
            alt={figure.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-center [filter:saturate(0.92)] [transition:transform_.6s_cubic-bezier(.2,.8,.2,1),filter_.5s_ease] group-hover:scale-[1.05] group-hover:[filter:saturate(1)]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white/15 bg-[linear-gradient(135deg,#1a1f3a_0%,#131c7a_100%)]">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,48,0)_50%,rgba(11,17,48,0.85)_100%)]" />

        <div className="absolute left-4 right-4 bottom-4">
          <div className="font-serif text-gold-pale text-[11.5px] tracking-[0.16em] mb-1 [font-feature-settings:'lnum']">
            {years}
          </div>
          <div className="text-white text-[15px] font-bold leading-[1.25] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            {figure.name}
          </div>
        </div>
      </div>
      <div className="px-4 py-3.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-ink-soft">
          {figure.role}
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink-soft group-hover:text-brand-blue [transition:transform_.25s_ease,color_.2s_ease] group-hover:translate-x-1"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </Link>
  );
}
