import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";
import { listHistoryFigures } from "../../data/history";
import type { HistoryFigure } from "../../data/history";
import { pickHistoryLocale } from "../../lib/historyLocale";

const HERO_BG = "/assets/images/stadium/huuchin.jpg";
const DIRECTOR_PHOTO =
  "https://cdn.greensoft.mn/uploads/users/45/images/21(21).jpg";

export default function AboutIntro() {
  useRevealOnScroll();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const id = window.setTimeout(
      () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
    return () => window.clearTimeout(id);
  }, [location.hash]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />

      <IntroSection />

      <div className="relative w-full bg-[linear-gradient(180deg,#f4f6fc_0%,#eef1fa_100%)]">
        <AchievementsSection />
        <DirectorSection />
        <HistoryJourneySection />
      </div>

      <SiteFooter />
    </div>
  );
}

function IntroSection() {
  const { t } = useTranslation();
  return (
    <section className="relative w-full text-white overflow-hidden -mt-[64px] max-[920px]:-mt-[56px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-center bg-cover scale-[1.05] [filter:blur(2px)_grayscale(.3)_brightness(.55)]"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,48,0.78)_0%,rgba(19,28,122,0.85)_55%,rgba(11,17,48,0.92)_100%)]"
      />

      <div className="relative max-w-[1200px] mx-auto px-6 pt-24 pb-32 max-[1200px]:pt-20 max-[1200px]:pb-24 max-[920px]:pt-20 max-[920px]:pb-20 max-[640px]:pb-16 max-[640px]:px-5">
        <div className="text-center">
          <div
            className={`inline-flex items-center justify-center gap-3 mb-5 ${REVEAL_UP_CLS}`}
          >
            <span className="h-px w-10 bg-gold-pale/60" />
            <span className="text-[12px] tracking-[0.3em] font-semibold text-gold-pale">
              {t("about_intro_label")}
            </span>
            <span className="h-px w-10 bg-gold-pale/60" />
          </div>

          <h1
            className={`m-0 text-white font-extrabold uppercase leading-[1.05] tracking-[0.02em] text-[52px] max-[1200px]:text-[44px] max-[920px]:text-[36px] max-[640px]:text-[26px] drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] ${REVEAL_UP_CLS}`}
          >
            {t("about_intro_title")}
          </h1>

          <div
            className={`mt-4 mx-auto h-px w-24 bg-white/40 ${REVEAL_UP_CLS}`}
            aria-hidden="true"
          />

          <p
            className={`mt-8 mx-auto max-w-[960px] uppercase text-white text-[14.5px] font-semibold leading-[1.65] tracking-[0.02em] max-[1200px]:text-[13.5px] max-[920px]:text-[12.5px] max-[640px]:text-[11.5px] ${REVEAL_UP_CLS}`}
          >
            {t("about_intro_lead")}
          </p>

          <p
            className={`mt-6 mx-auto max-w-[980px] text-white/85 text-[14px] leading-[1.75] max-[1200px]:text-[13px] max-[920px]:text-[12.5px] max-[640px]:text-[12px] ${REVEAL_UP_CLS}`}
          >
            {t("about_intro_body")}
          </p>
        </div>

        <div
          className={`mt-10 max-w-[960px] mx-auto h-px bg-white/15 ${REVEAL_UP_CLS}`}
          aria-hidden="true"
        />

        <div className="mt-9 grid gap-10 [grid-template-columns:1fr_1fr] max-[760px]:[grid-template-columns:1fr] max-[760px]:gap-8">
          <ValueBlock
            icon={<EyeIcon />}
            title={t("about_vision_title")}
            text={t("about_vision_text")}
            stagger={1}
          />
          <ValueBlock
            icon={<MountainIcon />}
            title={t("about_mission_title")}
            text={t("about_mission_text")}
            stagger={2}
          />
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href="#director"
            aria-label={t("about_continue")}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/40 text-white/85 hover:bg-white/10 hover:border-white transition-colors no-underline"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

function ValueBlock({
  icon,
  title,
  text,
  stagger,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  stagger: number;
}) {
  return (
    <div
      data-stagger={stagger}
      className={`text-center px-2 ${REVEAL_UP_CLS}`}
    >
      <div className="inline-flex items-center justify-center text-gold-pale mb-3">
        {icon}
      </div>
      <h3 className="m-0 mb-2.5 text-gold-pale font-bold uppercase tracking-[0.18em] text-[13px] max-[640px]:text-[12px]">
        {title}
      </h3>
      <p className="m-0 mx-auto max-w-[440px] text-white/85 text-[13.5px] leading-[1.65] max-[920px]:text-[13px] max-[640px]:text-[12.5px]">
        {text}
      </p>
    </div>
  );
}

function AchievementsSection() {
  const { t } = useTranslation();
  const items = [1, 2, 3] as const;
  return (
    <section className="relative w-full px-6 pt-20 pb-14 max-[920px]:pt-14 max-[640px]:px-5">
      <div className="max-w-screen-page mx-auto">
        <div className="relative -mt-32 rounded-[40px] bg-white shadow-[0_24px_56px_-24px_rgba(11,17,48,0.15)] ring-1 ring-[#eef0fa] py-20 px-12 max-[920px]:-mt-24 max-[920px]:py-12 max-[920px]:px-8 max-[640px]:-mt-16 max-[640px]:px-5 max-[640px]:py-10">
          <div
            className={`flex items-center justify-center gap-6 mb-16 max-[640px]:mb-10 ${REVEAL_UP_CLS}`}
          >
            <span
              aria-hidden="true"
              className="hidden md:block h-px w-32 bg-zinc-300"
            />
            <h2 className="m-0 text-brand-blue-darker font-extrabold uppercase tracking-[0.04em] text-[30px] max-[1200px]:text-[26px] max-[920px]:text-[20px] max-[640px]:text-[17px] text-center leading-tight">
              {t("about_achievements_title")}
            </h2>
            <span
              aria-hidden="true"
              className="hidden md:block h-px w-32 bg-zinc-300"
            />
          </div>

          <div className="grid gap-12 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[860px]:[grid-template-columns:1fr] max-[860px]:gap-14">
            {items.map((n, i) => (
              <AchievementCard
                key={n}
                icon={
                  n === 1 ? (
                    <FlagIcon />
                  ) : n === 2 ? (
                    <BinocularsIcon />
                  ) : (
                    <HandStarIcon />
                  )
                }
                pre={t(`about_ach_${n}_pre`)}
                highlight={t(`about_ach_${n}_highlight`)}
                post={t(`about_ach_${n}_post`)}
                description={t(`about_ach_${n}_desc`)}
                stagger={i + 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AchievementCard({
  icon,
  pre,
  highlight,
  post,
  description,
  stagger,
}: {
  icon: React.ReactNode;
  pre: string;
  highlight: string;
  post: string;
  description: string;
  stagger: number;
}) {
  return (
    <div
      data-stagger={stagger}
      className={`text-center px-4 ${REVEAL_UP_CLS}`}
    >
      <div className="inline-flex items-center justify-center text-brand-blue-darker mb-6">
        {icon}
      </div>
      <h3 className="m-0 mb-4 text-ink font-extrabold text-[20px] leading-[1.4] max-[1200px]:text-[18px] max-[920px]:text-[16.5px] max-[640px]:text-[15px]">
        {pre}
        <span className="text-brand-blue-darker">{highlight}</span>
        {post}
      </h3>
      <p className="m-0 mx-auto max-w-[420px] text-ink-soft text-[16px] leading-[1.8] max-[1200px]:text-[15px] max-[920px]:text-[14px] max-[640px]:text-[13px]">
        {description}
      </p>
    </div>
  );
}

function FlagIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 6a2 2 0 0 1 4 0v36a2 2 0 0 1-4 0V6z" />
      <path d="M16 8h22a2 2 0 0 1 1.66 3.11L34 18l5.66 6.89A2 2 0 0 1 38 28H16V8z" />
    </svg>
  );
}

function BinocularsIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="13" cy="30" r="9" />
      <circle cx="35" cy="30" r="9" />
      <circle cx="13" cy="30" r="3.5" fill="#fff" />
      <circle cx="35" cy="30" r="3.5" fill="#fff" />
      <path d="M11 10h4l1 14h-4l-1-14zm22 0h4l-1 14h-4l1-14z" />
      <rect x="20" y="20" width="8" height="6" rx="1" />
    </svg>
  );
}

function HandStarIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 4l2.5 5.4 5.9.6-4.4 4.1 1.2 5.9L24 17l-5.2 3 1.2-5.9L15.6 10l5.9-.6L24 4z" />
      <path d="M6 30c0-1.5 1-3 2.5-3.5 3-1 5.5-1.5 7.5-1.5h13c1.7 0 3 1.3 3 3s-1.3 3-3 3H22c-.6 0-1 .4-1 1s.4 1 1 1h12c1.7 0 3.5 1 4.5 2.5L42 41c.5.8.2 1.8-.6 2.3l-1.7 1c-.8.5-1.8.2-2.3-.6L34 38c-.6-.8-1.5-1.3-2.5-1.3H14c-2.2 0-4-1.8-4-4v-2.7z" />
    </svg>
  );
}

function DirectorSection() {
  const { t } = useTranslation();
  const bodyParas = [1, 2, 3, 4, 5] as const;
  return (
    <section
      id="director"
      className="relative w-full py-20 px-6 max-[920px]:py-14 max-[640px]:px-5 scroll-mt-20"
    >
      <div className="max-w-screen-page mx-auto">
        <span
          className={`inline-block text-[13px] tracking-[0.28em] font-bold text-brand-blue uppercase max-[640px]:text-[11px] ${REVEAL_UP_CLS}`}
        >
          {t("about_director_label")}
        </span>

        <h2
          className={`m-0 mt-5 text-brand-blue-darker font-extrabold uppercase tracking-[-0.01em] text-[44px] leading-[1.18] max-[1200px]:text-[36px] max-[920px]:text-[26px] max-[640px]:text-[20px] max-w-[1200px] ${REVEAL_UP_CLS}`}
        >
          {t("about_director_heading")}
        </h2>

        <div className="mt-14 grid gap-16 [grid-template-columns:minmax(0,1.4fr)_minmax(0,1fr)] items-start max-[980px]:gap-10 max-[980px]:[grid-template-columns:1fr]">
          <article
            className={`relative ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <span
              aria-hidden="true"
              className="absolute -top-6 -left-1 text-brand-blue/30 text-[80px] leading-none font-serif select-none"
            >
              “
            </span>

            <p className="m-0 pl-10 italic font-semibold text-ink uppercase text-[16.5px] leading-[1.7] tracking-[0.01em] max-[920px]:text-[15px] max-[920px]:pl-8 max-[640px]:text-[13.5px]">
              {t("about_director_quote")}
            </p>

            <div className="mt-10 flex flex-col gap-6 text-ink-soft text-[17px] leading-[1.85] max-[1200px]:text-[15.5px] max-[920px]:text-[14.5px] max-[640px]:text-[13.5px]">
              {bodyParas.map((n) => (
                <p key={n} className="m-0">
                  {t(`about_director_body_${n}`)}
                </p>
              ))}
              <div className="mt-2 text-brand-blue font-semibold text-[17px] max-[920px]:text-[15px]">
                {t("about_director_closing_1")}
                <br />
                {t("about_director_closing_2")}
              </div>
            </div>
          </article>

          <aside
            className={`flex flex-col items-start max-[980px]:items-center ${REVEAL_UP_CLS}`}
            data-stagger="2"
          >
            <DirectorPortrait />
            <div className="mt-6 max-[980px]:text-center">
              <div className="text-ink font-extrabold text-[20px] tracking-[0.06em] uppercase max-[640px]:text-[17px]">
                {t("about_director_name")}
              </div>
              <div className="mt-2 text-ink-soft text-[15.5px] leading-[1.6] max-[640px]:text-[13.5px]">
                {t("about_director_position_org")}
                <br />
                {t("about_director_position_role")}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function HistoryJourneySection() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<HistoryFigure[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const language = i18n.language;

  useEffect(() => {
    let alive = true;
    listHistoryFigures().then((rows) => {
      if (alive) setItems(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [items.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-history-card]") as HTMLElement | null;
    const step = card ? card.offsetWidth + 20 : 320;
    el.scrollBy({ left: dir * step * 1.2, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section
      id="history"
      className="relative w-full pt-16 pb-24 max-[920px]:pt-12 max-[920px]:pb-16 scroll-mt-20"
    >
      <div className="max-w-screen-page mx-auto px-6 max-[640px]:px-5">
        <div
          className={`flex items-end justify-between gap-6 mb-10 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-3 ${REVEAL_UP_CLS}`}
        >
          <div>
            <span className="inline-block text-[13px] tracking-[0.28em] font-bold text-brand-blue uppercase max-[640px]:text-[11px]">
              {t("about_history_label")}
            </span>
            <h2 className="m-0 mt-3 text-brand-blue-darker font-extrabold tracking-[-0.01em] text-[34px] leading-[1.2] max-[920px]:text-[26px] max-[640px]:text-[22px]">
              {t("about_history_heading")}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScrollBtn
              direction="left"
              disabled={!canLeft}
              onClick={() => scrollBy(-1)}
              ariaLabel={t("about_history_scroll_left")}
            />
            <ScrollBtn
              direction="right"
              disabled={!canRight}
              onClick={() => scrollBy(1)}
              ariaLabel={t("about_history_scroll_right")}
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-5 overflow-x-auto px-[max(24px,calc((100vw-1300px)/2+24px))] pb-6 [scroll-snap-type:x_mandatory] [scrollbar-width:thin] max-[640px]:px-5"
          style={{ scrollbarColor: "#c6cde6 transparent" }}
        >
          {items.map((figure) => (
            <HistoryCard
              key={figure.id}
              figure={figure}
              language={language}
              presentLabel={t("about_history_present")}
            />
          ))}
        </div>
        {canLeft && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#eef1fa] to-transparent"
          />
        )}
        {canRight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#eef1fa] to-transparent"
          />
        )}
      </div>
    </section>
  );
}

function ScrollBtn({
  direction,
  disabled,
  onClick,
  ariaLabel,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-brand-blue/25 bg-white text-brand-blue shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-brand-blue enabled:hover:text-white enabled:hover:border-brand-blue"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {direction === "left" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}

function HistoryCard({
  figure,
  language,
  presentLabel,
}: {
  figure: HistoryFigure;
  language: string;
  presentLabel: string;
}) {
  const { name, role } = pickHistoryLocale(figure, language);
  const years = figure.yearStart
    ? `${figure.yearStart}${
        figure.yearEnd
          ? `–${figure.yearEnd}`
          : `–${presentLabel.toUpperCase()}`
      }`
    : "—";

  const longest = name
    .split(/\s+/)
    .reduce((m, w) => Math.max(m, w.length), 0);
  const nameSize =
    longest >= 11
      ? "text-[22px] max-[640px]:text-[18px]"
      : longest >= 9
        ? "text-[26px] max-[640px]:text-[22px]"
        : "text-[30px] max-[640px]:text-[24px]";

  return (
    <Link
      to={`/history/${figure.id}`}
      data-history-card
      className="group shrink-0 w-[320px] max-[640px]:w-[260px] [scroll-snap-align:start] relative block aspect-[2/3] rounded-[20px] overflow-hidden no-underline bg-[#0b1130] ring-1 ring-white/5 shadow-[0_8px_30px_-10px_rgba(11,17,48,0.35)] [transition:transform_.45s_cubic-bezier(.2,.8,.2,1),box-shadow_.45s_ease] hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-20px_rgba(11,17,48,0.55)]"
    >
      {figure.image ? (
        <img
          src={figure.image}
          alt={name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-center [filter:saturate(0.95)_contrast(1.05)] [transition:transform_.9s_cubic-bezier(.2,.8,.2,1),filter_.5s_ease] group-hover:scale-[1.08] group-hover:[filter:saturate(1.05)_contrast(1.08)]"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/15 bg-[linear-gradient(135deg,#0b1130,#131c7a)]">
          <svg
            width="72"
            height="72"
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
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,48,0.55)_0%,rgba(11,17,48,0)_22%,rgba(11,17,48,0)_45%,rgba(11,17,48,0.78)_72%,rgba(11,17,48,0.97)_100%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [box-shadow:inset_0_0_120px_rgba(0,0,0,0.5)]"
      />

      <div className="absolute top-5 left-5 right-5 flex items-center justify-between gap-2 text-white/75">
        <span className="text-[10px] font-semibold tracking-[0.32em] uppercase">
          {role}
        </span>
        <span className="font-serif text-gold-pale text-[11px] tracking-[0.22em] uppercase [font-feature-settings:'lnum'] whitespace-nowrap">
          {years}
        </span>
      </div>

      <div className="absolute left-5 right-5 bottom-3">
        <h3
          className={`m-0 mt-1 font-extrabold uppercase leading-[1] tracking-[-0.02em] ${nameSize} bg-[linear-gradient(180deg,#fff_0%,#f6ecc6_55%,#cdb775_100%)] bg-clip-text text-transparent drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)]`}
        >
          {name}
        </h3>

        <div className="mt-3 h-px bg-gradient-to-r from-gold-pale/0 via-gold-pale/60 to-gold-pale/0" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold-pale/0 [transition:box-shadow_.4s_ease] group-hover:[box-shadow:inset_0_0_0_1px_rgba(232,222,196,0.35)]"
      />
    </Link>
  );
}

function DirectorPortrait() {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative w-full max-w-[460px] aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-[#dde2f3] to-[#c6cde6] shadow-[0_24px_56px_-20px_rgba(11,17,48,0.35)] ring-1 ring-[#dadffb]">
      {!failed ? (
        <img
          src={DIRECTOR_PHOTO}
          alt={t("about_director_photo_alt")}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center text-brand-blue/40"
        >
          <svg
            width="80"
            height="80"
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
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MountainIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21l6-12 4 7 3-5 5 10z" />
      <circle cx="17" cy="6" r="1.5" />
    </svg>
  );
}
