import { Link } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { buttonVariants } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { id } from '@/locales/id';

type ActivityLog = {
    id: number;
    user_name: string;
    entity_type: string;
    entity_id: number;
    action: string;
    label: string | null;
    amount: number | null;
    created_at: string;
};

type ActivityLogsProps = {
    logs: {
        data: ActivityLog[];
        prev_page_url: string | null;
        next_page_url: string | null;
        current_page: number;
        last_page: number;
    };
};

export default function ActivityLogs({ logs }: ActivityLogsProps) {
    return (
        <AppLayout title={id.activityLog.title}>
            <h1 className="text-2xl font-semibold">{id.activityLog.title}</h1>

            {logs.data.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {id.activityLog.empty}
                </p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {logs.data.map((log) => (
                        <li key={log.id} className="px-4 py-3">
                            <p className="text-sm">
                                <strong>{log.user_name}</strong>{' '}
                                {id.activityLog.actions[log.action] ??
                                    log.action}{' '}
                                {id.activityLog.entities[log.entity_type] ??
                                    log.entity_type}
                                {log.label && ` ${log.label}`}
                                {log.amount !== null &&
                                    ` · ${formatCurrency(log.amount)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatDateTime(log.created_at)}
                            </p>
                        </li>
                    ))}
                </ul>
            )}

            {(logs.prev_page_url || logs.next_page_url) && (
                <nav
                    aria-label={id.activityLog.pagination}
                    className="flex items-center justify-between gap-3"
                >
                    {logs.prev_page_url ? (
                        <Link
                            href={logs.prev_page_url}
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            {id.history.previous}
                        </Link>
                    ) : (
                        <span />
                    )}
                    <span className="text-sm text-muted-foreground">
                        {logs.current_page} / {logs.last_page}
                    </span>
                    {logs.next_page_url ? (
                        <Link
                            href={logs.next_page_url}
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
