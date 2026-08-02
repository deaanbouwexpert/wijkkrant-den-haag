"use client";
import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import { CATEGORIES, catInfo } from "../lib/categories";
import { orgInfo } from "../lib/organizations";
import { Sparkles, X, Languages } from "lucide-react";

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function PostCard({ post, lang, translating, onImageClick }) {
  const c = catInfo(post.category, lang);
  const org = post.org ? orgInfo(post.org, lang) : null;
  const hasImages = post.images && post.images.length > 0;
  const isSinglePoster = hasImages && post.images.length === 1;
  const t = lang !== "nl" ? post.translations?.[lang] : null;
  const title = t?.title || post.title;
  const text = t?.text || post.text;
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
          <span className="card-date">{fmtDate(post.createdAt)}</span>
        </div>
        {title && (
          <h3 className="card-title" style={{ color: c.color }}>
            {title}
          </h3>
        )}
        {text && <p className="card-text">{text}</p>}
        {lang !== "nl" && translating && !t && (
          <p className="hint" style={{ marginTop: 8 }}>
            Vertalen...
          </p>
        )}
      </div>
    </article>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [lang, setLang] = useState("nl");
  const [translatingIds, setTranslatingIds] = useState({});

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      {!loading && posts.length > 0 && (
        <div className="lang-toggle">
          <button className={`lang-btn ${lang === "nl" ? "active" : ""}`} onClick={() => setLang("nl")}>
            🇳🇱 Nederlands
          </button>
          <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")}>
            <Languages size={13} /> English
          </button>
        </div>
      )}
      {loading ? (
        <p style={{ textAlign: "center", color: "rgba(0,0,0,0.4)" }}>
          {lang === "en" ? "Loading..." : "Even laden..."}
        </p>
      ) : posts.length === 0 ? (
        <div className="empty">
          <Sparkles size={26} style={{ marginBottom: 8, color: "#b9812f" }} />
          <strong>{lang === "en" ? "No stories yet" : "Nog geen verhalen geplaatst"}</strong>
          {lang === "en"
            ? 'Send something in via "Something to share" to be the first!'
            : 'Stuur iets in via "Iets insturen" om de eerste te zijn!'}
        </div>
      ) : (
        <>
          <div className="filters">
            <button className={`pill ${cat === "all" ? "active-all" : ""}`} onClick={() => setCat("all")}>
              {lang === "en" ? "All" : "Alles"}
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
