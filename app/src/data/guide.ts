import type { IconName } from '@/components/icon';

export type Currency = { code: string; label: string; perUnitIdr: number };

/**
 * Indicative exchange rates (IDR per one unit of the foreign currency).
 * Users can override the rate in the converter; these are only a starting point.
 */
export const CURRENCIES: readonly Currency[] = [
  { code: 'USD', label: 'US Dollar', perUnitIdr: 16500 },
  { code: 'AUD', label: 'Australian Dollar', perUnitIdr: 10800 },
  { code: 'EUR', label: 'Euro', perUnitIdr: 18800 },
  { code: 'GBP', label: 'British Pound', perUnitIdr: 21800 },
  { code: 'SGD', label: 'Singapore Dollar', perUnitIdr: 12700 },
];

export type Phrase = { phrase: string; meaning: string; note?: string };

export const PHRASES: readonly Phrase[] = [
  { phrase: 'Om Swastiastu', meaning: 'Hello (Balinese greeting)', note: 'Hands together at the chest' },
  { phrase: 'Suksma', meaning: 'Thank you (Balinese)' },
  { phrase: 'Terima kasih', meaning: 'Thank you (Indonesian)' },
  { phrase: 'Sama-sama', meaning: 'You’re welcome' },
  { phrase: 'Selamat pagi', meaning: 'Good morning' },
  { phrase: 'Permisi', meaning: 'Excuse me' },
  { phrase: 'Berapa harganya?', meaning: 'How much is it?' },
  { phrase: 'Bisa kurang?', meaning: 'Can you lower the price?' },
  { phrase: 'Tidak, terima kasih', meaning: 'No, thank you' },
  { phrase: 'Di mana toilet?', meaning: 'Where is the toilet?' },
  { phrase: 'Tidak pedas', meaning: 'Not spicy, please' },
  { phrase: 'Enak sekali!', meaning: 'Very delicious!' },
];

export type GuideTip = { icon: IconName; title: string; body: string };

export const ETIQUETTE: readonly GuideTip[] = [
  {
    icon: 'temple',
    title: 'Dress for temples',
    body: 'Cover shoulders and knees and wear a sarong and sash. Most temples lend them at the entrance.',
  },
  {
    icon: 'respect',
    title: 'Mind the offerings',
    body: 'Small palm-leaf canang sari are placed on pavements and doorsteps daily. Step around them, never on them.',
  },
  {
    icon: 'info',
    title: 'Right hand, no heads',
    body: 'Give and receive with your right hand, and never touch anyone’s head — it is considered sacred.',
  },
  {
    icon: 'calendar',
    title: 'Nyepi, the Day of Silence',
    body: 'Each March the whole island shuts down for 24 hours, including the airport. Visitors must stay inside their hotel.',
  },
  {
    icon: 'culture',
    title: 'Ceremonies are not shows',
    body: 'You will often meet processions on the road. Pull over, stay quiet and ask before taking photos.',
  },
];

export const ESSENTIALS: readonly GuideTip[] = [
  {
    icon: 'arrival',
    title: 'Arrival & tourist levy',
    body: 'Most visitors need a visa on arrival or e-VOA, and foreign tourists pay Bali’s IDR 150,000 tourist levy. Check current rules before you fly.',
  },
  {
    icon: 'weather',
    title: 'When to go',
    body: 'Dry season runs April to October. November to March is wet, greener and quieter, with short heavy downpours.',
  },
  {
    icon: 'car',
    title: 'Getting around',
    body: 'Use the Grab or Gojek apps for rides, or hire a private driver for day trips. Traffic in the south is slow — plan for it.',
  },
  {
    icon: 'scooter',
    title: 'Scooters',
    body: 'Only ride with an International Driving Permit valid for motorcycles and always wear a helmet. Check your insurance covers it.',
  },
  {
    icon: 'boat',
    title: 'Islands',
    body: 'Fast boats to Nusa Penida and Nusa Lembongan leave from Sanur. Book with operators that provide life jackets.',
  },
  {
    icon: 'waterfall',
    title: 'Stay healthy',
    body: 'Drink bottled or refilled filtered water, use reef-safe sunscreen and pack insect repellent.',
  },
];

export type EmergencyContact = { icon: IconName; label: string; number: string };

export const EMERGENCY: readonly EmergencyContact[] = [
  { icon: 'phone', label: 'General emergency', number: '112' },
  { icon: 'police', label: 'Police', number: '110' },
  { icon: 'medical', label: 'Ambulance', number: '118' },
  { icon: 'fire', label: 'Fire', number: '113' },
  { icon: 'rescue', label: 'Search & rescue', number: '115' },
];

export type Guide = {
  currencies: readonly Currency[];
  phrases: readonly Phrase[];
  essentials: readonly GuideTip[];
  etiquette: readonly GuideTip[];
  emergency: readonly EmergencyContact[];
};

export const GUIDE: Guide = {
  currencies: CURRENCIES,
  phrases: PHRASES,
  essentials: ESSENTIALS,
  etiquette: ETIQUETTE,
  emergency: EMERGENCY,
};
