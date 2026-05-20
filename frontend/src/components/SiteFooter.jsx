import React from 'react';
import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">

          <div className="footer-col footer-brand">
            <Link className="logo" to="/">
              <span className="logo-mark" aria-hidden="true">
                <img src="/assets/images/brand/logo-white.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
              </span>
            </Link>
            <p className="footer-tagline">
              Монгол улсын спорт, соёл, баяр ёслолын төв &mdash;
              аваргууд төрж, мөч бүр дурсамж болдог газар.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 22v-8h3l1-4h-4V7c0-1 .3-1.7 1.8-1.7H17V1.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10H7v4h3.6v8z"/></svg></a>
              <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
              <a href="#" aria-label="Twitter"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.8c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 12 9c0 .3 0 .6.1.9A11.6 11.6 0 0 1 3.4 5a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4 4 0 0 1-1.9.1c.5 1.6 2 2.8 3.8 2.9A8.2 8.2 0 0 1 2 18.6 11.6 11.6 0 0 0 8.3 20.5c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.5-1.3 2.1-2.1z"/></svg></a>
              <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.3a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zM19 19h-3v-4.7c0-1.1 0-2.6-1.6-2.6S12.6 13 12.6 14.2V19h-3v-9h2.9v1.2h.1A3.2 3.2 0 0 1 15.5 10c3.1 0 3.7 2 3.7 4.7z"/></svg></a>
              <a href="#" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8a26 26 0 0 0-.4-4.8zM10 15V9l5 3z"/></svg></a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Хурдан холбоос</h4>
            <ul>
              <li><a href="#top">Нүүр</a></li>
              <li><a href="#about">Бидний тухай</a></li>
              <li><a href="#events">Үйл явдал</a></li>
              <li><a href="#partners">Хамтрагч</a></li>
              <li><a href="#membership">Гишүүнчлэл</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Мэдээлэл</h4>
            <ul>
              <li><a href="#news">Мэдээ</a></li>
              <li><a href="#partners">Ивээн тэтгэгч</a></li>
              <li><a href="#certificates">Гэрчилгээ</a></li>
              <li><a href="#contact">Тусламж</a></li>
              <li><a href="#contact">Холбоо барих</a></li>
            </ul>
          </div>

          <div className="footer-col" id="contact">
            <h4>Холбоо барих</h4>
            <ul>
              <li>+976 7700 0000</li>
              <li>info@tsengeldekh.mn</li>
              <li>Улаанбаатар хот, Монгол улс</li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 Төв Цэнгэлдэх Хүрээлэн. Бүх эрх хуулиар хамгаалагдсан.</p>
          <ul>
            <li><a href="#">Нууцлалын бодлого</a></li>
            <li><a href="#">Үйлчилгээний нөхцөл</a></li>
            <li><a href="#">Күүки</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
