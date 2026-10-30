import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { colors, radius, spacing } from '@/theme';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.foreground },
});
