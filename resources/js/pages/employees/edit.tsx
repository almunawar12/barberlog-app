import AppLayout from '@/components/AppLayout';
import EmployeeForm from '@/components/EmployeeForm';
import { id } from '@/locales/id';
import type { Employee } from '@/types/employee';

export default function EditEmployee({ employee }: { employee: Employee }) {
    return (
        <AppLayout title={id.employees.editTitle}>
            <h1 className="text-2xl font-semibold">{id.employees.editTitle}</h1>
            <EmployeeForm employee={employee} />
        </AppLayout>
    );
}
