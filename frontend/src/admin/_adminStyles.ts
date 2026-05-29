

export const ADMIN_SHELL_CLS =
  "admin-shell font-sans text-sm leading-[1.45] text-[#0f172a] bg-[#f6f7fb] min-h-screen grid [grid-template-columns:240px_1fr] max-[980px]:[grid-template-columns:1fr]";

export const ADMIN_SIDEBAR_CLS =
  "bg-[#0f172a] text-[#cbd5e1] py-5 px-[14px] flex flex-col gap-2 sticky top-0 h-screen max-[980px]:relative max-[980px]:h-auto";

export const ADMIN_BRAND_CLS =
  "flex items-center gap-2.5 pt-2 pr-2.5 pb-4 pl-2.5 border-b border-solid border-white/[0.06] mb-3";
export const ADMIN_BRAND_MARK_CLS =
  "w-8 h-8 rounded-lg [background:linear-gradient(135deg,#2230C6,#4451DC)] grid place-items-center text-white font-bold text-sm";
export const ADMIN_BRAND_TEXT_CLS =
  "flex flex-col text-xs text-[#94a3b8] [&_strong]:text-white [&_strong]:text-[13px]";

export const ADMIN_NAV_CLS =
  "flex flex-col gap-0.5 flex-1 overflow-y-auto [&_a]:flex [&_a]:items-center [&_a]:gap-2.5 [&_a]:py-[9px] [&_a]:px-3 [&_a]:rounded-md [&_a]:text-[#cbd5e1] [&_a]:no-underline [&_a]:text-[13.5px] [&_a]:[transition:background_.15s,color_.15s] [&_a:hover]:bg-white/[0.04] [&_a:hover]:text-white [&_a.is-active]:bg-[#1e293b] [&_a.is-active]:text-white [&_a_svg]:w-4 [&_a_svg]:h-4 [&_a_svg]:shrink-0";

export const ADMIN_SIDEBAR_FOOTER_CLS =
  "border-t border-solid border-white/[0.06] pt-3 flex flex-col gap-1 [&>a]:bg-transparent [&>a]:border-0 [&>a]:text-[#cbd5e1] [&>a]:font-[inherit] [&>a]:text-left [&>a]:cursor-pointer [&>a]:py-[7px] [&>a]:px-2.5 [&>a]:rounded-md [&>a]:text-[12.5px] [&>a]:no-underline [&>a]:flex [&>a]:items-center [&>a]:gap-[9px] [&>a]:leading-[1.2] [&>a:hover]:bg-white/[0.04] [&>a:hover]:text-white [&>a_svg]:w-3.5 [&>a_svg]:h-3.5 [&>a_svg]:shrink-0 [&>button]:bg-transparent [&>button]:border-0 [&>button]:text-[#cbd5e1] [&>button]:font-[inherit] [&>button]:text-left [&>button]:cursor-pointer [&>button]:py-[7px] [&>button]:px-2.5 [&>button]:rounded-md [&>button]:text-[12.5px] [&>button]:flex [&>button]:items-center [&>button]:gap-[9px] [&>button]:leading-[1.2] [&>button:hover]:bg-white/[0.04] [&>button:hover]:text-white [&>button_svg]:w-3.5 [&>button_svg]:h-3.5 [&>button_svg]:shrink-0";

export const ADMIN_MAIN_CLS = "flex flex-col min-w-0";
export const ADMIN_TOPBAR_CLS =
  "bg-white border-b border-solid border-[#e5e7eb] h-14 flex items-center px-6 sticky top-0 z-[5] [&_h1]:text-base [&_h1]:font-semibold [&_h1]:m-0 [&_h1]:tracking-[-0.01em]";
export const ADMIN_TOPBAR_SPACER_CLS = "flex-1";
export const ADMIN_TOPBAR_USER_CLS =
  "flex items-center gap-2.5 text-[13px] text-[#64748b]";
export const ADMIN_AVATAR_CLS =
  "w-[30px] h-[30px] rounded-full [background:linear-gradient(135deg,#2230C6,#4451DC)] text-white grid place-items-center font-semibold text-xs";

export const ADMIN_CONTENT_CLS = "p-6 flex-1";

export const ADMIN_PAGE_HEADER_CLS =
  "flex items-start justify-between gap-4 mb-[18px] [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:m-0 [&_h2]:mb-1 [&_h2]:tracking-[-0.015em] [&_p]:m-0 [&_p]:text-[#64748b] [&_p]:text-[13.5px]";

export const ADMIN_CARD_CLS =
  "bg-white border border-solid border-[#e5e7eb] rounded-[10px] p-[18px] [&_h3]:m-0 [&_h3]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#0f172a]";

export const ADMIN_GRID_CLS = "grid gap-4";
export const ADMIN_GRID_4_CLS =
  "[grid-template-columns:repeat(4,minmax(0,1fr))] max-[980px]:[grid-template-columns:repeat(2,minmax(0,1fr))]";
export const ADMIN_GRID_2_CLS =
  "[grid-template-columns:repeat(2,minmax(0,1fr))] max-[980px]:[grid-template-columns:1fr]";

export const ADMIN_STAT_CARD_CLS = `${ADMIN_CARD_CLS} [&_.stat-label]:text-xs [&_.stat-label]:text-[#64748b] [&_.stat-label]:uppercase [&_.stat-label]:tracking-[.04em] [&_.stat-value]:text-[26px] [&_.stat-value]:font-semibold [&_.stat-value]:mt-1 [&_.stat-value]:tracking-[-0.01em] [&_.stat-sub]:text-xs [&_.stat-sub]:text-[#64748b] [&_.stat-sub]:mt-1`;

export const ADMIN_SPARKLINE_CLS = "w-full h-[140px] block";

export const ADMIN_BTN_CLS =
  "inline-flex items-center gap-1.5 py-2 px-[14px] rounded-md font-[inherit] text-[13px] font-medium border border-solid border-[#e5e7eb] bg-white text-[#0f172a] cursor-pointer [transition:background_.15s,border-color_.15s] no-underline hover:bg-[#f8fafc] hover:border-[#cbd5e1] disabled:opacity-50 disabled:cursor-not-allowed";
export const ADMIN_BTN_PRIMARY_CLS =
  "!bg-[#2230C6] !border-[#2230C6] !text-white hover:!bg-[#1A26A0] hover:!border-[#1A26A0]";
export const ADMIN_BTN_DANGER_CLS =
  "!border-[#fecaca] !text-[#dc2626] hover:!bg-[#fef2f2] hover:!border-[#fca5a5]";
export const ADMIN_BTN_GHOST_CLS =
  "!border-transparent !bg-transparent hover:!bg-[#f1f5f9]";
export const ADMIN_BTN_SM_CLS = "!py-[5px] !px-[9px] !text-[12.5px]";

export const ADMIN_TABLE_WRAP_CLS =
  "bg-white border border-solid border-[#e5e7eb] rounded-[10px] overflow-hidden";
export const ADMIN_TABLE_CLS =
  "w-full border-collapse text-[13px] [&_th]:text-left [&_th]:py-[11px] [&_th]:px-[14px] [&_th]:border-b [&_th]:border-solid [&_th]:border-[#e5e7eb] [&_th]:align-middle [&_th]:bg-[#f8fafc] [&_th]:text-[#64748b] [&_th]:font-medium [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-[.04em] [&_td]:text-left [&_td]:py-[11px] [&_td]:px-[14px] [&_td]:border-b [&_td]:border-solid [&_td]:border-[#e5e7eb] [&_td]:align-middle [&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-[#fafafa]";

export const ADMIN_TABLE_THUMB_CLS =
  "w-14 h-8 rounded bg-[#e2e8f0] [background-size:cover] [background-position:center] inline-block";

export const ADMIN_EMPTY_CLS =
  "py-9 px-6 text-center text-[#64748b] bg-white border border-dashed border-[#e5e7eb] rounded-[10px] [&_strong]:block [&_strong]:text-[#0f172a] [&_strong]:mb-1";

export const ADMIN_FORM_CLS = "flex flex-col gap-[14px] max-w-[720px]";
export const ADMIN_FORM_ROW_CLS =
  "grid gap-[14px] [grid-template-columns:repeat(2,minmax(0,1fr))] max-[980px]:[grid-template-columns:1fr]";
export const ADMIN_FIELD_CLS =
  "flex flex-col gap-[5px] [&_label]:text-xs [&_label]:text-[#64748b] [&_label]:font-medium [&_input]:font-[inherit] [&_input]:text-[13.5px] [&_input]:py-2 [&_input]:px-[11px] [&_input]:bg-white [&_input]:border [&_input]:border-solid [&_input]:border-[#e5e7eb] [&_input]:rounded-md [&_input]:text-[#0f172a] [&_input]:outline-none [&_input]:[transition:border-color_.15s,box-shadow_.15s] [&_input:focus]:border-[#2230C6] [&_input:focus]:shadow-[0_0_0_3px_rgba(34,48,198,.12)] [&_textarea]:font-[inherit] [&_textarea]:text-[13.5px] [&_textarea]:py-2 [&_textarea]:px-[11px] [&_textarea]:bg-white [&_textarea]:border [&_textarea]:border-solid [&_textarea]:border-[#e5e7eb] [&_textarea]:rounded-md [&_textarea]:text-[#0f172a] [&_textarea]:outline-none [&_textarea]:[transition:border-color_.15s,box-shadow_.15s] [&_textarea]:resize-y [&_textarea]:min-h-[80px] [&_textarea:focus]:border-[#2230C6] [&_textarea:focus]:shadow-[0_0_0_3px_rgba(34,48,198,.12)] [&_select]:font-[inherit] [&_select]:text-[13.5px] [&_select]:py-2 [&_select]:px-[11px] [&_select]:bg-white [&_select]:border [&_select]:border-solid [&_select]:border-[#e5e7eb] [&_select]:rounded-md [&_select]:text-[#0f172a] [&_select]:outline-none [&_select]:[transition:border-color_.15s,box-shadow_.15s] [&_select:focus]:border-[#2230C6] [&_select:focus]:shadow-[0_0_0_3px_rgba(34,48,198,.12)]";

export const ADMIN_CHECKBOX_CLS =
  "flex items-center gap-2 text-[13.5px] [&_input]:w-4 [&_input]:h-4";

export const ADMIN_FORM_ACTIONS_CLS =
  "flex gap-2.5 pt-2 border-t border-solid border-[#e5e7eb]";

export const ADMIN_BADGE_CLS =
  "inline-flex items-center py-0.5 px-2 rounded-full text-[11.5px] font-medium bg-[#f1f5f9] text-[#0f172a]";
export const ADMIN_BADGE_ADMIN_CLS = "!bg-[#ede9fe] !text-[#5b21b6]";
export const ADMIN_BADGE_PAID_CLS = "!bg-[#dcfce7] !text-[#15803d]";
export const ADMIN_BADGE_REFUNDED_CLS = "!bg-[#fee2e2] !text-[#b91c1c]";
export const ADMIN_BADGE_CANCELLED_CLS = "!bg-[#fef3c7] !text-[#92400e]";
export const ADMIN_BADGE_DISABLED_CLS = "!bg-[#fef2f2] !text-[#dc2626]";
export const ADMIN_BADGE_FEATURED_CLS = "!bg-[#fef3c7] !text-[#92400e]";

export const ADMIN_FILTERS_CLS =
  "flex gap-2.5 items-center flex-wrap mb-[14px] [&_input]:font-[inherit] [&_input]:text-[13px] [&_input]:py-[7px] [&_input]:px-2.5 [&_input]:bg-white [&_input]:border [&_input]:border-solid [&_input]:border-[#e5e7eb] [&_input]:rounded-md [&_input]:min-w-[220px] [&_select]:font-[inherit] [&_select]:text-[13px] [&_select]:py-[7px] [&_select]:px-2.5 [&_select]:bg-white [&_select]:border [&_select]:border-solid [&_select]:border-[#e5e7eb] [&_select]:rounded-md";

export const ADMIN_TABS_CLS =
  "flex gap-1 border-b border-solid border-[#e5e7eb] mb-[18px] [&_button]:bg-transparent [&_button]:border-0 [&_button]:font-[inherit] [&_button]:text-[13.5px] [&_button]:font-medium [&_button]:py-[9px] [&_button]:px-[14px] [&_button]:cursor-pointer [&_button]:text-[#64748b] [&_button]:border-b-2 [&_button]:border-solid [&_button]:border-transparent [&_button]:-mb-px [&_button.is-active]:text-[#0f172a] [&_button.is-active]:!border-b-[#2230C6]";

export const ADMIN_LINK_CLS =
  "text-[#2230C6] no-underline font-medium hover:underline";

export const ADMIN_ACTIONS_CLS = "inline-flex gap-1.5";

export const ADMIN_ALERT_CLS =
  "py-2.5 px-[14px] rounded-md border border-solid border-[#fecaca] bg-[#fef2f2] text-[#991b1b] text-[13px]";

export const ADMIN_IMAGE_PREVIEW_CLS =
  "w-full max-w-[320px] [aspect-ratio:16/6] bg-[#f1f5f9] [background-size:cover] [background-position:center] [background-repeat:no-repeat] rounded-md border border-solid border-[#e5e7eb] mt-1.5";

