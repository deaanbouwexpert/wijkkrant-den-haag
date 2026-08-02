"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { CATEGORIES, catInfo } from "../../lib/categories";
import { ORGANIZATIONS, orgInfo } from "../../lib/organizations";
import { Lock, Clock, Check, Pencil, Trash2, BookOpen, UploadCloud } from "lucide-react";

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [toast, setToast] = useState("");
  const [archive, setArchiveList] = useState([]);
  const [archiveForm, setArchiveForm] = useState({ title: "", year: new Date().getFullYear(), month: 1, lang: "nl" });
  const [archiveFile, setArchiveFile] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("wk_admin_pw") : null;
    if (stored) {
      setPw(stored);
      tryLogin(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  const tryLogin = async (password) => {
    setLoading(true);
    const res = await fetch("/api/admin", { headers: { "x-admin-password": password } });
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts || []);
      setAuthed(true);
      sessionStorage.setItem("wk_admin_pw", password);
      loadArchive();
    } else {
      setPwErr("Onjuist wachtwoord.");
      sessionStorage.removeItem("wk_admin_pw");
    }
    setLoading(false);
  };

  const login = (e) => {
    e.preventDefault();
    setPwErr("");
    tryLogin(pw);
  };

  const reload = async () => {
    const res = await fetch("/api/admin", { headers: { "x-admin-password": pw } });
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts || []);
    }
  };

  const approve = async (id) => {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id, updates: { status: "published" } }),
    });
    showToast("Geplaatst in de wijkkrant.");
    reload();
  };

  const reject = async (id) => {
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    showToast("Bijdrage afgewezen.");
    reload();
  };

  const unpublish = async (id) => {
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    showToast("Verwijderd uit de wijkkrant.");
    reload();
  };

  const loadArchive = async () => {
    const res = await fetch("/api/archive");
    if (res.ok) {
      const data = await res.json();
      setArchiveList(data.archive || []);
    }
  };

  const onArchiveFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      showToast("Alleen PDF-bestanden zijn toegestaan.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setArchiveFile({ name: f.name, dataUrl: reader.result });
    reader.readAsDataURL(f);
  };

  const uploadArchive = async (e) => {
    e.preventDefault();
    if (!archiveFile) {
      showToast("Kies eerst een PDF-bestand.");
      return;
    }
    setArchiveBusy(true);
    const res = await fetch("/api/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ ...archiveForm, file: archiveFile.dataUrl }),
    });
    if (res.ok) {
      showToast("Oude editie toegevoegd aan het archief.");
      setArchiveForm({ title: "", year: new Date().getFullYear(), month: 1, lang: "nl" });
      setArchiveFile(null);
      loadArchive();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Uploaden is niet gelukt.");
    }
    setArchiveBusy(false);
  };

  const deleteArchive = async (id) => {
    await fetch("/api/archive", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    showToast("Verwijderd uit het archief.");
    loadArchive();
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setDraft({ ...p, org: p.org || "" });
  };

  const saveEdit = async () => {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id: editingId, updates: draft }),
    });
    setEditingId(null);
    setDraft(null);
    showToast("Wijzigingen opgeslagen.");
    reload();
  };

  const pending = posts
    .filter((p) => p.status === "pending")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const published = posts
    .filter((p) => p.status === "published")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <Shell active="admin">
      {!authed ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <Lock size={26} style={{ color: "#2f4a42", marginBottom: 8 }} />
          <h2>Redactie</h2>
          <p className="sub">Alleen voor de wijkkrantredacteur.</p>
          <form onSubmit={login}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Wachtwoord" />
            {pwErr && <p className="error-text">{pwErr}</p>}
            <button className="btn btn-full" disabled={loading}>
              {loading ? "Bezig..." : "Inloggen"}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="section-title">
            <Clock size={18} /> Wacht op goedkeuring ({pending.length})
          </div>
          {pending.length === 0 && <p className="hint">Niets om te beoordelen — mooi rustig.</p>}
          {pending.map((p) => (
            <div className="admin-post" key={p.id}>
              {editingId === p.id ? (
                <>
                  <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <select value={draft.org} onChange={(e) => setDraft((d) => ({ ...d, org: e.target.value }))}>
                    <option value="">Geen vereniging</option>
                    {ORGANIZATIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
                  <textarea
                    rows={4}
                    value={draft.text}
                    onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                  />
                  <div className="admin-actions">
                    <button className="btn btn-sm" onClick={saveEdit}>
                      Opslaan
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditingId(null)}>
                      Annuleren
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="tag" style={{ background: catInfo(p.category).color }}>
                    {catInfo(p.category).label}
                  </span>
                  <p className="hint">
                    {p.name} • {orgInfo(p.org)?.label || "Geen vereniging"} • {fmtDate(p.createdAt)}
                    {p.aiPolished ? " • spelling gecontroleerd door AI" : ""}
                  </p>
                  {p.images?.length > 0 && (
                    <div className="admin-thumbs">
                      {p.images.map((s, i) => (
                        <img key={i} src={s} alt="" />
                      ))}
                    </div>
                  )}
                  {p.title && <p style={{ fontWeight: 600, margin: "8px 0 2px" }}>{p.title}</p>}
                  <p style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{p.text}</p>
                  <div className="admin-actions">
                    <button className="btn btn-sm btn-green" onClick={() => approve(p.id)}>
                      <Check size={13} /> Plaatsen
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => startEdit(p)}>
                      <Pencil size={13} /> Bewerken
                    </button>
                    <button className="btn btn-sm btn-red" onClick={() => reject(p.id)}>
                      <Trash2 size={13} /> Afwijzen
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="section-title" style={{ marginTop: 32 }}>
            Al geplaatst ({published.length})
          </div>
          {published.length === 0 && <p className="hint">Nog niets geplaatst.</p>}
          {published.map((p) => (
            <div className="published-row" key={p.id}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span className="tag" style={{ background: catInfo(p.category).color }}>
                  {catInfo(p.category).label}
                </span>
                <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title || p.text.slice(0, 40)}
                </span>
              </span>
              <button
                onClick={() => unpublish(p.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="section-title" style={{ marginTop: 32 }}>
            <BookOpen size={18} /> Archief — oude edities ({archive.length})
          </div>
          <form className="admin-post" onSubmit={uploadArchive}>
            <label className="field-label">Titel</label>
            <input
              value={archiveForm.title}
              onChange={(e) => setArchiveForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Bijv. Nieuwsbrief wijk Den Haag"
            />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="field-label">Maand</label>
                <select
                  value={archiveForm.month}
                  onChange={(e) => setArchiveForm((f) => ({ ...f, month: Number(e.target.value) }))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label">Jaar</label>
                <input
                  type="text"
                  value={archiveForm.year}
                  onChange={(e) => setArchiveForm((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label">Taal</label>
                <select
                  value={archiveForm.lang}
                  onChange={(e) => setArchiveForm((f) => ({ ...f, lang: e.target.value }))}
                >
                  <option value="nl">Nederlands</option>
                  <option value="en">Engels</option>
                </select>
              </div>
            </div>
            <label className="field-label">PDF-bestand</label>
            <input type="file" accept="application/pdf" onChange={onArchiveFile} style={{ marginBottom: 16 }} />
            {archiveFile && <p className="hint" style={{ marginTop: -10 }}>Gekozen: {archiveFile.name}</p>}
            <button className="btn btn-sm" disabled={archiveBusy}>
              <UploadCloud size={13} /> {archiveBusy ? "Bezig..." : "Toevoegen aan archief"}
            </button>
          </form>
          {archive.map((a) => (
            <div className="published-row" key={a.id}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span className="tag" style={{ background: "#b9812f" }}>
                  {(a.lang || "nl").toUpperCase()}
                </span>
                <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {MONTHS[a.month - 1]} {a.year} — {a.title}
                </span>
              </span>
              <button
                onClick={() => deleteArchive(a.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </Shell>
  );
}
