"use client";
import Link from "next/link";
import { Eye, Send, Lock } from "lucide-react";

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export default function Shell({ children, active }) {
  const now = new Date();
  return (
    <div className="container">
      <div className="header">
        <div className="header-inner">
          <p className="header-eyebrow">
            {MONTHS[now.getMonth()]} {now.getFullYear()}
          </p>
          <h1 className="header-title">Wijkkrant</h1>
          <p className="header-sub">Nieuws, verhalen en foto's uit onze wijk — door en voor elkaar.</p>
        </div>
        <div className="nav">
          <Link href="/" className={`nav-btn ${active === "public" ? "active" : ""}`}>
            <Eye size={14} /> Wijkkrant
          </Link>
          <Link href="/submit" className={`nav-btn ${active === "submit" ? "active" : ""}`}>
            <Send size={14} /> Iets insturen
          </Link>
          <Link href="/admin" className={`nav-btn ${active === "admin" ? "active" : ""}`}>
            <Lock size={14} /> Redactie
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
