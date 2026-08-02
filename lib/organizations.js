export const ORGANIZATIONS = [
  { id: "zhv", label: "ZHV (Zustershulpvereniging)" },
  { id: "ouderlingenquorum", label: "Ouderlingenquorum" },
  { id: "jongevrouwen", label: "Jongevrouwen" },
  { id: "jongemannen", label: "Jongemannen (Aäronisch priesterschap)" },
  { id: "jeugdwerk", label: "Jeugdwerk (Primary)" },
  { id: "zondagsschool", label: "Zondagsschool" },
  { id: "jongvolwassenen", label: "Jongvolwassenen (YSA)" },
  { id: "alleenstaanden", label: "Alleenstaande volwassenen (SA)" },
];

export function orgInfo(id) {
  return ORGANIZATIONS.find((o) => o.id === id) || null;
}
