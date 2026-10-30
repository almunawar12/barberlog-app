import { ScrollView, StyleSheet } from 'react-native';
import type { RefreshControlProps } from 'react-native';
import type { ReactElement, ReactNode } from 'react';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
};

/** Scrolling page body. Taps keep working while the keyboard is open, so Save is never trapped. */
export function Screen({ children, refreshControl }: ScreenProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
});
