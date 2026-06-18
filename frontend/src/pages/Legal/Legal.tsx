import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";

type LawItem = {
  id: string;
  title: string;
  href: string;
  featured?: boolean;
};

const LAWS: LawItem[] = [
  {
    id: "undsen-huuli",
    title: "Монгол Улсын Үндсэн хууль",
    href: "https://legalinfo.mn/mn/detail?lawId=367",
  },
  {
    id: "turiin-orn-omch",
    title: "Төрийн болон орон нутгийн өмчийн тухай хууль",
    href: "https://legalinfo.mn/mn/detail/492",
  },
  {
    id: "kompani",
    title: "Компанийн тухай хууль",
    href: "https://legalinfo.mn/mn/detail?lawId=310",
  },
  {
    id: "undesnii-naadam",
    title: "Үндэсний их баяр наадмын тухай хууль",
    href: "https://legalinfo.mn/mn/detail?lawId=16530657329231",
  },
  {
    id: "undesnii-naadam-jurmiin",
    title: "Үндэсний их баяр наадмын тухай хуулийг дагаж мөрдөх журмын тухай",
    href: "https://legalinfo.mn/mn/detail?lawId=16",
  },
  {
    id: "niiteer-temdeglekh",
    title: "Нийтээр тэмдэглэх баярын болон тэмдэглэлт өдрүүдийн тухай хууль",
    href: "https://legalinfo.mn/mn/detail/399",
  },
  {
    id: "hudulmur",
    title: "Хөдөлмөрийн тухай хууль",
    href: "https://legalinfo.mn/mn/detail?lawId=16230709635751",
  },
  {
    id: "hudaldan-avah",
    title:
      "Төрийн болон орон нутгийн өмчийн хөрөнгөөр бараа, ажил, үйлчилгээ худалдан авах тухай",
    href: "https://legalinfo.mn/mn/detail?lawId=16760359992351",
  },
  {
    id: "arhiv",
    title: "Архив, албан хэрэг хөтлөлтийн тухай хууль",
    href: "https://legalinfo.mn/mn/detail/15370",
  },
  {
    id: "nyagtlan-bodoh",
    title: "Нягтлан бодох бүртгэлийн тухай хууль",
    href: "https://legalinfo.mn/mn/detail?lawId=11191",
  },
  {
    id: "turiin-hemnelt",
    title: "Төрийн хэмнэлтийн хууль",
    href: "https://legalinfo.mn/mn/detail?lawId=16468624002961",
  },
  {
    id: "niitiin-medeellel",
    title: "Нийтийн мэдээллийн ил тод байдлын тухай",
    href: "https://legalinfo.mn/mn/detail?lawId=16390263044601",
  },
  {
    id: "avliga",
    title: "Авлигын эсрэг хууль",
    href: "https://legalinfo.mn/mn/detail?lawId=8928",
  },
];

function LawIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className="block"
    >
      <path
        d="M11 8h14l6 6v22a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z"
        fill={active ? "#ffffff" : "#E4E7FA"}
        stroke={active ? "#ffffff" : "#2230C6"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M25 8v6h6"
        stroke={active ? "#2230C6" : "#2230C6"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={active ? "#ffffff" : "none"}
      />
      <path
        d="M14 20h12M14 25h12M14 30h8"
        stroke={active ? "#2230C6" : "#2230C6"}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M31 14h2a2 2 0 0 1 2 2v22a2 2 0 0 1-2 2H15"
        stroke={active ? "#ffffff" : "#2230C6"}
        strokeWidth="1.3"
        strokeOpacity={active ? "0.7" : "0.45"}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Legal() {
  useRevealOnScroll();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader />

      <section className="relative w-full bg-[linear-gradient(180deg,#0b1130_0%,#131c7a_100%)] text-white pt-24 pb-20 px-6 max-[920px]:pt-20 max-[920px]:pb-14 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <h1
            className={`m-0 text-gold-pale font-extrabold uppercase leading-[1.1] tracking-[0.01em] text-[44px] max-[920px]:text-[32px] max-[640px]:text-[24px] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${REVEAL_UP_CLS}`}
          >
            Хууль, эрх зүй
          </h1>
          <nav
            className={`mt-5 text-[12px] uppercase tracking-[0.22em] text-white/85 flex items-center gap-3 ${REVEAL_UP_CLS}`}
            aria-label="breadcrumb"
            data-stagger="2"
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
            <span className="text-white">Хууль, эрх зүй</span>
          </nav>
        </div>
      </section>

      <div
        aria-hidden="true"
        className="h-[3px] w-full bg-[linear-gradient(90deg,#A89968_0%,#E8DEC4_50%,#C9B888_100%)]"
      />

      <section className="w-full bg-[#fafaf7] py-16 px-6 max-[920px]:py-12 max-[920px]:px-5 flex-1">
        <div className="max-w-screen-page mx-auto">
          <ul
            className="list-none p-0 m-0 grid gap-5 [grid-template-columns:repeat(4,minmax(0,1fr))] max-[1100px]:[grid-template-columns:repeat(3,minmax(0,1fr))] max-[820px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[520px]:[grid-template-columns:1fr]"
            aria-label="Хууль, эрх зүйн жагсаалт"
          >
            {LAWS.map((law, i) => {
              const featured = law.featured;
              const base =
                "group relative flex flex-col h-full rounded-2xl p-6 no-underline min-h-[230px] [transition:transform_.25s_ease,box-shadow_.25s_ease,background-color_.25s_ease,color_.25s_ease]";
              const palette = featured
                ? "bg-brand-blue text-white shadow-[0_18px_36px_-18px_rgba(34,48,198,0.55)] hover:-translate-y-0.5"
                : "bg-[#eef0f3] text-ink hover:-translate-y-0.5 hover:bg-brand-blue hover:text-white hover:shadow-[0_18px_36px_-18px_rgba(11,17,48,0.28)]";
              return (
                <li
                  key={law.id}
                  className={REVEAL_UP_CLS}
                  data-stagger={(i % 4) + 1}
                >
                  <a
                    href={law.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${base} ${palette}`}
                  >
                    <span className="block">
                      <LawIcon active={featured} />
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 block opacity-0 group-hover:opacity-100 [transition:opacity_.2s_ease] ${featured ? "hidden" : ""}`}
                      />
                    </span>
                    <h3
                      className={`mt-5 mb-0 text-[14.5px] font-bold leading-[1.45] ${featured ? "text-white" : "text-ink group-hover:text-white"} [transition:color_.25s_ease]`}
                    >
                      {law.title}
                    </h3>
                    <span
                      className={`mt-auto pt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold ${featured ? "text-white" : "text-brand-blue group-hover:text-white"} [transition:color_.25s_ease,gap_.2s_ease] group-hover:gap-2.5`}
                    >
                      Дэлгэрэнгүй үзэх
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
