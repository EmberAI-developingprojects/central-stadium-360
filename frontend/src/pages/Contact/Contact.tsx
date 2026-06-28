import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const ADDRESS_MN =
  "Монгол улс, Улаанбаатар хот, Хан-Уул дүүрэг, 15-р хороо, Стадион 101/1, Төв цэнгэлдэх хүрээлэн-гийн байр";
const ADDRESS_EN =
  "Stadium 101/1, Khoroo 15, Khan-Uul District, Ulaanbaatar, Mongolia";
const PHONE_DISPLAY = "(+976) 7700-1212";
const PHONE_TEL = "+97677001212";
const EMAIL = "info@stadium.mn";

const MAP_PLACE = "Үндэсний Төв Цэнгэлдэх Хүрээлэн";

const MAP_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(
  MAP_PLACE,
)}&hl=mn&z=17&output=embed`;

const MAP_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(MAP_PLACE);

export default function Contact() {
  const { i18n } = useTranslation();
  const isEn = i18n.language.toLowerCase().startsWith("en");
  const address = isEn ? ADDRESS_EN : ADDRESS_MN;
  const hoursWeekday = isEn ? "Mon–Fri: 9:00–18:00" : "Даваа–Баасан: 9:00–18:00";
  const hoursWeekend = isEn ? "Sat, Sun: Closed" : "Бямба, Ням: Амарна";
  const title = isEn ? "GET IN TOUCH" : "ХОЛБОГДОХ МЭДЭЭЛЭЛ";
  const directionsLabel = isEn ? "Get directions" : "Замаа харах";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />

      <section className="relative w-full bg-zinc-100 flex-1 min-h-[calc(100vh-64px)]">
        <iframe
          src={MAP_EMBED_SRC}
          title="Төв цэнгэлдэх хүрээлэнгийн байршил"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
        />

        <div className="relative max-w-screen-page mx-auto h-full px-6 max-[920px]:px-5">
          <div className="absolute top-10 right-6 w-[400px] max-[920px]:right-5 max-[920px]:top-6 max-[920px]:w-[360px] max-[640px]:left-5 max-[640px]:right-5 max-[640px]:w-auto max-[640px]:top-5">
            <div className="bg-white rounded-2xl shadow-[0_24px_64px_-12px_rgba(11,17,48,0.25)] ring-1 ring-black/5 p-7 max-[640px]:p-5">
              <h1 className="m-0 text-[28px] max-[640px]:text-[22px] font-extrabold tracking-[-0.02em] text-[#0b1130] leading-[1.1]">
                {title}
              </h1>

              <div className="mt-6 flex flex-col gap-4">
                <InfoRow icon={<PinIcon />}>
                  <span className="text-[13.5px] leading-[1.55] text-zinc-700">
                    {address}
                  </span>
                  <a
                    href={MAP_DIRECTIONS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-blue no-underline hover:text-brand-blue-soft"
                  >
                    {directionsLabel}
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
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </a>
                </InfoRow>

                <InfoRow icon={<PhoneIcon />}>
                  <a
                    href={`tel:${PHONE_TEL}`}
                    className="text-[14px] font-medium text-zinc-900 no-underline hover:text-brand-blue tabular-nums"
                  >
                    {PHONE_DISPLAY}
                  </a>
                </InfoRow>

                <InfoRow icon={<MailIcon />}>
                  <a
                    href={`mailto:${EMAIL}`}
                    className="text-[14px] font-medium text-zinc-900 no-underline hover:text-brand-blue"
                  >
                    {EMAIL}
                  </a>
                </InfoRow>

                <InfoRow icon={<ClockIcon />}>
                  <div className="text-[13.5px] leading-[1.6] text-zinc-700">
                    <div>{hoursWeekday}</div>
                    <div className="text-zinc-500">{hoursWeekend}</div>
                  </div>
                </InfoRow>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue-tint text-brand-blue">
        {icon}
      </span>
      <div className="min-w-0 flex-1 pt-1.5 flex flex-col">{children}</div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
