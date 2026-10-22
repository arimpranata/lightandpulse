import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { GUIDE, type Guide } from '@/data/guide';
import { ITINERARIES, type Itinerary } from '@/data/itineraries';
import { CATEGORIES, PLACES, REGIONS, type Category, type Place } from '@/data/places';
import { API_URL } from '@/services/backend';

const CACHE_KEY = 'bali:content';
const TIMEOUT_MS = 8000;

export type Content = {
  categories: readonly Category[];
  regions: Record<string, string>;
  places: readonly Place[];
  itineraries: readonly Itinerary[];
  guide: Guide;
};

/** Where the content currently on screen came from. */
export type ContentSource = 'bundled' | 'cache' | 'api';

const BUNDLED: Content = {
  categories: CATEGORIES,
  regions: REGIONS,
  places: PLACES,
  itineraries: ITINERARIES,
  guide: GUIDE,
};

function isContent(value: unknown): value is Content {
  const content = value as Content | null;
  return (
    !!content &&
    Array.isArray(content.categories) &&
    content.categories.length > 0 &&
    typeof content.regions === 'object' &&
    Array.isArray(content.places) &&
    Array.isArray(content.itineraries) &&
    !!content.guide &&
    Array.isArray(content.guide.currencies) &&
    content.guide.currencies.length > 0 &&
    Array.isArray(content.guide.phrases) &&
    Array.isArray(content.guide.essentials) &&
    Array.isArray(content.guide.etiquette) &&
    Array.isArray(content.guide.emergency)
  );
}

async function fetchContent(): Promise<Content> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/content`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (!isContent(body)) throw new Error('Unexpected response shape');
    return body;
  } finally {
    clearTimeout(timer);
  }
}

type ContentContextValue = Content & {
  source: ContentSource;
  getPlace: (id: string) => Place | undefined;
  getItinerary: (id: string) => Itinerary | undefined;
  getCategory: (id: string) => Category;
  regionLabel: (id: string) => string;
};

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content>(BUNDLED);
  const [source, setSource] = useState<ContentSource>('bundled');

  useEffect(() => {
    if (!API_URL) return;
    let cancelled = false;

    // Show the last good API response straight away, then refresh it.
    AsyncStorage.getItem(CACHE_KEY)
      .then((cached) => {
        const parsed: unknown = cached ? JSON.parse(cached) : null;
        if (!cancelled && isContent(parsed)) {
          setContent(parsed);
          setSource((current) => (current === 'api' ? current : 'cache'));
        }
      })
      .catch(() => {});

    fetchContent()
      .then((fresh) => {
        if (cancelled) return;
        setContent(fresh);
        setSource('api');
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
      })
      .catch(() => {
        // Offline or API down: keep showing cached or bundled content.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ContentContextValue>(() => {
    const places = new Map(content.places.map((place) => [place.id, place]));
    const itineraries = new Map(content.itineraries.map((itinerary) => [itinerary.id, itinerary]));
    const categories = new Map(content.categories.map((category) => [category.id, category]));
    return {
      ...content,
      source,
      getPlace: (id) => places.get(id),
      getItinerary: (id) => itineraries.get(id),
      getCategory: (id) => categories.get(id) ?? content.categories[0],
      regionLabel: (id) => content.regions[id] ?? id,
    };
  }, [content, source]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used inside ContentProvider');
  return context;
}
