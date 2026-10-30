import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { id } from '@/locales/id';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    confirmLabel: string;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    children: ReactNode;
};

/** Native <dialog>: focus trap, Escape to close and the backdrop come from the browser. */
export default function ConfirmDialog({
    open,
    title,
    confirmLabel,
    busy,
    onConfirm,
    onCancel,
    children,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            onClose={onCancel}
            className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground backdrop:bg-black/40"
        >
            <h2 id={titleId} className="text-lg font-semibold">
                {title}
            </h2>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                {children}
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={onCancel} disabled={busy}>
                    {id.common.cancel}
                </Button>
                <Button
                    variant="destructive"
                    onClick={onConfirm}
                    disabled={busy}
                >
                    {busy ? id.common.deleting : confirmLabel}
                </Button>
            </div>
        </dialog>
    );
}
