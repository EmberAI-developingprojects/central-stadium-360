

export const PAGE_BG =
  "radial-gradient(60% 50% at 100% 0%, rgba(34, 48, 198, 0.08) 0%, transparent 70%)," +
  "radial-gradient(50% 50% at 0% 100%, rgba(168, 153, 104, 0.10) 0%, transparent 70%)," +
  "#F6F7F9";

export const PAGE_CLS = "min-h-screen flex flex-col";

export const HEADER_CLS =
  "flex items-center justify-between max-w-screen-page w-full mx-auto py-6 px-8 max-[540px]:py-[18px] max-[540px]:px-5";

export const LOGO_CLS = "inline-flex items-center no-underline";

export const LOGO_IMG_CLS = "block h-12 w-auto max-[540px]:h-10";

export const BACK_CLS =
  "inline-flex items-center gap-2 text-sm font-semibold text-ink no-underline rounded-full py-[9px] px-4 bg-[rgba(255,255,255,0.75)] border border-solid border-[rgba(31,41,55,0.08)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] [transition:background_.2s_ease,color_.2s_ease,transform_.15s_ease,border-color_.2s_ease] hover:text-brand-blue hover:border-[rgba(34,48,198,0.25)] hover:bg-white hover:-translate-x-0.5 [&_svg]:w-[14px] [&_svg]:h-[14px]";

export const MAIN_CLS = "flex-1 grid place-items-center px-6 pt-6 pb-[72px]";

export const CARD_CLS =
  "w-full max-w-[440px] bg-[rgba(255,255,255,0.96)] border border-solid border-[rgba(31,41,55,0.06)] rounded-[22px] pt-10 px-[38px] pb-8 shadow-[0_30px_60px_-28px_rgba(31,41,55,0.25)] [backdrop-filter:blur(14px)_saturate(150%)] [-webkit-backdrop-filter:blur(14px)_saturate(150%)] text-center animate-login-pop max-[540px]:pt-8 max-[540px]:px-[22px] max-[540px]:pb-[26px] max-[540px]:rounded-[18px]";

export const EYEBROW_CLS =
  "inline-flex items-center gap-2 bg-brand-blue-tint text-brand-blue rounded-full text-xs font-bold uppercase mb-[18px] tracking-[.12em] py-1.5 pl-2.5 pr-3";

export const EYEBROW_DOT_CLS =
  "w-2 h-2 rounded-full bg-brand-blue inline-block";

export const TITLE_CLS =
  "text-3xl font-extrabold text-ink tracking-[-0.02em] m-0 mb-2.5 max-[540px]:text-[26px]";

export const SUBTITLE_CLS = "text-[14.5px] leading-[1.65] text-ink-soft m-0 mb-7";

export const FORM_CLS = "flex flex-col gap-4 text-left";

export const REG_FORM_CLS = "flex flex-col gap-[14px] text-left";

export const FIELD_CLS = "flex flex-col gap-1.5";

export const LABEL_CLS = "text-[12.5px] font-semibold text-ink tracking-[0.02em]";

export const INPUT_CLS =
  "w-full bg-white text-ink rounded-xl outline-none h-[46px] py-0 px-4 border border-solid border-[rgba(31,41,55,0.14)] font-[inherit] text-[14.5px] [transition:border-color_.2s_ease,box-shadow_.2s_ease] placeholder:text-[#b3b8c2] hover:border-[rgba(34,48,198,0.30)] focus:border-brand-blue focus:shadow-[0_0_0_4px_rgba(34,48,198,0.12)]";

export const PWD_WRAP_CLS = "relative block";
export const PWD_INPUT_CLS = `${INPUT_CLS} pr-[46px]`;
export const PWD_TOGGLE_CLS =
  "absolute top-1/2 -translate-y-1/2 right-2 w-[34px] h-[34px] rounded-lg border-0 bg-transparent text-ink-soft grid place-items-center cursor-pointer [transition:background_.15s_ease,color_.15s_ease] hover:bg-brand-blue-tint hover:text-brand-blue [&_svg]:w-4 [&_svg]:h-4";

export const SUBMIT_CLS =
  "mt-1 inline-flex items-center justify-center gap-2.5 bg-brand-blue text-white border-0 rounded-xl text-[15px] font-bold cursor-pointer h-12 font-[inherit] tracking-[0.01em] shadow-[0_10px_24px_-10px_rgba(34,48,198,0.55)] [transition:background_.2s_ease,transform_.15s_ease,box-shadow_.2s_ease] hover:bg-brand-blue-soft hover:-translate-y-px hover:shadow-[0_16px_28px_-10px_rgba(34,48,198,0.65)] active:translate-y-0 [&_svg]:w-4 [&_svg]:h-4 [&_svg]:[transition:transform_.2s_ease] hover:[&_svg]:translate-x-[3px] disabled:opacity-75 disabled:cursor-default disabled:translate-y-0 disabled:shadow-none";

export const DIVIDER_CLS =
  "flex items-center gap-3 mt-[22px] mb-4 text-ink-soft text-xs tracking-[.12em] uppercase before:content-[''] before:flex-1 before:h-px before:bg-[rgba(31,41,55,0.10)] after:content-[''] after:flex-1 after:h-px after:bg-[rgba(31,41,55,0.10)]";

export const REGISTER_CLS =
  "inline-flex items-center justify-center w-full rounded-xl text-brand-blue bg-transparent text-[14.5px] font-bold no-underline h-[46px] border-[1.5px] border-solid border-brand-blue [transition:background_.2s_ease,color_.2s_ease,transform_.15s_ease] hover:bg-brand-blue hover:text-white hover:-translate-y-px";

export const HOME_CLS =
  "inline-block mt-[22px] text-[13px] text-ink-soft no-underline [transition:color_.15s_ease] hover:text-brand-blue hover:underline";

export const REG_ALERT_CLS =
  "rounded-[10px] text-[13px] leading-[1.45] bg-[#FEE7E7] border border-solid border-[#F5C2C2] text-[#9B1C1C] py-2.5 px-[14px]";

export const REG_ALERT_OK_CLS =
  "rounded-[10px] text-[13px] leading-[1.45] bg-[rgba(16,185,129,0.10)] border border-solid border-[rgba(16,185,129,0.30)] text-[#047857] py-2.5 px-[14px]";

export const REG_HINT_CLS = "text-[11.5px] text-ink-soft mt-0.5 leading-[1.4]";

export const REG_TERMS_CLS =
  "flex items-start gap-2.5 text-[12.5px] leading-[1.5] text-ink-soft cursor-pointer select-none";
export const REG_CHECKBOX_CLS =
  "w-4 h-4 cursor-pointer m-0 mt-0.5 accent-brand-blue flex-none";

export const REG_TABS_CLS =
  "grid gap-1.5 p-1 bg-surface-1 rounded-xl border border-solid border-[rgba(31,41,55,0.08)] m-0 mb-[22px] [grid-template-columns:1fr_1fr]";
export const REG_TAB_CLS =
  "inline-flex items-center justify-center gap-2 bg-transparent border-0 rounded-[9px] text-[13.5px] font-semibold text-ink-soft cursor-pointer no-underline h-10 px-3 font-[inherit] [transition:background_.2s_ease,color_.2s_ease,box-shadow_.2s_ease] hover:text-brand-blue [&_svg]:w-[15px] [&_svg]:h-[15px]";
export const REG_TAB_ACTIVE_CLS =
  "bg-white text-brand-blue shadow-[0_4px_12px_-6px_rgba(31,41,55,0.2)]";

export const REG_PHONE_WRAP_CLS = "relative block";
export const REG_PHONE_PREFIX_CLS =
  "absolute left-[14px] top-1/2 -translate-y-1/2 text-sm font-semibold text-ink pr-2.5 border-r border-solid border-[rgba(31,41,55,0.14)] pointer-events-none";
export const REG_INPUT_PHONE_CLS = `${INPUT_CLS} pl-[66px] tracking-[.04em]`;

export const BTN_RESET_STYLE = {
  background: "none",
  border: 0,
  cursor: "pointer",
  font: "inherit",
};

export const FULL_RESET_BTN_STYLE = {
  background: "none",
  border: 0,
  cursor: "pointer",
  width: "100%",
  font: "inherit",
} as const;
