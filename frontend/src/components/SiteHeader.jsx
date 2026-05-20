import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import UserMenu from './UserMenu.jsx';

export default function SiteHeader() {
  const { session } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="header-inner">

        <div className="topbar">
          <div className="topbar-main">
            <span className="contact-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>
              </svg>
              +976 7700 0000
            </span>
            <span className="contact-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              info@tsengeldekh.mn
            </span>
            <span className="contact-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Ulaanbaatar, Mongolia
            </span>
          </div>

          <div className="topbar-accent" aria-label="Social media links">
            <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 22v-8h3l1-4h-4V7c0-1 .3-1.7 1.8-1.7H17V1.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10H7v4h3.6v8z"/></svg></a>
            <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
            <a href="#" aria-label="Twitter"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.8c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 12 9c0 .3 0 .6.1.9A11.6 11.6 0 0 1 3.4 5a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4 4 0 0 1-1.9.1c.5 1.6 2 2.8 3.8 2.9A8.2 8.2 0 0 1 2 18.6 11.6 11.6 0 0 0 8.3 20.5c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.5-1.3 2.1-2.1z"/></svg></a>
            <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.3a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zM19 19h-3v-4.7c0-1.1 0-2.6-1.6-2.6S12.6 13 12.6 14.2V19h-3v-9h2.9v1.2h.1A3.2 3.2 0 0 1 15.5 10c3.1 0 3.7 2 3.7 4.7z"/></svg></a>
            <a href="#" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8a26 26 0 0 0-.4-4.8zM10 15V9l5 3z"/></svg></a>
          </div>
        </div>

        <nav className="mainnav" aria-label="Үндсэн цэс">
          <Link className="logo" to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
            <span className="logo-mark" aria-hidden="true">
              <img src="/assets/images/brand/logo.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
            </span>
          </Link>

          <ul className="nav-links">
            <li className="has-dropdown">
              <a href="#about">
                Бидний тухай
                <svg className="caret" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>
              </a>
              <div className="dropdown" role="menu">
                <a href="#about">Танилцуулга</a>
                <a href="#events">Түүхэн замнал</a>
                <a href="#about">Байгууллагын бүтэц</a>
                <a href="#about">Эрхэм зорилго</a>
              </div>
            </li>
            <li><a href="#events">Үйл ажиллагаа &amp; Арга хэмжээ</a></li>
            <li className="has-dropdown">
              <a href="#certificates">
                Ил тод байдал
                <svg className="caret" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>
              </a>
              <div className="dropdown" role="menu">
                <a href="#certificates">Гүйцэтгэлийн тайлан</a>
                <a href="#certificates">НИТХ-ын тогтоол</a>
                <a href="#contact">Өргөдөл хүсэлт</a>
                <a href="#certificates">Хүний нөөцийн бодлого</a>
                <a href="#certificates">Сонгон шалгаруулах журам</a>
                <a href="#certificates">Гүйцэтгэлийг үнэлэх журам</a>
                <a href="#certificates">Ёс зүйн дүрэм</a>
                <a href="#certificates">Зөвлөмжийн хэрэгжилт</a>
              </div>
            </li>
            <li><a href="#certificates">Хууль, эрх зүй</a></li>
            <li><a href="#certificates">Шилэн</a></li>
            <li><a href="#news">Мэдээ мэдээлэл</a></li>
            <li><a href="#contact">Холбоо барих</a></li>
          </ul>

          <div className="header-auth">
            {session && session.identifier ? (
              <UserMenu />
            ) : (
              <Link to="/login" className="auth-btn" aria-label="Нэвтрэх">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>
                </svg>
                <span>Нэвтрэх</span>
              </Link>
            )}
          </div>
        </nav>

      </div>
    </header>
  );
}
