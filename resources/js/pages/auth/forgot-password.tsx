import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import GuestLayout from '@/components/GuestLayout';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { id } from '@/locales/id';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword() {
    const { status } = usePage().props;
    const form = useForm({ email: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.submit(email());
    }

    return (
        <GuestLayout title={id.auth.forgotTitle} status={status}>
            <form onSubmit={submit} className="space-y-4">
                <TextField
                    id="email"
                    type="email"
                    label={id.auth.email}
                    hint={id.auth.forgotHint}
                    autoComplete="username"
                    value={form.data.email}
                    onChange={(event) =>
                        form.setData('email', event.target.value)
                    }
                    error={form.errors.email}
                    required
                    autoFocus
                />
                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.processing}
                >
                    {form.processing ? id.auth.sending : id.auth.sendLink}
                </Button>
                <Link
                    href={login().url}
                    className="block text-center text-sm font-medium text-accent-text underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    {id.auth.backToLogin}
                </Link>
            </form>
        </GuestLayout>
    );
}
