export const WATCH_PAGE_BG =
  "radial-gradient(60% 50% at 80% 0%, rgba(34, 48, 198, 0.18) 0%, transparent 65%)," +
  "radial-gradient(50% 50% at 0% 100%, rgba(168, 153, 104, 0.08) 0%, transparent 70%)," +
  "#0B0F1A";

export const WATCH_PAGE_CLS =
  "watch-page min-h-screen w-full max-w-[100vw] overflow-x-hidden text-[rgba(255,255,255,0.88)]";

export const WATCH_HEADER_CLS =
  "watch-header sticky top-0 z-50 grid items-center gap-8 py-[18px] px-8 bg-[rgba(11,15,26,0.7)] [backdrop-filter:blur(18px)_saturate(160%)] [-webkit-backdrop-filter:blur(18px)_saturate(160%)] border-b border-solid border-[rgba(255,255,255,0.06)] [grid-template-columns:auto_1fr_auto] max-[900px]:[grid-template-columns:minmax(0,auto)_minmax(0,1fr)] max-[900px]:gap-3 max-[900px]:py-[12px] max-[900px]:px-4 max-[420px]:px-3 max-[420px]:gap-2";

export const WATCH_LOGO_CLS =
  "inline-flex items-center no-underline shrink-0 [&_img]:block [&_img]:w-auto [&_img]:h-11 max-[540px]:[&_img]:h-9 max-[420px]:[&_img]:h-8";

export const WATCH_TABS_CLS =
  "justify-self-center inline-flex gap-1 p-1 rounded-full bg-[rgba(255,255,255,0.05)] border border-solid border-[rgba(255,255,255,0.08)] max-[900px]:[grid-column:1/-1] max-[900px]:order-3 max-[900px]:justify-self-stretch max-[900px]:justify-center";

export const WATCH_TAB_CLS =
  "inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold no-underline py-2 px-[18px] text-[rgba(255,255,255,0.65)] [transition:background_.2s_ease,color_.2s_ease] hover:text-white max-[540px]:py-[7px] max-[540px]:px-3 max-[540px]:text-xs";

export const WATCH_TAB_ACTIVE_CLS =
  "is-active !bg-brand-blue !text-white shadow-[0_8px_20px_-10px_rgba(34,48,198,0.7)]";

export const WATCH_TAB_COUNT_CLS =
  "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-brand-blue text-white text-[10.5px] font-extrabold py-0 px-[5px] tracking-normal [.is-active_&]:bg-white [.is-active_&]:text-brand-blue";

export const WATCH_USER_CLS =
  "inline-flex items-center gap-2.5 min-w-0 justify-end justify-self-end max-[420px]:gap-1.5";

export const WATCH_USER_CHIP_CLS =
  "inline-flex items-center gap-2 rounded-full text-[13px] font-semibold text-white py-2 px-[14px] bg-[rgba(255,255,255,0.08)] border border-solid border-[rgba(255,255,255,0.1)] [&_svg]:w-4 [&_svg]:h-4 max-[540px]:py-1.5 max-[540px]:px-2.5 max-[540px]:text-xs";

export const WATCH_LOGOUT_CLS =
  "bg-transparent border-0 text-[13px] cursor-pointer text-[rgba(255,255,255,0.55)] font-[inherit] [transition:color_.15s_ease] hover:text-white";

export const WATCH_MAIN_CLS =
  "max-w-screen-page mx-auto pt-10 px-8 pb-20 max-[920px]:px-6 max-[540px]:pt-5 max-[540px]:px-4 max-[540px]:pb-14 max-[420px]:px-3";

export const WATCH_BTN_CLS =
  "inline-flex items-center gap-2 rounded-[10px] text-[13.5px] font-bold cursor-pointer no-underline py-[11px] px-[18px] font-[inherit] border border-solid border-transparent [transition:background_.2s_ease,color_.2s_ease,transform_.15s_ease,border-color_.2s_ease] [&_svg]:w-[15px] [&_svg]:h-[15px]";

export const WATCH_BTN_PRIMARY_CLS =
  "bg-brand-blue text-white shadow-[0_10px_22px_-10px_rgba(34,48,198,0.7)] hover:bg-brand-blue-soft hover:-translate-y-px disabled:opacity-70 disabled:cursor-default disabled:translate-y-0";

export const WATCH_BTN_GHOST_CLS =
  "text-white bg-[rgba(255,255,255,0.06)] !border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.12)]";

export const WATCH_SECTION_CLS = "mt-16 first:mt-0";
export const WATCH_SECTION_HEAD_CLS = "mb-6";
export const WATCH_EYEBROW_CLS =
  "inline-flex items-center gap-2 text-xs font-bold uppercase text-brand-blue-soft mb-2 tracking-[.18em]";
export const WATCH_LIVE_DOT_CLS =
  "w-2 h-2 rounded-full bg-[#E53935] shadow-[0_0_0_0_rgba(229,57,53,0.6)] [animation:liveBlink_1.6s_ease-out_infinite]";
export const WATCH_TITLE_CLS =
  "text-3xl font-extrabold tracking-[-0.02em] text-white m-0 max-[900px]:text-2xl";

export const WATCH_FEATURE_CLS =
  "grid gap-7 rounded-[22px] p-[22px] [grid-template-columns:1.4fr_1fr] bg-[rgba(255,255,255,0.03)] border border-solid border-[rgba(255,255,255,0.08)] max-[900px]:[grid-template-columns:1fr]";

export const WATCH_PLAYER_CLS =
  "relative rounded-2xl overflow-hidden [aspect-ratio:16/9] bg-black shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:block [&_video]:[transition:filter_.35s_ease]";

export const WATCH_PLAYER_LOCKED_CLS =
  "is-locked [&_video]:[filter:blur(14px)_brightness(.7)] [&_video]:[transform:scale(1.06)]";

export const WATCH_LOCKED_CLS =
  "absolute inset-0 z-[4] grid place-items-center pointer-events-none [background:linear-gradient(180deg,rgba(11,15,26,0.35)_0%,rgba(11,15,26,0.6)_100%)]";
export const WATCH_LOCKED_INNER_CLS =
  "text-center text-white rounded-[14px] max-w-[320px] flex flex-col items-center gap-2 py-[18px] px-[22px] bg-[rgba(11,15,26,0.55)] border border-solid border-[rgba(255,255,255,0.08)] [backdrop-filter:blur(10px)] [-webkit-backdrop-filter:blur(10px)] [&_strong]:text-[14.5px] [&_strong]:font-extrabold [&_strong]:tracking-[.01em] [&>span]:text-[12.5px] [&>span]:leading-[1.5] [&>span]:text-[rgba(255,255,255,0.75)]";
export const WATCH_LOCKED_ICON_CLS =
  "w-11 h-11 rounded-full text-brand-blue-soft grid place-items-center mb-1 bg-[rgba(34,48,198,0.25)] [&_svg]:w-5 [&_svg]:h-5";

export const WATCH_PLAYER_OVERLAY_CLS =
  "absolute inset-0 flex justify-between items-start p-4 pointer-events-none [background:linear-gradient(180deg,rgba(0,0,0,0.55)_0%,transparent_30%,transparent_70%,rgba(0,0,0,0.55)_100%)]";
export const WATCH_LIVE_PILL_CLS =
  "inline-flex items-center gap-2 text-white text-[11px] font-extrabold rounded-full bg-[#E53935] tracking-[.14em] py-[5px] px-[11px]";
export const WATCH_LIVE_PULSE_CLS =
  "rounded-full bg-white w-[7px] h-[7px] shadow-[0_0_0_0_rgba(255,255,255,0.9)] [animation:live-pulse_1.4s_ease-in-out_infinite]";
export const WATCH_PLAYER_META_CLS =
  "self-end ml-auto text-white text-xs font-semibold rounded-lg pointer-events-auto bg-[rgba(0,0,0,0.5)] py-1.5 px-2.5 [backdrop-filter:blur(6px)] [-webkit-backdrop-filter:blur(6px)]";

export const WATCH_PLAY_CLS =
  "absolute w-12 h-12 rounded-full border-0 text-white grid place-items-center cursor-pointer left-4 bottom-4 bg-[rgba(255,255,255,0.15)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] [transition:background_.18s_ease,transform_.18s_ease] hover:bg-brand-blue hover:scale-[1.06] [&_svg]:w-5 [&_svg]:h-5";

export const WATCH_FEATURE_TEXT_CLS = "flex flex-col py-1 pr-1 pl-0";
export const WATCH_BADGE_CLS =
  "self-start text-brand-blue-soft text-[11px] font-bold uppercase rounded-full mb-3 bg-[rgba(34,48,198,0.18)] tracking-[.14em] py-[5px] px-2.5 border border-solid border-[rgba(34,48,198,0.4)]";
export const WATCH_FEATURE_TITLE_CLS =
  "text-[26px] font-extrabold tracking-[-0.01em] m-0 mb-3 text-white leading-[1.2] max-[900px]:text-[22px]";
export const WATCH_FEATURE_DESC_CLS =
  "text-sm leading-[1.6] m-0 mb-[18px] text-[rgba(255,255,255,0.7)]";
export const WATCH_META_LIST_CLS =
  "list-none p-0 m-0 mb-[22px] flex flex-col gap-2 text-[13px] text-[rgba(255,255,255,0.75)]";
export const WATCH_FEATURE_ACTIONS_CLS = "flex gap-2.5 flex-wrap";

export const WATCH_GRID_CLS =
  "grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]";
export const WATCH_CARD_CLS =
  "group rounded-2xl overflow-hidden flex flex-col bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.08)] [transition:transform_.3s_cubic-bezier(.34,1.56,.64,1),border-color_.25s_ease,box-shadow_.25s_ease] hover:-translate-y-1 hover:border-[rgba(34,48,198,0.5)] hover:shadow-[0_24px_42px_-22px_rgba(34,48,198,0.5)]";
export const WATCH_CARD_IMG_CLS =
  "relative overflow-hidden [aspect-ratio:16/9] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:block [&_img]:[transition:transform_.5s_ease] [&_img]:group-hover:scale-[1.06]";
export const WATCH_CARD_PILL_CLS =
  "absolute text-white text-[10.5px] font-bold uppercase rounded-full top-3 left-3 bg-[rgba(11,15,26,0.75)] tracking-[.12em] py-[5px] px-[9px] [backdrop-filter:blur(6px)] [-webkit-backdrop-filter:blur(6px)]";
export const WATCH_CARD_BODY_CLS =
  "flex flex-col gap-2 flex-1 pt-4 px-4 pb-[18px]";
export const WATCH_CARD_DATE_CLS =
  "text-xs font-bold text-brand-blue-soft tracking-[.08em]";
export const WATCH_CARD_TITLE_CLS =
  "text-base font-bold text-white m-0 leading-[1.3]";
export const WATCH_CARD_DESC_CLS =
  "text-[13px] leading-[1.55] m-0 flex-1 text-[rgba(255,255,255,0.65)]";
export const WATCH_CARD_ACTIONS_CLS =
  "mt-2.5 flex items-center justify-between gap-3";
export const WATCH_CARD_PRICE_CLS =
  "text-[12.5px] font-semibold text-[rgba(255,255,255,0.6)]";

export const TICKETS_LIST_CLS =
  "grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]";

export const TICKET_STUB_CLS =
  "relative bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.08)] rounded-[18px] overflow-hidden flex flex-col [transition:transform_.3s_cubic-bezier(.34,1.56,.64,1),border-color_.25s_ease,box-shadow_.25s_ease] hover:-translate-y-[3px] hover:border-[rgba(34,48,198,0.45)] hover:shadow-[0_24px_42px_-22px_rgba(34,48,198,0.45)] before:content-[''] before:absolute before:top-[calc(16/8*100%*(1/(1+1.05)))] before:w-[14px] before:h-[14px] before:rounded-full before:bg-[#0B0F1A] before:z-[2] before:-left-[7px] after:content-[''] after:absolute after:top-[calc(16/8*100%*(1/(1+1.05)))] after:w-[14px] after:h-[14px] after:rounded-full after:bg-[#0B0F1A] after:z-[2] after:-right-[7px]";

export const TICKET_STUB_COVER_CLS =
  "relative [aspect-ratio:16/8] overflow-hidden [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:block [&_img]:[filter:saturate(.9)]";

export const TICKET_STUB_TIER_CLS =
  "absolute top-3 left-3 bg-brand-blue text-white text-[10.5px] font-extrabold tracking-[.14em] uppercase py-[5px] px-2.5 rounded-full shadow-[0_6px_14px_-6px_rgba(34,48,198,0.7)]";

export const TICKET_STUB_BODY_CLS =
  "pt-[22px] px-[22px] pb-5 flex flex-col gap-[14px] [background:linear-gradient(to_bottom,rgba(255,255,255,0.02)_0%,transparent_30%),transparent] relative before:content-[''] before:absolute before:top-0 before:left-[14px] before:right-[14px] before:border-t before:border-dashed before:border-[rgba(255,255,255,0.18)]";

export const TICKET_STUB_DATE_CLS =
  "text-[11.5px] font-extrabold tracking-[.14em] text-brand-blue-soft uppercase";

export const TICKET_STUB_TITLE_CLS =
  "text-[17px] font-extrabold text-white -mt-1.5 mb-1 leading-[1.3] tracking-[-0.01em]";

export const TICKET_STUB_META_CLS =
  "m-0 grid [grid-template-columns:1fr_1fr] gap-y-3 gap-x-4 [&>div]:min-w-0";
export const TICKET_STUB_META_DT_CLS =
  "text-[10.5px] font-bold tracking-[.14em] uppercase text-[rgba(255,255,255,0.5)] mb-[3px]";
export const TICKET_STUB_META_DD_CLS = "m-0 text-sm font-bold text-white";
export const TICKET_STUB_CODE_CLS =
  "!text-brand-blue-soft !text-[14.5px] tracking-[.12em] [font-variant-numeric:tabular-nums]";

export const TICKET_STUB_BARCODE_CLS =
  "h-[38px] opacity-85 rounded mt-0.5 [background:repeating-linear-gradient(90deg,#fff_0_2px,transparent_2px_4px,#fff_4px_5px,transparent_5px_9px,#fff_9px_12px,transparent_12px_14px,#fff_14px_15px,transparent_15px_19px,#fff_19px_22px,transparent_22px_25px,#fff_25px_26px,transparent_26px_30px)]";

export const TICKET_STUB_ACTIONS_CLS = "flex gap-2.5 mt-1";

export const TICKET_STUB_BTN_CLS =
  "!flex-1 !justify-center !py-2.5 !px-[14px] !text-[13px] [&_svg]:!w-[14px] [&_svg]:!h-[14px]";
export const TICKET_STUB_REMOVE_HOVER_CLS =
  "hover:!text-[#FCA5A5] hover:!border-[rgba(252,165,165,0.4)]";

export const TICKETS_EMPTY_CLS =
  "[grid-column:1/-1] text-center py-14 px-6 bg-[rgba(255,255,255,0.03)] border border-dashed border-[rgba(255,255,255,0.12)] rounded-[18px] [&_h3]:text-[18px] [&_h3]:font-extrabold [&_h3]:text-white [&_h3]:m-0 [&_h3]:mb-2 [&_p]:text-[13.5px] [&_p]:text-[rgba(255,255,255,0.6)] [&_p]:m-0 [&_p]:mx-auto [&_p]:mb-[22px] [&_p]:max-w-[380px] [&_p]:leading-[1.6]";
export const TICKETS_EMPTY_ICON_CLS =
  "w-16 h-16 mx-auto mb-4 rounded-[18px] bg-[rgba(34,48,198,0.16)] text-brand-blue-soft grid place-items-center [&_svg]:w-[30px] [&_svg]:h-[30px]";

export const TICKET_MODAL_CLS =
  "fixed inset-0 z-[200] grid place-items-center p-6";

export const TICKET_MODAL_BACKDROP_CLS =
  "absolute inset-0 bg-[rgba(5,8,16,0.72)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] [animation:tmFade_.25s_ease]";

export const TICKET_MODAL_CARD_CLS =
  "relative overflow-auto rounded-[20px] w-[min(880px,100%)] max-h-[92vh] bg-[#11172A] text-[rgba(255,255,255,0.88)] border border-solid border-[rgba(255,255,255,0.08)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] [animation:tmPop_.35s_cubic-bezier(.34,1.56,.64,1)_both]";

export const TICKET_MODAL_CLOSE_CLS =
  "absolute z-[2] w-9 h-9 rounded-full text-white grid cursor-pointer top-[14px] right-[14px] bg-[rgba(255,255,255,0.08)] border border-solid border-[rgba(255,255,255,0.1)] place-items-center [transition:background_.15s_ease] hover:bg-[rgba(255,255,255,0.16)] [&_svg]:w-4 [&_svg]:h-4";

export const TICKET_MODAL_BODY_CLS =
  "grid gap-0 [grid-template-columns:0.85fr_1fr] max-[700px]:[grid-template-columns:1fr]";

export const TICKET_MODAL_COVER_CLS =
  "relative min-h-full bg-black max-[700px]:min-h-0 max-[700px]:[aspect-ratio:16/9] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:block [&_img]:opacity-85";

export const TICKET_MODAL_COVER_META_CLS =
  "absolute top-auto right-0 bottom-0 left-0 p-[22px] [background:linear-gradient(180deg,transparent_0%,rgba(5,8,16,0.92)_100%)]";

export const TICKET_MODAL_DATE_CLS =
  "inline-block text-xs font-bold text-brand-blue-soft mb-2 tracking-[.12em]";

export const TICKET_MODAL_TITLE_CLS =
  "text-[22px] font-extrabold text-white m-0 mb-2 leading-[1.25] tracking-[-0.01em]";

export const TICKET_MODAL_VENUE_CLS =
  "text-[13px] text-[rgba(255,255,255,0.75)]";

export const TICKET_MODAL_FORM_CLS =
  "flex flex-col gap-[18px] pt-[26px] pr-7 pb-7 pl-7 max-[700px]:py-[22px] max-[700px]:px-5";

export const TICKET_SECTION_CLS = "flex flex-col gap-2.5";
export const TICKET_SECTION_LABEL_CLS =
  "text-[11.5px] font-bold uppercase tracking-[.14em] text-[rgba(255,255,255,0.55)]";

export const TICKET_RADIO_GROUP_CLS = "grid gap-2 [grid-template-columns:1fr]";
export const TICKET_RADIO_LABEL_CLS = "block cursor-pointer";

export const TICKET_RADIO_INPUT_CLS =
  "peer absolute opacity-0 pointer-events-none";

export const TICKET_RADIO_CARD_CLS =
  "grid [grid-template-columns:1fr_auto] [grid-auto-rows:auto] gap-y-[2px] gap-x-[14px] py-3 px-[14px] rounded-xl bg-[rgba(255,255,255,0.04)] border-[1.5px] border-solid border-[rgba(255,255,255,0.08)] [transition:border-color_.2s_ease,background_.2s_ease] hover:border-[rgba(34,48,198,0.4)] peer-checked:border-brand-blue peer-checked:bg-[rgba(34,48,198,0.16)] peer-checked:shadow-[0_8px_22px_-12px_rgba(34,48,198,0.6)]";

export const TICKET_TIER_NAME_CLS =
  "text-[14.5px] font-bold text-white [grid-column:1]";
export const TICKET_TIER_DESC_CLS =
  "text-xs leading-[1.45] text-[rgba(255,255,255,0.6)] [grid-column:1]";
export const TICKET_TIER_PRICE_CLS =
  "self-center text-[14.5px] font-extrabold text-brand-blue-soft whitespace-nowrap [grid-column:2] [grid-row:1/3]";

export const TICKET_PAY_NAME_CLS = TICKET_TIER_NAME_CLS;
export const TICKET_PAY_DESC_CLS = TICKET_TIER_DESC_CLS;

export const TICKET_ROW_CLS =
  "flex-row items-end justify-between gap-4 max-[700px]:flex-col max-[700px]:items-stretch";

export const TICKET_QTY_CLS =
  "inline-flex items-center gap-3 mt-1.5 rounded-xl p-1 bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.08)]";
export const TICKET_QTY_BTN_CLS =
  "w-[34px] h-[34px] rounded-[9px] text-white border-0 text-lg font-bold cursor-pointer bg-[rgba(255,255,255,0.06)] font-[inherit] [transition:background_.15s_ease] hover:bg-brand-blue";
export const TICKET_QTY_VAL_CLS =
  "text-center text-[15px] font-bold text-white min-w-[28px]";

export const TICKET_TOTAL_WRAP_CLS = "text-right max-[700px]:text-left";
export const TICKET_TOTAL_CLS =
  "block mt-1.5 text-[22px] font-extrabold text-white tracking-[-0.01em]";

export const TICKET_ALERT_CLS =
  "rounded-[10px] text-[13px] bg-[rgba(229,57,53,0.12)] border border-solid border-[rgba(229,57,53,0.4)] text-[#FCA5A5] py-2.5 px-[14px]";

export const TICKET_CHECKOUT_CLS =
  "!justify-center !text-[14.5px] !h-[50px] disabled:opacity-75 disabled:cursor-default disabled:translate-y-0";

export const TICKET_FINEPRINT_CLS =
  "text-[11.5px] leading-[1.55] text-center m-0 text-[rgba(255,255,255,0.5)]";

export const TICKET_MODAL_SUCCESS_CLS = "text-center pt-10 pr-9 pb-9 pl-9";
export const TICKET_SUCCESS_ICON_CLS =
  "w-16 h-16 mx-auto mb-[18px] rounded-full grid place-items-center bg-[rgba(34,197,94,0.16)] text-[#22C55E] [animation:tmPop_.5s_cubic-bezier(.34,1.56,.64,1)_both] [&_svg]:w-[30px] [&_svg]:h-[30px]";
export const TICKET_SUCCESS_TITLE_CLS =
  "text-[22px] font-extrabold text-white m-0 mb-2.5";
export const TICKET_SUCCESS_DESC_CLS =
  "text-sm leading-[1.65] m-0 mb-5 text-[rgba(255,255,255,0.72)]";
export const TICKET_SUCCESS_CODE_CLS =
  "inline-block rounded-xl text-[11.5px] uppercase mb-[22px] py-[14px] px-[22px] bg-[rgba(255,255,255,0.05)] border border-dashed border-[rgba(255,255,255,0.18)] tracking-[.12em] text-[rgba(255,255,255,0.6)] [&_strong]:inline-block [&_strong]:mt-1.5 [&_strong]:text-white [&_strong]:text-[22px] [&_strong]:tracking-[.15em]";
export const TICKET_SUCCESS_ACTIONS_CLS = "inline-flex gap-2.5";

export const VIEWER_CLS =
  "fixed inset-0 z-[250] w-screen max-w-[100vw] flex flex-col text-white overflow-x-hidden [animation:tmFade_.25s_ease] [background:radial-gradient(70%_45%_at_50%_-5%,rgba(34,48,198,0.22)_0%,transparent_55%),radial-gradient(45%_35%_at_90%_115%,rgba(245,158,11,0.07)_0%,transparent_70%),#05080F]";

export const VIEWER_HEADER_CLS =
  "grid items-center gap-[18px] flex-none [grid-template-columns:auto_1fr_auto] py-[14px] px-[22px] bg-[rgba(11,15,26,0.92)] border-b border-solid border-[rgba(255,255,255,0.06)] max-[720px]:[grid-template-columns:auto_1fr] max-[720px]:py-2.5 max-[720px]:px-[14px]";

export const VIEWER_CLOSE_CLS =
  "w-[38px] h-[38px] rounded-full text-white cursor-pointer grid place-items-center bg-[rgba(255,255,255,0.08)] border border-solid border-[rgba(255,255,255,0.1)] [transition:background_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.16)] hover:[transform:rotate(90deg)] [&_svg]:w-[18px] [&_svg]:h-[18px]";

export const VIEWER_TITLE_WRAP_CLS = "flex items-center gap-[14px] min-w-0";
export const VIEWER_TITLE_CLS =
  "text-base font-bold text-white m-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[50vw] max-[720px]:text-sm max-[720px]:max-w-[60vw]";
export const VIEWER_LIVE_PILL_CLS =
  "inline-flex items-center gap-2 text-white text-[11px] font-extrabold rounded-full bg-[rgba(229,57,53,0.14)] border border-solid border-[rgba(229,57,53,0.45)] tracking-[.12em] py-[5px] px-[11px] flex-none [font-variant-numeric:tabular-nums] [&>span:last-child]:text-[rgba(255,255,255,0.75)] [&>span:last-child]:font-semibold";
export const VIEWER_LIVE_PULSE_CLS =
  "rounded-full bg-[#ef4444] w-[7px] h-[7px] shadow-[0_0_0_0_rgba(239,68,68,0.9)] [animation:live-pulse_1.4s_ease-in-out_infinite]";

export const VIEWER_STATS_CLS =
  "inline-flex items-center gap-2 max-[720px]:[grid-column:1/-1] max-[720px]:justify-self-stretch max-[720px]:justify-between";
export const VIEWER_STAT_CLS =
  "inline-flex items-center gap-2 rounded-full text-[13px] font-semibold py-2 px-[14px] bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.08)] [font-variant-numeric:tabular-nums] [&_svg]:w-4 [&_svg]:h-4";
export const VIEWER_ICON_BTN_CLS =
  "w-[38px] h-[38px] rounded-[10px] text-white cursor-pointer grid place-items-center bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.08)] [transition:background_.15s_ease,color_.15s_ease,transform_.15s_ease] hover:bg-brand-blue hover:-translate-y-px [&_svg]:w-[17px] [&_svg]:h-[17px] max-[720px]:!w-[44px] max-[720px]:!h-[44px] max-[720px]:!rounded-xl max-[720px]:[&_svg]:!w-[19px] max-[720px]:[&_svg]:!h-[19px]";
export const VIEWER_ICON_BTN_ON_CLS = "is-on !bg-brand-blue";

export const VIEWER_BODY_CLS =
  "flex-1 min-h-0 min-w-0 max-w-full w-full gap-[18px] p-[16px] overflow-x-hidden overflow-y-auto grid [grid-template-columns:132px_minmax(0,1fr)_300px] max-[1100px]:!flex max-[1100px]:!flex-col max-[720px]:p-2.5 max-[720px]:gap-2";

export const VIEWER_ANGLES_CLS =
  "flex flex-col gap-2.5 min-h-0 overflow-y-auto overflow-x-hidden pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.1)] [&::-webkit-scrollbar-thumb]:rounded-full max-[1100px]:hidden";
export const VIEWER_ANGLE_CLS =
  "block bg-transparent border-0 p-0 cursor-pointer text-left text-white [transition:transform_.2s_ease,opacity_.2s_ease] opacity-70 hover:opacity-100 hover:-translate-y-0.5 [&.is-active]:opacity-100";
export const VIEWER_ANGLE_ACTIVE_CLS = "is-active";
export const VIEWER_ANGLE_THUMB_CLS =
  "block relative rounded-[10px] overflow-hidden [aspect-ratio:16/9] bg-black border border-solid border-[rgba(255,255,255,0.08)] [transition:border-color_.2s_ease,box-shadow_.2s_ease] [.is-active_&]:!border-brand-blue [.is-active_&]:!border-2 [.is-active_&]:shadow-[0_10px_24px_-10px_rgba(34,48,198,0.75),0_0_0_2px_rgba(245,158,11,0.18)] [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:block";

export const VFX_VIDEO_CLS: Record<
  "stage" | "crowd" | "drone" | "band",
  string
> = {
  stage: "[&_video]:[transform:scale(1.02)] [&_video]:[filter:saturate(1.05)]",
  crowd:
    "[&_video]:[transform:scale(1.35)_translateY(8%)] [&_video]:[filter:brightness(.92)_saturate(.95)]",
  drone:
    "[&_video]:[transform:scale(.9)] [&_video]:[filter:hue-rotate(-8deg)_saturate(.85)_brightness(1.05)]",
  band: "[&_video]:[transform:scale(1.25)_translate(-8%,4%)] [&_video]:[filter:contrast(1.05)_saturate(1.1)]",
};
export const VIEWER_ANGLE_LIVE_CLS =
  "absolute w-2 h-2 rounded-full top-2 left-2 bg-[#E53935] shadow-[0_0_0_0_rgba(229,57,53,0.6)] [animation:live-pulse_1.4s_ease-in-out_infinite]";
export const VIEWER_ANGLE_LABEL_CLS =
  "flex flex-col mt-1.5 text-[11.5px] leading-[1.25] [&_strong]:text-white [&_strong]:font-bold [&_strong]:truncate [&_small]:text-[9.5px] [&_small]:uppercase [&_small]:text-[rgba(255,255,255,0.45)] [&_small]:tracking-[.08em] [&_small]:truncate [.is-active_&_strong]:text-brand-blue-soft";

export const VIEWER_MOBILE_CAMS_CLS =
  "hidden max-[1100px]:flex flex-row gap-2 overflow-x-auto overflow-y-hidden -mx-2.5 px-2.5 pb-1.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [.is-fs_&]:!hidden";
export const VIEWER_MOBILE_CAM_CLS =
  "shrink-0 w-[116px] block bg-transparent border-0 p-0 cursor-pointer text-left text-white snap-start [transition:opacity_.15s_ease,transform_.15s_ease] opacity-65 [&.is-active]:opacity-100 active:scale-[0.97]";
export const VIEWER_MOBILE_CAM_THUMB_CLS =
  "block relative rounded-[10px] overflow-hidden aspect-[16/9] bg-black border border-solid border-[rgba(255,255,255,0.1)] [transition:border-color_.15s_ease,box-shadow_.15s_ease] [.is-active_&]:!border-2 [.is-active_&]:!border-brand-blue [.is-active_&]:shadow-[0_8px_22px_-10px_rgba(34,48,198,0.75),0_0_0_2px_rgba(245,158,11,0.18)]";
export const VIEWER_MOBILE_CAM_LABEL_CLS =
  "block mt-1.5 text-[11.5px] font-bold truncate text-white [.is-active_&]:text-brand-blue-soft";

export const VIEWER_STAGE_CLS =
  "relative min-h-0 min-w-0 max-w-full flex flex-col gap-3 max-[1100px]:w-full [&.is-fs]:w-screen [&.is-fs]:h-screen [&.is-fs]:p-0 [&.is-fs]:bg-black [&.is-fs]:gap-0 [&.is-fs.is-idle]:cursor-none";
export const VIEWER_STAGE_SHELL_CLS =
  "flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-black shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9),0_0_80px_-30px_rgba(34,48,198,0.45),inset_0_0_0_1px_rgba(255,255,255,0.04)] max-[1100px]:!flex-none max-[1100px]:w-full max-[1100px]:!h-[calc((100vw-20px)*9/16)] max-[1100px]:!max-h-[70vh] max-[720px]:!h-[calc((100vw-20px)*9/16)] max-[720px]:!max-h-none [@media_(max-height:500px)]:!max-h-[calc(100dvh-220px)] [.is-fs_&]:!flex-1 [.is-fs_&]:!h-auto [.is-fs_&]:!max-h-none [.is-fs_&]:rounded-none [.is-fs_&]:shadow-none [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:block [&_video]:[transition:transform_.35s_ease,filter_.35s_ease]";
export const VIEWER_MAIN_CAM_CLS =
  "absolute top-4 left-4 z-[2] bg-[rgba(11,15,26,0.7)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] py-[7px] px-[13px] rounded-full text-xs text-[rgba(255,255,255,0.9)] tracking-[.04em] [&_strong]:text-white [&_strong]:font-bold [&_strong]:mr-1 [.is-fs_&]:top-[22px] [.is-fs_&]:left-[22px] [.is-fs_&]:[transition:opacity_.25s_ease] [.is-fs.is-idle_&]:opacity-0";

export const VIEWER_REACT_FLOAT_CLS =
  "absolute inset-0 pointer-events-none overflow-hidden";

export const VIEWER_CONTROLS_CLS =
  "flex-none min-w-0 grid [grid-template-columns:minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 py-2.5 px-[14px] bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.08)] rounded-[14px] [.is-fs_&]:absolute [.is-fs_&]:left-1/2 [.is-fs_&]:bottom-6 [.is-fs_&]:[transform:translateX(-50%)] [.is-fs_&]:w-[min(900px,calc(100vw-32px))] [.is-fs_&]:bg-[rgba(11,15,26,0.65)] [.is-fs_&]:[backdrop-filter:blur(14px)_saturate(160%)] [.is-fs_&]:[-webkit-backdrop-filter:blur(14px)_saturate(160%)] [.is-fs_&]:border-[rgba(255,255,255,0.12)] [.is-fs_&]:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.6)] [.is-fs_&]:opacity-100 [.is-fs_&]:[transition:opacity_.25s_ease] [.is-fs.is-idle_&]:!opacity-0 [.is-fs.is-idle_&]:pointer-events-none max-[720px]:!flex max-[720px]:!flex-wrap max-[720px]:!items-center max-[720px]:!justify-between max-[720px]:gap-2.5 max-[720px]:py-3 max-[720px]:px-3 max-[720px]:rounded-[16px] max-[720px]:!bg-[rgba(11,15,26,0.85)] max-[720px]:!border-[rgba(255,255,255,0.10)]";
export const VIEWER_CONTROLS_LEFT_CLS =
  "inline-flex items-center gap-2.5 min-w-0 max-[720px]:gap-1.5";
export const VIEWER_CONTROLS_RIGHT_CLS =
  "inline-flex items-center gap-2.5 justify-self-end max-[720px]:justify-self-auto max-[720px]:gap-1.5";

export const VIEWER_VOL_CLS =
  "[appearance:none] [-webkit-appearance:none] w-[110px] h-1 bg-[rgba(255,255,255,0.18)] rounded-full cursor-pointer max-[720px]:hidden [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand-blue [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer";

export const VIEWER_REACTIONS_CLS =
  "inline-flex gap-1.5 p-1 bg-[rgba(255,255,255,0.04)] rounded-full border border-solid border-[rgba(255,255,255,0.06)] shrink-0 max-[720px]:gap-1 max-[720px]:order-3 max-[720px]:[flex-basis:100%] max-[720px]:justify-center";
export const VIEWER_REACT_CLS =
  "w-9 h-9 rounded-full border-0 bg-transparent text-lg cursor-pointer [transition:background_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.1)] hover:scale-[1.12] active:scale-90 max-[720px]:w-8 max-[720px]:h-8 max-[720px]:text-base";

export const VIEWER_QUALITY_CLS =
  "inline-flex items-center gap-2 text-xs text-[rgba(255,255,255,0.7)] max-[720px]:gap-1.5 [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:bg-[rgba(255,255,255,0.06)] [&_select]:border [&_select]:border-solid [&_select]:border-[rgba(255,255,255,0.1)] [&_select]:text-white [&_select]:font-[inherit] [&_select]:text-[12.5px] [&_select]:font-semibold [&_select]:pt-[7px] [&_select]:pr-[26px] [&_select]:pb-[7px] [&_select]:pl-3 [&_select]:rounded-[9px] [&_select]:cursor-pointer [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_9px_center] [&_select]:[background-size:9px_5px] [&_select]:[background-image:url(\"data:image/svg+xml;utf8,<svg_xmlns='http://www.w3.org/2000/svg'_viewBox='0_0_10_6'><path_d='M1_1l4_4_4-4'_stroke='%23fff'_stroke-width='1.6'_fill='none'_stroke-linecap='round'_stroke-linejoin='round'/></svg>\")] max-[720px]:[&_select]:text-[11.5px] max-[720px]:[&_select]:pt-1.5 max-[720px]:[&_select]:pb-1.5 max-[720px]:[&_select]:pl-2";

export const VIEWER_CHAT_CLS =
  "flex flex-col min-h-0 min-w-0 max-w-full bg-[rgba(255,255,255,0.03)] border border-solid border-[rgba(255,255,255,0.08)] rounded-[14px] overflow-hidden max-[1100px]:w-full max-[1100px]:!flex-1 max-[1100px]:min-h-[260px]";
export const VIEWER_CHAT_HEAD_CLS =
  "flex-none py-[14px] px-4 border-b border-solid border-[rgba(255,255,255,0.06)] text-[13px] font-bold tracking-[.04em] text-white inline-flex items-center gap-2 [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-brand-blue-soft";
export const VIEWER_CHAT_COUNT_CLS =
  "ml-auto text-[11px] font-extrabold bg-brand-blue text-white py-0.5 px-2 rounded-full";
export const VIEWER_CHAT_LIST_CLS =
  "flex-1 min-h-0 overflow-y-auto py-3 px-[14px] flex flex-col gap-2.5 [scroll-behavior:smooth] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.12)] [&::-webkit-scrollbar-thumb]:rounded-full";
export const VIEWER_MSG_CLS =
  "text-[13px] leading-[1.5] text-[rgba(255,255,255,0.92)] [animation:chatIn_.25s_ease-out]";
export const VIEWER_MSG_MINE_CLS =
  "!bg-[rgba(34,48,198,0.18)] py-2 px-2.5 rounded-[10px] border-l-2 border-solid border-brand-blue";
export const VIEWER_MSG_NAME_CLS = "font-bold mr-1.5";
export const VIEWER_CHAT_FORM_CLS =
  "flex-none flex gap-2 p-2.5 border-t border-solid border-[rgba(255,255,255,0.06)] [&_input]:flex-1 [&_input]:bg-[rgba(255,255,255,0.04)] [&_input]:border [&_input]:border-solid [&_input]:border-[rgba(255,255,255,0.1)] [&_input]:text-white [&_input]:font-[inherit] [&_input]:text-[13px] [&_input]:py-[9px] [&_input]:px-3 [&_input]:rounded-[10px] [&_input]:outline-none [&_input]:[transition:border-color_.15s_ease] [&_input]:placeholder:text-[rgba(255,255,255,0.4)] [&_input]:focus:border-brand-blue max-[720px]:[&_input]:py-3 max-[720px]:[&_input]:text-[14px]";
export const VIEWER_CHAT_SEND_CLS =
  "w-[38px] h-[38px] rounded-[10px] bg-brand-blue border-0 text-white cursor-pointer grid place-items-center shrink-0 [transition:background_.15s_ease,transform_.15s_ease] hover:bg-brand-blue-soft hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:w-4 [&_svg]:h-4 max-[720px]:!w-[44px] max-[720px]:!h-[44px]";

export const VIEWER_CAM_PICKER_BTN_CLS = "hidden";

export const VIEWER_CAM_SHEET_BACKDROP_CLS =
  "fixed inset-0 z-[260] bg-[rgba(5,8,15,0.7)] [backdrop-filter:blur(6px)] [-webkit-backdrop-filter:blur(6px)] [animation:tmFade_.2s_ease]";

export const VIEWER_CAM_SHEET_CLS =
  "fixed left-0 right-0 bottom-0 z-[270] bg-[#0b1220] border-t border-solid border-[rgba(255,255,255,0.1)] rounded-t-[20px] max-h-[80vh] flex flex-col [animation:tmSlideUp_.25s_ease]";

export const VIEWER_CAM_SHEET_HEAD_CLS =
  "flex-none flex items-center justify-between py-4 px-5 border-b border-solid border-[rgba(255,255,255,0.06)]";

export const VIEWER_CAM_SHEET_TITLE_CLS =
  "text-[15px] font-bold text-white m-0";

export const VIEWER_CAM_SHEET_CLOSE_CLS =
  "w-[34px] h-[34px] rounded-full text-white cursor-pointer grid place-items-center bg-[rgba(255,255,255,0.08)] border-0 [transition:background_.15s_ease] hover:bg-[rgba(255,255,255,0.16)] [&_svg]:w-4 [&_svg]:h-4";

export const VIEWER_CAM_SHEET_LIST_CLS =
  "flex-1 min-h-0 overflow-y-auto p-4 grid grid-cols-2 gap-3";
