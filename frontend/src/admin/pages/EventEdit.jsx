import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createEvent, deleteEvent, getEvent, updateEvent } from '../../data/store.js';

const EMPTY = {
  id: '',
  title: '',
  desc: '',
  date: '',
  when: '',
  pill: 'Концерт',
  image: '',
  base: 0,
  featured: false,
};

export default function EventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    getEvent(id).then((e) => {
      if (!e) {
        setError('Арга хэмжээ олдсонгүй.');
        setLoaded(true);
        return;
      }
      setForm(e);
      setLoaded(true);
    });
  }, [id, isNew]);

  if (!loaded) return <div className="admin-empty">Уншиж байна…</div>;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Гарчиг шаардлагатай.'); return; }
    setBusy(true);
    try {
      if (isNew) {
        const created = await createEvent(form);
        navigate(`/admin/events/${created.id}`, { replace: true });
      } else {
        await updateEvent(id, form);
      }
      navigate('/admin/events');
    } catch (err) {
      setError(err.message || 'Хадгалах боломжгүй.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`«${form.title}» арга хэмжээг устгах уу?`)) return;
    await deleteEvent(id);
    navigate('/admin/events');
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h2>{isNew ? 'Шинэ арга хэмжээ' : 'Засварлах'}</h2>
          <p>360° дамжуулалт зарагдаж буй арга хэмжээний дэлгэрэнгүй.</p>
        </div>
        <Link to="/admin/events" className="btn btn-ghost">← Жагсаалт руу</Link>
      </div>

      {error && <div className="admin-alert" style={{ marginBottom: 14 }}>{error}</div>}

      <form className="admin-form" onSubmit={onSubmit}>
        <div className="admin-field">
          <label>Гарчиг</label>
          <input value={form.title} onChange={(e) => update({ title: e.target.value })} required />
        </div>

        <div className="admin-form-row">
          <div className="admin-field">
            <label>ID (slug)</label>
            <input
              value={form.id}
              onChange={(e) => update({ id: e.target.value })}
              placeholder="auto"
              disabled={!isNew}
            />
          </div>
          <div className="admin-field">
            <label>Категори / Pill</label>
            <input value={form.pill} onChange={(e) => update({ pill: e.target.value })} />
          </div>
        </div>

        <div className="admin-field">
          <label>Тайлбар</label>
          <textarea value={form.desc} onChange={(e) => update({ desc: e.target.value })} />
        </div>

        <div className="admin-form-row">
          <div className="admin-field">
            <label>Огноо (харагдах)</label>
            <input value={form.date} onChange={(e) => update({ date: e.target.value })} placeholder="05 / 23 · 2026" />
          </div>
          <div className="admin-field">
            <label>Цаг (Шууд)</label>
            <input value={form.when} onChange={(e) => update({ when: e.target.value })} placeholder="2026 / 05 / 23 · 21:00" />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-field">
            <label>Үндсэн үнэ (₮)</label>
            <input type="number" min="0" step="500" value={form.base} onChange={(e) => update({ base: Number(e.target.value) })} />
          </div>
          <div className="admin-field" style={{ justifyContent: 'flex-end' }}>
            <label className="admin-checkbox">
              <input type="checkbox" checked={!!form.featured} onChange={(e) => update({ featured: e.target.checked })} />
              <span>Featured (Шууд) болгох</span>
            </label>
          </div>
        </div>

        <div className="admin-field">
          <label>Зургийн URL</label>
          <input value={form.image} onChange={(e) => update({ image: e.target.value })} placeholder="/assets/images/events/..." />
          {form.image && (
            <div className="admin-image-preview" style={{ backgroundImage: `url('${form.image}')` }} aria-hidden="true" />
          )}
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Хадгалж байна…' : (isNew ? 'Үүсгэх' : 'Хадгалах')}
          </button>
          <Link to="/admin/events" className="btn btn-ghost">Болих</Link>
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={onDelete} style={{ marginLeft: 'auto' }}>
              Устгах
            </button>
          )}
        </div>
      </form>
    </>
  );
}
