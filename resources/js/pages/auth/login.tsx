import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import GuestLayout from '@/components/GuestLayout';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { id } from '@/locales/id';
import { request } from '@/routes/password';
import login from '@/routes/login';

export default function Login() {
    const { status } = usePage().props;
    const form = useForm({ email: '', password: '', remember: false });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.submit(login.store(), {
            onFinish: () => form.reset('password'),
        });
    }

    return (
        <GuestLayout title={id.auth.login} status={status}>
            <form onSubmit={submit} className="space-y-4">
                <TextField
                    id="email"
                    type="email"
                    label={id.auth.email}
                    autoComplete="username"
                    value={form.data.email}
                    onChange={(event) =>
                        form.setData('email', event.target.value)
                    }
                    error={form.errors.email}
                    required
                    autoFocus
                />
                <TextField
                    id="password"
                    type="password"
                    label={id.auth.password}
                    autoComplete="current-password"
                    value={form.data.password}
                    onChange={(event) =>
                        form.setData('password', event.target.value)
                    }
                    error={form.errors.password}
                    required
                />
                <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        className="size-5 accent-primary"
                        checked={form.data.remember}
                        onChange={(event) =>
                            form.setData('remember', event.target.checked)
                        }
                    />
                    {id.auth.remember}
                </label>
                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.processing}
                >
                    {form.processing ? id.auth.loggingIn : id.auth.login}
                </Button>
                <Link
                    href={request().url}
                    className="block text-center text-sm font-medium text-accent-text underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    {id.auth.forgotPassword}
                </Link>
            </form>
        </GuestLayout>
    );
}
