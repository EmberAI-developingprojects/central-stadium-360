import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { readUsers, useAuth, useRequireAuth, writeUsers } from '../auth.jsx';

export default function Settings() {
  const session = useRequireAuth();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [alert, setAlert] = useState(null); // { kind: 'error' | 'ok', msg }

  if (!session) return null;

  const users = readUsers();
  const account = users.find((u) => u.identifier === session.identifier);
  const createdAt = account?.createdAt ? new Date(account.createdAt).toLocaleString('mn-MN') : '—';

  const onChangePassword = (e) => {
    e.preventDefault();
    setAlert(null);

    if (!account) {
      // Test users (e.g. admin/admin) are not in localStorage and can't change passwords here.
      return setAlert({ kind: 'error', msg: 'Энэ бүртгэлийн нууц үгийг өөрчилж чадахгүй (туршилтын хэрэглэгч).' });
    }
    if (account.password !== currentPw) return setAlert({ kind: 'error', msg: 'Одоогийн нууц үг буруу байна.' });
    if (newPw.length < 8) return setAlert({ kind: 'error', msg: 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.' });
    if (newPw !== confirmPw) return setAlert({ kind: 'error', msg: 'Шинэ нууц үг таарахгүй байна.' });

    const next = users.map((u) => (u.identifier === account.identifier ? { ...u, password: newPw } : u));
    writeUsers(next);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setAlert({ kind: 'ok', msg: 'Нууц үг шинэчлэгдлээ.' });
  };

  const onDeleteAccount = () => {
    if (!account) {
      return setAlert({ kind: 'error', msg: 'Туршилтын хэрэглэгчийг устгах боломжгүй.' });
    }
    if (!confirm('Бүртгэлээ устгах уу? Үүнийг буцаах боломжгүй.')) return;
    const next = users.filter((u) => u.identifier !== account.identifier);
    writeUsers(next);
    logout();
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
            <div><dt>Бүртгэгдсэн</dt><dd>{createdAt}</dd></div>
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

            <button type="submit" className="login-submit">
              Хадгалах
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </form>

          <div className="login-divider"><span>аюултай бүс</span></div>

          <button type="button" className="settings-danger" onClick={onDeleteAccount}>
            Бүртгэл устгах
          </button>

          <Link className="login-home" to="/watch">Хувийн булан руу буцах</Link>
        </section>
      </main>
    </div>
  );
}
