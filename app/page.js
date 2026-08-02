"use client";
import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import { CATEGORIES, catInfo } from "../lib/categories";
import { orgInfo } from "../lib/organizations";
import { Sparkles, X } from "lucide-react";

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function PostCard({ post, onImageClick }) {
  const c = catInfo(post.category);
  const org = post.org ? orgInfo(post.org) : null;
  const hasImages = post.images && post.images.length > 0;
  const isSinglePoster = hasImages && post.images.length === 1;
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
        {post.title && (
          <h3 className="card-title" style={{ color: c.color }}>
            {post.title}
          </h3>
        )}
        {post.text && <p className="card-text">{post.text}</p>}
      </div>
    </article>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [lightbox, setLightbox] = useState(null);

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

  const sorted = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const usedCats = CATEGORIES.filter((c) => sorted.some((p) => p.category === c.id));
  const filtered = cat === "all" ? sorted : sorted.filter((p) => p.category === cat);

  return (
    <Shell active="public">
      {loading ? (
        <p style={{ textAlign: "center", color: "rgba(0,0,0,0.4)" }}>Even laden...</p>
      ) : posts.length === 0 ? (
        <div className="empty">
          <Sparkles size={26} style={{ marginBottom: 8, color: "#b9812f" }} />
          <strong>Nog geen verhalen geplaatst</strong>
          Stuur iets in via "Iets insturen" om de eerste te zijn!
        </div>
      ) : (
        <>
          <div className="filters">
            <button className={`pill ${cat === "all" ? "active-all" : ""}`} onClick={() => setCat("all")}>
              Alles
            </button>
            {usedCats.map((c) => (
              <button
                key={c.id}
                className="pill"
                style={cat === c.id ? { background: c.color, color: "white", borderColor: c.color } : {}}
                onClick={() => setCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="feed">
            {filtered.map((p) => (
              <PostCard key={p.id} post={p} onImageClick={setLightbox} />
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
