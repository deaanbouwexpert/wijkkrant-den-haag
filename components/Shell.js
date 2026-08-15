"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Send, Lock, Archive, CalendarDays, ChevronDown, Users, MessageSquarePlus, X, Check, CalendarRange } from "lucide-react";
import { useLang } from "./LangProvider";
import { useSettings } from "./SettingsProvider";
import { t, MONTHS } from "../lib/i18n";

function fmtDateStrLang(dateStr, lang) {
  // "YYYY-MM-DD" handmatig opsplitsen i.p.v. via new Date(), zodat er nooit een
  // tijdzone-verschuiving kan optreden.
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTHS[lang][m - 1]} ${y}`;
}

export default function Shell({ children, active }) {
  const [lang, setLang] = useLang();
  const [settings] = useSettings();
  const now = new Date();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDates, setAgendaDates] = useState([]);
  const [agendaPos, setAgendaPos] = useState({ top: 0, left: 0 });
  const agendaRef = useRef(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [roster, setRoster] = useState([]);
  const [rosterPos, setRosterPos] = useState({ top: 0, left: 0 });
  const rosterRef = useRef(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const feedbackRef = useRef(null);

  const headerImages = settings.headerImages || [];
  const hasHeaderPhotos = headerImages.length > 0;
  const isCollage = headerImages.length > 1;

  useEffect(() => {
    fetch("/api/agenda")
      .then((r) => r.json())
      .then((d) => setAgendaDates(d.dates || []))
      .catch(() => {});
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => setRoster(d.roster || []))
      .catch(() => {});
  }, []);

  // Zodra een andere taal dan Nederlands gekozen wordt: vertaal (en cache) elk
  // agenda-item en elke roosterregel dat nog geen vertaling in die taal heeft.
  useEffect(() => {
    if (lang === "nl") return;
    agendaDates.forEach((d) => {
      if (d.translations?.[lang]) return;
      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "agenda", id: d.id, targetLang: lang }),
      })
        .then((r) => r.json())
        .then((data) => {
          setAgendaDates((prev) =>
            prev.map((x) => (x.id === d.id ? { ...x, translations: { ...(x.translations || {}), [lang]: data } } : x))
          );
        })
        .catch(() => {});
    });
    roster.forEach((r) => {
      if (r.translations?.[lang]) return;
      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "roster", id: r.id, targetLang: lang }),
      })
        .then((res) => res.json())
        .then((data) => {
          setRoster((prev) =>
            prev.map((x) => (x.id === r.id ? { ...x, translations: { ...(x.translations || {}), [lang]: data } } : x))
          );
        })
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, agendaDates.length, roster.length]);

  // Dropdown sluiten als je ergens anders klikt, scrollt, of het venster van grootte verandert
  // (anders klopt de berekende positie niet meer).
  useEffect(() => {
    if (!agendaOpen && !rosterOpen) return;
    const close = () => {
      setAgendaOpen(false);
      setRosterOpen(false);
    };
    const onClick = (e) => {
      if (agendaOpen && agendaRef.current && !agendaRef.current.contains(e.target)) setAgendaOpen(false);
      if (rosterOpen && rosterRef.current && !rosterRef.current.contains(e.target)) setRosterOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [agendaOpen, rosterOpen]);

  // Het feedback-paneeltje sluiten als je ernaast klikt.
  useEffect(() => {
    if (!feedbackOpen) return;
    const onClick = (e) => {
      if (feedbackRef.current && !feedbackRef.current.contains(e.target)) setFeedbackOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [feedbackOpen]);

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: feedbackName, text: feedbackText }),
      });
      setFeedbackSent(true);
      setFeedbackText("");
      setFeedbackName("");
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackSent(false);
      }, 2200);
    } catch {
      // stil laten mislukken; het knopje blijft gewoon staan zodat iemand het nog een keer kan proberen
    }
    setFeedbackBusy(false);
  };

  const toggleAgenda = () => {
    if (!agendaOpen && agendaRef.current) {
      const rect = agendaRef.current.getBoundingClientRect();
      setAgendaPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    }
    setRosterOpen(false);
    setAgendaOpen((v) => !v);
  };

  const toggleRoster = () => {
    if (!rosterOpen && rosterRef.current) {
      const rect = rosterRef.current.getBoundingClientRect();
      setRosterPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    }
    setAgendaOpen(false);
    setRosterOpen((v) => !v);
  };

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
        <div className="lang-select-corner-wrap">
          <div className="lang-select-corner">
            {["nl", "en", "es"].map((l) => (
              <button
                key={l}
                type="button"
                className={`lang-opt ${lang === l ? "active" : ""}`}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <a
            href="https://www.churchofjesuschrist.org/calendar/month?lang=eng"
            target="_blank"
            rel="noreferrer"
            className="ward-calendar-link"
          >
            <CalendarRange size={11} /> {t(lang, "navWardCalendar")}
          </a>
        </div>
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
                onClick={toggleAgenda}
              >
                <CalendarDays size={14} /> {t(lang, "agendaHeading")}
                <ChevronDown size={12} style={{ transform: agendaOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {agendaOpen && (
                <div
                  className="nav-dropdown"
                  style={{ position: "fixed", top: agendaPos.top, left: agendaPos.left, transform: "translateX(-50%)" }}
                >
                  {agendaDates.map((d) => {
                    const tr = lang !== "nl" ? d.translations?.[lang] : null;
                    const note = tr?.note ?? d.note;
                    return (
                      <div className="nav-dropdown-item" key={d.id}>
                        <span className="agenda-item-title">{tr?.title || d.title}</span>
                        <span className="agenda-item-when">{tr?.when || d.when}</span>
                        {note && <span className="agenda-item-note">{note}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {roster.length > 0 && (
            <div className="nav-dropdown-wrap" ref={rosterRef}>
              <button
                type="button"
                className={`nav-btn ${rosterOpen ? "active" : ""}`}
                onClick={toggleRoster}
              >
                <Users size={14} /> {t(lang, "rosterHeading")}
                <ChevronDown size={12} style={{ transform: rosterOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {rosterOpen && (
                <div
                  className="nav-dropdown"
                  style={{ position: "fixed", top: rosterPos.top, left: rosterPos.left, transform: "translateX(-50%)" }}
                >
                  {roster.map((r) => {
                    const tr = lang !== "nl" ? r.translations?.[lang] : null;
                    return (
                      <div className="nav-dropdown-item nav-dropdown-item-row" key={r.id}>
                        <span className="roster-date">{fmtDateStrLang(r.date, lang)}</span>
                        <span className="roster-who">{tr?.who || r.who}</span>
                      </div>
                    );
                  })}
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

      {active !== "admin" && (
        <div className="feedback-fab-wrap" ref={feedbackRef}>
          {feedbackOpen && (
            <div className="feedback-panel">
              {feedbackSent ? (
                <p className="feedback-thanks">
                  <Check size={16} /> {t(lang, "feedbackThanks")}
                </p>
              ) : (
                <form onSubmit={submitFeedback}>
                  <p className="feedback-title">{t(lang, "feedbackTitle")}</p>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={t(lang, "feedbackPlaceholder")}
                    autoFocus
                  />
                  <input
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    placeholder={t(lang, "feedbackNamePlaceholder")}
                  />
                  <button className="btn btn-sm btn-full" disabled={feedbackBusy}>
                    {feedbackBusy ? t(lang, "loading") : t(lang, "feedbackSend")}
                  </button>
                </form>
              )}
            </div>
          )}
          <button
            type="button"
            className="feedback-fab"
            onClick={() => setFeedbackOpen((v) => !v)}
            title={t(lang, "feedbackTitle")}
          >
            {feedbackOpen ? <X size={20} /> : <MessageSquarePlus size={20} />}
          </button>
        </div>
      )}
    </div>
  );
}
