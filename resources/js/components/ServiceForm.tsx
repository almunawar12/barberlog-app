import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format-currency';
import { id } from '@/locales/id';
import services from '@/routes/services';
import type { Service } from '@/types/service';

type ServiceFormProps = {
    /** Existing service to edit; omit to add a new one. */
    service?: Service;
};

export default function ServiceForm({ service }: ServiceFormProps) {
    const form = useForm({
        name: service?.name ?? '',
        price: service ? String(service.price) : '',
        is_active: service?.is_active ?? true,
    });
    const fieldId = (field: string) =>
        `service-${service?.id ?? 'new'}-${field}`;

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ ...data, price: Number(data.price) }));

        if (service) {
            form.submit(services.update(service.id));
        } else {
            form.submit(services.store(), { onSuccess: () => form.reset() });
        }
    }

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <TextField
                    id={fieldId('name')}
                    label={id.settings.serviceName}
                    value={form.data.name}
                    onChange={(event) =>
                        form.setData('name', event.target.value)
                    }
                    error={form.errors.name}
                    maxLength={100}
                    required
                />
                <TextField
                    id={fieldId('price')}
                    label={id.settings.servicePrice}
                    inputMode="numeric"
                    value={form.data.price}
                    onChange={(event) =>
                        form.setData(
                            'price',
                            event.target.value.replace(/\D/g, ''),
                        )
                    }
                    error={form.errors.price}
                    hint={
                        form.data.price
                            ? formatCurrency(Number(form.data.price))
                            : undefined
                    }
                    required
                />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                {service ? (
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-5 accent-primary"
                            checked={form.data.is_active}
                            onChange={(event) =>
                                form.setData('is_active', event.target.checked)
                            }
                        />
                        {id.settings.serviceActive}
                    </label>
                ) : (
                    <span />
                )}
                <Button type="submit" disabled={form.processing}>
                    {form.processing
                        ? id.common.saving
                        : service
                          ? id.common.save
                          : id.settings.addService}
                </Button>
            </div>
        </form>
    );
}
