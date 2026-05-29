import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useRequireAuth } from '../auth';
import { api } from '../lib/api';
import {
  BACK_CLS,
  CARD_CLS,
  DIVIDER_CLS,
  EYEBROW_CLS,
  EYEBROW_DOT_CLS,
  FIELD_CLS,
  HEADER_CLS,
  INPUT_CLS,
  LABEL_CLS,
  LOGO_CLS,
  LOGO_IMG_CLS,
  MAIN_CLS,
  PAGE_BG,
  PAGE_CLS,
  REG_ALERT_CLS,
  REG_ALERT_OK_CLS,
  REG_HINT_CLS,
  SUBMIT_CLS,
  SUBTITLE_CLS,
  TITLE_CLS,
} from './_authStyles';

const TICKETS_KEY = 'tsengeldekh_tickets';
const MAX_AVATAR_DIM = 256;
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const MAX_BIO_LEN = 280;

type Ticket = { user?: string; total?: number };
type AlertState = { kind: 'error' | 'ok'; msg: string } | null;

const PROFILE_CARD_EXTRA = "max-w-[560px]";
const PROFILE_FORM_CLS = "flex flex-col gap-[18px] w-full";
const PROFILE_AVATAR_ROW_CLS = "mb-1";
const PROFILE_AVATAR_DROP_BASE =
  "flex items-center gap-5 rounded-[14px] p-[18px] border-[1.5px] border-dashed border-[rgba(34,48,198,0.25)] bg-[rgba(228,231,250,0.35)] [transition:background_.15s_ease,border-color_.15s_ease] max-[560px]:flex-col max-[560px]:text-center";
const PROFILE_AVATAR_DROP_OVER =
  "!border-brand-blue !bg-[rgba(228,231,250,0.7)]";
const PROFILE_AVATAR_PREVIEW_CLS =
  "w-24 h-24 rounded-full text-white text-4xl font-bold flex items-center justify-center shrink-0 overflow-hidden [background:linear-gradient(135deg,#2230C6_0%,#1A26A0_100%)] shadow-[0_10px_28px_-10px_rgba(34,48,198,.45)] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:block";
const PROFILE_AVATAR_META_CLS = "flex flex-col gap-1 min-w-0";
const PROFILE_AVATAR_STRONG_CLS = "text-sm font-bold text-ink";
const PROFILE_AVATAR_SPAN_CLS = "text-xs text-ink-soft";
const PROFILE_AVATAR_ACTIONS_CLS =
  "inline-flex items-center gap-3 mt-2 max-[560px]:justify-center";
const PROFILE_BTN_GHOST_CLS =
  "inline-flex items-center gap-2 bg-white rounded-full text-ink text-[13px] font-semibold cursor-pointer no-underline py-2 px-[14px] border border-solid border-[rgba(31,41,55,0.12)] font-[inherit] [transition:border-color_.15s_ease,color_.15s_ease,background_.15s_ease] hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue-tint [&_svg]:w-[14px] [&_svg]:h-[14px]";
const PROFILE_BTN_LINK_CLS =
  "bg-transparent border-0 p-0 text-[13px] font-semibold cursor-pointer underline text-[#B91C1C] font-[inherit] hover:text-[#7F1D1D]";
const PROFILE_BIO_CLS = `${INPUT_CLS} min-h-[76px] leading-[1.4] [resize:vertical] py-3 px-[14px] h-auto`;
const PROFILE_STATS_CLS =
  "grid gap-3 p-4 m-0 bg-brand-blue-tint rounded-xl [grid-template-columns:repeat(3,1fr)] max-[560px]:[grid-template-columns:1fr]";
const PROFILE_STAT_ITEM_CLS = "flex flex-col gap-1 min-w-0";
const PROFILE_STAT_DT_CLS = "text-[10.5px] font-semibold uppercase text-ink-soft tracking-[0.06em]";
const PROFILE_STAT_DD_CLS = "m-0 text-[15px] font-bold text-ink";
const PROFILE_QUICK_LINKS_CLS = "flex flex-wrap gap-2.5 justify-center";

async function fileToResizedDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, MAX_AVATAR_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas-2d-unavailable');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function Profile() {
  const session = useRequireAuth();
  const { updateSession } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullname, setFullname] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    setFullname(session.fullname || '');
    setBio(session.bio || '');
    setAvatar(session.avatar || null);
  }, [session]);

  const [createdAt, setCreatedAt] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api.me().then((res) => {
      if (alive && res.ok) setCreatedAt(res.data.created_at);
    });
    return () => { alive = false; };
  }, []);

  const tickets: Ticket[] = useMemo(() => {
    if (!session) return [];
    try {
      const all = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]') as Ticket[];
      return all.filter((t) => !t.user || t.user === session.identifier);
    } catch {
      return [];
    }
  }, [session]);

  const totalSpent = tickets.reduce((sum, t) => sum + (t.total || 0), 0);
  const memberSince = createdAt ? new Date(createdAt).toLocaleDateString('mn-MN') : '—';

  if (!session) return null;

  const handleFile = async (file: File | null | undefined) => {
    setAlert(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return setAlert({ kind: 'error', msg: 'Зөвхөн зураг файл оруулна уу.' });
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return setAlert({ kind: 'error', msg: 'Файл хэт том байна (хамгийн их 8 МБ).' });
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setAvatar(dataUrl);
    } catch {
      setAlert({ kind: 'error', msg: 'Зураг боловсруулахад алдаа гарлаа.' });
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const name = fullname.trim();
    if (name.length < 2) return setAlert({ kind: 'error', msg: 'Бүтэн нэр хамгийн багадаа 2 тэмдэгт байна.' });
    if (bio.length > MAX_BIO_LEN) return setAlert({ kind: 'error', msg: `Танилцуулга ${MAX_BIO_LEN} тэмдэгтээс ихгүй байх ёстой.` });

    setSaving(true);
    try {
      updateSession({ fullname: name, bio, avatar });
      setAlert({ kind: 'ok', msg: 'Профайл хадгалагдлаа.' });
    } catch {

      setAlert({ kind: 'error', msg: 'Хадгалахад алдаа гарлаа (хадгалах сан дүүрсэн байж магадгүй).' });
    } finally {
      setSaving(false);
    }
  };

  const removeAvatar = () => {
    setAvatar(null);
    setAlert(null);
  };

  return (
    <div className={PAGE_CLS} style={{ background: PAGE_BG }}>
      <header className={HEADER_CLS}>
        <Link className={LOGO_CLS} to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img className={LOGO_IMG_CLS} src="/assets/images/brand/logo.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
        </Link>
        <Link className={BACK_CLS} to="/watch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Хувийн булан
        </Link>
      </header>

      <main className={MAIN_CLS}>
        <section className={`${CARD_CLS} ${PROFILE_CARD_EXTRA}`}>
          <span className={EYEBROW_CLS}>
            <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className={TITLE_CLS}>Миний профайл</h1>
          <p className={SUBTITLE_CLS}>
            Профайл зураг, нэр болон танилцуулгаа удирдах. Өөрчлөлт нь нийт сайтад тусгагдана.
          </p>

          <form className={PROFILE_FORM_CLS} onSubmit={onSave} noValidate>

            <div className={PROFILE_AVATAR_ROW_CLS}>
              <div
                className={`${PROFILE_AVATAR_DROP_BASE}${dragOver ? ' ' + PROFILE_AVATAR_DROP_OVER : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <div className={PROFILE_AVATAR_PREVIEW_CLS} role="img" aria-label="Профайл зураг">
                  {avatar ? (
                    <img src={avatar} alt="" />
                  ) : (
                    <span aria-hidden="true">{(fullname || session.identifier || '?').trim().charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={PROFILE_AVATAR_META_CLS}>
                  <strong className={PROFILE_AVATAR_STRONG_CLS}>Профайл зураг</strong>
                  <span className={PROFILE_AVATAR_SPAN_CLS}>PNG эсвэл JPG · 256×256 хүртэл багасгагдана</span>
                  <div className={PROFILE_AVATAR_ACTIONS_CLS}>
                    <button type="button" className={PROFILE_BTN_GHOST_CLS} onClick={() => fileRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Зураг сонгох
                    </button>
                    {avatar && (
                      <button type="button" className={PROFILE_BTN_LINK_CLS} onClick={removeAvatar}>
                        Хасах
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            </div>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Бүтэн нэр</span>
              <input
                className={INPUT_CLS}
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="Жишээ: Б. Болор"
                autoComplete="name"
                required
              />
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Танилцуулга</span>
              <textarea
                className={PROFILE_BIO_CLS}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LEN))}
                placeholder="Та өөрийнхөө тухай товч бичээрэй…"
                rows={3}
              />
              <span className={REG_HINT_CLS}>{bio.length}/{MAX_BIO_LEN}</span>
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Холбоо барих</span>
              <input
                className={INPUT_CLS}
                type="text"
                value={session.identifier}
                disabled
              />
              <span className={REG_HINT_CLS}>Утасны дугаар эсвэл и-мэйлээ солих бол шинээр бүртгүүлнэ үү.</span>
            </label>

            <dl className={PROFILE_STATS_CLS}>
              <div className={PROFILE_STAT_ITEM_CLS}>
                <dt className={PROFILE_STAT_DT_CLS}>Бүртгэгдсэн</dt>
                <dd className={PROFILE_STAT_DD_CLS}>{memberSince}</dd>
              </div>
              <div className={PROFILE_STAT_ITEM_CLS}>
                <dt className={PROFILE_STAT_DT_CLS}>Тасалбар</dt>
                <dd className={PROFILE_STAT_DD_CLS}>{tickets.length}</dd>
              </div>
              <div className={PROFILE_STAT_ITEM_CLS}>
                <dt className={PROFILE_STAT_DT_CLS}>Нийт зарцуулсан</dt>
                <dd className={PROFILE_STAT_DD_CLS}>{totalSpent.toLocaleString('en-US')}₮</dd>
              </div>
            </dl>

            {alert && (
              <div className={alert.kind === 'ok' ? REG_ALERT_OK_CLS : REG_ALERT_CLS} role="alert">
                {alert.msg}
              </div>
            )}

            <button type="submit" className={SUBMIT_CLS} disabled={saving}>
              {saving ? 'Хадгалж байна…' : 'Өөрчлөлт хадгалах'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </form>

          <div className={DIVIDER_CLS}><span>хурдан холбоос</span></div>

          <div className={PROFILE_QUICK_LINKS_CLS}>
            <Link to="/watch" className={PROFILE_BTN_GHOST_CLS}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              Шууд дамжуулал
            </Link>
            <Link to="/watch#tickets" className={PROFILE_BTN_GHOST_CLS}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
                <line x1="13" y1="5" x2="13" y2="7"/>
                <line x1="13" y1="11" x2="13" y2="13"/>
                <line x1="13" y1="17" x2="13" y2="19"/>
              </svg>
              Худалдан авалтын түүх
            </Link>
            <Link to="/settings" className={PROFILE_BTN_GHOST_CLS}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
              </svg>
              Нууц үг / тохиргоо
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
