import { Link } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { buttonVariants } from '@/components/ui/button';
import { id } from '@/locales/id';
import employeesRoute from '@/routes/employees';
import type { Employee } from '@/types/employee';

export default function Employees({ employees }: { employees: Employee[] }) {
    return (
        <AppLayout title={id.employees.title}>
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">
                        {id.employees.title}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {id.employees.hint}
                    </p>
                </div>
                <Link
                    href={employeesRoute.create().url}
                    className={buttonVariants()}
                >
                    <Plus aria-hidden />
                    {id.employees.add}
                </Link>
            </header>

            {employees.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {id.employees.empty}
                </p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {employees.map((employee) => (
                        <li
                            key={employee.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                    {employee.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {employee.email}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                                    {employee.is_active
                                        ? id.employees.activeStatus
                                        : id.employees.inactive}
                                </span>
                                <Link
                                    href={employeesRoute.edit(employee.id).url}
                                    className={buttonVariants({
                                        variant: 'outline',
                                    })}
                                >
                                    <Pencil aria-hidden />
                                    {id.common.edit}
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </AppLayout>
    );
}
