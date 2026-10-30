import AppLayout from '@/components/AppLayout';
import ExpenseForm from '@/components/ExpenseForm';
import { id } from '@/locales/id';
import type { ExpenseRecord } from '@/types/records';

export default function EditExpense({ expense }: { expense: ExpenseRecord }) {
    return (
        <AppLayout title={id.expense.editTitle}>
            <h1 className="text-2xl font-semibold">{id.expense.editTitle}</h1>
            <ExpenseForm expense={expense} />
        </AppLayout>
    );
}
