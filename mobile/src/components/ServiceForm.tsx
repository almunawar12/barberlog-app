import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormAlert } from '@/components/FormAlert';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { request } from '@/lib/api-client';
import { describeWriteError } from '@/lib/errors';
import type { WriteFailure } from '@/lib/errors';
import { formatCurrency } from '@/lib/format-currency';
import { notify } from '@/lib/notify';
import { id } from '@/locales/id';
import { colors, spacing } from '@/theme';
import type { Service } from '@/types';

export function ServiceForm({ service }: { service?: Service }) {
  const queryClient = useQueryClient();
  const [initial] = useState(() => ({
    name: service?.name ?? '',
    price: service ? String(service.price) : '',
    isActive: service?.is_active ?? true,
  }));
  const [name, setName] = useState(initial.name);
  const [price, setPrice] = useState(initial.price);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [failure, setFailure] = useState<WriteFailure | null>(null);

  const dirty = JSON.stringify({ name, price, isActive }) !== JSON.stringify(initial);
  const guard = useUnsavedChangesGuard(dirty);

  const mutation = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), price: Number(price), is_active: isActive };

      return service
        ? request(`/services/${service.id}`, { method: 'PUT', body })
        : request('/services', { method: 'POST', body });
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  async function submit() {
    setFailure(null);

    try {
      await mutation.mutateAsync();
    } catch (error) {
      const described = describeWriteError(error);

      if (described.kind !== 'unauthorized') {
        setFailure(described);
      }

      return;
    }

    guard.allowNavigation();
    notify(id.toast.serviceSaved);
    router.back();
  }

  return (
    <Screen>
      {failure && failure.kind !== 'validation' && <FormAlert message={failure.message} />}
      <TextField
        label={id.settings.serviceName}
        value={name}
        maxLength={100}
        onChangeText={setName}
        error={failure?.fieldErrors.name}
      />
      <TextField
        label={id.settings.servicePrice}
        keyboardType="number-pad"
        value={price}
        onChangeText={(value) => setPrice(value.replace(/\D/g, ''))}
        error={failure?.fieldErrors.price}
        hint={price ? formatCurrency(Number(price)) : undefined}
      />
      {service && (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{id.settings.serviceActive}</Text>
          <Switch
            accessibilityLabel={id.settings.serviceActive}
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: colors.primary, false: colors.input }}
            thumbColor={colors.card}
          />
        </View>
      )}
      <Button title={mutation.isPending ? id.common.saving : id.common.save} loading={mutation.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: { fontSize: 16, color: colors.foreground },
});
