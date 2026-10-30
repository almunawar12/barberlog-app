import { Link } from '@inertiajs/react';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import expenses from '@/routes/expenses';
import transactions from '@/routes/transactions';
import type { HistoryRow } from '@/types/records';

export default function HistoryList({ rows }: { rows: HistoryRow[] }) {
    return (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {rows.map((row) => {
                const isExpense = row.type === 'expense';
                const href = isExpense
                    ? expenses.show(row.id).url
                    : transactions.show(row.id).url;

                return (
                    <li key={`${row.type}-${row.id}`}>
                        <Link
                            href={href}
                            className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                        >
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">
                                    {row.summary}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {formatDateTime(row.occurred_at)} ·{' '}
                                    {id.payment[row.payment_method]}
                                </span>
                            </span>
                            <span className="shrink-0 text-right">
                                <span className="block text-sm font-semibold">
                                    {isExpense ? '−' : '+'}
                                    {formatCurrency(row.amount)}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {isExpense
                                        ? id.history.expense
                                        : id.history.income}
                                </span>
                            </span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
