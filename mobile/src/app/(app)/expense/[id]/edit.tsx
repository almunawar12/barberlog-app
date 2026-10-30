import { Stack, useLocalSearchParams } from 'expo-router';

import { AsyncView } from '@/components/AsyncView';
import { ExpenseForm } from '@/components/ExpenseForm';
import { useExpense } from '@/features/queries';
import { id } from '@/locales/id';

export default function EditExpense() {
  const { id: expenseId } = useLocalSearchParams<{ id: string }>();
  const query = useExpense(expenseId);

  return (
    <>
      <Stack.Screen options={{ title: id.expense.editTitle }} />
      <AsyncView isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()}>
        {/* Remount on a new version so the form never keeps stale values. */}
        {query.data && <ExpenseForm key={query.data.version} expense={query.data} />}
      </AsyncView>
    </>
  );
}
