<?php

namespace App\Http\Controllers;

use App\Actions\Employees\CreateEmployeeAccount;
use App\Actions\Employees\UpdateEmployeeAccount;
use App\Http\Requests\EmployeeRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('employees/index', [
            'employees' => User::query()
                ->where('role', 'employee')
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'deactivated_at'])
                ->map(fn (User $employee) => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'email' => $employee->email,
                    'is_active' => $employee->isActive(),
                ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('employees/create');
    }

    public function edit(User $employee): Response
    {
        abort_unless($employee->role === 'employee', 404);

        return Inertia::render('employees/edit', [
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'is_active' => $employee->isActive(),
            ],
        ]);
    }

    public function store(EmployeeRequest $request, CreateEmployeeAccount $action): RedirectResponse
    {
        /** @var array{name: string, email: string, password: string} $data */
        $data = $request->validated();
        /** @var User $admin */
        $admin = $request->user();
        $action->handle($admin, $data);

        return to_route('employees.index')->with('status', 'employee-saved');
    }

    public function update(EmployeeRequest $request, User $employee, UpdateEmployeeAccount $action): RedirectResponse
    {
        // Only employee accounts are managed here; the owner account is never editable from this screen.
        abort_unless($employee->role === 'employee', 404);

        /** @var array{name: string, email: string, password?: string|null, is_active?: bool} $data */
        $data = $request->validated();
        /** @var User $admin */
        $admin = $request->user();
        $action->handle($admin, $employee, [...$data, 'is_active' => $data['is_active'] ?? $employee->isActive()]);

        return to_route('employees.index')->with('status', 'employee-saved');
    }
}
