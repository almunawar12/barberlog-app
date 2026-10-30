import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AsyncView } from '@/components/AsyncView';
import { Card } from '@/components/Card';
import { RecordActions } from '@/components/RecordActions';
import { Screen } from '@/components/Screen';
import { useExpense } from '@/features/queries';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import { colors, spacing } from '@/theme';

export default function ExpenseDetail() {
  const { id: expenseId } = useLocalSearchParams<{ id: string }>();
  const query = useExpense(expenseId);
  const expense = query.data;

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
      <Stack.Screen options={{ title: id.expense.title }} />
      <AsyncView isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()}>
        {expense && (
          <>
            <Text style={styles.muted}>{expense.reference}</Text>
            <Card>
              <Row label={id.expense.description} value={expense.description} />
              {expense.category ? <Row label={id.expense.category} value={id.category[expense.category]} /> : null}
              <Row label={id.common.dateTime} value={formatDateTime(expense.occurred_at)} />
              <Row label={id.common.paymentMethod} value={id.payment[expense.payment_method]} />
              <View style={styles.total}>
                <Text style={styles.muted}>{id.expense.amount}</Text>
                <Text style={styles.totalValue}>{formatCurrency(expense.amount)}</Text>
              </View>
            </Card>
            <RecordActions
              kind="expense"
              recordId={expense.id}
              version={expense.version}
              occurredAt={expense.occurred_at}
              amount={expense.amount}
              deleteTitle={id.expense.deleteTitle}
              deleteBody={id.expense.deleteBody}
            />
          </>
        )}
      </AsyncView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.value, styles.rowValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowValue: { flex: 1, textAlign: 'right' },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  muted: { fontSize: 14, color: colors.mutedForeground },
  value: { fontSize: 15, color: colors.foreground },
});
