import { Stack } from 'expo-router';

import { ServiceForm } from '@/components/ServiceForm';
import { id } from '@/locales/id';

export default function NewService() {
  return (
    <>
      <Stack.Screen options={{ title: id.settings.newService }} />
      <ServiceForm />
    </>
  );
}
