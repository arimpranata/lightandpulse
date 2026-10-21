import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { useSavedPlaces } from '@/context/saved-places';

type Props = { placeId: string; size?: number };

export function SaveButton({ placeId, size = 36 }: Props) {
  const { isSaved, toggleSaved } = useSavedPlaces();
  const saved = isSaved(placeId);
  return (
    <Pressable
      onPress={() => toggleSaved(placeId)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved' : 'Save place'}
      accessibilityState={{ selected: saved }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon name={saved ? 'saved' : 'savedOutline'} size={size * 0.5} color={saved ? '#FF5A5F' : '#FFFFFF'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
