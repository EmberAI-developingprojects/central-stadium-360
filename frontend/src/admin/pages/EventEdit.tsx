import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createEvent, deleteEvent, getEvent, updateEvent } from '../../data/store';
import type { EventRecord } from '../../data/store';
import { ADMIN_ALERT_CLS, ADMIN_BTN_CLS, ADMIN_BTN_DANGER_CLS, ADMIN_BTN_GHOST_CLS, ADMIN_BTN_PRIMARY_CLS, ADMIN_CHECKBOX_CLS, ADMIN_EMPTY_CLS, ADMIN_FIELD_CLS, ADMIN_FORM_ACTIONS_CLS, ADMIN_FORM_CLS, ADMIN_FORM_ROW_CLS, ADMIN_IMAGE_PREVIEW_CLS, ADMIN_PAGE_HEADER_CLS } from '../_adminStyles';

const EMPTY: EventRecord = {
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState<EventRecord>(EMPTY);
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew || !id) return;
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

  if (!loaded) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  const update = (patch: Partial<EventRecord>) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Гарчиг шаардлагатай.'); return; }
    setBusy(true);
    try {
      if (isNew) {
        const created = await createEvent(form);
        navigate(`/admin/events/${created.id}`, { replace: true });
      } else if (id) {
        await updateEvent(id, form);
      }
      navigate('/admin/events');
    } catch (err) {
      setError((err as Error).message || 'Хадгалах боломжгүй.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    if (!window.confirm(`«${form.title}» арга хэмжээг устгах уу?`)) return;
    await deleteEvent(id);
    navigate('/admin/events');
  };

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>{isNew ? 'Шинэ арга хэмжээ' : 'Засварлах'}</h2>
          <p>360° дамжуулалт зарагдаж буй арга хэмжээний дэлгэрэнгүй.</p>
        </div>
        <Link to="/admin/events" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}>← Жагсаалт руу</Link>
      </div>

      {error && <div className={ADMIN_ALERT_CLS} style={{ marginBottom: 14 }}>{error}</div>}

      <form className={ADMIN_FORM_CLS} onSubmit={onSubmit}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Гарчиг</label>
          <input value={form.title} onChange={(e) => update({ title: e.target.value })} required />
        </div>

        <div className={ADMIN_FORM_ROW_CLS}>
          <div className={ADMIN_FIELD_CLS}>
            <label>ID (slug)</label>
            <input
              value={form.id}
              onChange={(e) => update({ id: e.target.value })}
              placeholder="auto"
              disabled={!isNew}
            />
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label>Категори / Pill</label>
            <input value={form.pill} onChange={(e) => update({ pill: e.target.value })} />
          </div>
        </div>

        <div className={ADMIN_FIELD_CLS}>
          <label>Тайлбар</label>
          <textarea value={form.desc} onChange={(e) => update({ desc: e.target.value })} />
        </div>

        <div className={ADMIN_FORM_ROW_CLS}>
          <div className={ADMIN_FIELD_CLS}>
            <label>Огноо (харагдах)</label>
            <input value={form.date} onChange={(e) => update({ date: e.target.value })} placeholder="05 / 23 · 2026" />
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label>Цаг (Шууд)</label>
            <input value={form.when} onChange={(e) => update({ when: e.target.value })} placeholder="2026 / 05 / 23 · 21:00" />
          </div>
        </div>

        <div className={ADMIN_FORM_ROW_CLS}>
          <div className={ADMIN_FIELD_CLS}>
            <label>Үндсэн үнэ (₮)</label>
            <input type="number" min="0" step="500" value={form.base} onChange={(e) => update({ base: Number(e.target.value) })} />
          </div>
          <div className={ADMIN_FIELD_CLS} style={{ justifyContent: 'flex-end' }}>
            <label className={ADMIN_CHECKBOX_CLS}>
              <input type="checkbox" checked={!!form.featured} onChange={(e) => update({ featured: e.target.checked })} />
              <span>Featured (Шууд) болгох</span>
            </label>
          </div>
        </div>

        <div className={ADMIN_FIELD_CLS}>
          <label>Зургийн URL</label>
          <input value={form.image} onChange={(e) => update({ image: e.target.value })} placeholder="/assets/images/events/..." />
          {form.image && (
            <div className={ADMIN_IMAGE_PREVIEW_CLS} style={{ backgroundImage: `url('${form.image}')` }} aria-hidden="true" />
          )}
        </div>

        <div className={ADMIN_FORM_ACTIONS_CLS}>
          <button type="submit" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`} disabled={busy}>
            {busy ? 'Хадгалж байна…' : (isNew ? 'Үүсгэх' : 'Хадгалах')}
          </button>
          <Link to="/admin/events" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}>Болих</Link>
          {!isNew && (
            <button type="button" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS}`} onClick={onDelete} style={{ marginLeft: 'auto' }}>
              Устгах
            </button>
          )}
        </div>
      </form>
    </>
  );
}
