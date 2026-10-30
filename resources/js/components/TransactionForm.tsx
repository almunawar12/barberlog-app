import { Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import FormAlert from '@/components/FormAlert';
import PaymentMethodField from '@/components/PaymentMethodField';
import { TextField } from '@/components/TextField';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { formatCurrency } from '@/lib/format-currency';
import {
    dateTimeInputToIso,
    isoToDateTimeInput,
    nowAsDateTimeInput,
} from '@/lib/jakarta-time';
import { id } from '@/locales/id';
import settings from '@/routes/settings';
import transactions from '@/routes/transactions';
import type {
    PaymentMethod,
    ServiceOption,
    TransactionRecord,
} from '@/types/records';

type ItemState = { service_id: string; quantity: string; unit_price: string };

type TransactionFormProps = {
    services: ServiceOption[];
    defaultServiceId?: number | null;
    /** Present when editing an existing transaction. */
    transaction?: TransactionRecord;
};

function emptyItem(service?: ServiceOption): ItemState {
    return {
        service_id: service ? String(service.id) : '',
        quantity: '1',
        unit_price: service ? String(service.price) : '',
    };
}

export default function TransactionForm({
    services,
    defaultServiceId = null,
    transaction,
}: TransactionFormProps) {
    const [initial] = useState(() => ({
        occurred_at: transaction
            ? isoToDateTimeInput(transaction.occurred_at)
            : nowAsDateTimeInput(),
        payment_method: (transaction?.payment_method ??
            'cash') as PaymentMethod,
        items: transaction
            ? transaction.items.map((item): ItemState => ({
                  service_id: String(item.service_id),
                  quantity: String(item.quantity),
                  unit_price: String(item.unit_price),
              }))
            : [emptyItem(services.find((s) => s.id === defaultServiceId))],
        note: transaction?.note ?? '',
        // One key per logical submission: a retry after a timeout reuses it, so it cannot double-record.
        idempotency_key: crypto.randomUUID(),
        expected_version: transaction?.version ?? 0,
    }));
    const [maxDateTime] = useState(nowAsDateTimeInput);
    const [uncertain, setUncertain] = useState(false);
    const form = useForm(initial);
    const guard = useUnsavedChangesGuard(form.isDirty);
    const errors: Partial<Record<string, string>> = form.errors;

    if (services.length === 0) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    {id.transaction.noServices}
                </p>
                <Link href={settings.edit().url} className={buttonVariants()}>
                    {id.transaction.goToSettings}
                </Link>
            </div>
        );
    }

    const preview = form.data.items.reduce(
        (sum, item) =>
            sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0,
    );

    function updateItem(index: number, changes: Partial<ItemState>) {
        form.setData(
            'items',
            form.data.items.map((item, i) =>
                i === index ? { ...item, ...changes } : item,
            ),
        );
    }

    function chooseService(index: number, serviceId: string) {
        const service = services.find((s) => String(s.id) === serviceId);
        // The master price is only a starting point; the owner can still change it.
        updateItem(index, {
            service_id: serviceId,
            unit_price: service ? String(service.price) : '',
        });
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        setUncertain(false);

        form.transform((data) => ({
            ...data,
            occurred_at: dateTimeInputToIso(data.occurred_at),
            items: data.items.map((item) => ({
                service_id: Number(item.service_id),
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
            })),
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

        if (transaction) {
            form.submit(transactions.update(transaction.id), options);
        } else {
            form.submit(transactions.store(), options);
        }
    }

    const conflict = errors.conflict;
    const generalError = errors.items ?? errors.idempotency_key;

    return (
        <form onSubmit={submit} className="space-y-5">
            {conflict && (
                <FormAlert>
                    <p>{conflict}</p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                    >
                        {id.common.reload}
                    </Button>
                </FormAlert>
            )}
            {uncertain && <FormAlert>{id.errors.uncertain}</FormAlert>}
            {generalError && <FormAlert>{generalError}</FormAlert>}

            <div className="space-y-4">
                {form.data.items.map((item, index) => (
                    <div
                        key={index}
                        className="space-y-3 rounded-md border border-border bg-card p-3"
                    >
                        <div className="space-y-1.5">
                            <label
                                htmlFor={`item-${index}-service`}
                                className="text-sm font-medium"
                            >
                                {id.transaction.service}
                            </label>
                            <Select
                                id={`item-${index}-service`}
                                value={item.service_id}
                                onChange={(event) =>
                                    chooseService(index, event.target.value)
                                }
                                aria-invalid={
                                    errors[`items.${index}.service_id`]
                                        ? true
                                        : undefined
                                }
                                required
                            >
                                <option value="" disabled>
                                    {id.transaction.selectService}
                                </option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.id}>
                                        {service.name}
                                    </option>
                                ))}
                            </Select>
                            {errors[`items.${index}.service_id`] && (
                                <p className="text-sm text-destructive">
                                    {errors[`items.${index}.service_id`]}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-[6rem_1fr] gap-3">
                            <TextField
                                id={`item-${index}-quantity`}
                                label={id.transaction.quantity}
                                inputMode="numeric"
                                value={item.quantity}
                                onChange={(event) =>
                                    updateItem(index, {
                                        quantity: event.target.value.replace(
                                            /\D/g,
                                            '',
                                        ),
                                    })
                                }
                                error={errors[`items.${index}.quantity`]}
                                required
                            />
                            <TextField
                                id={`item-${index}-price`}
                                label={id.transaction.price}
                                inputMode="numeric"
                                value={item.unit_price}
                                onChange={(event) =>
                                    updateItem(index, {
                                        unit_price: event.target.value.replace(
                                            /\D/g,
                                            '',
                                        ),
                                    })
                                }
                                error={errors[`items.${index}.unit_price`]}
                                hint={
                                    item.unit_price
                                        ? formatCurrency(
                                              Number(item.unit_price),
                                          )
                                        : undefined
                                }
                                required
                            />
                        </div>
                        {form.data.items.length > 1 && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    form.setData(
                                        'items',
                                        form.data.items.filter(
                                            (_, i) => i !== index,
                                        ),
                                    )
                                }
                            >
                                <Trash2 aria-hidden />
                                {id.transaction.removeService}
                            </Button>
                        )}
                    </div>
                ))}
                <Button
                    variant="secondary"
                    onClick={() =>
                        form.setData('items', [...form.data.items, emptyItem()])
                    }
                >
                    <Plus aria-hidden />
                    {id.transaction.addService}
                </Button>
            </div>

            <PaymentMethodField
                value={form.data.payment_method}
                onChange={(method) => form.setData('payment_method', method)}
                error={errors.payment_method}
            />

            <details
                className="rounded-md border border-border bg-card p-3"
                open={Boolean(errors.occurred_at || errors.note)}
            >
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
                    {id.common.details}
                </summary>
                <div className="mt-2 space-y-4">
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
                    <TextField
                        id="note"
                        label={id.common.note}
                        value={form.data.note}
                        maxLength={500}
                        onChange={(event) =>
                            form.setData('note', event.target.value)
                        }
                        error={errors.note}
                    />
                </div>
            </details>

            <p className="flex items-baseline justify-between text-sm text-muted-foreground">
                <span>{id.transaction.totalPreview}</span>
                <strong className="text-lg text-foreground">
                    {formatCurrency(preview)}
                </strong>
            </p>

            <Button type="submit" className="w-full" disabled={form.processing}>
                {form.processing ? id.common.saving : id.common.save}
            </Button>
        </form>
    );
}
