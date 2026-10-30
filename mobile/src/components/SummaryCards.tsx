import { StyleSheet, Text, View } from 'react-native';

import { formatCurrency } from '@/lib/format-currency';
import { id } from '@/locales/id';
import { colors, radius, spacing } from '@/theme';
import type { ReportSummary } from '@/types';

/** The four period totals exactly as the server computed them. */
export function SummaryCards({ summary }: { summary: ReportSummary }) {
  const items = [
    { label: id.reports.totalIncome, value: formatCurrency(summary.total_income) },
    { label: id.reports.transactionCount, value: String(summary.transaction_count) },
    { label: id.reports.totalExpense, value: formatCurrency(summary.total_expense) },
    { label: id.reports.netDifference, value: formatCurrency(summary.net_difference) },
  ];

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.card} accessible accessibilityLabel={`${item.label}: ${item.value}`}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  label: { fontSize: 14, color: colors.mutedForeground },
  value: { fontSize: 20, fontWeight: '700', color: colors.foreground },
});
