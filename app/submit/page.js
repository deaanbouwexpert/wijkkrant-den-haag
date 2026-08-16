"use client";
import { useRef, useState } from "react";
import Shell from "../../components/Shell";
import { useLang } from "../../components/LangProvider";
import { CATEGORIES } from "../../lib/categories";
import { ORGANIZATIONS } from "../../lib/organizations";
import { t } from "../../lib/i18n";
import { ImagePlus, X, Send, Check, FileText, Paperclip } from "lucide-react";

const MAX_IMAGES = 6;
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

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
  const [lang] = useLang();
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0].id, org: "", title: "", text: "" });
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const fileRef = useRef(null);
  const pdfRef = useRef(null);

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
      setError(t(lang, "errPhoto"));
    }
    setBusy(false);
  };

  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const onPdfChosen = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    if (f.type !== "application/pdf") {
      setError(t(lang, "errPdfType"));
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setError(t(lang, "errPdfSize"));
      return;
    }
    setPdfFile(f);
  };

  const removePdf = () => {
    setPdfFile(null);
    if (pdfRef.current) pdfRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.text.trim() && images.length === 0 && !pdfFile) {
      setError(t(lang, "errNeedContent"));
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
        if (!up.ok) {
          const errData = await up.json().catch(() => ({}));
          throw new Error(errData.error || `foto-upload mislukt (${up.status})`);
        }
        const upData = await up.json();
        uploadedUrls = upData.urls || [];
      }

      let pdfUrl = "";
      if (pdfFile) {
        // Directe upload naar de opslag (via een tijdelijke link), zodat grote PDF's
        // niet vastlopen op de bodylimiet van een Vercel-functie.
        const initRes = await fetch("/api/upload-pdf/init", { method: "POST" });
        if (!initRes.ok) throw new Error("pdf-init-failed");
        const { signedUrl, publicUrl } = await initRes.json();

        const putRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: pdfFile,
        });
        if (!putRes.ok) throw new Error("pdf-upload-failed");
        pdfUrl = publicUrl;
      }

      const finalText = form.text.trim();

      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          org: form.org,
          title: form.title,
          text: finalText,
          images: uploadedUrls,
          pdfUrl,
          pdfName: pdfFile ? pdfFile.name : "",
        }),
      });
      if (!postRes.ok) {
        const errData = await postRes.json().catch(() => ({}));
        throw new Error(errData.error || `server-fout (${postRes.status})`);
      }
      setDone(true);
    } catch (e) {
      setError(`${t(lang, "errSend")} (${e.message || "onbekende fout"})`);
    }
    setBusy(false);
  };

  return (
    <Shell active="submit">
      {done ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <Check size={28} style={{ color: "#516b47", marginBottom: 8 }} />
          <h2>{t(lang, "thanksTitle")}</h2>
          <p className="sub">{t(lang, "thanksBody")}</p>
          <button
            className="btn"
            onClick={() => {
              setDone(false);
              setForm({ name: "", category: CATEGORIES[0].id, org: "", title: "", text: "" });
              setImages([]);
              setPdfFile(null);
            }}
          >
            {t(lang, "submitAnother")}
          </button>
        </div>
      ) : (
        <form className="panel" onSubmit={submit}>
          <h2>{t(lang, "submitHeading")}</h2>
          <p className="sub">{t(lang, "submitSub")}</p>

          <label className="field-label">{t(lang, "yourName")}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t(lang, "namePlaceholder")}
          />
          <p className="hint" style={{ marginTop: -10, marginBottom: 16 }}>
            {t(lang, "nameHint")}
          </p>

          <label className="field-label">{t(lang, "category")}</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === "en" ? c.labelEn : lang === "es" ? c.labelEs : c.label}
              </option>
            ))}
          </select>

          <label className="field-label">{t(lang, "org")}</label>
          <select value={form.org} onChange={(e) => setForm((f) => ({ ...f, org: e.target.value }))}>
            <option value="">{t(lang, "orgNone")}</option>
            {ORGANIZATIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {lang === "en" ? o.labelEn : lang === "es" ? o.labelEs : o.label}
              </option>
            ))}
          </select>

          <label className="field-label">{t(lang, "titleField")}</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t(lang, "titlePlaceholder")}
          />

          <label className="field-label">{t(lang, "story")}</label>
          <textarea
            rows={5}
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            placeholder={t(lang, "storyPlaceholder")}
          />

          <label className="field-label">
            {t(lang, "photos")} ({images.length}/{MAX_IMAGES})
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
                {t(lang, "addPhoto")}
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

          <label className="field-label">{t(lang, "pdfField")}</label>
          <p className="hint" style={{ marginTop: -10, marginBottom: 12 }}>
            {t(lang, "pdfHint")}
          </p>
          {pdfFile ? (
            <div className="pdf-chosen">
              <FileText size={16} />
              <span className="pdf-chosen-name">{pdfFile.name}</span>
              <button type="button" onClick={removePdf}>
                <X size={12} /> {t(lang, "removePdf")}
              </button>
            </div>
          ) : (
            <button type="button" className="thumb-add" onClick={() => pdfRef.current?.click()}>
              <Paperclip size={16} />
              {t(lang, "addPdf")}
            </button>
          )}
          <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={onPdfChosen} />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-full" disabled={busy}>
            <Send size={15} />
            {busy ? t(lang, "submitBusy") : t(lang, "submitBtn")}
          </button>
        </form>
      )}
    </Shell>
  );
}
