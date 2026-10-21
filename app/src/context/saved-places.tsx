import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'bali:saved-places';

type SavedPlacesContextValue = {
  savedIds: string[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
};

const SavedPlacesContext = createContext<SavedPlacesContextValue | null>(null);

export function SavedPlacesProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setSavedIds(JSON.parse(value));
      })
      .catch(() => {
        // Storage can be unavailable (e.g. private browsing); start empty.
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    // Don't overwrite stored favourites with the initial empty list.
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds)).catch(() => {});
  }, [savedIds, loaded]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [id, ...current],
    );
  }, []);

  const value = useMemo(
    () => ({ savedIds, isSaved: (id: string) => savedIds.includes(id), toggleSaved }),
    [savedIds, toggleSaved],
  );

  return <SavedPlacesContext.Provider value={value}>{children}</SavedPlacesContext.Provider>;
}

export function useSavedPlaces() {
  const context = useContext(SavedPlacesContext);
  if (!context) throw new Error('useSavedPlaces must be used inside SavedPlacesProvider');
  return context;
}
