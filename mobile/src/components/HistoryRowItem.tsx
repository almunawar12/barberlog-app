import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import { colors, spacing, touchTarget } from '@/theme';
import type { HistoryRow } from '@/types';

export function HistoryRowItem({ row }: { row: HistoryRow }) {
  const isExpense = row.type === 'expense';
  const amount = `${isExpense ? '−' : '+'}${formatCurrency(row.amount)}`;
  const kind = isExpense ? id.history.expense : id.history.income;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kind}, ${row.summary}, ${amount}, ${formatDateTime(row.occurred_at)}`}
      onPress={() => router.push(isExpense ? `/expense/${row.id}` : `/transaction/${row.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <Text style={styles.summary} numberOfLines={1}>
          {row.summary}
        </Text>
        <Text style={styles.meta}>
          {formatDateTime(row.occurred_at)} · {id.payment[row.payment_method]}
        </Text>
      </View>
      <View style={styles.amountBox}>
        <Text style={styles.amount}>{amount}</Text>
        <Text style={styles.meta}>{kind}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.secondary },
  main: { flex: 1 },
  summary: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  meta: { fontSize: 12, color: colors.mutedForeground },
  amountBox: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '700', color: colors.foreground },
});
