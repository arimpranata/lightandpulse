import type { OpeningHours } from './types';

/** "HH:MM" → minutes after midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Minutes after midnight → "HH:MM". */
export function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Rounds up to the next multiple of `step` minutes. */
export function roundUp(minutes: number, step = 15): number {
  return Math.ceil(minutes / step) * step;
}

function clockToMinutes(text: string): number | null {
  const match = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === 'pm' && hours !== 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Parses the display strings used in destination data, e.g. "7:00 am – 7:00 pm",
 * "Open 24 hours" or "Daylight". Anything else is reported as unknown rather than guessed.
 */
export function parseOpeningHours(text: string): OpeningHours {
  const normalized = text.trim().toLowerCase();
  if (normalized === 'open 24 hours') return { open: 0, close: 24 * 60 };
  if (normalized === 'daylight') return { open: 6 * 60, close: 18 * 60 };
  const parts = text.split(/\s*[–-]\s*/);
  if (parts.length === 2) {
    const open = clockToMinutes(parts[0]);
    const close = clockToMinutes(parts[1]);
    if (open !== null && close !== null && close > open) return { open, close };
  }
  return 'unknown';
}

/** Parses visit lengths such as "2 hours", "1.5 hours", "1–2 hours", "Half day". */
export function parseVisitMinutes(text: string): number {
  const normalized = text.trim().toLowerCase();
  if (normalized.startsWith('half day')) return 240;
  if (normalized.includes('full day') || normalized.includes('day trip')) return 480;
  if (/\bdays?\b/.test(normalized)) return 480;
  const hours = normalized.match(/(\d+(?:\.\d+)?)/);
  if (hours && normalized.includes('hour')) return Math.round(Number(hours[1]) * 60);
  return 120;
}

// ---------------------------------------------------------------------------
// Calendar dates (YYYY-MM-DD, treated as local Bali dates without time zones)

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const value = new Date(Date.UTC(y, m - 1, d + days));
  return value.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Hours between now and a date + "HH:MM" start, using UTC+8 (Bali time). */
export function hoursUntil(date: string, time: string, now: Date = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const startUtc = Date.UTC(y, m - 1, d) + (toMinutes(time) - 8 * 60) * 60_000;
  return (startUtc - now.getTime()) / 3_600_000;
}
