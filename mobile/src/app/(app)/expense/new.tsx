import { Stack } from 'expo-router';

import { ExpenseForm } from '@/components/ExpenseForm';
import { id } from '@/locales/id';

export default function NewExpense() {
  return (
    <>
      <Stack.Screen options={{ title: id.expense.newTitle }} />
      <ExpenseForm />
    </>
  );
}
