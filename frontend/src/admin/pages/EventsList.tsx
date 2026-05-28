import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteEvent, listEvents, listOrders, setFeaturedEvent } from '../../data/store';
import type { EventRecord } from '../../data/store';

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

  if (!events) return <div className="admin-empty">Уншиж байна…</div>;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h2>Арга хэмжээ</h2>
          <p>Удахгүй болох тоглолтуудыг үүсгэх, засах, устгах.</p>
        </div>
        <Link to="/admin/events/new" className="btn btn-primary">+ Шинэ арга хэмжээ</Link>
      </div>

      {events.length === 0 ? (
        <div className="admin-empty">
          <strong>Арга хэмжээ алга</strong>
          Эхлэхийн тулд «Шинэ арга хэмжээ» товч дээр дарна уу.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
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
                      className="admin-table-thumb"
                      style={{ backgroundImage: e.image ? `url('${e.image}')` : undefined }}
                      aria-hidden="true"
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {e.title}{' '}
                      {e.featured && <span className="badge badge-featured">Featured</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--admin-muted)' }}>{e.id}</div>
                  </td>
                  <td>{e.date}</td>
                  <td>{money(e.base)}</td>
                  <td>{salesByEvent[e.id] || 0}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => onFeature(e.id)}
                      disabled={e.featured}
                      title={e.featured ? 'Аль хэдийн featured' : 'Featured болгох'}
                    >
                      ★
                    </button>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <Link to={`/admin/events/${e.id}`} className="btn btn-sm">Засах</Link>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(e.id, e.title)}>Устгах</button>
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
