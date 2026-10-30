import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import AppLayout from '@/components/AppLayout';
import HistoryList from '@/components/HistoryList';
import { TextField } from '@/components/TextField';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { id } from '@/locales/id';
import { history as historyRoute } from '@/routes';
import type { HistoryRow } from '@/types/records';

type Filters = {
    date_from: string | null;
    date_to: string | null;
    type: 'transaction' | 'expense' | null;
};

type HistoryProps = {
    history: {
        data: HistoryRow[];
        prev_page_url: string | null;
        next_page_url: string | null;
        current_page: number;
        last_page: number;
    };
    filters: Filters;
};

export default function History({ history, filters }: HistoryProps) {
    const { errors } = usePage().props;
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [type, setType] = useState(filters.type ?? '');
    const hasFilters = Boolean(
        filters.date_from || filters.date_to || filters.type,
    );

    function apply(event: FormEvent) {
        event.preventDefault();
        const query = Object.fromEntries(
            Object.entries({
                date_from: dateFrom,
                date_to: dateTo,
                type,
            }).filter(([, value]) => value !== ''),
        );
        router.get(historyRoute().url, query, { preserveState: true });
    }

    function reset() {
        setDateFrom('');
        setDateTo('');
        setType('');
        router.get(historyRoute().url);
    }

    return (
        <AppLayout title={id.nav.history}>
            <h1 className="text-2xl font-semibold">{id.nav.history}</h1>

            <form
                onSubmit={apply}
                aria-label={id.history.filters}
                className="space-y-3 rounded-lg border border-border bg-card p-4"
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                        id="date-from"
                        type="date"
                        label={id.history.from}
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        error={errors.date_from}
                    />
                    <TextField
                        id="date-to"
                        type="date"
                        label={id.history.to}
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        error={errors.date_to}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="type" className="text-sm font-medium">
                        {id.history.type}
                    </label>
                    <Select
                        id="type"
                        value={type}
                        onChange={(event) =>
                            setType(event.target.value as typeof type)
                        }
                    >
                        <option value="">{id.history.allTypes}</option>
                        <option value="transaction">{id.history.income}</option>
                        <option value="expense">{id.history.expense}</option>
                    </Select>
                </div>
                <div className="flex gap-3">
                    <Button type="submit">{id.history.apply}</Button>
                    {hasFilters && (
                        <Button variant="outline" onClick={reset}>
                            {id.history.reset}
                        </Button>
                    )}
                </div>
            </form>

            {history.data.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {hasFilters ? id.history.emptyFiltered : id.history.empty}
                </p>
            ) : (
                <HistoryList rows={history.data} />
            )}

            {(history.prev_page_url || history.next_page_url) && (
                <nav
                    aria-label={id.history.pagination}
                    className="flex items-center justify-between gap-3"
                >
                    {history.prev_page_url ? (
                        <Link
                            href={history.prev_page_url}
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            {id.history.previous}
                        </Link>
                    ) : (
                        <span />
                    )}
                    <span className="text-sm text-muted-foreground">
                        {history.current_page} / {history.last_page}
                    </span>
                    {history.next_page_url ? (
                        <Link
                            href={history.next_page_url}
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            {id.history.next}
                        </Link>
                    ) : (
                        <span />
                    )}
                </nav>
            )}
        </AppLayout>
    );
}
