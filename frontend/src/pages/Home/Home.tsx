import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import StoryVideo from "../../components/StoryVideo";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import useSmoothAnchors from "../../hooks/useSmoothAnchors";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";
import { useGatedNavigate } from "../../auth";
import { getHomeContent, listEvents } from "../../data/store";
import type {
  EventRecord,
  HeroImage,
  HomeContent,
  MemberItem,
  NewsItem,
  Partner,
  RoadmapItem,
} from "../../data/store";

const EMPTY_CONTENT: HomeContent = {
  news: [],
  partners: [],
  roadmap: [],
  members: [],
  hero: [],
};

const HOME_CONTENT_CACHE_KEY = "cs360:home:content";
const HOME_EVENTS_CACHE_KEY = "cs360:home:events";

function readCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function Home() {
  useRevealOnScroll();
  useSmoothAnchors();
  const gatedGo = useGatedNavigate();

  // Hydrate from sessionStorage so re-visits paint instantly with no layout
  // shift; the background fetch still runs to refresh.
  const [events, setEvents] = useState<EventRecord[]>(() =>
    readCache<EventRecord[]>(HOME_EVENTS_CACHE_KEY, []),
  );
  const [content, setContent] = useState<HomeContent>(() =>
    readCache<HomeContent>(HOME_CONTENT_CACHE_KEY, EMPTY_CONTENT),
  );

  useEffect(() => {
    let alive = true;
    Promise.all([listEvents(), getHomeContent()]).then(([evts, c]) => {
      if (!alive) return;
      setEvents(evts);
      setContent(c);
      writeCache(HOME_EVENTS_CACHE_KEY, evts);
      writeCache(HOME_CONTENT_CACHE_KEY, c);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <FeaturedNewsHero items={content.news} />
      <Highlights />
      <Stats />
      <Upcoming gatedGo={gatedGo} events={events} />
      <Members items={content.members} />
      <Partners items={content.partners} />
      <Roadmap items={content.roadmap} />
      <News items={content.news} />
      <SiteFooter />
    </>
  );
}

const EMPTY_HERO_TILES: HeroImage[] = [
  { slot: "tile1", image_url: "", alt: "" },
  { slot: "tile2", image_url: "", alt: "" },
  { slot: "tile3", image_url: "", alt: "" },
  { slot: "tile4", image_url: "", alt: "" },
];

const DEFAULT_MEMBERS: MemberItem[] = [
  {
    id: "svc-1",
    iconKey: "music",
    title: "Тоглолт, арга хэмжээ, талбайн түрээс",
    desc: "«Төв Цэнгэлдэх Хүрээлэн» ХХК нь үндэсний болон олон улсын томоохон арга хэмжээ, тоглолт зохион байгуулах, талбай түрээслүүлэх үйлчилгээг иргэд, байгууллагуудад хүргэдэг.",
    href: "/events",
  },
  {
    id: "svc-2",
    iconKey: "doc",
    title: "Хууль, эрх зүй",
    desc: "Иргэн, байгууллагын эрх зүйн асуудал, манай үйл ажиллагаатай холбоотой хууль, дүрэм, журамтай танилцана уу.",
    href: "#",
  },
  {
    id: "svc-3",
    iconKey: "news",
    title: "Мэдээ, мэдээлэл",
    desc: "Манай байгууллагын үйл ажиллагаа, удахгүй болох арга хэмжээ, шинэ мэдээллийг эндээс цаг алдалгүй авах боломжтой.",
    href: "#",
  },
  {
    id: "svc-4",
    iconKey: "chat",
    title: "Холбоо барих, санал хүсэлт",
    desc: "Та санал, шүүмж, талархал болон өрөнхий чиглэлийн асуултаар бидэнд илгээж, шуурхай хариу авах боломжтой.",
    href: "#",
  },
  {
    id: "svc-5",
    iconKey: "stream",
    badge: "Live",
    title: "360° Шууд дамжуулалт",
    desc: "Цэнгэлдэх болж буй тоглолт, тэмцээн, арга хэмжээг 360° форматаар манай вэбсайтаас шууд үзэх боломжтой — танхимд байгаа мэт мэдрэж.",
    href: "/watch",
  },
  {
    id: "svc-6",
    iconKey: "stadium",
    title: "Төв Цэнгэлдэх Хүрээлэн",
    desc: "1958 онд байгуулагдсан, 12,500 суудалтай, 25,000 хүртэлх үзэгчийг хүлээн авах хүчин чадалтай Монгол Улсын анхдагч цогцолбор. Спорт, соёл, олон нийтийн арга хэмжээний голлох тавцан.",
    href: "/about",
  },
];

function Hero({
  gatedGo,
  images,
}: {
  gatedGo: (to: string) => void;
  images: HeroImage[];
}) {
  const tiles = [...images, ...EMPTY_HERO_TILES].slice(0, 4);
  return (
    <section
      className="w-full bg-surface-1 py-14 px-6 max-[920px]:px-5"
      id="top"
    >
      <div className="max-w-screen-page mx-auto grid items-center gap-8 max-[920px]:gap-9 [grid-template-columns:50%_50%] max-[920px]:[grid-template-columns:1fr]">
        <div className={`flex flex-col items-start ${REVEAL_UP_CLS}`}>
          <span className="inline-flex items-center gap-2 bg-brand-blue-tint rounded-full text-[13px] font-medium tracking-[0.01em] text-[#1a1a1a] py-1.5 pl-2.5 pr-[14px]">
            <span
              className="w-2.5 h-2.5 bg-brand-blue rounded-sm inline-block"
              aria-hidden="true"
            ></span>
            Тавтай морилно уу &middot; 1958 оноос
          </span>

          <h1 className="mt-5 mb-0 text-[46px] leading-[1.15] font-extrabold tracking-[-0.02em] max-w-[620px] text-[#1a1a1a] max-[920px]:text-4xl max-[480px]:text-3xl">
            Соёлын{" "}
            <span className="text-brand-blue italic font-extrabold">зүрх</span>
            <br />
            Монголын спорт
            <br />
            Төв Цэнгэлдэх Хүрээлэн
          </h1>

          <p className="mt-4 mb-0 text-[15px] leading-[1.6] max-w-[420px] text-[#666666]">
            Улаанбаатарын төвд, дэлхийн жишигт нийцсэн арга хэмжээ, сэтгэл
            хөдөлгөм тоглолт, мартагдашгүй мөчүүдийг 360° форматаар манай
            вэбсайтаас хаанаас ч шууд үзээрэй.
          </p>

          <div className="mt-7 flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2.5 bg-brand-blue text-white border-0 rounded-lg text-[15px] font-semibold cursor-pointer px-6 py-3 font-[inherit] shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] [transition:filter_.2s_ease,transform_.15s_ease,box-shadow_.2s_ease] hover:bg-brand-blue-soft hover:brightness-[1.03] hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] active:translate-y-px [&_svg]:block"
              type="button"
              onClick={() => gatedGo("/watch")}
            >
              Live тасалбар авах
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button
              className="bg-transparent border-0 text-[15px] font-medium cursor-pointer text-[#1a1a1a] font-[inherit] py-3 px-[14px] hover:underline"
              type="button"
            >
              Дэлгэрэнгүй
            </button>
          </div>
        </div>

        {(() => {
          const TILE_BASE =
            "absolute grid place-items-center overflow-hidden [isolation:isolate] [background:linear-gradient(132deg,rgba(255,255,255,0.10),rgba(255,255,255,0)_36%),#FAF7EE] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.36),0_10px_22px_rgba(0,0,0,0.025)] after:content-[''] after:absolute after:inset-0 after:-z-10 after:[background:radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.2),transparent_34%),radial-gradient(circle_at_88%_88%,rgba(0,0,0,0.04),transparent_42%)] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:object-center [&_img]:block [&_img]:[transition:transform_.6s_cubic-bezier(.2,.8,.2,1)]";
          return (
            <>
              <main
                className="relative w-full max-w-[580px] mx-auto [aspect-ratio:1/1] [container-type:inline-size] overflow-hidden max-[720px]:max-w-[460px] max-[920px]:hidden"
                aria-label="Four card layout"
              >
                <svg
                  width="0"
                  height="0"
                  style={{ position: "absolute" }}
                  aria-hidden="true"
                >
                  <defs>
                    <clipPath
                      id="tile1-shape"
                      clipPathUnits="objectBoundingBox"
                    >
                      <path d="M 0.1016,0 H 0.7898 C 0.8822,0 0.9677,0.0642 0.9769,0.1415 C 1.0046,0.3566 1.0116,0.5962 0.9700,0.8604 C 0.9584,0.9321 0.8799,0.9981 0.7852,0.9981 H 0.1016 C 0.0462,0.9981 0,0.9604 0,0.9151 V 0.0830 C 0,0.0377 0.0462,0 0.1016,0 Z" />
                    </clipPath>
                  </defs>
                </svg>
                {tiles[0].image_url && (
                  <section
                    className={`${TILE_BASE} left-[-14.1%] top-[6.8%] w-[53.2%] h-[87.9%] [border-radius:4cqw] [clip-path:url(#tile1-shape)] hover:[&_img]:[transform:scale(1.04)]`}
                  >
                    <img
                      src={tiles[0].image_url}
                      alt={tiles[0].alt}
                      width="640"
                      height="800"
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                    />
                  </section>
                )}
                {tiles[1].image_url && (
                  <section
                    className={`${TILE_BASE} left-[42.2%] top-[6.8%] w-[51.8%] h-[28%] [border-radius:4.44cqw] [transform:skewX(18deg)] [transform-origin:center] [&_img]:[transform:skewX(-18deg)_scale(1.18)] [&_img]:[transform-origin:center] hover:[&_img]:[transform:skewX(-18deg)_scale(1.22)]`}
                  >
                    <img
                      src={tiles[1].image_url}
                      alt={tiles[1].alt}
                      width="420"
                      height="260"
                      loading="lazy"
                      decoding="async"
                    />
                  </section>
                )}
                {tiles[2].image_url && (
                  <section
                    className={`${TILE_BASE} left-[45.1%] top-[36.6%] w-[53.2%] h-[28%] [border-radius:3.89cqw] hover:[&_img]:[transform:scale(1.04)]`}
                  >
                    <img
                      src={tiles[2].image_url}
                      alt={tiles[2].alt}
                      width="420"
                      height="260"
                      loading="lazy"
                      decoding="async"
                    />
                  </section>
                )}
                {tiles[3].image_url && (
                  <section
                    className={`${TILE_BASE} left-[42.1%] top-[66.4%] w-[51.8%] h-[28.3%] [border-radius:4.44cqw] [transform:skewX(-18deg)] [transform-origin:center] [&_img]:[transform:skewX(18deg)_scale(1.18)] [&_img]:[transform-origin:center] hover:[&_img]:[transform:skewX(18deg)_scale(1.22)]`}
                  >
                    <img
                      src={tiles[3].image_url}
                      alt={tiles[3].alt}
                      width="420"
                      height="260"
                      loading="lazy"
                      decoding="async"
                    />
                  </section>
                )}
              </main>

              <div
                className="hidden max-[920px]:grid grid-cols-2 gap-3 w-full max-w-[460px] mx-auto"
                aria-label="Зургийн цомог"
              >
                {tiles
                  .filter((t) => t.image_url)
                  .map((t, i) => (
                    <div
                      key={t.slot}
                      className="overflow-hidden rounded-[20px] aspect-[4/3]"
                    >
                      <img
                        src={t.image_url}
                        alt={t.alt}
                        width="460"
                        height="345"
                        className="w-full h-full object-cover block"
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={i === 0 ? "high" : undefined}
                      />
                    </div>
                  ))}
              </div>
            </>
          );
        })()}
      </div>
    </section>
  );
}

function Highlights() {
  const { t } = useTranslation();
  return (
    <section
      className="w-full bg-white py-12 px-6 max-[920px]:py-14 max-[920px]:px-5"
      id="about"
    >
      <div className="max-w-screen-page mx-auto">
        <h2
          className={`text-[42px] font-extrabold tracking-[-0.02em] m-0 mb-10 text-[#1a1a1a] max-[920px]:text-[34px] ${REVEAL_UP_CLS}`}
        >
          {t("home_about_title")}
        </h2>

        <div className="grid gap-10 items-start [grid-template-columns:1.05fr_1fr_1fr] max-[920px]:gap-8 max-[920px]:[grid-template-columns:1fr_1fr] max-[600px]:[grid-template-columns:1fr]">
          <article
            className={`flex flex-col justify-center max-[920px]:[grid-column:1/-1] max-[600px]:[grid-column:auto] ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <h3 className="text-[28px] leading-[1.3] text-ink m-0 mb-[18px] tracking-[-0.01em] font-bold max-[900px]:text-2xl">
              {t("home_about_heading")}
            </h3>
            <p className="text-[17px] leading-[1.75] text-ink-soft m-0 text-justify [hyphens:auto] [word-spacing:0.01em] max-[900px]:text-base">
              {t("home_about_body")}
            </p>
          </article>

          <div
            className={`w-full grid overflow-hidden bg-[#e9e9e9] text-[#b8b8b8] [aspect-ratio:1/1.05] rounded-[56px] place-items-center ${REVEAL_UP_CLS}`}
            data-stagger="2"
          >
            <img
              src="/assets/images/stadium/exterior.opt.jpg"
              alt={t("home_about_title")}
              width="600"
              height="630"
              className="w-full h-full object-cover object-center block [border-radius:inherit]"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div
            className={`flex flex-col gap-[14px] [aspect-ratio:1/1.05] ${REVEAL_UP_CLS}`}
            data-stagger="3"
          >
            <div
              className="flex-1 w-full min-h-0 rounded-[28px] overflow-hidden"
              style={{
                backgroundImage: "url('/assets/images/stadium/huuchin.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <p className="text-[17px] font-bold leading-[1.35] m-0 text-[#1a1a1a] text-pretty">
              {t("home_about_cta_lead")}
            </p>
            <Link
              to="/about"
              className="self-start inline-flex items-center gap-2.5 rounded-full bg-transparent text-sm font-semibold no-underline cursor-pointer px-[22px] py-3 border-[1.5px] border-solid border-[#1a1a1a] text-[#1a1a1a] font-[inherit] [transition:background_0.2s_ease,color_0.2s_ease] hover:bg-[#1a1a1a] hover:text-white"
            >
              {t("home_about_cta")}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const { t } = useTranslation();
  const items = [
    { num: "1958", label: t("home_stats_founded") },
    { num: "12,500", label: t("home_stats_seats") },
    { num: "25k+", label: t("home_stats_capacity") },
    { num: "105×68", label: t("home_stats_field") },
  ];
  return (
    <section className="w-full bg-white pt-8 px-6 pb-6 max-[920px]:py-16 max-[920px]:px-5">
      <div className="max-w-screen-page mx-auto pb-10">
        <div className="grid items-center [grid-template-columns:1fr_auto_1fr_auto_1fr_auto_1fr] gap-[18px] max-[920px]:[grid-template-columns:1fr_1fr] max-[920px]:gap-x-[18px] max-[920px]:gap-y-8 max-[480px]:[grid-template-columns:1fr]">
          {items.map((s, i) => (
            <span key={s.num} style={{ display: "contents" }}>
              {i > 0 && (
                <span
                  className="w-px h-12 bg-[#e5e7eb] justify-self-center max-[920px]:hidden"
                  aria-hidden="true"
                ></span>
              )}
              <div
                className={`flex flex-col items-center gap-2.5 text-center ${REVEAL_UP_CLS}`}
                data-stagger={i + 1}
              >
                <div className="text-[42px] font-extrabold tracking-[-0.02em] leading-none text-[#1a1a1a] max-[920px]:text-4xl">
                  {s.num}
                </div>
                <div className="text-[13px] uppercase tracking-[0.12em] text-[#9ca3af] font-semibold">
                  {s.label}
                </div>
              </div>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

type UpcomingProps = { gatedGo: (to: string) => void; events: EventRecord[] };

function Upcoming({ gatedGo, events }: UpcomingProps) {
  const upcoming = events
    .filter((e) => {
      const ts = new Date(e.start_time).getTime();
      return !Number.isNaN(ts) && ts >= Date.now();
    })
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    )
    .map((e) => {
      const [d, y] = (e.date || "").split("·").map((s) => s.trim());
      return {
        id: e.id,
        src: e.image,
        alt: e.title,
        date: d || e.date,
        year: y || "",
      };
    });

  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const intervalMs = 5500;
  const activeRatio = ratios[idx];
  const STAGE_MAX_HEIGHT = 560;
  const stageAspectStyle: CSSProperties = activeRatio
    ? {
        aspectRatio: String(activeRatio),
        maxWidth: `${STAGE_MAX_HEIGHT * activeRatio}px`,
      }
    : { aspectRatio: "1920 / 648" };

  useEffect(() => {
    if (upcoming.length === 0) return;
    if (idx >= upcoming.length) setIdx(0);
  }, [upcoming.length, idx]);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced || upcoming.length === 0) return;

    let rafId: number | null = null;
    let startTs = 0;
    let paused = false;

    const tick = (ts: number) => {
      if (paused) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const pct = Math.min(100, (elapsed / intervalMs) * 100);
      setProgress(pct);
      if (elapsed >= intervalMs) {
        setIdx((i) => (i + 1) % upcoming.length);
        startTs = ts;
      }
      rafId = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      paused = true;
      setProgress(0);
      startTs = 0;
    };
    const onLeave = () => {
      paused = false;
      startTs = 0;
    };

    const stage = stageRef.current;
    if (stage) {
      stage.addEventListener("mouseenter", onEnter);
      stage.addEventListener("mouseleave", onLeave);
    }

    let observed = false;
    if ("IntersectionObserver" in window && stage) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !observed) {
              observed = true;
              rafId = requestAnimationFrame(tick);
            } else if (!e.isIntersecting) {
              if (rafId) cancelAnimationFrame(rafId);
              rafId = null;
              observed = false;
              startTs = 0;
            }
          });
        },
        { threshold: 0.25 },
      );
      io.observe(stage);
      return () => {
        io.disconnect();
        if (rafId) cancelAnimationFrame(rafId);
        if (stage) {
          stage.removeEventListener("mouseenter", onEnter);
          stage.removeEventListener("mouseleave", onLeave);
        }
      };
    } else {
      rafId = requestAnimationFrame(tick);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (stage) {
          stage.removeEventListener("mouseenter", onEnter);
          stage.removeEventListener("mouseleave", onLeave);
        }
      };
    }
  }, []);

  const go = (next: number) => {
    if (upcoming.length === 0) return;
    setIdx((next + upcoming.length) % upcoming.length);
    setProgress(0);
  };

  const upNavBase =
    "absolute top-1/2 w-12 h-12 rounded-full text-white inline-flex items-center justify-center border-0 z-[3] cursor-pointer [transform:translateY(-50%)] bg-[rgba(255,255,255,0.12)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] [transition:background_0.18s_ease,color_0.18s_ease,transform_0.18s_ease] hover:bg-brand-blue hover:text-white hover:[transform:translateY(-50%)_scale(1.06)] [&_svg]:w-[22px] [&_svg]:h-[22px] max-[720px]:w-10 max-[720px]:h-10";
  const upThumbBase =
    "w-full rounded-[10px] overflow-hidden relative cursor-pointer bg-surface-1 p-0 block [aspect-ratio:1920/648] border-2 border-solid border-transparent [transition:border-color_0.18s_ease,transform_0.18s_ease,box-shadow_0.18s_ease] hover:[&_img]:[filter:none] hover:[&_img]:scale-[1.04]";
  const upThumbActive =
    "!border-brand-blue [transform:translateY(-2px)] shadow-[0_8px_22px_-6px_rgba(34,48,198,0.5)]";

  return (
    <section
      className="w-full relative px-6 pt-20 pb-[88px] [background:radial-gradient(60%_80%_at_50%_0%,rgba(34,48,198,0.05)_0%,transparent_70%),#FFFFFF] max-[600px]:px-[18px] max-[600px]:pt-14 max-[600px]:pb-[72px]"
      id="certificates"
    >
      <div className="max-w-screen-page mx-auto">
        <div
          className={`flex items-end justify-between gap-4 mb-8 flex-wrap ${REVEAL_UP_CLS}`}
        >
          <div>
            <h2 className="text-left text-[32px] font-extrabold text-ink m-0 tracking-[-0.01em] leading-[1.15] max-[600px]:text-2xl">
              Шууд дамжуулах арга хэмжээнүүд
            </h2>
          </div>
          <Link
            to="/events"
            className="text-[13px] font-bold uppercase text-ink no-underline inline-flex items-center gap-2 pb-1 tracking-[0.06em] border-b-2 border-solid border-transparent [transition:color_0.18s_ease,border-color_0.18s_ease,gap_0.18s_ease] hover:text-brand-blue hover:gap-3 hover:border-brand-blue [&_svg]:w-[14px] [&_svg]:h-[14px]"
          >
            Бүх арга хэмжээ үзэх
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div
          className={`relative rounded-[18px] overflow-hidden bg-ink shadow-[0_30px_60px_-30px_rgba(15,23,42,0.5)] [isolation:isolate] mx-auto w-full [transition:aspect-ratio_300ms_ease,max-width_300ms_ease] ${REVEAL_UP_CLS}`}
          ref={stageRef}
          style={stageAspectStyle}
        >
          <div className="absolute inset-0">
            {upcoming.map((u, i) => {
              const active = i === idx;
              return (
                <Link
                  key={u.id || u.alt}
                  to={u.id ? `/events/${u.id}` : "#"}
                  aria-label={u.alt}
                  className={`absolute inset-0 block no-underline [transition:opacity_700ms_cubic-bezier(.4,0,.2,1),transform_9s_linear] ${active ? "opacity-100 pointer-events-auto [transform:scale(1.04)]" : "opacity-0 pointer-events-none [transform:scale(1)]"}`}
                  data-up={i}
                >
                  <img
                    className="w-full h-full object-cover block"
                    src={u.src}
                    alt={u.alt}
                    loading={i === 0 ? "eager" : "lazy"}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (!img.naturalWidth || !img.naturalHeight) return;
                      const r = img.naturalWidth / img.naturalHeight;
                      setRatios((prev) =>
                        prev[i] === r ? prev : { ...prev, [i]: r },
                      );
                    }}
                  />
                  <div className="absolute flex items-end justify-between gap-4 flex-wrap text-white z-[2] inset-x-0 bottom-0 top-auto p-[clamp(16px,2.5vw,28px)] [background:linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.88)_100%)] max-[720px]:py-[14px] max-[720px]:px-4 max-[720px]:gap-2.5">
                    <div className="inline-flex items-center gap-2.5 flex-wrap">
                      <span className="inline-flex items-baseline gap-2 rounded-[10px] bg-brand-blue text-white py-1.5 px-3 shadow-[0_8px_22px_-10px_rgba(34,48,198,0.8)] [font-variant-numeric:tabular-nums]">
                        <strong className="font-black text-[18px] leading-none tracking-[-0.01em]">
                          {u.date}
                        </strong>
                        {u.year && (
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
                            {u.year}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <button
            className={`${upNavBase} left-4`}
            onClick={() => go(idx - 1)}
            aria-label="Өмнөх"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            className={`${upNavBase} right-4`}
            onClick={() => go(idx + 1)}
            aria-label="Дараах"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div
            className="absolute left-0 right-0 bottom-0 h-[3px] z-[3] bg-[rgba(255,255,255,0.15)]"
            aria-hidden="true"
          >
            <span
              className="block h-full w-0 [background:linear-gradient(90deg,#2230C6,#4451DC)] shadow-[0_0_12px_rgba(34,48,198,0.6)]"
              style={{ width: `${progress}%` }}
            ></span>
          </div>
        </div>

        <ol
          className={`mt-4 mb-0 mx-0 grid gap-[14px] list-none p-0 grid-cols-4 max-[720px]:grid-cols-2 ${REVEAL_UP_CLS}`}
          aria-label="Арга хэмжээ сонгох"
        >
          {upcoming.map((u, i) => {
            const active = i === idx;
            return (
              <li key={u.id || u.alt}>
                <Link
                  to={u.id ? `/events/${u.id}` : "#"}
                  className={`${upThumbBase}${active ? " " + upThumbActive : ""}`}
                  aria-label={u.alt}
                  onMouseEnter={() => go(i)}
                  onFocus={() => go(i)}
                >
                  <img
                    className={`w-full h-full object-cover block ${active ? "[filter:none]" : "[filter:saturate(.7)_brightness(.85)]"} [transition:filter_0.18s_ease,transform_600ms_ease]`}
                    src={u.src}
                    alt=""
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function MemberIcon({ iconKey }: { iconKey: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (iconKey) {
    case "music":
      return (
        <svg {...common}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      );
    case "news":
      return (
        <svg {...common}>
          <path d="M4 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4z" />
          <line x1="8" y1="9" x2="16" y2="9" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
          <path d="M20 8h2v8a2 2 0 0 1-2 2" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="8" y1="10" x2="16" y2="10" />
          <line x1="8" y1="14" x2="13" y2="14" />
        </svg>
      );
    case "stream":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <path d="M12 8v8" />
          <path d="M9 10.5L15 13.5" />
          <path d="M15 10.5L9 13.5" />
        </svg>
      );
    case "stadium":
      return (
        <svg {...common}>
          <path d="M2 12c0-4 4.5-7 10-7s10 3 10 7-4.5 7-10 7S2 16 2 12z" />
          <path d="M2 12c0 2 4.5 4 10 4s10-2 10-4" />
          <path d="M12 5v14" />
          <path d="M7 6.2v11.6" />
          <path d="M17 6.2v11.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function Members({ items = [] }: { items: MemberItem[] }) {
  const cards = items.length > 0 ? items : DEFAULT_MEMBERS;
  const memberCardCls = [
    "group bg-white rounded-[18px] flex flex-col items-start gap-4 text-left pt-7 px-[26px] pb-6 relative overflow-hidden",
    "border border-solid border-[rgba(31,41,55,0.06)] shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
    "[transition:transform_.45s_cubic-bezier(.34,1.56,.64,1),box-shadow_.35s_ease,border-color_.35s_ease,background-color_.35s_ease]",
    "hover:border-brand-blue hover:bg-brand-blue hover:[transform:translateY(-8px)_scale(1.015)] hover:shadow-[0_28px_50px_-20px_rgba(34,48,198,0.55)]",
    "before:content-[''] before:absolute before:top-0 before:h-full before:pointer-events-none before:z-[1] before:left-[-120%] before:w-[60%]",
    "before:[background:linear-gradient(115deg,transparent_0%,rgba(255,255,255,0)_30%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0)_70%,transparent_100%)]",
    "before:[transform:skewX(-18deg)] before:[transition:left_.9s_cubic-bezier(.4,0,.2,1)] hover:before:left-[160%]",
    "[&>*]:relative [&>*]:z-[2]",
    REVEAL_UP_CLS,
  ].join(" ");

  const cardBadgeCls = [
    "self-start inline-flex items-center gap-1.5 bg-brand-blue text-white text-[11px] font-bold uppercase rounded-full",
    "py-1 px-2.5 tracking-[.08em] [transition:background_.25s_ease,color_.25s_ease]",
    "group-hover:bg-white group-hover:text-brand-blue",
    "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-white before:shadow-[0_0_0_0_rgba(255,255,255,.9)]",
    "before:[animation:live-pulse_1.6s_ease-in-out_infinite] before:[transition:background_.25s_ease]",
    "group-hover:before:bg-brand-blue",
  ].join(" ");

  const cardIconCls = [
    "w-14 h-14 rounded-[14px] bg-brand-blue-tint grid place-items-center text-brand-blue p-0 flex-none",
    "[transition:transform_.55s_cubic-bezier(.34,1.56,.64,1),box-shadow_.35s_ease]",
    "group-hover:[transform:translateY(-2px)_rotate(-6deg)_scale(1.08)] group-hover:shadow-[0_10px_22px_-10px_rgba(0,0,0,0.35)]",
    "[&_svg]:w-7 [&_svg]:h-7 [&_svg]:[transition:transform_.45s_cubic-bezier(.34,1.56,.64,1)]",
    "group-hover:[&_svg]:scale-[1.08]",
  ].join(" ");

  const cardBtnCls = [
    "self-start mt-auto inline-flex items-center gap-1.5 bg-transparent text-brand-blue text-sm font-semibold no-underline rounded-none shadow-none pt-1.5 px-0 pb-0",
    "[transition:gap_.25s_ease,color_.25s_ease]",
    "group-hover:text-white hover:gap-2.5 hover:text-brand-blue hover:shadow-none",
    "[&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:[transition:transform_.35s_cubic-bezier(.34,1.56,.64,1)]",
    "group-hover:[&_svg]:translate-x-1",
  ].join(" ");

  return (
    <section className="w-full bg-surface-1 pt-20 px-6 pb-24" id="membership">
      <div className="max-w-screen-page mx-auto">
        <h2
          className={`text-center text-[38px] font-extrabold text-ink m-0 mb-3 tracking-[-0.015em] max-[900px]:text-3xl max-[540px]:text-[26px] ${REVEAL_UP_CLS}`}
        >
          Үйл ажиллагаа &amp; үйлчилгээ
        </h2>
        <p
          className={`text-center text-base text-ink-soft max-w-[640px] mx-auto mb-14 leading-[1.65] ${REVEAL_UP_CLS}`}
        >
          Төв Цэнгэлдэх Хүрээлэнгийн үндсэн чиглэл, иргэдэд хүрэх үйлчилгээ.
        </p>

        <div className="grid gap-6 mx-auto mb-8 grid-cols-3 max-[900px]:grid-cols-2 max-[540px]:grid-cols-1">
          {cards.map((m, i) => (
            <article key={m.id} className={memberCardCls} data-stagger={i + 1}>
              <span className={cardIconCls} aria-hidden="true">
                <MemberIcon iconKey={m.iconKey} />
              </span>
              {m.badge && (
                <span className={cardBadgeCls} aria-label={m.badge}>
                  {m.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-ink m-0 leading-[1.35] tracking-[-0.01em] group-hover:text-white">
                {m.title}
              </h3>
              <p className="text-sm text-ink-soft leading-[1.65] m-0 flex-1 group-hover:text-[rgba(255,255,255,0.85)]">
                {m.desc}
              </p>
              <a href={m.href || "#"} className={cardBtnCls}>
                {m.badge === "Live" ? "Шууд үзэх" : "Цааш үзэх"}
                <Arrow />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function VideoCta() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => setPaused(v.paused);
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    sync();
    return () => {
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
    };
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  return (
    <section className="w-full bg-white py-8 px-6 max-[900px]:pt-8 max-[900px]:px-5 max-[900px]:pb-14">
      <div className="mx-auto bg-surface-1 rounded-[28px] p-14 max-w-[1880px] max-[900px]:py-9 max-[900px]:px-4 max-[900px]:rounded-[22px]">
        <div className="max-w-screen-page mx-auto grid gap-12 items-center [grid-template-columns:0.82fr_1.18fr] max-[900px]:gap-7 max-[900px]:[grid-template-columns:1fr]">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase text-white bg-brand-blue rounded-full mb-[14px] tracking-[0.16em] py-[5px] px-[11px]">
              Шууд тоглолт
            </span>
            <h2 className="text-4xl font-extrabold tracking-[-0.02em] m-0 mb-[18px] leading-[1.15] text-[#1a1a1a] max-[900px]:text-[28px]">
              «Чамтай бас чамгүй»
            </h2>
            <p className="text-[15px] leading-[1.7] m-0 mb-6 max-w-[480px] text-[#5b5b5b]">
              Төв Цэнгэлдэх Хүрээлэн дэх амьд тоглолтын онцлох агшнууд. Тайз,
              гэрэл, үзэгчдийн халуун дулаан агаар &mdash; бүгд энд. Тоглолт аль
              хэдийн эхэлсэн.
            </p>
            <p className="text-[13px] font-bold uppercase text-brand-blue m-0 mb-6 tracking-[0.06em] leading-[1.7] max-w-[480px]">
              Ариунаа ft. Morningstar
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-2 !bg-brand-blue !text-white no-underline rounded-full text-sm font-semibold py-[11px] px-[22px] border-0 shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] [transition:filter_.2s_ease,transform_.15s_ease,box-shadow_.2s_ease] hover:!bg-brand-blue-soft hover:brightness-[1.03] hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] [&_svg]:w-[13px] [&_svg]:h-[13px]"
            >
              Дэлгэрэнгүй
              <Arrow />
            </a>
          </div>
          <div className="relative w-full rounded-3xl overflow-hidden [aspect-ratio:16/9] bg-[#111] shadow-[0_18px_40px_rgba(0,0,0,0.12)] [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:block [&_video]:[filter:blur(3px)] [&_video]:[transform:scale(1.04)]">
            <StoryVideo
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster="/assets/images/stadium/exterior.opt.jpg"
              fallbackAriaLabel="Чамтай бас чамгүй — тоглолтын зураг"
            />
            <button
              className={`absolute z-[2] w-12 h-12 rounded-full border-0 cursor-pointer inline-flex items-center justify-center text-white left-4 bottom-4 bg-[rgba(15,23,42,0.55)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] [transition:background_0.18s_ease,transform_0.18s_ease] hover:bg-brand-blue hover:scale-[1.06]${paused ? " is-paused" : ""}`}
              type="button"
              aria-label="Видео тоглуулах/түр зогсоох"
              onClick={toggle}
            >
              <svg
                className="w-5 h-5 block [.is-paused_&]:hidden"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
              <svg
                className="w-5 h-5 hidden [.is-paused_&]:block"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Partners({ items = [] }: { items: Partner[] }) {
  const loop = items.length > 0 ? [...items, ...items] : items;
  return (
    <section className="w-full bg-white pt-3 px-6 pb-14" id="partners">
      <div className="max-w-none w-full mx-auto bg-transparent rounded-none text-center py-14 px-12 max-[720px]:py-10 max-[720px]:px-6">
        <h2
          className={`text-[44px] font-extrabold text-ink tracking-[-0.02em] m-0 mb-5 leading-[1.15] max-[900px]:text-[34px] max-[540px]:text-[26px] ${REVEAL_UP_CLS}`}
        >
          Манай хамтрагч байгууллагууд
        </h2>
        <p
          className={`text-[16px] text-[#6b6b6b] max-w-[720px] mx-auto mb-12 leading-[1.65] max-[720px]:text-[14px] max-[720px]:mb-9 ${REVEAL_UP_CLS}`}
          data-stagger="1"
        >
          Төв Цэнгэлдэх Хүрээлэн нь Монголын тэргүүлэх аж ахуйн нэгж, олон улсын
          байгууллагуудтай олон жилийн турш урт хугацаанд хамтран ажиллаж,
          спорт, соёл, олон нийтийн томоохон арга хэмжээг хамтын хүчээр
          амжилттай зохион байгуулсаар ирсэн. Тэдний итгэл, дэмжлэг бидний
          өсөлт, шинэчлэл, иргэддээ хүргэх үйлчилгээний чанарын гол түшиц юм.
        </p>

        {items.length > 0 && (
          <div
            className={`group relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] ${REVEAL_UP_CLS}`}
            data-stagger="2"
          >
            <div className="flex w-max items-center gap-14 max-[720px]:gap-5 animate-partners-marquee group-hover:[animation-play-state:paused]">
              {loop.map((p, i) => (
                <a
                  key={`${p.id}-${i}`}
                  href="#"
                  aria-hidden={i >= items.length ? "true" : undefined}
                  className="shrink-0 inline-flex items-center justify-center w-[140px] h-[140px] bg-white rounded-[20px] overflow-hidden border border-solid border-[rgba(31,41,55,0.08)] p-[18px] shadow-[0_6px_18px_-10px_rgba(31,41,55,0.18)] [transition:transform_0.25s_ease,box-shadow_0.25s_ease,border-color_0.25s_ease] hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_rgba(34,48,198,0.35)] hover:border-[rgba(34,48,198,0.25)] max-[720px]:w-24 max-[720px]:h-24 max-[720px]:rounded-2xl max-[720px]:p-3"
                >
                  <img
                    src={p.image}
                    alt={p.alt || "Партнёр байгууллага"}
                    loading="lazy"
                    className="w-full h-full max-w-full object-contain block"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Roadmap(_props: { items?: RoadmapItem[] }) {
  const { t } = useTranslation();
  type Milestone = { year: string; title: string };
  const bot: Milestone[] = [
    { year: "1958", title: t("home_roadmap_1958") },
    { year: "1961", title: t("home_roadmap_1961") },
    { year: "1971", title: t("home_roadmap_1971") },
    { year: "1990", title: t("home_roadmap_1990") },
    { year: "1993", title: t("home_roadmap_1993") },
  ];
  const top: Milestone[] = [
    { year: "2007", title: t("home_roadmap_2007") },
    { year: "2014", title: t("home_roadmap_2014") },
    { year: "2019", title: t("home_roadmap_2019") },
    { year: "2024", title: t("home_roadmap_2024") },
    { year: "2025", title: t("home_roadmap_2025") },
    { year: "2026", title: t("home_roadmap_2026") },
  ];
  const all = [...bot, ...top];

  // Dots are placed ALONG a single smooth S-curve from (290,230) to (730,110).
  // Pre-curve dots sit flat at y=230, post-curve dots sit flat at y=110, and
  // the transition dots (1990, 1993, 2007, 2014) sample the smoothstep so
  // every dot visually lies on the connecting line.
  const botDots = [
    { x: 80, y: 230 },
    { x: 185, y: 230 },
    { x: 290, y: 230 },
    { x: 395, y: 213 },
    { x: 500, y: 174 },
  ];
  const topDots = [
    { x: 620, y: 129 },
    { x: 730, y: 110 },
    { x: 838, y: 110 },
    { x: 946, y: 110 },
    { x: 1054, y: 110 },
    { x: 1162, y: 110 },
  ];
  const dotPct = (x: number) => (x / 1200) * 100;

  const phaseBase =
    "flex flex-col justify-center min-h-[64px] py-3 pr-[44px] font-[inherit] max-[640px]:[clip-path:none] max-[640px]:m-0 max-[640px]:rounded max-[640px]:py-3 max-[640px]:px-4";

  return (
    <section
      className="w-full bg-white pt-14 px-6 pb-20 max-[900px]:pt-10 max-[900px]:pb-14"
      id="events"
    >
      <div className="max-w-screen-page mx-auto">
        <h2
          className={`text-[42px] font-extrabold tracking-[-0.02em] m-0 mb-10 text-[#1a1a1a] max-[900px]:text-[34px] max-[540px]:text-[26px] max-[540px]:mb-7 ${REVEAL_UP_CLS}`}
        >
          {t("home_roadmap_title")}
        </h2>

        <div className="flex items-stretch gap-0 mb-10 max-[640px]:flex-col max-[640px]:gap-1.5">
          <div
            className={`${phaseBase} pl-9 bg-brand-blue-tint text-ink [clip-path:polygon(0_0,calc(100%_-_22px)_0,100%_50%,calc(100%_-_22px)_100%,0_100%)] -mr-3 ${REVEAL_UP_CLS}`}
            style={{ flex: "47 1 0%" }}
            data-stagger="1"
          >
            <strong className="text-[14px] font-extrabold block tracking-[0.02em] max-[900px]:text-[13px]">
              {t("home_roadmap_phase1_years")}
            </strong>
            <small className="text-[12px] block opacity-85 max-[900px]:text-[11px]">
              {t("home_roadmap_phase1_label")}
            </small>
          </div>
          <div
            className={`${phaseBase} pl-12 bg-ink text-brand-blue-tint [clip-path:polygon(0_0,calc(100%_-_22px)_0,100%_50%,calc(100%_-_22px)_100%,0_100%,22px_50%)] -mr-3 ${REVEAL_UP_CLS}`}
            style={{ flex: "27 1 0%" }}
            data-stagger="2"
          >
            <strong className="text-[14px] font-extrabold block tracking-[0.02em] max-[900px]:text-[13px]">
              {t("home_roadmap_phase2_years")}
            </strong>
            <small className="text-[12px] block opacity-85 max-[900px]:text-[11px]">
              {t("home_roadmap_phase2_label")}
            </small>
          </div>
          <div
            className={`${phaseBase} pl-12 bg-ink text-brand-blue-tint [clip-path:polygon(0_0,calc(100%_-_22px)_0,100%_50%,calc(100%_-_22px)_100%,0_100%,22px_50%)] ${REVEAL_UP_CLS}`}
            style={{ flex: "26 1 0%" }}
            data-stagger="3"
          >
            <strong className="text-[14px] font-extrabold block tracking-[0.02em] max-[900px]:text-[13px]">
              {t("home_roadmap_phase3_years")}
            </strong>
            <small className="text-[12px] block opacity-85 max-[900px]:text-[11px]">
              {t("home_roadmap_phase3_label")}
            </small>
          </div>
        </div>

        <div
          className={`relative w-full mb-3 h-[380px] max-[1200px]:h-[360px] max-[900px]:h-[340px] max-[640px]:hidden ${REVEAL_UP_CLS}`}
          data-stagger="4"
        >
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1200 320"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 40,230 L 290,230 C 510,230 510,110 730,110 L 1170,110"
              stroke="#2230C6"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {botDots.map((d, i) => (
            <span
              key={`bl-${i}`}
              aria-hidden="true"
              className="absolute w-px bg-[#4D5670] -translate-x-1/2"
              style={{
                left: `${dotPct(d.x)}%`,
                top: `${(d.y / 320) * 100}%`,
                height: `${((288 - d.y) / 320) * 100}%`,
              }}
            />
          ))}
          {topDots.map((d, i) => (
            <span
              key={`tl-${i}`}
              aria-hidden="true"
              className="absolute w-px bg-[#4D5670] -translate-x-1/2"
              style={{
                left: `${dotPct(d.x)}%`,
                top: `${(42 / 320) * 100}%`,
                height: `${((d.y - 42) / 320) * 100}%`,
              }}
            />
          ))}
          {botDots.map((d, i) => (
            <span
              key={`bd-${i}`}
              aria-hidden="true"
              className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A89968]"
              style={{
                left: `${dotPct(d.x)}%`,
                top: `${(d.y / 320) * 100}%`,
              }}
            />
          ))}
          {topDots.map((d, i) => (
            <span
              key={`td-${i}`}
              aria-hidden="true"
              className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A89968]"
              style={{
                left: `${dotPct(d.x)}%`,
                top: `${(d.y / 320) * 100}%`,
              }}
            />
          ))}

          {bot.map((m, i) => (
            <div
              key={`b-${i}`}
              className="absolute -translate-x-1/2 w-[108px] text-center text-[#4a4a4a] top-[89%] max-[1200px]:w-[92px] max-[900px]:w-[80px]"
              style={{ left: `${dotPct(botDots[i].x)}%` }}
            >
              <strong className="block font-extrabold text-[13px] mb-1 text-[#1a1a1a] max-[1200px]:text-[12px] max-[900px]:text-[11px]">
                {m.year}
              </strong>
              <span className="block text-[11.5px] leading-[1.35] max-[1200px]:text-[10.5px] max-[900px]:text-[10px] [hyphens:auto] [overflow-wrap:break-word]">
                {m.title}
              </span>
            </div>
          ))}
          {top.map((m, i) => (
            <div
              key={`t-${i}`}
              className="absolute -translate-x-1/2 w-[108px] text-center text-[#4a4a4a] bottom-[83%] max-[1200px]:w-[92px] max-[900px]:w-[80px]"
              style={{ left: `${dotPct(topDots[i].x)}%` }}
            >
              <strong className="block font-extrabold text-[13px] mb-1 text-[#1a1a1a] max-[1200px]:text-[12px] max-[900px]:text-[11px]">
                {m.year}
              </strong>
              <span className="block text-[11.5px] leading-[1.35] max-[1200px]:text-[10.5px] max-[900px]:text-[10px] [hyphens:auto] [overflow-wrap:break-word]">
                {m.title}
              </span>
            </div>
          ))}
        </div>

        <ol className="hidden max-[640px]:flex relative list-none m-0 p-0 flex-col gap-6 pl-6">
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 left-2 w-px bg-black/15"
          ></span>
          {all.map((m, i) => (
            <li key={`m-${i}`} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[18px] top-1.5 block w-2.5 h-2.5 rounded-full bg-[#A89968] ring-4 ring-white"
              ></span>
              <strong className="block font-extrabold text-[14px] text-[#1a1a1a] mb-1">
                {m.year}
              </strong>
              <span className="block text-[13px] leading-[1.55] text-[#4a4a4a]">
                {m.title}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function News({ items = [] }: { items: NewsItem[] }) {
  const sectionCls =
    "w-full bg-white pt-16 px-6 pb-20 max-[920px]:pt-12 max-[920px]:pb-14";
  const innerCls = "max-w-screen-page mx-auto";

  const headingWrapCls = `flex items-center justify-center gap-6 mb-14 max-[920px]:gap-4 max-[920px]:mb-10 ${REVEAL_UP_CLS}`;
  const headingLineCls =
    "h-px flex-1 max-w-[180px] bg-[linear-gradient(to_right,transparent,rgba(34,48,198,0.4),transparent)]";
  const headingTextCls =
    "text-[28px] font-extrabold tracking-[0.04em] text-ink uppercase m-0 text-center max-[920px]:text-[22px]";

  if (items.length === 0) {
    return (
      <section className={sectionCls} id="news">
        <div className={innerCls}>
          <div className={headingWrapCls}>
            <span className={headingLineCls} aria-hidden="true" />
            <h2 className={headingTextCls}>Мэдээ мэдээлэл</h2>
            <span className={headingLineCls} aria-hidden="true" />
          </div>
        </div>
      </section>
    );
  }

  const cards = items.slice(0, 6);

  return (
    <section className={sectionCls} id="news">
      <div className={innerCls}>
        <div className={headingWrapCls}>
          <span className={headingLineCls} aria-hidden="true" />
          <h2 className={headingTextCls}>Мэдээ мэдээлэл</h2>
          <span className={headingLineCls} aria-hidden="true" />
        </div>

        <div className="grid grid-cols-3 gap-10 max-[920px]:grid-cols-2 max-[920px]:gap-7 max-[640px]:grid-cols-1 max-[640px]:gap-8">
          {cards.map((n, i) => (
            <article
              key={n.id}
              className={`flex flex-col items-center text-center group ${REVEAL_UP_CLS}`}
              data-stagger={i + 1}
            >
              <Link
                to={`/news/${n.id}`}
                aria-label={n.title}
                className="block w-full overflow-hidden rounded-2xl bg-surface-1 [aspect-ratio:4/3] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:block [&_img]:[transition:transform_.6s_cubic-bezier(.2,.8,.2,1)] group-hover:[&_img]:scale-[1.04]"
              >
                {n.image && <img src={n.image} alt={n.title} loading="lazy" />}
              </Link>

              <h3 className="mt-6 text-[16px] font-extrabold leading-[1.45] text-ink max-w-[340px] max-[920px]:text-[15px]">
                {n.title}
              </h3>

              <Link
                to={`/news/${n.id}`}
                className="mt-6 inline-flex items-center gap-2 text-[13.5px] font-bold text-brand-blue no-underline group/link hover:gap-3 [transition:gap_.2s_ease] [&_svg]:w-[13px] [&_svg]:h-[13px]"
              >
                Дэлгэрэнгүй унших
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function newsExcerpt(item: NewsItem, max = 220): string {
  const fromBlocks = item.blocks
    ?.filter((b) => b.type === "text")
    .map((b) => b.value)
    .join(" ")
    .trim();
  const raw = (fromBlocks || item.body || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (raw.length <= max) return raw;
  return raw.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function pickFeaturedNews(items: NewsItem[]): NewsItem | null {
  if (!items || items.length === 0) return null;
  const featured = items
    .filter((n) => n.featured)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (featured.length > 0) return featured[0];
  const sorted = [...items].sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
  return sorted[0] ?? null;
}

function FeaturedNewsHero({ items }: { items: NewsItem[] }) {
  const featured = pickFeaturedNews(items);
  const excerpt = featured ? newsExcerpt(featured) : "";

  // Always reserve the full hero slot — returning null on empty input causes
  // a 100vh layout shift when the news API resolves and the hero pops in.
  return (
    <section
      className="relative w-full overflow-hidden bg-black text-white isolate -mt-[64px] max-[920px]:-mt-[56px]"
      id="featured-news"
      aria-label="Онцлох мэдээ"
    >
      <div className="relative w-full min-h-[calc(100vh+64px)] min-h-[calc(100dvh+64px)] max-[920px]:min-h-[calc(100vh+56px)] max-[920px]:min-h-[calc(100dvh+56px)]">
        {/* Fallback hero image: shown immediately on first paint so the
            section never looks empty while news data is in flight. */}
        <img
          src="/assets/images/stadium/exterior.opt.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {featured?.image && (
          <img
            src={featured.image}
            alt={featured.title}
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover object-center [transition:opacity_.4s_ease] opacity-100"
          />
        )}

        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.45)_50%,rgba(0,0,0,0.75)_100%)]"
          aria-hidden="true"
        />

        {/* Default brand content while news is loading. Same layout shape
            as the real hero, so the swap is visually a label/title fade. */}
        <div
          className={`absolute inset-0 grid place-items-center px-6 py-16 max-[640px]:px-5 max-[640px]:py-12 [transition:opacity_.35s_ease] ${featured ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          aria-hidden={featured ? "true" : undefined}
        >
          <div className="max-w-[860px] text-center">
            <span className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[11px] tracking-[0.18em] uppercase font-semibold text-white/95 max-[640px]:mb-5 max-[640px]:text-[10px]">
              Тавтай морил
            </span>
            <h1 className="m-0 text-gold-pale font-extrabold uppercase leading-[1.16] tracking-[0.015em] text-[44px] max-[920px]:text-[32px] max-[640px]:text-[24px] drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] [text-shadow:0_1px_0_rgba(0,0,0,0.25)]">
              Төв Цэнгэлдэх Хүрээлэн
            </h1>
            <p className="mt-6 mx-auto max-w-[680px] text-white/85 text-[15px] leading-[1.7] max-[640px]:text-[13px] max-[640px]:mt-5 max-[640px]:leading-[1.6]">
              Монголын спортын зүрх — 1958 оноос хойш
            </p>
          </div>
        </div>

        <div
          className={`absolute inset-0 grid place-items-center px-6 py-16 max-[640px]:px-5 max-[640px]:py-12 [transition:opacity_.35s_ease] ${featured ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div className="max-w-[860px] text-center">
            <span className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[11px] tracking-[0.18em] uppercase font-semibold text-white/95 max-[640px]:mb-5 max-[640px]:text-[10px]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
              Мэдээ мэдээлэл
            </span>
            <h1 className="m-0 text-gold-pale font-extrabold uppercase leading-[1.16] tracking-[0.015em] text-[44px] max-[920px]:text-[32px] max-[640px]:text-[24px] drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] [text-shadow:0_1px_0_rgba(0,0,0,0.25)]">
              {featured?.title ?? ""}
            </h1>
            {excerpt && (
              <p className="mt-6 mx-auto max-w-[680px] text-white/85 text-[15px] leading-[1.7] max-[640px]:text-[13px] max-[640px]:mt-5 max-[640px]:leading-[1.6]">
                {excerpt}
              </p>
            )}
            <Link
              to={featured ? `/news/${featured.id}` : "#"}
              className="inline-flex items-center gap-2 mt-9 px-7 py-3.5 rounded-full border border-white/75 text-white text-[13px] font-semibold tracking-[0.16em] uppercase no-underline hover:bg-white hover:text-ink hover:border-white transition-colors duration-200 max-[640px]:mt-7 max-[640px]:px-6 max-[640px]:py-3 max-[640px]:text-[11.5px]"
            >
              Дэлгэрэнгүй үзэх
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
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
