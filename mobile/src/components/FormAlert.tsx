import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { colors, radius, spacing } from '@/theme';

export function FormAlert({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.box}>
      <Text style={styles.text}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { fontSize: 14, color: colors.destructive },
});
