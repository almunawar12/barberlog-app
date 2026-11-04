import { router } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AsyncView } from '@/components/AsyncView';
import { Button } from '@/components/Button';
import { HistoryRowItem } from '@/components/HistoryRowItem';
import { Screen } from '@/components/Screen';
import { SummaryCards } from '@/components/SummaryCards';
import { useDashboard, useMe } from '@/features/queries';
import { id } from '@/locales/id';
import { colors, radius, spacing } from '@/theme';

const todayLabel = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' });

export default function Dashboard() {
  const dashboard = useDashboard();
  const me = useMe();

  return (
    <Screen refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()} />}>
      <Text style={styles.date}>{todayLabel.format(new Date())}</Text>

      <AsyncView isLoading={dashboard.isLoading} error={dashboard.error} onRetry={() => void dashboard.refetch()}>
        {dashboard.data && (
          <>
            <SummaryCards summary={dashboard.data.summary} />

            {me.data?.role === 'employee' && (
              <View style={styles.actions}>
                <Button title={id.dashboard.addTransaction} onPress={() => router.push('/transaction/new')} />
                <Button title={id.dashboard.addExpense} variant="outline" onPress={() => router.push('/expense/new')} />
              </View>
            )}

            <Text accessibilityRole="header" style={styles.heading}>
              {id.dashboard.recent}
            </Text>
            {dashboard.data.recent.length === 0 ? (
              <Text style={styles.empty}>{id.history.empty}</Text>
            ) : (
              <View style={styles.list}>
                {dashboard.data.recent.map((row) => (
                  <HistoryRowItem key={`${row.type}-${row.id}`} row={row} />
                ))}
                <Button title={id.dashboard.viewHistory} variant="secondary" onPress={() => router.push('/history')} />
              </View>
            )}
          </>
        )}
      </AsyncView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { fontSize: 14, color: colors.mutedForeground },
  actions: { gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  empty: {
    textAlign: 'center',
    padding: spacing.xl,
    fontSize: 14,
    color: colors.mutedForeground,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  list: { gap: spacing.md },
});
