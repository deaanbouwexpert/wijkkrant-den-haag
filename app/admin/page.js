"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "../../components/Shell";
import { useSettings, DEFAULTS } from "../../components/SettingsProvider";
import { CATEGORIES, catInfo } from "../../lib/categories";
import { ORGANIZATIONS, orgInfo } from "../../lib/organizations";
import { upcomingTeamWeeks } from "../../lib/rotation";
import { Lock, Clock, Check, Pencil, Trash2, BookOpen, UploadCloud, ImagePlus, Palette, X, FileText, MessageSquarePlus, Download, Users } from "lucide-react";

const MAX_IMAGES = 6;

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

function fmtDateStr(dateStr) {
  // Voor "YYYY-MM-DD"-strings uit een <input type="date">: handmatig opsplitsen
  // i.p.v. via new Date(), zodat er nooit een tijdzone-verschuiving kan optreden.
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editImagesBusy, setEditImagesBusy] = useState(false);
  const editFileRef = useRef(null);
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
  const [agendaDates, setAgendaDatesList] = useState([]);
  const [agendaForm, setAgendaForm] = useState({ title: "", when: "", note: "" });
  const [agendaBusy, setAgendaBusy] = useState(false);
  const [roster, setRosterList] = useState([]);
  const [teams, setTeamsList] = useState([]);
  const [teamForm, setTeamForm] = useState({ name: "", membersText: "" });
  const [teamBusy, setTeamBusy] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [rotation, setRotation] = useState(null);
  const [rotationForm, setRotationForm] = useState({ anchorDate: "", orderText: "" });
  const [rotationBusy, setRotationBusy] = useState(false);
  const [feedback, setFeedbackList] = useState([]);
  const [settings, setSettingsLocal, refreshSettings] = useSettings();
  const [settingsBusy, setSettingsBusy] = useState(false);
  const colorSaveTimer = useRef(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("wk_admin_pw") : null;
    if (stored) {
      setPw(stored);
      tryLogin(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Als er nog geen rotatie is ingesteld: alvast een sensibele standaardwaarde
  // invullen op basis van de bestaande teams, zodat het formulier niet leeg is.
  useEffect(() => {
    if (rotation === null && teams.length > 0 && !rotationForm.orderText) {
      setRotationForm({ anchorDate: "2026-01-12", orderText: teams.map((t) => t.name).join("\n") });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, rotation]);

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
      loadAgenda();
      loadRoster();
      loadFeedback();
      loadTeams();
      loadRotation();
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
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id, updates: { status: "published" } }),
    });
    if (res.ok) {
      showToast("Geplaatst in de wijkkrant.");
    } else {
      showToast("Plaatsen is niet gelukt — probeer het nog eens.");
    }
    reload();
  };

  const reject = async (id) => {
    const res = await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showToast("Bijdrage afgewezen.");
    } else {
      showToast("Afwijzen is niet gelukt — probeer het nog eens.");
    }
    reload();
  };

  const unpublish = async (id) => {
    const res = await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showToast("Verwijderd uit de wijkkrant.");
    } else {
      showToast("Verwijderen is niet gelukt — probeer het nog eens.");
    }
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
    const res = await fetch("/api/archive", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showToast("Verwijderd uit het archief.");
    } else {
      showToast("Verwijderen is niet gelukt — probeer het nog eens.");
    }
    loadArchive();
  };

  const loadAgenda = async () => {
    const res = await fetch("/api/agenda");
    if (res.ok) {
      const data = await res.json();
      setAgendaDatesList(data.dates || []);
    }
  };

  const addAgendaDate = async (e) => {
    e.preventDefault();
    if (!agendaForm.title.trim() || !agendaForm.when.trim()) {
      showToast("Vul een titel en 'wanneer' in.");
      return;
    }
    setAgendaBusy(true);
    const res = await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify(agendaForm),
    });
    if (res.ok) {
      showToast("Toegevoegd aan de belangrijke data.");
      setAgendaForm({ title: "", when: "", note: "" });
      loadAgenda();
    } else {
      showToast("Toevoegen is niet gelukt.");
    }
    setAgendaBusy(false);
  };

  const deleteAgendaDate = async (id) => {
    const res = await fetch("/api/agenda", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showToast("Verwijderd.");
    } else {
      showToast("Verwijderen is niet gelukt — probeer het nog eens.");
    }
    loadAgenda();
  };

  const loadRoster = async () => {
    const res = await fetch("/api/roster");
    if (res.ok) {
      const data = await res.json();
      setRosterList(data.roster || []);
    }
  };

  const loadRotation = async () => {
    const res = await fetch("/api/rotation");
    if (res.ok) {
      const data = await res.json();
      setRotation(data.rotation || null);
      if (data.rotation) {
        setRotationForm({
          anchorDate: data.rotation.anchorDate || "",
          orderText: (data.rotation.order || []).join("\n"),
        });
      }
    }
  };

  const saveRotation = async (e) => {
    e.preventDefault();
    const order = rotationForm.orderText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!rotationForm.anchorDate || order.length === 0) {
      showToast("Vul een startdatum en minstens één team in.");
      return;
    }
    setRotationBusy(true);
    const res = await fetch("/api/rotation", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ anchorDate: rotationForm.anchorDate, order }),
    });
    if (res.ok) {
      showToast("Rotatie opgeslagen.");
      loadRotation();
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "Opslaan is niet gelukt.");
    }
    setRotationBusy(false);
  };

  const deleteRosterEntry = async (id) => {
    const res = await fetch("/api/roster", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showToast("Verwijderd.");
    } else {
      showToast("Verwijderen is niet gelukt — probeer het nog eens.");
    }
    loadRoster();
  };

  const loadTeams = async () => {
    const res = await fetch("/api/teams");
    if (res.ok) {
      const data = await res.json();
      setTeamsList(data.teams || []);
    }
  };

  const startEditTeam = (t) => {
    setEditingTeamId(t.id);
    setTeamForm({ name: t.name, membersText: (t.members || []).join("\n") });
  };

  const cancelEditTeam = () => {
    setEditingTeamId(null);
    setTeamForm({ name: "", membersText: "" });
  };

  const saveTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.name.trim()) {
      showToast("Vul een teamnaam in.");
      return;
    }
    setTeamBusy(true);
    const members = teamForm.membersText
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id: editingTeamId, name: teamForm.name, members }),
    });
    if (res.ok) {
      showToast(editingTeamId ? "Team bijgewerkt." : "Team toegevoegd.");
      cancelEditTeam();
      loadTeams();
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "Opslaan is niet gelukt.");
    }
    setTeamBusy(false);
  };

  const deleteTeam = async (id) => {
    const res = await fetch("/api/teams", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showToast("Team verwijderd.");
    } else {
      showToast("Verwijderen is niet gelukt — probeer het nog eens.");
    }
    loadTeams();
  };

  const loadFeedback = async () => {
    const res = await fetch("/api/feedback", { headers: { "x-admin-password": pw } });
    if (res.ok) {
      const data = await res.json();
      setFeedbackList(data.feedback || []);
    }
  };

  const deleteFeedback = async (id) => {
    const res = await fetch("/api/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showToast("Verwijderd.");
    } else {
      showToast("Verwijderen is niet gelukt — probeer het nog eens.");
    }
    loadFeedback();
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

  const downloadBackup = async () => {
    const res = await fetch("/api/admin/backup", { headers: { "x-admin-password": pw } });
    if (!res.ok) {
      showToast("Back-up maken is niet gelukt.");
      return;
    }
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `wijkkrant-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Back-up gedownload.");
  };

  const saveSettings = async (updates, { silent = false } = {}) => {
    if (!silent) setSettingsBusy(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      if (!silent) showToast("Uiterlijk opgeslagen.");
      refreshSettings();
    } else if (!silent) {
      showToast("Opslaan van het uiterlijk is niet gelukt.");
    }
    if (!silent) setSettingsBusy(false);
  };

  // Kleurenkiezers vuren tijdens het slepen heel vaak een "change" af. Als we daarbij
  // elke keer meteen zouden opslaan, kunnen die verzoeken elkaar overlappen en per
  // ongeluk andere instellingen (zoals de achtergrondfoto) laten verdwijnen. Daarom
  // tonen we de nieuwe kleur meteen (voor een vloeiend gevoel), maar wachten we met
  // echt opslaan tot je 400ms stil bent blijven staan met de kleur.
  const saveColorDebounced = (key, value) => {
    setSettingsLocal((prev) => ({ ...prev, [key]: value }));
    if (colorSaveTimer.current) clearTimeout(colorSaveTimer.current);
    colorSaveTimer.current = setTimeout(() => {
      saveSettings({ [key]: value });
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (colorSaveTimer.current) clearTimeout(colorSaveTimer.current);
    };
  }, []);

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
      if (!up.ok) throw new Error("upload mislukt");
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
      if (!up.ok) throw new Error("upload mislukt");
      const upData = await up.json();
      await saveSettings({ pageBackgroundImage: upData.urls?.[0] || null });
    } catch {
      showToast("Achtergrondfoto uploaden is niet gelukt.");
      setSettingsBusy(false);
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setDraft({ ...p, org: p.org || "", images: p.images || [] });
  };

  const removeDraftImage = (idx) => {
    setDraft((d) => ({ ...d, images: d.images.filter((_, i) => i !== idx) }));
  };

  const addDraftImages = async (files) => {
    const list = Array.from(files).slice(0, MAX_IMAGES - (draft?.images?.length || 0));
    if (!list.length) return;
    setEditImagesBusy(true);
    try {
      const resized = await Promise.all(list.map((f) => resizeImage(f)));
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: resized }),
      });
      if (!up.ok) throw new Error("upload mislukt");
      const upData = await up.json();
      const urls = upData.urls || [];
      setDraft((d) => ({ ...d, images: [...(d.images || []), ...urls] }));
    } catch {
      showToast("Foto('s) toevoegen is niet gelukt.");
    }
    setEditImagesBusy(false);
  };

  const saveEdit = async () => {
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ id: editingId, updates: draft }),
    });
    if (res.ok) {
      setEditingId(null);
      setDraft(null);
      showToast("Wijzigingen opgeslagen.");
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "Opslaan is niet gelukt — je wijzigingen staan nog open, probeer het nog eens.");
    }
    reload();
  };

  const pending = posts
    .filter((p) => p.status === "pending")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const published = posts
    .filter((p) => p.status === "published")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const rotationPreview = rotation ? upcomingTeamWeeks(rotation, 3) : [];

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
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button type="button" className="btn btn-sm btn-outline" onClick={downloadBackup}>
              <Download size={13} /> Back-up downloaden
            </button>
          </div>
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
                  <label className="field-label" style={{ marginTop: 4 }}>
                    Foto's ({(draft.images || []).length}/{MAX_IMAGES})
                  </label>
                  <div className="admin-thumbs" style={{ marginBottom: 10 }}>
                    {(draft.images || []).map((src, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img src={src} alt="" />
                        <button
                          type="button"
                          onClick={() => removeDraftImage(i)}
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            background: "rgba(0,0,0,0.65)",
                            border: "none",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <X size={11} color="white" />
                        </button>
                      </div>
                    ))}
                    {(draft.images || []).length < MAX_IMAGES && (
                      <button
                        type="button"
                        className="thumb-add"
                        onClick={() => editFileRef.current?.click()}
                        disabled={editImagesBusy}
                      >
                        <ImagePlus size={16} />
                        {editImagesBusy ? "Bezig..." : "Toevoegen"}
                      </button>
                    )}
                  </div>
                  <input
                    ref={editFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => e.target.files && addDraftImages(e.target.files)}
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
            <Clock size={18} /> Belangrijke data (wijkagenda)
          </div>
          <p className="hint" style={{ marginTop: -6, marginBottom: 10 }}>
            Terugkerende afspraken zoals de potluck of tempelavond. Deze verschijnen boven in de wijkkrant.
          </p>
          {agendaDates.length === 0 && <p className="hint">Nog geen data toegevoegd.</p>}
          {agendaDates.map((d) => (
            <div className="published-row" key={d.id}>
              <span style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{d.title}</strong>
                <span className="hint" style={{ display: "block" }}>
                  {d.when}
                  {d.note ? ` — ${d.note}` : ""}
                </span>
              </span>
              <button
                onClick={() => deleteAgendaDate(d.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <form className="admin-post" onSubmit={addAgendaDate} style={{ marginTop: 12 }}>
            <label className="field-label">Titel</label>
            <input
              value={agendaForm.title}
              onChange={(e) => setAgendaForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Bijv. Potluck eten"
            />
            <label className="field-label">Wanneer</label>
            <input
              value={agendaForm.when}
              onChange={(e) => setAgendaForm((f) => ({ ...f, when: e.target.value }))}
              placeholder="Bijv. Elke 5e zondag van de maand, 12:00"
            />
            <label className="field-label">Notitie (optioneel)</label>
            <input
              value={agendaForm.note}
              onChange={(e) => setAgendaForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Bijv. Neem iets lekkers mee om te delen"
              style={{ marginBottom: 16 }}
            />
            <button className="btn btn-sm" disabled={agendaBusy}>
              {agendaBusy ? "Bezig..." : "Toevoegen"}
            </button>
          </form>

          <div className="section-title" style={{ marginTop: 32 }}>
            <Users size={18} /> Schoonmaak-teams
          </div>
          <p className="hint" style={{ marginTop: -6, marginBottom: 10 }}>
            Maak hier elk team aan met de bijbehorende leden. In het schoonmaakrooster hieronder kies je per week
            welk team aan de beurt is — op de wijkkrant zie je dan alleen "Team X", met een tikje om de namen te
            onthullen.
          </p>
          {teams.length === 0 && <p className="hint">Nog geen teams aangemaakt.</p>}
          {teams.map((t) => (
            <div className="published-row" key={t.id} style={{ alignItems: "flex-start" }}>
              <span style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{t.name}</strong>
                <span className="hint" style={{ display: "block" }}>
                  {(t.members || []).length} leden: {(t.members || []).join(", ") || "—"}
                </span>
              </span>
              <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => startEditTeam(t)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.35)" }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteTeam(t.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)" }}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          ))}
          <form className="admin-post" onSubmit={saveTeam} style={{ marginTop: 12 }}>
            <label className="field-label">Teamnaam</label>
            <input
              value={teamForm.name}
              onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Bijv. Team 7"
            />
            <label className="field-label">Leden (één naam per regel)</label>
            <textarea
              rows={5}
              value={teamForm.membersText}
              onChange={(e) => setTeamForm((f) => ({ ...f, membersText: e.target.value }))}
              placeholder={"Diederik Linders\nIan Prosman\nAthena Wijsman\n..."}
              style={{ marginBottom: 12 }}
            />
            <div className="admin-actions">
              <button className="btn btn-sm" disabled={teamBusy}>
                {teamBusy ? "Bezig..." : editingTeamId ? "Team bijwerken" : "Team toevoegen"}
              </button>
              {editingTeamId && (
                <button type="button" className="btn btn-sm btn-outline" onClick={cancelEditTeam}>
                  Annuleren
                </button>
              )}
            </div>
          </form>

          <div className="section-title" style={{ marginTop: 32 }}>
            <Clock size={18} /> Schoonmaakrooster — automatisch
          </div>
          <p className="hint" style={{ marginTop: -6, marginBottom: 10 }}>
            Stel dit één keer in: een startdatum (een maandag) en de volgorde van teams. Daarna rekent de wijkkrant
            zelf, voor altijd, uit welk team welke week aan de beurt is — nooit meer handmatig invullen.
          </p>
          {rotation && rotationPreview.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {rotationPreview.map((r, i) => (
                <div className="published-row" key={r.date}>
                  <span style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    {i === 0 && (
                      <span className="roster-now-badge" style={{ marginBottom: 0 }}>
                        NU
                      </span>
                    )}
                    {fmtDateStr(r.date)} — <strong>{r.who || "—"}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
          <form className="admin-post" onSubmit={saveRotation}>
            <label className="field-label">Startdatum (een maandag, hoort bij het 1e team hieronder)</label>
            <input
              type="date"
              value={rotationForm.anchorDate}
              onChange={(e) => setRotationForm((f) => ({ ...f, anchorDate: e.target.value }))}
            />
            <label className="field-label">Volgorde van teams (één per regel, in de juiste rotatie-volgorde)</label>
            <textarea
              rows={8}
              value={rotationForm.orderText}
              onChange={(e) => setRotationForm((f) => ({ ...f, orderText: e.target.value }))}
              placeholder={"Team 1\nTeam 2\nTeam 3\n..."}
              style={{ marginBottom: 12 }}
            />
            <button className="btn btn-sm" disabled={rotationBusy}>
              {rotationBusy ? "Bezig..." : "Rotatie opslaan"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ marginLeft: 8 }}
              onClick={() => setRotationForm((f) => ({ ...f, orderText: teams.map((t) => t.name).join("\n") }))}
            >
              Vul aan met huidige teams
            </button>
          </form>

          <details style={{ marginTop: 16 }}>
            <summary className="hint" style={{ cursor: "pointer" }}>
              Oude handmatige rooster-regels ({roster.length}) — niet meer nodig, alleen ter referentie
            </summary>
            <div style={{ marginTop: 10 }}>
              {roster.slice(0, 10).map((r) => (
                <div className="published-row" key={r.id}>
                  <span style={{ fontSize: 14 }}>
                    {fmtDateStr(r.date)} — <strong>{r.who}</strong>
                  </span>
                  <button
                    onClick={() => deleteRosterEntry(r.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {roster.length > 10 && <p className="hint">... en nog {roster.length - 10} meer.</p>}
            </div>
          </details>

          <div className="section-title" style={{ marginTop: 32 }}>
            <MessageSquarePlus size={18} /> Verbeterpunten van leden ({feedback.length})
          </div>
          <p className="hint" style={{ marginTop: -6, marginBottom: 10 }}>
            Dit komt binnen via het zwevende knopje rechtsonder op de wijkkrant. Vink af (verwijder) zodra je 'm hebt
            verwerkt.
          </p>
          {feedback.length === 0 && <p className="hint">Nog geen verbeterpunten binnengekomen.</p>}
          {feedback.map((f) => (
            <div className="published-row" key={f.id} style={{ alignItems: "flex-start" }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ fontSize: 14, display: "block" }}>{f.text}</span>
                <span className="hint" style={{ display: "block" }}>
                  {f.name || "Anoniem"} • {fmtDate(f.createdAt)}
                </span>
              </span>
              <button
                onClick={() => deleteFeedback(f.id)}
                title="Afvinken / verwijderen"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)", flexShrink: 0 }}
              >
                <Check size={16} />
              </button>
            </div>
          ))}

          <div className="section-title" style={{ marginTop: 32 }}>
            Al geplaatst ({published.length})
          </div>
          {published.length === 0 && <p className="hint">Nog niets geplaatst.</p>}
          {published.map((p) =>
            editingId === p.id ? (
              <div className="admin-post" key={p.id}>
                <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>
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
                <textarea rows={4} value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} />
                <label className="field-label" style={{ marginTop: 4 }}>
                  Foto's ({(draft.images || []).length}/{MAX_IMAGES})
                </label>
                <div className="admin-thumbs" style={{ marginBottom: 10 }}>
                  {(draft.images || []).map((src, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={src} alt="" />
                      <button
                        type="button"
                        onClick={() => removeDraftImage(i)}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          background: "rgba(0,0,0,0.65)",
                          border: "none",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <X size={11} color="white" />
                      </button>
                    </div>
                  ))}
                  {(draft.images || []).length < MAX_IMAGES && (
                    <button
                      type="button"
                      className="thumb-add"
                      onClick={() => editFileRef.current?.click()}
                      disabled={editImagesBusy}
                    >
                      <ImagePlus size={16} />
                      {editImagesBusy ? "Bezig..." : "Toevoegen"}
                    </button>
                  )}
                </div>
                <input
                  ref={editFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => e.target.files && addDraftImages(e.target.files)}
                />
                <div className="admin-actions">
                  <button className="btn btn-sm" onClick={saveEdit}>
                    Opslaan
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => setEditingId(null)}>
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <div className="published-row" key={p.id}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span className="tag" style={{ background: catInfo(p.category).color }}>
                    {catInfo(p.category).label}
                  </span>
                  <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.title || p.text.slice(0, 40)}
                  </span>
                </span>
                <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => startEdit(p)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.35)" }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => unpublish(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
            )
          )}
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
                  onChange={(e) => saveColorDebounced("pageBackgroundColor", e.target.value)}
                  style={{ width: 60, height: 36, border: "none", background: "none", cursor: "pointer" }}
                />
              </div>
              <div>
                <label className="field-label">Achtergrondkleur redactiepagina</label>
                <input
                  type="color"
                  value={settings.adminBackgroundColor || "#e7edf3"}
                  onChange={(e) => saveColorDebounced("adminBackgroundColor", e.target.value)}
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
