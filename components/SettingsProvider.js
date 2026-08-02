"use client";
import { createContext, useContext, useEffect, useState } from "react";

const DEFAULTS = {
  headerImages: [],
  pageBackgroundColor: "#f5efe6",
  pageBackgroundImage: null,
  adminBackgroundColor: "#e7edf3",
};

const SettingsContext = createContext([DEFAULTS, () => {}, () => {}]);

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(DEFAULTS);

  const refresh = () => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => d.settings && setSettingsState(d.settings))
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SettingsContext.Provider value={[settings, setSettingsState, refresh]}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
