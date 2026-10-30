import { Link, router, usePage } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import AppLayout from '@/components/AppLayout';
import SummaryCards from '@/components/SummaryCards';
import { TextField } from '@/components/TextField';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import { id } from '@/locales/id';
import { reports } from '@/routes';
import { exportMethod } from '@/routes/reports';
import type { ReportSummary } from '@/types/records';

type ReportsProps = {
    summary: ReportSummary;
    presets: { today: string; month_start: string };
};

export default function Reports({ summary, presets }: ReportsProps) {
    const { errors } = usePage().props;
    const [dateFrom, setDateFrom] = useState(summary.date_from);
    const [dateTo, setDateTo] = useState(summary.date_to);
    const period = { date_from: summary.date_from, date_to: summary.date_to };
    const isToday =
        summary.date_from === presets.today &&
        summary.date_to === presets.today;
    const isMonth =
        summary.date_from === presets.month_start &&
        summary.date_to === presets.today;

    function apply(event: FormEvent) {
        event.preventDefault();
        router.get(
            reports().url,
            { date_from: dateFrom, date_to: dateTo },
            { preserveState: true },
        );
    }

    return (
        <AppLayout title={id.nav.reports}>
            <h1 className="text-2xl font-semibold">{id.nav.reports}</h1>

            <section
                aria-label={id.reports.period}
                className="space-y-3 rounded-lg border border-border bg-card p-4"
            >
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={
                            reports({
                                query: {
                                    date_from: presets.today,
                                    date_to: presets.today,
                                },
                            }).url
                        }
                        aria-current={isToday ? 'true' : undefined}
                        className={buttonVariants({
                            variant: isToday ? 'default' : 'outline',
                        })}
                    >
                        {id.reports.today}
                    </Link>
                    <Link
                        href={
                            reports({
                                query: {
                                    date_from: presets.month_start,
                                    date_to: presets.today,
                                },
                            }).url
                        }
                        aria-current={isMonth ? 'true' : undefined}
                        className={buttonVariants({
                            variant: isMonth ? 'default' : 'outline',
                        })}
                    >
                        {id.reports.thisMonth}
                    </Link>
                </div>
                <form onSubmit={apply} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                            id="report-from"
                            type="date"
                            label={id.history.from}
                            value={dateFrom}
                            onChange={(event) =>
                                setDateFrom(event.target.value)
                            }
                            error={errors.date_from}
                            required
                        />
                        <TextField
                            id="report-to"
                            type="date"
                            label={id.history.to}
                            value={dateTo}
                            onChange={(event) => setDateTo(event.target.value)}
                            error={errors.date_to}
                            required
                        />
                    </div>
                    <Button type="submit" variant="secondary">
                        {id.reports.showPeriod}
                    </Button>
                </form>
            </section>

            <SummaryCards summary={summary} />

            <Card>
                <CardHeader>
                    <CardTitle>{id.reports.byPaymentMethod}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="divide-y divide-border">
                        {summary.income_by_payment_method.map((row) => (
                            <li
                                key={row.payment_method}
                                className="flex items-baseline justify-between gap-3 py-2 text-sm"
                            >
                                <span>
                                    {id.payment[row.payment_method]}
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        {row.count}{' '}
                                        {id.reports.transactionsUnit}
                                    </span>
                                </span>
                                <span className="font-medium">
                                    {formatCurrency(row.total)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{id.reports.topServices}</CardTitle>
                </CardHeader>
                <CardContent>
                    {summary.income_by_service.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {id.reports.noIncome}
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {summary.income_by_service.map((row) => (
                                <li
                                    key={row.service_id}
                                    className="flex items-baseline justify-between gap-3 py-2 text-sm"
                                >
                                    <span>
                                        {row.service_name}
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {row.quantity}{' '}
                                            {id.reports.servicesUnit}
                                        </span>
                                    </span>
                                    <span className="font-medium">
                                        {formatCurrency(row.total)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {/* A real file download, so a plain link rather than an Inertia visit. */}
            <a
                href={exportMethod({ query: period }).url}
                download
                className={buttonVariants({
                    variant: 'outline',
                    className: 'w-full',
                })}
            >
                <Download aria-hidden />
                {id.reports.exportCsv}
            </a>
        </AppLayout>
    );
}
