export type ItineraryStop = {
  time: string;
  placeId: string;
  note: string;
};

export type ItineraryDay = {
  title: string;
  stops: ItineraryStop[];
};

export type Itinerary = {
  id: string;
  title: string;
  summary: string;
  days: ItineraryDay[];
  gradient: readonly [string, string];
};

export const ITINERARIES: readonly Itinerary[] = [
  {
    id: 'classic-3-days',
    title: 'Classic Bali in 3 days',
    summary: 'Jungle, volcano and clifftop temples — the essential first trip.',
    gradient: ['#1F6B52', '#C8932E'],
    days: [
      {
        title: 'Day 1 · Ubud',
        stops: [
          { time: '7:00 am', placeId: 'campuhan', note: 'Walk the ridge before the heat.' },
          { time: '10:00 am', placeId: 'monkey-forest', note: 'Leave snacks at the hotel.' },
          { time: '7:30 pm', placeId: 'ubud-palace', note: 'Catch a Legong dance in the courtyard.' },
        ],
      },
      {
        title: 'Day 2 · Volcano & holy water',
        stops: [
          { time: '4:00 am', placeId: 'mount-batur', note: 'Sunrise trek with a licensed guide.' },
          { time: '11:00 am', placeId: 'tirta-empul', note: 'Join the purification ritual.' },
          { time: '2:00 pm', placeId: 'tegallalang', note: 'Lunch on the terrace rim.' },
        ],
      },
      {
        title: 'Day 3 · The Bukit',
        stops: [
          { time: '10:00 am', placeId: 'padang-padang', note: 'Swim and snorkel in the morning calm.' },
          { time: '2:00 pm', placeId: 'gwk', note: 'Explore the cultural park.' },
          { time: '5:00 pm', placeId: 'uluwatu', note: 'Kecak fire dance at sunset.' },
        ],
      },
    ],
  },
  {
    id: 'east-temples',
    title: 'Temples of the East',
    summary: 'A spiritual road trip beneath Mount Agung.',
    gradient: ['#B4532A', '#6B2D5C'],
    days: [
      {
        title: 'One long day',
        stops: [
          { time: '5:00 am', placeId: 'lempuyang', note: 'Beat the queue at the Gates of Heaven.' },
          { time: '11:00 am', placeId: 'besakih', note: 'Use the official visitor centre.' },
          { time: '3:00 pm', placeId: 'sidemen', note: 'Slow down in the rice valley overnight.' },
        ],
      },
    ],
  },
  {
    id: 'highlands-waterfalls',
    title: 'Waterfalls & highlands',
    summary: 'Cool mountain air, lake temples and hidden cascades.',
    gradient: ['#1D4E6B', '#7FB069'],
    days: [
      {
        title: 'Day 1 · Gianyar & Bangli',
        stops: [
          { time: '8:00 am', placeId: 'tegenungan', note: 'Early swim before the crowds.' },
          { time: '10:00 am', placeId: 'tukad-cepung', note: 'Time it for the light beams.' },
        ],
      },
      {
        title: 'Day 2 · Tabanan & Buleleng',
        stops: [
          { time: '8:00 am', placeId: 'jatiluwih', note: 'Walk the short loop through the terraces.' },
          { time: '11:00 am', placeId: 'ulun-danu', note: 'Lake temple and Bedugul market.' },
          { time: '2:00 pm', placeId: 'sekumpul', note: 'Hike to the seven falls with a guide.' },
        ],
      },
    ],
  },
];
