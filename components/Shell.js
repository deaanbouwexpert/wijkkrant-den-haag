"use client";
import Link from "next/link";
import { Eye, Send, Lock, Archive, Languages } from "lucide-react";
import { useLang } from "./LangProvider";
import { t, MONTHS } from "../lib/i18n";

export default function Shell({ children, active }) {
  const [lang, setLang] = useLang();
  const now = new Date();
  return (
    <div className="container">
      <div className="header">
        <div className="header-inner">
          <p className="header-eyebrow">
            {MONTHS[lang][now.getMonth()]} {now.getFullYear()}
          </p>
          <h1 className="header-title">{t(lang, "navPublic")}</h1>
          <p className="header-sub">{t(lang, "headerSub")}</p>
          <div className="lang-toggle">
            <button className={`lang-btn ${lang === "nl" ? "active" : ""}`} onClick={() => setLang("nl")}>
              🇳🇱 Nederlands
            </button>
            <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")}>
              <Languages size={13} /> English
            </button>
          </div>
        </div>
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
          <Link href="/admin" className={`nav-btn ${active === "admin" ? "active" : ""}`}>
            <Lock size={14} /> {t(lang, "navAdmin")}
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
