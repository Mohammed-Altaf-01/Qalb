import { Text, View } from 'react-native';
import { COLORS } from '../theme';

export default function WordByWordArabic({
  text,
  textStyle,
  isPlaying = false,
  progress = 0,
  progressLead = 0.12,
}) {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const clamped = Math.max(0, Math.min(1, (progress || 0) + progressLead));
  const highlightedIndex = isPlaying
    ? Math.min(words.length - 1, Math.max(0, Math.ceil(clamped * words.length) - 1))
    : -1;

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        width: '100%',
      }}
    >
      {words.map((word, idx) => (
        <Text
          key={`${word}-${idx}`}
          style={[
            textStyle,
            {
              color: idx === highlightedIndex ? COLORS.accent : textStyle?.color ?? COLORS.text,
              backgroundColor: idx === highlightedIndex ? `${COLORS.accent}25` : 'transparent',
            },
          ]}
        >
          {word}{' '}
        </Text>
      ))}
    </View>
  );
}
