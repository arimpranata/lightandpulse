import { weekday } from './time';
import type { BaliEvent, DriverService, Experience, Guide } from './types';

/**
 * Seats or services already taken, by item, date and time. Supplied by whatever
 * holds bookings (the local store today, the inventory service later).
 */
export type BookedLookup = (itemId: string, date: string, time?: string) => number;

export const NOTHING_BOOKED: BookedLookup = () => 0;

export type AvailabilityResult =
  | { available: true; remaining: number }
  | { available: false; reason: 'no_slot' | 'sold_out' | 'not_scheduled' | 'cancelled' | 'day_off' | 'already_booked' };

/** check_availability (spec §24) for an experience slot. */
export function experienceAvailability(
  experience: Experience,
  date: string,
  time: string,
  quantity: number,
  booked: BookedLookup = NOTHING_BOOKED,
): AvailabilityResult {
  if (!experience.slots.includes(time)) return { available: false, reason: 'no_slot' };
  const remaining = experience.capacity - booked(experience.id, date, time);
  if (remaining < quantity) return { available: false, reason: 'sold_out' };
  return { available: true, remaining };
}

/** check_availability for an event performance on a date. */
export function eventAvailability(
  event: BaliEvent,
  date: string,
  ticketTypeId: string,
  quantity: number,
  booked: BookedLookup = NOTHING_BOOKED,
): AvailabilityResult {
  if (event.status === 'cancelled') return { available: false, reason: 'cancelled' };
  if (event.status !== 'scheduled' || !event.schedule.weekdays.includes(weekday(date))) {
    return { available: false, reason: 'not_scheduled' };
  }
  const ticket = event.ticketTypes.find((type) => type.id === ticketTypeId);
  if (!ticket) return { available: false, reason: 'no_slot' };
  const remaining = ticket.capacityPerShow - booked(`${event.id}:${ticket.id}`, date);
  if (remaining < quantity) return { available: false, reason: 'sold_out' };
  return { available: true, remaining };
}

/** A guide or driver works one booking per day. */
export function serviceAvailability(
  service: Guide | DriverService,
  date: string,
  booked: BookedLookup = NOTHING_BOOKED,
): AvailabilityResult {
  if (service.daysOff.includes(weekday(date))) return { available: false, reason: 'day_off' };
  if (booked(service.id, date) > 0) return { available: false, reason: 'already_booked' };
  return { available: true, remaining: 1 };
}

/** First slot of an experience with room for the party on a date, if any. */
export function firstOpenSlot(
  experience: Experience,
  date: string,
  quantity: number,
  booked: BookedLookup = NOTHING_BOOKED,
): string | null {
  return experience.slots.find((slot) => experienceAvailability(experience, date, slot, quantity, booked).available) ?? null;
}
