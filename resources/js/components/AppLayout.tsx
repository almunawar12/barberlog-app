import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChartColumn, History, House, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { id } from '@/locales/id';
import { cn } from '@/lib/utils';
import { dashboard, history, logout, reports } from '@/routes';
import settings from '@/routes/settings';

const navItems = [
    { label: id.nav.dashboard, href: dashboard().url, icon: House },
    { label: id.nav.history, href: history().url, icon: History },
    { label: id.nav.reports, href: reports().url, icon: ChartColumn },
    { label: id.nav.settings, href: settings.edit().url, icon: Settings },
];

type AppLayoutProps = {
    title: string;
    children: ReactNode;
};

export function LogoutButton({ className }: { className?: string }) {
    const [loggingOut, setLoggingOut] = useState(false);

    return (
        <Button
            variant="outline"
            className={className}
            disabled={loggingOut}
            onClick={() =>
                router.post(
                    logout(),
                    {},
                    {
                        onStart: () => setLoggingOut(true),
                        onFinish: () => setLoggingOut(false),
                    },
                )
            }
        >
            <LogOut aria-hidden />
            {loggingOut ? id.common.loggingOut : id.common.logout}
        </Button>
    );
}

export default function AppLayout({ title, children }: AppLayoutProps) {
    const page = usePage();
    const message = page.props.status
        ? id.status[page.props.status]
        : undefined;

    return (
        <div className="min-h-screen md:flex">
            <Head title={title} />

            <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card p-4 md:flex">
                <img
                    src="/web/logo-transparent.png"
                    alt="BarberLog"
                    className="-my-3 w-48"
                />
                <nav
                    aria-label={id.nav.primary}
                    className="mt-6 flex flex-1 flex-col gap-1"
                >
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            {...item}
                            currentUrl={page.url}
                        />
                    ))}
                </nav>
                <LogoutButton />
            </aside>

            <main className="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">
                <div className="mx-auto max-w-2xl space-y-6">
                    {message && (
                        <p
                            role="status"
                            className="rounded-md border border-border bg-secondary px-4 py-3 text-sm font-medium"
                        >
                            {message}
                        </p>
                    )}
                    {children}
                </div>
            </main>

            <nav
                aria-label={id.nav.primary}
                className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
            >
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        {...item}
                        currentUrl={page.url}
                        stacked
                    />
                ))}
            </nav>
        </div>
    );
}

type NavLinkProps = (typeof navItems)[number] & {
    currentUrl: string;
    stacked?: boolean;
};

function NavLink({
    label,
    href,
    icon: Icon,
    currentUrl,
    stacked,
}: NavLinkProps) {
    const active = currentUrl === href || currentUrl.startsWith(`${href}/`);

    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                stacked &&
                    'min-h-16 flex-1 flex-col justify-center gap-1 rounded-none text-xs',
                active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60',
                active && 'border-accent',
                active && (stacked ? 'border-t-2' : 'border-l-2'),
            )}
        >
            <Icon className="size-5" aria-hidden />
            {label}
        </Link>
    );
}
