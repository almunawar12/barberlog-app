import { Stack, useLocalSearchParams } from 'expo-router';

import { AsyncView } from '@/components/AsyncView';
import { TransactionForm } from '@/components/TransactionForm';
import { useServices, useTransaction } from '@/features/queries';
import { id } from '@/locales/id';

export default function EditTransaction() {
  const { id: transactionId } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(transactionId);
  const services = useServices();

  return (
    <>
      <Stack.Screen options={{ title: id.transaction.editTitle }} />
      <AsyncView
        isLoading={transaction.isLoading || services.isLoading}
        error={transaction.error ?? services.error}
        onRetry={() => {
          void transaction.refetch();
          void services.refetch();
        }}
      >
        {transaction.data && services.data && (
          // Remount on a new version so the form never keeps stale values.
          <TransactionForm key={transaction.data.version} services={services.data} transaction={transaction.data} />
        )}
      </AsyncView>
    </>
  );
}
