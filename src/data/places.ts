import type { IconName } from '@/components/icon';

export type CategoryId = 'temple' | 'beach' | 'nature' | 'waterfall' | 'culture';

export type Category = {
  id: CategoryId;
  label: string;
  icon: IconName;
  /** Two-stop gradient used for artwork on cards in this category. */
  gradient: readonly [string, string];
};

export const CATEGORIES: readonly Category[] = [
  { id: 'temple', label: 'Temples', icon: 'temple', gradient: ['#B4532A', '#E9A23B'] },
  { id: 'beach', label: 'Beaches', icon: 'beach', gradient: ['#0F6E84', '#4FC1C9'] },
  { id: 'nature', label: 'Nature', icon: 'nature', gradient: ['#1F5E3B', '#7FB069'] },
  { id: 'waterfall', label: 'Waterfalls', icon: 'waterfall', gradient: ['#1D4E6B', '#5BA4A4'] },
  { id: 'culture', label: 'Culture', icon: 'culture', gradient: ['#6B2D5C', '#D9622B'] },
];

export type RegionId = 'south' | 'ubud' | 'highlands' | 'east' | 'north' | 'west' | 'nusa';

export const REGIONS: Record<RegionId, string> = {
  south: 'South Bali',
  ubud: 'Ubud & Gianyar',
  highlands: 'Central Highlands',
  east: 'East Bali',
  north: 'North Bali',
  west: 'Tabanan & West',
  nusa: 'Nusa Islands',
};

export type Place = {
  id: string;
  name: string;
  /** Short line shown under the name on cards. */
  tagline: string;
  category: CategoryId;
  region: RegionId;
  area: string;
  description: string;
  highlights: string[];
  tips: string[];
  bestTime: string;
  hours: string;
  /** Indicative entrance fee for international visitors. */
  fee: string;
  duration: string;
  coordinates: { latitude: number; longitude: number };
  featured?: boolean;
};

export const PLACES: readonly Place[] = [
  {
    id: 'tanah-lot',
    name: 'Tanah Lot',
    tagline: 'Sea temple on a rock at sunset',
    category: 'temple',
    region: 'west',
    area: 'Beraban, Tabanan',
    description:
      'One of Bali’s six key sea temples, Pura Tanah Lot sits on a rocky outcrop that becomes an island at high tide. Built in the 16th century and dedicated to the sea god Dewa Baruna, it is the island’s most photographed sunset spot.',
    highlights: [
      'Sunset silhouettes from the clifftop cafés',
      'Holy freshwater spring at the base of the rock',
      'Pura Batu Bolong, a second temple on a natural arch',
    ],
    tips: [
      'Arrive by 4:30 pm to find a good sunset viewpoint.',
      'At low tide you can walk to the base and receive a blessing.',
      'Only worshippers may climb into the temple itself.',
    ],
    bestTime: 'Late afternoon, low tide',
    hours: '7:00 am – 7:00 pm',
    fee: '≈ IDR 75,000',
    duration: '2 hours',
    coordinates: { latitude: -8.6212, longitude: 115.0868 },
    featured: true,
  },
  {
    id: 'uluwatu',
    name: 'Uluwatu Temple',
    tagline: 'Clifftop temple and Kecak fire dance',
    category: 'temple',
    region: 'south',
    area: 'Pecatu, Bukit Peninsula',
    description:
      'Pura Luhur Uluwatu is perched on a 70-metre cliff above the Indian Ocean. Each evening the amphitheatre beside it hosts the Kecak fire dance, a chanted retelling of the Ramayana performed against the sunset.',
    highlights: [
      'Kecak dance at sunset (separate ticket)',
      'Cliff-edge walking paths with ocean views',
      'Surf breaks visible far below',
    ],
    tips: [
      'Resident monkeys grab sunglasses, phones and hats — keep them packed away.',
      'Kecak tickets sell out in high season; buy early in the afternoon.',
      'Sarongs are provided at the entrance.',
    ],
    bestTime: '4:00 pm – sunset',
    hours: '7:00 am – 7:00 pm',
    fee: '≈ IDR 50,000 (Kecak extra)',
    duration: '3 hours',
    coordinates: { latitude: -8.8291, longitude: 115.0849 },
    featured: true,
  },
  {
    id: 'tirta-empul',
    name: 'Tirta Empul',
    tagline: 'Holy spring water temple',
    category: 'temple',
    region: 'ubud',
    area: 'Tampaksiring, Gianyar',
    description:
      'Founded over a thousand years ago around a natural spring, Tirta Empul is where Balinese Hindus come for melukat, a ritual purification under a row of carved water spouts.',
    highlights: [
      'Purification pools fed by the sacred spring',
      'Koi ponds and carved shrines',
      'Village market at the exit',
    ],
    tips: [
      'Bring a change of clothes if you plan to join the purification.',
      'Follow the order of the spouts and skip those reserved for funerary rites.',
      'Early morning is quieter and more reverent.',
    ],
    bestTime: 'Early morning',
    hours: '8:00 am – 6:00 pm',
    fee: '≈ IDR 75,000',
    duration: '1.5 hours',
    coordinates: { latitude: -8.4153, longitude: 115.3153 },
  },
  {
    id: 'lempuyang',
    name: 'Lempuyang Temple',
    tagline: 'The Gates of Heaven',
    category: 'temple',
    region: 'east',
    area: 'Karangasem',
    description:
      'Pura Lempuyang Luhur is one of Bali’s oldest and most sacred temples. Its split gateway frames Mount Agung, and a long stairway continues up through forest to six more temples near the summit.',
    highlights: [
      'Candi bentar gate framing Mount Agung',
      'Seven-temple pilgrimage climb (about 1,700 steps)',
      'Sweeping views of East Bali',
    ],
    tips: [
      'Photo queues at the gate can exceed two hours — arrive before sunrise.',
      'The famous “reflection” is a mirror trick; the real view is just as good.',
      'A shuttle runs from the car park to the main gate.',
    ],
    bestTime: 'Sunrise on a clear day',
    hours: '7:00 am – 5:00 pm',
    fee: 'Donation + shuttle',
    duration: '3 hours',
    coordinates: { latitude: -8.3906, longitude: 115.6313 },
    featured: true,
  },
  {
    id: 'ulun-danu',
    name: 'Ulun Danu Beratan',
    tagline: 'Lake temple in the misty highlands',
    category: 'temple',
    region: 'highlands',
    area: 'Bedugul, Tabanan',
    description:
      'Dedicated to the lake goddess Dewi Danu, this 17th-century water temple seems to float on Lake Beratan. Cool air and mountain mist make it a refreshing break from the coast.',
    highlights: ['Eleven-tiered meru shrine on the water', 'Landscaped gardens', 'Lake boat rides'],
    tips: [
      'Bring a light jacket — it is noticeably cooler at 1,200 m.',
      'Combine with the Bedugul fruit market and Jatiluwih.',
    ],
    bestTime: 'Morning, before clouds roll in',
    hours: '7:00 am – 6:00 pm',
    fee: '≈ IDR 75,000',
    duration: '1.5 hours',
    coordinates: { latitude: -8.2752, longitude: 115.1668 },
  },
  {
    id: 'besakih',
    name: 'Besakih Temple',
    tagline: 'The Mother Temple of Bali',
    category: 'temple',
    region: 'east',
    area: 'Slopes of Mount Agung',
    description:
      'Pura Besakih is a complex of more than 80 temples climbing the slopes of Mount Agung, Bali’s highest and holiest volcano. It is the spiritual centre of Balinese Hinduism.',
    highlights: ['Penataran Agung, the central temple', 'Views over terraced shrines', 'Frequent ceremonies'],
    tips: [
      'Use the official visitor centre; ignore unofficial “guides” at the gate.',
      'Some inner courtyards are closed to visitors during ceremonies.',
    ],
    bestTime: 'Morning',
    hours: '8:00 am – 5:00 pm',
    fee: '≈ IDR 60,000',
    duration: '2 hours',
    coordinates: { latitude: -8.3742, longitude: 115.4511 },
  },
  {
    id: 'tegallalang',
    name: 'Tegallalang Rice Terraces',
    tagline: 'Iconic green terraces north of Ubud',
    category: 'nature',
    region: 'ubud',
    area: 'Tegallalang, Gianyar',
    description:
      'Steep, sculpted rice terraces irrigated by the ancient subak system. Paths wind down through the valley, with jungle swings and cafés along the rim.',
    highlights: ['Valley walking trails', 'Jungle swings', 'Rim-side cafés'],
    tips: [
      'Arrive before 8 am for soft light and few crowds.',
      'Farmers collect small donations at bridges — keep coins handy.',
      'Wear shoes with grip; paths are muddy after rain.',
    ],
    bestTime: 'Sunrise to 9:00 am',
    hours: '8:00 am – 6:00 pm',
    fee: 'Small entry + donations',
    duration: '1.5 hours',
    coordinates: { latitude: -8.4312, longitude: 115.2793 },
    featured: true,
  },
  {
    id: 'jatiluwih',
    name: 'Jatiluwih Rice Terraces',
    tagline: 'UNESCO-listed subak landscape',
    category: 'nature',
    region: 'highlands',
    area: 'Penebel, Tabanan',
    description:
      'Over 600 hectares of terraces beneath Mount Batukaru, recognised by UNESCO as part of Bali’s cultural landscape. Far larger and calmer than Tegallalang.',
    highlights: ['Marked walking loops of 1–3 hours', 'Mount Batukaru backdrop', 'Warungs serving red rice'],
    tips: ['Try the local red rice tea.', 'Pair with Ulun Danu Beratan in a highlands day trip.'],
    bestTime: 'Morning, Feb–Apr for green fields',
    hours: '7:00 am – 6:00 pm',
    fee: '≈ IDR 50,000',
    duration: '2 hours',
    coordinates: { latitude: -8.37, longitude: 115.1316 },
  },
  {
    id: 'monkey-forest',
    name: 'Sacred Monkey Forest',
    tagline: 'Jungle temples and 1,200 macaques',
    category: 'nature',
    region: 'ubud',
    area: 'Ubud Town',
    description:
      'A sanctuary of ancient banyan trees and moss-covered temples in the heart of Ubud, home to a large troop of long-tailed macaques.',
    highlights: ['Pura Dalem Agung temple', 'Dragon bridge over the ravine', 'Giant banyan trees'],
    tips: [
      'Do not carry food or plastic bags.',
      'Avoid eye contact and let monkeys come to you — never feed them.',
    ],
    bestTime: 'Morning',
    hours: '9:00 am – 6:00 pm',
    fee: '≈ IDR 80,000',
    duration: '1.5 hours',
    coordinates: { latitude: -8.5188, longitude: 115.2585 },
  },
  {
    id: 'mount-batur',
    name: 'Mount Batur Sunrise',
    tagline: 'Hike an active volcano before dawn',
    category: 'nature',
    region: 'highlands',
    area: 'Kintamani, Bangli',
    description:
      'A two-hour pre-dawn climb up a 1,717 m active volcano rewards hikers with sunrise over Lake Batur and Mount Agung, plus breakfast cooked in volcanic steam.',
    highlights: ['Sunrise above the clouds', 'Steam vents at the crater rim', 'Natural hot springs nearby'],
    tips: [
      'Hotel pickups are around 2:00 am from Ubud.',
      'A licensed local guide is required on the mountain.',
      'Bring a warm layer, a headlamp and proper shoes.',
    ],
    bestTime: 'Dry season, 4:00 am start',
    hours: 'Treks start 3:30–4:00 am',
    fee: 'Guided tour required',
    duration: '6 hours',
    coordinates: { latitude: -8.2422, longitude: 115.375 },
    featured: true,
  },
  {
    id: 'campuhan',
    name: 'Campuhan Ridge Walk',
    tagline: 'Easy ridge trail above two rivers',
    category: 'nature',
    region: 'ubud',
    area: 'Ubud Town',
    description:
      'A paved two-kilometre path along a grassy ridge between two river valleys, starting near Pura Gunung Lebah. A gentle, free introduction to Ubud’s countryside.',
    highlights: ['Valley views over palm forest', 'Cafés in Bangkiang Sidem village', 'Ancient riverside temple at the trailhead'],
    tips: ['Go at sunrise or late afternoon — there is little shade.', 'Carry water.'],
    bestTime: 'Sunrise or 4:00 pm',
    hours: 'Open 24 hours',
    fee: 'Free',
    duration: '1–2 hours',
    coordinates: { latitude: -8.5036, longitude: 115.2547 },
  },
  {
    id: 'tukad-cepung',
    name: 'Tukad Cepung Waterfall',
    tagline: 'Light beams inside a canyon cave',
    category: 'waterfall',
    region: 'highlands',
    area: 'Tembuku, Bangli',
    description:
      'A waterfall hidden inside a narrow canyon, where shafts of sunlight pour through a gap in the rock on clear mornings.',
    highlights: ['Sunbeams through the cave roof', 'Short jungle stair descent', 'Shallow river wade'],
    tips: ['Arrive 9–10 am for the light beams.', 'Expect to get wet; bring a dry bag.'],
    bestTime: '9:00 – 10:30 am',
    hours: '8:00 am – 5:00 pm',
    fee: '≈ IDR 20,000',
    duration: '1 hour',
    coordinates: { latitude: -8.4365, longitude: 115.3878 },
  },
  {
    id: 'tegenungan',
    name: 'Tegenungan Waterfall',
    tagline: 'Powerful falls close to Ubud',
    category: 'waterfall',
    region: 'ubud',
    area: 'Kemenuh, Gianyar',
    description:
      'A wide, thundering waterfall 20 minutes from Ubud, easily reached by a staircase into a jungle valley with swimming at the base when the river is calm.',
    highlights: ['Viewing decks above the falls', 'Swimming pool at the base', 'Easy access from Ubud'],
    tips: ['Visit early to beat tour groups.', 'Skip swimming after heavy rain.'],
    bestTime: 'Early morning',
    hours: '7:00 am – 6:00 pm',
    fee: '≈ IDR 20,000',
    duration: '1 hour',
    coordinates: { latitude: -8.5754, longitude: 115.2898 },
  },
  {
    id: 'sekumpul',
    name: 'Sekumpul Waterfall',
    tagline: 'Bali’s most dramatic cascade',
    category: 'waterfall',
    region: 'north',
    area: 'Sawan, Buleleng',
    description:
      'A cluster of seven waterfalls dropping 80 m into a lush amphitheatre in North Bali. The descent through clove and coffee plantations is part of the adventure.',
    highlights: ['Seven falls in one valley', 'Viewpoint over the whole gorge', 'Hike through plantations'],
    tips: ['A local guide is required for the lower trail.', 'Allow a full day from the south.'],
    bestTime: 'Dry season mornings',
    hours: '7:00 am – 5:00 pm',
    fee: 'Guide fee applies',
    duration: '3 hours',
    coordinates: { latitude: -8.1736, longitude: 115.1823 },
  },
  {
    id: 'kelingking',
    name: 'Kelingking Beach',
    tagline: 'The T-Rex cliff on Nusa Penida',
    category: 'beach',
    region: 'nusa',
    area: 'Nusa Penida',
    description:
      'A headland shaped like a dinosaur’s head guards a perfect white-sand cove. The clifftop view is unforgettable; the steep scramble down is for the fit and sure-footed.',
    highlights: ['Clifftop viewpoint', 'Secluded white-sand cove', 'Manta Point snorkelling nearby'],
    tips: [
      'Fast boats run from Sanur (about 45 minutes).',
      'Strong currents — swimming at the cove is not advised.',
      'Allow 1 hour each way if hiking down.',
    ],
    bestTime: 'Morning, calm seas',
    hours: 'Daylight',
    fee: 'Island levy + parking',
    duration: 'Full day trip',
    coordinates: { latitude: -8.7503, longitude: 115.4746 },
    featured: true,
  },
  {
    id: 'seminyak',
    name: 'Seminyak Beach',
    tagline: 'Sunsets, beach clubs and boutiques',
    category: 'beach',
    region: 'south',
    area: 'Seminyak',
    description:
      'A long stretch of golden sand lined with bean bags, beach clubs and some of Bali’s best restaurants. Waves suit beginner surfers; currents can be strong.',
    highlights: ['Sunset beach clubs', 'Boutique shopping streets', 'Beginner surf lessons'],
    tips: ['Swim only between the red-and-yellow flags.', 'Book popular beach clubs in advance.'],
    bestTime: 'Sunset',
    hours: 'Open 24 hours',
    fee: 'Free',
    duration: 'Half day',
    coordinates: { latitude: -8.6913, longitude: 115.1563 },
  },
  {
    id: 'padang-padang',
    name: 'Padang Padang Beach',
    tagline: 'Hidden cove through a rock crevice',
    category: 'beach',
    region: 'south',
    area: 'Pecatu, Bukit Peninsula',
    description:
      'A small, beautiful beach reached through a narrow passage in the cliffs. Calm in the morning, it is also home to a world-famous reef break for experienced surfers.',
    highlights: ['Cave-like stairway entrance', 'Turquoise water', 'Pro surf break'],
    tips: ['Arrive early — the beach is small.', 'Watch for reef at low tide.'],
    bestTime: 'Morning',
    hours: '7:00 am – 7:00 pm',
    fee: '≈ IDR 15,000',
    duration: '3 hours',
    coordinates: { latitude: -8.8113, longitude: 115.1018 },
  },
  {
    id: 'nusa-dua',
    name: 'Nusa Dua',
    tagline: 'Calm water and resort promenade',
    category: 'beach',
    region: 'south',
    area: 'Nusa Dua',
    description:
      'A manicured resort enclave with gentle reef-protected water, ideal for families. A paved beachwalk links the hotels to the Water Blow viewpoint.',
    highlights: ['Calm swimming water', 'Water Blow wave spout', 'Beachfront promenade'],
    tips: ['Great for kids and paddleboarding.', 'Water Blow is best at high tide with big swell.'],
    bestTime: 'Morning',
    hours: 'Open 24 hours',
    fee: 'Free',
    duration: 'Half day',
    coordinates: { latitude: -8.8008, longitude: 115.2335 },
  },
  {
    id: 'amed',
    name: 'Amed & Tulamben',
    tagline: 'Black-sand bays and a WWII wreck',
    category: 'beach',
    region: 'east',
    area: 'Karangasem coast',
    description:
      'A laid-back strip of fishing villages with excellent snorkelling straight off the beach. Nearby Tulamben hosts the USAT Liberty wreck, one of the world’s most accessible dive sites.',
    highlights: ['Jemeluk Bay coral gardens', 'USAT Liberty shipwreck', 'Mount Agung views from the water'],
    tips: ['Bring reef shoes — beaches are pebbly.', 'Dive the wreck at dawn before the crowds.'],
    bestTime: 'Apr – Nov, calm mornings',
    hours: 'Daylight',
    fee: 'Free (dives extra)',
    duration: '1–2 days',
    coordinates: { latitude: -8.3366, longitude: 115.662 },
  },
  {
    id: 'ubud-palace',
    name: 'Ubud Palace & Market',
    tagline: 'Royal courtyard and evening dance',
    category: 'culture',
    region: 'ubud',
    area: 'Ubud Town',
    description:
      'Puri Saren Agung, the former royal palace of Ubud, faces the town’s bustling art market. In the evening the palace courtyard hosts traditional Legong and Barong dance performances.',
    highlights: ['Legong and Barong dances most nights', 'Handicrafts at the art market', 'Saraswati lotus temple nearby'],
    tips: ['Bargain with a smile — start around half the first price.', 'Dance tickets are sold at the gate from late afternoon.'],
    bestTime: 'Morning for market, 7:30 pm for dance',
    hours: '8:00 am – 7:00 pm',
    fee: 'Free (dance tickets extra)',
    duration: '2–3 hours',
    coordinates: { latitude: -8.5069, longitude: 115.2625 },
  },
  {
    id: 'gwk',
    name: 'Garuda Wisnu Kencana',
    tagline: 'A 121 m monument to Vishnu',
    category: 'culture',
    region: 'south',
    area: 'Ungasan, Bukit Peninsula',
    description:
      'A cultural park carved out of limestone cliffs, crowned by one of the world’s tallest statues: Vishnu riding the mythical bird Garuda. Daily dance shows run in the amphitheatre.',
    highlights: ['Monumental Garuda Wisnu statue', 'Limestone plaza walkways', 'Daily cultural performances'],
    tips: ['Go late afternoon and continue to Uluwatu for sunset.', 'Shuttle carts help with the long walks.'],
    bestTime: 'Late afternoon',
    hours: '8:00 am – 8:00 pm',
    fee: '≈ IDR 125,000',
    duration: '2 hours',
    coordinates: { latitude: -8.8104, longitude: 115.1676 },
  },
  {
    id: 'sidemen',
    name: 'Sidemen Valley',
    tagline: 'Bali as it used to be',
    category: 'culture',
    region: 'east',
    area: 'Karangasem',
    description:
      'A quiet valley of rice fields, weaving villages and river walks beneath Mount Agung. Ideal for slow travel, cycling and learning traditional songket weaving.',
    highlights: ['Songket weaving workshops', 'Rice-field walks with Agung views', 'River rafting on the Telaga Waja'],
    tips: ['Stay a night or two to enjoy it properly.', 'Hire a local guide for village trekking.'],
    bestTime: 'Any morning',
    hours: 'Open 24 hours',
    fee: 'Free',
    duration: '1 day',
    coordinates: { latitude: -8.4767, longitude: 115.4435 },
  },
];

export function getPlace(id: string): Place | undefined {
  return PLACES.find((place) => place.id === id);
}

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((category) => category.id === id)!;
}
