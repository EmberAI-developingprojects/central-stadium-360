import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useRequireAuth } from '../auth';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

type AlertState = { kind: 'error' | 'ok'; msg: string } | null;

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
    // Re-verify the current password by hitting our login endpoint with the
    // session's identifier (phone or email). Supabase's updateUser doesn't
    // check the old password on its own.
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
    <div className="login-page">
      <header className="login-header">
        <Link className="login-logo" to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img src="/assets/images/brand/logo.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
        </Link>
        <Link className="login-back" to="/">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Нүүр буцах
        </Link>
      </header>

      <main className="login-main">
        <section className="login-card settings-card">
          <span className="login-eyebrow">
            <span className="login-eyebrow-dot" aria-hidden="true"></span>
            Тохиргоо
          </span>

          <h1 className="login-title">Хэрэглэгчийн тохиргоо</h1>
          <p className="login-subtitle">Бүртгэлийн мэдээлэл болон нууц үгээ удирдах.</p>

          <dl className="settings-grid">
            <div><dt>Бүтэн нэр</dt><dd>{session.fullname || '—'}</dd></div>
            <div><dt>Холбоо барих</dt><dd>{session.identifier}</dd></div>
          </dl>

          <h2 className="settings-section-title">Нууц үг солих</h2>
          <form className="login-form" onSubmit={onChangePassword} noValidate>
            <label className="login-field">
              <span className="login-label">Одоогийн нууц үг</span>
              <input
                className="login-input"
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
              />
            </label>
            <label className="login-field">
              <span className="login-label">Шинэ нууц үг</span>
              <input
                className="login-input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
              />
              <span className="reg-hint">Хамгийн багадаа 8 тэмдэгт</span>
            </label>
            <label className="login-field">
              <span className="login-label">Шинэ нууц үг давтах</span>
              <input
                className="login-input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
            </label>

            {alert && (
              <div className={`reg-alert${alert.kind === 'ok' ? ' is-ok' : ''}`} role="alert">
                {alert.msg}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={busy}>
              {busy ? 'Хадгалж байна…' : 'Хадгалах'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </form>

          <div className="login-divider"><span>аюултай бүс</span></div>

          <p className="reg-hint" style={{ textAlign: 'center', marginTop: 4 }}>
            Бүртгэл устгасны дараа худалдан авсан тасалбарууд тань хадгалагдсаар үлдэх боловч нэвтрэх боломжгүй болно.
          </p>
          <button type="button" className="settings-danger" onClick={onDeleteAccount} disabled={busy}>
            Бүртгэл устгах
          </button>

          <Link className="login-home" to="/watch">Хувийн булан руу буцах</Link>
        </section>
      </main>
    </div>
  );
}
