import { Link, usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import DeleteRecordButton from '@/components/DeleteRecordButton';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import expenses from '@/routes/expenses';
import type { ExpenseRecord } from '@/types/records';

export default function ShowExpense({ expense }: { expense: ExpenseRecord }) {
    const { auth } = usePage().props;

    return (
        <AppLayout title={id.expense.title}>
            <header>
                <h1 className="text-2xl font-semibold">{id.expense.title}</h1>
                <p className="text-sm text-muted-foreground">
                    {expense.reference}
                </p>
            </header>

            <Card>
                <CardContent className="space-y-4">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">
                            {id.expense.description}
                        </dt>
                        <dd>{expense.description}</dd>
                        {expense.category && (
                            <>
                                <dt className="text-muted-foreground">
                                    {id.expense.category}
                                </dt>
                                <dd>{id.category[expense.category]}</dd>
                            </>
                        )}
                        <dt className="text-muted-foreground">
                            {id.common.dateTime}
                        </dt>
                        <dd>{formatDateTime(expense.occurred_at)}</dd>
                        <dt className="text-muted-foreground">
                            {id.common.paymentMethod}
                        </dt>
                        <dd>{id.payment[expense.payment_method]}</dd>
                    </dl>
                    <p className="flex items-baseline justify-between border-t border-border pt-3">
                        <span className="text-sm text-muted-foreground">
                            {id.expense.amount}
                        </span>
                        <strong className="text-xl">
                            {formatCurrency(expense.amount)}
                        </strong>
                    </p>
                </CardContent>
            </Card>

            {auth.is_admin && (
                <div className="flex flex-wrap gap-3">
                    <Link
                        href={expenses.edit(expense.id).url}
                        className={buttonVariants({ variant: 'outline' })}
                    >
                        <Pencil aria-hidden />
                        {id.common.edit}
                    </Link>
                    <DeleteRecordButton
                        url={expenses.destroy(expense.id).url}
                        version={expense.version}
                        occurredAt={expense.occurred_at}
                        amount={expense.amount}
                        title={id.expense.deleteTitle}
                        body={id.expense.deleteBody}
                        confirmLabel={id.expense.deleteConfirm}
                    />
                </div>
            )}
        </AppLayout>
    );
}
