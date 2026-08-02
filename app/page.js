"use client";
import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import { CATEGORIES, catInfo } from "../lib/categories";
import { Sparkles } from "lucide-react";

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function PostCard({ post }) {
  const c = catInfo(post.category);
  const hasImages = post.images && post.images.length > 0;
  return (
    <article className="card" style={{ background: c.paper }}>
      {hasImages && (
        <div
          className={`card-photos ${post.images.length === 1 ? "single" : ""}`}
          style={{ gridTemplateColumns: post.images.length > 1 ? "1fr 1fr" : "1fr" }}
        >
          {post.images.slice(0, 3).map((src, i) => (
            <img key={i} src={src} alt="" />
          ))}
          <div className="note">{post.name || "Anoniem"}</div>
        </div>
      )}
      <div className={`card-body ${hasImages ? "with-photo" : ""}`}>
        <div className="card-meta">
          <span className="tag" style={{ background: c.color }}>
            {c.label}
          </span>
          <span className="card-date">{fmtDate(post.createdAt)}</span>
        </div>
        {post.title && (
          <h3 className="card-title" style={{ color: c.color }}>
            {post.title}
          </h3>
        )}
        <p className="card-text">{post.text}</p>
        {!hasImages && (
          <p className="hint" style={{ fontStyle: "italic" }}>
            — {post.name || "Anoniem"}
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

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
