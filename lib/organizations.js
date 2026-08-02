export const ORGANIZATIONS = [
  { id: "zhv", label: "ZHV (Zustershulpvereniging)", labelEn: "Relief Society" },
  { id: "ouderlingenquorum", label: "Ouderlingenquorum", labelEn: "Elders Quorum" },
  { id: "jongevrouwen", label: "Jongevrouwen", labelEn: "Young Women" },
  { id: "jongevrouwenjongemannen", label: "Jongevrouwen & Jongemannen", labelEn: "Young Women & Young Men" },
  { id: "jongemannen", label: "Jongemannen (Aäronisch priesterschap)", labelEn: "Young Men (Aaronic Priesthood)" },
  { id: "jeugdwerk", label: "Jeugdwerk (Primary)", labelEn: "Primary" },
  { id: "zondagsschool", label: "Zondagsschool", labelEn: "Sunday School" },
  { id: "jongvolwassenen", label: "Jongvolwassenen (YSA)", labelEn: "Young Single Adults (YSA)" },
  { id: "alleenstaanden", label: "Alleenstaande volwassenen (SA)", labelEn: "Single Adults (SA)" },
];

export function orgInfo(id, lang = "nl") {
  const o = ORGANIZATIONS.find((o) => o.id === id);
  if (!o) return null;
  return { ...o, label: lang === "en" ? o.labelEn : o.label };
}
