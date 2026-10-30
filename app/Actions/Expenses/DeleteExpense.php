<?php

namespace App\Actions\Expenses;

use App\Exceptions\BusinessConflict;
use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeleteExpense
{
    /**
     * Soft delete. Repeating the delete of an already deleted record is a no-op
     * (no second audit entry).
     */
    public function handle(User $user, Expense $expense, int $expectedVersion): void
    {
        DB::transaction(function () use ($user, $expense, $expectedVersion): void {
            $locked = Expense::withTrashed()->whereKey($expense->id)->lockForUpdate()->firstOrFail();

            if ($locked->trashed()) {
                return;
            }

            if ($locked->version !== $expectedVersion) {
                throw BusinessConflict::versionConflict();
            }

            $before = $locked->auditSnapshot();

            $locked->forceFill(['version' => $locked->version + 1])->save();
            $locked->delete();

            AuditLog::record($user, 'expense', $locked->id, 'delete', $before, null);
        });
    }
}
