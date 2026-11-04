<?php

namespace App\Actions\Employees;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateEmployeeAccount
{
    /**
     * @param  array{name: string, email: string, password: string}  $data
     */
    public function handle(User $admin, array $data): User
    {
        return DB::transaction(function () use ($admin, $data): User {
            // role is not mass-assignable on purpose, so request input can never set it.
            $employee = User::forceCreate([
                'name' => $data['name'],
                'email' => strtolower($data['email']),
                'password' => $data['password'],
                'role' => 'employee',
            ]);

            AuditLog::record($admin, 'user', $employee->id, 'create', null, $employee->auditSnapshot());

            return $employee;
        });
    }
}
