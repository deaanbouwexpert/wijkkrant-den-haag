"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Send, Lock, Archive, Languages, CalendarDays, ChevronDown } from "lucide-react";
import { useLang } from "./LangProvider";
import { useSettings } from "./SettingsProvider";
import { t, MONTHS } from "../lib/i18n";

export default function Shell({ children, active }) {
  const [lang, setLang] = useLang();
  const [settings] = useSettings();
  const now = new Date();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDates, setAgendaDates] = useState([]);
  const agendaRef = useRef(null);

  const headerImages = settings.headerImages || [];
  const hasHeaderPhotos = headerImages.length > 0;
  const isCollage = headerImages.length > 1;

  useEffect(() => {
    fetch("/api/agenda")
      .then((r) => r.json())
      .then((d) => setAgendaDates(d.dates || []))
      .catch(() => {});
  }, []);

  // Dropdown sluiten als je ergens anders klikt.
  useEffect(() => {
    if (!agendaOpen) return;
    const onClick = (e) => {
      if (agendaRef.current && !agendaRef.current.contains(e.target)) setAgendaOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [agendaOpen]);

  useEffect(() => {
    const bg = active === "admin" ? settings.adminBackgroundColor : settings.pageBackgroundColor;
    const img = active === "admin" ? null : settings.pageBackgroundImage;
    if (img) {
      document.body.style.backgroundImage = `url(${img})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundAttachment = "fixed";
      document.body.style.backgroundPosition = "center";
    } else {
      document.body.style.backgroundImage = "none";
    }
    document.body.style.background = img ? document.body.style.background : bg || "";
    if (img) document.body.style.backgroundColor = bg || "";
    return () => {
      document.body.style.backgroundImage = "none";
      document.body.style.backgroundColor = "";
    };
  }, [active, settings]);

  return (
    <div className="container">
      <div
        className={`header ${isCollage ? "header-tall" : ""}`}
        style={
          hasHeaderPhotos && !isCollage
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(27,48,42,0.82), rgba(47,74,66,0.75)), url(${headerImages[0]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        <button
          className="lang-toggle-corner"
          onClick={() => setLang(lang === "nl" ? "en" : "nl")}
          title={lang === "nl" ? "Switch to English" : "Overschakelen naar Nederlands"}
        >
          <Languages size={13} />
          {lang === "nl" ? "EN" : "NL"}
        </button>
        <div className="header-inner">
          <p className="header-eyebrow">
            {MONTHS[lang][now.getMonth()]} {now.getFullYear()}
          </p>
          <h1 className="header-title">{t(lang, "navPublic")}</h1>
          <p className="header-sub">{t(lang, "headerSub")}</p>
        </div>

        {isCollage && (
          <div className="header-collage">
            {headerImages.slice(0, 5).map((src, i) => (
              <img key={i} src={src} alt="" className="header-collage-img" />
            ))}
          </div>
        )}

        <div className="nav">
          <Link href="/" className={`nav-btn ${active === "public" ? "active" : ""}`}>
            <Eye size={14} /> {t(lang, "navPublic")}
          </Link>
          <Link href="/submit" className={`nav-btn ${active === "submit" ? "active" : ""}`}>
            <Send size={14} /> {t(lang, "navSubmit")}
          </Link>
          <Link href="/archief" className={`nav-btn ${active === "archief" ? "active" : ""}`}>
            <Archive size={14} /> {t(lang, "navArchive")}
          </Link>
          {agendaDates.length > 0 && (
            <div className="nav-dropdown-wrap" ref={agendaRef}>
              <button
                type="button"
                className={`nav-btn ${agendaOpen ? "active" : ""}`}
                onClick={() => setAgendaOpen((v) => !v)}
              >
                <CalendarDays size={14} /> {t(lang, "agendaHeading")}
                <ChevronDown size={12} style={{ transform: agendaOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {agendaOpen && (
                <div className="nav-dropdown">
                  {agendaDates.map((d) => (
                    <div className="nav-dropdown-item" key={d.id}>
                      <span className="agenda-item-title">{d.title}</span>
                      <span className="agenda-item-when">{d.when}</span>
                      {d.note && <span className="agenda-item-note">{d.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Link href="/admin" className={`nav-btn ${active === "admin" ? "active" : ""}`}>
            <Lock size={14} /> {t(lang, "navAdmin")}
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
