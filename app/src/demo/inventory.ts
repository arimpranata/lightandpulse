import { parseOpeningHours, parseVisitMinutes } from '@/domain/time';
import type {
  BaliEvent,
  CancellationPolicy,
  Destination,
  DriverService,
  Experience,
  Guide,
  Money,
  PreferenceKey,
  Vendor,
} from '@/domain/types';
import type { Place } from '@/data/places';

/*
 * DEMO INVENTORY (spec §34: "Use realistic sample data but clearly mark it as
 * demo data"). Vendors, guides, drivers, prices, schedules and ratings below are
 * illustrative and not real offers. Every record carries `demo: true` and the UI
 * labels it. Replace with the inventory service once the backend exists.
 */

const idr = (amount: number): Money => ({ amount, currency: 'IDR' });
const flexible: CancellationPolicy = { freeCancellationHours: 24 };
const strict: CancellationPolicy = { freeCancellationHours: 72 };

/** Preference tags for each destination category. */
const CATEGORY_TAGS: Record<string, PreferenceKey[]> = {
  temple: ['spiritual', 'culture'],
  beach: ['beach'],
  nature: ['adventure'],
  waterfall: ['adventure'],
  culture: ['culture', 'arts'],
};

/** Adapts curated places (real destinations) to the Destination entity. */
export function toDestination(place: Place): Destination {
  return {
    id: place.id,
    name: place.name,
    region: place.region,
    area: place.area,
    category: place.category,
    tags: CATEGORY_TAGS[place.category] ?? ['culture'],
    coordinates: place.coordinates,
    description: place.description,
    highlights: place.highlights,
    hours: parseOpeningHours(place.hours),
    visitMinutes: Math.min(parseVisitMinutes(place.duration), 300),
    feeNote: place.fee,
  };
}

export const DEMO_VENDORS: Vendor[] = [
  { id: 'ven-ubud-arts', name: 'Ubud Batik Family Studio', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['ubud'], communityOwned: false, demo: true },
  { id: 'ven-dapur', name: 'Dapur Desa Cooking School', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['ubud'], communityOwned: false, demo: true },
  { id: 'ven-batur', name: 'Batur Mountain Guides Association', verificationStatus: 'verified', serviceTypes: ['experience', 'guide'], serviceArea: ['highlands'], communityOwned: true, demo: true },
  { id: 'ven-tirta', name: 'Tampaksiring Village Guides', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['ubud'], communityOwned: true, demo: true },
  { id: 'ven-wellness', name: 'Sawah Wellness House', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['ubud'], communityOwned: false, demo: true },
  { id: 'ven-amed', name: 'Amed Fishers Collective', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['east'], communityOwned: true, demo: true },
  { id: 'ven-penida', name: 'Penida Island Trips', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['nusa'], communityOwned: false, demo: true },
  { id: 'ven-surf', name: 'Seminyak Surf School', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['south'], communityOwned: false, demo: true },
  { id: 'ven-jatiluwih', name: 'Jatiluwih Cycle Co-op', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['highlands'], communityOwned: true, demo: true },
  { id: 'ven-sidemen', name: 'Sidemen Songket Weavers', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['east'], communityOwned: true, demo: true },
  { id: 'ven-jimbaran', name: 'Jimbaran Bay Grill', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['south'], communityOwned: false, demo: true },
  { id: 'ven-canggu', name: 'Canggu Live Music Nights', verificationStatus: 'pending', serviceTypes: ['experience'], serviceArea: ['south'], communityOwned: false, demo: true },
  { id: 'ven-celuk', name: 'Celuk Silver Studio', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['ubud'], communityOwned: false, demo: true },
  { id: 'ven-lovina', name: 'Lovina Boat Cooperative', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['north'], communityOwned: true, demo: true },
  { id: 'ven-chef', name: 'Meja Ubud Dining Room', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['ubud'], communityOwned: false, demo: true },
  { id: 'ven-village', name: 'Banjar Visitor Programme', verificationStatus: 'verified', serviceTypes: ['experience'], serviceArea: ['ubud'], communityOwned: true, demo: true },
  { id: 'ven-uluwatu-arts', name: 'Uluwatu Performing Arts Group', verificationStatus: 'verified', serviceTypes: ['event'], serviceArea: ['south'], communityOwned: true, demo: true },
  { id: 'ven-ubud-stage', name: 'Ubud Palace Stage Programme', verificationStatus: 'verified', serviceTypes: ['event'], serviceArea: ['ubud'], communityOwned: true, demo: true },
  { id: 'ven-batubulan', name: 'Batubulan Dance Sanggar', verificationStatus: 'verified', serviceTypes: ['event'], serviceArea: ['ubud'], communityOwned: true, demo: true },
  { id: 'ven-guides', name: 'Bali Lens Guide Network', verificationStatus: 'verified', serviceTypes: ['guide'], serviceArea: ['ubud', 'south', 'east', 'highlands', 'north', 'west'], communityOwned: false, demo: true },
  { id: 'ven-transport', name: 'Bali Lens Driver Partners', verificationStatus: 'verified', serviceTypes: ['transport'], serviceArea: ['ubud', 'south', 'east', 'highlands', 'north', 'west'], communityOwned: false, demo: true },
];

type ExperienceSeed = Omit<Experience, 'demo' | 'cancellationPolicy' | 'included' | 'meetingPoint'> &
  Partial<Pick<Experience, 'cancellationPolicy' | 'included' | 'meetingPoint'>>;

const experience = (seed: ExperienceSeed): Experience => ({
  cancellationPolicy: flexible,
  included: [],
  meetingPoint: 'Shared after booking',
  ...seed,
  demo: true,
});

export const DEMO_EXPERIENCES: Experience[] = [
  experience({
    id: 'exp-batik-ubud', vendorId: 'ven-ubud-arts', destinationIds: [], title: 'Batik painting class with a family studio',
    summary: 'Learn wax-resist batik from a family that has worked in Ubud for three generations, and take your piece home.',
    categories: ['arts', 'culture'], region: 'ubud', coordinates: { latitude: -8.5035, longitude: 115.2652 },
    durationMin: 180, slots: ['09:00', '14:00'], capacity: 8, price: idr(350_000), languages: ['en', 'id'],
    impactTags: ['family-run'], style: 0.2, rating: { average: 4.8, count: 126 },
    included: ['Fabric, wax and dyes', 'Tea and snacks'], meetingPoint: 'Studio on Jalan Hanoman, Ubud',
  }),
  experience({
    id: 'exp-cooking-ubud', vendorId: 'ven-dapur', destinationIds: [], title: 'Balinese cooking class and market walk',
    summary: 'Shop at the morning market, then cook seven dishes including base genep spice paste.',
    categories: ['culinary', 'culture'], region: 'ubud', coordinates: { latitude: -8.5121, longitude: 115.2586 },
    durationMin: 300, slots: ['08:00'], capacity: 12, price: idr(450_000), languages: ['en', 'id'],
    impactTags: ['family-run'], style: 0.3, rating: { average: 4.9, count: 342 },
    included: ['Market tour', 'Lunch of the dishes you cook', 'Recipe booklet'], meetingPoint: 'Ubud Market north entrance',
  }),
  experience({
    id: 'exp-batur-sunrise', vendorId: 'ven-batur', destinationIds: ['mount-batur'], title: 'Mount Batur sunrise trek with a licensed guide',
    summary: 'Climb the active volcano before dawn with an association guide and watch sunrise over Lake Batur.',
    categories: ['adventure'], region: 'highlands', coordinates: { latitude: -8.2422, longitude: 115.375 },
    durationMin: 360, slots: ['03:30'], capacity: 10, price: idr(650_000), languages: ['en', 'id'],
    impactTags: ['local-guide', 'community-owned'], style: 0.3, rating: { average: 4.7, count: 512 },
    included: ['Licensed guide', 'Headlamp', 'Breakfast at the summit'], cancellationPolicy: strict,
  }),
  experience({
    id: 'exp-melukat-tirta', vendorId: 'ven-tirta', destinationIds: ['tirta-empul'], title: 'Water purification visit with a village guide',
    summary: 'Visit Tirta Empul with a guide from the village who explains the melukat ritual and how visitors may take part.',
    categories: ['spiritual', 'culture'], region: 'ubud', coordinates: { latitude: -8.4153, longitude: 115.3153 },
    durationMin: 120, slots: ['08:00', '10:00'], capacity: 10, price: idr(300_000), languages: ['en', 'id'],
    impactTags: ['local-guide', 'community-owned'], style: 0.2, rating: { average: 4.8, count: 211 },
    included: ['Village guide', 'Sarong and sash', 'Temple entry'], meetingPoint: 'Tirta Empul car park',
  }),
  experience({
    id: 'exp-yoga-sawah', vendorId: 'ven-wellness', destinationIds: [], title: 'Morning yoga beside the rice fields',
    summary: 'A gentle 90-minute flow on an open-air deck overlooking the sawah, suitable for beginners.',
    categories: ['wellbeing'], region: 'ubud', coordinates: { latitude: -8.4985, longitude: 115.256 },
    durationMin: 90, slots: ['07:00', '16:30'], capacity: 14, price: idr(200_000), languages: ['en'],
    impactTags: [], style: 0.5, rating: { average: 4.6, count: 88 }, included: ['Mat and props', 'Herbal tea'],
  }),
  experience({
    id: 'exp-boreh-spa', vendorId: 'ven-wellness', destinationIds: [], title: 'Traditional Balinese massage with boreh scrub',
    summary: 'A two-hour treatment using a warming spice scrub traditionally made by rice farmers.',
    categories: ['wellbeing'], region: 'ubud', coordinates: { latitude: -8.51, longitude: 115.264 },
    durationMin: 120, slots: ['10:00', '14:00', '16:00'], capacity: 6, price: idr(400_000), languages: ['en', 'id'],
    impactTags: [], style: 0.6, rating: { average: 4.7, count: 154 },
  }),
  experience({
    id: 'exp-amed-snorkel', vendorId: 'ven-amed', destinationIds: ['amed'], title: 'Snorkelling at Jemeluk Bay with a local fisher',
    summary: 'Paddle out by jukung outrigger with a fisher from the collective to the coral gardens off Jemeluk.',
    categories: ['beach', 'adventure'], region: 'east', coordinates: { latitude: -8.3366, longitude: 115.662 },
    durationMin: 180, slots: ['08:00', '13:00'], capacity: 6, price: idr(300_000), languages: ['en', 'id'],
    impactTags: ['community-owned', 'low-impact'], style: 0.2, rating: { average: 4.9, count: 73 },
    included: ['Jukung boat', 'Mask and fins', 'Reef-safe sunscreen'],
  }),
  experience({
    id: 'exp-penida-west', vendorId: 'ven-penida', destinationIds: ['kelingking'], title: 'Nusa Penida west coast day trip',
    summary: 'Fast boat from Sanur and a driver for Kelingking, Broken Beach and Angel’s Billabong.',
    categories: ['beach', 'adventure'], region: 'nusa', coordinates: { latitude: -8.7503, longitude: 115.4746 },
    durationMin: 600, slots: ['07:00'], capacity: 12, price: idr(1_100_000), languages: ['en'],
    impactTags: [], style: 0.5, rating: { average: 4.4, count: 402 },
    included: ['Return fast boat', 'Island driver', 'Lunch'], cancellationPolicy: strict,
  }),
  experience({
    id: 'exp-surf-seminyak', vendorId: 'ven-surf', destinationIds: ['seminyak'], title: 'Beginner surf lesson',
    summary: 'Two hours in the whitewater with a certified instructor; boards and rash vests provided.',
    categories: ['beach', 'adventure'], region: 'south', coordinates: { latitude: -8.6913, longitude: 115.1563 },
    durationMin: 120, slots: ['08:00', '10:00', '15:00'], capacity: 8, price: idr(450_000), languages: ['en', 'id'],
    impactTags: [], style: 0.5, rating: { average: 4.6, count: 230 },
  }),
  experience({
    id: 'exp-jatiluwih-cycle', vendorId: 'ven-jatiluwih', destinationIds: ['jatiluwih'], title: 'Cycling the Jatiluwih rice terraces',
    summary: 'A mostly downhill ride through the UNESCO-listed subak landscape with a farmer-led stop.',
    categories: ['adventure', 'culture'], region: 'highlands', coordinates: { latitude: -8.37, longitude: 115.1316 },
    durationMin: 180, slots: ['08:00', '13:30'], capacity: 10, price: idr(500_000), languages: ['en', 'id'],
    impactTags: ['community-owned', 'low-impact'], style: 0.3, rating: { average: 4.8, count: 97 },
  }),
  experience({
    id: 'exp-songket-sidemen', vendorId: 'ven-sidemen', destinationIds: ['sidemen'], title: 'Songket weaving workshop',
    summary: 'Try a traditional backstrap loom with weavers in Sidemen and learn how songket patterns are read.',
    categories: ['arts', 'culture'], region: 'east', coordinates: { latitude: -8.4767, longitude: 115.4435 },
    durationMin: 150, slots: ['09:00', '13:00'], capacity: 6, price: idr(250_000), languages: ['en', 'id'],
    impactTags: ['community-owned'], style: 0.1, rating: { average: 4.9, count: 41 },
  }),
  experience({
    id: 'exp-jimbaran-dinner', vendorId: 'ven-jimbaran', destinationIds: [], title: 'Sunset seafood dinner on Jimbaran Bay',
    summary: 'Grilled catch of the day at tables on the sand as the sun sets over the bay.',
    categories: ['culinary', 'beach'], region: 'south', coordinates: { latitude: -8.7744, longitude: 115.1667 },
    durationMin: 120, slots: ['17:30'], capacity: 40, price: idr(550_000), languages: ['en', 'id'],
    impactTags: [], style: 0.6, rating: { average: 4.3, count: 610 },
  }),
  experience({
    id: 'exp-canggu-music', vendorId: 'ven-canggu', destinationIds: [], title: 'Canggu live music night with a host',
    summary: 'A hosted evening across two live-music venues in Canggu, with a ride back arranged.',
    categories: ['nightlife'], region: 'south', coordinates: { latitude: -8.6478, longitude: 115.1385 },
    durationMin: 180, slots: ['20:00'], capacity: 12, price: idr(300_000), languages: ['en'],
    impactTags: [], style: 0.6, rating: { average: 4.2, count: 18 },
  }),
  experience({
    id: 'exp-celuk-silver', vendorId: 'ven-celuk', destinationIds: [], title: 'Silver jewellery making in Celuk',
    summary: 'Design and craft a ring or pendant with a Celuk silversmith.',
    categories: ['arts'], region: 'ubud', coordinates: { latitude: -8.6094, longitude: 115.2725 },
    durationMin: 180, slots: ['09:00', '13:00'], capacity: 8, price: idr(400_000), languages: ['en', 'id'],
    impactTags: ['family-run'], style: 0.4, rating: { average: 4.7, count: 64 },
  }),
  experience({
    id: 'exp-lovina-dolphins', vendorId: 'ven-lovina', destinationIds: [], title: 'Dawn boat trip off Lovina',
    summary: 'Head out at first light with a cooperative boatman. Dolphin sightings are common but never guaranteed.',
    categories: ['adventure', 'beach'], region: 'north', coordinates: { latitude: -8.1581, longitude: 115.0236 },
    durationMin: 150, slots: ['06:00'], capacity: 6, price: idr(250_000), languages: ['en', 'id'],
    impactTags: ['community-owned'], style: 0.2, rating: { average: 4.1, count: 139 },
  }),
  experience({
    id: 'exp-tasting-ubud', vendorId: 'ven-chef', destinationIds: [], title: 'Balinese tasting menu in Ubud',
    summary: 'An eight-course dinner of village recipes reworked by a Balinese chef, paired with local arak and jamu.',
    categories: ['culinary'], region: 'ubud', coordinates: { latitude: -8.5065, longitude: 115.26 },
    durationMin: 150, slots: ['19:00'], capacity: 20, price: idr(1_600_000), languages: ['en', 'id'],
    impactTags: [], style: 0.95, rating: { average: 4.9, count: 37 }, cancellationPolicy: strict,
  }),
  experience({
    id: 'exp-village-ceremony', vendorId: 'ven-village', destinationIds: [], title: 'Village temple ceremony visit',
    summary: 'Accompany a banjar member to a village temple ceremony as an invited guest.',
    categories: ['spiritual', 'culture'], region: 'ubud', coordinates: { latitude: -8.52, longitude: 115.27 },
    durationMin: 150, slots: ['15:00'], capacity: 4, price: idr(350_000), languages: ['en', 'id'],
    impactTags: ['community-owned'], style: 0.1, rating: { average: 4.9, count: 22 },
  }),
];

export const DEMO_EVENTS: BaliEvent[] = [
  {
    id: 'evt-kecak-uluwatu', organizerId: 'ven-uluwatu-arts', title: 'Kecak fire dance at Uluwatu',
    summary: 'The Ramayana told by a circle of chanting performers on the clifftop as the sun sets.',
    categories: ['culture', 'arts'],
    venue: { name: 'Uluwatu clifftop amphitheatre', destinationId: 'uluwatu', region: 'south', coordinates: { latitude: -8.8291, longitude: 115.0849 } },
    schedule: { weekdays: [0, 1, 2, 3, 4, 5, 6], start: '18:00', durationMin: 60 },
    program: [{ time: '17:30', title: 'Seating opens' }, { time: '18:00', title: 'Kecak and fire dance' }],
    ticketTypes: [{ id: 'regular', name: 'Regular seat', price: idr(150_000), capacityPerShow: 400 }],
    status: 'scheduled', rating: { average: 4.6, count: 1280 }, cancellationPolicy: flexible, demo: true,
  },
  {
    id: 'evt-legong-ubud', organizerId: 'ven-ubud-stage', title: 'Legong dance at Ubud Palace',
    summary: 'Classical Legong with a full gamelan orchestra in the palace courtyard.',
    categories: ['culture', 'arts'],
    venue: { name: 'Puri Saren courtyard', destinationId: 'ubud-palace', region: 'ubud', coordinates: { latitude: -8.5069, longitude: 115.2625 } },
    schedule: { weekdays: [1, 3, 5, 6], start: '19:30', durationMin: 90 },
    program: [{ time: '19:30', title: 'Gamelan overture' }, { time: '19:45', title: 'Legong Keraton' }],
    ticketTypes: [{ id: 'regular', name: 'Regular seat', price: idr(100_000), capacityPerShow: 200 }],
    status: 'scheduled', rating: { average: 4.5, count: 640 }, cancellationPolicy: flexible, demo: true,
  },
  {
    id: 'evt-barong-batubulan', organizerId: 'ven-batubulan', title: 'Barong and Kris dance, Batubulan',
    summary: 'The morning performance of the battle between Barong and Rangda.',
    categories: ['culture', 'spiritual'],
    venue: { name: 'Batubulan stage', region: 'ubud', coordinates: { latitude: -8.628, longitude: 115.2617 } },
    schedule: { weekdays: [0, 1, 2, 3, 4, 5, 6], start: '09:30', durationMin: 60 },
    program: [{ time: '09:30', title: 'Barong and Kris dance' }],
    ticketTypes: [{ id: 'regular', name: 'Regular seat', price: idr(100_000), capacityPerShow: 250 }],
    status: 'scheduled', rating: { average: 4.3, count: 410 }, cancellationPolicy: flexible, demo: true,
  },
];

export const DEMO_GUIDES: Guide[] = [
  { id: 'gd-wayan', name: 'Wayan S.', vendorId: 'ven-guides', languages: ['en', 'id'], specialties: ['culture', 'spiritual'], areas: ['ubud', 'highlands'], verified: true, rating: { average: 4.9, count: 188 }, dayRate: idr(750_000), daysOff: [0], bio: 'Grew up in a Gianyar village; specialises in temple etiquette and ceremonies.', cancellationPolicy: flexible, demo: true },
  { id: 'gd-made', name: 'Made A.', vendorId: 'ven-guides', languages: ['en', 'id', 'ja'], specialties: ['adventure', 'culture'], areas: ['highlands', 'east'], verified: true, rating: { average: 4.8, count: 96 }, dayRate: idr(800_000), daysOff: [2], bio: 'Trekking and volcano guide with first-aid certification.', cancellationPolicy: flexible, demo: true },
  { id: 'gd-nyoman', name: 'Nyoman K.', vendorId: 'ven-guides', languages: ['en', 'id', 'de'], specialties: ['arts', 'culinary'], areas: ['ubud', 'south'], verified: true, rating: { average: 4.7, count: 64 }, dayRate: idr(700_000), daysOff: [3], bio: 'Former art-market trader who knows Ubud’s studios and warungs.', cancellationPolicy: flexible, demo: true },
  { id: 'gd-ketut', name: 'Ketut P.', vendorId: 'ven-guides', languages: ['en', 'id', 'fr'], specialties: ['spiritual', 'culture'], areas: ['east', 'ubud'], verified: true, rating: { average: 4.9, count: 52 }, dayRate: idr(850_000), daysOff: [5], bio: 'Leads visits to the temples of East Bali and Sidemen valley.', cancellationPolicy: flexible, demo: true },
  { id: 'gd-putu', name: 'Putu D.', vendorId: 'ven-guides', languages: ['en', 'id', 'zh'], specialties: ['beach', 'nightlife'], areas: ['south', 'nusa'], verified: true, rating: { average: 4.6, count: 120 }, dayRate: idr(650_000), daysOff: [1], bio: 'South Bali local; beaches, surf spots and evening plans.', cancellationPolicy: flexible, demo: true },
  { id: 'gd-komang', name: 'Komang R.', vendorId: 'ven-guides', languages: ['en', 'id', 'es'], specialties: ['wellbeing', 'culture'], areas: ['ubud'], verified: true, rating: { average: 4.8, count: 33 }, dayRate: idr(700_000), daysOff: [4], bio: 'Yoga teacher and healer’s granddaughter; wellness days around Ubud.', cancellationPolicy: flexible, demo: true },
  { id: 'gd-gede', name: 'Gede T.', vendorId: 'ven-guides', languages: ['id'], specialties: ['culture'], areas: ['north', 'west'], verified: false, rating: { average: 4.5, count: 6 }, dayRate: idr(500_000), daysOff: [], bio: 'Verification in progress.', cancellationPolicy: flexible, demo: true },
];

const allAreas = ['ubud', 'south', 'east', 'highlands', 'north', 'west'];

export const DEMO_DRIVERS: DriverService[] = [
  { id: 'dr-avanza', operatorId: 'ven-transport', driverName: 'Agus', vehicle: { id: 'veh-1', label: 'Toyota Avanza', vehicleClass: 'mpv', seats: 6, transmission: 'manual', lowEmission: false }, serviceType: 'charter-day', areas: allAreas, languages: ['en', 'id'], verified: true, rating: { average: 4.8, count: 310 }, dayRate: idr(650_000), daysOff: [0], cancellationPolicy: flexible, demo: true },
  { id: 'dr-innova', operatorId: 'ven-transport', driverName: 'Dewa', vehicle: { id: 'veh-2', label: 'Toyota Innova Zenix', vehicleClass: 'premium-mpv', seats: 6, transmission: 'automatic', lowEmission: false }, serviceType: 'charter-day', areas: allAreas, languages: ['en', 'id', 'ja'], verified: true, rating: { average: 4.9, count: 205 }, dayRate: idr(950_000), daysOff: [3], cancellationPolicy: flexible, demo: true },
  { id: 'dr-hiace', operatorId: 'ven-transport', driverName: 'Rai', vehicle: { id: 'veh-3', label: 'Toyota HiAce', vehicleClass: 'van', seats: 12, transmission: 'manual', lowEmission: false }, serviceType: 'charter-day', areas: allAreas, languages: ['en', 'id'], verified: true, rating: { average: 4.7, count: 140 }, dayRate: idr(1_300_000), daysOff: [], cancellationPolicy: flexible, demo: true },
  { id: 'dr-brio', operatorId: 'ven-transport', driverName: 'Yoga', vehicle: { id: 'veh-4', label: 'Honda Brio', vehicleClass: 'compact', seats: 4, transmission: 'automatic', lowEmission: false }, serviceType: 'charter-day', areas: ['ubud', 'south'], languages: ['en', 'id'], verified: true, rating: { average: 4.6, count: 88 }, dayRate: idr(550_000), daysOff: [6], cancellationPolicy: flexible, demo: true },
  { id: 'dr-ev', operatorId: 'ven-transport', driverName: 'Surya', vehicle: { id: 'veh-5', label: 'Hyundai Ioniq 5 (electric)', vehicleClass: 'electric', seats: 4, transmission: 'automatic', lowEmission: true }, serviceType: 'charter-day', areas: ['ubud', 'south', 'east'], languages: ['en', 'id'], verified: true, rating: { average: 4.9, count: 47 }, dayRate: idr(900_000), daysOff: [1], cancellationPolicy: flexible, demo: true },
];
