<?php

namespace App\Actions\Employees;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class UpdateEmployeeAccount
{
    /**
     * A new password or a deactivation ends every web session and mobile token of the employee.
     *
     * @param  array{name: string, email: string, password?: string|null, is_active: bool}  $data
     */
    public function handle(User $admin, User $employee, array $data): User
    {
        return DB::transaction(function () use ($admin, $employee, $data): User {
            $before = $employee->auditSnapshot();
            $revokeAccess = false;

            $employee->name = $data['name'];
            $employee->email = strtolower($data['email']);

            if (! empty($data['password'])) {
                $employee->password = $data['password'];
                $revokeAccess = true;
            }

            if ($data['is_active'] && ! $employee->isActive()) {
                $employee->deactivated_at = null;
            } elseif (! $data['is_active'] && $employee->isActive()) {
                $employee->deactivated_at = Carbon::now();
                $revokeAccess = true;
            }

            $employee->save();

            if ($revokeAccess) {
                $employee->revokeOtherAccess();
            }

            AuditLog::record($admin, 'user', $employee->id, 'update', $before, $employee->auditSnapshot());

            return $employee;
        });
    }
}
