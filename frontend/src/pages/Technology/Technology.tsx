import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";

const FEATURES = [
  {
    title: "360° бүрэн зургийн өнцөг",
    desc: "Тоглолтын талбайн дунд байрлуулсан панорам камер нь хэвтээ 360° ба босоо чиглэлд бүтэн зургийг бичиж, үзэгчид өөрсдөө хүссэн өнцгөөр харах боломжтой.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="9" ry="3.5" />
        <path d="M3 12c4 4 14 4 18 0" />
      </svg>
    ),
  },
  {
    title: "4 камер · HD чанар",
    desc: "Сонгодог өнцгүүдийг хамарсан 3 камер дээр нэмэлтээр 360° панорам камер ажиллаж, нийт 4 урсгалыг үзэгчид зэрэг харах боломжийг олгоно.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="M16 10l5-3v10l-5-3z" />
      </svg>
    ),
  },
  {
    title: "Доод хоцролттой шууд эфир",
    desc: "AWS IVS дэд бүтцэд тулгуурлан секундын доод хоцролтоор шууд дамжуулах ба гар утас, таблет, компьютер дээр жигд тоглоно.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12a10 10 0 0 1 20 0" />
        <path d="M5 12a7 7 0 0 1 14 0" />
        <path d="M8 12a4 4 0 0 1 8 0" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Интерактив өнцөг сонголт",
    desc: "Үзэгч хулгана, хуруугаараа дэлгэцийг чирэн дурын чиглэлд эргүүлж, өөрийн сонгосон өнцгөөр тоглолтыг үзнэ.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 0 1 15-6.7" />
        <path d="M21 12a9 9 0 0 1-15 6.7" />
        <polyline points="18 3 18 8 13 8" />
        <polyline points="6 21 6 16 11 16" />
      </svg>
    ),
  },
  {
    title: "Орон зайн дуу",
    desc: "Талбайн дотор байрлуулсан микрофоны массив нь үзэгчид талбай дээр сууж буй мэт мэдрэмжийг бүрдүүлэх орон зайн дууг бичнэ.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V6l9-3v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="15" cy="16" r="3" />
      </svg>
    ),
  },
  {
    title: "Нөхөж үзэх боломж",
    desc: "Шууд эфир дуусахад VOD горимоор хадгалагдаж, нөхөж үзэх тасалбартай үзэгчид хүссэн үедээ тоглолтоо буцаан үзэх боломжтой.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    n: "01",
    title: "Талбайн дунд камерын суурилуулалт",
    desc: "Мэргэжлийн баг тоглолтын өмнө талбайн стратегийн цэгүүдэд 4 камерыг байршуулна. Нэг нь панорам (360°) линз бүхий гол камер.",
    tag: "CAPTURE",
  },
  {
    n: "02",
    title: "AWS IVS-руу шууд дамжуулалт",
    desc: "Камер бүрийн дүрсийг бодит цаг хугацаанд кодлоод AWS Interactive Video Service-руу хэт бага хоцролттой push хийнэ.",
    tag: "INGEST",
  },
  {
    n: "03",
    title: "Браузерт WebGL рендер",
    desc: "Three.js ашиглан 360° дүрсийг бөмбөрцөг гадарга дээр буулгаж, хэрэглэгчийн харах өнцгийг бодит цагт renderлэнэ.",
    tag: "RENDER",
  },
  {
    n: "04",
    title: "VOD горимд автомат архив",
    desc: "Шууд эфир дуусмагц бичлэг HLS форматаар хадгалагдаж, нөхөж үзэх тасалбартай үзэгч хүссэн үедээ үзнэ.",
    tag: "REPLAY",
  },
];

const TECH_STYLE = `
  @keyframes techOrbitSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes techOrbitMed  { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  @keyframes techOrbitFast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes techGlowPulse {
    0%, 100% { opacity: .85; filter: drop-shadow(0 0 18px rgba(96,165,250,.55)); }
    50%      { opacity: 1;   filter: drop-shadow(0 0 36px rgba(129,140,248,.85)); }
  }
  @keyframes techScan {
    0%   { transform: translateY(-110%); opacity: 0; }
    8%   { opacity: .9; }
    92%  { opacity: .9; }
    100% { transform: translateY(110%); opacity: 0; }
  }
  @keyframes techDataFlow {
    from { stroke-dashoffset: 60; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes techDotPulse {
    0%, 100% { transform: scale(1);   box-shadow: 0 0 0 0   rgba(74,222,128,.65); }
    50%      { transform: scale(1.15); box-shadow: 0 0 0 10px rgba(74,222,128,0);  }
  }
  @keyframes techMarkerPulse {
    0%, 100% { opacity: .55; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.15); }
  }
  .tech-orbit-slow { animation: techOrbitSlow 30s linear infinite; }
  .tech-orbit-med  { animation: techOrbitMed  22s linear infinite; }
  .tech-orbit-fast { animation: techOrbitFast 14s linear infinite; }
  .tech-glow-pulse { animation: techGlowPulse 3.4s ease-in-out infinite; }
  .tech-scan       { animation: techScan 5.2s linear infinite; }
  .tech-data-flow  { stroke-dasharray: 6 6; animation: techDataFlow 1.6s linear infinite; }
  .tech-dot-pulse  { animation: techDotPulse 1.8s ease-out infinite; }
  .tech-marker     { animation: techMarkerPulse 2.4s ease-in-out infinite; }
  .tech-grid-bg {
    background-image:
      linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px);
    background-size: 56px 56px;
  }
  @media (prefers-reduced-motion: reduce) {
    .tech-orbit-slow, .tech-orbit-med, .tech-orbit-fast,
    .tech-glow-pulse, .tech-scan, .tech-data-flow,
    .tech-dot-pulse, .tech-marker { animation: none !important; }
  }
`;

const SECTION_DARK_CLS =
  "relative overflow-hidden bg-[#05071a] text-white py-24 px-6 max-[920px]:py-16 max-[920px]:px-5";

const EYEBROW_CLS =
  "inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/80 [&_svg]:w-3 [&_svg]:h-3";

export default function Technology() {
  useRevealOnScroll();

  return (
    <div className="min-h-screen bg-[#05071a]">
      <style dangerouslySetInnerHTML={{ __html: TECH_STYLE }} />
      <SiteHeader />

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className={SECTION_DARK_CLS}>
        {/* deep-space gradient + grid + scanlines */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(1200px 600px at 18% 12%, rgba(56,76,255,0.32), transparent 60%), radial-gradient(900px 600px at 82% 88%, rgba(129,140,248,0.28), transparent 60%), linear-gradient(180deg, #04061a 0%, #070b2b 60%, #04061a 100%)",
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 tech-grid-bg opacity-[0.55] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 h-[160px] pointer-events-none tech-scan"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(129,140,248,0.18) 50%, transparent 100%)",
          }}
        />

        <div className="max-w-screen-page mx-auto relative z-[1] grid items-center gap-14 [grid-template-columns:1.05fr_1fr] max-[1080px]:[grid-template-columns:1fr] max-[1080px]:gap-10">
          {/* LEFT: copy */}
          <div>
            <span className={`${EYEBROW_CLS} mb-7 ${REVEAL_UP_CLS}`} data-stagger="1">
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400 tech-dot-pulse" />
              LIVE · 360° BROADCAST PLATFORM
            </span>

            <h1
              className={`text-[clamp(36px,5.4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.025em] m-0 mb-6 ${REVEAL_UP_CLS}`}
              data-stagger="2"
            >
              Талбайн дунд{" "}
              <span className="bg-gradient-to-r from-[#a5b4fc] via-[#818cf8] to-[#22d3ee] bg-clip-text text-transparent">
                360°
              </span>{" "}
              шууд дамжуулалтын{" "}
              <span className="relative inline-block">
                шинэ систем
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 -bottom-2 h-[3px] rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #6366f1 30%, #22d3ee 70%, transparent)",
                  }}
                />
              </span>
            </h1>

            <p
              className={`text-[17px] leading-[1.7] text-white/70 m-0 mb-8 max-w-[620px] ${REVEAL_UP_CLS}`}
              data-stagger="3"
            >
              Төв Цэнгэлдэх Хүрээлэн анх удаа Монголд нэвтрүүлж буй 360° камер,
              бага хоцролттой шууд дамжуулалт, WebGL рендерийн нэгдсэн платформ.
              Үзэгч бүр өөрийн сонгосон өнцгөөс, талбайд сууж буй мэт мэдрэмжээр
              үзнэ.
            </p>

            <div className={`flex flex-wrap gap-3 ${REVEAL_UP_CLS}`} data-stagger="4">
              <Link
                to="/events"
                className="group inline-flex items-center gap-2 rounded-full bg-white text-[#05071a] text-[14px] font-bold no-underline px-6 py-3.5 shadow-[0_10px_40px_-12px_rgba(165,180,252,0.85)] hover:shadow-[0_18px_48px_-12px_rgba(165,180,252,1)] [transition:transform_.18s_ease,box-shadow_.25s_ease] hover:-translate-y-0.5"
              >
                Удахгүй болох тоглолтууд
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="[transition:transform_.18s_ease] group-hover:translate-x-0.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a
                href="#pipeline"
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/15 text-white text-[14px] font-semibold no-underline px-6 py-3.5 hover:bg-white/[0.12] hover:border-white/25 [transition:background_.18s_ease,border-color_.18s_ease]"
              >
                Хэрхэн ажилладаг вэ?
              </a>
            </div>
          </div>

          {/* RIGHT: holographic 360° camera visualisation */}
          <div
            className={`relative aspect-square w-full max-w-[560px] mx-auto ${REVEAL_UP_CLS}`}
            data-stagger="3"
          >
            {/* outer glow */}
            <div
              aria-hidden="true"
              className="absolute inset-[12%] rounded-full tech-glow-pulse"
              style={{
                background:
                  "radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(34,211,238,0.18) 40%, transparent 70%)",
              }}
            />

            {/* orbit ring — outer (markers = 4 cameras) */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative w-[92%] h-[92%] rounded-full border border-white/15 tech-orbit-slow">
                {/* 4 camera markers */}
                {[0, 90, 180, 270].map((deg, i) => (
                  <div
                    key={deg}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 tech-marker"
                    style={{
                      transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(calc(-50% + 4px))`,
                      animationDelay: `${i * 0.4}s`,
                    }}
                  >
                    <div className="flex items-center gap-2 -rotate-[var(--r,0deg)]" style={{ ["--r" as never]: `${deg}deg` }}>
                      <span className="w-3 h-3 rounded-full bg-[#a5b4fc] shadow-[0_0_18px_rgba(165,180,252,0.85)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* orbit ring — middle (dashed, reversed) */}
            <div className="absolute inset-0 grid place-items-center">
              <div
                className="w-[72%] h-[72%] rounded-full border border-dashed border-[#22d3ee]/40 tech-orbit-med"
                style={{ boxShadow: "inset 0 0 60px rgba(34,211,238,0.08)" }}
              />
            </div>

            {/* orbit ring — inner (fast) */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative w-[54%] h-[54%] rounded-full border border-white/25 tech-orbit-fast">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.95)]" />
              </div>
            </div>

            {/* core sphere */}
            <div className="absolute inset-0 grid place-items-center">
              <div
                className="relative w-[34%] h-[34%] rounded-full grid place-items-center"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #6366f1 0%, #1e1b4b 60%, #0b0b2b 100%)",
                  boxShadow:
                    "0 0 80px rgba(99,102,241,0.6), inset 0 0 30px rgba(255,255,255,0.08), inset 0 -10px 30px rgba(0,0,0,0.5)",
                }}
              >
                <div className="text-center">
                  <div className="text-[clamp(28px,4.4vw,46px)] font-black tracking-[-0.03em] leading-none text-white">
                    360°
                  </div>
                  <div className="text-[10px] font-bold tracking-[0.28em] text-white/60 mt-1">
                    PANORAMIC
                  </div>
                </div>
                {/* highlight */}
                <span
                  aria-hidden="true"
                  className="absolute top-3 left-4 w-10 h-10 rounded-full bg-white/25 blur-xl"
                />
              </div>
            </div>

            {/* floating spec chips */}
            <div className="absolute -top-2 right-2 max-[480px]:hidden">
              <div className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md px-3 py-2 text-[11px] font-bold tracking-[0.16em] text-white/85">
                4K · UHD
              </div>
            </div>
            <div className="absolute bottom-4 left-0 max-[480px]:hidden">
              <div className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md px-3 py-2 text-[11px] font-bold tracking-[0.16em] text-white/85 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 tech-dot-pulse" />
                LIVE · &lt; 1s
              </div>
            </div>
            <div className="absolute top-1/2 -left-2 max-[480px]:hidden">
              <div className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md px-3 py-2 text-[11px] font-bold tracking-[0.16em] text-white/85">
                WebGL
              </div>
            </div>
            <div className="absolute top-1/2 -right-2 max-[480px]:hidden">
              <div className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md px-3 py-2 text-[11px] font-bold tracking-[0.16em] text-white/85">
                AWS · IVS
              </div>
            </div>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="relative z-[1] max-w-screen-page mx-auto mt-16 max-[920px]:mt-12">
          <div
            className={`grid [grid-template-columns:repeat(4,minmax(0,1fr))] max-[760px]:[grid-template-columns:repeat(2,minmax(0,1fr))] rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md overflow-hidden ${REVEAL_UP_CLS}`}
          >
            {[
              { v: "360°", l: "Бүрэн өнцөг" },
              { v: "4", l: "Зэрэг урсгал" },
              { v: "4K", l: "UHD чанар" },
              { v: "<1s", l: "Хоцролт" },
            ].map((s, i) => (
              <div
                key={s.l}
                className={`px-6 py-7 text-center ${i !== 0 ? "border-l border-white/10 max-[760px]:border-l-0" : ""} ${i === 2 ? "max-[760px]:border-l max-[760px]:border-white/10" : ""} ${i >= 2 ? "max-[760px]:border-t max-[760px]:border-white/10" : ""}`}
              >
                <div className="text-[clamp(28px,3.6vw,40px)] font-black tracking-[-0.02em] tabular-nums bg-gradient-to-b from-white to-[#a5b4fc] bg-clip-text text-transparent">
                  {s.v}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55 mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── FEATURES ───────────────────────── */}
      <section className="relative overflow-hidden bg-[#05071a] text-white py-24 px-6 max-[920px]:py-16 max-[920px]:px-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              "radial-gradient(800px 500px at 90% 10%, rgba(56,76,255,0.18), transparent 60%), radial-gradient(700px 500px at 5% 90%, rgba(34,211,238,0.14), transparent 60%)",
          }}
        />
        <div className="relative z-[1] max-w-screen-page mx-auto">
          <div className={`max-w-[760px] mb-14 ${REVEAL_UP_CLS}`} data-stagger="1">
            <span className={`${EYEBROW_CLS} mb-5`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#a5b4fc]" />
              ОНЦЛОГ
            </span>
            <h2 className="text-[clamp(30px,3.8vw,46px)] font-extrabold tracking-[-0.02em] leading-[1.08] m-0 mb-4">
              Юу нь өөр вэ?
            </h2>
            <p className="text-[16.5px] leading-[1.7] text-white/65 m-0">
              Сонгодог нэг өнцгийн дамжуулалтаас ялгарах олон давуу талтай. Үзэгч
              нь зөвхөн дамжуулагчийн сонгосон өнцгөөр биш, тоглолтын дур зоргын
              өнцөг рүү харах эрх чөлөөтэй.
            </p>
          </div>

          <div className="grid gap-5 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[920px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[600px]:[grid-template-columns:1fr]">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className={`group relative rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md p-6 overflow-hidden [transition:transform_.2s_ease,border-color_.2s_ease,background_.2s_ease] hover:-translate-y-1 hover:border-[#a5b4fc]/40 hover:bg-white/[0.06] ${REVEAL_UP_CLS}`}
                data-stagger={(i % 3) + 1}
              >
                {/* hover glow */}
                <div
                  aria-hidden="true"
                  className="absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-0 group-hover:opacity-100 [transition:opacity_.3s_ease] pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
                  }}
                />
                <div className="relative">
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 text-white [&_svg]:w-[22px] [&_svg]:h-[22px]"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.35), rgba(34,211,238,0.25))",
                      boxShadow:
                        "inset 0 0 0 1px rgba(165,180,252,0.35), 0 8px 24px -8px rgba(99,102,241,0.6)",
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-[17px] font-bold tracking-[-0.01em] text-white m-0 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.65] text-white/65 m-0">
                    {f.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── PIPELINE ───────────────────────── */}
      <section
        id="pipeline"
        className="relative overflow-hidden bg-[#04061a] text-white py-24 px-6 max-[920px]:py-16 max-[920px]:px-5"
      >
        <div aria-hidden="true" className="absolute inset-0 tech-grid-bg opacity-30 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(900px 500px at 50% 0%, rgba(34,211,238,0.12), transparent 60%)",
          }}
        />
        <div className="relative z-[1] max-w-screen-page mx-auto">
          <div className={`max-w-[760px] mb-14 ${REVEAL_UP_CLS}`} data-stagger="1">
            <span className={`${EYEBROW_CLS} mb-5`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
              PIPELINE
            </span>
            <h2 className="text-[clamp(30px,3.8vw,46px)] font-extrabold tracking-[-0.02em] leading-[1.08] m-0 mb-4">
              Камераас дэлгэц хүртэлх замнал
            </h2>
            <p className="text-[16.5px] leading-[1.7] text-white/65 m-0">
              Талбайд байршуулсан камераас гар утсан дээрх дэлгэц хүртэл дүрс
              хэрхэн дамжих вэ — дөрвөн алхамаар.
            </p>
          </div>

          {/* horizontal animated data flow (desktop) */}
          <div className="relative max-[1080px]:hidden">
            <svg
              aria-hidden="true"
              className="absolute inset-x-0 top-[88px] w-full h-[6px] pointer-events-none"
              viewBox="0 0 100 1"
              preserveAspectRatio="none"
            >
              <line
                x1="2" y1="0.5" x2="98" y2="0.5"
                stroke="rgba(165,180,252,0.18)" strokeWidth="0.4"
              />
              <line
                x1="2" y1="0.5" x2="98" y2="0.5"
                stroke="url(#flow)" strokeWidth="0.6"
                className="tech-data-flow"
                pathLength={60}
              />
              <defs>
                <linearGradient id="flow" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a5b4fc" />
                </linearGradient>
              </defs>
            </svg>

            <ol className="relative grid gap-6 list-none m-0 p-0 [grid-template-columns:repeat(4,minmax(0,1fr))]">
              {STEPS.map((s, i) => (
                <li
                  key={s.n}
                  className={`relative ${REVEAL_UP_CLS}`}
                  data-stagger={(i % 4) + 1}
                >
                  {/* node circle */}
                  <div className="relative mx-auto mb-6 w-[180px] flex items-center justify-center">
                    <div
                      className="relative w-[180px] h-[180px] rounded-full grid place-items-center"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.4), rgba(11,13,40,0.95) 70%)",
                        boxShadow:
                          "inset 0 0 0 1px rgba(165,180,252,0.35), 0 16px 60px -20px rgba(99,102,241,0.7)",
                      }}
                    >
                      <div
                        aria-hidden="true"
                        className="absolute inset-3 rounded-full border border-dashed border-white/15 tech-orbit-med"
                      />
                      <div className="text-center px-4">
                        <div className="text-[10px] font-bold tracking-[0.28em] text-[#a5b4fc] mb-1">
                          {s.tag}
                        </div>
                        <div className="text-[44px] font-black tracking-[-0.04em] tabular-nums leading-none text-white">
                          {s.n}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center max-w-[260px] mx-auto">
                    <h3 className="text-[16px] font-bold tracking-[-0.01em] text-white m-0 mb-2">
                      {s.title}
                    </h3>
                    <p className="text-[13.5px] leading-[1.6] text-white/60 m-0">
                      {s.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* vertical stacked (tablet / mobile) */}
          <ol className="hidden max-[1080px]:flex flex-col gap-5 list-none m-0 p-0">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className={`relative rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md p-6 flex gap-5 items-start ${REVEAL_UP_CLS}`}
                data-stagger={(i % 4) + 1}
              >
                <div
                  className="flex-none w-[80px] h-[80px] rounded-2xl grid place-items-center"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.45), rgba(11,13,40,0.95) 70%)",
                    boxShadow:
                      "inset 0 0 0 1px rgba(165,180,252,0.35), 0 12px 40px -16px rgba(99,102,241,0.7)",
                  }}
                >
                  <div className="text-center">
                    <div className="text-[9px] font-bold tracking-[0.24em] text-[#a5b4fc]">
                      {s.tag}
                    </div>
                    <div className="text-[26px] font-black tracking-[-0.03em] tabular-nums leading-none text-white">
                      {s.n}
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold tracking-[-0.01em] text-white m-0 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-white/65 m-0">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="relative overflow-hidden bg-[#04061a] text-white py-20 px-6 max-[920px]:py-14 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <div
            className={`relative overflow-hidden rounded-3xl px-10 py-14 max-[920px]:px-7 max-[920px]:py-12 grid items-center gap-8 [grid-template-columns:1.4fr_1fr] max-[920px]:[grid-template-columns:1fr] ${REVEAL_UP_CLS}`}
            style={{
              background:
                "radial-gradient(900px 500px at 0% 50%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(900px 500px at 100% 50%, rgba(34,211,238,0.25), transparent 60%), linear-gradient(135deg, #0b0e36 0%, #0a0c2a 100%)",
              boxShadow:
                "inset 0 0 0 1px rgba(165,180,252,0.18), 0 30px 80px -30px rgba(99,102,241,0.5)",
            }}
          >
            <div aria-hidden="true" className="absolute inset-0 tech-grid-bg opacity-25 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            <div className="relative z-[1]">
              <h2 className="text-[clamp(26px,3.2vw,38px)] font-extrabold tracking-[-0.02em] leading-[1.1] m-0 mb-3">
                Дараагийн тоглолтыг 360°-аар туршаад үзээрэй
              </h2>
              <p className="text-[16px] leading-[1.65] text-white/75 m-0">
                Удахгүй болох арга хэмжээний жагсаалтаас тасалбар авч, өөрийн
                сонгосон өнцгөөр шууд эфирт нэгдээрэй.
              </p>
            </div>
            <div className="relative z-[1] flex flex-wrap gap-3 max-[920px]:justify-start [justify-self:end]">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-full bg-white text-[#05071a] text-[14px] font-bold no-underline px-6 py-3.5 shadow-[0_12px_40px_-14px_rgba(255,255,255,0.7)] hover:-translate-y-0.5 [transition:transform_.18s_ease]"
              >
                Тасалбар авах
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                to="/#contact"
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/15 text-white text-[14px] font-semibold no-underline px-6 py-3.5 hover:bg-white/[0.12] hover:border-white/25 [transition:background_.18s_ease,border-color_.18s_ease]"
              >
                Холбоо барих
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
