import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormAlert } from '@/components/FormAlert';
import { useMe } from '@/features/queries';
import { request } from '@/lib/api-client';
import { describeWriteError } from '@/lib/errors';
import type { WriteFailure } from '@/lib/errors';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/jakarta-time';
import { notify } from '@/lib/notify';
import { id } from '@/locales/id';
import { spacing } from '@/theme';

type RecordActionsProps = {
  kind: 'transaction' | 'expense';
  recordId: number;
  version: number;
  occurredAt: string;
  amount: number;
  deleteTitle: string;
  deleteBody: string;
};

/** Edit and delete for a record; delete asks first, showing the date and amount being removed. */
export function RecordActions({ kind, recordId, version, occurredAt, amount, deleteTitle, deleteBody }: RecordActionsProps) {
  const queryClient = useQueryClient();
  const me = useMe();
  const [failure, setFailure] = useState<WriteFailure | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      request(`/${kind === 'transaction' ? 'transactions' : 'expenses'}/${recordId}`, {
        method: 'DELETE',
        body: { expected_version: version },
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  async function remove() {
    setFailure(null);

    try {
      await mutation.mutateAsync();
    } catch (error) {
      const described = describeWriteError(error, id.errors.uncertainDelete);

      if (described.kind !== 'unauthorized') {
        setFailure(described);
      }

      return;
    }

    notify(kind === 'transaction' ? id.toast.transactionDeleted : id.toast.expenseDeleted);
    router.replace('/history');
  }

  function confirmDelete() {
    Alert.alert(deleteTitle, `${formatDateTime(occurredAt)} · ${formatCurrency(amount)}\n\n${deleteBody}`, [
      { text: id.common.cancel, style: 'cancel' },
      { text: id.common.delete, style: 'destructive', onPress: () => void remove() },
    ]);
  }

  if (me.data?.role !== 'admin') {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {failure && (
        <FormAlert message={failure.message}>
          <Button title={id.common.reload} variant="outline" onPress={() => void queryClient.invalidateQueries()} />
        </FormAlert>
      )}
      <Button title={id.common.edit} variant="outline" onPress={() => router.push(`/${kind}/${recordId}/edit`)} />
      <Button
        title={mutation.isPending ? id.common.deleting : id.common.delete}
        variant="destructive"
        loading={mutation.isPending}
        onPress={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
});
