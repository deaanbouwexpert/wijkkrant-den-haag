export const CATEGORIES = [
  { id: "toespraak", label: "Toespraak", labelEn: "Talk", labelEs: "Discurso", color: "#1b5e56", paper: "#eaf3f1" },
  { id: "doopdienst", label: "Doopdienst", labelEn: "Baptism", labelEs: "Bautismo", color: "#3a6ea5", paper: "#e9f0f7" },
  { id: "activiteit", label: "Activiteit", labelEn: "Activity", labelEs: "Actividad", color: "#b9812f", paper: "#faf3e6" },
  { id: "zending", label: "Zending", labelEn: "Mission", labelEs: "Misión", color: "#516b47", paper: "#eef3ea" },
  { id: "mijlpaal", label: "Mijlpaal", labelEn: "Milestone", labelEs: "Hito", color: "#7c4a63", paper: "#f5eaf0" },
  { id: "ditjesdatjes", label: "Ditjes & Datjes", labelEn: "This & That", labelEs: "Esto y aquello", color: "#bd5678", paper: "#fbeaf0" },
  { id: "agenda", label: "Agenda", labelEn: "Agenda", labelEs: "Agenda", color: "#3f6a5e", paper: "#eaf1ee" },
  { id: "anders", label: "Anders", labelEn: "Other", labelEs: "Otro", color: "#6b645c", paper: "#f2efe9" },
];

export function catInfo(id, lang = "nl") {
  const c = CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  const label = lang === "en" ? c.labelEn : lang === "es" ? c.labelEs : c.label;
  return { ...c, label };
}
