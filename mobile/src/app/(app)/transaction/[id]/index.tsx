import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AsyncView } from '@/components/AsyncView';
import { Card } from '@/components/Card';
import { RecordActions } from '@/components/RecordActions';
import { Screen } from '@/components/Screen';
import { useTransaction } from '@/features/queries';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import { colors, spacing } from '@/theme';

export default function TransactionDetail() {
  const { id: transactionId } = useLocalSearchParams<{ id: string }>();
  const query = useTransaction(transactionId);
  const transaction = query.data;

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
      <Stack.Screen options={{ title: id.transaction.title }} />
      <AsyncView isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()}>
        {transaction && (
          <>
            <Text style={styles.muted}>{transaction.reference}</Text>
            <Card>
              <Row label={id.common.dateTime} value={formatDateTime(transaction.occurred_at)} />
              <Row label={id.common.paymentMethod} value={id.payment[transaction.payment_method]} />
              {transaction.note ? <Row label={id.common.note} value={transaction.note} /> : null}
            </Card>
            <Card>
              {transaction.items.map((item) => (
                <View key={item.id} style={styles.item}>
                  <View style={styles.itemMain}>
                    <Text style={styles.value}>{item.service_name}</Text>
                    <Text style={styles.muted}>
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </Text>
                  </View>
                  <Text style={styles.value}>{formatCurrency(item.line_total)}</Text>
                </View>
              ))}
              <View style={styles.total}>
                <Text style={styles.muted}>{id.common.total}</Text>
                <Text style={styles.totalValue}>{formatCurrency(transaction.total_amount)}</Text>
              </View>
            </Card>
            <RecordActions
              kind="transaction"
              recordId={transaction.id}
              version={transaction.version}
              occurredAt={transaction.occurred_at}
              amount={transaction.total_amount}
              deleteTitle={id.transaction.deleteTitle}
              deleteBody={id.transaction.deleteBody}
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
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  itemMain: { flex: 1 },
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
