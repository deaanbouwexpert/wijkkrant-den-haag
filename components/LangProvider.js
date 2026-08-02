"use client";
import { createContext, useContext, useEffect, useState } from "react";

const LangContext = createContext(["nl", () => {}]);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState("nl");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wk_lang") : null;
    if (stored === "en" || stored === "nl") setLangState(stored);
  }, []);

  const setLang = (l) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("wk_lang", l);
  };

  return <LangContext.Provider value={[lang, setLang]}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
