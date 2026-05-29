import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteEvent, listEvents, listOrders, setFeaturedEvent } from '../../data/store';
import type { EventRecord } from '../../data/store';
import { ADMIN_ACTIONS_CLS, ADMIN_BADGE_CLS, ADMIN_BADGE_FEATURED_CLS, ADMIN_BTN_CLS, ADMIN_BTN_DANGER_CLS, ADMIN_BTN_GHOST_CLS, ADMIN_BTN_PRIMARY_CLS, ADMIN_BTN_SM_CLS, ADMIN_EMPTY_CLS, ADMIN_PAGE_HEADER_CLS, ADMIN_TABLE_CLS, ADMIN_TABLE_THUMB_CLS, ADMIN_TABLE_WRAP_CLS } from '../_adminStyles';

const money = (n: number | undefined): string => (n || 0).toLocaleString('en-US') + '₮';

export default function EventsList() {
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [salesByEvent, setSalesByEvent] = useState<Record<string, number>>({});

  const load = () => {
    Promise.all([listEvents(), listOrders({ status: 'paid' })]).then(([evts, orders]) => {
      setEvents(evts);
      const map: Record<string, number> = {};
      orders.forEach((o) => { map[o.eventId] = (map[o.eventId] || 0) + (Number(o.qty) || 0); });
      setSalesByEvent(map);
    });
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (id: string, title: string) => {
    if (!window.confirm(`«${title}» арга хэмжээг устгах уу?`)) return;
    await deleteEvent(id);
    load();
  };

  const onFeature = async (id: string) => {
    await setFeaturedEvent(id);
    load();
  };

  if (!events) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Арга хэмжээ</h2>
          <p>Удахгүй болох тоглолтуудыг үүсгэх, засах, устгах.</p>
        </div>
        <Link to="/admin/events/new" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}>+ Шинэ арга хэмжээ</Link>
      </div>

      {events.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Арга хэмжээ алга</strong>
          Эхлэхийн тулд «Шинэ арга хэмжээ» товч дээр дарна уу.
        </div>
      ) : (
        <div className={ADMIN_TABLE_WRAP_CLS}>
          <table className={ADMIN_TABLE_CLS}>
            <thead>
              <tr>
                <th></th>
                <th>Арга хэмжээ</th>
                <th>Огноо</th>
                <th>Үндсэн үнэ</th>
                <th>Зарагдсан</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span
                      className={ADMIN_TABLE_THUMB_CLS}
                      style={{ backgroundImage: e.image ? `url('${e.image}')` : undefined }}
                      aria-hidden="true"
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {e.title}{' '}
                      {e.featured && <span className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_FEATURED_CLS}`}>Featured</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{e.id}</div>
                  </td>
                  <td>{e.date}</td>
                  <td>{money(e.base)}</td>
                  <td>{salesByEvent[e.id] || 0}</td>
                  <td>
                    <button
                      type="button"
                      className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_GHOST_CLS}`}
                      onClick={() => onFeature(e.id)}
                      disabled={e.featured}
                      title={e.featured ? 'Аль хэдийн featured' : 'Featured болгох'}
                    >
                      ★
                    </button>
                  </td>
                  <td>
                    <div className={ADMIN_ACTIONS_CLS}>
                      <Link to={`/admin/events/${e.id}`} className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}>Засах</Link>
                      <button type="button" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`} onClick={() => onDelete(e.id, e.title)}>Устгах</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
