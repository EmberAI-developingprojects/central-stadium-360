import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { getHomeContent } from '../data/store';
import type { NewsBlock, NewsItem } from '../data/store';

const PAGE_CLS = "min-h-screen bg-white";
const SECTION_CLS =
  "w-full px-6 py-12 max-[920px]:px-5 max-[920px]:py-8 max-[640px]:py-6";

// One consistent reading column for text AND images so the article feels
// unified — wide enough that big imagery feels presentable, narrow enough
// that body text doesn't span half the page.
const OUTER_CLS = "max-w-[860px] mx-auto";
const ARTICLE_HEAD_CLS = "mb-8 max-[640px]:mb-6";

const TOP_BAR_CLS = "mb-6 flex items-center gap-3 flex-wrap";
const BACK_LINK_CLS =
  "inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft no-underline hover:text-brand-blue [&_svg]:w-[14px] [&_svg]:h-[14px]";

const LABEL_CLS =
  "inline-flex items-center text-[11px] font-bold uppercase tracking-[0.12em] text-brand-blue bg-brand-blue-tint rounded-full py-1 px-2.5";

const TITLE_CLS =
  "text-[32px] font-extrabold tracking-[-0.02em] text-ink leading-[1.2] m-0 max-[920px]:text-[26px] max-[640px]:text-[22px]";

const META_ROW_CLS =
  "mt-5 flex items-center gap-5 flex-wrap text-[13px] text-ink-soft [&_svg]:w-[15px] [&_svg]:h-[15px]";

const META_ITEM_CLS = "inline-flex items-center gap-1.5";

const SHARE_ROW_CLS = "mt-6 flex items-center gap-2 flex-wrap";
const SHARE_LABEL_CLS =
  "text-[12.5px] font-semibold text-ink-soft uppercase tracking-[0.08em] mr-2";
const SHARE_BTN_CLS =
  "inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-1 text-ink-soft no-underline cursor-pointer border-0 [transition:background_.18s_ease,color_.18s_ease,transform_.18s_ease] hover:-translate-y-px [&_svg]:w-[16px] [&_svg]:h-[16px]";
const SHARE_BTN_FB_CLS = "hover:bg-[#1877F2] hover:text-white";
const SHARE_BTN_TW_CLS = "hover:bg-black hover:text-white";
const SHARE_BTN_PIN_CLS = "hover:bg-[#E60023] hover:text-white";
const SHARE_BTN_IN_CLS = "hover:bg-[#0A66C2] hover:text-white";
const SHARE_BTN_COPY_CLS = "hover:bg-brand-blue hover:text-white";
const SHARE_COPIED_CLS = "ml-1 text-[12px] font-semibold text-emerald-600";

const BODY_WRAP_CLS = "flex flex-col gap-5 max-[640px]:gap-4";

const TEXT_BLOCK_CLS =
  "text-[16px] leading-[1.7] text-[#3a3d4a] m-0 whitespace-pre-line [overflow-wrap:break-word] max-[640px]:text-[15px] max-[640px]:leading-[1.65]";

const IMG_BLOCK_CLS =
  "block w-full m-0 rounded-2xl overflow-hidden bg-surface-1 [&_img]:w-full [&_img]:h-auto [&_img]:block";

const EMPTY_CLS =
  "max-w-[640px] mx-auto px-6 py-20 text-center text-ink-soft";

const KEY_VIEWS = "tsengeldekh_news_views_v1";

function readViews(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY_VIEWS) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function bumpView(id: string): number {
  const all = readViews();
  all[id] = (all[id] || 0) + 1;
  try {
    localStorage.setItem(KEY_VIEWS, JSON.stringify(all));
  } catch {
    /* ignore quota */
  }
  return all[id];
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function NewsBlockRender({
  block,
  alt,
}: {
  block: NewsBlock;
  alt: string;
}) {
  if (block.type === 'image') {
    if (!block.value) return null;
    return (
      <figure className={IMG_BLOCK_CLS}>
        <img src={block.value} alt={alt} loading="lazy" />
      </figure>
    );
  }
  if (!block.value.trim()) return null;
  return <p className={TEXT_BLOCK_CLS}>{block.value}</p>;
}

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [views, setViews] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getHomeContent().then((c) => setItems(c.news));
  }, []);

  const item = useMemo(
    () => (items && id ? items.find((n) => n.id === id) ?? null : null),
    [items, id],
  );

  useEffect(() => {
    if (item) setViews(bumpView(item.id));
  }, [item]);

  const blocks: NewsBlock[] = useMemo(() => {
    if (!item) return [];
    if (item.blocks && item.blocks.length > 0) return item.blocks;
    const fallback: NewsBlock[] = [];
    if (item.image) fallback.push({ type: 'image', value: item.image });
    if (item.body) fallback.push({ type: 'text', value: item.body });
    return fallback;
  }, [item]);

  const onShare = (kind: 'fb' | 'tw' | 'pin' | 'in' | 'copy') => {
    if (typeof window === 'undefined' || !item) return;
    const url = `${window.location.origin}/news/${item.id}`;
    const text = item.title ?? '';
    if (kind === 'copy') {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      return;
    }
    const targets: Record<'fb' | 'tw' | 'pin' | 'in', string> = {
      fb: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      tw: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      pin: `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
      in: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    window.open(targets[kind], '_blank', 'noopener,noreferrer,width=720,height=540');
  };

  return (
    <div className={PAGE_CLS}>
      <SiteHeader />

      {items === null && <div className={EMPTY_CLS}>Уншиж байна…</div>}
      {items !== null && !item && (
        <div className={EMPTY_CLS}>Мэдээ олдсонгүй.</div>
      )}

      {item && (
        <section className={SECTION_CLS}>
          <div className={OUTER_CLS}>
            <header className={ARTICLE_HEAD_CLS}>
            <div className={TOP_BAR_CLS}>
              <Link to="/#news" className={BACK_LINK_CLS}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 19"/>
                </svg>
                Бүх мэдээ рүү буцах
              </Link>
              {item.label && item.label.toLowerCase() !== item.title.toLowerCase() && (
                <span className={LABEL_CLS}>{item.label}</span>
              )}
            </div>
            <h1 className={TITLE_CLS}>{item.title}</h1>

            <div className={META_ROW_CLS}>
              <span className={META_ITEM_CLS}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Уншсан {views}
              </span>
              {item.createdAt && (
                <span className={META_ITEM_CLS}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {fmtDate(item.createdAt)}
                </span>
              )}
            </div>

            <div className={SHARE_ROW_CLS}>
              <span className={SHARE_LABEL_CLS}>Түгээх</span>
              <button type="button" aria-label="Facebook-д түгээх" title="Facebook" className={`${SHARE_BTN_CLS} ${SHARE_BTN_FB_CLS}`} onClick={() => onShare('fb')}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13 22v-8h3l1-4h-4V7c0-1 .3-1.7 1.8-1.7H17V1.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10H7v4h3.6v8z"/>
                </svg>
              </button>
              <button type="button" aria-label="Twitter-д түгээх" title="Twitter" className={`${SHARE_BTN_CLS} ${SHARE_BTN_TW_CLS}`} onClick={() => onShare('tw')}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 5.8c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 12 9c0 .3 0 .6.1.9A11.6 11.6 0 0 1 3.4 5a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4 4 0 0 1-1.9.1c.5 1.6 2 2.8 3.8 2.9A8.2 8.2 0 0 1 2 18.6 11.6 11.6 0 0 0 8.3 20.5c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.5-1.3 2.1-2.1z"/>
                </svg>
              </button>
              <button type="button" aria-label="Pinterest-д түгээх" title="Pinterest" className={`${SHARE_BTN_CLS} ${SHARE_BTN_PIN_CLS}`} onClick={() => onShare('pin')}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.2 9.3-.1-.8-.2-2 0-2.8.2-.7 1.1-4.6 1.1-4.6s-.3-.6-.3-1.4c0-1.3.8-2.3 1.7-2.3.8 0 1.2.6 1.2 1.4 0 .8-.5 2.1-.8 3.2-.2.9.5 1.7 1.4 1.7 1.7 0 3-1.8 3-4.4 0-2.3-1.6-3.9-4-3.9-2.7 0-4.3 2-4.3 4.1 0 .8.3 1.7.7 2.1.1.1.1.2.1.3-.1.3-.2 1-.3 1.1-.1.2-.2.2-.4.1-1.3-.6-2-2.5-2-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.2 6.5-5.4 6.5-1 0-2-.5-2.4-1.2l-.7 2.5c-.2.9-.9 2-1.4 2.7C9.8 21.8 10.9 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
                </svg>
              </button>
              <button type="button" aria-label="LinkedIn-д түгээх" title="LinkedIn" className={`${SHARE_BTN_CLS} ${SHARE_BTN_IN_CLS}`} onClick={() => onShare('in')}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.3a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zM19 19h-3v-4.7c0-1.1 0-2.6-1.6-2.6S12.6 13 12.6 14.2V19h-3v-9h2.9v1.2h.1A3.2 3.2 0 0 1 15.5 10c3.1 0 3.7 2 3.7 4.7z"/>
                </svg>
              </button>
              <button type="button" aria-label="Холбоосыг хуулах" title="Холбоос хуулах" className={`${SHARE_BTN_CLS} ${SHARE_BTN_COPY_CLS}`} onClick={() => onShare('copy')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              {copied && <span className={SHARE_COPIED_CLS}>Хуулагдсан</span>}
            </div>
            </header>

            <div className={BODY_WRAP_CLS}>
              {blocks.map((b, i) => (
                <NewsBlockRender key={i} block={b} alt={item.title} />
              ))}
              {blocks.length === 0 && (
                <p className={TEXT_BLOCK_CLS}>
                  Энэ мэдээний дэлгэрэнгүй мэдээлэл одоогоор алга.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
