"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { useLang } from "../../components/LangProvider";
import { t, MONTHS } from "../../lib/i18n";
import { BookOpen, Download } from "lucide-react";

const LANG_LABEL = { nl: "NL", en: "EN" };
const CARD_COLORS = ["#eaf3f1", "#e9f0f7", "#faf3e6", "#eef3ea", "#f5eaf0", "#fbeaf0"];

export default function ArchiefPage() {
  const [lang] = useLang();
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/archive")
      .then((r) => r.json())
      .then((d) => {
        setArchive(d.archive || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const byYear = archive.reduce((acc, a) => {
    (acc[a.year] = acc[a.year] || []).push(a);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => b - a);

  return (
    <Shell active="archief">
      <div className="panel" style={{ maxWidth: 720, textAlign: "center", marginBottom: 28 }}>
        <BookOpen size={26} style={{ color: "#b9812f", marginBottom: 8 }} />
        <h2>{t(lang, "archiveHeading")}</h2>
        <p className="sub">{t(lang, "archiveSub")}</p>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "rgba(0,0,0,0.4)" }}>{t(lang, "loading")}</p>
      ) : years.length === 0 ? (
        <div className="empty">
          <strong>{t(lang, "archiveEmptyTitle")}</strong>
          {t(lang, "archiveEmptyBody")}
        </div>
      ) : (
        years.map((year) => (
          <div key={year} style={{ maxWidth: 720, margin: "0 auto 32px" }}>
            <h3 className="archive-year">{year}</h3>
            <div className="archive-grid">
              {byYear[year]
                .sort((a, b) => b.month - a.month)
                .map((entry, i) => (
                  <a
                    key={entry.id}
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="archive-card"
                    style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
                  >
                    <span className="archive-flag">{LANG_LABEL[entry.lang] || entry.lang.toUpperCase()}</span>
                    <span className="archive-month">{MONTHS[lang][entry.month - 1]}</span>
                    <span className="archive-title">{entry.title}</span>
                    <span className="archive-download">
                      <Download size={14} /> {t(lang, "archiveDownload")}
                    </span>
                  </a>
                ))}
            </div>
          </div>
        ))
      )}
    </Shell>
  );
}
