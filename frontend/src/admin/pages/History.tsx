import { useEffect, useRef, useState } from "react";
import {
  listAdminHistoryFigures,
  newHistoryFigure,
  saveHistoryFigures,
} from "../../data/history";
import type { HistoryFigure } from "../../data/history";
import { api } from "../../lib/api";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FORM_ROW_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

const DEFAULT_ROLE = "Захирал";

export default function HistoryAdmin() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<HistoryFigure[] | null>(null);
  const [editing, setEditing] = useState<HistoryFigure | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listAdminHistoryFigures()
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch((e: Error) => {
        if (!alive) return;
        toast.error(e.message || "Уншиж чадсангүй.");
        setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!items) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  const openAdd = () => {
    setEditing({ ...newHistoryFigure(), role: DEFAULT_ROLE });
    setIsNew(true);
  };

  const openEdit = (it: HistoryFigure) => {
    setEditing({ ...it, role: it.role || DEFAULT_ROLE });
    setIsNew(false);
  };

  const closeModal = () => {
    setEditing(null);
    setIsNew(false);
  };

  const saveModal = async (next: HistoryFigure) => {
    setBusy(true);
    try {
      const merged = isNew
        ? [...items, next]
        : items.map((it) => (it.id === next.id ? next : it));
      const saved = await saveHistoryFigures(merged);
      setItems(saved);
      toast.success(isNew ? "Шинэ хүн нэмэгдлээ." : "Хадгалагдлаа.");
      closeModal();
    } catch (e) {
      toast.error((e as Error).message || "Хадгалах боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (it: HistoryFigure) => {
    const ok = await confirm({
      title: `${it.name || "Энэ хүн"}-ийг устгах уу?`,
      message:
        "Устгасны дараа буцаах боломжгүй. Тус хүний бүх мэдээлэл арилна.",
      confirmLabel: "Устгах",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const next = items.filter((x) => x.id !== it.id);
      const saved = await saveHistoryFigures(next);
      setItems(saved);
      toast.success("Устгагдлаа.");
    } catch (e) {
      toast.error((e as Error).message || "Устгах боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Түүхэн хэсэг</h2>
          <p>
            Төв цэнгэлдэх хүрээлэнгийн түүхэн хүмүүсийг (гүйцэтгэх захирал гэх
            мэт) карт хэлбэрээр нэмж засварлана.
          </p>
        </div>
        <button
          type="button"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
          onClick={openAdd}
          disabled={busy}
        >
          + Шинээр нэмэх
        </button>
      </div>

      {items.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Одоогоор түүхэн хүн бүртгээгүй байна</strong>
          Дээрх "Шинээр нэмэх" товчийг дарж эхний картаа үүсгэнэ үү.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it, idx) => (
            <FigureRow
              key={it.id}
              index={idx}
              figure={it}
              busy={busy}
              onEdit={() => openEdit(it)}
              onRemove={() => removeItem(it)}
            />
          ))}
        </div>
      )}

      {editing && (
        <FigureModal
          figure={editing}
          isNew={isNew}
          busy={busy}
          onSave={saveModal}
          onClose={closeModal}
        />
      )}
    </>
  );
}

function FigureRow({
  index,
  figure,
  busy,
  onEdit,
  onRemove,
}: {
  index: number;
  figure: HistoryFigure;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const years = figure.yearStart
    ? `${figure.yearStart}${figure.yearEnd ? ` — ${figure.yearEnd}` : " — одоо"}`
    : "—";
  return (
    <div className="flex items-center gap-4 p-3 pr-4 bg-white border border-[#ececef] rounded-xl hover:border-zinc-300 transition-colors">
      <div className="w-12 h-12 rounded-full bg-zinc-100 grid place-items-center text-zinc-400 text-[11px] font-bold flex-shrink-0 overflow-hidden">
        {figure.image ? (
          <img
            src={figure.image}
            alt={figure.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>#{index + 1}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-semibold text-zinc-900 truncate">
          {figure.name || "(Гарчиггүй)"}
        </div>
        <div className="text-[12.5px] text-zinc-500 truncate">
          {figure.role} · {years}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
          onClick={onEdit}
          disabled={busy}
        >
          Засах
        </button>
        <button
          type="button"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
          onClick={onRemove}
          disabled={busy}
        >
          Устгах
        </button>
      </div>
    </div>
  );
}

function FigureModal({
  figure,
  isNew,
  busy,
  onSave,
  onClose,
}: {
  figure: HistoryFigure;
  isNew: boolean;
  busy: boolean;
  onSave: (next: HistoryFigure) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<HistoryFigure>(figure);

  useEffect(() => {
    setDraft(figure);
  }, [figure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const patch = (p: Partial<HistoryFigure>) =>
    setDraft((d) => ({ ...d, ...p }));

  const canSave = draft.name.trim().length > 0 && !busy;

  return (
    <div
      className="fixed inset-0 z-[300] grid place-items-center px-4 py-8 bg-[rgba(15,23,42,0.55)] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? "Шинэ түүхэн хүн" : "Түүхэн хүн засах"}
    >
      <div
        className="relative w-full max-w-[720px] max-h-[92vh] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-[#ececef]">
          <div>
            <h3 className="m-0 text-[16px] font-semibold text-zinc-900 tracking-[-0.01em]">
              {isNew ? "Шинэ түүхэн хүн нэмэх" : "Түүхэн хүн засах"}
            </h3>
            <p className="m-0 mt-0.5 text-[12.5px] text-zinc-500">
              {isNew
                ? "Доорх талбаруудыг бөглөж хадгална уу."
                : "Засвараа хийгээд хадгалах товчийг дарна уу."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="grid place-items-center w-8 h-8 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <div className={ADMIN_FIELD_CLS}>
            <label>
              Нэр <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Жнь: Дэмбэрэлийн Дамдин"
              autoFocus
            />
          </div>

          <div className={ADMIN_FORM_ROW_CLS}>
            <div className={ADMIN_FIELD_CLS}>
              <label>Эхэлсэн он</label>
              <input
                type="text"
                value={draft.yearStart}
                onChange={(e) => patch({ yearStart: e.target.value })}
                placeholder="1958"
              />
            </div>
            <div className={ADMIN_FIELD_CLS}>
              <label>Дууссан он</label>
              <input
                type="text"
                value={draft.yearEnd}
                onChange={(e) => patch({ yearEnd: e.target.value })}
                placeholder="1965 (өнөөг хүртэл бол хоосон)"
              />
            </div>
          </div>

          <ImageUploadField
            value={draft.image}
            onChange={(url) => patch({ image: url })}
            altName={draft.name}
          />

          <div className={ADMIN_FIELD_CLS}>
            <label>Намтар, дэлгэрэнгүй</label>
            <textarea
              value={draft.bio}
              onChange={(e) => patch({ bio: e.target.value })}
              placeholder="Энэ хүний түүхэн үүрэг, гавьяа, дурсамж…"
              rows={6}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#ececef] bg-[#fafafa]">
          <button
            type="button"
            className={ADMIN_BTN_CLS}
            onClick={onClose}
            disabled={busy}
          >
            Болих
          </button>
          <button
            type="button"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
            onClick={() => onSave(draft)}
            disabled={!canSave}
          >
            {busy ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageUploadField({
  value,
  onChange,
  altName,
}: {
  value: string;
  onChange: (url: string) => void;
  altName: string;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Зөвхөн зургийн файл оруулна уу.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файлын хэмжээ 5MB-аас бага байх ёстой.");
      return;
    }
    setUploading(true);
    const res = await api.admin.uploadImage(file);
    setUploading(false);
    if (!res.ok) {
      toast.error(`Ачаалах боломжгүй: ${res.error}`);
      return;
    }
    onChange(res.data.url);
    toast.success("Зураг ачааллагдлаа.");
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={ADMIN_FIELD_CLS}>
      <label>Зураг</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFileChange}
        className="hidden"
      />

      {value ? (
        <div className="flex items-start gap-4 flex-wrap">
          <img
            src={value}
            alt={altName}
            className="w-[140px] h-[180px] object-cover rounded-lg border border-[#ececef] bg-[#fafafa]"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Ачаалж байна…" : "Зураг солих"}
            </button>
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
              onClick={() => onChange("")}
              disabled={uploading}
            >
              Устгах
            </button>
            <span className="text-[11.5px] text-zinc-500 mt-1">
              JPG, PNG, WEBP, GIF · max 5MB
            </span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative flex flex-col items-center justify-center gap-2 w-full h-[160px] rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            dragOver
              ? "border-zinc-900 bg-zinc-50"
              : "border-[#e4e4e7] bg-[#fafafa] hover:border-zinc-400 hover:bg-zinc-50"
          } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <div className="grid place-items-center w-11 h-11 rounded-full bg-white border border-[#ececef] text-zinc-500">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div className="text-[13px] font-semibold text-zinc-900">
            {uploading ? "Ачаалж байна…" : "Зураг сонгох эсвэл чирж оруулах"}
          </div>
          <div className="text-[11.5px] text-zinc-500">
            JPG, PNG, WEBP, GIF · max 5MB
          </div>
        </div>
      )}
    </div>
  );
}
