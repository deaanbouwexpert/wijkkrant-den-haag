"use client";
import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import { useLang } from "../components/LangProvider";
import { CATEGORIES, catInfo } from "../lib/categories";
import { orgInfo } from "../lib/organizations";
import { t, MONTHS } from "../lib/i18n";
import { Sparkles, X, FileText, ChevronDown, ChevronUp, Users } from "lucide-react";

function fmtDateStrLang(dateStr, lang) {
  // "YYYY-MM-DD" handmatig opsplitsen i.p.v. via new Date(), zodat er nooit een
  // tijdzone-verschuiving kan optreden.
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTHS[lang][m - 1]} ${y}`;
}

const TEXT_TRUNCATE_LENGTH = 320;

function truncateText(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function fmtDate(iso, lang) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
}

function PostCard({ post, lang, translating, onImageClick }) {
  const c = catInfo(post.category, lang);
  const org = post.org ? orgInfo(post.org, lang) : null;
  const hasImages = post.images && post.images.length > 0;
  const isSinglePoster = hasImages && post.images.length === 1;
  const tr = lang !== "nl" ? post.translations?.[lang] : null;
  const title = tr?.title || post.title;
  const text = tr?.text || post.text;
  const [expanded, setExpanded] = useState(false);
  const isLong = !!text && text.length > TEXT_TRUNCATE_LENGTH;
  const shownText = isLong && !expanded ? truncateText(text, TEXT_TRUNCATE_LENGTH) : text;
  return (
    <article className="card" style={{ background: c.paper }}>
      {hasImages && (
        <div
          className={`card-photos ${isSinglePoster ? "single" : ""}`}
          style={{ gridTemplateColumns: post.images.length > 1 ? "1fr 1fr" : "1fr" }}
        >
          {post.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              onClick={() => onImageClick(src)}
              style={{ cursor: "zoom-in" }}
            />
          ))}
        </div>
      )}
      <div className={`card-body ${hasImages ? "with-photo" : ""}`}>
        <div className="card-meta">
          <span className="tag" style={{ background: c.color }}>
            {c.label}
          </span>
          {org && <span className="org-tag">{org.label}</span>}
          <span className="card-date">{fmtDate(post.createdAt, lang)}</span>
        </div>
        {title && (
          <h3 className="card-title" style={{ color: c.color }}>
            {title}
          </h3>
        )}
        {text && <p className="card-text">{shownText}</p>}
        {isLong && (
          <button type="button" className="read-more-btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? (
              <>
                <ChevronUp size={14} /> {t(lang, "readLess")}
              </>
            ) : (
              <>
                <ChevronDown size={14} /> {t(lang, "readMore")}
              </>
            )}
          </button>
        )}
        {post.pdfUrl && (
          <a href={post.pdfUrl} target="_blank" rel="noreferrer" className="card-pdf-link">
            <FileText size={15} /> {post.pdfName || t(lang, "postPdfLabel")}
          </a>
        )}
        {lang !== "nl" && translating && !tr && (
          <p className="hint" style={{ marginTop: 8 }}>
            {t(lang, "translating")}
          </p>
        )}
      </div>
    </article>
  );
}

export default function HomePage() {
  const [lang] = useLang();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [translatingIds, setTranslatingIds] = useState({});
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => setRoster(d.roster || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // Zodra Engels gekozen wordt: vertaal (en cache) elk bericht dat nog geen Engelse versie heeft.
  useEffect(() => {
    if (lang === "nl") return;
    posts.forEach((p) => {
      if (p.translations?.[lang] || translatingIds[p.id]) return;
      if (!p.title && !p.text) return;
      setTranslatingIds((prev) => ({ ...prev, [p.id]: true }));
      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, targetLang: lang }),
      })
        .then((r) => r.json())
        .then((data) => {
          setPosts((prev) =>
            prev.map((post) =>
              post.id === p.id
                ? { ...post, translations: { ...(post.translations || {}), [lang]: data } }
                : post
            )
          );
        })
        .catch(() => {})
        .finally(() => {
          setTranslatingIds((prev) => {
            const next = { ...prev };
            delete next[p.id];
            return next;
          });
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, posts.length]);

  const sorted = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const usedCats = CATEGORIES.filter((c) => sorted.some((p) => p.category === c.id));
  const filtered = cat === "all" ? sorted : sorted.filter((p) => p.category === cat);

  return (
    <Shell active="public">
      {roster.length > 0 && (
        <div className="agenda-banner">
          <div className="agenda-block">
            <h3 className="agenda-block-title">
              <Users size={16} /> {t(lang, "rosterHeading")}
            </h3>
            <div className="roster-list">
              {roster.map((r) => (
                <div className="roster-item" key={r.id}>
                  <span className="roster-date">{fmtDateStrLang(r.date, lang)}</span>
                  <span className="roster-who">{r.who}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <p style={{ textAlign: "center", color: "rgba(0,0,0,0.4)" }}>{t(lang, "loading")}</p>
      ) : posts.length === 0 ? (
        <div className="empty">
          <Sparkles size={26} style={{ marginBottom: 8, color: "#b9812f" }} />
          <strong>{t(lang, "emptyTitle")}</strong>
          {t(lang, "emptyBody")}
        </div>
      ) : (
        <>
          <div className="filters">
            <button className={`pill ${cat === "all" ? "active-all" : ""}`} onClick={() => setCat("all")}>
              {t(lang, "all")}
            </button>
            {usedCats.map((c) => {
              const ci = catInfo(c.id, lang);
              return (
                <button
                  key={c.id}
                  className="pill"
                  style={cat === c.id ? { background: ci.color, color: "white", borderColor: ci.color } : {}}
                  onClick={() => setCat(c.id)}
                >
                  {ci.label}
                </button>
              );
            })}
          </div>
          <div className="feed">
            {filtered.map((p) => (
              <PostCard key={p.id} post={p} lang={lang} translating={!!translatingIds[p.id]} onImageClick={setLightbox} />
            ))}
          </div>
        </>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>
            <X size={22} />
          </button>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </Shell>
  );
}
