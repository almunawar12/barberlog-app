import { Link, usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import DeleteRecordButton from '@/components/DeleteRecordButton';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import transactions from '@/routes/transactions';
import type { TransactionRecord } from '@/types/records';

export default function ShowTransaction({
    transaction,
}: {
    transaction: TransactionRecord;
}) {
    const { auth } = usePage().props;

    return (
        <AppLayout title={id.transaction.title}>
            <header>
                <h1 className="text-2xl font-semibold">
                    {id.transaction.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {transaction.reference}
                </p>
            </header>

            <Card>
                <CardContent className="space-y-4">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">
                            {id.common.dateTime}
                        </dt>
                        <dd>{formatDateTime(transaction.occurred_at)}</dd>
                        <dt className="text-muted-foreground">
                            {id.common.paymentMethod}
                        </dt>
                        <dd>{id.payment[transaction.payment_method]}</dd>
                        {transaction.note && (
                            <>
                                <dt className="text-muted-foreground">
                                    {id.common.note}
                                </dt>
                                <dd>{transaction.note}</dd>
                            </>
                        )}
                    </dl>

                    <ul className="divide-y divide-border border-y border-border">
                        {transaction.items.map((item) => (
                            <li
                                key={item.id}
                                className="flex items-baseline justify-between gap-3 py-2 text-sm"
                            >
                                <span>
                                    {item.service_name}
                                    <span className="block text-xs text-muted-foreground">
                                        {item.quantity} ×{' '}
                                        {formatCurrency(item.unit_price)}
                                    </span>
                                </span>
                                <span className="font-medium">
                                    {formatCurrency(item.line_total)}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <p className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">
                            {id.common.total}
                        </span>
                        <strong className="text-xl">
                            {formatCurrency(transaction.total_amount)}
                        </strong>
                    </p>
                </CardContent>
            </Card>

            {auth.is_admin && (
                <div className="flex flex-wrap gap-3">
                    <Link
                        href={transactions.edit(transaction.id).url}
                        className={buttonVariants({ variant: 'outline' })}
                    >
                        <Pencil aria-hidden />
                        {id.common.edit}
                    </Link>
                    <DeleteRecordButton
                        url={transactions.destroy(transaction.id).url}
                        version={transaction.version}
                        occurredAt={transaction.occurred_at}
                        amount={transaction.total_amount}
                        title={id.transaction.deleteTitle}
                        body={id.transaction.deleteBody}
                        confirmLabel={id.transaction.deleteConfirm}
                    />
                </div>
            )}
        </AppLayout>
    );
}
