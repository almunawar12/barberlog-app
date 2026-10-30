import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type GuestLayoutProps = {
    title: string;
    status?: string | null;
    children: ReactNode;
};

export default function GuestLayout({
    title,
    status,
    children,
}: GuestLayoutProps) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
            <Head title={title} />
            <img
                src="/web/logo-transparent.png"
                alt="BarberLog"
                className="-my-4 mb-2 w-56"
            />
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status && (
                        <p
                            role="status"
                            className="rounded-md border border-border bg-secondary px-3 py-2 text-sm"
                        >
                            {status}
                        </p>
                    )}
                    {children}
                </CardContent>
            </Card>
        </main>
    );
}
