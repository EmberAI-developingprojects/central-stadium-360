import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createEvent,
  deleteEvent,
  getEvent,
  updateEvent,
} from "../../data/store";
import type { EventRecord } from "../../data/store";
import { api } from "../../lib/api";
import {
  ADMIN_ALERT_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_CHECKBOX_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FORM_ACTIONS_CLS,
  ADMIN_FORM_CLS,
  ADMIN_FORM_ROW_CLS,
  ADMIN_IMAGE_PREVIEW_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

const EMPTY: EventRecord = {
  id: "",
  title: "",
  desc: "",
  date: "",
  when: "",
  pill: "Концерт",
  image: "",
  base: 0,
  featured: false,
  start_time: "",
};

function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState<EventRecord>(EMPTY);
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew || !id) return;
    getEvent(id).then((e) => {
      if (!e) {
        setError("Арга хэмжээ олдсонгүй.");
        setLoaded(true);
        return;
      }
      setForm(e);
      setLoaded(true);
    });
  }, [id, isNew]);

  if (!loaded) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  const update = (patch: Partial<EventRecord>) =>
    setForm((f) => ({ ...f, ...patch }));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Гарчиг шаардлагатай.");
      return;
    }
    if (!form.start_time) {
      setError("Огноо, цаг шаардлагатай.");
      return;
    }
    setBusy(true);
    try {
      if (isNew) {
        await createEvent(form);
      } else if (id) {
        await updateEvent(id, form);
      }
      navigate("/admin/events");
    } catch (err) {
      setError((err as Error).message || "Хадгалах боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    if (!window.confirm(`«${form.title}» арга хэмжээг устгах уу?`)) return;
    await deleteEvent(id);
    navigate("/admin/events");
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    const res = await api.admin.uploadImage(file);
    setUploading(false);
    if (!res.ok) {
      setError(`Зураг ачаалах боломжгүй: ${res.error}`);
      return;
    }
    update({ image: res.data.url });
  };

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>{isNew ? "Шинэ арга хэмжээ" : "Засварлах"}</h2>
          <p>360° дамжуулалт зарагдаж буй арга хэмжээний дэлгэрэнгүй.</p>
        </div>
        <Link
          to="/admin/events"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
        >
          ← Жагсаалт руу
        </Link>
      </div>

      {error && (
        <div className={ADMIN_ALERT_CLS} style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      <form className={ADMIN_FORM_CLS} onSubmit={onSubmit}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Гарчиг</label>
          <input
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            required
          />
        </div>

        <div className={ADMIN_FORM_ROW_CLS}>
          <div className={ADMIN_FIELD_CLS}>
            <label>Категори / Pill</label>
            <input
              value={form.pill}
              onChange={(e) => update({ pill: e.target.value })}
            />
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label>Эхлэх огноо, цаг</label>
            <input
              type="datetime-local"
              value={isoToLocalInput(form.start_time)}
              onChange={(e) =>
                update({ start_time: localInputToIso(e.target.value) })
              }
              required
            />
          </div>
        </div>

        <div className={ADMIN_FIELD_CLS}>
          <label>Тайлбар</label>
          <textarea
            value={form.desc}
            onChange={(e) => update({ desc: e.target.value })}
          />
        </div>

        <div className={ADMIN_FORM_ROW_CLS}>
          <div className={ADMIN_FIELD_CLS}>
            <label>Үндсэн үнэ (₮)</label>
            <input
              type="number"
              min="0"
              step="500"
              value={form.base}
              onChange={(e) => update({ base: Number(e.target.value) })}
            />
          </div>
          <div
            className={ADMIN_FIELD_CLS}
            style={{ justifyContent: "flex-end" }}
          >
            <label className={ADMIN_CHECKBOX_CLS}>
              <input
                type="checkbox"
                checked={!!form.featured}
                onChange={(e) => update({ featured: e.target.checked })}
              />
              <span>Featured (Шууд) болгох</span>
            </label>
          </div>
        </div>

        <div className={ADMIN_FIELD_CLS}>
          <label>Зураг</label>
          <input
            value={form.image}
            onChange={(e) => update({ image: e.target.value })}
            placeholder="https://… эсвэл /assets/images/events/…"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <div
            style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}
          >
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
              onClick={onPickFile}
              disabled={uploading || busy}
            >
              {uploading ? "Ачаалж байна…" : "Зураг оруулах"}
            </button>
            {form.image && (
              <button
                type="button"
                className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
                onClick={() => update({ image: "" })}
                disabled={uploading || busy}
              >
                Зураг арилгах
              </button>
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 6,
            }}
          >
            JPG / PNG / WEBP / GIF, дээд тал нь 5 MB.
          </div>
          {form.image && (
            <div
              className={ADMIN_IMAGE_PREVIEW_CLS}
              style={{ backgroundImage: `url('${form.image}')` }}
              aria-hidden="true"
            />
          )}
        </div>

        <div className={ADMIN_FORM_ACTIONS_CLS}>
          <button
            type="submit"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
            disabled={busy}
          >
            {busy ? "Хадгалж байна…" : isNew ? "Үүсгэх" : "Хадгалах"}
          </button>
          <Link
            to="/admin/events"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
          >
            Болих
          </Link>
          {!isNew && (
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS}`}
              onClick={onDelete}
              style={{ marginLeft: "auto" }}
            >
              Устгах
            </button>
          )}
        </div>
      </form>
    </>
  );
}
