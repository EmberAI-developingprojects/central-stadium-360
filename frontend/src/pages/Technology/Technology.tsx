import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";

const FEATURE_KEYS = ["1", "2", "3", "4"] as const;
const PIPELINE_KEYS = ["1", "2", "3", "4"] as const;

const TECH_STYLE = `
  @keyframes techDot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  @keyframes techSweep {
    0%   { transform: rotate(0deg);   opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { transform: rotate(360deg); opacity: 0; }
  }
  @keyframes techDash { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
  .tech-dot   { animation: techDot 1.8s ease-in-out infinite; }
  .tech-sweep { transform-origin: 50% 50%; animation: techSweep 7s linear infinite; }
  .tech-dash  { stroke-dasharray: 4 4; animation: techDash 1.6s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .tech-dot, .tech-sweep, .tech-dash { animation: none !important; }
  }
  /* light tonal background: warm off-white + subtle ambient highlights */
  .tech-page {
    background-color: #f8f6f1;
    background-image:
      radial-gradient(1200px 700px at 85% -10%, rgba(34,48,198,0.06), transparent 60%),
      radial-gradient(900px 800px at -10% 110%, rgba(168,153,104,0.10), transparent 60%),
      linear-gradient(180deg, #faf8f3 0%, #f6f4ee 55%, #f1eee5 100%);
  }
  /* paper grain — multiply darkens slightly to add fibre/texture on light bg */
  .tech-grain::before {
    content: "";
    position: absolute; inset: 0;
    pointer-events: none;
    opacity: .28;
    mix-blend-mode: multiply;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  }
  /* seamless studio backdrop inside the camera figure */
  .tech-stage {
    background:
      radial-gradient(55% 65% at 50% 35%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 65%),
      radial-gradient(120% 80% at 50% 110%, rgba(168,153,104,0.22) 0%, transparent 60%),
      linear-gradient(180deg, #fdfbf6 0%, #f3f0e7 60%, #e9e4d6 100%);
  }
`;

const PAGE_BG = "tech-page";
const SECTION_PAD = "py-28 px-6 max-[920px]:py-20 max-[920px]:px-5";

/* tokens */
const INK = "#0f172a";
const INK_SOFT = "#475569";
const INK_FAINT = "#94a3b8";

const KICKER_CLS =
  "inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#475569] [&_.bar]:inline-block [&_.bar]:w-6 [&_.bar]:h-px [&_.bar]:bg-[#0f172a]/35";

const SECTION_INDEX_CLS =
  "text-[11px] font-mono font-medium tracking-[0.2em] text-[#94a3b8] tabular-nums";

const RULE_CLS = "border-t border-[#0f172a]/10";

export default function Technology() {
  useRevealOnScroll();
  const { t } = useTranslation();

  return (
    <div
      className={`relative min-h-screen ${PAGE_BG} text-[#0f172a] selection:bg-[#0f172a] selection:text-white tech-grain`}
    >
      <style dangerouslySetInnerHTML={{ __html: TECH_STYLE }} />

      <SiteHeader />

      {/* ───────────── HERO ───────────── */}
      <section
        className={`relative overflow-hidden ${SECTION_PAD} pt-16 max-[920px]:pt-12`}
      >
        {/* soft ambient warmth */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(800px 500px at 75% 25%, rgba(34,48,198,0.05), transparent 60%), radial-gradient(700px 500px at 5% 85%, rgba(168,153,104,0.08), transparent 60%)",
          }}
        />

        <div className="relative max-w-screen-page mx-auto">
          {/* magazine-style header bar */}
          <div
            className={`flex items-center justify-between mb-12 ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <div className={KICKER_CLS}>
              <span className="bar" />
              Vol.01 — {t("tech_volume")}
            </div>
            <div className={SECTION_INDEX_CLS}>{t("tech_hero_index")}</div>
          </div>
          <div className={RULE_CLS} />

          <div className="grid items-end gap-16 mt-12 [grid-template-columns:1.15fr_1fr] max-[1080px]:[grid-template-columns:1fr] max-[1080px]:gap-12">
            {/* LEFT — typographic */}
            <div>
              <h1
                className={`font-extrabold tracking-[-0.035em] leading-[0.94] m-0 text-[#0f172a] ${REVEAL_UP_CLS}`}
                data-stagger="2"
                style={{ fontSize: "clamp(48px, 7vw, 96px)" }}
              >
                {t("tech_hero_title_line1")}
                <br />
                <span
                  className="italic font-light"
                  style={{ color: INK_FAINT }}
                >
                  {t("tech_hero_title_italic")}
                </span>{" "}
                <span className="inline-flex items-baseline">
                  <span>{t("tech_hero_title_camera")}</span>
                </span>
                <br />
                {t("tech_hero_title_line3")}{" "}
                <span className="relative inline-block">
                  {t("tech_hero_title_accent")}
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-1 h-[2px]"
                    style={{ background: INK }}
                  />
                </span>
              </h1>

              <p
                className={`mt-10 max-w-[560px] text-[16.5px] leading-[1.7] m-0 ${REVEAL_UP_CLS}`}
                data-stagger="3"
                style={{ color: INK_SOFT }}
              >
                {t("tech_hero_body")}
              </p>

              <div
                className={`flex flex-wrap items-center gap-5 mt-10 ${REVEAL_UP_CLS}`}
                data-stagger="4"
              >
                <Link
                  to="/events"
                  className="group inline-flex items-center gap-3 bg-[#0f172a] text-white text-[13.5px] font-semibold no-underline px-6 py-4 [transition:transform_.18s_ease,background_.18s_ease] hover:bg-[#1e293b]"
                >
                  {t("tech_hero_cta_events")}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="[transition:transform_.18s_ease] group-hover:translate-x-1"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
                <a
                  href="#pipeline"
                  className="inline-flex items-center gap-2 text-[13.5px] font-semibold no-underline border-b pb-1 [transition:color_.15s_ease,border-color_.15s_ease]"
                  style={{ color: INK, borderColor: "rgba(15,23,42,0.3)" }}
                >
                  {t("tech_hero_cta_pipeline")}
                </a>
              </div>
            </div>

            {/* RIGHT — 360° camera visual */}
            <div className={`relative ${REVEAL_UP_CLS}`} data-stagger="3">
              <Camera360Visual />
              <div
                className="mt-4 flex items-center justify-between text-[10.5px] font-mono uppercase tracking-[0.2em]"
                style={{ color: INK_FAINT }}
              >
                <span>{t("tech_fig_caption")}</span>
                <span>{t("tech_fig_meta")}</span>
              </div>
            </div>
          </div>

          {/* ledger-style inline stats */}
          <div className={`mt-20 ${REVEAL_UP_CLS}`} data-stagger="4">
            <div className={RULE_CLS} />
            <dl className="grid [grid-template-columns:repeat(4,minmax(0,1fr))] max-[760px]:[grid-template-columns:repeat(2,minmax(0,1fr))]">
              {[
                { v: "360", u: "°", l: t("tech_stat_angle") },
                { v: "4", u: "ch", l: t("tech_stat_streams") },
                { v: "4K", u: "", l: t("tech_stat_uhd") },
                { v: "~720", u: "ms", l: t("tech_stat_latency") },
              ].map((s, i) => (
                <div
                  key={s.l}
                  className={`py-7 px-1 ${i !== 0 ? "border-l border-[#0f172a]/10 max-[760px]:border-l-0" : ""} ${i >= 2 ? "max-[760px]:border-t max-[760px]:border-[#0f172a]/10" : ""} ${i === 2 ? "max-[760px]:border-l max-[760px]:border-[#0f172a]/10" : ""}`}
                >
                  <dt
                    className="text-[10.5px] font-mono uppercase tracking-[0.22em] mb-3"
                    style={{ color: INK_FAINT }}
                  >
                    {s.l}
                  </dt>
                  <dd className="m-0 flex items-baseline gap-1">
                    <span
                      className="font-extrabold tracking-[-0.04em] tabular-nums leading-none"
                      style={{
                        fontSize: "clamp(40px, 4.6vw, 64px)",
                        color: INK,
                      }}
                    >
                      {s.v}
                    </span>
                    {s.u && (
                      <span
                        className="text-[16px] font-medium tabular-nums"
                        style={{ color: INK_FAINT }}
                      >
                        {s.u}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className={RULE_CLS} />
          </div>
        </div>
      </section>

      {/* ───────────── FEATURES (editorial list) ───────────── */}
      <section className={`relative ${SECTION_PAD}`}>
        <div className="relative max-w-screen-page mx-auto">
          <div
            className={`grid gap-12 [grid-template-columns:340px_1fr] max-[920px]:[grid-template-columns:1fr] max-[920px]:gap-8 mb-16 ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <div>
              <div className={`${KICKER_CLS} mb-6`}>
                <span className="bar" />
                {t("tech_features_kicker")}
              </div>
              <h2
                className="font-extrabold tracking-[-0.03em] leading-[1.02] m-0"
                style={{ fontSize: "clamp(34px, 4.4vw, 56px)", color: INK }}
              >
                {t("tech_features_title")}
              </h2>
            </div>
            <p
              className="text-[16.5px] leading-[1.75] m-0 max-w-[640px] [align-self:end]"
              style={{ color: INK_SOFT }}
            >
              {t("tech_features_lead")}
            </p>
          </div>

          <div className={RULE_CLS} />
          <div className="grid [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:[grid-template-columns:1fr]">
            {FEATURE_KEYS.map((k, i) => (
              <article
                key={k}
                className={`relative px-1 py-9 ${i % 2 === 0 ? "[border-right:1px_solid_rgba(15,23,42,0.10)] max-[760px]:[border-right:none] pr-10 max-[920px]:pr-6" : "pl-10 max-[920px]:pl-6 max-[760px]:pl-1"} ${i > 1 ? "border-t border-[#0f172a]/10" : ""} ${i === 1 ? "max-[760px]:border-t max-[760px]:border-[#0f172a]/10" : ""} ${REVEAL_UP_CLS}`}
                data-stagger={(i % 2) + 1}
              >
                <div className="flex items-baseline justify-between mb-4 gap-4">
                  <span
                    className="text-[11px] font-mono tracking-[0.2em]"
                    style={{ color: INK_FAINT }}
                  >
                    № 0{k}
                  </span>
                  <span
                    className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-right"
                    style={{ color: INK_FAINT }}
                  >
                    {t(`tech_feature_${k}_meta`)}
                  </span>
                </div>
                <h3
                  className="text-[22px] font-bold tracking-[-0.018em] leading-[1.2] m-0 mb-3 max-w-[420px]"
                  style={{ color: INK }}
                >
                  {t(`tech_feature_${k}_title`)}
                </h3>
                <p
                  className="text-[15px] leading-[1.7] m-0 max-w-[520px]"
                  style={{ color: INK_SOFT }}
                >
                  {t(`tech_feature_${k}_desc`)}
                </p>
              </article>
            ))}
          </div>
          <div className={RULE_CLS} />
        </div>
      </section>

      {/* ───────────── PIPELINE (technical timeline) ───────────── */}
      <section id="pipeline" className={`relative ${SECTION_PAD}`}>
        <div className="relative max-w-screen-page mx-auto">
          <div
            className={`grid gap-12 [grid-template-columns:340px_1fr] max-[920px]:[grid-template-columns:1fr] max-[920px]:gap-8 mb-16 ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <div>
              <div className={`${KICKER_CLS} mb-6`}>
                <span className="bar" />
                {t("tech_pipeline_kicker")}
              </div>
              <h2
                className="font-extrabold tracking-[-0.03em] leading-[1.02] m-0"
                style={{ fontSize: "clamp(34px, 4.4vw, 56px)", color: INK }}
              >
                {t("tech_pipeline_title_line1")}
                <br />
                {t("tech_pipeline_title_line2")}
              </h2>
            </div>
            <p
              className="text-[16.5px] leading-[1.75] m-0 max-w-[640px] [align-self:end]"
              style={{ color: INK_SOFT }}
            >
              {t("tech_pipeline_lead")}
            </p>
          </div>

          <ol className="relative list-none m-0 p-0">
            <div className={RULE_CLS} />
            {PIPELINE_KEYS.map((k) => (
              <li
                key={k}
                className={`relative grid items-start gap-10 [grid-template-columns:200px_1fr_220px] max-[1080px]:[grid-template-columns:140px_1fr] max-[1080px]:gap-6 max-[760px]:[grid-template-columns:1fr] py-10 border-b border-[#0f172a]/10 ${REVEAL_UP_CLS}`}
                data-stagger="1"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="font-extrabold tabular-nums tracking-[-0.04em] leading-none"
                    style={{ fontSize: "clamp(56px, 5.6vw, 80px)", color: INK }}
                  >
                    0{k}
                  </span>
                  <span
                    className="mt-2 text-[10.5px] font-mono uppercase tracking-[0.24em] max-[760px]:mt-1"
                    style={{ color: INK_FAINT }}
                  >
                    {t(`tech_pipeline_${k}_label`)}
                  </span>
                </div>

                <div>
                  <h3
                    className="text-[24px] font-bold tracking-[-0.018em] leading-[1.2] m-0 mb-3 max-w-[560px]"
                    style={{ color: INK }}
                  >
                    {t(`tech_pipeline_${k}_title`)}
                  </h3>
                  <p
                    className="text-[15px] leading-[1.7] m-0 max-w-[640px]"
                    style={{ color: INK_SOFT }}
                  >
                    {t(`tech_pipeline_${k}_desc`)}
                  </p>
                </div>

                <div className="text-right max-[1080px]:hidden">
                  <div
                    className="text-[10.5px] font-mono uppercase tracking-[0.2em] mb-2"
                    style={{ color: INK_FAINT }}
                  >
                    {t("tech_pipeline_spec_label")}
                  </div>
                  <div
                    className="text-[12.5px] font-mono leading-[1.6]"
                    style={{ color: INK_SOFT }}
                  >
                    {t(`tech_pipeline_${k}_spec`)}
                  </div>
                </div>
                <div
                  className="hidden max-[1080px]:block max-[760px]:mt-1 text-[11px] font-mono"
                  style={{ color: INK_FAINT }}
                >
                  {t(`tech_pipeline_${k}_spec`)}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── CTA ───────────── */}
      <section className="relative pb-28 px-6 pt-12 max-[920px]:pb-20 max-[920px]:px-5">
        <div className="relative max-w-screen-page mx-auto">
          <div
            className={`grid items-end gap-10 [grid-template-columns:1.3fr_1fr] max-[920px]:[grid-template-columns:1fr] ${REVEAL_UP_CLS}`}
          >
            <h2
              className="font-extrabold tracking-[-0.035em] leading-[0.98] m-0"
              style={{ fontSize: "clamp(38px, 5.4vw, 72px)", color: INK }}
            >
              {t("tech_cta_title_line1")}{" "}
              <span className="italic font-light" style={{ color: INK_FAINT }}>
                {t("tech_cta_title_accent")}
              </span>{" "}
              {t("tech_cta_title_line2")}
            </h2>
            <div className="flex flex-wrap gap-5 items-center [justify-self:end] max-[920px]:[justify-self:start]">
              <Link
                to="/events"
                className="group inline-flex items-center gap-3 bg-[#0f172a] text-white text-[13.5px] font-semibold no-underline px-6 py-4 hover:bg-[#1e293b] [transition:background_.15s_ease]"
              >
                {t("tech_cta_buy")}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="[transition:transform_.18s_ease] group-hover:translate-x-1"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                to="/#contact"
                className="inline-flex items-center gap-2 text-[13.5px] font-semibold no-underline border-b pb-1 [transition:color_.15s_ease,border-color_.15s_ease]"
                style={{ color: INK, borderColor: "rgba(15,23,42,0.3)" }}
              >
                {t("tech_cta_contact")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ───────────── 360° camera visual (illustration + annotations) ───────────── */
/* To swap in a real photograph, drop a file at /public/assets/images/tech/camera-360.png
   and the <img> tag below will overlay the SVG illustration. */
function Camera360Visual() {
  return (
    <figure
      className="relative w-full aspect-[4/3] m-0 border border-[#0f172a]/10 overflow-hidden tech-stage"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.6), 0 30px 60px -30px rgba(15,23,42,0.25)",
      }}
    >
      {/* corner tick marks */}
      {[
        "top-2 left-2 border-l border-t",
        "top-2 right-2 border-r border-t",
        "bottom-2 left-2 border-l border-b",
        "bottom-2 right-2 border-r border-b",
      ].map((c) => (
        <span
          key={c}
          aria-hidden="true"
          className={`absolute w-3 h-3 border-[#0f172a]/30 ${c}`}
        />
      ))}

      {/* warm key-light from above */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(45% 35% at 50% 18%, rgba(255,255,255,0.7), transparent 70%)",
        }}
      />

      {/* faint engineering grid — masked at centre */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.5] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, transparent 14%, black 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 50%, transparent 14%, black 75%)",
        }}
      />

      {/* SVG illustration of an Insta360-style camera */}
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 w-full h-full"
        aria-label="360° панорам камер"
      >
        <defs>
          {/* body metal — still a dark camera; reads as product photo on light backdrop */}
          <linearGradient id="cam-body" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#1c1f27" />
            <stop offset="42%" stopColor="#2c3140" />
            <stop offset="58%" stopColor="#2c3140" />
            <stop offset="100%" stopColor="#15171d" />
          </linearGradient>
          <linearGradient id="cam-bezel" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <radialGradient id="cam-lens" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#3a4566" />
            <stop offset="35%" stopColor="#171b2a" />
            <stop offset="70%" stopColor="#0a0c14" />
            <stop offset="100%" stopColor="#05060c" />
          </radialGradient>
          <radialGradient id="cam-iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a2240" />
            <stop offset="65%" stopColor="#070a18" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
          <radialGradient id="cam-highlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          {/* soft cast shadow on the backdrop (now light) */}
          <radialGradient id="cam-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(15,23,42,0.32)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0)" />
          </radialGradient>
        </defs>

        {/* drop shadow on backdrop */}
        <ellipse cx="200" cy="272" rx="78" ry="8" fill="url(#cam-shadow)" />

        {/* CAMERA BODY */}
        <g>
          <rect
            x="168"
            y="62"
            width="64"
            height="208"
            rx="14"
            fill="url(#cam-body)"
            stroke="rgba(15,23,42,0.25)"
            strokeWidth="0.6"
          />
          <rect
            x="168"
            y="62"
            width="64"
            height="30"
            rx="14"
            fill="url(#cam-bezel)"
          />

          {/* power button (side) */}
          <rect x="230" y="135" width="3" height="14" rx="1.5" fill="#0a0c14" />
          <rect
            x="230"
            y="135"
            width="3"
            height="14"
            rx="1.5"
            fill="rgba(255,255,255,0.08)"
          />

          {/* top REC LED */}
          <circle
            cx="200"
            cy="78"
            r="2.4"
            fill="#22c55e"
            className="tech-dot"
          />
          <circle
            cx="200"
            cy="78"
            r="4.5"
            fill="none"
            stroke="rgba(34,197,94,0.45)"
            strokeWidth="0.5"
          />

          {/* lens hood */}
          <circle
            cx="200"
            cy="148"
            r="46"
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1.2"
          />
          <circle
            cx="200"
            cy="148"
            r="44"
            fill="#0c0e16"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.6"
          />

          {/* lens dome */}
          <circle cx="200" cy="148" r="40" fill="url(#cam-lens)" />
          <circle
            cx="200"
            cy="148"
            r="32"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.5"
          />
          <circle cx="200" cy="148" r="28" fill="url(#cam-iris)" />
          <circle
            cx="200"
            cy="148"
            r="22"
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="0.4"
          />
          <circle
            cx="200"
            cy="148"
            r="14"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.4"
          />
          <circle
            cx="200"
            cy="148"
            r="6"
            fill="#05060c"
            stroke="rgba(255,255,255,0.20)"
            strokeWidth="0.4"
          />
          {/* specular highlight on lens */}
          <ellipse
            cx="186"
            cy="134"
            rx="14"
            ry="9"
            fill="url(#cam-highlight)"
          />
          <circle cx="183" cy="131" r="1.4" fill="rgba(255,255,255,0.95)" />

          {/* lens engraving */}
          <text
            x="200"
            y="200"
            textAnchor="middle"
            fontFamily="ui-monospace,monospace"
            fontSize="6"
            letterSpacing="2"
            fill="rgba(255,255,255,0.38)"
          >
            360° · ƒ/1.9
          </text>

          {/* status mini-screen */}
          <rect
            x="180"
            y="216"
            width="40"
            height="26"
            rx="3"
            fill="#06070d"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.6"
          />
          <text
            x="200"
            y="234"
            textAnchor="middle"
            fontFamily="ui-monospace,monospace"
            fontSize="8.5"
            letterSpacing="1.5"
            fontWeight="700"
            fill="#ffffff"
          >
            REC
          </text>

          {/* tripod thread */}
          <rect
            x="190"
            y="266"
            width="20"
            height="6"
            rx="1.5"
            fill="#0a0c14"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.5"
          />
          <line
            x1="194"
            y1="269"
            x2="206"
            y2="269"
            stroke="rgba(255,255,255,0.20)"
            strokeWidth="0.4"
          />
        </g>

        {/* leader lines from labels to camera parts — dark on light backdrop */}
        <g stroke="rgba(15,23,42,0.32)" strokeWidth="0.5" fill="none">
          <path d="M 60 70  L 130 70  L 195 78" />
          <circle cx="60" cy="70" r="1.6" fill="rgba(15,23,42,0.55)" />
          <path d="M 340 70  L 270 70  L 232 96" />
          <circle cx="340" cy="70" r="1.6" fill="rgba(15,23,42,0.55)" />
          <path d="M 60 140  L 130 140  L 160 148" />
          <circle cx="60" cy="140" r="1.6" fill="rgba(15,23,42,0.55)" />
          <path d="M 340 148  L 280 148  L 245 148" />
          <circle cx="340" cy="148" r="1.6" fill="rgba(15,23,42,0.55)" />
          <path d="M 60 232  L 130 232  L 180 229" />
          <circle cx="60" cy="232" r="1.6" fill="rgba(15,23,42,0.55)" />
          <path d="M 340 268  L 270 268  L 215 268" />
          <circle cx="340" cy="268" r="1.6" fill="rgba(15,23,42,0.55)" />
        </g>

        <text
          x="8"
          y="14"
          fontFamily="ui-monospace,monospace"
          fontSize="8"
          fill="rgba(15,23,42,0.45)"
        >
          FIG. 01
        </text>
      </svg>

      {/* OPTIONAL real photograph overlay */}
      <img
        src="/assets/images/tech/camera-360.png"
        alt=""
        aria-hidden="true"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        className="absolute inset-0 w-full h-full object-contain p-8 pointer-events-none"
      />

      {/* HTML callouts */}
      <Callout
        cls="left-[4%] top-[18%]"
        label="REC LED"
        note="Live indicator"
        align="left"
      />
      <Callout
        cls="right-[4%] top-[18%]"
        label="8K · UHD"
        note="30 / 60 fps"
        align="right"
      />
      <Callout
        cls="left-[4%] top-[44%]"
        label="DUAL LENS"
        note="Front + rear"
        align="left"
      />
      <Callout
        cls="right-[4%] top-[44%]"
        label="ƒ/1.9"
        note="200° FOV"
        align="right"
      />
      <Callout
        cls="left-[4%] top-[74%]"
        label="OLED"
        note="Status screen"
        align="left"
      />
      <Callout
        cls="right-[4%] top-[88%]"
        label="1/4″ — 20"
        note="Mount thread"
        align="right"
      />

      {/* LIVE recording badge */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-2.5 py-1 border border-[#0f172a]/20 bg-[#0f172a]/90 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 tech-dot" />
        <span className="text-[9.5px] font-mono uppercase tracking-[0.24em] text-white/95">
          LIVE · REC
        </span>
      </div>
    </figure>
  );
}

function Callout({
  cls,
  label,
  note,
  align,
}: {
  cls: string;
  label: string;
  note: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`absolute ${cls} max-w-[120px] ${align === "right" ? "text-right" : "text-left"}`}
    >
      <div
        className="text-[10.5px] font-mono uppercase tracking-[0.2em] font-semibold"
        style={{ color: "#0f172a" }}
      >
        {label}
      </div>
      <div
        className="text-[10px] font-mono uppercase tracking-[0.16em] mt-0.5"
        style={{ color: "#94a3b8" }}
      >
        {note}
      </div>
    </div>
  );
}
