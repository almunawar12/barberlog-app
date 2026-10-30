import { cn } from '@/lib/utils';
import { id } from '@/locales/id';
import type { PaymentMethod } from '@/types/records';

const methods: PaymentMethod[] = ['cash', 'qris', 'transfer'];

type PaymentMethodFieldProps = {
    value: PaymentMethod;
    onChange: (method: PaymentMethod) => void;
    error?: string;
};

export default function PaymentMethodField({
    value,
    onChange,
    error,
}: PaymentMethodFieldProps) {
    return (
        <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">
                {id.common.paymentMethod}
            </legend>
            <div className="grid grid-cols-3 gap-2">
                {methods.map((method) => (
                    <label
                        key={method}
                        className={cn(
                            'flex min-h-11 cursor-pointer items-center justify-center rounded-md border text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
                            value === method
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input bg-card hover:bg-secondary',
                        )}
                    >
                        <input
                            type="radio"
                            name="payment_method"
                            value={method}
                            checked={value === method}
                            onChange={() => onChange(method)}
                            className="sr-only"
                        />
                        {id.payment[method]}
                    </label>
                ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </fieldset>
    );
}
