import { Fragment } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";

const ORGANIZATION = "Төв цэнгэлдэх хүрээлэн ХХК";

type ContentRow = {
  topic: string;
  officer: string;
  citizen: string;
  total: string;
};

const CONTENT_ROWS: ContentRow[] = [
  {
    topic: "Хүний нөөц, сургалт, хангалт, нийгмийн асуудал",
    officer: "-",
    citizen: "-",
    total: "-",
  },
  {
    topic:
      "Бүтэц зохион байгуулалт, удирдлага, албан тушаалтны ёс зүй, ажлын хариуцлага",
    officer: "-",
    citizen: "-",
    total: "-",
  },
  {
    topic:
      "Барьцаанд байгаа үл хөдлөх хөрөнгийн дуудлага худалдаатай холбогдох асуудал",
    officer: "-",
    citizen: "-",
    total: "-",
  },
  {
    topic: "Бусад /лавлагаа, тодорхойлолт/",
    officer: "-",
    citizen: "-",
    total: "-",
  },
];

const SECTION_TITLE_CLS =
  "text-[clamp(20px,2.2vw,26px)] font-extrabold tracking-[-0.01em] uppercase text-brand-blue m-0 mb-6 leading-[1.25] flex items-center gap-4 after:content-[''] after:flex-1 after:h-px after:bg-[rgba(31,41,55,0.10)]";

const TABLE_WRAP_CLS =
  "rounded-2xl border border-[rgba(31,41,55,0.08)] bg-white overflow-hidden shadow-[0_2px_10px_-6px_rgba(31,41,55,0.10)]";

const TABLE_CLS = "w-full border-collapse text-[14px]";

const TH_CLS =
  "px-4 py-3 text-center font-bold uppercase text-brand-blue text-[12.5px] tracking-[0.04em] align-middle border border-[rgba(31,41,55,0.08)] bg-surface-1";

const TD_CLS =
  "px-4 py-3 text-center text-ink align-middle border border-[rgba(31,41,55,0.08)]";

export default function PetitionsOverview() {
  useRevealOnScroll();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="relative overflow-hidden bg-brand-blue-darker text-white py-16 px-6 max-[920px]:py-12 max-[920px]:px-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 25% 25%, rgba(34,48,198,0.45), transparent 55%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.4), transparent 55%)",
          }}
        />
        <div className="max-w-screen-page mx-auto relative z-[1]">
          <span
            className={`inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.18em] mb-5 ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Ил тод байдал
          </span>
          <h1
            className={`text-[clamp(28px,4.2vw,44px)] font-extrabold leading-[1.1] tracking-[-0.02em] m-0 mb-3 ${REVEAL_UP_CLS}`}
            data-stagger="2"
          >
            Өргөдөл хүсэлтийн тойм
          </h1>
          <p
            className={`text-[16px] leading-[1.65] text-white/80 m-0 max-w-[760px] ${REVEAL_UP_CLS}`}
            data-stagger="3"
          >
            Хүлээн авсан өргөдөл, гомдол, санал, хүсэлтийн шийдвэрлэлт, хүлээн
            авсан хэлбэр, агуулгын ангилал бүхий тоймыг доорх хүснэгтүүдээр
            танилцуулж байна.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 px-6 max-[920px]:py-10 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <h2 className={SECTION_TITLE_CLS}>
            Өргөдөл, гомдол, санал, хүсэлтийн шийдвэрлэсэн байдлаар ангилбал
          </h2>

          <div className={`${TABLE_WRAP_CLS} ${REVEAL_UP_CLS}`} data-stagger="1">
            <div className="overflow-x-auto">
              <table className={TABLE_CLS}>
                <thead>
                  <tr>
                    <th className={TH_CLS} rowSpan={2} style={{ width: 56 }}>
                      №
                    </th>
                    <th className={TH_CLS} rowSpan={2} style={{ minWidth: 200 }} />
                    <th className={TH_CLS} rowSpan={2}>
                      Нийт ирсэн өргөдөл,
                      <br />
                      гомдол, санал,
                      <br />
                      хүсэлтийн тоо
                    </th>
                    <th className={TH_CLS} colSpan={3}>
                      Шийдвэрлэлт
                    </th>
                    <th className={TH_CLS} rowSpan={2}>
                      Хяналтад
                      <br />
                      байгаа
                    </th>
                    <th className={TH_CLS} rowSpan={2}>
                      Шийдвэрлэлтийн
                      <br />
                      хувь
                    </th>
                  </tr>
                  <tr>
                    <th className={TH_CLS}>Шийдвэрлэж хариу өгсөн</th>
                    <th className={TH_CLS}>Бусад байгууллагад шилжүүлсэн</th>
                    <th className={TH_CLS}>Хугацаа хэтрүүлж шийдвэрлэсэн</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={TD_CLS}>1</td>
                    <td className={`${TD_CLS} font-semibold`}>{ORGANIZATION}</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-1 py-14 px-6 max-[920px]:py-10 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <h2 className={SECTION_TITLE_CLS}>
            Өргөдөл, гомдол, санал, хүсэлт хүлээн авсан хэлбэрээр ангилбал
          </h2>

          <div className={`${TABLE_WRAP_CLS} ${REVEAL_UP_CLS}`} data-stagger="1">
            <div className="overflow-x-auto">
              <table className={TABLE_CLS}>
                <thead>
                  <tr>
                    <th className={TH_CLS} rowSpan={2} style={{ width: 56 }}>
                      №
                    </th>
                    <th className={TH_CLS} rowSpan={2} style={{ minWidth: 200 }} />
                    <th className={TH_CLS} rowSpan={2}>
                      Нийт ирсэн өргөдөл, гомдол,
                      <br />
                      санал, хүсэлтийн тоо
                    </th>
                    <th className={TH_CLS} colSpan={5}>
                      Шийдвэрлэлт
                    </th>
                  </tr>
                  <tr>
                    <th className={TH_CLS}>Бичгээр</th>
                    <th className={TH_CLS}>Цахим хэлбэрээр</th>
                    <th className={TH_CLS}>Утсаар хандсан</th>
                    <th className={TH_CLS}>Биечлэн уулзсан</th>
                    <th className={TH_CLS}>Бусад /11-11/</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={TD_CLS}>1</td>
                    <td className={`${TD_CLS} font-semibold`}>{ORGANIZATION}</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                    <td className={TD_CLS}>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 px-6 max-[920px]:py-10 max-[920px]:px-5">
        <div className="max-w-screen-page mx-auto">
          <h2 className={SECTION_TITLE_CLS}>
            Өргөдөл, гомдол, санал, хүсэлтийн агуулга
          </h2>

          <div className={`${TABLE_WRAP_CLS} ${REVEAL_UP_CLS}`} data-stagger="1">
            <div className="overflow-x-auto">
              <table className={TABLE_CLS}>
                <thead>
                  <tr>
                    <th className={TH_CLS} style={{ width: 56 }}>
                      №
                    </th>
                    <th className={TH_CLS} style={{ minWidth: 200 }}>
                      Байгууллагын нэр
                    </th>
                    <th className={TH_CLS}>Өргөдөл хүсэлтийн агуулга</th>
                    <th className={TH_CLS}>Байгууллагад хандсан субъект</th>
                    <th className={TH_CLS} style={{ width: 90 }}>
                      Тоо
                    </th>
                    <th className={TH_CLS} style={{ width: 110 }}>
                      Нийт тоо
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CONTENT_ROWS.map((row, i) => (
                    <Fragment key={row.topic}>
                      <tr>
                        {i === 0 && (
                          <>
                            <td
                              className={TD_CLS}
                              rowSpan={CONTENT_ROWS.length * 2}
                            >
                              1
                            </td>
                            <td
                              className={`${TD_CLS} font-semibold`}
                              rowSpan={CONTENT_ROWS.length * 2}
                            >
                              {ORGANIZATION}
                            </td>
                          </>
                        )}
                        <td className={`${TD_CLS} text-left`} rowSpan={2}>
                          {row.topic}
                        </td>
                        <td className={TD_CLS}>Албан хаагч</td>
                        <td className={TD_CLS}>{row.officer}</td>
                        <td className={TD_CLS} rowSpan={2}>
                          {row.total}
                        </td>
                      </tr>
                      <tr>
                        <td className={TD_CLS}>Иргэн</td>
                        <td className={TD_CLS}>{row.citizen}</td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
