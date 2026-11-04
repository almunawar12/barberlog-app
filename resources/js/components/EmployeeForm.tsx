import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { TextField } from '@/components/TextField';
import { Button, buttonVariants } from '@/components/ui/button';
import { id } from '@/locales/id';
import employees from '@/routes/employees';
import type { Employee } from '@/types/employee';

type EmployeeFormProps = {
    /** Existing employee to edit; omit to add a new one. */
    employee?: Employee;
};

export default function EmployeeForm({ employee }: EmployeeFormProps) {
    const form = useForm({
        name: employee?.name ?? '',
        email: employee?.email ?? '',
        password: '',
        is_active: employee?.is_active ?? true,
    });
    const fieldId = (field: string) =>
        `employee-${employee?.id ?? 'new'}-${field}`;

    function submit(event: FormEvent) {
        event.preventDefault();

        form.submit(
            employee ? employees.update(employee.id) : employees.store(),
        );
    }

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                    id={fieldId('name')}
                    label={id.employees.name}
                    value={form.data.name}
                    onChange={(event) =>
                        form.setData('name', event.target.value)
                    }
                    error={form.errors.name}
                    maxLength={255}
                    required
                />
                <TextField
                    id={fieldId('email')}
                    type="email"
                    label={id.employees.email}
                    value={form.data.email}
                    onChange={(event) =>
                        form.setData('email', event.target.value)
                    }
                    error={form.errors.email}
                    maxLength={255}
                    required
                />
            </div>
            <TextField
                id={fieldId('password')}
                type="password"
                autoComplete="new-password"
                label={id.employees.password}
                value={form.data.password}
                onChange={(event) =>
                    form.setData('password', event.target.value)
                }
                error={form.errors.password}
                hint={employee ? id.employees.newPasswordHint : undefined}
                required={!employee}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                {employee ? (
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-5 accent-primary"
                            checked={form.data.is_active}
                            onChange={(event) =>
                                form.setData('is_active', event.target.checked)
                            }
                        />
                        {id.employees.active}
                    </label>
                ) : (
                    <span />
                )}
                <Link
                    href={employees.index().url}
                    className={buttonVariants({ variant: 'outline' })}
                >
                    {id.common.cancel}
                </Link>
                <Button type="submit" disabled={form.processing}>
                    {form.processing
                        ? id.common.saving
                        : employee
                          ? id.common.save
                          : id.employees.add}
                </Button>
            </div>
        </form>
    );
}
