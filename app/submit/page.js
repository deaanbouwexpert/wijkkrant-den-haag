"use client";
import { useRef, useState } from "react";
import Shell from "../../components/Shell";
import { CATEGORIES } from "../../lib/categories";
import { ORGANIZATIONS } from "../../lib/organizations";
import { ImagePlus, X, Send, Check } from "lucide-react";

const MAX_IMAGES = 6;

function resizeImage(file, maxWidth = 900, quality = 0.72) {
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

export default function SubmitPage() {
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0].id, org: "", title: "", text: "" });
  const [images, setImages] = useState([]);
  const [aiPolish, setAiPolish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const addFiles = async (files) => {
    setError("");
    const room = MAX_IMAGES - images.length;
    const list = Array.from(files).slice(0, room);
    if (!list.length) return;
    setBusy(true);
    try {
      const resized = await Promise.all(list.map((f) => resizeImage(f)));
      setImages((prev) => [...prev, ...resized]);
    } catch {
      setError("Een foto kon niet worden verwerkt. Probeer een andere foto.");
    }
    setBusy(false);
  };

  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.text.trim() && images.length === 0) {
      setError("Voeg een tekstje toe, of upload een foto (bijvoorbeeld een poster).");
      return;
    }
    setBusy(true);
    try {
      let uploadedUrls = [];
      if (images.length > 0) {
        const up = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images }),
        });
        const upData = await up.json();
        uploadedUrls = upData.urls || [];
      }

      let finalText = form.text.trim();
      let wasPolished = false;
      if (aiPolish && finalText) {
        try {
          const pr = await fetch("/api/polish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: finalText }),
          });
          const pd = await pr.json();
          if (pd.polished) {
            finalText = pd.polished;
            wasPolished = true;
          }
        } catch {
          /* geen probleem, gaan verder met originele tekst */
        }
      }

      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          org: form.org,
          title: form.title,
          text: finalText,
          images: uploadedUrls,
          polished: wasPolished,
        }),
      });
      setDone(true);
    } catch (e) {
      setError("Versturen is niet gelukt. Controleer je verbinding en probeer opnieuw.");
    }
    setBusy(false);
  };

  return (
    <Shell active="submit">
      {done ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <Check size={28} style={{ color: "#516b47", marginBottom: 8 }} />
          <h2>Bedankt voor je bijdrage!</h2>
          <p className="sub">
            Je bericht wordt eerst bekeken door de redactie. Zodra het is goedgekeurd, verschijnt het in de
            wijkkrant.
          </p>
          <button
            className="btn"
            onClick={() => {
              setDone(false);
              setForm({ name: "", category: CATEGORIES[0].id, org: "", title: "", text: "" });
              setImages([]);
            }}
          >
            Nog iets insturen
          </button>
        </div>
      ) : (
        <form className="panel" onSubmit={submit}>
          <h2>Deel iets met de wijk</h2>
          <p className="sub">Een foto (bijvoorbeeld een poster) en/of een kort verhaaltje is al genoeg.</p>

          <label className="field-label">Je naam</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Voornaam Achternaam"
          />
          <p className="hint" style={{ marginTop: -10, marginBottom: 16 }}>
            Alleen zichtbaar voor de redactie, niet in de wijkkrant zelf.
          </p>

          <label className="field-label">Categorie</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <label className="field-label">Vereniging (optioneel)</label>
          <select value={form.org} onChange={(e) => setForm((f) => ({ ...f, org: e.target.value }))}>
            <option value="">Geen / niet van toepassing</option>
            {ORGANIZATIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          <label className="field-label">Titel (optioneel)</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Een korte, pakkende titel"
          />

          <label className="field-label">Je verhaal (optioneel bij een poster)</label>
          <textarea
            rows={5}
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            placeholder="Vertel hier kort wat je wilt delen..."
          />

          <label className="field-label">
            Foto's ({images.length}/{MAX_IMAGES})
          </label>
          <div className="thumb-row">
            {images.map((src, i) => (
              <div className="thumb" key={i}>
                <img src={src} alt="" />
                <button type="button" onClick={() => removeImage(i)}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button type="button" className="thumb-add" onClick={() => fileRef.current?.click()} disabled={busy}>
                <ImagePlus size={16} />
                Toevoegen
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          <div className="checkbox-row">
            <input
              type="checkbox"
              id="aipolish"
              checked={aiPolish}
              onChange={(e) => setAiPolish(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <label htmlFor="aipolish">
              Laat AI mijn tekst controleren op spelling en grammatica (verandert de inhoud niet)
            </label>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-full" disabled={busy}>
            <Send size={15} />
            {busy ? "Even geduld..." : "Insturen ter beoordeling"}
          </button>
        </form>
      )}
    </Shell>
  );
}
