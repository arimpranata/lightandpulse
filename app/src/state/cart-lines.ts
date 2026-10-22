import { eventAvailability, experienceAvailability, serviceAvailability, type BookedLookup } from '@/domain/availability';
import type { BaliEvent, CartLine, DriverService, Experience, Guide, Inventory } from '@/domain/types';

type NewLine = Omit<CartLine, 'id'>;

export function experienceLine(experience: Experience, date: string, time: string, participants: number): NewLine {
  return {
    itemType: 'experience',
    itemId: experience.id,
    supplierId: experience.vendorId,
    title: experience.title,
    date,
    time,
    participants,
    unitPrice: experience.price,
    pricing: 'person',
    cancellationPolicy: experience.cancellationPolicy,
  };
}

export function eventLine(event: BaliEvent, ticketTypeId: string, date: string, participants: number): NewLine {
  const ticket = event.ticketTypes.find((type) => type.id === ticketTypeId) ?? event.ticketTypes[0];
  return {
    itemType: 'event_ticket',
    itemId: event.id,
    variantId: ticket.id,
    supplierId: event.organizerId,
    title: `${event.title} · ${ticket.name}`,
    date,
    time: event.schedule.start,
    participants,
    unitPrice: ticket.price,
    pricing: 'person',
    cancellationPolicy: event.cancellationPolicy,
  };
}

export function guideLine(guide: Guide, date: string, participants: number): NewLine {
  return {
    itemType: 'guide',
    itemId: guide.id,
    supplierId: guide.vendorId,
    title: guide.name,
    date,
    time: '08:00',
    participants,
    unitPrice: guide.dayRate,
    pricing: 'service',
    cancellationPolicy: guide.cancellationPolicy,
  };
}

export function driverLine(driver: DriverService, date: string, participants: number): NewLine {
  return {
    itemType: 'driver',
    itemId: driver.id,
    supplierId: driver.operatorId,
    title: `${driver.driverName} · ${driver.vehicle.label}`,
    date,
    time: '08:00',
    participants,
    unitPrice: driver.dayRate,
    pricing: 'service',
    cancellationPolicy: driver.cancellationPolicy,
  };
}

/** Re-checks a cart line against current inventory (check_availability, spec §24). */
export function lineAvailable(line: CartLine, inventory: Inventory, booked: BookedLookup): boolean {
  switch (line.itemType) {
    case 'experience': {
      const experience = inventory.experiences.find((e) => e.id === line.itemId);
      return !!experience && experienceAvailability(experience, line.date, line.time, line.participants, booked).available;
    }
    case 'event_ticket': {
      const event = inventory.events.find((e) => e.id === line.itemId);
      return !!event && eventAvailability(event, line.date, line.variantId ?? '', line.participants, booked).available;
    }
    case 'guide': {
      const guide = inventory.guides.find((g) => g.id === line.itemId);
      return !!guide && serviceAvailability(guide, line.date, booked).available;
    }
    case 'driver': {
      const driver = inventory.drivers.find((x) => x.id === line.itemId);
      return !!driver && serviceAvailability(driver, line.date, booked).available;
    }
  }
}
