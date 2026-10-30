import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { AsyncView } from '@/components/AsyncView';
import { ServiceForm } from '@/components/ServiceForm';
import { useServices } from '@/features/queries';
import { id } from '@/locales/id';

export default function EditService() {
  const { id: serviceId } = useLocalSearchParams<{ id: string }>();
  const services = useServices();
  const service = services.data?.find((candidate) => String(candidate.id) === serviceId);

  return (
    <>
      <Stack.Screen options={{ title: id.settings.editService }} />
      <AsyncView isLoading={services.isLoading} error={services.error} onRetry={() => void services.refetch()}>
        {service ? <ServiceForm key={`${service.id}-${service.price}-${service.name}`} service={service} /> : <Text>{id.errors.notFound}</Text>}
      </AsyncView>
    </>
  );
}
