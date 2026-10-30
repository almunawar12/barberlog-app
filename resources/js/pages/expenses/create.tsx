import AppLayout from '@/components/AppLayout';
import ExpenseForm from '@/components/ExpenseForm';
import { id } from '@/locales/id';

export default function CreateExpense() {
    return (
        <AppLayout title={id.expense.newTitle}>
            <h1 className="text-2xl font-semibold">{id.expense.newTitle}</h1>
            <ExpenseForm />
        </AppLayout>
    );
}
