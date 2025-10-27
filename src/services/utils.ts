
// src/services/utils.ts
export const uuid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

export const normName = (s: string) =>
  (s || '').replace(',', ' ').replace(/\s+/g, ' ').trim();

export const to24h = (t: string) => {
  if (!t) return '';
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return t;
  let [_, hh, mm, ap] = m as any; let H = parseInt(hh,10);
  if (ap) { ap = ap.toUpperCase(); if (ap==='PM'&&H!==12) H+=12; if (ap==='AM'&&H===12) H=0; }
  return `${String(H).padStart(2,'0')}:${mm}`;
};

export const timeToMinutes = (timeString: string): number => {
  if (!timeString || !timeString.includes(':')) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (totalMinutes: number): string => {
  if (isNaN(totalMinutes)) return '00:00';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const assertUniqueKeys = (keys: (string | number)[], hint: string) => {
  if (process.env.NODE_ENV === "production") return;
  const s = new Set(keys);
  if (s.size !== keys.length) {
    console.warn("Duplicate/unstable keys detected in", hint, "Keys:", keys);
  }
};
