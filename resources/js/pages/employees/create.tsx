import AppLayout from '@/components/AppLayout';
import EmployeeForm from '@/components/EmployeeForm';
import { id } from '@/locales/id';

export default function CreateEmployee() {
    return (
        <AppLayout title={id.employees.new}>
            <h1 className="text-2xl font-semibold">{id.employees.new}</h1>
            <EmployeeForm />
        </AppLayout>
    );
}
