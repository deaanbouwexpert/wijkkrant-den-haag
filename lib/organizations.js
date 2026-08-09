export const ORGANIZATIONS = [
  { id: "zhv", label: "ZHV (Zustershulpvereniging)", labelEn: "Relief Society", labelEs: "Sociedad de Socorro" },
  { id: "ouderlingenquorum", label: "Ouderlingenquorum", labelEn: "Elders Quorum", labelEs: "Cuórum de Élderes" },
  { id: "jongevrouwen", label: "Jongevrouwen", labelEn: "Young Women", labelEs: "Mujeres Jóvenes" },
  {
    id: "jongevrouwenjongemannen",
    label: "Jongevrouwen & Jongemannen",
    labelEn: "Young Women & Young Men",
    labelEs: "Mujeres Jóvenes y Hombres Jóvenes",
  },
  {
    id: "jongemannen",
    label: "Jongemannen (Aäronisch priesterschap)",
    labelEn: "Young Men (Aaronic Priesthood)",
    labelEs: "Hombres Jóvenes (Sacerdocio Aarónico)",
  },
  { id: "jeugdwerk", label: "Jeugdwerk (Primary)", labelEn: "Primary", labelEs: "Primaria" },
  { id: "zondagsschool", label: "Zondagsschool", labelEn: "Sunday School", labelEs: "Escuela Dominical" },
  {
    id: "jongvolwassenen",
    label: "Jongvolwassenen (YSA)",
    labelEn: "Young Single Adults (YSA)",
    labelEs: "Adultos Solteros Jóvenes (YSA)",
  },
  {
    id: "alleenstaanden",
    label: "Alleenstaande volwassenen (SA)",
    labelEn: "Single Adults (SA)",
    labelEs: "Adultos Solteros (SA)",
  },
];

export function orgInfo(id, lang = "nl") {
  const o = ORGANIZATIONS.find((o) => o.id === id);
  if (!o) return null;
  const label = lang === "en" ? o.labelEn : lang === "es" ? o.labelEs : o.label;
  return { ...o, label };
}
