import { Stack } from 'expo-router';

import { AsyncView } from '@/components/AsyncView';
import { TransactionForm } from '@/components/TransactionForm';
import { useServices, useSettings } from '@/features/queries';
import { id } from '@/locales/id';

export default function NewTransaction() {
  const services = useServices();
  const settings = useSettings();

  return (
    <>
      <Stack.Screen options={{ title: id.transaction.newTitle }} />
      <AsyncView
        isLoading={services.isLoading || settings.isLoading}
        error={services.error ?? settings.error}
        onRetry={() => {
          void services.refetch();
          void settings.refetch();
        }}
      >
        {services.data && settings.data && (
          <TransactionForm services={services.data} defaultServiceId={settings.data.default_service_id} />
        )}
      </AsyncView>
    </>
  );
}
