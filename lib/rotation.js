// Rekent uit welk team aan de beurt is in de week van een gegeven datum, op basis
// van een vaste startdatum + de volgorde van teams. Telt daarna simpelweg door in
// blokken van 7 dagen, voor altijd — dus geen handmatige invoer meer nodig.
//
// rotation: { anchorDate: "YYYY-MM-DD" (een maandag, hoort bij order[0]), order: [teamNaam, ...] }
export function teamForDate(rotation, dateStr) {
  if (!rotation || !rotation.anchorDate || !Array.isArray(rotation.order) || rotation.order.length === 0) {
    return null;
  }
  const anchor = new Date(rotation.anchorDate + "T00:00:00Z");
  const target = new Date(dateStr + "T00:00:00Z");
  const dayMs = 24 * 60 * 60 * 1000;
  const daysDiff = Math.round((target.getTime() - anchor.getTime()) / dayMs);
  const weeksDiff = Math.floor(daysDiff / 7);
  const n = rotation.order.length;
  const index = ((weeksDiff % n) + n) % n;
  return rotation.order[index];
}

// Geeft de maandag terug van de week waarin `d` valt (ISO: maandag = start).
export function mondayOf(d) {
  const date = new Date(d);
  const day = date.getUTCDay(); // 0=zo,1=ma,...
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

// Geeft de komende `count` weken terug (incl. de huidige), telkens met datum + team.
export function upcomingTeamWeeks(rotation, count = 3, fromDate = new Date()) {
  const startMonday = mondayOf(fromDate);
  const weeks = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startMonday + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i * 7);
    const dateStr = d.toISOString().slice(0, 10);
    weeks.push({ date: dateStr, who: teamForDate(rotation, dateStr) });
  }
  return weeks;
}
