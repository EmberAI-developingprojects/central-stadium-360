import { useEffect, useRef, useState, type ReactNode } from "react";
import { Editor } from "@tinymce/tinymce-react";
import "../lib/tinymce-setup";
import { getHomeContent, updateHomeContent } from "../../data/store";
import { api } from "../../lib/api";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import type {
  HomeContent,
  NewsItem,
  Partner,
} from "../../data/store";
import {
  ADMIN_ACTIONS_CLS,
  ADMIN_BADGE_CLS,
  ADMIN_BADGE_FEATURED_CLS,
  ADMIN_BADGE_PAID_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_CARD_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FORM_ROW_CLS,
  ADMIN_IMAGE_PREVIEW_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABS_CLS,
} from "../_adminStyles";

type SectionKey = "news" | "partners";

const TABS: { key: SectionKey; label: string }[] = [
  { key: "news", label: "Мэдээ" },
  { key: "partners", label: "Хамтрагч" },
];

const NEW_ITEM: {
  news: () => NewsItem;
  partners: () => Partner;
} = {
  news: () => ({
    id: "news-" + Math.random().toString(36).slice(2, 7),
    label: "Шинэ",
    title: "",
    body: "",
    image: "",
    featured: false,
    blocks: [],
    createdAt: new Date().toISOString(),
    sortOrder: 0,
    labelEn: "",
    titleEn: "",
    bodyEn: "",
  }),
  partners: () => ({
    id: "partner-" + Math.random().toString(36).slice(2, 7),
    image: "",
    alt: "Партнёр байгууллага",
  }),
};

export default function Content() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<SectionKey>("news");
  const [content, setContent] = useState<HomeContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [draftNewsIds, setDraftNewsIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getHomeContent().then(setContent);
  }, []);

  if (!content) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  const section = content[tab] || [];

  const updateSectionNews = (next: NewsItem[]) =>
    setContent({ ...content, news: next });
  const updateSectionPartners = (next: Partner[]) =>
    setContent({ ...content, partners: next });

  const removeItem = async (id: string) => {
    if (tab === "news") {
      const target = content.news.find((it) => it.id === id);
      const title = target?.title?.trim() || "Гарчиггүй мэдээ";
      const ok = await confirm({
        title: "Мэдээг устгах уу?",
        message: (
          <>
            <strong className="font-semibold text-zinc-900">«{title}»</strong>{" "}
            устгагдана. Энэ үйлдлийг буцаах боломжгүй.
          </>
        ),
        confirmLabel: "Устгах",
        cancelLabel: "Болих",
        variant: "danger",
      });
      if (!ok) return;
      const prev = content;
      const next = content.news.filter((it) => it.id !== id);
      updateSectionNews(next);
      try {
        await updateHomeContent({ news: next });
        setSavedAt(Date.now());
        toast.success("Мэдээ устгагдлаа.");
      } catch (e) {
        setContent(prev);
        toast.error((e as Error).message || "Устгах боломжгүй.");
      }
    } else if (tab === "partners") {
      const target = content.partners.find((it) => it.id === id);
      const label = target?.alt?.trim() || "Хамтрагч";
      const ok = await confirm({
        title: "Хамтрагчийг устгах уу?",
        message: (
          <>
            <strong className="font-semibold text-zinc-900">«{label}»</strong>{" "}
            устгагдана. Энэ үйлдлийг буцаах боломжгүй.
          </>
        ),
        confirmLabel: "Устгах",
        cancelLabel: "Болих",
        variant: "danger",
      });
      if (!ok) return;
      const prev = content;
      const next = content.partners.filter((it) => it.id !== id);
      updateSectionPartners(next);
      try {
        await updateHomeContent({ partners: next });
        setSavedAt(Date.now());
        toast.success("Хамтрагч устгагдлаа.");
      } catch (e) {
        setContent(prev);
        toast.error((e as Error).message || "Устгах боломжгүй.");
      }
    }
  };

  const updateNews = (id: string, patch: Partial<NewsItem>) =>
    updateSectionNews(
      content.news.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  const updatePartner = (id: string, patch: Partial<Partner>) =>
    updateSectionPartners(
      content.partners.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );

  const setNewsFeatured = async (id: string) => {
    const next = content.news.map((it) => ({
      ...it,
      featured: it.id === id,
    }));
    updateSectionNews(next);
    try {
      await updateHomeContent({ news: next });
      setSavedAt(Date.now());
      toast.success("Онцлох мэдээ шинэчлэгдлээ.");
    } catch (e) {
      updateSectionNews(content.news);
      toast.error((e as Error).message || "Хадгалах боломжгүй.");
    }
  };

  const addItem = () => {
    if (tab === "news") {
      const next = NEW_ITEM.news();
      updateSectionNews([...content.news, next]);
      setEditingNewsId(next.id);
      setDraftNewsIds((prev) => {
        const n = new Set(prev);
        n.add(next.id);
        return n;
      });
    } else if (tab === "partners")
      updateSectionPartners([...content.partners, NEW_ITEM.partners()]);
  };

  const clearDraftId = (id: string) => {
    setDraftNewsIds((prev) => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  };

  const onSave = async () => {
    setBusy(true);
    try {
      await updateHomeContent({ [tab]: content[tab] });
      setSavedAt(Date.now());
      toast.success("Контент хадгалагдлаа.");
    } catch (e) {
      toast.error((e as Error).message || "Хадгалах боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Контент засварлагч</h2>
          <p>
            Нүүр хуудсанд харагдах мэдээ, хамтрагчийн картууд.
          </p>
        </div>
        <div className={ADMIN_ACTIONS_CLS}>
          {savedAt > 0 && Date.now() - savedAt < 4000 && (
            <span
              className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_PAID_CLS}`}
              style={{ alignSelf: "center" }}
            >
              Хадгалагдсан
            </span>
          )}
          <button type="button" className={ADMIN_BTN_CLS} onClick={addItem}>
            + Шинэ мөр
          </button>
          <button
            type="button"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
            onClick={onSave}
            disabled={busy}
          >
            {busy ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>

      <div className={ADMIN_TABS_CLS}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "is-active" : undefined}
            onClick={() => setTab(t.key)}
          >
            {t.label}{" "}
            <span style={{ color: "#64748b", marginLeft: 4 }}>
              {(content[t.key] as unknown[])?.length ?? 0}
            </span>
          </button>
        ))}
      </div>

      {section.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Мөр алга</strong>
          «+ Шинэ мөр» товчоор шинээр нэмнэ үү.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tab === "news" &&
            content.news.map((it) => (
              <NewsListItem
                key={it.id}
                item={it}
                onEdit={() => setEditingNewsId(it.id)}
                onRemove={() => removeItem(it.id)}
                onFeature={() => setNewsFeatured(it.id)}
              />
            ))}
          {tab === "partners" &&
            content.partners.map((it) => (
              <div key={it.id} className={ADMIN_CARD_CLS}>
                <PartnerRow
                  item={it}
                  onChange={(p) => updatePartner(it.id, p)}
                  onRemove={() => removeItem(it.id)}
                />
              </div>
            ))}
        </div>
      )}

      {editingNewsId &&
        (() => {
          const editing = content.news.find((n) => n.id === editingNewsId);
          if (!editing) return null;
          return (
            <NewsEditModal
              item={editing}
              busy={busy}
              onChange={(p) => updateNews(editing.id, p)}
              onRemove={() => {
                clearDraftId(editing.id);
                removeItem(editing.id);
                setEditingNewsId(null);
              }}
              onSave={async (latest) => {
                const next = content.news.map((n) =>
                  n.id === latest.id ? latest : n,
                );
                setBusy(true);
                try {
                  await updateHomeContent({ news: next });
                  setContent({ ...content, news: next });
                  setSavedAt(Date.now());
                  toast.success("Мэдээ хадгалагдлаа.");
                  clearDraftId(latest.id);
                  setEditingNewsId(null);
                } catch (e) {
                  toast.error(
                    (e as Error).message || "Хадгалах боломжгүй.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
              onClose={() => {
                if (draftNewsIds.has(editing.id)) {
                  updateSectionNews(
                    content.news.filter((n) => n.id !== editing.id),
                  );
                  clearDraftId(editing.id);
                }
                setEditingNewsId(null);
              }}
            />
          );
        })()}
    </>
  );
}

function NewsListItem({
  item,
  onEdit,
  onRemove,
  onFeature,
}: {
  item: NewsItem;
  onEdit: () => void;
  onRemove: () => void;
  onFeature: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-3 pr-4 bg-white border border-[#ececef] rounded-xl hover:border-zinc-300 transition-colors">
      <div className="w-16 h-12 rounded-md bg-zinc-100 grid place-items-center text-zinc-400 overflow-hidden flex-shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
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
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {item.label && (
            <span className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-zinc-500">
              {item.label}
            </span>
          )}
          {item.featured && (
            <span className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_FEATURED_CLS}`}>
              Онцлох
            </span>
          )}
        </div>
        <div className="text-[14px] font-semibold text-zinc-900 truncate">
          {item.title || "(Гарчиггүй мэдээ)"}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onFeature}
          disabled={!!item.featured}
          aria-pressed={!!item.featured}
          title={
            item.featured
              ? "Энэ мэдээ нүүр хуудсанд онцлох болгож харагдаж байна"
              : "Энэ мэдээг нүүр хуудсанд онцлох болгох"
          }
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${
            item.featured
              ? "!bg-amber-50 !text-amber-700 !border-amber-200 !cursor-default"
              : ""
          } inline-flex items-center gap-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={item.featured ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 15.1 8.6 22 9.5 17 14.4 18.2 21.3 12 18 5.8 21.3 7 14.4 2 9.5 8.9 8.6 12 2" />
          </svg>
          {item.featured ? "Онцолсон" : "Онцлох"}
        </button>
        <button
          type="button"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
          onClick={onEdit}
        >
          Засах
        </button>
        <button
          type="button"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
          onClick={onRemove}
        >
          Устгах
        </button>
      </div>
    </div>
  );
}

function NewsEditModal({
  item,
  busy,
  onChange,
  onRemove,
  onSave,
  onClose,
}: {
  item: NewsItem;
  busy: boolean;
  onChange: (p: Partial<NewsItem>) => void;
  onRemove: () => void;
  onSave: (item: NewsItem) => Promise<void> | void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<NewsItem>(item);

  useEffect(() => {
    setDraft(item);
  }, [item.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, busy]);

  const patch = (p: Partial<NewsItem>) => {
    setDraft((d) => ({ ...d, ...p }));
    onChange(p);
  };

  return (
    <div
      className="fixed inset-0 z-[300] grid place-items-center px-4 py-6 bg-[rgba(15,23,42,0.55)] backdrop-blur-sm"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Мэдээ засварлах"
    >
      <div
        className="relative w-full max-w-[920px] max-h-[92vh] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-[#ececef]">
          <div className="min-w-0">
            <h3 className="m-0 text-[16px] font-semibold text-zinc-900 tracking-[-0.01em] truncate">
              {draft.title || "Шинэ мэдээ"}
            </h3>
            <p className="m-0 mt-0.5 text-[12.5px] text-zinc-500">
              Засвараа дуусгаад "Хадгалах" товчийг дарна уу.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            disabled={busy}
            className="grid place-items-center w-8 h-8 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors flex-shrink-0 disabled:opacity-50"
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

        <div className="flex-1 overflow-y-auto p-6">
          <NewsRow item={draft} onChange={patch} onRemove={onRemove} />
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-[#ececef] bg-[#fafafa]">
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
            disabled={busy}
          >
            {busy ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RowHeader({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <strong style={{ fontSize: 13 }}>{children}</strong>
      <button
        type="button"
        className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
        onClick={onRemove}
      >
        Устгах
      </button>
    </div>
  );
}

function NewsRow({
  item,
  onChange,
  onRemove,
}: {
  item: NewsItem;
  onChange: (p: Partial<NewsItem>) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    const res = await api.admin.uploadImage(file);
    setUploading(false);
    if (!res.ok) {
      setError(`Ачаалах боломжгүй: ${res.error}`);
      return;
    }
    onChange({ image: res.data.url });
  };

  return (
    <>
      <RowHeader onRemove={onRemove}>{item.title || "Шинэ мэдээ"}</RowHeader>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Шошго</label>
          <input
            value={item.label || ""}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>
        <div className={ADMIN_FIELD_CLS}>
          <label>Зургийн URL</label>
          <input
            value={item.image || ""}
            onChange={(e) => onChange({ image: e.target.value })}
            placeholder="https://… эсвэл доороос файл оруулна уу"
          />
        </div>
      </div>
      <div className={ADMIN_FIELD_CLS}>
        <label>Зураг</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFile}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className={ADMIN_BTN_CLS}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Ачаалж байна…" : "Зураг оруулах"}
          </button>
          {item.image && (
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS}`}
              onClick={() => onChange({ image: "" })}
              disabled={uploading}
            >
              Зураг арилгах
            </button>
          )}
        </div>
        {error && (
          <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
            {error}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
          JPG / PNG / WEBP / GIF, дээд тал нь 5 MB.
        </div>
        {item.image && (
          <div
            className={ADMIN_IMAGE_PREVIEW_CLS}
            style={{
              aspectRatio: "4 / 3",
              backgroundImage: `url('${item.image}')`,
            }}
          />
        )}
      </div>
      <div className={ADMIN_FIELD_CLS}>
        <label>Гарчиг</label>
        <input
          value={item.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div className={ADMIN_FIELD_CLS}>
        <label>Мэдээний агуулга</label>
        <TinyEditor
          value={item.body || ""}
          onChange={(html) => onChange({ body: html, blocks: [] })}
        />
      </div>

      <EnglishSection item={item} onChange={onChange} />
    </>
  );
}

function EnglishSection({
  item,
  onChange,
}: {
  item: NewsItem;
  onChange: (p: Partial<NewsItem>) => void;
}) {
  const hasAny = !!(item.titleEn || item.bodyEn || item.labelEn);
  const [open, setOpen] = useState(hasAny);
  return (
    <div
      style={{
        marginTop: 18,
        borderTop: "1px dashed #ececef",
        paddingTop: 14,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
          color: "#1f2937",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            transition: "transform .15s ease",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
          aria-hidden="true"
        >
          ▸
        </span>
        English хувилбар (заавал биш)
        {hasAny && !open && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#059669",
              background: "#d1fae5",
              borderRadius: 6,
              padding: "2px 8px",
            }}
          >
            Бөглөсөн
          </span>
        )}
      </button>
      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Хэрэв сайтын хэлийг англи болгоход энэ мэдээг англиар харуулахыг
            хүсвэл доорх талбаруудыг өөрөө орчуулж бөглөнө үү. Хоосон үлдээвэл
            монгол хувилбар нь харагдана.
          </div>
          <div className={ADMIN_FORM_ROW_CLS}>
            <div className={ADMIN_FIELD_CLS}>
              <label>Шошго (EN)</label>
              <input
                value={item.labelEn || ""}
                onChange={(e) => onChange({ labelEn: e.target.value })}
                placeholder="e.g. New"
              />
            </div>
            <div className={ADMIN_FIELD_CLS}>
              <label>Гарчиг (EN)</label>
              <input
                value={item.titleEn || ""}
                onChange={(e) => onChange({ titleEn: e.target.value })}
                placeholder="English title"
              />
            </div>
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label>Мэдээний агуулга (EN)</label>
            <TinyEditor
              value={item.bodyEn || ""}
              onChange={(html) => onChange({ bodyEn: html })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TinyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  return (
    <Editor
      licenseKey="gpl"
      value={value}
      onEditorChange={(html) => onChange(html)}
      init={{
        height: 500,
        menubar: "edit insert format table",
        plugins: [
          "anchor", "autolink", "charmap", "code", "codesample", "image",
          "link", "lists", "media", "searchreplace", "table", "visualblocks",
          "wordcount",
        ],
        toolbar:
          "undo redo | blocks | bold italic underline strikethrough | " +
          "alignleft aligncenter alignright | " +
          "bullist numlist | link image media | " +
          "removeformat | code",
        images_upload_handler: async (blobInfo) => {
          const file = new File(
            [blobInfo.blob()],
            blobInfo.filename(),
            { type: blobInfo.blob().type },
          );
          const res = await api.admin.uploadImage(file);
          if (!res.ok) throw new Error(res.error ?? "Upload failed");
          return res.data.url;
        },
        automatic_uploads: true,
        file_picker_types: "image",
        content_style: `
          body {
            font-family: Inter, system-ui, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: #1f2937;
            margin: 16px;
          }
          img { max-width: 100%; height: auto; border-radius: 8px; }
          h1 { font-size: 26px; font-weight: 700; margin-bottom: 12px; }
          h2 { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
          h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
          p  { margin-bottom: 12px; }
          ul, ol { padding-left: 22px; margin-bottom: 12px; }
        `,
        branding: false,
        promotion: false,
        resize: true,
      }}
    />
  );
}

function PartnerRow({
  item,
  onChange,
  onRemove,
}: {
  item: Partner;
  onChange: (p: Partial<Partner>) => void;
  onRemove: () => void;
}) {
  const toast = useToast();
  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Зөвхөн зургийн файл сонгоно уу.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Зурагны хэмжээ 2MB-аас бага байх ёстой.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (dataUrl) onChange({ image: dataUrl });
    };
    reader.readAsDataURL(file);
  };
  return (
    <>
      <RowHeader onRemove={onRemove}>{item.alt || "Хамтрагч"}</RowHeader>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Зургийн URL</label>
          <input
            value={item.image || ""}
            onChange={(e) => onChange({ image: e.target.value })}
            placeholder="https://… эсвэл доороос файл сонгоно уу"
          />
        </div>
        <div className={ADMIN_FIELD_CLS}>
          <label>Зургийн тайлбар</label>
          <input
            value={item.alt || ""}
            onChange={(e) => onChange({ alt: e.target.value })}
            placeholder="Жишээ нь: Партнёр байгууллагын лого"
          />
        </div>
      </div>
      <div className={ADMIN_FIELD_CLS}>
        <label>Зураг оруулах</label>
        <div className="flex items-center gap-2">
          <label className={`${ADMIN_BTN_CLS} cursor-pointer`}>
            Файл сонгох
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onPickFile(e.target.files?.[0] || null);
                e.currentTarget.value = "";
              }}
            />
          </label>
          {item.image && (
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS}`}
              onClick={() => onChange({ image: "" })}
            >
              Зураг устгах
            </button>
          )}
        </div>
      </div>
      {item.image && (
        <div
          className={ADMIN_IMAGE_PREVIEW_CLS}
          style={{
            aspectRatio: "4 / 1",
            backgroundImage: `url('${item.image}')`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </>
  );
}

