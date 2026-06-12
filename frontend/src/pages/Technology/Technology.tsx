import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";

const FEATURES = [
  {
    n: "01",
    title: "360° бүрэн зургийн өнцөг",
    desc: "Талбайн дунд байрлуулсан панорам линз нь хэвтээ 360° ба босоо чиглэлд бүтэн дүрсийг бичиж, үзэгчид өөрсдөө хүссэн өнцгөөр харах эрх чөлөөтэй.",
    meta: "Eq. 12K-source · ERP-360 проекц",
  },
  {
    n: "02",
    title: "4 камер · UHD урсгал",
    desc: "Сонгодог гурван тэнхлэгийн өнцөг дээр нэмэлтээр 360° панорам камер ажиллаж, нийт дөрвөн урсгалыг үзэгч зэрэгцүүлэн харна.",
    meta: "3× HD + 1× 360° · H.264/HLS",
  },
  {
    n: "03",
    title: "Доод хоцролттой шууд эфир",
    desc: "AWS IVS дэд бүтцэд тулгуурлан секундын доод хоцролтоор шууд дамжуулж, гар утас, таблет, компьютер дээр жигд тоглоно.",
    meta: "Avg. ~720 мс хоцролт",
  },
  {
    n: "04",
    title: "Интерактив өнцөг сонголт",
    desc: "Үзэгч хулгана, хуруугаараа дэлгэцийг чирэн дурын чиглэлд эргүүлж, өөрийн сонгосон өнцгөөр тоглолтыг үзнэ.",
    meta: "Touch / mouse / gyro",
  },
  {
    n: "05",
    title: "Орон зайн дуу",
    desc: "Талбайн дотор байрлуулсан микрофоны массив нь үзэгчид талбай дээр сууж буй мэт мэдрэмжийг бүрдүүлэх орон зайн дууг бичнэ.",
    meta: "Ambisonic · 4-сувгийн микс",
  },
  {
    n: "06",
    title: "Нөхөж үзэх (VOD)",
    desc: "Шууд эфир дуусахад VOD горимд автоматаар архивлагдаж, нөхөж үзэх тасалбартай үзэгч хүссэн үедээ үзнэ.",
    meta: "HLS · 72 цагийн доторх онлайн архив",
  },
];

const PIPELINE = [
  {
    n: "01",
    label: "CAPTURE",
    title: "Талбайн дунд камерын суурилуулалт",
    desc: "Мэргэжлийн баг тоглолтын өмнө талбайн стратегийн цэгүүдэд 4 камерыг байршуулна. Нэг нь панорам (360°) линз бүхий гол камер.",
    spec: "4× камер · 1× 360° бүрэлдэхүүн",
  },
  {
    n: "02",
    label: "INGEST",
    title: "AWS IVS-руу шууд дамжуулалт",
    desc: "Камер бүрийн дүрсийг бодит цаг хугацаанд кодлоод AWS Interactive Video Service-руу хэт бага хоцролттой push хийнэ.",
    spec: "RTMP → IVS · adaptive bitrate",
  },
  {
    n: "03",
    label: "RENDER",
    title: "Браузерт WebGL рендер",
    desc: "Three.js ашиглан 360° дүрсийг бөмбөрцөг гадарга дээр буулгаж, хэрэглэгчийн харах өнцгийг бодит цагт renderлэнэ.",
    spec: "Three.js · WebGL2 · 60fps target",
  },
  {
    n: "04",
    label: "REPLAY",
    title: "VOD горимд автомат архив",
    desc: "Шууд эфир дуусмагц бичлэг HLS форматаар хадгалагдаж, нөхөж үзэх тасалбартай үзэгч хүссэн үедээ үзнэ.",
    spec: "HLS · S3 архив · 72 цаг онлайн",
  },
];

const TECH_STYLE = `
  @keyframes techDot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  @keyframes techSweep {
    0%   { transform: rotate(0deg);   opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { transform: rotate(360deg); opacity: 0; }
  }
  @keyframes techDash { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
  .tech-dot     { animation: techDot 1.8s ease-in-out infinite; }
  .tech-sweep   { transform-origin: 50% 50%; animation: techSweep 7s linear infinite; }
  .tech-dash    { stroke-dasharray: 4 4; animation: techDash 1.6s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .tech-dot, .tech-sweep, .tech-dash { animation: none !important; }
  }
`;

const PAGE_BG = "bg-[#0b0c10]";
const SECTION_PAD = "py-28 px-6 max-[920px]:py-20 max-[920px]:px-5";

const KICKER_CLS =
  "inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55 [&_.bar]:inline-block [&_.bar]:w-6 [&_.bar]:h-px [&_.bar]:bg-white/30";

const SECTION_INDEX_CLS =
  "text-[11px] font-mono font-medium tracking-[0.2em] text-white/40 tabular-nums";

const RULE_CLS = "border-t border-white/10";

export default function Technology() {
  useRevealOnScroll();

  return (
    <div className={`min-h-screen ${PAGE_BG} text-white selection:bg-white selection:text-[#0b0c10]`}>
      <style dangerouslySetInnerHTML={{ __html: TECH_STYLE }} />
      <SiteHeader />

      {/* ───────────── HERO ───────────── */}
      <section className={`relative overflow-hidden ${PAGE_BG} ${SECTION_PAD} pt-16 max-[920px]:pt-12`}>
        {/* faint engineering grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse at 50% 40%, black, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black, transparent 70%)",
          }}
        />

        <div className="relative max-w-screen-page mx-auto">
          {/* magazine-style header bar */}
          <div className={`flex items-center justify-between mb-12 ${REVEAL_UP_CLS}`} data-stagger="1">
            <div className={KICKER_CLS}>
              <span className="bar" />
              Vol.01 — Технологийн дэвшил
            </div>
            <div className={SECTION_INDEX_CLS}>
              ※ 360° / LIVE / WEBGL
            </div>
          </div>
          <div className={RULE_CLS} />

          <div className="grid items-end gap-16 mt-12 [grid-template-columns:1.15fr_1fr] max-[1080px]:[grid-template-columns:1fr] max-[1080px]:gap-12">
            {/* LEFT — typographic */}
            <div>
              <h1
                className={`font-extrabold tracking-[-0.035em] leading-[0.94] m-0 ${REVEAL_UP_CLS}`}
                data-stagger="2"
                style={{ fontSize: "clamp(48px, 7vw, 96px)" }}
              >
                Талбайн<br />
                <span className="italic font-light text-white/70">дунд&nbsp;байгаа</span>{" "}
                <span className="inline-flex items-baseline">
                  <span>камер.</span>
                </span>
                <br />
                Үзэгч бүрд{" "}
                <span className="relative inline-block">
                  өөрийн өнцөг.
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-1 h-[2px] bg-white/80"
                  />
                </span>
              </h1>

              <p
                className={`mt-10 max-w-[560px] text-[16.5px] leading-[1.7] text-white/65 m-0 ${REVEAL_UP_CLS}`}
                data-stagger="3"
              >
                Төв Цэнгэлдэх Хүрээлэн анх удаа Монголд нэвтрүүлж буй 360° камер
                ба бага хоцролттой шууд дамжуулалтын платформ. Үзэгч нь зөвхөн
                дамжуулагчийн сонгосон өнцгөөр биш, өөрийн хүссэн чиглэлд харах
                эрх чөлөөтэй.
              </p>

              <div className={`flex flex-wrap items-center gap-5 mt-10 ${REVEAL_UP_CLS}`} data-stagger="4">
                <Link
                  to="/events"
                  className="group inline-flex items-center gap-3 rounded-none bg-white text-[#0b0c10] text-[13.5px] font-semibold no-underline px-6 py-4 [transition:transform_.18s_ease,background_.18s_ease] hover:bg-white/90"
                >
                  Удахгүй болох тоглолтууд
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="[transition:transform_.18s_ease] group-hover:translate-x-1">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
                <a
                  href="#pipeline"
                  className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-white/80 no-underline border-b border-white/30 pb-1 hover:text-white hover:border-white [transition:color_.15s_ease,border-color_.15s_ease]"
                >
                  Хэрхэн ажилладагийг үзэх
                </a>
              </div>
            </div>

            {/* RIGHT — 360° camera visual with editorial framing */}
            <div className={`relative ${REVEAL_UP_CLS}`} data-stagger="3">
              <Camera360Visual />
              <div className="mt-4 flex items-center justify-between text-[10.5px] font-mono uppercase tracking-[0.2em] text-white/40">
                <span>FIG. 01 — Insta360 X-series · Dual-fisheye</span>
                <span>8K · 30fps</span>
              </div>
            </div>
          </div>

          {/* ledger-style inline stats */}
          <div className={`mt-20 ${REVEAL_UP_CLS}`} data-stagger="4">
            <div className={RULE_CLS} />
            <dl className="grid [grid-template-columns:repeat(4,minmax(0,1fr))] max-[760px]:[grid-template-columns:repeat(2,minmax(0,1fr))]">
              {[
                { v: "360", u: "°", l: "Бүрэн өнцөг" },
                { v: "4", u: "ch", l: "Зэрэгцээ урсгал" },
                { v: "4K", u: "", l: "UHD чанар" },
                { v: "~720", u: "ms", l: "Дундаж хоцролт" },
              ].map((s, i) => (
                <div
                  key={s.l}
                  className={`py-7 px-1 ${i !== 0 ? "border-l border-white/10 max-[760px]:border-l-0" : ""} ${i >= 2 ? "max-[760px]:border-t max-[760px]:border-white/10" : ""} ${i === 2 ? "max-[760px]:border-l max-[760px]:border-white/10" : ""}`}
                >
                  <dt className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-white/40 mb-3">
                    {s.l}
                  </dt>
                  <dd className="m-0 flex items-baseline gap-1">
                    <span
                      className="font-extrabold tracking-[-0.04em] tabular-nums leading-none text-white"
                      style={{ fontSize: "clamp(40px, 4.6vw, 64px)" }}
                    >
                      {s.v}
                    </span>
                    {s.u && (
                      <span className="text-[16px] font-medium text-white/45 tabular-nums">
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
      <section className={`relative ${PAGE_BG} ${SECTION_PAD}`}>
        <div className="relative max-w-screen-page mx-auto">
          <div className={`grid gap-12 [grid-template-columns:340px_1fr] max-[920px]:[grid-template-columns:1fr] max-[920px]:gap-8 mb-16 ${REVEAL_UP_CLS}`} data-stagger="1">
            <div>
              <div className={`${KICKER_CLS} mb-6`}>
                <span className="bar" />
                §02 · Онцлог
              </div>
              <h2
                className="font-extrabold tracking-[-0.03em] leading-[1.02] m-0"
                style={{ fontSize: "clamp(34px, 4.4vw, 56px)" }}
              >
                Юу нь өөр вэ?
              </h2>
            </div>
            <p className="text-[16.5px] leading-[1.75] text-white/65 m-0 max-w-[640px] [align-self:end]">
              Сонгодог нэг өнцгийн дамжуулалт нь дамжуулагчийн сонгосон харагдацыг
              хязгаарладаг. Энд харин үзэгч өөрөө талбайн дотор зогсож буй мэт,
              өөрийн хүссэн чиглэлд эргэн харах эрхтэй. Доорхи зургаан зүйл нь
              энэ системийг өмнөх загвараас ялгана.
            </p>
          </div>

          <div className={RULE_CLS} />
          <div className="grid [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:[grid-template-columns:1fr]">
            {FEATURES.map((f, i) => (
              <article
                key={f.n}
                className={`relative px-1 py-9 ${i % 2 === 0 ? "[border-right:1px_solid_rgba(255,255,255,0.10)] max-[760px]:[border-right:none] pr-10 max-[920px]:pr-6" : "pl-10 max-[920px]:pl-6 max-[760px]:pl-1"} ${i > 1 ? "border-t border-white/10" : ""} ${i === 1 ? "max-[760px]:border-t max-[760px]:border-white/10" : ""} ${REVEAL_UP_CLS}`}
                data-stagger={(i % 2) + 1}
              >
                <div className="flex items-baseline justify-between mb-4 gap-4">
                  <span className="text-[11px] font-mono tracking-[0.2em] text-white/45">
                    № {f.n}
                  </span>
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-white/35 text-right">
                    {f.meta}
                  </span>
                </div>
                <h3 className="text-[22px] font-bold tracking-[-0.018em] leading-[1.2] text-white m-0 mb-3 max-w-[420px]">
                  {f.title}
                </h3>
                <p className="text-[15px] leading-[1.7] text-white/65 m-0 max-w-[520px]">
                  {f.desc}
                </p>
              </article>
            ))}
          </div>
          <div className={RULE_CLS} />
        </div>
      </section>

      {/* ───────────── PIPELINE (technical timeline) ───────────── */}
      <section id="pipeline" className={`relative ${PAGE_BG} ${SECTION_PAD}`}>
        <div className="relative max-w-screen-page mx-auto">
          <div className={`grid gap-12 [grid-template-columns:340px_1fr] max-[920px]:[grid-template-columns:1fr] max-[920px]:gap-8 mb-16 ${REVEAL_UP_CLS}`} data-stagger="1">
            <div>
              <div className={`${KICKER_CLS} mb-6`}>
                <span className="bar" />
                §03 · Pipeline
              </div>
              <h2
                className="font-extrabold tracking-[-0.03em] leading-[1.02] m-0"
                style={{ fontSize: "clamp(34px, 4.4vw, 56px)" }}
              >
                Камераас<br />дэлгэц хүртэл
              </h2>
            </div>
            <p className="text-[16.5px] leading-[1.75] text-white/65 m-0 max-w-[640px] [align-self:end]">
              Талбайд байршуулсан камераас гар утсан дээрх дэлгэц хүртэл дүрс
              хэрхэн дамжих вэ — дөрвөн алхамын техникийн товчоо.
            </p>
          </div>

          {/* Timeline: index column + content column with hairlines and connector */}
          <ol className="relative list-none m-0 p-0">
            <div className={RULE_CLS} />
            {PIPELINE.map((s) => (
              <li
                key={s.n}
                className={`relative grid items-start gap-10 [grid-template-columns:200px_1fr_220px] max-[1080px]:[grid-template-columns:140px_1fr] max-[1080px]:gap-6 max-[760px]:[grid-template-columns:1fr] py-10 border-b border-white/10 ${REVEAL_UP_CLS}`}
                data-stagger="1"
              >
                {/* index */}
                <div className="flex items-start gap-4">
                  <span
                    className="font-extrabold tabular-nums tracking-[-0.04em] leading-none text-white"
                    style={{ fontSize: "clamp(56px, 5.6vw, 80px)" }}
                  >
                    {s.n}
                  </span>
                  <span className="mt-2 text-[10.5px] font-mono uppercase tracking-[0.24em] text-white/45 max-[760px]:mt-1">
                    {s.label}
                  </span>
                </div>

                {/* content */}
                <div>
                  <h3 className="text-[24px] font-bold tracking-[-0.018em] leading-[1.2] text-white m-0 mb-3 max-w-[560px]">
                    {s.title}
                  </h3>
                  <p className="text-[15px] leading-[1.7] text-white/65 m-0 max-w-[640px]">
                    {s.desc}
                  </p>
                </div>

                {/* spec */}
                <div className="text-right max-[1080px]:hidden">
                  <div className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-white/35 mb-2">
                    Spec
                  </div>
                  <div className="text-[12.5px] font-mono text-white/65 leading-[1.6]">
                    {s.spec}
                  </div>
                </div>
                <div className="hidden max-[1080px]:block max-[760px]:mt-1 text-[11px] font-mono text-white/45">
                  {s.spec}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── CTA ───────────── */}
      <section className={`relative ${PAGE_BG} pb-28 px-6 pt-12 max-[920px]:pb-20 max-[920px]:px-5`}>
        <div className="relative max-w-screen-page mx-auto">
          <div className={`grid items-end gap-10 [grid-template-columns:1.3fr_1fr] max-[920px]:[grid-template-columns:1fr] ${REVEAL_UP_CLS}`}>
            <h2
              className="font-extrabold tracking-[-0.035em] leading-[0.98] m-0"
              style={{ fontSize: "clamp(38px, 5.4vw, 72px)" }}
            >
              Дараагийн тоглолтыг{" "}
              <span className="italic font-light text-white/65">360°-аар</span>{" "}
              туршаад үзээрэй.
            </h2>
            <div className="flex flex-wrap gap-5 items-center [justify-self:end] max-[920px]:[justify-self:start]">
              <Link
                to="/events"
                className="group inline-flex items-center gap-3 bg-white text-[#0b0c10] text-[13.5px] font-semibold no-underline px-6 py-4 hover:bg-white/90 [transition:background_.15s_ease]"
              >
                Тасалбар авах
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="[transition:transform_.18s_ease] group-hover:translate-x-1">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                to="/#contact"
                className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-white/80 no-underline border-b border-white/30 pb-1 hover:text-white hover:border-white [transition:color_.15s_ease,border-color_.15s_ease]"
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

/* ───────────── 360° camera visual (illustration + annotations) ───────────── */
/* To swap in a real photograph, drop a file at /public/assets/images/tech/camera-360.png
   and the <img> tag below will overlay the SVG illustration. */
function Camera360Visual() {
  return (
    <figure className="relative w-full aspect-[4/3] m-0 border border-white/10 bg-[#0e1015] overflow-hidden">
      {/* corner tick marks */}
      {[
        "top-2 left-2 border-l border-t",
        "top-2 right-2 border-r border-t",
        "bottom-2 left-2 border-l border-b",
        "bottom-2 right-2 border-r border-b",
      ].map((c) => (
        <span key={c} aria-hidden="true" className={`absolute w-3 h-3 border-white/30 ${c}`} />
      ))}

      {/* faint engineering grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.6] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at 50% 55%, transparent 18%, black 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 55%, transparent 18%, black 70%)",
        }}
      />

      {/* SVG illustration of an Insta360-style camera */}
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 w-full h-full"
        aria-label="360° панорам камер"
      >
        <defs>
          {/* body metal */}
          <linearGradient id="cam-body" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#1c1f27" />
            <stop offset="42%"  stopColor="#2c3140" />
            <stop offset="58%"  stopColor="#2c3140" />
            <stop offset="100%" stopColor="#15171d" />
          </linearGradient>
          {/* body top-edge highlight */}
          <linearGradient id="cam-bezel" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
            <stop offset="40%"  stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          {/* lens dome glass */}
          <radialGradient id="cam-lens" cx="35%" cy="30%" r="80%">
            <stop offset="0%"   stopColor="#3a4566" />
            <stop offset="35%"  stopColor="#171b2a" />
            <stop offset="70%"  stopColor="#0a0c14" />
            <stop offset="100%" stopColor="#05060c" />
          </radialGradient>
          {/* lens inner iris */}
          <radialGradient id="cam-iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1a2240" />
            <stop offset="65%"  stopColor="#070a18" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
          {/* lens specular highlight */}
          <radialGradient id="cam-highlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.85)" />
            <stop offset="60%"  stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          {/* soft shadow under camera */}
          <radialGradient id="cam-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0.75)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* drop shadow on floor */}
        <ellipse cx="200" cy="270" rx="78" ry="8" fill="url(#cam-shadow)" />

        {/* CAMERA BODY (vertical) */}
        <g>
          {/* main body */}
          <rect
            x="168" y="62" width="64" height="208" rx="14"
            fill="url(#cam-body)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"
          />
          {/* top bevel highlight */}
          <rect x="168" y="62" width="64" height="30" rx="14" fill="url(#cam-bezel)" />

          {/* power button (side) */}
          <rect x="230" y="135" width="3" height="14" rx="1.5" fill="#0a0c14" />
          <rect x="230" y="135" width="3" height="14" rx="1.5" fill="rgba(255,255,255,0.06)" />

          {/* top REC LED */}
          <circle cx="200" cy="78" r="2.4" fill="#22c55e" className="tech-dot" />
          <circle cx="200" cy="78" r="4.5" fill="none" stroke="rgba(34,197,94,0.35)" strokeWidth="0.5" />

          {/* lens hood ring */}
          <circle cx="200" cy="148" r="46" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" />
          <circle cx="200" cy="148" r="44" fill="#0c0e16" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />

          {/* lens dome glass */}
          <circle cx="200" cy="148" r="40" fill="url(#cam-lens)" />
          {/* outer iris ring */}
          <circle cx="200" cy="148" r="32" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          {/* iris */}
          <circle cx="200" cy="148" r="28" fill="url(#cam-iris)" />
          {/* aperture blades hint */}
          <circle cx="200" cy="148" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
          <circle cx="200" cy="148" r="14" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
          <circle cx="200" cy="148" r="6" fill="#05060c" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
          {/* specular highlight */}
          <ellipse cx="186" cy="134" rx="14" ry="9" fill="url(#cam-highlight)" />
          {/* tiny pinpoint */}
          <circle cx="183" cy="131" r="1.4" fill="rgba(255,255,255,0.9)" />

          {/* lens label engraving */}
          <text x="200" y="200" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="6" letterSpacing="2" fill="rgba(255,255,255,0.32)">
            360° · ƒ/1.9
          </text>

          {/* status mini-screen */}
          <rect x="180" y="216" width="40" height="26" rx="3"
            fill="#06070d" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />
          <text x="200" y="234" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8.5" letterSpacing="1.5" fontWeight="700" fill="#ffffff">
            REC
          </text>

          {/* tripod thread */}
          <rect x="190" y="266" width="20" height="6" rx="1.5"
            fill="#0a0c14" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" />
          <line x1="194" y1="269" x2="206" y2="269" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
        </g>

        {/* leader lines from labels to camera parts */}
        <g stroke="rgba(255,255,255,0.28)" strokeWidth="0.5" fill="none">
          {/* top-left LED */}
          <path d="M 60 70  L 130 70  L 195 78" />
          <circle cx="60"  cy="70" r="1.5" fill="rgba(255,255,255,0.6)" />
          {/* top-right 8K */}
          <path d="M 340 70  L 270 70  L 232 96" />
          <circle cx="340" cy="70" r="1.5" fill="rgba(255,255,255,0.6)" />
          {/* mid-left dual lens */}
          <path d="M 60 140  L 130 140  L 160 148" />
          <circle cx="60"  cy="140" r="1.5" fill="rgba(255,255,255,0.6)" />
          {/* mid-right aperture */}
          <path d="M 340 148  L 280 148  L 245 148" />
          <circle cx="340" cy="148" r="1.5" fill="rgba(255,255,255,0.6)" />
          {/* bottom-left screen */}
          <path d="M 60 232  L 130 232  L 180 229" />
          <circle cx="60"  cy="232" r="1.5" fill="rgba(255,255,255,0.6)" />
          {/* bottom-right mount */}
          <path d="M 340 268  L 270 268  L 215 268" />
          <circle cx="340" cy="268" r="1.5" fill="rgba(255,255,255,0.6)" />
        </g>

        {/* axis tag */}
        <text x="8" y="14" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.35)">
          FIG. 01
        </text>
      </svg>

      {/* OPTIONAL: real photograph overlay — drop image at this path to override the illustration.
          The <img> simply won't render if the file is missing (broken-image hidden). */}
      <img
        src="/assets/images/tech/camera-360.png"
        alt=""
        aria-hidden="true"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        className="absolute inset-0 w-full h-full object-contain p-8 pointer-events-none"
      />

      {/* HTML callouts (crisp text, positioned to leader endpoints) */}
      <Callout cls="left-[4%] top-[18%]"  label="REC LED" note="Live indicator" align="left" />
      <Callout cls="right-[4%] top-[18%]" label="8K · UHD" note="30 / 60 fps"     align="right" />
      <Callout cls="left-[4%] top-[44%]"  label="DUAL LENS" note="Front + rear"   align="left" />
      <Callout cls="right-[4%] top-[44%]" label="ƒ/1.9"     note="200° FOV"       align="right" />
      <Callout cls="left-[4%] top-[74%]"  label="OLED"      note="Status screen"  align="left" />
      <Callout cls="right-[4%] top-[88%]" label="1/4″ — 20" note="Mount thread"   align="right" />

      {/* LIVE recording badge — top centre */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-2.5 py-1 border border-white/15 bg-black/40 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 tech-dot" />
        <span className="text-[9.5px] font-mono uppercase tracking-[0.24em] text-white/85">
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
    <div className={`absolute ${cls} max-w-[120px] ${align === "right" ? "text-right" : "text-left"}`}>
      <div className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-white font-semibold">
        {label}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/45 mt-0.5">
        {note}
      </div>
    </div>
  );
}
