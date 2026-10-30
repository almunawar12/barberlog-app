import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { ApiError } from '@/lib/api-client';
import { id } from '@/locales/id';
import { colors, spacing } from '@/theme';

type AsyncViewProps = {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  children: ReactNode;
};

/** Distinguishes loading from failure from content, so an empty screen never hides an error. */
export function AsyncView({ isLoading, error, onRetry, children }: AsyncViewProps) {
  if (isLoading) {
    return (
      <View style={styles.center} accessibilityLabel={id.common.loading}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (error) {
    const missing = error instanceof ApiError && error.status === 404;

    return (
      <View style={styles.center}>
        <Text style={styles.message}>{missing ? id.errors.notFound : id.errors.load}</Text>
        {!missing && <Button title={id.common.retry} variant="outline" onPress={onRetry} />}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  message: { fontSize: 15, color: colors.mutedForeground, textAlign: 'center' },
});
