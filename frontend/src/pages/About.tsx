import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import useRevealOnScroll from "../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../hooks/_revealCls";

const STATS = [
  { num: "1958", label: "Founded · Байгуулагдсан" },
  { num: "12,500", label: "Seats · Суудал" },
  { num: "25k+", label: "Capacity · Хүлээн авах" },
  { num: "105×68", label: "Field (m) · Талбай" },
];

export default function About() {
  useRevealOnScroll();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="w-full bg-white py-12 px-6 max-[920px]:py-14 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <h1
            className={`text-[42px] font-extrabold tracking-[-0.02em] m-0 mb-10 text-[#1a1a1a] max-[920px]:text-[34px] ${REVEAL_UP_CLS}`}
          >
            Бидний тухай
          </h1>

          <div className="grid gap-10 items-start [grid-template-columns:1.05fr_1fr_1fr] max-[920px]:gap-8 max-[920px]:[grid-template-columns:1fr_1fr] max-[600px]:[grid-template-columns:1fr]">
            <article
              className={`flex flex-col justify-center max-[920px]:[grid-column:1/-1] max-[600px]:[grid-column:auto] ${REVEAL_UP_CLS}`}
              data-stagger="1"
            >
              <h2 className="text-[28px] leading-[1.3] text-ink m-0 mb-[18px] tracking-[-0.01em] font-bold max-[900px]:text-2xl">
                Монголын спортын зүрх — 1958 оноос хойш
              </h2>
              <p className="text-[17px] leading-[1.75] text-ink-soft m-0 max-[900px]:text-base">
                Төв Цэнгэлдэх Хүрээлэн нь 1958 онд байгуулагдсан, Монгол Улсын
                анхны үндэсний хэмжээний цэнгэлдэх. Олон арван жилийн турш
                үндэсний шигшээ багуудын чухал тоглолт, олон улсын тэмцээн,
                томоохон соёлын арга хэмжээний голлох тавцан болж ирсэн. Өнөөдөр
                бид 12,500 суудалтай, 25,000 хүртэлх үзэгчийг хүлээн авах хүчин
                чадалтай орчин үеийн цогцолбор болон өргөжиж, иргэддээ дэлхийн
                жишигт нийцсэн үйлчилгээ хүргэхээр зорьж байна.
              </p>
            </article>

            <div
              className={`w-full grid overflow-hidden bg-[#e9e9e9] text-[#b8b8b8] [aspect-ratio:1/1.05] rounded-[56px] place-items-center ${REVEAL_UP_CLS}`}
              data-stagger="2"
            >
              <img
                src="/assets/images/stadium/exterior.opt.jpg"
                alt="Төв цэнгэлдэх хүрээлэн — гадна талаас"
                className="w-full h-full object-cover object-center block [border-radius:inherit]"
                loading="lazy"
              />
            </div>

            <div
              className={`flex flex-col gap-[14px] [aspect-ratio:1/1.05] ${REVEAL_UP_CLS}`}
              data-stagger="3"
            >
              <div
                className="flex-1 w-full grid cursor-pointer min-h-0 rounded-[28px] bg-[#e9e9e9] place-items-center transition-[background] duration-200 hover:bg-[#e2e2e2]"
                role="button"
                aria-label="Видео тоглуулах"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(15,23,42,0) 40%, rgba(15,23,42,.55) 100%), url('/assets/images/stadium/huuchin.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span className="w-14 h-14 rounded-full bg-ink text-white grid place-items-center [&_svg]:w-[22px] [&_svg]:h-[22px] [&_svg]:ml-[3px]">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
              <p className="text-[17px] font-bold leading-[1.35] m-0 text-[#1a1a1a]">
                Манай түүх, эрхэм зорилго, ирээдүйн төлөвлөгөөтэй танилцана уу.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white pt-8 px-6 pb-14 max-[920px]:pb-16 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto pb-10">
          <div className="grid items-center [grid-template-columns:1fr_auto_1fr_auto_1fr_auto_1fr] gap-[18px] max-[920px]:[grid-template-columns:1fr_1fr] max-[920px]:gap-x-[18px] max-[920px]:gap-y-8 max-[480px]:[grid-template-columns:1fr]">
            {STATS.map((s, i) => (
              <span key={s.num} style={{ display: "contents" }}>
                {i > 0 && (
                  <span
                    className="w-0.5 h-16 bg-brand-blue-tint relative rounded-[1px] justify-self-center max-[920px]:hidden before:content-[''] before:absolute before:left-1/2 before:w-[9px] before:h-[9px] before:rounded-full before:bg-brand-blue-tint before:-translate-x-1/2 before:-top-[5px] after:content-[''] after:absolute after:left-1/2 after:w-[9px] after:h-[9px] after:rounded-full after:bg-brand-blue-tint after:-translate-x-1/2 after:-bottom-[5px]"
                    aria-hidden="true"
                  />
                )}
                <div
                  className={`flex flex-col items-center gap-2.5 text-center ${REVEAL_UP_CLS}`}
                  data-stagger={i + 1}
                >
                  <div className="text-[42px] font-extrabold tracking-[-0.02em] leading-none text-[#1a1a1a] max-[920px]:text-4xl">
                    {s.num}
                  </div>
                  <div className="text-sm text-[#888] font-medium">{s.label}</div>
                </div>
              </span>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
