import AppLayout from '@/components/AppLayout';
import TransactionForm from '@/components/TransactionForm';
import { id } from '@/locales/id';
import type { ServiceOption, TransactionRecord } from '@/types/records';

type EditTransactionProps = {
    transaction: TransactionRecord;
    services: ServiceOption[];
};

export default function EditTransaction({
    transaction,
    services,
}: EditTransactionProps) {
    return (
        <AppLayout title={id.transaction.editTitle}>
            <h1 className="text-2xl font-semibold">
                {id.transaction.editTitle}
            </h1>
            <TransactionForm services={services} transaction={transaction} />
        </AppLayout>
    );
}
