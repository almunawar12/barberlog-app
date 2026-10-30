import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { id } from '@/locales/id';

/**
 * Asks before leaving a form with unsaved changes. Call allowNavigation() right
 * before the form's own submit so saving is not mistaken for leaving.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
    const bypass = useRef(false);

    useEffect(() => {
        const removeListener = router.on('before', () => {
            if (!isDirty || bypass.current) {
                return;
            }

            return window.confirm(id.common.leaveConfirm);
        });

        const warnOnUnload = (event: BeforeUnloadEvent) => {
            if (isDirty && !bypass.current) {
                event.preventDefault();
            }
        };
        window.addEventListener('beforeunload', warnOnUnload);

        return () => {
            removeListener();
            window.removeEventListener('beforeunload', warnOnUnload);
        };
    }, [isDirty]);

    return {
        allowNavigation: () => {
            bypass.current = true;
        },
        restoreGuard: () => {
            bypass.current = false;
        },
    };
}
