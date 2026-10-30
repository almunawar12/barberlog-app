import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

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
import { colors } from '@/theme';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types';

const categories: ExpenseCategory[] = ['supplies', 'utilities', 'rent', 'other'];

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export function ExpenseForm({ expense }: { expense?: Expense }) {
  const queryClient = useQueryClient();

  const [initial] = useState(() => ({
    description: expense?.description ?? '',
    amount: expense ? String(expense.amount) : '',
    category: expense?.category ?? '',
    paymentMethod: (expense?.payment_method ?? 'cash') as PaymentMethod,
    occurredAt: expense ? isoToJakartaDateTime(expense.occurred_at) : nowInJakarta(),
  }));
  const [description, setDescription] = useState(initial.description);
  const [amount, setAmount] = useState(initial.amount);
  const [category, setCategory] = useState<string>(initial.category);
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod);
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt);
  const [showDetails, setShowDetails] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  // One key per logical submission: a retry after a timeout reuses it, so it cannot record twice.
  const [idempotencyKey] = useState(() => Crypto.randomUUID());

  const dirty = JSON.stringify({ description, amount, category, paymentMethod, occurredAt }) !== JSON.stringify(initial);
  const guard = useUnsavedChangesGuard(dirty);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        occurred_at: jakartaDateTimeToIso(occurredAt),
        description: description.trim(),
        category: category === '' ? null : category,
        amount: Number(amount),
        payment_method: paymentMethod,
      };

      return expense
        ? request<{ data: Expense }>(`/expenses/${expense.id}`, {
            method: 'PUT',
            body: { ...body, expected_version: expense.version },
          })
        : request<{ data: Expense }>('/expenses', { method: 'POST', body, idempotencyKey });
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const fieldError = (path: string) => failure?.fieldErrors[path];
  const detailsOpen = showDetails || Boolean(fieldError('occurred_at') || fieldError('category'));

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
    notify(expense ? id.toast.expenseUpdated : id.toast.expenseSaved);

    if (expense) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  function reload() {
    guard.allowNavigation();
    void queryClient.invalidateQueries();

    if (expense) {
      router.back();
    } else {
      router.replace('/expense/new');
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
      {fieldError('idempotency_key') && <FormAlert message={fieldError('idempotency_key') ?? ''} />}

      <TextField
        label={id.expense.description}
        value={description}
        maxLength={255}
        onChangeText={setDescription}
        error={fieldError('description')}
      />
      <TextField
        label={id.expense.amount}
        keyboardType="number-pad"
        value={amount}
        onChangeText={(value) => setAmount(digitsOnly(value))}
        error={fieldError('amount')}
        hint={amount ? formatCurrency(Number(amount)) : undefined}
      />

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
            <SelectField
              label={id.expense.category}
              value={category}
              placeholder={id.expense.noCategory}
              options={[
                { value: '', label: id.expense.noCategory },
                ...categories.map((value) => ({ value, label: id.category[value] })),
              ]}
              onChange={setCategory}
              error={fieldError('category')}
            />
            <DateTimeField label={id.common.dateTime} value={occurredAt} onChange={setOccurredAt} error={fieldError('occurred_at')} />
          </>
        )}
      </Card>

      <Button title={mutation.isPending ? id.common.saving : id.common.save} loading={mutation.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  detailsToggle: { minHeight: 48, justifyContent: 'center' },
  detailsText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
});
