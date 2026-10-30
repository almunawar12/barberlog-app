import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AsyncView } from '@/components/AsyncView';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateFields';
import { HistoryRowItem } from '@/components/HistoryRowItem';
import { useHistory } from '@/features/queries';
import type { HistoryFilters } from '@/features/queries';
import { id } from '@/locales/id';
import { colors, radius, spacing, touchTarget } from '@/theme';

const types: { value: HistoryFilters['type']; label: string }[] = [
  { value: '', label: id.history.allTypes },
  { value: 'transaction', label: id.history.income },
  { value: 'expense', label: id.history.expense },
];

export default function History() {
  const [filters, setFilters] = useState<HistoryFilters>({ date_from: '', date_to: '', type: '' });
  const invalidRange = filters.date_from !== '' && filters.date_to !== '' && filters.date_to < filters.date_from;
  // A reversed range would only produce a validation error; wait until it is fixed.
  const applied = useMemo(() => (invalidRange ? { ...filters, date_to: '' } : filters), [filters, invalidRange]);
  const history = useHistory(applied);
  const rows = history.data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = filters.date_from !== '' || filters.date_to !== '' || filters.type !== '';

  const header = (
    <View style={styles.filters}>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {types.map((type) => {
          const checked = filters.type === type.value;

          return (
            <Pressable
              key={type.value}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              onPress={() => setFilters((current) => ({ ...current, type: type.value }))}
              style={[styles.chip, checked && styles.chipChecked]}
            >
              <Text style={[styles.chipText, checked && styles.chipTextChecked]}>{type.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.dates}>
        <View style={styles.date}>
          <DateField
            label={id.history.from}
            value={filters.date_from}
            placeholder={id.select.choose}
            onChange={(value) => setFilters((current) => ({ ...current, date_from: value }))}
          />
        </View>
        <View style={styles.date}>
          <DateField
            label={id.history.to}
            value={filters.date_to}
            placeholder={id.select.choose}
            error={invalidRange ? id.history.invalidRange : undefined}
            onChange={(value) => setFilters((current) => ({ ...current, date_to: value }))}
          />
        </View>
      </View>
      {hasFilters && (
        <Button title={id.history.reset} variant="outline" onPress={() => setFilters({ date_from: '', date_to: '', type: '' })} />
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      data={rows}
      keyExtractor={(row) => `${row.type}-${row.id}`}
      renderItem={({ item }) => <HistoryRowItem row={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <AsyncView isLoading={history.isLoading} error={history.error} onRetry={() => void history.refetch()}>
          <Text style={styles.empty}>{hasFilters ? id.history.emptyFiltered : id.history.empty}</Text>
        </AsyncView>
      }
      ListFooterComponent={history.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.foreground} /> : undefined}
      onEndReached={() => {
        if (history.hasNextPage && !history.isFetchingNextPage) {
          void history.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={history.isRefetching && !history.isFetchingNextPage} onRefresh={() => void history.refetch()} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  filters: { padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  chipChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  chipTextChecked: { color: colors.primaryForeground },
  dates: { flexDirection: 'row', gap: spacing.md },
  date: { flex: 1 },
  empty: { textAlign: 'center', padding: spacing.xl, fontSize: 14, color: colors.mutedForeground },
  footer: { padding: spacing.lg },
});
