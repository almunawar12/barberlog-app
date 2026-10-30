import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import HistoryList from '@/components/HistoryList';
import SummaryCards from '@/components/SummaryCards';
import { buttonVariants } from '@/components/ui/button';
import { id } from '@/locales/id';
import { history } from '@/routes';
import expenses from '@/routes/expenses';
import transactions from '@/routes/transactions';
import type { HistoryRow, ReportSummary } from '@/types/records';

const todayLabel = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeZone: 'Asia/Jakarta',
});

type DashboardProps = { summary: ReportSummary; recent: HistoryRow[] };

export default function Dashboard({ summary, recent }: DashboardProps) {
    return (
        <AppLayout title={id.nav.dashboard}>
            <header>
                <h1 className="text-2xl font-semibold">{id.nav.dashboard}</h1>
                <p className="text-sm text-muted-foreground">
                    {todayLabel.format(new Date())}
                </p>
            </header>

            <SummaryCards summary={summary} />

            <div className="grid gap-3 sm:grid-cols-2">
                <Link
                    href={transactions.create().url}
                    className={buttonVariants({ className: 'h-14 text-base' })}
                >
                    <Plus aria-hidden />
                    {id.dashboard.addTransaction}
                </Link>
                <Link
                    href={expenses.create().url}
                    className={buttonVariants({
                        variant: 'outline',
                        className: 'h-14 text-base',
                    })}
                >
                    <Plus aria-hidden />
                    {id.dashboard.addExpense}
                </Link>
            </div>

            <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-base font-semibold">
                        {id.dashboard.recent}
                    </h2>
                    {recent.length > 0 && (
                        <Link
                            href={history().url}
                            className="text-sm font-medium text-accent-text underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            {id.dashboard.viewHistory}
                        </Link>
                    )}
                </div>
                {recent.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        {id.history.empty}
                    </p>
                ) : (
                    <HistoryList rows={recent} />
                )}
            </section>
        </AppLayout>
    );
}
