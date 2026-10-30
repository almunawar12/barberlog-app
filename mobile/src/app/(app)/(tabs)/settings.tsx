import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AsyncView } from '@/components/AsyncView';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormAlert } from '@/components/FormAlert';
import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { useMe, useServices, useSettings } from '@/features/queries';
import { request } from '@/lib/api-client';
import { describeWriteError } from '@/lib/errors';
import type { WriteFailure } from '@/lib/errors';
import { formatCurrency } from '@/lib/format-currency';
import { notify } from '@/lib/notify';
import { id } from '@/locales/id';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing, touchTarget } from '@/theme';
import type { Service, Settings as ShopSettings } from '@/types';

export default function SettingsScreen() {
  const settings = useSettings();
  const services = useServices();
  const me = useMe();
  const { signOut } = useAuth();

  async function logout() {
    const { revoked } = await signOut();

    if (!revoked) {
      Alert.alert(id.auth.logoutNotRevokedTitle, id.auth.logoutNotRevokedBody);
    }
  }

  return (
    <Screen>
      <AsyncView
        isLoading={settings.isLoading || services.isLoading}
        error={settings.error ?? services.error}
        onRetry={() => {
          void settings.refetch();
          void services.refetch();
        }}
      >
        {settings.data && services.data && (
          <>
            <ShopSection key={`${settings.data.name}-${settings.data.default_service_id}`} settings={settings.data} services={services.data} />
            <ServicesSection services={services.data} />
          </>
        )}
      </AsyncView>
      <PasswordSection />
      <Card title={id.settings.accountTitle}>
        {me.data && <Text style={styles.muted}>{me.data.email}</Text>}
        <Button title={id.common.logout} variant="outline" onPress={logout} />
      </Card>
    </Screen>
  );
}

function ShopSection({ settings, services }: { settings: ShopSettings; services: Service[] }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(settings.name);
  const [defaultService, setDefaultService] = useState(settings.default_service_id === null ? '' : String(settings.default_service_id));
  const [failure, setFailure] = useState<WriteFailure | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      request('/settings', {
        method: 'PUT',
        body: { name: name.trim(), default_service_id: defaultService === '' ? null : Number(defaultService) },
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  async function submit() {
    setFailure(null);

    try {
      await mutation.mutateAsync();
      notify(id.toast.shopSaved);
    } catch (error) {
      const described = describeWriteError(error);

      if (described.kind !== 'unauthorized') {
        setFailure(described);
      }
    }
  }

  return (
    <Card title={id.settings.shopTitle}>
      {failure && failure.kind !== 'validation' && <FormAlert message={failure.message} />}
      <TextField label={id.settings.shopName} value={name} maxLength={100} onChangeText={setName} error={failure?.fieldErrors.name} />
      <SelectField
        label={id.settings.defaultService}
        value={defaultService}
        placeholder={id.settings.noDefaultService}
        options={[
          { value: '', label: id.settings.noDefaultService },
          ...services.filter((service) => service.is_active).map((service) => ({ value: String(service.id), label: service.name })),
        ]}
        onChange={setDefaultService}
        error={failure?.fieldErrors.default_service_id}
      />
      <Button title={mutation.isPending ? id.common.saving : id.common.save} loading={mutation.isPending} onPress={submit} />
    </Card>
  );
}

function ServicesSection({ services }: { services: Service[] }) {
  return (
    <Card title={id.settings.servicesTitle}>
      <Text style={styles.muted}>{id.settings.servicesHint}</Text>
      {services.length === 0 && <Text style={styles.muted}>{id.settings.noServices}</Text>}
      {services.map((service) => (
        <Pressable
          key={service.id}
          accessibilityRole="button"
          accessibilityLabel={`${service.name}, ${formatCurrency(service.price)}${service.is_active ? '' : `, ${id.settings.inactive}`}`}
          onPress={() => router.push(`/service/${service.id}`)}
          style={styles.serviceRow}
        >
          <View style={styles.serviceMain}>
            <Text style={[styles.serviceName, !service.is_active && styles.inactive]}>{service.name}</Text>
            {!service.is_active && <Text style={styles.muted}>{id.settings.inactive}</Text>}
          </View>
          <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
        </Pressable>
      ))}
      <Button title={id.settings.addService} variant="secondary" onPress={() => router.push('/service/new')} />
    </Card>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [failure, setFailure] = useState<WriteFailure | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      request('/auth/password', {
        method: 'PUT',
        body: { current_password: current, password, password_confirmation: confirmation },
      }),
  });

  async function submit() {
    setFailure(null);

    try {
      await mutation.mutateAsync();
    } catch (error) {
      const described = describeWriteError(error);
      setPassword('');
      setConfirmation('');

      if (described.kind !== 'unauthorized') {
        setFailure(described);
      }

      return;
    }

    setCurrent('');
    setPassword('');
    setConfirmation('');
    notify(id.toast.passwordChanged);
  }

  return (
    <Card title={id.settings.passwordTitle}>
      {failure && failure.kind !== 'validation' && <FormAlert message={failure.message} />}
      <TextField
        label={id.auth.currentPassword}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        error={failure?.fieldErrors.current_password}
      />
      <TextField
        label={id.auth.newPassword}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        error={failure?.fieldErrors.password}
      />
      <TextField
        label={id.auth.confirmPassword}
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        error={failure?.fieldErrors.password_confirmation}
      />
      <Button
        title={mutation.isPending ? id.common.saving : id.auth.changePassword}
        loading={mutation.isPending}
        disabled={current === '' || password === ''}
        onPress={submit}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  muted: { fontSize: 14, color: colors.mutedForeground },
  serviceRow: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceMain: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  inactive: { color: colors.mutedForeground },
  servicePrice: { fontSize: 15, color: colors.foreground },
});
