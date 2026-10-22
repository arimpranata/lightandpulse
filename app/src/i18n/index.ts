import { useMemo } from 'react';

import type { Reason } from '@/domain/types';
import { useApp, type Language } from '@/state/app-store';

import { en, type Dictionary } from './en';
import { id } from './id';

const DICTIONARIES: Record<Language, Dictionary> = { en, id };

const MONTHS: Record<Language, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
};

/** Replaces {name} placeholders with values. */
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

function groupDigits(value: number, separator: string): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function useI18n() {
  const { language } = useApp();
  return useMemo(() => {
    const d = DICTIONARIES[language];
    const money = (amount: number) =>
      language === 'id' ? `Rp${groupDigits(amount, '.')}` : `IDR ${groupDigits(amount, ',')}`;
    const date = (iso: string, withWeekday = true) => {
      const [y, m, day] = iso.split('-').map(Number);
      const weekday = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
      const text = `${day} ${MONTHS[language][m - 1]}`;
      return withWeekday ? `${d.weekdays[weekday]} ${text}` : text;
    };
    const duration = (minutes: number) =>
      minutes < 60
        ? format(d.common.minutes, { n: minutes })
        : minutes % 60 === 0
          ? `${minutes / 60} h`
          : format(d.common.hoursMinutes, { h: Math.floor(minutes / 60), m: minutes % 60 });
    const reasonPart = (reason: Reason): string => {
      switch (reason.type) {
        case 'preference':
          return format(d.reasons.preference, { pref: d.prefs[reason.key], value: reason.value });
        case 'near_base':
          return format(d.reasons.near_base, { region: d.regions[reason.region as keyof Dictionary['regions']] ?? reason.region });
        case 'available_at':
          return format(d.reasons.available_at, { time: reason.time });
        case 'well_rated':
          return format(d.reasons.well_rated, { average: reason.average.toFixed(1), count: reason.count });
        default:
          return d.reasons[reason.type];
      }
    };
    /** "Recommended because you chose Culture 90%, you are staying in Ubud and it is available at 15:00." */
    const explain = (reasons: Reason[], limit = 3): string | null => {
      const parts = reasons.slice(0, limit).map(reasonPart);
      if (parts.length === 0) return null;
      const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')}${d.reasons.and}${parts[parts.length - 1]}`;
      return `${d.reasons.prefix}${joined}.`;
    };
    const region = (regionId: string) => d.regions[regionId as keyof Dictionary['regions']] ?? regionId;
    return { d, language, f: format, money, date, duration, explain, region };
  }, [language]);
}
