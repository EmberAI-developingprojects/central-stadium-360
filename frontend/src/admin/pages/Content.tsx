import { useEffect, useState, type ReactNode } from "react";
import { getHomeContent, updateHomeContent } from "../../data/store";
import type {
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

type SectionKey = "news" | "partners" | "roadmap" | "members";

const TABS: { key: SectionKey; label: string }[] = [
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

  const section = content[tab] || [];

  const updateSectionNews = (next: NewsItem[]) =>
    setContent({ ...content, news: next });
  const updateSectionPartners = (next: Partner[]) =>
    setContent({ ...content, partners: next });
  const updateSectionRoadmap = (next: RoadmapItem[]) =>
    setContent({ ...content, roadmap: next });
  const updateSectionMembers = (next: MemberItem[]) =>
    setContent({ ...content, members: next });

  const removeItem = (id: string) => {
    if (tab === "news")
      updateSectionNews(content.news.filter((it) => it.id !== id));
    else if (tab === "partners")
      updateSectionPartners(content.partners.filter((it) => it.id !== id));
    else if (tab === "roadmap")
      updateSectionRoadmap(content.roadmap.filter((it) => it.id !== id));
    else updateSectionMembers(content.members.filter((it) => it.id !== id));
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
    else updateSectionMembers([...content.members, NEW_ITEM.members()]);
  };

  const onSave = async () => {
    setBusy(true);
    try {
      await updateHomeContent({ [tab]: content[tab] });
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
          <button type="button" className="btn" onClick={addItem}>
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
              {(content[t.key] || []).length}
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
          />
        </div>
      </div>
      <div className={ADMIN_FIELD_CLS}>
        <label>Гарчиг</label>
        <input
          value={item.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div className={ADMIN_FIELD_CLS}>
        <label>Хураангуй</label>
        <textarea
          value={item.body || ""}
          onChange={(e) => onChange({ body: e.target.value })}
        />
      </div>
      <label className={ADMIN_CHECKBOX_CLS}>
        <input
          type="checkbox"
          checked={!!item.featured}
          onChange={(e) => onChange({ featured: e.target.checked })}
        />
        <span>Featured (том картаар харуулах)</span>
      </label>
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
  return (
    <>
      <RowHeader onRemove={onRemove}>{item.alt || "Хамтрагч"}</RowHeader>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Зургийн URL</label>
          <input
            value={item.image || ""}
            onChange={(e) => onChange({ image: e.target.value })}
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
