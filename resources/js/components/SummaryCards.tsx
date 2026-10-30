import { formatCurrency } from '@/lib/format-currency';
import { id } from '@/locales/id';
import type { ReportSummary } from '@/types/records';

/** The four period totals, as computed by the server. */
export default function SummaryCards({ summary }: { summary: ReportSummary }) {
    const items = [
        {
            label: id.reports.totalIncome,
            value: formatCurrency(summary.total_income),
        },
        {
            label: id.reports.transactionCount,
            value: String(summary.transaction_count),
        },
        {
            label: id.reports.totalExpense,
            value: formatCurrency(summary.total_expense),
        },
        {
            label: id.reports.netDifference,
            value: formatCurrency(summary.net_difference),
        },
    ];

    return (
        <dl className="grid grid-cols-2 gap-3">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="rounded-lg border border-border bg-card p-4"
                >
                    <dt className="text-sm text-muted-foreground">
                        {item.label}
                    </dt>
                    <dd className="mt-1 text-xl font-semibold break-words">
                        {item.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
