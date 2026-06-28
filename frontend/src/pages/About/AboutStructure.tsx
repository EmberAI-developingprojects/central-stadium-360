import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";

type Position = { count: number; title: string };
type Department = { name: string; positions: Position[] };

const DEPARTMENTS: Department[] = [
  {
    name: "ЗАХИРГААНЫ ХЭЛТЭС",
    positions: [
      { count: 1, title: "Гүйцэтгэх захирал" },
      { count: 1, title: "Үйл ажиллагаа хариуцсан захирал" },
      { count: 1, title: "Хүний нөөцийн менежер" },
      { count: 1, title: "Хуулийн мэргэжилтэн" },
      { count: 1, title: "Нарийн бичиг, захирлын туслах" },
      { count: 1, title: "Архив, бичиг хэргийн ажилтан" },
      { count: 1, title: "Тайлан төлөвлөгөө, биелэлт, гэрээ хариуцсан ажилтан" },
    ],
  },
  {
    name: "САНХҮҮГИЙН ХЭЛТЭС",
    positions: [
      { count: 1, title: "Ерөнхий нягтлан бодогч" },
      { count: 1, title: "Худалдан авалт, тендер хариуцсан мэргэжилтэн" },
      { count: 1, title: "Тооцооны нягтлан бодогч" },
      { count: 1, title: "Няраг" },
    ],
  },
  {
    name: "МАРКЕТИНГ, БОРЛУУЛАЛТЫН ХЭЛТЭС",
    positions: [
      { count: 1, title: "Маркетинг борлуулалт хариуцсан захирал" },
      { count: 2, title: "Борлуулалтын менежер" },
      { count: 1, title: "Орлого бүрдүүлэлтийн мэргэжилтэн" },
      { count: 1, title: "Хэвлэл мэдээлэл, олон нийттэй харилцах мэргэжилтэн" },
      { count: 1, title: "График дизайнер" },
      { count: 1, title: "Төслийн санхүүгийн мэргэжилтэн" },
      { count: 1, title: "Төслийн ажилтан" },
    ],
  },
  {
    name: "АЖ АХУЙН АЛБА",
    positions: [
      { count: 1, title: "Аж ахуй хариуцсан ахлах мэргэжилтэн" },
      { count: 2, title: "Техник хариуцсан инженер" },
      { count: 1, title: "Инженер техникийн туслах ажилтан" },
      { count: 1, title: "Камер хянагч" },
      { count: 1, title: "Цахилгаанчин" },
      { count: 1, title: "Сантехникч" },
      { count: 1, title: "Аж ахуйн ажилтан /мужаан/" },
      { count: 1, title: "Аж ахуйн ажилтан /туслах/" },
      { count: 1, title: "Жолооч" },
      { count: 6, title: "Төлбөртэй зогсоолын ажилтан" },
      { count: 5, title: "Цэвэрлэгээ үйлчилгээний ажилтан" },
      { count: 3, title: "Харуул хамгаалалтын гэрээт ажилтан" },
    ],
  },
];

export default function AboutStructure() {
  useRevealOnScroll();
  const { t } = useTranslation();

  const totalEmployees = DEPARTMENTS.reduce(
    (sum, d) => sum + d.positions.reduce((s, p) => s + p.count, 0),
    0,
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />

      <section className="relative w-full bg-[linear-gradient(180deg,#0b1130_0%,#131c7a_100%)] text-white pt-24 pb-16 px-6 max-[920px]:pt-20 max-[920px]:pb-12">
        <div className="max-w-screen-page mx-auto">
          <span
            className={`inline-block mb-4 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[11px] tracking-[0.18em] uppercase font-semibold text-white/90 ${REVEAL_UP_CLS}`}
          >
            {t("nav_about")}
          </span>
          <h1
            className={`m-0 text-gold-pale font-extrabold uppercase leading-[1.15] tracking-[0.01em] text-[44px] max-[920px]:text-[32px] max-[640px]:text-[24px] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${REVEAL_UP_CLS}`}
          >
            {t("nav_about_structure")}
          </h1>
          <p
            className={`mt-5 max-w-[640px] text-white/85 text-[15.5px] leading-[1.7] max-[640px]:text-[13.5px] ${REVEAL_UP_CLS}`}
          >
            Манай хамт олон нийт{" "}
            <strong className="text-gold-pale font-bold">
              {totalEmployees}
            </strong>{" "}
            ажилтан, {DEPARTMENTS.length} нэгжээс бүрдэнэ.
          </p>
        </div>
      </section>

      <section className="flex-1 w-full bg-[#fafaf7] py-16 px-6 max-[920px]:py-12 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto flex flex-col gap-14 max-[920px]:gap-10">
          {DEPARTMENTS.map((dept) => (
            <DepartmentBlock key={dept.name} department={dept} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function DepartmentBlock({ department }: { department: Department }) {
  const total = department.positions.reduce((s, p) => s + p.count, 0);
  return (
    <div>
      <div
        className={`flex items-center gap-4 mb-6 max-[640px]:gap-3 max-[640px]:mb-4 ${REVEAL_UP_CLS}`}
      >
        <h2 className="m-0 text-brand-blue-darker font-extrabold tracking-[0.02em] text-[20px] max-[640px]:text-[16px] leading-tight">
          {department.name}
        </h2>
        <span
          aria-hidden="true"
          className="flex-1 h-px bg-gradient-to-r from-zinc-300 to-transparent"
        />
        <span className="shrink-0 inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-brand-blue/10 text-brand-blue text-[12px] font-bold tabular-nums">
          {total}
        </span>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(4,minmax(0,1fr))] max-[1100px]:[grid-template-columns:repeat(3,minmax(0,1fr))] max-[860px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[520px]:[grid-template-columns:1fr]">
        {department.positions.map((pos, i) => (
          <PositionCard key={`${department.name}-${i}`} position={pos} />
        ))}
      </div>
    </div>
  );
}

function PositionCard({ position }: { position: Position }) {
  return (
    <div className="relative bg-[#f4f5f9] rounded-2xl p-5 min-h-[140px] flex flex-col justify-between [transition:transform_.25s_ease,box-shadow_.25s_ease,background_.25s_ease] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(11,17,48,0.18)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-brand-blue-darker font-extrabold text-[34px] leading-none tracking-[-0.02em] tabular-nums">
          {position.count}
        </span>
        <span aria-hidden="true" className="inline-flex text-brand-blue">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-9 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm4.5 8.5h-9c0-1.7 3-2.6 4.5-2.6s4.5.9 4.5 2.6zM19 13h-4v-1.5h4V13zm0-2.5h-4V9h4v1.5z" />
          </svg>
        </span>
      </div>
      <div className="text-[14.5px] leading-[1.5] text-ink font-semibold mt-3">
        {position.title}
      </div>
    </div>
  );
}
