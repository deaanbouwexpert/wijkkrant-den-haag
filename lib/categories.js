export const CATEGORIES = [
  { id: "toespraak", label: "Toespraak", color: "#1b5e56", paper: "#eaf3f1" },
  { id: "activiteit", label: "Activiteit", color: "#b9812f", paper: "#faf3e6" },
  { id: "zending", label: "Zending", color: "#516b47", paper: "#eef3ea" },
  { id: "mijlpaal", label: "Mijlpaal", color: "#7c4a63", paper: "#f5eaf0" },
  { id: "ditjesdatjes", label: "Ditjes & Datjes", color: "#bd5678", paper: "#fbeaf0" },
  { id: "agenda", label: "Agenda", color: "#3f6a5e", paper: "#eaf1ee" },
  { id: "anders", label: "Anders", color: "#6b645c", paper: "#f2efe9" },
];

export function catInfo(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
