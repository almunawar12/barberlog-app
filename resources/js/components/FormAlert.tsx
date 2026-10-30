import type { ReactNode } from 'react';

export default function FormAlert({ children }: { children: ReactNode }) {
    return (
        <div
            role="alert"
            className="space-y-2 rounded-md border border-destructive bg-card px-3 py-2 text-sm text-destructive"
        >
            {children}
        </div>
    );
}
