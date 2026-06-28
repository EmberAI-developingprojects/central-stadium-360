import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";

export default function PlaceholderPage({ title }: { title: string }) {
  useRevealOnScroll();
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />

      <section className="relative w-full bg-[linear-gradient(180deg,#0b1130_0%,#131c7a_100%)] text-white pt-24 pb-20 px-6 max-[920px]:pt-20 max-[920px]:pb-14">
        <div className="max-w-screen-page mx-auto text-center">
          <h1
            className={`m-0 text-gold-pale font-extrabold uppercase leading-[1.15] tracking-[0.01em] text-[44px] max-[920px]:text-[32px] max-[640px]:text-[24px] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${REVEAL_UP_CLS}`}
          >
            {title}
          </h1>
        </div>
      </section>

      <section className="flex-1 w-full bg-[#fafaf7] py-20 px-6 max-[920px]:py-14 max-[920px]:px-5">
        <div className="max-w-[820px] mx-auto text-center text-ink-soft">
          <p className={`text-[14.5px] leading-[1.7] ${REVEAL_UP_CLS}`}>
            Энэ хуудасны агуулгыг удахгүй нэмэх болно.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
