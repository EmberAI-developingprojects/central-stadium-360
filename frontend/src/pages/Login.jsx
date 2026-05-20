import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { readUsers, useAuth } from '../auth.jsx';

const TEST_USER = { identifier: 'admin', password: 'admin', fullname: 'Admin' };

// Normalize: gmail trimmed + lowercased; phone reduced to +976 + 8 digits
function normalize(raw) {
  const v = raw.trim();
  if (/@/.test(v)) return v.toLowerCase();
  let digits = v.replace(/\D/g, '');
  if (digits.length === 11 && digits.indexOf('976') === 0) digits = digits.slice(3);
  if (digits.length === 8) return '+976' + digits;
  return v;
}

// Restrict ?next= to local SPA routes so we can't be used as an open redirect.
// Default to /watch so freshly-signed-in users land in their dashboard.
function safeNext(next) {
  if (!next) return '/watch';
  if (!next.startsWith('/')) return '/watch';
  if (next.startsWith('//')) return '/watch';
  return next;
}

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitLabel, setSubmitLabel] = useState('Нэвтрэх');

  const onSubmit = (e) => {
    e.preventDefault();
    setAlert('');
    const rawId = identifier.trim();
    if (!rawId) return setAlert('И-мэйл эсвэл утасны дугаараа оруулна уу.');
    if (!password) return setAlert('Нууц үгээ оруулна уу.');

    let account = null;
    if (rawId.toLowerCase() === TEST_USER.identifier && password === TEST_USER.password) {
      account = TEST_USER;
    } else {
      const id = normalize(rawId);
      const users = readUsers();
      account = users.find((u) => u.identifier === id);
      if (!account) return setAlert('Бүртгэл олдсонгүй. Шинээр бүртгүүлнэ үү.');
      if (account.password !== password) return setAlert('Нууц үг буруу байна.');
    }

    login(account);
    setBusy(true);
    setSubmitLabel(`Тавтай морилно уу, ${account.fullname || ''} ✓`);
    const next = safeNext(params.get('next'));
    setTimeout(() => navigate(next, { replace: true }), 900);
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
        <section className="login-card">
          <span className="login-eyebrow">
            <span className="login-eyebrow-dot" aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className="login-title">Нэвтрэх</h1>
          <p className="login-subtitle">
            Тасалбар, шууд дамжуулал, гишүүнчлэлдээ хандахын тулд бүртгэлээрээ нэвтэрнэ үү.
          </p>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            <label className="login-field">
              <span className="login-label">И-мэйл эсвэл утасны дугаар</span>
              <input
                className="login-input"
                type="text"
                name="identifier"
                placeholder="name@gmail.com эсвэл 8800 0000"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </label>

            <label className="login-field">
              <span className="login-label">Нууц үг</span>
              <span className="login-password-wrap">
                <input
                  className="login-input"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-pass-toggle"
                  aria-label={showPw ? 'Нууц үг нуух' : 'Нууц үг харах'}
                  onClick={() => setShowPw((s) => !s)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </span>
            </label>

            <div className="reg-alert" role="alert" hidden={!alert}>{alert}</div>

            <button type="submit" className="login-submit" disabled={busy}>
              {submitLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </form>

          <div className="login-divider"><span>эсвэл</span></div>

          <Link className="login-register" to="/register">Шинээр бүртгүүлэх</Link>
          <Link className="login-home" to="/">Нүүр хуудас руу буцах</Link>
        </section>
      </main>
    </div>
  );
}
