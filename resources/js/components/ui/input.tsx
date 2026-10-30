import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({
    className,
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                'h-11 w-full rounded-md border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-60 aria-invalid:border-destructive md:text-sm',
                className,
            )}
            {...props}
        />
    );
}
