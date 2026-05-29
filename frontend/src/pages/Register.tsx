// Register chooser — picks phone or Gmail registration. Phase 1 of the
// Tailwind migration: uses the new <AuthLayout> / <AuthCard> / <Divider> /
// <ButtonLink> primitives. Visually identical to the prior `.login-card`
// version; only the styling system underneath changed.
//
// The two method cards still use the `.reg-tabs` / `.reg-tab` classes from
// styles.css because they're only rendered here — there's no win in
// extracting them as primitives until something else needs them.

import { Link } from 'react-router-dom';
import { AuthLayout, BackLink } from '../components/auth/AuthLayout';
import { AuthCard, Divider } from '../components/auth/AuthCard';
import { ButtonLink } from '../components/ui/Button';

export default function Register() {
  return (
    <AuthLayout back={<BackLink to="/login">Нэвтрэх рүү буцах</BackLink>}>
      <AuthCard
        eyebrow="Хувийн булан"
        title="Шинээр бүртгүүлэх"
        subtitle="Утасны дугаар эсвэл Gmail хаягаасаа сонгоод бүртгэлээ үүсгэнэ үү."
      >
        <div className="reg-tabs" role="list" aria-label="Бүртгэлийн төрөл">
          <Link to="/register/phone" className="reg-tab" role="listitem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>
            </svg>
            Утасны дугаараар
          </Link>
          <Link to="/register/email" className="reg-tab" role="listitem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Gmail-аар
          </Link>
        </div>

        <Divider>эсвэл</Divider>

        <ButtonLink variant="outline" to="/login">
          Аль хэдийн бүртгэлтэй — Нэвтрэх
        </ButtonLink>
        <ButtonLink variant="text" to="/">
          Нүүр хуудас руу буцах
        </ButtonLink>
      </AuthCard>
    </AuthLayout>
  );
}
