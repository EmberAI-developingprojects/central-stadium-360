import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useRequireAuth } from '../auth';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import {
  BACK_CLS,
  CARD_CLS,
  DIVIDER_CLS,
  EYEBROW_CLS,
  EYEBROW_DOT_CLS,
  FIELD_CLS,
  FORM_CLS,
  HEADER_CLS,
  HOME_CLS,
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

type AlertState = { kind: 'error' | 'ok'; msg: string } | null;

const SETTINGS_CARD_EXTRA = "max-w-[520px]";
const SETTINGS_GRID_CLS =
  "grid bg-brand-blue-tint rounded-xl [grid-template-columns:1fr_1fr] gap-x-5 gap-y-[14px] mt-2 mb-6 py-[18px] px-5";
const SETTINGS_GRID_ITEM_CLS = "flex flex-col gap-1 min-w-0";
const SETTINGS_GRID_DT_CLS = "text-[11px] font-semibold uppercase text-ink-soft tracking-[0.06em]";
const SETTINGS_GRID_DD_CLS = "m-0 text-sm font-semibold text-ink break-words";
const SETTINGS_SECTION_TITLE_CLS = "text-base font-bold text-ink mt-2 mb-[14px]";
const SETTINGS_DANGER_CLS =
  "self-center bg-white rounded-full text-[13px] font-semibold cursor-pointer py-2.5 px-[18px] border border-solid border-[rgba(185,28,28,0.35)] text-[#B91C1C] font-[inherit] [transition:background_.15s_ease,color_.15s_ease] hover:bg-[#B91C1C] hover:text-white";

export default function Settings() {
  const session = useRequireAuth();
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [alert, setAlert] = useState<AlertState>(null);
  const [busy, setBusy] = useState(false);

  if (!session) return null;

  const onChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);

    if (newPw.length < 8) {
      return setAlert({ kind: 'error', msg: 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.' });
    }
    if (newPw !== confirmPw) {
      return setAlert({ kind: 'error', msg: 'Шинэ нууц үг таарахгүй байна.' });
    }
    if (!supabase) {
      return setAlert({ kind: 'error', msg: 'Сервер тохиргоо дутуу байна.' });
    }

    setBusy(true);

    const check = await api.login({ identifier: session.identifier, password: currentPw });
    if (!check.ok) {
      setBusy(false);
      return setAlert({ kind: 'error', msg: 'Одоогийн нууц үг буруу байна.' });
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) {
      return setAlert({ kind: 'error', msg: error.message || 'Шинэчлэхэд алдаа гарлаа.' });
    }
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setAlert({ kind: 'ok', msg: 'Нууц үг шинэчлэгдлээ.' });
  };

  const onDeleteAccount = async () => {
    if (!confirm('Бүртгэлээ устгах уу? Худалдан авсан тасалбарууд тань хадгалагдана, харин нэвтрэх боломжгүй болно.')) return;
    setBusy(true);
    const res = await deleteAccount();
    setBusy(false);
    if (!res.ok) {
      return setAlert({
        kind: 'error',
        msg: 'Устгахад алдаа гарлаа. Дахин оролдоно уу.',
      });
    }
    navigate('/', { replace: true });
  };

  return (
    <div className={PAGE_CLS} style={{ background: PAGE_BG }}>
      <header className={HEADER_CLS}>
        <Link className={LOGO_CLS} to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img className={LOGO_IMG_CLS} src="/assets/images/brand/logo.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
        </Link>
        <Link className={BACK_CLS} to="/">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Нүүр буцах
        </Link>
      </header>

      <main className={MAIN_CLS}>
        <section className={`${CARD_CLS} ${SETTINGS_CARD_EXTRA}`}>
          <span className={EYEBROW_CLS}>
            <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
            Тохиргоо
          </span>

          <h1 className={TITLE_CLS}>Хэрэглэгчийн тохиргоо</h1>
          <p className={SUBTITLE_CLS}>Бүртгэлийн мэдээлэл болон нууц үгээ удирдах.</p>

          <dl className={SETTINGS_GRID_CLS}>
            <div className={SETTINGS_GRID_ITEM_CLS}><dt className={SETTINGS_GRID_DT_CLS}>Бүтэн нэр</dt><dd className={SETTINGS_GRID_DD_CLS}>{session.fullname || '—'}</dd></div>
            <div className={SETTINGS_GRID_ITEM_CLS}><dt className={SETTINGS_GRID_DT_CLS}>Холбоо барих</dt><dd className={SETTINGS_GRID_DD_CLS}>{session.identifier}</dd></div>
          </dl>

          <h2 className={SETTINGS_SECTION_TITLE_CLS}>Нууц үг солих</h2>
          <form className={FORM_CLS} onSubmit={onChangePassword} noValidate>
            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Одоогийн нууц үг</span>
              <input
                className={INPUT_CLS}
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
              />
            </label>
            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Шинэ нууц үг</span>
              <input
                className={INPUT_CLS}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
              />
              <span className={REG_HINT_CLS}>Хамгийн багадаа 8 тэмдэгт</span>
            </label>
            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Шинэ нууц үг давтах</span>
              <input
                className={INPUT_CLS}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
            </label>

            {alert && (
              <div className={alert.kind === 'ok' ? REG_ALERT_OK_CLS : REG_ALERT_CLS} role="alert">
                {alert.msg}
              </div>
            )}

            <button type="submit" className={SUBMIT_CLS} disabled={busy}>
              {busy ? 'Хадгалж байна…' : 'Хадгалах'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </form>

          <div className={DIVIDER_CLS}><span>аюултай бүс</span></div>

          <p className={REG_HINT_CLS} style={{ textAlign: 'center', marginTop: 4 }}>
            Бүртгэл устгасны дараа худалдан авсан тасалбарууд тань хадгалагдсаар үлдэх боловч нэвтрэх боломжгүй болно.
          </p>
          <button type="button" className={SETTINGS_DANGER_CLS} onClick={onDeleteAccount} disabled={busy}>
            Бүртгэл устгах
          </button>

          <Link className={HOME_CLS} to="/watch">Хувийн булан руу буцах</Link>
        </section>
      </main>
    </div>
  );
}
