import React, { useEffect, useState } from 'react';
import { getHomeContent, updateHomeContent } from '../../data/store.js';

const TABS = [
  { key: 'news',     label: 'Мэдээ' },
  { key: 'partners', label: 'Хамтрагч' },
  { key: 'roadmap',  label: 'Түүхэн замнал' },
  { key: 'members',  label: 'Үйлчилгээ' },
];

const ICON_KEYS = ['music', 'doc', 'news', 'chat', 'stream', 'stadium'];

const NEW_ITEM = {
  news:     () => ({ id: 'news-' + Math.random().toString(36).slice(2, 7), label: 'Шинэ', title: '', body: '', image: '', featured: false }),
  partners: () => ({ id: 'partner-' + Math.random().toString(36).slice(2, 7), image: '', alt: 'Партнёр байгууллага' }),
  roadmap:  () => ({ id: 'm' + Math.random().toString(36).slice(2, 6), year: '', title: '', position: 'top' }),
  members:  () => ({ id: 'svc-' + Math.random().toString(36).slice(2, 7), title: '', desc: '', iconKey: 'music', href: '#', badge: '' }),
};

export default function Content() {
  const [tab, setTab] = useState('news');
  const [content, setContent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => { getHomeContent().then(setContent); }, []);

  if (!content) return <div className="admin-empty">Уншиж байна…</div>;

  const section = content[tab] || [];

  const updateSection = (next) => setContent({ ...content, [tab]: next });

  const updateItem = (id, patch) =>
    updateSection(section.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id) =>
    updateSection(section.filter((it) => it.id !== id));

  const addItem = () => {
    const next = [...section, NEW_ITEM[tab]()];
    updateSection(next);
  };

  const onSave = async () => {
    setBusy(true);
    try {
      await updateHomeContent({ [tab]: section });
      setSavedAt(Date.now());
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h2>Контент засварлагч</h2>
          <p>Нүүр хуудсанд харагдах мэдээ, хамтрагч, түүхэн замнал, үйлчилгээний картууд.</p>
        </div>
        <div className="admin-actions">
          {savedAt > 0 && Date.now() - savedAt < 4000 && (
            <span className="badge badge-paid" style={{ alignSelf: 'center' }}>Хадгалагдсан</span>
          )}
          <button type="button" className="btn" onClick={addItem}>+ Шинэ мөр</button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={busy}>
            {busy ? 'Хадгалж байна…' : 'Хадгалах'}
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'is-active' : undefined}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span style={{ color: 'var(--admin-muted)', marginLeft: 4 }}>{(content[t.key] || []).length}</span>
          </button>
        ))}
      </div>

      {section.length === 0 ? (
        <div className="admin-empty">
          <strong>Мөр алга</strong>
          «+ Шинэ мөр» товчоор шинээр нэмнэ үү.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {section.map((it) => (
            <div key={it.id} className="admin-card">
              {tab === 'news' && (
                <NewsRow item={it} onChange={(p) => updateItem(it.id, p)} onRemove={() => removeItem(it.id)} />
              )}
              {tab === 'partners' && (
                <PartnerRow item={it} onChange={(p) => updateItem(it.id, p)} onRemove={() => removeItem(it.id)} />
              )}
              {tab === 'roadmap' && (
                <RoadmapRow item={it} onChange={(p) => updateItem(it.id, p)} onRemove={() => removeItem(it.id)} />
              )}
              {tab === 'members' && (
                <MemberRow item={it} onChange={(p) => updateItem(it.id, p)} onRemove={() => removeItem(it.id)} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function RowHeader({ children, onRemove }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <strong style={{ fontSize: 13 }}>{children}</strong>
      <button type="button" className="btn btn-sm btn-danger" onClick={onRemove}>Устгах</button>
    </div>
  );
}

function NewsRow({ item, onChange, onRemove }) {
  return (
    <>
      <RowHeader onRemove={onRemove}>{item.title || 'Шинэ мэдээ'}</RowHeader>
      <div className="admin-form-row">
        <div className="admin-field">
          <label>Шошго</label>
          <input value={item.label || ''} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Зургийн URL</label>
          <input value={item.image || ''} onChange={(e) => onChange({ image: e.target.value })} />
        </div>
      </div>
      <div className="admin-field">
        <label>Гарчиг</label>
        <input value={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
      </div>
      <div className="admin-field">
        <label>Хураангуй</label>
        <textarea value={item.body || ''} onChange={(e) => onChange({ body: e.target.value })} />
      </div>
      <label className="admin-checkbox">
        <input type="checkbox" checked={!!item.featured} onChange={(e) => onChange({ featured: e.target.checked })} />
        <span>Featured (том картаар харуулах)</span>
      </label>
    </>
  );
}

function PartnerRow({ item, onChange, onRemove }) {
  return (
    <>
      <RowHeader onRemove={onRemove}>{item.alt || 'Хамтрагч'}</RowHeader>
      <div className="admin-form-row">
        <div className="admin-field">
          <label>Зургийн URL</label>
          <input value={item.image || ''} onChange={(e) => onChange({ image: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Alt текст</label>
          <input value={item.alt || ''} onChange={(e) => onChange({ alt: e.target.value })} />
        </div>
      </div>
      {item.image && (
        <div className="admin-image-preview" style={{ aspectRatio: '4 / 1', backgroundImage: `url('${item.image}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }} />
      )}
    </>
  );
}

function RoadmapRow({ item, onChange, onRemove }) {
  return (
    <>
      <RowHeader onRemove={onRemove}>{item.year || 'Шинэ мөр'} — {item.title}</RowHeader>
      <div className="admin-form-row">
        <div className="admin-field">
          <label>Он</label>
          <input value={item.year || ''} onChange={(e) => onChange({ year: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Байршил</label>
          <select value={item.position || 'top'} onChange={(e) => onChange({ position: e.target.value })}>
            <option value="top">Дээр</option>
            <option value="bot">Доор</option>
          </select>
        </div>
      </div>
      <div className="admin-field">
        <label>Гарчиг</label>
        <input value={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
      </div>
    </>
  );
}

function MemberRow({ item, onChange, onRemove }) {
  return (
    <>
      <RowHeader onRemove={onRemove}>{item.title || 'Үйлчилгээ'}</RowHeader>
      <div className="admin-form-row">
        <div className="admin-field">
          <label>Гарчиг</label>
          <input value={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Икон</label>
          <select value={item.iconKey || 'music'} onChange={(e) => onChange({ iconKey: e.target.value })}>
            {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>
      <div className="admin-field">
        <label>Тайлбар</label>
        <textarea value={item.desc || ''} onChange={(e) => onChange({ desc: e.target.value })} />
      </div>
      <div className="admin-form-row">
        <div className="admin-field">
          <label>Холбоос (href)</label>
          <input value={item.href || '#'} onChange={(e) => onChange({ href: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Badge (заавал биш)</label>
          <input value={item.badge || ''} onChange={(e) => onChange({ badge: e.target.value })} placeholder="Live" />
        </div>
      </div>
    </>
  );
}
