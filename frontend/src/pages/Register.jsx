import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { readUsers, writeUsers } from '../auth.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [method, setMethod] = useState('phone');
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState('');
  const [submitLabel, setSubmitLabel] = useState('Бүртгүүлэх');
  const [busy, setBusy] = useState(false);

  // Mongolian phone formatting: 8 digits, with a space after the first 4.
  const onPhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    setPhone(digits.length > 4 ? digits.slice(0, 4) + ' ' + digits.slice(4) : digits);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setAlert('');

    if (fullname.trim().length < 2) return setAlert('Бүтэн нэрээ оруулна уу.');

    let identifier;
    if (method === 'phone') {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 8) return setAlert('Утасны дугаар 8 оронтой байх ёстой.');
      if (!/^[6789]/.test(digits)) return setAlert('Зөвхөн Монгол утасны дугаар хүлээн авна (6, 7, 8, 9-өөр эхэлсэн).');
      identifier = '+976' + digits;
    } else {
      const e2 = email.trim().toLowerCase();
      if (!/^[a-z0-9._%+-]+@gmail\.com$/.test(e2)) return setAlert('Зөвхөн @gmail.com хаяг хүлээн авна.');
      identifier = e2;
    }

    if (password.length < 8) return setAlert('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
    if (password !== confirmPw) return setAlert('Нууц үг таарахгүй байна.');
    if (!agree) return setAlert('Үйлчилгээний нөхцөлийг зөвшөөрнө үү.');

    const users = readUsers();
    if (users.some((u) => u.identifier === identifier)) {
      return setAlert(`Энэ ${method === 'phone' ? 'утасны дугаар' : 'и-мэйл'} аль хэдийн бүртгэлтэй байна.`);
    }

    users.push({
      fullname: fullname.trim(),
      method,
      identifier,
      password,
      createdAt: new Date().toISOString(),
    });
    writeUsers(users);

    setBusy(true);
    setSubmitLabel('Бүртгэгдлээ ✓');
    setTimeout(() => navigate('/login', { replace: true }), 900);
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <Link className="login-logo" to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img src="/assets/images/brand/logo.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
        </Link>
        <Link className="login-back" to="/login">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Нэвтрэх рүү буцах
        </Link>
      </header>

      <main className="login-main">
        <section className="login-card">
          <span className="login-eyebrow">
            <span className="login-eyebrow-dot" aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className="login-title">Шинээр бүртгүүлэх</h1>
          <p className="login-subtitle">
            Утасны дугаар эсвэл Gmail хаягаараа бүртгүүлж, тасалбар, шууд дамжуулал,
            гишүүнчлэлдээ хандах боломжтой.
          </p>

          <div className="reg-tabs" role="tablist" aria-label="Бүртгэлийн төрөл">
            <button
              type="button"
              className={`reg-tab${method === 'phone' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={method === 'phone'}
              onClick={() => { setMethod('phone'); setAlert(''); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>
              </svg>
              Утасны дугаар
            </button>
            <button
              type="button"
              className={`reg-tab${method === 'email' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={method === 'email'}
              onClick={() => { setMethod('email'); setAlert(''); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Gmail
            </button>
          </div>

          <form className="login-form reg-form" onSubmit={onSubmit} noValidate>
            <label className="login-field">
              <span className="login-label">Бүтэн нэр</span>
              <input
                className="login-input"
                type="text"
                name="fullname"
                placeholder="Жишээ: Б. Болор"
                autoComplete="name"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                required
              />
            </label>

            <label className="login-field reg-field-phone" hidden={method !== 'phone'}>
              <span className="login-label">Утасны дугаар</span>
              <span className="reg-phone-wrap">
                <span className="reg-phone-prefix" aria-hidden="true">+976</span>
                <input
                  className="login-input reg-input-phone"
                  type="tel"
                  name="phone"
                  placeholder="8800 0000"
                  inputMode="numeric"
                  maxLength={9}
                  autoComplete="tel-national"
                  value={phone}
                  onChange={onPhoneChange}
                />
              </span>
              <span className="reg-hint">8 оронтой Монгол утасны дугаар оруулна уу</span>
            </label>

            <label className="login-field reg-field-email" hidden={method !== 'email'}>
              <span className="login-label">Gmail хаяг</span>
              <input
                className="login-input reg-input-email"
                type="email"
                name="email"
                placeholder="name@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span className="reg-hint">Зөвхөн @gmail.com хаяг хүлээн авна</span>
            </label>

            <label className="login-field">
              <span className="login-label">Нууц үг</span>
              <span className="login-password-wrap">
                <input
                  className="login-input"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
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
              <span className="reg-hint">Хамгийн багадаа 8 тэмдэгт</span>
            </label>

            <label className="login-field">
              <span className="login-label">Нууц үг давтах</span>
              <input
                className="login-input"
                type="password"
                name="password_confirm"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
            </label>

            <label className="reg-terms">
              <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
              <span>Үйлчилгээний нөхцөл болон нууцлалын бодлогыг хүлээн зөвшөөрч байна.</span>
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

          <Link className="login-register" to="/login">Аль хэдийн бүртгэлтэй — Нэвтрэх</Link>
          <Link className="login-home" to="/">Нүүр хуудас руу буцах</Link>
        </section>
      </main>
    </div>
  );
}
