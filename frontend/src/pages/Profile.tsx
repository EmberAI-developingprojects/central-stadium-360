import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { readUsers, useAuth, useRequireAuth } from '../auth';

const TICKETS_KEY = 'tsengeldekh_tickets';
const MAX_AVATAR_DIM = 256;       // resize uploaded image to this on the longer edge
const MAX_AVATAR_BYTES = 8 * 1024 * 1024; // refuse files larger than 8 MB up front
const MAX_BIO_LEN = 280;

type Ticket = { user?: string; total?: number };
type AlertState = { kind: 'error' | 'ok'; msg: string } | null;

// Read an image File, downscale it on a canvas, return a JPEG data URL
// so it stays small enough for localStorage even if the source is multi-MB.
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

  // Seed local form state when session arrives
  useEffect(() => {
    if (!session) return;
    setFullname(session.fullname || '');
    setBio(session.bio || '');
    setAvatar(session.avatar || null);
  }, [session]);

  const account = useMemo(
    () => readUsers().find((u) => u.identifier === session?.identifier),
    [session],
  );

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
  const memberSince = account?.createdAt ? new Date(account.createdAt).toLocaleDateString('mn-MN') : '—';

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
      // localStorage quota is the realistic failure here; bail with a clear message.
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
    <div className="login-page profile-page">
      <header className="login-header">
        <Link className="login-logo" to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img src="/assets/images/brand/logo.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
        </Link>
        <Link className="login-back" to="/watch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Хувийн булан
        </Link>
      </header>

      <main className="login-main">
        <section className="login-card profile-card">
          <span className="login-eyebrow">
            <span className="login-eyebrow-dot" aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className="login-title">Миний профайл</h1>
          <p className="login-subtitle">
            Профайл зураг, нэр болон танилцуулгаа удирдах. Өөрчлөлт нь нийт сайтад тусгагдана.
          </p>

          <form className="profile-form" onSubmit={onSave} noValidate>

            <div className="profile-avatar-row">
              <div
                className={`profile-avatar-drop${dragOver ? ' is-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <div className="profile-avatar-preview" role="img" aria-label="Профайл зураг">
                  {avatar ? (
                    <img src={avatar} alt="" />
                  ) : (
                    <span aria-hidden="true">{(fullname || session.identifier || '?').trim().charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="profile-avatar-meta">
                  <strong>Профайл зураг</strong>
                  <span>PNG эсвэл JPG · 256×256 хүртэл багасгагдана</span>
                  <div className="profile-avatar-actions">
                    <button type="button" className="profile-btn-ghost" onClick={() => fileRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Зураг сонгох
                    </button>
                    {avatar && (
                      <button type="button" className="profile-btn-link" onClick={removeAvatar}>
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

            <label className="login-field">
              <span className="login-label">Бүтэн нэр</span>
              <input
                className="login-input"
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="Жишээ: Б. Болор"
                autoComplete="name"
                required
              />
            </label>

            <label className="login-field">
              <span className="login-label">Танилцуулга</span>
              <textarea
                className="login-input profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LEN))}
                placeholder="Та өөрийнхөө тухай товч бичээрэй…"
                rows={3}
              />
              <span className="reg-hint">{bio.length}/{MAX_BIO_LEN}</span>
            </label>

            <label className="login-field">
              <span className="login-label">Холбоо барих</span>
              <input
                className="login-input"
                type="text"
                value={session.identifier}
                disabled
              />
              <span className="reg-hint">Утасны дугаар эсвэл и-мэйлээ солих бол шинээр бүртгүүлнэ үү.</span>
            </label>

            <dl className="profile-stats">
              <div>
                <dt>Бүртгэгдсэн</dt>
                <dd>{memberSince}</dd>
              </div>
              <div>
                <dt>Тасалбар</dt>
                <dd>{tickets.length}</dd>
              </div>
              <div>
                <dt>Нийт зарцуулсан</dt>
                <dd>{totalSpent.toLocaleString('en-US')}₮</dd>
              </div>
            </dl>

            {alert && (
              <div className={`reg-alert${alert.kind === 'ok' ? ' is-ok' : ''}`} role="alert">
                {alert.msg}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={saving}>
              {saving ? 'Хадгалж байна…' : 'Өөрчлөлт хадгалах'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </form>

          <div className="login-divider"><span>хурдан холбоос</span></div>

          <div className="profile-quick-links">
            <Link to="/watch" className="profile-btn-ghost">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              Шууд дамжуулал
            </Link>
            <Link to="/watch#tickets" className="profile-btn-ghost">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
                <line x1="13" y1="5" x2="13" y2="7"/>
                <line x1="13" y1="11" x2="13" y2="13"/>
                <line x1="13" y1="17" x2="13" y2="19"/>
              </svg>
              Худалдан авалтын түүх
            </Link>
            <Link to="/settings" className="profile-btn-ghost">
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
