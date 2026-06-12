import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";

type DocConfig = {
  titleKey: string;
  pdfPath: string;
};

const DOCUMENTS: Record<string, DocConfig> = {
  mission: {
    titleKey: "nav_transparency_mission",
    pdfPath: "/assets/pdfs/mission.pdf",
  },
  "report-2025": {
    titleKey: "nav_transparency_report",
    pdfPath: "/assets/pdfs/performance-report-2025.pdf",
  },
  resolution: {
    titleKey: "nav_transparency_resolution",
    pdfPath: "/assets/pdfs/city-council-resolution.pdf",
  },
  "hr-policy": {
    titleKey: "nav_transparency_hr",
    pdfPath: "/assets/pdfs/hr-policy.pdf",
  },
  selection: {
    titleKey: "nav_transparency_selection",
    pdfPath: "/assets/pdfs/employee-selection-procedure.pdf",
  },
  evaluation: {
    titleKey: "nav_transparency_evaluation",
    pdfPath: "/assets/pdfs/performance-evaluation-procedure.pdf",
  },
  recommendations: {
    titleKey: "nav_transparency_recommendations",
    pdfPath: "/assets/pdfs/recommendation-implementation.pdf",
  },
};

export default function TransparencyDocument() {
  useRevealOnScroll();
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const doc = slug ? DOCUMENTS[slug] : undefined;

  if (!doc) return <Navigate to="/" replace />;

  const title = t(doc.titleKey);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden bg-brand-blue-darker text-white py-16 px-6 max-[920px]:py-12 max-[920px]:px-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-center bg-cover opacity-70"
          style={{
            backgroundImage:
              "url('/assets/images/stadium/huuchin.jpg')",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,18,57,0.20) 0%, rgba(13,18,57,0.45) 100%)",
          }}
        />
        <div className="max-w-screen-page mx-auto relative z-[1]">
          <span
            className={`inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.18em] mb-5 ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t("nav_transparency")}
          </span>
          <h1
            className={`text-[clamp(28px,4.2vw,44px)] font-extrabold leading-[1.1] tracking-[-0.02em] m-0 mb-3 ${REVEAL_UP_CLS}`}
            data-stagger="2"
          >
            {title}
          </h1>
          <p
            className={`text-[15px] leading-[1.65] text-white/75 m-0 max-w-[720px] ${REVEAL_UP_CLS}`}
            data-stagger="3"
          >
            Албан ёсны баримт бичгийг доорх PDF харагдацаас үзэх, эсвэл татаж
            авах боломжтой.
          </p>
        </div>
      </section>

      <section className="bg-surface-1 py-12 px-6 max-[920px]:py-8 max-[920px]:px-5 flex-1">
        <div className="max-w-screen-page mx-auto">
          <div
            className={`rounded-2xl border border-[rgba(31,41,55,0.08)] bg-white overflow-hidden shadow-[0_4px_20px_-12px_rgba(31,41,55,0.16)] ${REVEAL_UP_CLS}`}
            data-stagger="1"
          >
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[rgba(31,41,55,0.08)] bg-white max-[600px]:px-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-blue-tint text-brand-blue flex-none">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-ink leading-tight truncate">
                    {title}
                  </div>
                  <div className="text-[12px] text-ink-soft leading-tight">
                    PDF баримт
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <a
                  href={doc.pdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white text-ink border border-[rgba(31,41,55,0.12)] text-[13px] font-semibold no-underline px-4 py-2 hover:border-brand-blue hover:text-brand-blue [&_svg]:w-4 [&_svg]:h-4 max-[600px]:px-3"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 3h6v6" />
                    <path d="M10 14L21 3" />
                    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                  </svg>
                  <span className="max-[600px]:hidden">Шинэ цонхонд</span>
                </a>
                <a
                  href={doc.pdfPath}
                  download
                  className="inline-flex items-center gap-2 rounded-full bg-brand-blue text-white text-[13px] font-semibold no-underline px-4 py-2 shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] hover:bg-brand-blue-soft [&_svg]:w-4 [&_svg]:h-4 max-[600px]:px-3"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span className="max-[600px]:hidden">Татах</span>
                </a>
              </div>
            </div>

            <div className="bg-[#525659] mx-auto w-full max-w-[760px] aspect-[760/900] max-[600px]:aspect-auto max-[600px]:h-[80vh]">
              <object
                data={`${doc.pdfPath}#zoom=100&view=FitV`}
                type="application/pdf"
                className="w-full h-full block"
                aria-label={title}
              >
                <iframe
                  src={`${doc.pdfPath}#zoom=100&view=FitV`}
                  title={title}
                  className="w-full h-full block border-0"
                />
                <div className="w-full h-full grid place-items-center text-white p-6 text-center">
                  <div>
                    <p className="text-[15px] leading-[1.6] m-0 mb-4 text-white/85">
                      Таны хөтөч PDF харуулах боломжгүй байна.
                    </p>
                    <a
                      href={doc.pdfPath}
                      download
                      className="inline-flex items-center gap-2 rounded-full bg-white text-ink text-[13px] font-semibold no-underline px-4 py-2"
                    >
                      Баримтыг татаж авах
                    </a>
                  </div>
                </div>
              </object>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
