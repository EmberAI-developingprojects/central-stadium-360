import { useEffect, useRef, useState, type ReactNode } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { getHomeContent, updateHomeContent } from "../../data/store";
import { api } from "../../lib/api";
import type {
  HeroImage,
  HomeContent,
  MemberItem,
  NewsItem,
  Partner,
  RoadmapItem,
} from "../../data/store";
import {
  ADMIN_ACTIONS_CLS,
  ADMIN_BADGE_CLS,
  ADMIN_BADGE_PAID_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_CARD_CLS,
  ADMIN_CHECKBOX_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FORM_ROW_CLS,
  ADMIN_IMAGE_PREVIEW_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABS_CLS,
} from "../_adminStyles";

type SectionKey = "news" | "partners" | "roadmap" | "members" | "hero";

const TABS: { key: SectionKey; label: string }[] = [
  { key: "hero", label: "Hero зураг" },
  { key: "news", label: "Мэдээ" },
  { key: "partners", label: "Хамтрагч" },
  { key: "roadmap", label: "Түүхэн замнал" },
  { key: "members", label: "Үйлчилгээ" },
];

const ICON_KEYS = [
  "music",
  "doc",
  "news",
  "chat",
  "stream",
  "stadium",
] as const;

const NEW_ITEM: {
  news: () => NewsItem;
  partners: () => Partner;
  roadmap: () => RoadmapItem;
  members: () => MemberItem;
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
  }),
  partners: () => ({
    id: "partner-" + Math.random().toString(36).slice(2, 7),
    image: "",
    alt: "Партнёр байгууллага",
  }),
  roadmap: () => ({
    id: "m" + Math.random().toString(36).slice(2, 6),
    year: "",
    title: "",
    position: "top",
  }),
  members: () => ({
    id: "svc-" + Math.random().toString(36).slice(2, 7),
    title: "",
    desc: "",
    iconKey: "music",
    href: "#",
    badge: "",
  }),
};

export default function Content() {
  const [tab, setTab] = useState<SectionKey>("news");
  const [content, setContent] = useState<HomeContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    getHomeContent().then(setContent);
  }, []);

  if (!content) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  const section = tab === "hero" ? [] : (content[tab] || []);

  const updateSectionNews = (next: NewsItem[]) =>
    setContent({ ...content, news: next });
  const updateSectionPartners = (next: Partner[]) =>
    setContent({ ...content, partners: next });
  const updateSectionRoadmap = (next: RoadmapItem[]) =>
    setContent({ ...content, roadmap: next });
  const updateSectionMembers = (next: MemberItem[]) =>
    setContent({ ...content, members: next });
  const updateHeroTile = (slot: string, patch: Partial<HeroImage>) =>
    setContent({
      ...content,
      hero: content.hero.map((h) => (h.slot === slot ? { ...h, ...patch } : h)),
    });

  const removeItem = (id: string) => {
    if (tab === "news")
      updateSectionNews(content.news.filter((it) => it.id !== id));
    else if (tab === "partners")
      updateSectionPartners(content.partners.filter((it) => it.id !== id));
    else if (tab === "roadmap")
      updateSectionRoadmap(content.roadmap.filter((it) => it.id !== id));
    else if (tab === "members")
      updateSectionMembers(content.members.filter((it) => it.id !== id));
  };

  const updateNews = (id: string, patch: Partial<NewsItem>) =>
    updateSectionNews(
      content.news.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  const updatePartner = (id: string, patch: Partial<Partner>) =>
    updateSectionPartners(
      content.partners.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  const updateRoadmap = (id: string, patch: Partial<RoadmapItem>) =>
    updateSectionRoadmap(
      content.roadmap.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  const updateMember = (id: string, patch: Partial<MemberItem>) =>
    updateSectionMembers(
      content.members.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );

  const addItem = () => {
    if (tab === "news") updateSectionNews([...content.news, NEW_ITEM.news()]);
    else if (tab === "partners")
      updateSectionPartners([...content.partners, NEW_ITEM.partners()]);
    else if (tab === "roadmap")
      updateSectionRoadmap([...content.roadmap, NEW_ITEM.roadmap()]);
    else if (tab === "members")
      updateSectionMembers([...content.members, NEW_ITEM.members()]);
  };

  const onSave = async () => {
    setBusy(true);
    try {
      if (tab === "hero") {
        await updateHomeContent({ hero: content.hero });
      } else {
        await updateHomeContent({ [tab]: content[tab] });
      }
      setSavedAt(Date.now());
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
            Нүүр хуудсанд харагдах мэдээ, хамтрагч, түүхэн замнал, үйлчилгээний
            картууд.
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
          {tab !== "hero" && (
            <button type="button" className={ADMIN_BTN_CLS} onClick={addItem}>
              + Шинэ мөр
            </button>
          )}
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
              {t.key === "hero"
                ? content.hero.length
                : (content[t.key as keyof typeof content] as unknown[])?.length ?? 0}
            </span>
          </button>
        ))}
      </div>

      {tab === "hero" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {content.hero.map((h) => (
            <div key={h.slot} className={ADMIN_CARD_CLS}>
              <HeroRow item={h} onChange={(p) => updateHeroTile(h.slot, p)} />
            </div>
          ))}
        </div>
      ) : section.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Мөр алга</strong>
          «+ Шинэ мөр» товчоор шинээр нэмнэ үү.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tab === "news" &&
            content.news.map((it) => (
              <div key={it.id} className={ADMIN_CARD_CLS}>
                <NewsRow
                  item={it}
                  onChange={(p) => updateNews(it.id, p)}
                  onRemove={() => removeItem(it.id)}
                />
              </div>
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
          {tab === "roadmap" &&
            content.roadmap.map((it) => (
              <div key={it.id} className={ADMIN_CARD_CLS}>
                <RoadmapRow
                  item={it}
                  onChange={(p) => updateRoadmap(it.id, p)}
                  onRemove={() => removeItem(it.id)}
                />
              </div>
            ))}
          {tab === "members" &&
            content.members.map((it) => (
              <div key={it.id} className={ADMIN_CARD_CLS}>
                <MemberRow
                  item={it}
                  onChange={(p) => updateMember(it.id, p)}
                  onRemove={() => removeItem(it.id)}
                />
              </div>
            ))}
        </div>
      )}
    </>
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
      <label className={ADMIN_CHECKBOX_CLS}>
        <input
          type="checkbox"
          checked={!!item.featured}
          onChange={(e) => onChange({ featured: e.target.checked })}
        />
        <span>Featured (онцлох картаар харуулах)</span>
      </label>

      <div className={ADMIN_FIELD_CLS}>
        <label>Мэдээний агуулга</label>
        <TinyEditor
          value={item.body || ""}
          onChange={(html) => onChange({ body: html, blocks: [] })}
        />
      </div>
    </>
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
      apiKey="o8vpo0yqslg0lwjzh8l8lorslz73hhfiy8he10al8wx9wjat"
      value={value}
      onEditorChange={(html) => onChange(html)}
      init={{
        height: 500,
        menubar: "edit insert format table",
        plugins: [
          "anchor", "autolink", "charmap", "codesample", "lists", "link",
          "image", "searchreplace", "table", "visualblocks", "wordcount",
          "checklist", "mediaembed", "formatpainter", "advtable",
          "advcode", "typography", "autocorrect",
        ],
        toolbar:
          "undo redo | blocks | bold italic underline strikethrough | " +
          "alignleft aligncenter alignright | " +
          "bullist numlist checklist | link image | " +
          "formatpainter removeformat | advcode",
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

const HERO_SLOT_LABELS: Record<string, string> = {
  tile1: "Зураг 1 — Том зүүн tile",
  tile2: "Зураг 2 — Баруун дээд (налуу)",
  tile3: "Зураг 3 — Баруун дунд",
  tile4: "Зураг 4 — Баруун доод (налуу)",
};

function HeroRow({
  item,
  onChange,
}: {
  item: HeroImage;
  onChange: (p: Partial<HeroImage>) => void;
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
    onChange({ image_url: res.data.url });
  };

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>
          {HERO_SLOT_LABELS[item.slot] ?? item.slot}
        </strong>
      </div>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Зургийн URL</label>
          <input
            value={item.image_url || ""}
            onChange={(e) => onChange({ image_url: e.target.value })}
            placeholder="https://… эсвэл доороос файл оруулна уу"
          />
        </div>
        <div className={ADMIN_FIELD_CLS}>
          <label>Alt текст</label>
          <input
            value={item.alt || ""}
            onChange={(e) => onChange({ alt: e.target.value })}
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
          {item.image_url && (
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS}`}
              onClick={() => onChange({ image_url: "" })}
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
        {item.image_url && (
          <div
            className={ADMIN_IMAGE_PREVIEW_CLS}
            style={{
              aspectRatio: "4 / 3",
              backgroundImage: `url('${item.image_url}')`,
            }}
          />
        )}
      </div>
    </>
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
  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Зөвхөн зургийн файл сонгоно уу.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert("Зурагны хэмжээ 2MB-аас бага байх ёстой.");
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
          <label>Alt текст</label>
          <input
            value={item.alt || ""}
            onChange={(e) => onChange({ alt: e.target.value })}
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

function RoadmapRow({
  item,
  onChange,
  onRemove,
}: {
  item: RoadmapItem;
  onChange: (p: Partial<RoadmapItem>) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <RowHeader onRemove={onRemove}>
        {item.year || "Шинэ мөр"} — {item.title}
      </RowHeader>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Он</label>
          <input
            value={item.year || ""}
            onChange={(e) => onChange({ year: e.target.value })}
          />
        </div>
        <div className={ADMIN_FIELD_CLS}>
          <label>Байршил</label>
          <select
            value={item.position || "top"}
            onChange={(e) =>
              onChange({ position: e.target.value as "top" | "bot" })
            }
          >
            <option value="top">Дээр</option>
            <option value="bot">Доор</option>
          </select>
        </div>
      </div>
      <div className={ADMIN_FIELD_CLS}>
        <label>Гарчиг</label>
        <input
          value={item.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
    </>
  );
}

function MemberRow({
  item,
  onChange,
  onRemove,
}: {
  item: MemberItem;
  onChange: (p: Partial<MemberItem>) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <RowHeader onRemove={onRemove}>{item.title || "Үйлчилгээ"}</RowHeader>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Гарчиг</label>
          <input
            value={item.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div className={ADMIN_FIELD_CLS}>
          <label>Икон</label>
          <select
            value={item.iconKey || "music"}
            onChange={(e) => onChange({ iconKey: e.target.value })}
          >
            {ICON_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={ADMIN_FIELD_CLS}>
        <label>Тайлбар</label>
        <textarea
          value={item.desc || ""}
          onChange={(e) => onChange({ desc: e.target.value })}
        />
      </div>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Холбоос (href)</label>
          <input
            value={item.href || "#"}
            onChange={(e) => onChange({ href: e.target.value })}
          />
        </div>
        <div className={ADMIN_FIELD_CLS}>
          <label>Badge (заавал биш)</label>
          <input
            value={item.badge || ""}
            onChange={(e) => onChange({ badge: e.target.value })}
            placeholder="Live"
          />
        </div>
      </div>
    </>
  );
}
