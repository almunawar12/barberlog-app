import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import GuestLayout from '@/components/GuestLayout';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { id } from '@/locales/id';
import { update } from '@/routes/password';

type ResetPasswordProps = {
    token: string;
    email: string | null;
};

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const form = useForm({
        token,
        email: email ?? '',
        password: '',
        password_confirmation: '',
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.submit(update(), {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    }

    return (
        <GuestLayout title={id.auth.resetTitle}>
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
                />
                <TextField
                    id="password"
                    type="password"
                    label={id.auth.newPassword}
                    autoComplete="new-password"
                    value={form.data.password}
                    onChange={(event) =>
                        form.setData('password', event.target.value)
                    }
                    error={form.errors.password}
                    required
                    autoFocus
                />
                <TextField
                    id="password_confirmation"
                    type="password"
                    label={id.auth.confirmPassword}
                    autoComplete="new-password"
                    value={form.data.password_confirmation}
                    onChange={(event) =>
                        form.setData(
                            'password_confirmation',
                            event.target.value,
                        )
                    }
                    error={form.errors.password_confirmation}
                    required
                />
                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.processing}
                >
                    {form.processing
                        ? id.auth.resetting
                        : id.auth.resetPassword}
                </Button>
            </form>
        </GuestLayout>
    );
}
