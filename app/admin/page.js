"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { useSettings, DEFAULTS } from "../../components/SettingsProvider";
import { CATEGORIES, catInfo } from "../../lib/categories";
import { ORGANIZATIONS, orgInfo } from "../../lib/organizations";
import { Lock, Clock, Check, Pencil, Trash2, BookOpen, UploadCloud, ImagePlus, Palette, X, FileText } from "lucide-react";

function resizeImage(file, maxWidth = 1400, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Kon afbeelding niet laden"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Kon bestand niet lezen"));
    reader.readAsDataURL(file);
  });
}

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
  const [pdfPostForm, setPdfPostForm] = useState({
    category: "agenda",
    org: "",
    title: "",
    text: "",
    pdfName: "",
  });
  const [pdfPostFile, setPdfPostFile] = useState(null);
  const [pdfPostBusy, setPdfPostBusy] = useState(false);
  const [settings, , refreshSettings] = useSettings();
  const [settingsBusy, setSettingsBusy] = useState(false);

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
    setArchiveFile(f);
  };

  const uploadArchive = async (e) => {
    e.preventDefault();
    if (!archiveFile) {
      showToast("Kies eerst een PDF-bestand.");
      return;
    }
    setArchiveBusy(true);
    try {
      // Stap 1: vraag een directe upload-link aan (bestand gaat hierdoor niet via onze eigen server).
      const initRes = await fetch("/api/archive/init", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ year: archiveForm.year, month: archiveForm.month, lang: archiveForm.lang }),
      });
      if (!initRes.ok) {
        const d = await initRes.json().catch(() => ({}));
        throw new Error(d.error || "Kon geen upload-link aanmaken.");
      }
      const { signedUrl, publicUrl } = await initRes.json();

      // Stap 2: upload het PDF-bestand rechtstreeks naar de opslag.
      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: archiveFile,
      });
      if (!putRes.ok) throw new Error("Uploaden naar de opslag is niet gelukt.");

      // Stap 3: bewaar de titel/maand/jaar erbij.
      const confirmRes = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ ...archiveForm, publicUrl }),
      });
      if (!confirmRes.ok) {
        const d = await confirmRes.json().catch(() => ({}));
        throw new Error(d.error || "Opslaan van de gegevens is niet gelukt.");
      }

      showToast("Oude editie toegevoegd aan het archief.");
      setArchiveForm({ title: "", year: new Date().getFullYear(), month: 1, lang: "nl" });
      setArchiveFile(null);
      loadArchive();
    } catch (err) {
      showToast(err.message || "Uploaden is niet gelukt.");
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

  const onPdfPostFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      showToast("Alleen PDF-bestanden zijn toegestaan.");
      return;
    }
    setPdfPostFile(f);
  };

  const submitPdfPost = async (e) => {
    e.preventDefault();
    if (!pdfPostFile) {
      showToast("Kies eerst een PDF-bestand.");
      return;
    }
    if (!pdfPostForm.text.trim()) {
      showToast("Schrijf er ook een stukje tekst bij.");
      return;
    }
    setPdfPostBusy(true);
    try {
      // Stap 1: vraag een directe upload-link aan (bestand gaat hierdoor niet via onze eigen server).
      const initRes = await fetch("/api/admin/pdf-init", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
      });
      if (!initRes.ok) {
        const d = await initRes.json().catch(() => ({}));
        throw new Error(d.error || "Kon geen upload-link aanmaken.");
      }
      const { signedUrl, publicUrl } = await initRes.json();

      // Stap 2: upload het PDF-bestand rechtstreeks naar de opslag.
      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: pdfPostFile,
      });
      if (!putRes.ok) throw new Error("Uploaden naar de opslag is niet gelukt.");

      // Stap 3: maak het bericht aan — dit verschijnt direct in de wijkkrant.
      const confirmRes = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ ...pdfPostForm, pdfUrl: publicUrl }),
      });
      if (!confirmRes.ok) {
        const d = await confirmRes.json().catch(() => ({}));
        throw new Error(d.error || "Plaatsen is niet gelukt.");
      }

      showToast("Aankondiging met PDF geplaatst in de wijkkrant.");
      setPdfPostForm({ category: "agenda", org: "", title: "", text: "", pdfName: "" });
      setPdfPostFile(null);
      reload();
    } catch (err) {
      showToast(err.message || "Plaatsen is niet gelukt.");
    }
    setPdfPostBusy(false);
  };

  const saveSettings = async (updates) => {
    setSettingsBusy(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      showToast("Uiterlijk opgeslagen.");
      refreshSettings();
    } else {
      showToast("Opslaan van het uiterlijk is niet gelukt.");
    }
    setSettingsBusy(false);
  };

  const addHeaderPhotos = async (files) => {
    const list = Array.from(files).slice(0, 5 - (settings.headerImages?.length || 0));
    if (!list.length) return;
    setSettingsBusy(true);
    try {
      const resized = await Promise.all(list.map((f) => resizeImage(f)));
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: resized }),
      });
      const upData = await up.json();
      const urls = upData.urls || [];
      await saveSettings({ headerImages: [...(settings.headerImages || []), ...urls] });
    } catch {
      showToast("Foto('s) uploaden is niet gelukt.");
      setSettingsBusy(false);
    }
  };

  const removeHeaderPhoto = (url) => {
    saveSettings({ headerImages: (settings.headerImages || []).filter((u) => u !== url) });
  };

  const uploadPageBackgroundImage = async (file) => {
    setSettingsBusy(true);
    try {
      const resized = await resizeImage(file, 1800, 0.75);
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [resized] }),
      });
      const upData = await up.json();
      await saveSettings({ pageBackgroundImage: upData.urls?.[0] || null });
    } catch {
      showToast("Achtergrondfoto uploaden is niet gelukt.");
      setSettingsBusy(false);
    }
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
                  {p.pdfUrl && (
                    <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="card-pdf-link" style={{ marginBottom: 8 }}>
                      <FileText size={14} /> {p.pdfName || "Bekijk PDF-bijlage"}
                    </a>
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
            <FileText size={18} /> Aankondiging met PDF plaatsen
          </div>
          <p className="hint" style={{ marginTop: -6, marginBottom: 10 }}>
            Handig voor programma-overzichten zoals de Firesides-flyer. Dit verschijnt direct in de wijkkrant,
            zonder tussenstap.
          </p>
          <form className="admin-post" onSubmit={submitPdfPost}>
            <label className="field-label">Categorie</label>
            <select
              value={pdfPostForm.category}
              onChange={(e) => setPdfPostForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="field-label">Vereniging (optioneel)</label>
            <select value={pdfPostForm.org} onChange={(e) => setPdfPostForm((f) => ({ ...f, org: e.target.value }))}>
              <option value="">Geen vereniging</option>
              {ORGANIZATIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="field-label">Titel (optioneel)</label>
            <input
              value={pdfPostForm.title}
              onChange={(e) => setPdfPostForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Bijv. Summer Firesides 2026"
            />
            <label className="field-label">Tekst</label>
            <textarea
              rows={4}
              value={pdfPostForm.text}
              onChange={(e) => setPdfPostForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="Korte aankondiging — het volledige programma staat in de PDF."
            />
            <label className="field-label">Tekst op de PDF-knop (optioneel)</label>
            <input
              value={pdfPostForm.pdfName}
              onChange={(e) => setPdfPostForm((f) => ({ ...f, pdfName: e.target.value }))}
              placeholder="Bijv. Bekijk het volledige programma"
            />
            <label className="field-label">PDF-bestand</label>
            <input type="file" accept="application/pdf" onChange={onPdfPostFile} style={{ marginBottom: 16 }} />
            {pdfPostFile && <p className="hint" style={{ marginTop: -10 }}>Gekozen: {pdfPostFile.name}</p>}
            <button className="btn btn-sm" disabled={pdfPostBusy}>
              <UploadCloud size={13} /> {pdfPostBusy ? "Bezig..." : "Plaatsen in de wijkkrant"}
            </button>
          </form>

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

          <div className="section-title" style={{ marginTop: 32 }}>
            <Palette size={18} /> Website-uiterlijk
          </div>
          <div className="admin-post">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={settingsBusy}
                onClick={() => {
                  if (confirm("Alle uiterlijk-instellingen terugzetten naar de standaard? Dit kan niet ongedaan worden gemaakt.")) {
                    saveSettings(DEFAULTS);
                  }
                }}
              >
                <X size={13} /> Terug naar standaard
              </button>
            </div>
            <label className="field-label">Foto('s) bovenin (bijv. de tempel, of iets feestelijks)</label>
            <p className="hint" style={{ marginTop: -4 }}>
              1 foto vult de hele header. Vanaf 2 foto's krijgt de header meer ruimte en verschijnen ze als een
              leuk fotorijtje.
            </p>
            <div className="thumb-row" style={{ marginTop: 10 }}>
              {(settings.headerImages || []).map((src) => (
                <div className="thumb" key={src}>
                  <img src={src} alt="" />
                  <button type="button" onClick={() => removeHeaderPhoto(src)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {(settings.headerImages || []).length < 5 && (
                <label className="thumb-add" style={{ cursor: settingsBusy ? "wait" : "pointer" }}>
                  <ImagePlus size={16} />
                  Toevoegen
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    disabled={settingsBusy}
                    onChange={(e) => e.target.files && addHeaderPhotos(e.target.files)}
                  />
                </label>
              )}
            </div>

            <div style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
              <div>
                <label className="field-label">Achtergrondkleur wijkkrant</label>
                <input
                  type="color"
                  value={settings.pageBackgroundColor || "#f5efe6"}
                  onChange={(e) => saveSettings({ pageBackgroundColor: e.target.value })}
                  style={{ width: 60, height: 36, border: "none", background: "none", cursor: "pointer" }}
                />
              </div>
              <div>
                <label className="field-label">Achtergrondkleur redactiepagina</label>
                <input
                  type="color"
                  value={settings.adminBackgroundColor || "#e7edf3"}
                  onChange={(e) => saveSettings({ adminBackgroundColor: e.target.value })}
                  style={{ width: 60, height: 36, border: "none", background: "none", cursor: "pointer" }}
                />
              </div>
            </div>

            <label className="field-label" style={{ marginTop: 20, display: "block" }}>
              Achtergrondfoto wijkkrant (optioneel, i.p.v. een kleur)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadPageBackgroundImage(e.target.files[0])}
              />
              {settings.pageBackgroundImage && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => saveSettings({ pageBackgroundImage: null })}
                >
                  <X size={12} /> Achtergrondfoto verwijderen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </Shell>
  );
}
