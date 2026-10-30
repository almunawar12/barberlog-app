import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormAlert from '@/components/FormAlert';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { id } from '@/locales/id';

type DeleteRecordButtonProps = {
    url: string;
    version: number;
    occurredAt: string;
    amount: number;
    title: string;
    body: string;
    confirmLabel: string;
};

/** Delete with a confirmation that shows the date and amount being removed. */
export default function DeleteRecordButton({
    url,
    version,
    occurredAt,
    amount,
    title,
    body,
    confirmLabel,
}: DeleteRecordButtonProps) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function fail(message: string) {
        setOpen(false);
        setError(message);

        return false;
    }

    function confirm() {
        setError(null);
        router.delete(url, {
            data: { expected_version: version },
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onError: (errors) =>
                fail(
                    errors.conflict ??
                        errors.expected_version ??
                        id.errors.uncertainDelete,
                ),
            onNetworkError: () => fail(id.errors.uncertainDelete),
            onHttpException: () => fail(id.errors.uncertainDelete),
        });
    }

    return (
        <>
            {error && (
                <FormAlert>
                    <p>{error}</p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                    >
                        {id.common.reload}
                    </Button>
                </FormAlert>
            )}
            <Button variant="destructive" onClick={() => setOpen(true)}>
                <Trash2 aria-hidden />
                {id.common.delete}
            </Button>
            <ConfirmDialog
                open={open}
                title={title}
                confirmLabel={confirmLabel}
                busy={busy}
                onConfirm={confirm}
                onCancel={() => setOpen(false)}
            >
                <p className="font-medium text-foreground">
                    {formatDateTime(occurredAt)} · {formatCurrency(amount)}
                </p>
                <p>{body}</p>
            </ConfirmDialog>
        </>
    );
}
