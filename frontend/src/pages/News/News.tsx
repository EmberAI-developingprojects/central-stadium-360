import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";
import { getHomeContent } from "../../data/store";
import type { NewsItem } from "../../data/store";
import { pickNewsLocale } from "../../lib/newsLocale";

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const da = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${da}/${mo}/${d.getFullYear()}`;
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function News() {
  useRevealOnScroll();
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    getHomeContent()
      .then((c) => {
        if (alive) setItems(c.news ?? []);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sorted = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || ""),
    );
  }, [items]);

  const loading = items === null;
  const isEmpty = !loading && sorted.length === 0;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader />

      <section className="relative w-full bg-[linear-gradient(180deg,#0b1130_0%,#131c7a_100%)] text-white pt-24 pb-16 px-6 max-[920px]:pt-20 max-[920px]:pb-12 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <h1
            className={`m-0 text-gold-pale font-extrabold uppercase leading-[1.1] tracking-[0.01em] text-[44px] max-[920px]:text-[32px] max-[640px]:text-[24px] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${REVEAL_UP_CLS}`}
          >
            {t("news_page_heading")}
          </h1>

          <nav
            className={`mt-5 text-[12px] uppercase tracking-[0.22em] text-white/80 flex items-center gap-3 ${REVEAL_UP_CLS}`}
            aria-label="breadcrumb"
            data-stagger="3"
          >
            <Link
              to="/"
              className="text-white/85 no-underline hover:text-gold-pale [transition:color_.2s_ease]"
            >
              Нүүр
            </Link>
            <span aria-hidden="true" className="text-white/40">
              /
            </span>
            <span className="text-white">{t("news_page_heading")}</span>
          </nav>
        </div>
      </section>

      <div
        aria-hidden="true"
        className="h-[3px] w-full bg-[linear-gradient(90deg,#A89968_0%,#E8DEC4_50%,#C9B888_100%)]"
      />

      <section className="w-full bg-[#fafaf7] py-16 px-6 max-[920px]:py-12 max-[920px]:px-5 flex-1">
        <div className="max-w-screen-page mx-auto">
          {loading && (
            <div className="text-center text-ink-soft text-[14px] py-20">
              Уншиж байна…
            </div>
          )}

          {isEmpty && (
            <div className="rounded-2xl border border-dashed border-[#e0e0e0] bg-white p-14 text-center text-[#999] text-[14px]">
              {t("news_empty")}
            </div>
          )}

          {!loading && sorted.length > 0 && (
            <ul
              className="list-none p-0 m-0 flex flex-col gap-7 max-[920px]:gap-5"
              aria-label={t("news_page_heading")}
            >
              {sorted.map((n, i) => {
                const loc = pickNewsLocale(n, i18n.language);
                return (
                <li
                  key={n.id}
                  className={REVEAL_UP_CLS}
                  data-stagger={(i % 4) + 1}
                >
                  <Link
                    to={`/news/${n.id}`}
                    aria-label={loc.title}
                    className="group block bg-white rounded-2xl overflow-hidden no-underline shadow-[0_2px_12px_rgba(31,41,55,0.06)] [transition:transform_.25s_ease,box-shadow_.3s_ease] hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-22px_rgba(11,17,48,0.28)]"
                  >
                    <div className="grid [grid-template-columns:minmax(0,5fr)_minmax(0,7fr)] gap-0 max-[720px]:grid-cols-1">
                      <div className="relative aspect-[5/3] bg-surface-1 overflow-hidden max-[720px]:aspect-[16/9]">
                        {n.image ? (
                          <img
                            src={n.image}
                            alt={loc.title}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover object-center [transition:transform_.6s_cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center text-[#bcbcc4]">
                            <svg
                              width="44"
                              height="44"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              aria-hidden="true"
                            >
                              <rect x="3" y="5" width="18" height="14" rx="2" />
                              <circle cx="9" cy="11" r="2" />
                              <path d="M21 17l-5-5-9 9" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-center gap-3 p-7 max-[920px]:p-5">
                        {n.createdAt && (
                          <div className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-soft [&_svg]:w-[14px] [&_svg]:h-[14px]">
                            <CalendarIcon />
                            <span>{fmtDate(n.createdAt)}</span>
                          </div>
                        )}
                        <h2 className="m-0 text-[20px] font-extrabold tracking-[-0.01em] leading-[1.35] text-ink max-[920px]:text-[17px] group-hover:text-brand-blue [transition:color_.2s_ease]">
                          {loc.title}
                        </h2>
                        <span className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand-blue [&_svg]:w-[13px] [&_svg]:h-[13px] group-hover:gap-2.5 [transition:gap_.2s_ease]">
                          {t("news_read_more")}
                          <ArrowRight />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
