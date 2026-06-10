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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="M16 10l5-3v10l-5-3z" />
      </svg>
    ),
  },
  {
    title: "Доод хоцролттой шууд эфир",
    desc: "AWS IVS дэд бүтцэд тулгуурлан секундын доод хоцролтоор шууд дамжуулах ба гар утас, таблет, компьютер дээр жигд тоглоно.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V6l9-3v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="15" cy="16" r="3" />
      </svg>
    ),
  },
  {
    title: "Архив ба нөхөж үзэх",
    desc: "Шууд эфир дуусахад VOD горимоор архивлагдаж, нөхөж үзэх тасалбартай үзэгчид хүссэн үедээ тоглолтоо буцаан үзэх боломжтой.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    desc: "Тоглолт болохоос өмнө мэргэжлийн багийн гишүүд талбайн стратегийн цэгүүдэд 4 камер байршуулна. Тэдгээрийн нэг нь панорам (360°) линз бүхий гол камер байна.",
  },
  {
    n: "02",
    title: "AWS IVS-руу шууд дамжуулалт",
    desc: "Камер бүрийн дүрсийг кодлоод AWS Interactive Video Service-руу хэт бага хоцролттой дамжуулна. Платформ нь дүрсийг хэрэглэгчийн төхөөрөмжид зориулж зэрэгцээ чанарын урсгал болгон бэлдэнэ.",
  },
  {
    n: "03",
    title: "Браузерт WebGL рендер",
    desc: "Веб дээр Three.js ашиглан 360° дүрсийг бөмбөрцөг гадарга дээр буулгаж, хэрэглэгчийн харах өнцгийг бодит цаг хугацаанд бууруулна.",
  },
  {
    n: "04",
    title: "Архив ба нөхөж үзэх",
    desc: "Шууд эфир дуусмагц бичлэг автоматаар HLS форматаар архивлагдаж, нөхөж үзэх тасалбартай үзэгч багц өдрийн дотор хүссэн үедээ үзнэ.",
  },
];

export default function Technology() {
  useRevealOnScroll();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="relative overflow-hidden bg-brand-blue-darker text-white py-20 px-6 max-[920px]:py-16 max-[920px]:px-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(34,48,198,0.45), transparent 55%), radial-gradient(circle at 75% 80%, rgba(99,102,241,0.4), transparent 55%)",
          }}
        />
        <div className="max-w-screen-page mx-auto relative z-[1] grid items-center gap-12 [grid-template-columns:1.1fr_1fr] max-[920px]:[grid-template-columns:1fr]">
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.18em] mb-6 ${REVEAL_UP_CLS}`}
              data-stagger="1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Технологийн дэвшил
            </span>
            <h1
              className={`text-[clamp(34px,5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.02em] m-0 mb-5 ${REVEAL_UP_CLS}`}
              data-stagger="2"
            >
              360° камерын шууд эфирийн платформ
            </h1>
            <p
              className={`text-[17px] leading-[1.65] text-white/80 m-0 mb-8 max-w-[640px] ${REVEAL_UP_CLS}`}
              data-stagger="3"
            >
              Төв Цэнгэлдэх Хүрээлэн анх удаа Монголд нэвтрүүлж буй 360° камер
              ба бага хоцролттой шууд дамжуулалтын шинэ систем нь үзэгч бүрд
              талбайд сууж буй мэт мэдрэмжийг гэрээсээ авах боломжийг олгоно.
            </p>
            <div
              className={`inline-flex gap-3 ${REVEAL_UP_CLS}`}
              data-stagger="4"
            >
              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-full bg-white text-brand-blue-darker text-[14px] font-semibold no-underline px-5 py-3 transition-transform hover:-translate-y-px"
              >
                Удахгүй болох тоглолтууд
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 text-white text-[14px] font-semibold no-underline px-5 py-3 hover:bg-white/15"
              >
                Хэрхэн ажилладаг вэ?
              </a>
            </div>
          </div>
          <div
            className={`relative aspect-[4/3] rounded-3xl overflow-hidden ring-1 ring-white/15 bg-black/30 ${REVEAL_UP_CLS}`}
            data-stagger="3"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(34,48,198,0.35), transparent 70%), conic-gradient(from 0deg, rgba(255,255,255,0.05), rgba(34,48,198,0.25), rgba(99,102,241,0.18), rgba(255,255,255,0.05))",
              }}
            />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 border border-white/20 mb-4">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <ellipse cx="12" cy="12" rx="9" ry="3.5" />
                    <path d="M3 12c4 4 14 4 18 0" />
                  </svg>
                </div>
                <div className="text-[28px] font-extrabold tracking-[-0.02em]">
                  360°
                </div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/60 mt-1">
                  Live · 4K · WebGL
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 px-6 max-[920px]:py-16 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <div
            className={`max-w-[760px] mb-12 ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <span className="inline-block text-[12px] font-bold uppercase tracking-[0.18em] text-brand-blue mb-3">
              Онцлог
            </span>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.015em] leading-[1.1] text-ink m-0 mb-3">
              Юу нь өөр вэ?
            </h2>
            <p className="text-[16px] leading-[1.65] text-ink-soft m-0">
              Сонгодог нэг өнцгийн дамжуулалтаас ялгарах олон давуу талтай.
              Үзэгч нь зөвхөн дамжуулагчийн сонгосон өнцгөөр биш, тоглолтын дур
              зоргын өнцөг рүү харах эрх чөлөөтэй.
            </p>
          </div>

          <div className="grid gap-5 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[920px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[600px]:[grid-template-columns:1fr]">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className={`rounded-2xl bg-surface-1 border border-[rgba(31,41,55,0.06)] p-6 transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_-16px_rgba(31,41,55,0.18)] hover:border-[rgba(34,48,198,0.25)] ${REVEAL_UP_CLS}`}
                data-stagger={(i % 3) + 1}
              >
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-blue-tint text-brand-blue mb-4 [&_svg]:w-5 [&_svg]:h-5">
                  {f.icon}
                </div>
                <h3 className="text-[17px] font-bold tracking-[-0.01em] text-ink m-0 mb-2">
                  {f.title}
                </h3>
                <p className="text-[14.5px] leading-[1.6] text-ink-soft m-0">
                  {f.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="bg-surface-1 py-20 px-6 max-[920px]:py-16 max-[920px]:px-5"
      >
        <div className="max-w-screen-page mx-auto">
          <div
            className={`max-w-[760px] mb-12 ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <span className="inline-block text-[12px] font-bold uppercase tracking-[0.18em] text-brand-blue mb-3">
              Хэрхэн ажилладаг
            </span>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.015em] leading-[1.1] text-ink m-0 mb-3">
              Камераас дэлгэц хүртэлх замнал
            </h2>
            <p className="text-[16px] leading-[1.65] text-ink-soft m-0">
              Талбайд байршуулсан камераас гар утсан дээрх дэлгэц хүртэл дүрс
              хэрхэн дамжих вэ — дөрвөн алхамаар.
            </p>
          </div>

          <ol className="grid gap-5 list-none m-0 p-0 [grid-template-columns:repeat(4,minmax(0,1fr))] max-[920px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[600px]:[grid-template-columns:1fr]">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className={`relative rounded-2xl bg-white border border-[rgba(31,41,55,0.06)] p-6 ${REVEAL_UP_CLS}`}
                data-stagger={(i % 4) + 1}
              >
                <div className="text-[36px] font-extrabold tracking-[-0.02em] text-brand-blue leading-none mb-3 tabular-nums">
                  {s.n}
                </div>
                <h3 className="text-[16px] font-bold tracking-[-0.01em] text-ink m-0 mb-2">
                  {s.title}
                </h3>
                <p className="text-[14px] leading-[1.6] text-ink-soft m-0">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white py-20 px-6 max-[920px]:py-16 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <div
            className={`rounded-3xl bg-brand-blue-darker text-white px-10 py-14 max-[920px]:px-7 max-[920px]:py-12 grid items-center gap-8 [grid-template-columns:1.4fr_1fr] max-[920px]:[grid-template-columns:1fr] ${REVEAL_UP_CLS}`}
          >
            <div>
              <h2 className="text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.015em] leading-[1.1] m-0 mb-3">
                Дараагийн тоглолтыг 360°-аар туршаад үзээрэй
              </h2>
              <p className="text-[16px] leading-[1.6] text-white/80 m-0">
                Удахгүй болох арга хэмжээний жагсаалтаас тасалбар авч, өөрийн
                сонгосон өнцгөөр шууд эфирт нэгдээрэй.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 max-[920px]:justify-start [justify-self:end]">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-full bg-white text-brand-blue-darker text-[14px] font-semibold no-underline px-5 py-3 hover:-translate-y-px transition-transform"
              >
                Тасалбар авах
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                to="/#contact"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 text-white text-[14px] font-semibold no-underline px-5 py-3 hover:bg-white/15"
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
