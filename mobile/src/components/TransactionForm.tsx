import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateTimeField } from '@/components/DateFields';
import { FormAlert } from '@/components/FormAlert';
import { PaymentMethodField } from '@/components/PaymentMethodField';
import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { request } from '@/lib/api-client';
import { describeWriteError } from '@/lib/errors';
import type { WriteFailure } from '@/lib/errors';
import { formatCurrency } from '@/lib/format-currency';
import { isoToJakartaDateTime, jakartaDateTimeToIso, nowInJakarta } from '@/lib/jakarta-time';
import { notify } from '@/lib/notify';
import { id } from '@/locales/id';
import { colors, spacing } from '@/theme';
import type { PaymentMethod, Service, Transaction } from '@/types';

type ItemState = { serviceId: string; quantity: string; unitPrice: string };

type TransactionFormProps = {
  /** Every service; inactive ones are offered only when already on the record being edited. */
  services: Service[];
  defaultServiceId?: number | null;
  /** Present when editing an existing transaction. */
  transaction?: Transaction;
};

const digitsOnly = (value: string) => value.replace(/\D/g, '');

function newItem(service?: Service): ItemState {
  return { serviceId: service ? String(service.id) : '', quantity: '1', unitPrice: service ? String(service.price) : '' };
}

export function TransactionForm({ services, defaultServiceId = null, transaction }: TransactionFormProps) {
  const queryClient = useQueryClient();
  const usedIds = new Set(transaction?.items.map((item) => item.service_id));
  const selectable = services.filter((service) => service.is_active || usedIds.has(service.id));

  const [initial] = useState(() => ({
    occurredAt: transaction ? isoToJakartaDateTime(transaction.occurred_at) : nowInJakarta(),
    paymentMethod: (transaction?.payment_method ?? 'cash') as PaymentMethod,
    items: transaction
      ? transaction.items.map(
          (item): ItemState => ({
            serviceId: String(item.service_id),
            quantity: String(item.quantity),
            unitPrice: String(item.unit_price),
          }),
        )
      : [newItem(selectable.find((service) => service.id === defaultServiceId))],
    note: transaction?.note ?? '',
  }));
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt);
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod);
  const [items, setItems] = useState(initial.items);
  const [note, setNote] = useState(initial.note);
  const [showDetails, setShowDetails] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  // One key per logical submission: a retry after a timeout reuses it, so it cannot record twice.
  const [idempotencyKey] = useState(() => Crypto.randomUUID());

  const dirty = JSON.stringify({ occurredAt, paymentMethod, items, note }) !== JSON.stringify(initial);
  const guard = useUnsavedChangesGuard(dirty);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        occurred_at: jakartaDateTimeToIso(occurredAt),
        payment_method: paymentMethod,
        items: items.map((item) => ({
          service_id: Number(item.serviceId),
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
        })),
        note: note.trim() === '' ? null : note.trim(),
      };

      return transaction
        ? request<{ data: Transaction }>(`/transactions/${transaction.id}`, {
            method: 'PUT',
            body: { ...body, expected_version: transaction.version },
          })
        : request<{ data: Transaction }>('/transactions', { method: 'POST', body, idempotencyKey });
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (selectable.length === 0) {
    return (
      <Screen>
        <Text style={styles.muted}>{id.transaction.noServices}</Text>
        <Button title={id.transaction.goToSettings} onPress={() => router.push('/settings')} />
      </Screen>
    );
  }

  const preview = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const fieldError = (path: string) => failure?.fieldErrors[path];
  const generalError = fieldError('items') ?? fieldError('idempotency_key');
  const detailsOpen = showDetails || Boolean(fieldError('occurred_at') || fieldError('note'));

  function updateItem(index: number, changes: Partial<ItemState>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  function chooseService(index: number, serviceId: string) {
    const service = selectable.find((candidate) => String(candidate.id) === serviceId);

    // The master price is only a starting point; the owner can still change it.
    updateItem(index, { serviceId, unitPrice: service ? String(service.price) : '' });
  }

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
    notify(transaction ? id.toast.transactionUpdated : id.toast.transactionSaved);

    if (transaction) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  function reload() {
    guard.allowNavigation();
    void queryClient.invalidateQueries();

    if (transaction) {
      router.back();
    } else {
      router.replace('/transaction/new');
    }
  }

  return (
    <Screen>
      {failure?.kind === 'conflict' && (
        <FormAlert message={failure.message}>
          <Button title={id.common.reload} variant="outline" onPress={reload} />
        </FormAlert>
      )}
      {failure && failure.kind !== 'conflict' && failure.kind !== 'validation' && <FormAlert message={failure.message} />}
      {generalError && <FormAlert message={generalError} />}

      {items.map((item, index) => (
        <Card key={index}>
          <SelectField
            label={id.transaction.service}
            placeholder={id.transaction.selectService}
            value={item.serviceId}
            options={selectable.map((service) => ({ value: String(service.id), label: service.name }))}
            onChange={(value) => chooseService(index, value)}
            error={fieldError(`items.${index}.service_id`)}
          />
          <View style={styles.pair}>
            <View style={styles.quantity}>
              <TextField
                label={id.transaction.quantity}
                keyboardType="number-pad"
                value={item.quantity}
                onChangeText={(value) => updateItem(index, { quantity: digitsOnly(value) })}
                error={fieldError(`items.${index}.quantity`)}
              />
            </View>
            <View style={styles.price}>
              <TextField
                label={id.transaction.price}
                keyboardType="number-pad"
                value={item.unitPrice}
                onChangeText={(value) => updateItem(index, { unitPrice: digitsOnly(value) })}
                error={fieldError(`items.${index}.unit_price`)}
                hint={item.unitPrice ? formatCurrency(Number(item.unitPrice)) : undefined}
              />
            </View>
          </View>
          {items.length > 1 && (
            <Button
              title={id.transaction.removeService}
              variant="outline"
              onPress={() => setItems((current) => current.filter((_, i) => i !== index))}
            />
          )}
        </Card>
      ))}
      <Button title={id.transaction.addService} variant="secondary" onPress={() => setItems((current) => [...current, newItem()])} />

      <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} error={fieldError('payment_method')} />

      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          onPress={() => setShowDetails((open) => !open)}
          style={styles.detailsToggle}
        >
          <Text style={styles.detailsText}>{id.common.details}</Text>
        </Pressable>
        {detailsOpen && (
          <>
            <DateTimeField label={id.common.dateTime} value={occurredAt} onChange={setOccurredAt} error={fieldError('occurred_at')} />
            <TextField label={id.common.note} value={note} maxLength={500} onChangeText={setNote} error={fieldError('note')} />
          </>
        )}
      </Card>

      <View style={styles.totalRow} accessible accessibilityLabel={`${id.transaction.totalPreview}: ${formatCurrency(preview)}`}>
        <Text style={styles.muted}>{id.transaction.totalPreview}</Text>
        <Text style={styles.total}>{formatCurrency(preview)}</Text>
      </View>

      <Button title={mutation.isPending ? id.common.saving : id.common.save} loading={mutation.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: spacing.md },
  quantity: { width: 96 },
  price: { flex: 1 },
  detailsToggle: { minHeight: 48, justifyContent: 'center' },
  detailsText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  total: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  muted: { flex: 1, fontSize: 14, color: colors.mutedForeground },
});
