

export const ADMIN_SHELL_CLS =
  "admin-shell font-sans antialiased text-[13.5px] leading-[1.5] text-zinc-900 bg-[#fafafa] min-h-screen grid [grid-template-columns:248px_1fr] max-[980px]:[grid-template-columns:1fr]";

export const ADMIN_SIDEBAR_CLS =
  "bg-white border-r border-[#ececef] py-4 px-3 flex flex-col gap-1 sticky top-0 h-screen max-[980px]:relative max-[980px]:h-auto max-[980px]:border-r-0 max-[980px]:border-b";

export const ADMIN_BRAND_CLS =
  "flex items-center gap-2.5 py-2.5 px-2 mb-3";
export const ADMIN_BRAND_MARK_CLS =
  "w-8 h-8 rounded-lg [background:linear-gradient(135deg,#2230C6,#4451DC)] grid place-items-center text-white font-semibold text-[12.5px] tracking-tight shadow-[0_1px_2px_rgba(34,48,198,.25)]";
export const ADMIN_BRAND_TEXT_CLS =
  "flex flex-col leading-tight text-[11.5px] text-zinc-500 [&_strong]:text-zinc-900 [&_strong]:text-[13.5px] [&_strong]:font-semibold [&_strong]:tracking-[-0.01em] [&_strong]:mb-px";

export const ADMIN_NAV_CLS =
  "flex flex-col gap-0.5 flex-1 overflow-y-auto " +
  "[&_a]:flex [&_a]:items-center [&_a]:gap-2.5 [&_a]:py-[7px] [&_a]:px-2.5 [&_a]:rounded-md [&_a]:text-zinc-600 [&_a]:no-underline [&_a]:text-[13px] [&_a]:font-medium [&_a]:transition-colors " +
  "[&_a:hover]:bg-zinc-100 [&_a:hover]:text-zinc-900 " +
  "[&_a.is-active]:bg-zinc-100 [&_a.is-active]:text-zinc-900 " +
  "[&_a_svg]:w-[16px] [&_a_svg]:h-[16px] [&_a_svg]:shrink-0 [&_a_svg]:text-zinc-400 [&_a:hover_svg]:text-zinc-700 [&_a.is-active_svg]:text-zinc-900";

export const ADMIN_SIDEBAR_FOOTER_CLS =
  "border-t border-[#ececef] pt-2 mt-2 flex flex-col gap-0.5 " +
  "[&>a]:flex [&>a]:items-center [&>a]:gap-2.5 [&>a]:py-[7px] [&>a]:px-2.5 [&>a]:rounded-md [&>a]:text-zinc-500 [&>a]:no-underline [&>a]:text-[12.5px] [&>a]:font-medium [&>a]:transition-colors " +
  "[&>a:hover]:bg-zinc-100 [&>a:hover]:text-zinc-900 " +
  "[&>a_svg]:w-3.5 [&>a_svg]:h-3.5 [&>a_svg]:shrink-0 [&>a_svg]:text-zinc-400 [&>a:hover_svg]:text-zinc-700 " +
  "[&>button]:bg-transparent [&>button]:border-0 [&>button]:font-[inherit] [&>button]:text-left [&>button]:cursor-pointer [&>button]:flex [&>button]:items-center [&>button]:gap-2.5 [&>button]:py-[7px] [&>button]:px-2.5 [&>button]:rounded-md [&>button]:text-zinc-500 [&>button]:text-[12.5px] [&>button]:font-medium [&>button]:transition-colors " +
  "[&>button:hover]:bg-zinc-100 [&>button:hover]:text-zinc-900 " +
  "[&>button_svg]:w-3.5 [&>button_svg]:h-3.5 [&>button_svg]:shrink-0 [&>button_svg]:text-zinc-400 [&>button:hover_svg]:text-zinc-700";

export const ADMIN_MAIN_CLS = "flex flex-col min-w-0";
export const ADMIN_TOPBAR_CLS =
  "bg-white/85 backdrop-blur-md border-b border-[#ececef] h-[60px] flex items-center px-8 sticky top-0 z-[5] " +
  "[&_h1]:text-[15px] [&_h1]:font-semibold [&_h1]:m-0 [&_h1]:text-zinc-900 [&_h1]:tracking-[-0.01em]";
export const ADMIN_TOPBAR_SPACER_CLS = "flex-1";
export const ADMIN_TOPBAR_USER_CLS =
  "flex items-center gap-2.5 text-[13px] text-zinc-600";
export const ADMIN_AVATAR_CLS =
  "w-[30px] h-[30px] rounded-full bg-zinc-900 text-white grid place-items-center font-semibold text-[11px] tracking-tight";

export const ADMIN_CONTENT_CLS = "p-8 flex-1 max-w-[1280px] w-full";

export const ADMIN_PAGE_HEADER_CLS =
  "flex items-start justify-between gap-4 mb-6 " +
  "[&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:m-0 [&_h2]:mb-1 [&_h2]:text-zinc-900 [&_h2]:tracking-[-0.02em] [&_h2]:leading-tight " +
  "[&_p]:m-0 [&_p]:text-zinc-500 [&_p]:text-[13.5px]";

export const ADMIN_CARD_CLS =
  "bg-white border border-[#ececef] rounded-xl p-6 " +
  "[&_h3]:m-0 [&_h3]:mb-4 [&_h3]:text-[13.5px] [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_h3]:tracking-[-0.01em]";

export const ADMIN_GRID_CLS = "grid gap-4";
export const ADMIN_GRID_4_CLS =
  "[grid-template-columns:repeat(4,minmax(0,1fr))] max-[980px]:[grid-template-columns:repeat(2,minmax(0,1fr))]";
export const ADMIN_GRID_2_CLS =
  "[grid-template-columns:repeat(2,minmax(0,1fr))] max-[980px]:[grid-template-columns:1fr]";

export const ADMIN_STAT_CARD_CLS =
  "bg-white border border-[#ececef] rounded-xl p-5 " +
  "[&_.stat-label]:text-[11px] [&_.stat-label]:text-zinc-500 [&_.stat-label]:uppercase [&_.stat-label]:tracking-[.06em] [&_.stat-label]:font-medium " +
  "[&_.stat-value]:text-[28px] [&_.stat-value]:font-semibold [&_.stat-value]:text-zinc-900 [&_.stat-value]:mt-2 [&_.stat-value]:tracking-[-0.02em] [&_.stat-value]:leading-none " +
  "[&_.stat-sub]:text-[12px] [&_.stat-sub]:text-zinc-500 [&_.stat-sub]:mt-2.5";

export const ADMIN_SPARKLINE_CLS = "w-full h-[160px] block";

export const ADMIN_BTN_CLS =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md font-[inherit] text-[13px] font-medium border border-[#e4e4e7] bg-white text-zinc-900 cursor-pointer transition-colors no-underline " +
  "hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[#e4e4e7]";
export const ADMIN_BTN_PRIMARY_CLS =
  "!bg-zinc-900 !border-zinc-900 !text-white hover:!bg-zinc-800 hover:!border-zinc-800 active:!bg-zinc-950";
export const ADMIN_BTN_DANGER_CLS =
  "!bg-white !border-[#fecaca] !text-[#b91c1c] hover:!bg-[#fef2f2] hover:!border-[#fca5a5]";
export const ADMIN_BTN_GHOST_CLS =
  "!border-transparent !bg-transparent !text-zinc-600 hover:!bg-zinc-100 hover:!text-zinc-900 hover:!border-transparent";
export const ADMIN_BTN_SM_CLS = "!h-8 !px-2.5 !text-[12.5px]";

export const ADMIN_TABLE_WRAP_CLS =
  "bg-white border border-[#ececef] rounded-xl overflow-hidden";
export const ADMIN_TABLE_CLS =
  "w-full border-collapse text-[13px] " +
  "[&_th]:text-left [&_th]:py-3 [&_th]:px-4 [&_th]:border-b [&_th]:border-[#ececef] [&_th]:align-middle [&_th]:bg-[#fafafa] [&_th]:text-zinc-500 [&_th]:font-medium [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-[.06em] " +
  "[&_td]:text-left [&_td]:py-3.5 [&_td]:px-4 [&_td]:border-b [&_td]:border-[#f4f4f5] [&_td]:align-middle [&_td]:text-zinc-700 " +
  "[&_tr:last-child_td]:border-b-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-[#fafafa]";

export const ADMIN_TABLE_THUMB_CLS =
  "w-[60px] h-[36px] rounded-md bg-zinc-100 [background-size:cover] [background-position:center] inline-block ring-1 ring-inset ring-[#ececef]";

export const ADMIN_EMPTY_CLS =
  "py-14 px-6 text-center text-zinc-500 text-[13.5px] bg-white border border-dashed border-[#e4e4e7] rounded-xl " +
  "[&_strong]:block [&_strong]:text-zinc-900 [&_strong]:mb-1.5 [&_strong]:font-semibold [&_strong]:text-[14px]";

export const ADMIN_FORM_CLS = "flex flex-col gap-5 max-w-[720px]";
export const ADMIN_FORM_ROW_CLS =
  "grid gap-5 [grid-template-columns:repeat(2,minmax(0,1fr))] max-[980px]:[grid-template-columns:1fr]";
export const ADMIN_FIELD_CLS =
  "flex flex-col gap-2 " +
  "[&_label]:text-[12.5px] [&_label]:text-zinc-700 [&_label]:font-medium [&_label]:leading-tight " +
  "[&_input]:font-[inherit] [&_input]:text-[13.5px] [&_input]:h-10 [&_input]:px-3 [&_input]:bg-white [&_input]:border [&_input]:border-[#e4e4e7] [&_input]:rounded-md [&_input]:text-zinc-900 [&_input]:outline-none [&_input]:transition-shadow " +
  "[&_input::placeholder]:text-zinc-400 " +
  "[&_input:focus]:border-zinc-400 [&_input:focus]:shadow-[0_0_0_3px_rgba(24,24,27,0.06)] " +
  "[&_textarea]:font-[inherit] [&_textarea]:text-[13.5px] [&_textarea]:py-2.5 [&_textarea]:px-3 [&_textarea]:bg-white [&_textarea]:border [&_textarea]:border-[#e4e4e7] [&_textarea]:rounded-md [&_textarea]:text-zinc-900 [&_textarea]:outline-none [&_textarea]:transition-shadow [&_textarea]:resize-y [&_textarea]:min-h-[96px] " +
  "[&_textarea::placeholder]:text-zinc-400 " +
  "[&_textarea:focus]:border-zinc-400 [&_textarea:focus]:shadow-[0_0_0_3px_rgba(24,24,27,0.06)] " +
  "[&_select]:font-[inherit] [&_select]:text-[13.5px] [&_select]:h-10 [&_select]:px-3 [&_select]:bg-white [&_select]:border [&_select]:border-[#e4e4e7] [&_select]:rounded-md [&_select]:text-zinc-900 [&_select]:outline-none [&_select]:transition-shadow " +
  "[&_select:focus]:border-zinc-400 [&_select:focus]:shadow-[0_0_0_3px_rgba(24,24,27,0.06)]";

export const ADMIN_CHECKBOX_CLS =
  "flex items-center gap-2 text-[13.5px] text-zinc-700 [&_input]:w-4 [&_input]:h-4 [&_input]:accent-zinc-900 [&_input]:cursor-pointer";

export const ADMIN_FORM_ACTIONS_CLS =
  "flex gap-2.5 pt-5 mt-2 border-t border-[#ececef]";

export const ADMIN_BADGE_CLS =
  "inline-flex items-center py-0.5 px-2 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 leading-[1.6]";
export const ADMIN_BADGE_ADMIN_CLS = "!bg-violet-50 !text-violet-700";
export const ADMIN_BADGE_PAID_CLS = "!bg-emerald-50 !text-emerald-700";
export const ADMIN_BADGE_REFUNDED_CLS = "!bg-red-50 !text-red-700";
export const ADMIN_BADGE_CANCELLED_CLS = "!bg-amber-50 !text-amber-700";
export const ADMIN_BADGE_DISABLED_CLS = "!bg-red-50 !text-red-700";
export const ADMIN_BADGE_FEATURED_CLS = "!bg-amber-50 !text-amber-700";

export const ADMIN_FILTERS_CLS =
  "flex gap-2.5 items-center flex-wrap mb-4 " +
  "[&_input]:font-[inherit] [&_input]:text-[13px] [&_input]:h-9 [&_input]:px-3 [&_input]:bg-white [&_input]:border [&_input]:border-[#e4e4e7] [&_input]:rounded-md [&_input]:min-w-[260px] [&_input]:outline-none [&_input]:transition-shadow [&_input::placeholder]:text-zinc-400 [&_input:focus]:border-zinc-400 [&_input:focus]:shadow-[0_0_0_3px_rgba(24,24,27,0.06)] " +
  "[&_select]:font-[inherit] [&_select]:text-[13px] [&_select]:h-9 [&_select]:px-3 [&_select]:bg-white [&_select]:border [&_select]:border-[#e4e4e7] [&_select]:rounded-md [&_select]:outline-none";

export const ADMIN_TABS_CLS =
  "flex gap-1 border-b border-[#ececef] mb-6 " +
  "[&_button]:bg-transparent [&_button]:border-0 [&_button]:font-[inherit] [&_button]:text-[13.5px] [&_button]:font-medium [&_button]:py-2.5 [&_button]:px-3.5 [&_button]:cursor-pointer [&_button]:text-zinc-500 [&_button]:border-b-2 [&_button]:border-transparent [&_button]:-mb-px [&_button]:transition-colors " +
  "[&_button:hover]:text-zinc-900 " +
  "[&_button.is-active]:text-zinc-900 [&_button.is-active]:!border-b-zinc-900";

export const ADMIN_LINK_CLS =
  "text-zinc-900 no-underline font-medium hover:underline underline-offset-[3px] decoration-zinc-300";

export const ADMIN_ACTIONS_CLS = "inline-flex gap-1.5";

export const ADMIN_ALERT_CLS =
  "py-3 px-4 rounded-md border border-red-200 bg-red-50 text-red-800 text-[13px] leading-[1.5]";

export const ADMIN_IMAGE_PREVIEW_CLS =
  "w-full max-w-[360px] [aspect-ratio:16/6] bg-zinc-100 [background-size:cover] [background-position:center] [background-repeat:no-repeat] rounded-lg border border-[#ececef] mt-2";
