import { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AsyncView } from '@/components/AsyncView';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateField } from '@/components/DateFields';
import { Screen } from '@/components/Screen';
import { SummaryCards } from '@/components/SummaryCards';
import { useReport } from '@/features/queries';
import { formatCurrency } from '@/lib/format-currency';
import { ExportUnavailableError, exportReportCsv } from '@/lib/export-report';
import { monthStartInJakarta, todayInJakarta } from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import { colors, spacing } from '@/theme';

export default function Reports() {
  const [period, setPeriod] = useState(() => ({ from: todayInJakarta(), to: todayInJakarta() }));
  const [draft, setDraft] = useState(period);
  const [exporting, setExporting] = useState(false);
  const invalid = draft.to < draft.from;
  const report = useReport(period.from, period.to);
  const summary = report.data;

  const isToday = period.from === todayInJakarta() && period.to === todayInJakarta();
  const isMonth = period.from === monthStartInJakarta() && period.to === todayInJakarta();

  function choose(next: { from: string; to: string }) {
    setPeriod(next);
    setDraft(next);
  }

  async function exportCsv() {
    setExporting(true);

    try {
      await exportReportCsv(period.from, period.to);
    } catch (error) {
      Alert.alert(error instanceof ExportUnavailableError ? id.reports.shareUnavailable : id.reports.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={report.isRefetching} onRefresh={() => void report.refetch()} />}>
      <View style={styles.presets}>
        <View style={styles.preset}>
          <Button
            title={id.reports.today}
            variant={isToday ? 'primary' : 'outline'}
            onPress={() => choose({ from: todayInJakarta(), to: todayInJakarta() })}
          />
        </View>
        <View style={styles.preset}>
          <Button
            title={id.reports.thisMonth}
            variant={isMonth ? 'primary' : 'outline'}
            onPress={() => choose({ from: monthStartInJakarta(), to: todayInJakarta() })}
          />
        </View>
      </View>

      <Card>
        <View style={styles.dates}>
          <View style={styles.date}>
            <DateField
              label={id.history.from}
              value={draft.from}
              placeholder={id.select.choose}
              onChange={(value) => setDraft((current) => ({ ...current, from: value }))}
            />
          </View>
          <View style={styles.date}>
            <DateField
              label={id.history.to}
              value={draft.to}
              placeholder={id.select.choose}
              error={invalid ? id.history.invalidRange : undefined}
              onChange={(value) => setDraft((current) => ({ ...current, to: value }))}
            />
          </View>
        </View>
        <Button title={id.reports.showPeriod} variant="secondary" disabled={invalid} onPress={() => setPeriod(draft)} />
      </Card>

      <AsyncView isLoading={report.isLoading} error={report.error} onRetry={() => void report.refetch()}>
        {summary && (
          <>
            <SummaryCards summary={summary} />

            <Card title={id.reports.byPaymentMethod}>
              {summary.income_by_payment_method.map((row) => (
                <View key={row.payment_method} style={styles.line}>
                  <Text style={styles.lineText}>
                    {id.payment[row.payment_method]} · {row.count} {id.reports.transactionsUnit}
                  </Text>
                  <Text style={styles.lineAmount}>{formatCurrency(row.total)}</Text>
                </View>
              ))}
            </Card>

            <Card title={id.reports.topServices}>
              {summary.income_by_service.length === 0 ? (
                <Text style={styles.muted}>{id.reports.noIncome}</Text>
              ) : (
                summary.income_by_service.map((row) => (
                  <View key={row.service_id} style={styles.line}>
                    <Text style={styles.lineText}>
                      {row.service_name} · {row.quantity} {id.reports.servicesUnit}
                    </Text>
                    <Text style={styles.lineAmount}>{formatCurrency(row.total)}</Text>
                  </View>
                ))
              )}
            </Card>

            <Button
              title={exporting ? id.reports.exporting : id.reports.exportCsv}
              variant="outline"
              loading={exporting}
              onPress={exportCsv}
            />
          </>
        )}
      </AsyncView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: { flex: 1 },
  dates: { flexDirection: 'row', gap: spacing.md },
  date: { flex: 1 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  lineText: { flex: 1, fontSize: 14, color: colors.foreground },
  lineAmount: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  muted: { fontSize: 14, color: colors.mutedForeground },
});
