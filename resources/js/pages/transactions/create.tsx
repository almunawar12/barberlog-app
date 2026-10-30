import AppLayout from '@/components/AppLayout';
import TransactionForm from '@/components/TransactionForm';
import { id } from '@/locales/id';
import type { ServiceOption } from '@/types/records';

type CreateTransactionProps = {
    services: ServiceOption[];
    default_service_id: number | null;
};

export default function CreateTransaction({
    services,
    default_service_id,
}: CreateTransactionProps) {
    return (
        <AppLayout title={id.transaction.newTitle}>
            <h1 className="text-2xl font-semibold">
                {id.transaction.newTitle}
            </h1>
            <TransactionForm
                services={services}
                defaultServiceId={default_service_id}
            />
        </AppLayout>
    );
}
