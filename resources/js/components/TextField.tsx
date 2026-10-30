import type { InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    error?: string;
    hint?: string;
};

/** Label, input and an inline validation message wired together for screen readers. */
export function TextField({
    id,
    label,
    error,
    hint,
    ...props
}: TextFieldProps) {
    const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <Input
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={messageId}
                {...props}
            />
            {error ? (
                <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className="text-sm text-muted-foreground">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
