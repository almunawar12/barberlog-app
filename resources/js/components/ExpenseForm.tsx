import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import FormAlert from '@/components/FormAlert';
import PaymentMethodField from '@/components/PaymentMethodField';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { formatCurrency } from '@/lib/format-currency';
import {
    dateTimeInputToIso,
    isoToDateTimeInput,
    nowAsDateTimeInput,
} from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import expenses from '@/routes/expenses';
import type {
    ExpenseCategory,
    ExpenseRecord,
    PaymentMethod,
} from '@/types/records';

const categories: ExpenseCategory[] = [
    'supplies',
    'utilities',
    'rent',
    'other',
];

type ExpenseFormProps = {
    /** Present when editing an existing expense. */
    expense?: ExpenseRecord;
};

export default function ExpenseForm({ expense }: ExpenseFormProps) {
    const [initial] = useState(() => ({
        description: expense?.description ?? '',
        amount: expense ? String(expense.amount) : '',
        category: expense?.category ?? '',
        payment_method: (expense?.payment_method ?? 'cash') as PaymentMethod,
        occurred_at: expense
            ? isoToDateTimeInput(expense.occurred_at)
            : nowAsDateTimeInput(),
        // One key per logical submission: a retry after a timeout reuses it, so it cannot double-record.
        idempotency_key: crypto.randomUUID(),
        expected_version: expense?.version ?? 0,
    }));
    const [maxDateTime] = useState(nowAsDateTimeInput);
    const [uncertain, setUncertain] = useState(false);
    const form = useForm(initial);
    const guard = useUnsavedChangesGuard(form.isDirty);
    const errors: Partial<Record<string, string>> = form.errors;

    function submit(event: FormEvent) {
        event.preventDefault();
        setUncertain(false);

        form.transform((data) => ({
            ...data,
            occurred_at: dateTimeInputToIso(data.occurred_at),
            amount: Number(data.amount),
            category: data.category === '' ? null : data.category,
        }));

        guard.allowNavigation();
        const options = {
            onFinish: guard.restoreGuard,
            onNetworkError: () => {
                setUncertain(true);

                return false;
            },
            onHttpException: () => {
                setUncertain(true);

                return false;
            },
        };

        if (expense) {
            form.submit(expenses.update(expense.id), options);
        } else {
            form.submit(expenses.store(), options);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            {errors.conflict && (
                <FormAlert>
                    <p>{errors.conflict}</p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                    >
                        {id.common.reload}
                    </Button>
                </FormAlert>
            )}
            {uncertain && <FormAlert>{id.errors.uncertain}</FormAlert>}
            {errors.idempotency_key && (
                <FormAlert>{errors.idempotency_key}</FormAlert>
            )}

            <TextField
                id="description"
                label={id.expense.description}
                value={form.data.description}
                maxLength={255}
                onChange={(event) =>
                    form.setData('description', event.target.value)
                }
                error={errors.description}
                required
                autoFocus
            />
            <TextField
                id="amount"
                label={id.expense.amount}
                inputMode="numeric"
                value={form.data.amount}
                onChange={(event) =>
                    form.setData(
                        'amount',
                        event.target.value.replace(/\D/g, ''),
                    )
                }
                error={errors.amount}
                hint={
                    form.data.amount
                        ? formatCurrency(Number(form.data.amount))
                        : undefined
                }
                required
            />

            <PaymentMethodField
                value={form.data.payment_method}
                onChange={(method) => form.setData('payment_method', method)}
                error={errors.payment_method}
            />

            <details
                className="rounded-md border border-border bg-card p-3"
                open={Boolean(errors.occurred_at || errors.category)}
            >
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
                    {id.common.details}
                </summary>
                <div className="mt-2 space-y-4">
                    <div className="space-y-1.5">
                        <label
                            htmlFor="category"
                            className="text-sm font-medium"
                        >
                            {id.expense.category}
                        </label>
                        <Select
                            id="category"
                            value={form.data.category}
                            onChange={(event) =>
                                form.setData('category', event.target.value)
                            }
                            aria-invalid={errors.category ? true : undefined}
                        >
                            <option value="">{id.expense.noCategory}</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {id.category[category]}
                                </option>
                            ))}
                        </Select>
                        {errors.category && (
                            <p className="text-sm text-destructive">
                                {errors.category}
                            </p>
                        )}
                    </div>
                    <TextField
                        id="occurred-at"
                        type="datetime-local"
                        label={id.common.dateTime}
                        value={form.data.occurred_at}
                        max={maxDateTime}
                        onChange={(event) =>
                            form.setData('occurred_at', event.target.value)
                        }
                        error={errors.occurred_at}
                        required
                    />
                </div>
            </details>

            <Button type="submit" className="w-full" disabled={form.processing}>
                {form.processing ? id.common.saving : id.common.save}
            </Button>
        </form>
    );
}
